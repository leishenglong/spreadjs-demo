<template>
  <div class="template-designer">
    <div class="designer-header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn btn-secondary btn-sm">返回</button>
        <h2 class="text-lg font-semibold">{{ isEdit ? '编辑模板' : '新建模板' }}</h2>
      </div>
      <div class="flex gap-2">
        <button @click="saveTemplate" class="btn btn-primary">保存模板</button>
      </div>
    </div>

    <div class="designer-content">
      <div class="designer-main card">
        <div class="card-body p-0">
          <div id="designer-container" ref="designerRef"></div>
        </div>
      </div>

      <div class="designer-sidebar card">
        <div class="card-header">
          <h3 class="card-title">数据字段配置</h3>
        </div>
        <div class="card-body">
          <div class="form-group mb-4">
            <label class="form-label">模板名称</label>
            <input v-model="template.name" type="text" class="input" placeholder="请输入模板名称" />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">模板描述</label>
            <input v-model="template.description" type="text" class="input" placeholder="请输入模板描述" />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">分类</label>
            <select v-model="template.category" class="input">
              <option value="财务">财务</option>
              <option value="人事">人事</option>
              <option value="行政">行政</option>
              <option value="业务">业务</option>
            </select>
          </div>

          <div class="divider"></div>

          <!-- 快速添加预设字段 -->
          <div class="mb-4">
            <label class="form-label mb-2">快速添加预设字段</label>
            <div class="field-templates-grid">
              <button
                v-for="(tpl, key) in fieldTemplates"
                :key="key"
                @click="addFieldTemplate(tpl)"
                class="btn btn-secondary field-template-btn"
                :title="`添加 ${tpl.name} 模板`"
              >
                {{ tpl.name }}
              </button>
            </div>
          </div>

          <div class="divider"></div>

          <!-- 当前选中单元格的绑定区域 -->
          <div class="current-selection mb-4" v-if="currentSelection">
            <div class="selection-header">
              <span class="text-sm text-gray-500">当前选中: {{ currentSelection }}</span>
              <button v-if="currentCellBinding" @click="unbindCell" class="btn btn-danger btn-sm">✕ 解除</button>
            </div>
            <div class="field-buttons-wrapper">
              <div class="field-buttons-scroll">
                <button
                  v-for="(field, index) in template.dataFields"
                  :key="index"
                  @click="bindCellToField(field)"
                  class="btn btn-sm field-bind-btn"
                  :class="field.bindingPath === currentCellBinding ? 'btn-primary' : 'btn-secondary'"
                  :title="`绑定 ${field.name} 到当前单元格`"
                >
                  {{ field.name }}
                </button>
              </div>
            </div>
            <div v-if="currentCellBinding" class="binding-info">
              <span class="text-sm text-gray-500">已绑定: </span>
              <span class="badge badge-primary">{{ getFieldNameByPath(currentCellBinding) }}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="flex justify-between items-center mb-4">
            <h4 class="font-medium">绑定字段列表</h4>
            <div class="flex gap-2">
              <button @click="createTableWithBindings" class="btn btn-primary btn-sm" title="在选中位置创建表格并绑定所有字段">
                📊 创建表格绑定
              </button>
              <button @click="addField" class="btn btn-secondary btn-sm">+ 添加字段</button>
            </div>
          </div>

          <div class="fields-list">
            <div v-for="(field, index) in template.dataFields" :key="index" class="field-item">
              <div class="field-header">
                <input v-model="field.name" type="text" class="input input-sm" placeholder="字段名称" />
                <button @click="removeField(index)" class="btn btn-danger btn-sm">×</button>
              </div>
              <div class="field-body">
                <input v-model="field.bindingPath" type="text" class="input input-sm" placeholder="绑定路径" />
                <select v-model="field.type" class="input input-sm">
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="date">日期</option>
                  <option value="formula">公式</option>
                </select>
                <label class="checkbox-label">
                  <input v-model="field.required" type="checkbox" />
                  必填
                </label>
              </div>
              <div class="field-binding-info text-sm" v-if="getFieldBindingInfo(field)">
                <span class="text-gray-500">绑定到: </span>
                <span class="badge badge-primary">{{ getFieldBindingInfo(field) }}</span>
              </div>
              <input
                v-if="field.type === 'formula'"
                v-model="field.formula"
                type="text"
                class="input input-sm mt-2"
                placeholder="公式，如：=A1+B1"
              />
            </div>
            <div v-if="template.dataFields.length === 0" class="text-center text-gray-500 py-4">
              暂无字段，请点击"添加字段"或使用预设模板
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限管理对话框 -->
    <PermissionManager
      :show="showPermissionManager"
      :selection-info="selectionInfo"
      :current-config="currentPermissionConfig"
      @close="showPermissionManager = false"
      @apply="applyPermission"
      @clear="clearPermission"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDataStore } from '@/stores/data'
