<template>
  <div class="task-view">
    <div class="view-header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn btn-secondary btn-sm">返回</button>
        <div>
          <h2 class="text-lg font-semibold">{{ task?.title }}</h2>
          <p class="text-sm text-gray-500">模板: {{ task?.templateName }}</p>
        </div>
      </div>
      <span :class="['badge', `badge-${task?.status === 'completed' ? 'success' : 'primary'}`]">
        {{ statusText[task?.status] }}
      </span>
    </div>

    <div class="view-content card">
      <div class="card-body p-0">
        <div id="spread-container" ref="spreadRef"></div>
      </div>
    </div>

    <div v-if="task?.history?.length" class="task-history card mt-4">
      <div class="card-header">
        <h3 class="card-title">流程记录</h3>
      </div>
      <div class="card-body">
        <div class="timeline">
          <div v-for="(record, index) in task.history" :key="index" class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="font-medium">{{ record.step }}</span>
                <span class="text-sm text-gray-500">{{ record.time }}</span>
              </div>
              <p class="timeline-operator">{{ record.operator }} - {{ record.action }}</p>
              <p v-if="record.comment" class="timeline-comment">{{ record.comment }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDataStore } from '@/stores/data'

import '@grapecity-software/spread-sheets/styles/gc.spread.sheets.excel2013white.css'
import "@grapecity-software/spread-sheets-io"
import "@grapecity-software/spread-sheets-resources-zh"
import * as GC from "@grapecity-software/spread-sheets"

const router = useRouter()
const route = useRoute()
const dataStore = useDataStore()

const spreadRef = ref(null)
let spread = null

const task = ref(null)
const template = ref(null)

const statusText = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成'
}

onMounted(() => {
  const taskId = Number(route.params.id)
  task.value = dataStore.getAllTasks().find(t => t.id === taskId)

  if (!task.value) {
    alert('任务不存在')
    router.push('/tasks')
    return
  }

  template.value = dataStore.getTemplateById(task.value.templateId)

  // 初始化 SpreadJS（只读查看模式）
  spread = new GC.Spread.Sheets.Workbook(spreadRef.value, {
    sheetCount: 1
  })

  let sheet = spread.getActiveSheet()

  // 加载模板 SSJSON
  if (template.value?.ssjson && template.value.ssjson.sheets) {
    spread.fromJSON(template.value.ssjson)
    sheet = spread.getActiveSheet()
  } else {
    // 根据 dataFields 创建默认表格
    createDefaultSheet(sheet)
  }

  // 加载任务数据（使用字段索引直接设置值）
  if (task.value?.data && template.value?.dataFields) {
    template.value.dataFields.forEach((field, index) => {
      if (field.bindingPath && task.value.data[field.bindingPath] !== undefined) {
        const row = 1
        const col = index + 1
        sheet.setValue(row, col, task.value.data[field.bindingPath])
      }
    })
  }

  // 设置为完全只读
  sheet.options.isProtected = true
  sheet.options.protectionOptions = {
    allowSelectUnlockedCells: true,
    allowSelectLockedCells: true,
    allowFilter: false,
    allowSort: false,
    allowResizeRows: false,
    allowResizeColumns: false,
    allowEditObjects: false
  }
})

onBeforeUnmount(() => {
  spread = null
})

function createDefaultSheet(sheet) {
  if (!template.value || !template.value?.dataFields) return

  const fields = template.value.dataFields
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
  })

  // 添加序号列
  for (let i = 1; i <= 10; i++) {
    sheet.getCell(i, 0).value(i).locked(true)
  }
}

function goBack() {
  router.push('/tasks')
}
</script>

<style scoped>
.task-view {
  max-width: 100%;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.view-content {
  overflow: hidden;
}

#spread-container {
  width: 100%;
  height: 500px;
}

.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--gray-200);
}

.timeline-item {
  position: relative;
  padding-bottom: 1.5rem;
}

.timeline-dot {
  position: absolute;
  left: -2.35rem;
  top: 0.25rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--primary);
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--primary);
}

.timeline-content {
  background-color: var(--gray-50);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.timeline-operator {
  font-size: 13px;
  color: var(--gray-600);
}

.timeline-comment {
  font-size: 13px;
  color: var(--gray-500);
  margin-top: 0.25rem;
}
</style>
