<template>
  <div class="task-fill">
    <div class="fill-header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn btn-secondary btn-sm">返回</button>
        <div>
          <h2 class="text-lg font-semibold">{{ task?.title }}</h2>
          <p class="text-sm text-gray-500">模板: {{ task?.templateName }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="saveDraft" class="btn btn-secondary">保存草稿</button>
        <button @click="submitTask" class="btn btn-primary">提交</button>
      </div>
    </div>

    <div class="fill-content card">
      <div class="card-body p-0">
        <div id="spread-container" ref="spreadRef"></div>
      </div>
    </div>

    <div v-if="task" class="task-info card mt-4">
      <div class="card-header">
        <h3 class="card-title">任务信息</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-gray-500">当前步骤</label>
            <p class="font-medium">{{ task.currentStepName }}</p>
          </div>
          <div>
            <label class="text-sm text-gray-500">截止日期</label>
            <p class="font-medium">{{ task.dueDate }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限提示 -->
    <div v-if="hasRestrictedContent" class="card mt-4 permission-notice">
      <div class="card-body">
        <div class="flex items-center gap-2">
          <span class="icon">ℹ</span>
          <p class="text-sm">部分内容因权限限制不可见或已脱敏显示</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { createMaskFormatter, registerMaskFormatter } from '@/utils/formatters'

// 引入 SpreadJS（无 Designer）
import '@grapecity-software/spread-sheets/styles/gc.spread.sheets.excel2013white.css'
import "@grapecity-software/spread-sheets-io"
import "@grapecity-software/spread-sheets-barcode"
import "@grapecity-software/spread-sheets-charts"
import "@grapecity-software/spread-sheets-shapes"
import "@grapecity-software/spread-sheets-slicers"
import "@grapecity-software/spread-sheets-print"
import "@grapecity-software/spread-sheets-pdf"
import "@grapecity-software/spread-sheets-pivot-addon"
import "@grapecity-software/spread-sheets-tablesheet"
import "@grapecity-software/spread-sheets-reportsheet-addon"
import "@grapecity-software/spread-sheets-resources-zh"
import "@grapecity-software/spread-sheets-languagepackages"
import * as GC from "@grapecity-software/spread-sheets"

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const dataStore = useDataStore()

const spreadRef = ref(null)
let spread = null

const task = ref(null)
const template = ref(null)
const hasRestrictedContent = ref(false)

/**
 * 根据模板字段创建默认表格
 */
function createDefaultSheet(sheet) {
  if (!template.value) {
    console.log('template.value 不存在')
    return
  }
  if (!template.value?.dataFields) {
    console.log('template.value.dataFields 不存在')
    return
  }

  const fields = template.value.dataFields
  console.log('createDefaultSheet fields:', fields)
  sheet.setRowCount(20)
  sheet.setColumnCount(fields.length + 2)

  // 设置表头行
  sheet.getCell(0, 0).value('序号').font('bold').backColor('#e3f2fd')
  sheet.getCell(0, 0).locked(true)

  fields.forEach((field, index) => {
    const colIndex = index + 1

    // 表头
    sheet.getCell(0, colIndex).value(field.name)
      .font('bold')
      .backColor('#e3f2fd')
      .locked(true)

    // 设置列宽
    sheet.setColumnWidth(colIndex, 120)

    // 设置必填标记样式
    if (field.required) {
      sheet.getCell(0, colIndex).backColor('#fff3cd')
    }

    // 数据类型设置
    if (field.type === 'number') {
      sheet.getCell(1, colIndex).formatter('#,##0.00')
    } else if (field.type === 'date') {
      sheet.getCell(1, colIndex).formatter('yyyy-mm-dd')
    }

    // 设置单元格绑定路径（第1行开始为数据行）
    if (field.bindingPath) {
      sheet.setBindingPath(1, colIndex, field.bindingPath)
    }
    // 显式设置数据单元格为可编辑（在保护模式下需要）
    sheet.getCell(1, colIndex).locked(false)
  })

  // 添加示例数据行提示
  sheet.getCell(0, 0).value('序号').font('bold').backColor('#e3f2fd')
  for (let i = 1; i <= 10; i++) {
    sheet.getCell(i, 0).value(i).locked(true)
  }
}

onMounted(async () => {
  console.log('=== Fill.vue onMounted ===')
  console.log('dataStore tasks:', dataStore.getAllTasks())
  console.log('dataStore templates:', dataStore.templates)

  const taskId = Number(route.params.id)
  console.log('taskId:', taskId)
  console.log('所有任务:', dataStore.getAllTasks())
  console.log('所有模板:', dataStore.templates)

  task.value = dataStore.getAllTasks().find(t => t.id === taskId)
  console.log('task:', task.value)

  if (!task.value) {
    alert('任务不存在')
    router.push('/tasks')
    return
  }

  template.value = dataStore.getTemplateById(task.value.templateId)
  console.log('template:', template.value)
  console.log('template dataFields:', template.value?.dataFields)
  console.log('template ssjson:', template.value?.ssjson ? (template.value.ssjson.sheets ? '有 sheets' : '无 sheets') : '为空')
  console.log('task ssjson:', task.value?.ssjson ? (task.value.ssjson.sheets ? '有 sheets' : '无 sheets') : '为空')

  // 注册脱敏格式化器
  registerMaskFormatter()

  // 初始化 SpreadJS（不带工具栏，只读模式）
  console.log('spreadRef.value:', spreadRef.value)
  spread = new GC.Spread.Sheets.Workbook(spreadRef.value, {
    sheetCount: 1
  })
  console.log('SpreadJS initialized')

  let sheet = spread.getActiveSheet()
  console.log('sheet:', sheet)

  // 设置为保护模式（但允许编辑未锁定的单元格）
  sheet.options.isProtected = true
  sheet.options.protectionOptions = {
    allowSelectUnlockedCells: true,
    allowSelectLockedCells: false,
    allowFilter: false,
    allowSort: false,
    allowResizeRows: false,
    allowResizeColumns: false,
    allowInsertRows: false,
    allowInsertColumns: false,
    allowDeleteRows: false,
    allowDeleteColumns: false,
    allowEditObjects: false,
    allowEditCells: true
  }

  // 如果模板有 SSJSON，加载它；否则根据 dataFields 创建
  if (template.value?.ssjson && template.value.ssjson.sheets) {
    spread.fromJSON(template.value.ssjson)
    sheet = spread.getActiveSheet()
  } else {
    createDefaultSheet(sheet)
  }
  console.log('createDefaultSheet 完成后，dataFields:', template.value?.dataFields)

  // 填充已有数据（使用 dataFields 的列顺序）
  if (task.value?.data && template.value?.dataFields) {
    console.log('填充任务数据:', task.value.data)
    template.value.dataFields.forEach((field, index) => {
      if (field.bindingPath && task.value.data[field.bindingPath] !== undefined) {
        const row = 1
        const col = index + 1
        sheet.setValue(row, col, task.value.data[field.bindingPath])
        console.log(`设置值: row=${row}, col=${col}, field=${field.name}, value=${task.value.data[field.bindingPath]}`)
      }
    })
  }

  // 应用权限控制和脱敏显示
  applyPermissionsAndMasking(sheet)
})

// 根据 bindingPath 获取列索引
function getColumnByBindingPath(sheet, bindingPath) {
  const rowCount = sheet.getRowCount()
  const colCount = sheet.getColumnCount()
  console.log(`查找 bindingPath: ${bindingPath}, 表格范围: ${rowCount}行 x ${colCount}列`)
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const binding = sheet.getBindingPath(row, col)
      if (binding) {
        console.log(`  row=${row}, col=${col}, binding=${binding}`)
      }
      if (binding === bindingPath) {
        return col
      }
    }
  }
  return -1
}