import PermissionManager from '@/components/PermissionManager.vue'
import { createMaskFormatter, registerMaskFormatter } from '@/utils/formatters'

// 引入 SpreadJS Designer
import '@grapecity-software/spread-sheets/styles/gc.spread.sheets.excel2013white.css'
import '@grapecity-software/spread-sheets-designer/styles/gc.spread.sheets.designer.light.min.css'
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
import "@grapecity-software/spread-sheets-designer-resources-cn"
import * as GC from "@grapecity-software/spread-sheets"
import * as GCD from "@grapecity-software/spread-sheets-designer"

const router = useRouter()
const route = useRoute()
const dataStore = useDataStore()

// 预设字段模板
const fieldTemplates = {
  basic: { name: '基础信息', fields: [
    { name: '姓名', bindingPath: 'name', type: 'text', required: true },
    { name: '工号', bindingPath: 'employeeId', type: 'text', required: true },
    { name: '部门', bindingPath: 'department', type: 'text', required: true },
    { name: '岗位', bindingPath: 'position', type: 'text', required: false },
    { name: '日期', bindingPath: 'date', type: 'date', required: true }
  ]},
  expense: { name: '费用报销', fields: [
    { name: '费用类型', bindingPath: 'expenseType', type: 'text', required: true },
    { name: '报销金额', bindingPath: 'amount', type: 'number', required: true },
    { name: '发生日期', bindingPath: 'expenseDate', type: 'date', required: true },
    { name: '报销说明', bindingPath: 'description', type: 'text', required: false },
    { name: '附件数', bindingPath: 'attachmentCount', type: 'number', required: false }
  ]},
  travel: { name: '差旅费用', fields: [
    { name: '出发地', bindingPath: 'fromLocation', type: 'text', required: true },
    { name: '目的地', bindingPath: 'toLocation', type: 'text', required: true },
    { name: '交通费', bindingPath: 'transportFee', type: 'number', required: false },
    { name: '住宿费', bindingPath: 'hotelFee', type: 'number', required: false },
    { name: '餐费', bindingPath: 'mealFee', type: 'number', required: false },
    { name: '小计', bindingPath: 'subtotal', type: 'formula', formula: '=D3+E3+F3', required: false }
  ]},
  daily: { name: '日常费用', fields: [
    { name: '费用项目', bindingPath: 'expenseItem', type: 'text', required: true },
    { name: '金额', bindingPath: 'amount', type: 'number', required: true },
    { name: '发生日期', bindingPath: 'occurDate', type: 'date', required: true },
    { name: '备注', bindingPath: 'remark', type: 'text', required: false }
  ]},
  budget: { name: '预算管理', fields: [
    { name: '预算项目', bindingPath: 'budgetItem', type: 'text', required: true },
    { name: '预算金额', bindingPath: 'budgetAmount', type: 'number', required: true },
    { name: '已用金额', bindingPath: 'usedAmount', type: 'number', required: false },
    { name: '剩余金额', bindingPath: 'remainingAmount', type: 'formula', formula: '=C[row]-D[row]', required: false }
  ]},
  summary: { name: '月度汇总', fields: [
    { name: '科目', bindingPath: 'account', type: 'text', required: true },
    { name: '本月发生', bindingPath: 'currentMonth', type: 'number', required: false },
    { name: '本年累计', bindingPath: 'yearToDate', type: 'number', required: false },
    { name: '预算', bindingPath: 'budget', type: 'number', required: false },
    { name: '完成率', bindingPath: 'completionRate', type: 'formula', formula: '=IF(E2>0,D2/E2,0)', required: false }
  ]}
}

