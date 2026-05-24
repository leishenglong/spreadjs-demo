<template>
  <div class="task-approve">
    <div class="page-header">
      <button @click="goBack" class="btn btn-secondary">返回</button>
      <h2 class="text-lg font-semibold">审批任务</h2>
      <div></div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <span>加载中...</span>
    </div>

    <div v-else-if="!task" class="text-center py-8">
      <span class="text-gray-500">任务不存在</span>
    </div>

    <div v-else class="approve-content">
      <!-- 任务信息 -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">任务信息</h3>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">任务标题：</span>
              <span class="value">{{ task.title }}</span>
            </div>
            <div class="info-item">
              <span class="label">关联模板：</span>
              <span class="value">{{ task.templateName }}</span>
            </div>
            <div class="info-item">
              <span class="label">当前状态：</span>
              <span class="badge" :class="getStatusClass(task.status)">{{ task.currentStepName }}</span>
            </div>
            <div class="info-item">
              <span class="label">填报人：</span>
              <span class="value">{{ task.assigneeName }}</span>
            </div>
            <div class="info-item">
              <span class="label">截止日期：</span>
              <span class="value">{{ task.dueDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 填报数据 -->
      <div class="card mb-4">
        <div class="card-header">
          <div class="flex justify-between items-center">
            <h3 class="card-title">填报数据</h3>
            <div v-if="isFinance && canEditFormula" class="flex gap-2">
              <button v-if="!editMode" @click="enterEditMode" class="btn btn-secondary btn-sm">
                修改公式
              </button>
              <button v-else @click="exitEditMode" class="btn btn-secondary btn-sm">
                取消修改
              </button>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div id="approve-spread-container" ref="spreadContainer"></div>
        </div>
      </div>

      <!-- 审批历史 -->
      <div class="card mb-4" v-if="task.history && task.history.length > 0">
        <div class="card-header">
          <h3 class="card-title">审批历史</h3>
        </div>
        <div class="card-body">
          <div class="history-timeline">
            <div v-for="(item, index) in task.history" :key="index" class="history-item">
              <div class="history-dot"></div>
              <div class="history-content">
                <div class="history-header">
                  <span class="history-step">{{ item.step }}</span>
                  <span class="history-action" :class="item.action">{{ item.action }}</span>
                </div>
                <div class="history-meta">
                  <span>{{ item.operator }}</span>
                  <span>{{ item.time }}</span>
                </div>
                <div v-if="item.comment" class="history-comment">
                  意见：{{ item.comment }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 审批操作 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">审批操作</h3>
        </div>
        <div class="card-body">
          <div class="form-group mb-4">
            <label class="form-label">审批意见</label>
            <textarea
              v-model="comment"
              class="input"
              rows="3"
              placeholder="请输入审批意见（选填）"
            ></textarea>
          </div>
          <div v-if="canApprove" class="flex gap-4">
            <button @click="handleApprove" class="btn btn-primary btn-lg">
              通过
            </button>
            <button @click="handleReject" class="btn btn-danger btn-lg">
              驳回
            </button>
          </div>
          <div v-else class="text-gray-500">
            您没有审批此任务的权限
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const dataStore = useDataStore()
const authStore = useAuthStore()

const loading = ref(true)
const task = ref(null)
const template = ref(null)
const comment = ref('')
const editMode = ref(false)
const spreadContainer = ref(null)

let spread = null

const isFinance = computed(() => authStore.isFinance)
const isManager = computed(() => authStore.isManager)

// 判断是否有审批权限
const canApprove = computed(() => {
  if (!task.value || !authStore.user) return false

  // 财务可以审批所有任务（步骤2和步骤3）
  if (isFinance.value) {
    return task.value.currentStep >= 2
  }

  // 部门负责人可以审批本部门任务（只限于步骤2）
  if (isManager.value) {
    return task.value.department === authStore.user.department && task.value.currentStep === 2
  }

  return false
})

// 财务可以修改公式
const canEditFormula = computed(() => isFinance.value)

onMounted(async () => {
  const taskId = Number(route.params.id)
  task.value = dataStore.getTaskById(taskId)

  if (task.value) {
    template.value = dataStore.getTemplateById(task.value.templateId)
  }

  loading.value = false

  // 初始化 SpreadJS
  await initSpread()
})

onBeforeUnmount(() => {
  if (spread) {
    spread.destroy()
    spread = null
  }
})

async function initSpread() {
  if (!spreadContainer.value || !template.value) return

  const GC = await import('@grapecity-software/spread-sheets')
  await import('@grapecity-software/spread-sheets/styles/gc.spread.sheets.excel2013white.css')
  await import('@grapecity-software/spread-sheets-io')

  spread = new GC.Spread.Sheets.Workbook(spreadContainer.value)

  const sheet = spread.getActiveSheet()

  // 加载模板 SSJSON
  if (template.value?.ssjson && template.value.ssjson.sheets) {
    spread.fromJSON(template.value.ssjson)
    sheet = spread.getActiveSheet()
  } else {
    createDefaultSheet(sheet)
  }

  // 加载任务数据
  if (task.value?.data && template.value?.dataFields) {
    template.value.dataFields.forEach((field, index) => {
      if (field.bindingPath && task.value.data[field.bindingPath] !== undefined) {
        const row = 1
        const col = index + 1
        sheet.setValue(row, col, task.value.data[field.bindingPath])
      }
    })
  }

  // 设置为只读模式（除非是财务在编辑公式）
  if (!editMode.value) {
    sheet.options.isProtected = true
    sheet.options.protectionOptions = {
      allowSelectUnlockedCells: true,
      allowEditObjects: false
    }
  }
}

function createDefaultSheet(sheet) {
  if (!template.value || !template.value.dataFields) return

  const fields = template.value.dataFields

  // 设置表头
  let colIndex = 0
  fields.forEach((field, index) => {
    const colLetter = String.fromCharCode(65 + colIndex)
    sheet.getCell(0, colIndex).value(field.name)
      .font('bold')
      .backColor('#e3f2fd')

    // 设置必填标记
    if (field.required) {
      sheet.getCell(1, colIndex).inputHint(field.name + '（必填）')
    }

    colIndex++
  })

  // 添加数据行
  sheet.setRowCount(10)
}

function enterEditMode() {
  editMode.value = true
  if (spread) {
    const sheet = spread.getActiveSheet()
    sheet.options.isProtected = false
  }
}

function exitEditMode() {
  editMode.value = false
  if (spread) {
    const sheet = spread.getActiveSheet()
    sheet.options.isProtected = true
  }
}

async function handleApprove() {
  if (!task.value) return

  // 如果是财务修改了公式，保存公式变更
  let ssjsonDelta = null
  if (editMode.value && isFinance.value) {
    ssjsonDelta = {
      modifiedCells: [],
      modifiedAt: new Date().toISOString()
    }
  }

  const updatedTask = {
    status: 'completed',
    currentStep: task.value.currentStep + 1,
    currentStepName: task.value.currentStep >= 3 ? '已完成' : `步骤${task.value.currentStep + 1}`,
    history: [
      ...(task.value.history || []),
      {
        step: task.value.currentStepName,
        operator: authStore.user.name,
        action: '通过',
        time: new Date().toLocaleString(),
        comment: comment.value
      }
    ]
  }

  if (ssjsonDelta) {
    updatedTask.ssjsonDelta = ssjsonDelta
  }

  await dataStore.updateTask(task.value.id, updatedTask)
  alert('审批通过')
  router.push('/tasks')
}

async function handleReject() {
  if (!task.value) return

  const updatedTask = {
    status: 'rejected',
    history: [
      ...(task.value.history || []),
      {
        step: task.value.currentStepName,
        operator: authStore.user.name,
        action: '驳回',
        time: new Date().toLocaleString(),
        comment: comment.value
      }
    ]
  }

  await dataStore.updateTask(task.value.id, updatedTask)
  alert('任务已驳回')
  router.push('/tasks')
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-warning'
    case 'in_progress':
      return 'badge-info'
    case 'completed':
      return 'badge-success'
    case 'rejected':
      return 'badge-danger'
    default:
      return ''
  }
}

function goBack() {
  router.push('/tasks')
}
</script>

<style scoped>
.task-approve {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-item .label {
  color: var(--gray-500);
}

.badge-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.badge-success {
  background-color: #d4edda;
  color: #155724;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.badge-danger {
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

#approve-spread-container {
  width: 100%;
  height: 400px;
}

.history-timeline {
  position: relative;
  padding-left: 2rem;
}

.history-timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--gray-200);
}

.history-item {
  position: relative;
  padding-bottom: 1.5rem;
}

.history-item:last-child {
  padding-bottom: 0;
}

.history-dot {
  position: absolute;
  left: -1.5rem;
  top: 0.25rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: var(--primary);
}

.history-content {
  background-color: var(--gray-50);
  padding: 0.75rem;
  border-radius: var(--radius);
}

.history-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.history-step {
  font-weight: 600;
}

.history-action {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 12px;
}

.history-action.通过 {
  background-color: #d4edda;
  color: #155724;
}

.history-action.驳回 {
  background-color: #f8d7da;
  color: #721c24;
}

.history-action.提交 {
  background-color: #cce5ff;
  color: #004085;
}

.history-meta {
  font-size: 13px;
  color: var(--gray-500);
  display: flex;
  gap: 1rem;
}

.history-comment {
  margin-top: 0.5rem;
  font-size: 13px;
  color: var(--gray-600);
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