/**
 * 应用权限控制和脱敏显示
 */
function applyPermissionsAndMasking(sheet) {
  if (!template.value?.permissions) return

  const user = authStore.user
  const permissions = template.value.permissions
  let hasRestriction = false

  // 1. 处理行权限
  if (permissions.rows) {
    Object.keys(permissions.rows).forEach(key => {
      const match = key.match(/row_(\d+)/)
      if (match) {
        const row = parseInt(match[1])
        const permission = permissions.rows[key]

        if (permission.type === 'visible') {
          // 可见性控制
          if (!permission.allVisible && !hasPermission(permission, user)) {
            sheet.setRowVisible(row, false)
            hasRestriction = true
          }
        } else if (permission.type === 'masked') {
          // 脱敏控制
          applyMaskingToRow(sheet, row, permission, user)
          hasRestriction = true
        }
      }
    })
  }

  // 2. 处理列权限
  if (permissions.columns) {
    Object.keys(permissions.columns).forEach(key => {
      const match = key.match(/col_(\d+)/)
      if (match) {
        const col = parseInt(match[1])
        const permission = permissions.columns[key]

        if (permission.type === 'visible') {
          // 可见性控制
          if (!permission.allVisible && !hasPermission(permission, user)) {
            sheet.setColumnVisible(col, false)
            hasRestriction = true
          }
        } else if (permission.type === 'masked') {
          // 脱敏控制
          applyMaskingToColumn(sheet, col, permission, user)
          hasRestriction = true
        }
      }
    })
  }

  // 3. 处理单元格权限
  if (permissions.cells) {
    Object.keys(permissions.cells).forEach(key => {
      const match = key.match(/cell_(\d+)_(\d+)/)
      if (match) {
        const row = parseInt(match[1])
        const col = parseInt(match[2])
        const permission = permissions.cells[key]

        if (permission.type === 'visible') {
          // 可见性控制
          if (!permission.allVisible && !hasPermission(permission, user)) {
            // 隐藏单元格：设置行高为0（SpreadJS没有直接隐藏单元格的API）
            sheet.setRowHeight(row, 0)
            hasRestriction = true
          }
        } else if (permission.type === 'masked') {
          // 脱敏控制
          applyMaskingToCell(sheet, row, col, permission, user)
          hasRestriction = true
        }
      }
    })
  }

  // 4. 检查单元格tag中的脱敏配置（兼容方式）
  applyCellTagMasking(sheet, user)

  hasRestrictedContent.value = hasRestriction
}