const designerRef = ref(null)
let designer = null
let spread = null

const currentSelection = ref('')
const currentCellBinding = ref('')
const selectionInfo = ref('')
const currentPermissionConfig = ref(null)
const showPermissionManager = ref(false)

const isEdit = computed(() => !!route.params.id)

const template = ref({
  name: '',
  description: '',
  category: '财务',
  dataFields: [],
  // 权限配置存储
  permissions: {
    rows: {},
    columns: {},
    cells: {}
  }
})

onMounted(async () => {
  const GCDesigner = GCD.Spread.Sheets.Designer.Designer

  // 注册脱敏格式化器
  registerMaskFormatter()

  // 创建自定义命令
  const permissionCommand = {
    text: '权限管理',
    commandName: 'permissionManager',
    visibleContext: 'ClickViewport',
    execute: (context) => {
      const workbook = context.getWorkbook()
      const sheet = workbook.getActiveSheet()
      const selections = sheet.getSelections()

      if (selections && selections.length > 0) {
        const sel = selections[0]
        let key = ''

        if (sel.col === -1 && sel.row >= 0) {
          key = `row_${sel.row}`
          currentPermissionConfig.value = template.value.permissions.rows[key] || {
            type: 'visible',
            allVisible: true,
            visibleUsers: [],
            visibleRoles: [],
            visibleDepartments: []
          }
        } else if (sel.row === -1 && sel.col >= 0) {
          key = `col_${sel.col}`
          currentPermissionConfig.value = template.value.permissions.columns[key] || {
            type: 'visible',
            allVisible: true,
            visibleUsers: [],
            visibleRoles: [],
            visibleDepartments: []
          }
        } else {
          key = `cell_${sel.row}_${sel.col}`
          currentPermissionConfig.value = template.value.permissions.cells[key] || {
            type: 'visible',
            allVisible: true,
            visibleUsers: [],
            visibleRoles: [],
            visibleDepartments: []
          }
        }

        selectionInfo.value = getSelectionText(sel)
        showPermissionManager.value = true
      }
    }
  }

  // 克隆默认配置并添加自定义菜单
  const config = JSON.parse(JSON.stringify(GCD.Spread.Sheets.Designer.DefaultConfig))
  config.contextMenu.push('permissionManager')
  config.commandMap = {
    permissionManager: permissionCommand
  }

  // 初始化 Designer（带配置）
  designer = new GCDesigner(designerRef.value, config)

  spread = designer.getWorkbook()

  // 设置工作表基本配置
  const sheet = spread.getActiveSheet()
  sheet.setColumnCount(20)
  sheet.setRowCount(100)

  // 监听选区变化，更新当前选中信息
  spread.bind(GC.Spread.Sheets.Events.SelectionChanged, (_, args) => {
    const sheet = args.sheet
    const selections = sheet.getSelections()
    if (selections && selections.length > 0) {
      const sel = selections[0]
      // 将列索引转换为列字母 (0->A, 1->B, ...)
      const colLetter = String.fromCharCode(65 + (sel.col % 26))
      currentSelection.value = `${colLetter}${sel.row + 1}`

      // 判断选中的是行、列还是单元格
      if (sel.col === -1 && sel.row >= 0) {
        selectionInfo.value = `第 ${sel.row + 1} 行`
      } else if (sel.row === -1 && sel.col >= 0) {
        selectionInfo.value = `第 ${colLetter} 列`
      } else if (sel.row >= 0 && sel.col >= 0) {
        selectionInfo.value = `${colLetter}${sel.row + 1} 单元格`
      } else {
        selectionInfo.value = '整个工作表'
      }

      // 获取当前单元格的绑定路径
      const bindingPath = sheet.getBindingPath(sel.row, sel.col)
      currentCellBinding.value = bindingPath || ''
    } else {
      currentSelection.value = ''
      currentCellBinding.value = ''
    }
  })

  // 如果是编辑模式，加载模板数据
  if (isEdit.value) {
    const existingTemplate = dataStore.getTemplateById(Number(route.params.id))
    if (existingTemplate) {
      template.value = {
        name: existingTemplate.name,
        description: existingTemplate.description,
        category: existingTemplate.category,
        dataFields: [...existingTemplate.dataFields],
        permissions: existingTemplate.permissions || { rows: {}, columns: {}, cells: {} }
      }

      // 如果有保存的 SSJSON，加载它
      if (existingTemplate.ssjson) {
        spread.fromJSON(existingTemplate.ssjson)
      }
    }
  } else {
    // 新建模板时，初始化默认字段
    template.value.dataFields = [
      { name: '姓名', bindingPath: 'name', type: 'text', required: true },
      { name: '日期', bindingPath: 'date', type: 'date', required: true },
      { name: '金额', bindingPath: 'amount', type: 'number', required: true }
    ]
  }
})

