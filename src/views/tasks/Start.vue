<template>
  <div class="flow-start">
    <div class="page-header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn btn-secondary btn-sm">返回</button>
        <h2 class="text-xl font-semibold">发起流程</h2>
      </div>
    </div>

    <!-- 步骤1：选择流程 -->
    <div v-if="currentStep === 1" class="card">
      <div class="card-header">
        <h3 class="card-title">选择流程</h3>
      </div>
      <div class="card-body">
        <div v-if="activeWorkflows.length === 0" class="text-center text-gray-500 py-8">
          暂无可用的流程，请联系管理员创建流程
        </div>
        <div class="workflow-list">
          <div
            v-for="workflow in activeWorkflows"
            :key="workflow.id"
            class="workflow-item"
            :class="{ selected: selectedWorkflow?.id === workflow.id }"
            @click="selectWorkflow(workflow)"
          >
            <div class="workflow-info">
              <h4 class="workflow-name">{{ workflow.name }}</h4>
              <p class="workflow-desc">{{ workflow.description }}</p>
              <div class="workflow-meta">
                <span class="badge badge-primary">{{ workflow.steps?.length || 0 }} 个步骤</span>
                <span class="text-sm text-gray-500">关联模板: {{ getTemplateName(workflow.templateId) }}</span>
              </div>
            </div>
            <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤2：填写任务信息 -->
    <div v-if="currentStep === 2" class="card">
      <div class="card-header">
        <button @click="currentStep = 1" class="btn btn-secondary btn-sm">← 上一步</button>
        <h3 class="card-title">填写任务信息</h3>
        <div></div>
      </div>
      <div class="card-body">
        <div class="form-group mb-4">
          <label class="form-label">任务标题</label>
          <input v-model="taskForm.title" type="text" class="input" placeholder="如：2026年度业务投放预算" />
          <p class="text-sm text-gray-500 mt-1">为这次填报取一个易于识别的名称</p>
        </div>

        <div class="form-group mb-4">
          <label class="form-label">截止日期</label>
          <input v-model="taskForm.dueDate" type="date" class="input" />
        </div>

        <div class="form-group mb-4">
          <label class="form-label">关联模板</label>
          <div class="template-info">
            <div class="font-medium">{{ selectedTemplate?.name }}</div>
            <div class="text-sm text-gray-500">{{ selectedTemplate?.description }}</div>
            <div class="text-sm text-gray-500 mt-2">包含字段: {{ selectedTemplate?.dataFields?.length || 0 }} 个</div>
          </div>
        </div>

        <!-- 流程预览 -->
        <div class="form-group mb-4">
          <label class="form-label">流程预览</label>
          <div class="workflow-preview">
            <div v-for="(step, index) in selectedWorkflow?.steps" :key="index" class="preview-step">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-info">
                <div class="step-name">{{ step.name }}</div>
                <div class="step-assignee">
                  <span class="badge badge-secondary">{{ getStepAssigneeDisplay(step) }}</span>
                </div>
              </div>
              <div v-if="index < selectedWorkflow.steps.length - 1" class="step-arrow">→</div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button @click="startFlow" class="btn btn-primary btn-lg">发起并填写</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const dataStore = useDataStore()
const authStore = useAuthStore()

const currentStep = ref(1)
const selectedWorkflow = ref(null)

const taskForm = ref({
  title: '',
  dueDate: getDefaultDueDate()
})

const activeWorkflows = computed(() => {
  return dataStore.workflows.filter(w => w.status === 'active')
})

const selectedTemplate = computed(() => {
  if (!selectedWorkflow.value) return null
  return dataStore.getTemplateById(selectedWorkflow.value.templateId)
})

function getDefaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

function getTemplateName(templateId) {
  const template = dataStore.getTemplateById(templateId)
  return template?.name || '未知模板'
}

function getStepAssigneeDisplay(step) {
  if (!step) return ''

  switch (step.assigneeType) {
    case 'employee':
      return '填报人'
    case 'manager':
      return '部门负责人'
    case 'finance':
      return '财务'
    case 'role':
      return step.assignees
    default:
      return step.assignees || ''
  }
}

function selectWorkflow(workflow) {
  selectedWorkflow.value = workflow

  // 自动填充默认标题
  const template = dataStore.getTemplateById(workflow.templateId)
  if (template) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    taskForm.value.title = `${year}年${month}月${template.name.replace(/[（(].*[）)]/g, '').replace(/表/g, '').replace(/单/g, '')}`
  }
  currentStep.value = 2
}

async function startFlow() {
  if (!taskForm.value.title) {
    alert('请输入任务标题')
    return
  }

  if (!taskForm.value.dueDate) {
    alert('请选择截止日期')
    return
  }

  if (!selectedWorkflow.value) {
    alert('请选择流程')
    return
  }

  // 获取第一步（填写步骤）的处理人
  const fillStep = selectedWorkflow.value.steps?.find(s => s.order === 1)
  const currentUser = authStore.user

  // 创建新任务
  const newTask = {
    workflowId: selectedWorkflow.value.id,
    workflowName: selectedWorkflow.value.name,
    templateId: selectedWorkflow.value.templateId,
    templateName: selectedTemplate.value?.name || '',
    title: taskForm.value.title,
    status: 'pending',
    currentStep: 1,
    currentStepName: fillStep?.name || '填写',
    // 当前处理人
    assigneeId: currentUser.id,
    assigneeName: currentUser.name,
    department: currentUser.department,
    createdBy: currentUser.name,
    creatorId: currentUser.id,
    createdAt: new Date().toISOString().split('T')[0],
    dueDate: taskForm.value.dueDate,
    data: {},
    ssjson: null,
    history: [],
    // 保存完整的步骤配置
    stepsConfig: selectedWorkflow.value.steps || []
  }

  const createdTask = await dataStore.addTask(newTask)
  alert('任务发起成功！')
  router.push(`/tasks/fill/${createdTask.id}`)
}

function goBack() {
  router.push('/tasks')
}
</script>

<style scoped>
.flow-start {
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workflow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.workflow-item:hover {
  border-color: var(--primary);
  background-color: var(--primary-light);
}

.workflow-item.selected {
  border-color: var(--primary);
  background-color: var(--primary-light);
}

.workflow-info {
  flex: 1;
}

.workflow-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.25rem;
}

.workflow-desc {
  font-size: 14px;
  color: var(--gray-500);
  margin-bottom: 0.5rem;
}

.workflow-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chevron {
  color: var(--gray-400);
  flex-shrink: 0;
}

.template-info {
  padding: 1rem;
  background-color: var(--gray-50);
  border-radius: var(--radius);
}

.workflow-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--gray-50);
  border-radius: var(--radius);
  flex-wrap: wrap;
}

.preview-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  width: 28px;
  height: 28px;
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.step-name {
  font-weight: 500;
  font-size: 14px;
}

.step-assignee {
  font-size: 12px;
}

.step-arrow {
  color: var(--gray-400);
  font-size: 18px;
}

.badge-secondary {
  background-color: var(--gray-200);
  color: var(--gray-700);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 12px;
}
</style>