/**
 * 检查用户是否有权限
 */
function hasPermission(permission, user) {
  if (permission.allVisible) return true

  // 检查用户ID
  if (permission.visibleUsers && permission.visibleUsers.includes(user.id)) {
    return true
  }

  // 检查角色
  if (permission.visibleRoles && permission.visibleRoles.includes(user.role)) {
    return true
  }

  // 检查部门
  if (permission.visibleDepartments && permission.visibleDepartments.includes(user.department)) {
    return true
  }

  return false
}

/**
 * 检查用户是否可以查看原始数据（未脱敏）
 */
function canViewUnmasked(permission, user) {
  if (permission.unmaskedAll) return true

  // 检查用户ID
  if (permission.unmaskedUsers && permission.unmaskedUsers.includes(user.id)) {
    return true
  }

  // 检查角色
  if (permission.unmaskedRoles && permission.unmaskedRoles.includes(user.role)) {
    return true
  }

  // 检查部门
  if (permission.unmaskedDepartments && permission.unmaskedDepartments.includes(user.department)) {
    return true
  }

  return false
}

/**
 * 对整行应用脱敏
 */
function applyMaskingToRow(sheet, row, permission, user) {
  const colCount = sheet.getColumnCount()
  const shouldMask = !canViewUnmasked(permission, user)

  if (shouldMask) {
    const maskFormatter = createMaskFormatter(permission.maskType)
    for (let col = 0; col < colCount; col++) {
      sheet.getCell(row, col).formatter(maskFormatter)
    }
  }
}

/**
 * 对整列应用脱敏
 */
function applyMaskingToColumn(sheet, col, permission, user) {
  const rowCount = sheet.getRowCount()
  const shouldMask = !canViewUnmasked(permission, user)

  if (shouldMask) {
    const maskFormatter = createMaskFormatter(permission.maskType)
    for (let row = 0; row < rowCount; row++) {
      sheet.getCell(row, col).formatter(maskFormatter)
    }
  }
}

/**
 * 对单个单元格应用脱敏
 */
function applyMaskingToCell(sheet, row, col, permission, user) {
  const shouldMask = !canViewUnmasked(permission, user)

  if (shouldMask) {
    const maskFormatter = createMaskFormatter(permission.maskType)
    sheet.getCell(row, col).formatter(maskFormatter)
  }
}

/**
 * 应用单元格tag中存储的脱敏配置
 */
function applyCellTagMasking(sheet, user) {
  const rowCount = sheet.getRowCount()
  const colCount = sheet.getColumnCount()

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const tag = sheet.getTag(row, col)
      if (tag && tag.maskType) {
        // 检查是否有权限查看原始数据
        const canView = tag.unmaskedAll ||
                        (tag.unmaskedUsers && tag.unmaskedUsers.includes(user.id)) ||
                        (tag.unmaskedRoles && tag.unmaskedRoles.includes(user.role)) ||
                        (tag.unmaskedDepartments && tag.unmaskedDepartments.includes(user.department))

        if (!canView) {
          const maskFormatter = createMaskFormatter(tag.maskType)
          sheet.getCell(row, col).formatter(maskFormatter)
          hasRestrictedContent.value = true
        }
      }
    }
  }
}