// 辅助函数：获取选区文本描述
function getSelectionText(sel) {
  if (sel.col === -1 && sel.row >= 0) {
    return `第 ${sel.row + 1} 行`
  } else if (sel.row === -1 && sel.col >= 0) {
    const colLetter = String.fromCharCode(65 + (sel.col % 26))
    return `第 ${colLetter} 列`
  } else if (sel.row >= 0 && sel.col >= 0) {
    const colLetter = String.fromCharCode(65 + (sel.col % 26))
    return `${colLetter}${sel.row + 1} 单元格`
  }
  return '选中区域'
}

onBeforeUnmount(() => {
  // Designer不需要手动dispose，GC会自动处理
  designer = null
  spread = null
})

function goBack() {
  router.push('/templates')
}

function addField() {
  template.value.dataFields.push({
    name: '',
    bindingPath: '',
    type: 'text',
    required: false
  })
}

// 添加预设字段模板
function addFieldTemplate(tpl) {
  // 检查是否已有重复字段
  const existingPaths = template.value.dataFields.map(f => f.bindingPath)
  const newFields = tpl.fields.filter(f => !existingPaths.includes(f.bindingPath))

  if (newFields.length === 0) {
    alert('该模板的所有字段已存在')
    return
  }

  template.value.dataFields.push(...newFields)
  alert(`已添加 ${newFields.length} 个字段`)
}

function removeField(index) {
  template.value.dataFields.splice(index, 1)
}

// 将当前单元格绑定到指定字段
function bindCellToField(field) {
  if (!spread || !field.bindingPath) {
    alert('请先设置字段的绑定路径')
    return
  }

  const sheet = spread.getActiveSheet()
  const selections = sheet.getSelections()
  if (!selections || selections.length === 0) {
    alert('请先在表格中选中一个单元格')
    return
  }

  const sel = selections[0]
  sheet.setBindingPath(sel.row, sel.col, field.bindingPath)

  // 设置单元格tag存储字段信息
  sheet.setTag(sel.row, sel.col, {
    field: field.name,
    bindingPath: field.bindingPath,
    type: field.type
  })

  // 更新当前绑定状态
  currentCellBinding.value = field.bindingPath
}

// 解除当前单元格的绑定
function unbindCell() {
  if (!spread) return

  const sheet = spread.getActiveSheet()
  const selections = sheet.getSelections()
  if (!selections || selections.length === 0) return

  const sel = selections[0]
  sheet.setBindingPath(sel.row, sel.col, undefined)
  sheet.setTag(sel.row, sel.col, undefined)

  currentCellBinding.value = ''
}

// 获取字段的绑定位置信息
function getFieldBindingInfo(field) {
  if (!spread || !field.bindingPath) return ''

  const sheet = spread.getActiveSheet()
  const rowCount = sheet.getRowCount()
  const colCount = sheet.getColumnCount()

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const binding = sheet.getBindingPath(row, col)
      if (binding === field.bindingPath) {
        const colLetter = String.fromCharCode(65 + (col % 26))
        return `${colLetter}${row + 1}`
      }
    }
  }
  return ''
}

// 根据绑定路径获取字段名
function getFieldNameByPath(bindingPath) {
  const field = template.value.dataFields.find(f => f.bindingPath === bindingPath)
  return field ? field.name : bindingPath
}

// 创建表格并绑定所有字段（表格绑定方式）
function createTableWithBindings() {
  if (!spread) return

  const sheet = spread.getActiveSheet()
  const selections = sheet.getSelections()
  if (!selections || selections.length === 0) {
    alert('请先选中要创建表格的起始位置')
    return
  }

  const validFields = template.value.dataFields.filter(f => f.bindingPath)
  if (validFields.length === 0) {
    alert('请先添加并配置字段（设置绑定路径）')
    return
  }

  const sel = selections[0]
  const startRow = sel.row
  const startCol = sel.col

  // 创建表格列配置
  const tableColumns = validFields.map((field, index) => {
    const tableColumn = new GC.Spread.Sheets.Tables.TableColumn(index)
    tableColumn.name(field.name)
    tableColumn.dataField(field.bindingPath)

    // 根据类型设置格式
    if (field.type === 'date') {
      tableColumn.formatter('yyyy-mm-dd')
    }

    return tableColumn
  })

  // 创建表格
  const table = sheet.tables.add(`dataTable_${Date.now()}`, startRow, startCol, 1, validFields.length, GC.Spread.Sheets.Tables.TableThemes.medium2)
  table.autoGenerateColumns(false)
  table.bindColumns(tableColumns)
  table.bindingPath('records')

  // 设置表格标题
  sheet.getCell(startRow - 1, startCol).value('数据录入表格')
    .font('bold')
    .hAlign(GC.Spread.Sheets.HorizontalAlign.center)

  // 添加示例数据提示
  alert(`已创建表格！\n\n表格绑定的数据源格式应为：\n{\n  "records": [\n    ${validFields.map(f => `{"${f.bindingPath}": "值"}`).join(',\n    ')}\n  ]\n}`)
}