onBeforeUnmount(() => {
  spread = null
})

function goBack() {
  router.push('/tasks')
}

function collectFormData() {
  if (!spread) return {}

  const sheet = spread.getActiveSheet()
  console.log('=== collectFormData ===')

  // 直接获取 SpreadJS 的完整数据
  const data = sheet.getDataSource()
  console.log('SpreadJS 数据源:', data)
  return data || {}
}

async function saveDraft() {
  const ssjson = spread.toJSON()
  await dataStore.updateTask(task.value.id, { ssjson })
  alert('草稿已保存')
}

async function submitTask() {
  // 直接保存 SpreadJS 的完整数据
  const ssjson = spread.toJSON()
  console.log('提交时保存的 SSJSON:', ssjson)

  if (confirm('确定要提交吗？提交后将进入下一流程。')) {
    // 获取工作流信息
    const workflow = dataStore.getWorkflowByTemplate(task.value.templateId)
    const steps = workflow?.steps || []
    const currentStepIndex = steps.findIndex(s => s.id === task.value.currentStep)
    const nextStep = steps[currentStepIndex + 1]

    if (nextStep) {
      // 有下一步，为下一步创建新任务
      let assigneeIds = []

      // 根据处理人类型确定任务接收人
      if (nextStep.assigneeType === 'role' && nextStep.assignees) {
        assigneeIds = authStore.users.filter(u => u.role === nextStep.assignees).map(u => u.id)
      } else if (nextStep.assigneeType === 'department' && nextStep.assignees) {
        assigneeIds = authStore.users
          .filter(u => u.department === nextStep.assignees && u.role === 'manager')
          .map(u => u.id)
      } else if (nextStep.assigneeType === 'users' && nextStep.assigneeIds) {
        assigneeIds = nextStep.assigneeIds
      }

      // 为下一步的每个处理人创建任务
      for (const assigneeId of assigneeIds) {
        const assignee = authStore.users.find(u => u.id === assigneeId)
        const newTask = {
          workflowId: task.value.workflowId,
          workflowName: task.value.workflowName,
          templateId: task.value.templateId,
          templateName: task.value.templateName,
          title: `${task.value.workflowName} - ${nextStep.name}`,
          status: 'pending',
          currentStep: nextStep.id,
          currentStepName: nextStep.name,
          assigneeId: assigneeId,
          assigneeName: assignee?.name || '',
          department: assignee?.department || '',
          createdBy: authStore.user?.name || '',
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: '',
          data: {},
          ssjson: ssjson,  // 保存完整的 SpreadJS 数据
          history: []
        }
        await dataStore.addTask(newTask)
      }

      // 更新当前任务为已完成
      await dataStore.updateTask(task.value.id, {
        status: 'completed',
        ssjson: ssjson,  // 保存 SpreadJS 数据
        history: [
          ...(task.value.history || []),
          {
            step: task.value.currentStepName,
            operator: authStore.user.name,
            action: '提交',
            time: new Date().toLocaleString()
          }
        ]
      })
    } else {
      // 所有步骤完成
      await dataStore.updateTask(task.value.id, {
        status: 'completed',
        ssjson: ssjson,  // 保存 SpreadJS 数据
        history: [
          ...(task.value.history || []),
          {
            step: task.value.currentStepName,
            operator: authStore.user.name,
            action: '提交',
            time: new Date().toLocaleString()
          }
        ]
      })
    }

    alert('提交成功')
    router.push('/tasks')
  }
}
</script>

<style scoped>
.task-fill {
  max-width: 100%;
}

.fill-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.fill-content {
  overflow: hidden;
}

#spread-container {
  width: 100%;
  height: 500px;
}

.task-info label {
  display: block;
  margin-bottom: 0.25rem;
}

.permission-notice {
  background-color: #fff3cd;
  border-color: #ffc107;
}

.permission-notice .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #ffc107;
  color: white;
  border-radius: 50%;
  font-size: 12px;
}

/* 通用样式 */
.card {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background-color: white;
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.card-body {
  padding: 1rem;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.p-0 {
  padding: 0;
}

.mt-4 {
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--gray-200);
  color: var(--gray-700);
}

.btn-secondary:hover {
  background-color: var(--gray-300);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 12px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.text-sm {
  font-size: 12px;
}

.text-gray-500 {
  color: var(--gray-500);
}

.font-medium {
  font-weight: 500;
}

.text-lg {
  font-size: 18px;
}

.font-semibold {
  font-weight: 600;
}
</style>