// 应用权限配置
function applyPermission(config) {
  const sheet = spread.getActiveSheet()
  const selections = sheet.getSelections()

  if (!selections || selections.length === 0) return

  const sel = selections[0]
  let key = ''
  let permissionStore = null

  // 判断权限类型并存储到对应的位置
  if (sel.col === -1 && sel.row >= 0) {
    // 行权限
    key = `row_${sel.row}`
    permissionStore = template.value.permissions.rows
  } else if (sel.row === -1 && sel.col >= 0) {
    // 列权限
    key = `col_${sel.col}`
    permissionStore = template.value.permissions.columns
  } else {
    // 单元格权限
    key = `cell_${sel.row}_${sel.col}`
    permissionStore = template.value.permissions.cells
  }

  // 存储权限配置
  permissionStore[key] = config

  // 将权限信息存储到单元格/行列的 tag 中
  if (sel.col === -1 && sel.row >= 0) {
    sheet.setTag(sel.row, -1, { ...config, type: 'row' })
  } else if (sel.row === -1 && sel.col >= 0) {
    sheet.setTag(-1, sel.col, { ...config, type: 'column' })
  } else {
    sheet.setTag(sel.row, sel.col, { ...config, type: 'cell' })
  }

  // 如果是脱敏配置，应用脱敏格式化器
  if (config.type === 'masked') {
    const maskFormatter = createMaskFormatter(config.maskType)
    if (sel.col === -1 && sel.row >= 0) {
      // 行脱敏 - 应用到该行所有单元格
      const colCount = sheet.getColumnCount()
      for (let c = 0; c < colCount; c++) {
        const existingTag = sheet.getTag(sel.row, c) || {}
        sheet.setTag(sel.row, c, { ...existingTag, maskType: config.maskType })
        sheet.getCell(sel.row, c).formatter(maskFormatter)
      }
    } else if (sel.row === -1 && sel.col >= 0) {
      // 列脱敏 - 应用到该列所有单元格
      const rowCount = sheet.getRowCount()
      for (let r = 0; r < rowCount; r++) {
        const existingTag = sheet.getTag(r, sel.col) || {}
        sheet.setTag(r, sel.col, { ...existingTag, maskType: config.maskType })
        sheet.getCell(r, sel.col).formatter(maskFormatter)
      }
    } else {
      // 单元格脱敏
      const existingTag = sheet.getTag(sel.row, sel.col) || {}
      sheet.setTag(sel.row, sel.col, { ...existingTag, maskType: config.maskType })
      sheet.getCell(sel.row, sel.col).formatter(maskFormatter)
    }
  }

  // 标记权限设置过的单元格/行列（设置背景色标识）
  markPermissionArea(sel, config)

  alert('权限配置已应用')
}

// 清除权限配置
function clearPermission() {
  const sheet = spread.getActiveSheet()
  const selections = sheet.getSelections()

  if (!selections || selections.length === 0) return

  const sel = selections[0]
  let key = ''
  let permissionStore = null

  if (sel.col === -1 && sel.row >= 0) {
    key = `row_${sel.row}`
    permissionStore = template.value.permissions.rows
    sheet.setTag(sel.row, -1, null)
    // 清除该行所有单元格的tag和格式化器
    const colCount = sheet.getColumnCount()
    for (let c = 0; c < colCount; c++) {
      const tag = sheet.getTag(sel.row, c)
      if (tag && (tag.maskType || tag.type)) {
        const newTag = { ...tag }
        delete newTag.maskType
        if (Object.keys(newTag).length === 0 || newTag.type === 'row') {
          sheet.setTag(sel.row, c, null)
        } else {
          sheet.setTag(sel.row, c, newTag)
        }
        sheet.getCell(sel.row, c).formatter(null)
      }
      sheet.getCell(sel.row, c).backColor(undefined)
    }
  } else if (sel.row === -1 && sel.col >= 0) {
    key = `col_${sel.col}`
    permissionStore = template.value.permissions.columns
    sheet.setTag(-1, sel.col, null)
    // 清除该列所有单元格的tag和格式化器
    const rowCount = sheet.getRowCount()
    for (let r = 0; r < rowCount; r++) {
      const tag = sheet.getTag(r, sel.col)
      if (tag && (tag.maskType || tag.type)) {
        const newTag = { ...tag }
        delete newTag.maskType
        if (Object.keys(newTag).length === 0 || newTag.type === 'column') {
          sheet.setTag(r, sel.col, null)
        } else {
          sheet.setTag(r, sel.col, newTag)
        }
        sheet.getCell(r, sel.col).formatter(null)
      }
      sheet.getCell(r, sel.col).backColor(undefined)
    }
  } else {
    key = `cell_${sel.row}_${sel.col}`
    permissionStore = template.value.permissions.cells
    sheet.setTag(sel.row, sel.col, null)
    sheet.getCell(sel.row, sel.col).formatter(null)
    sheet.getCell(sel.row, sel.col).backColor(undefined)
  }

  delete permissionStore[key]
  alert('权限配置已清除')
}

// 标记权限设置区域（视觉提示）
function markPermissionArea(selection, config) {
  const sheet = spread.getActiveSheet()

  // 根据权限类型设置不同的背景色
  let color = ''
  if (config.type === 'visible') {
    color = config.allVisible ? '#e8f5e9' : '#fff9c4' // 绿色：所有人可见，黄色：部分可见
  } else if (config.type === 'masked') {
    color = '#ffebee' // 红色：脱敏
  }

  if (selection.col === -1 && selection.row >= 0) {
    // 行标记 - 在行头显示
    // 由于行头不能设置颜色，我们在该行第一个单元格设置一个标识
  } else if (selection.row === -1 && selection.col >= 0) {
    // 列标记
  } else {
    // 单元格标记
    sheet.getCell(selection.row, selection.col).backColor(color)
  }
}

async function saveTemplate() {
  if (!template.value.name) {
    alert('请输入模板名称')
    return
  }

  // 保存 SSJSON
  const ssjson = spread.toJSON()
  console.log('spread.toJSON() 结果:', ssjson)
  console.log('ssjson 类型:', typeof ssjson)
  console.log('ssjson 是否有 sheets 属性:', ssjson?.sheets ? '是' : '否')

  const templateData = {
    ...template.value,
    ssjson,
    createdAt: new Date().toISOString().split('T')[0],
    createdBy: '管理员'
  }
  console.log('templateData ssjson 是否有值:', !!templateData.ssjson)

  // 检查是否已存在同名模板
  const existingTemplate = dataStore.templates.find(t => t.name === template.value.name)
  console.log('保存模板检查:', {
    templateName: template.value.name,
    foundExisting: !!existingTemplate,
    isEdit: isEdit.value,
    ssjsonLength: ssjson ? ssjson.length : 0
  })

  if (existingTemplate) {
    // 更新已有模板
    await dataStore.updateTemplate(existingTemplate.id, templateData)
    await dataStore.refresh()
  } else if (isEdit.value) {
    await dataStore.updateTemplate(Number(route.params.id), templateData)
    await dataStore.refresh()
  } else {
    await dataStore.addTemplate(templateData)
  }

  alert('模板保存成功')
  router.push('/templates')
}
</script>

<style scoped>
.template-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.designer-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1rem;
  overflow: hidden;
}

.designer-main {
  overflow: hidden;
}

#designer-container {
  width: 100%;
  height: 600px;
}

.designer-sidebar {
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 13px;
  color: var(--gray-700);
}

.divider {
  height: 1px;
  background-color: var(--gray-200);
  margin: 1rem 0;
}

.field-templates-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.field-template-btn {
  padding: 0.5rem;
  font-size: 12px;
  white-space: nowrap;
}

.field-template-btn:hover {
  background-color: var(--primary);
  color: white;
}

.current-selection {
  padding: 0.75rem;
  background-color: var(--primary-light);
  border: 1px solid var(--primary);
  border-radius: var(--radius);
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.field-buttons-wrapper {
  max-height: 80px;
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.field-buttons-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.5rem;
  max-height: 80px;
  overflow-y: auto;
}

.field-bind-btn {
  padding: 0.3rem 0.6rem;
  font-size: 12px;
  white-space: nowrap;
}

.binding-info {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--gray-200);
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-item {
  padding: 0.75rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background-color: var(--gray-50);
}

.field-item:hover {
  border-color: var(--primary);
  background-color: white;
}

.field-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.field-header input {
  flex: 1;
}

.field-body {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5rem;
}

.input-sm {
  padding: 0.375rem 0.5rem;
  font-size: 13px;
}

.field-binding-info {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--gray-300);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input {
  margin: 0;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
