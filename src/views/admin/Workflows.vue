<template>
  <div class="workflow-manage">
    <div class="page-header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn btn-secondary btn-sm">返回</button>
        <h2 class="text-xl font-semibold">{{ isEdit || isEditFallback ? '编辑流程' : '创建流程' }}</h2>
      </div>
      <button v-if="shouldShowSave" @click="saveWorkflow" class="btn btn-primary">保存流程</button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">基本信息</h3>
        </div>
        <div class="card-body">
          <div class="form-group mb-4">
            <label class="form-label">流程名称</label>
            <input v-model="workflow.name" type="text" class="input" placeholder="请输入流程名称" />
          </div>
          <div class="form-group mb-4">
            <label class="form-label">流程描述</label>
            <textarea v-model="workflow.description" class="input" rows="3" placeholder="请输入流程描述"></textarea>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">关联模板</label>
            <select v-model="workflow.templateId" class="input">
              <option value="">请选择模板</option>
              <option v-for="template in dataStore.templates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="flex justify-between items-center">
            <h3 class="card-title">流程步骤</h3>
            <button @click="addStep" class="btn btn-secondary btn-sm">添加步骤</button>
          </div>
        </div>
        <div class="card-body">
          <div class="steps-list">
            <div v-for="(step, index) in workflow.steps" :key="index" class="step-item">
              <div class="step-header">
                <span class="step-number">{{ index + 1 }}</span>
                <button @click="removeStep(index)" class="btn btn-danger btn-sm">删除</button>
              </div>
              <div class="step-body">
                <div class="form-group mb-4">
                  <label class="form-label">步骤名称</label>
                  <input v-model="step.name" type="text" class="input" placeholder="如：填写、审批" />
                </div>
                <div class="form-group mb-4">
                  <label class="form-label">处理人类型</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input v-model="step.assigneeType" type="radio" value="role" />
                      <span>按角色</span>
                    </label>
                    <label class="radio-label">
                      <input v-model="step.assigneeType" type="radio" value="department" />
                      <span>按部门</span>
                    </label>
                    <label class="radio-label">
                      <input v-model="step.assigneeType" type="radio" value="users" />
                      <span>指定用户</span>
                    </label>
                    <label class="radio-label">
                      <input v-model="step.assigneeType" type="radio" value="initiator" />
                      <span>发起人上级</span>
                    </label>
                  </div>
                </div>

                <!-- 按角色选择 - 角色 -> 用户树形结构 -->
                <div v-if="step.assigneeType === 'role'" class="form-group mb-4">
                  <label class="form-label">选择角色及用户</label>
                  <div class="tree-selector">
                    <div v-for="role in authStore.roles" :key="role.id" class="tree-node">
                      <div
                        class="tree-node-header"
                        :class="{ selected: step.assignees === role.id && !step.assigneeIds?.length }"
                        @click="toggleRole(step, role)"
                      >
                        <input
                          type="checkbox"
                          :checked="step.assignees === role.id && !step.assigneeIds?.length"
                          @click.stop
                          @change="toggleRole(step, role)"
                        />
                        <span class="tree-icon">👤</span>
                        <span class="tree-label">{{ role.name }}</span>
                        <span class="tree-count">({{ getUsersByRole(role.id).length }}人)</span>
                      </div>
                      <div class="tree-children">
                        <div
                          v-for="user in getUsersByRole(role.id)"
                          :key="user.id"
                          class="tree-node-child"
                        >
                          <div
                            class="tree-node-header"
                            :class="{ selected: isUserSelected(step, user.id) }"
                            @click="toggleStepUser(step, user.id)"
                          >
                            <input
                              type="checkbox"
                              :checked="isUserSelected(step, user.id)"
                              @click.stop
                              @change="toggleStepUser(step, user.id)"
                            />
                            <span class="tree-icon">👥</span>
                            <span class="tree-label">{{ user.name }}</span>
                            <span class="tree-dept">{{ user.department }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 按部门选择 - 部门 -> 用户树形结构 -->
                <div v-if="step.assigneeType === 'department'" class="form-group mb-4">
                  <label class="form-label">选择部门及用户</label>
                  <div class="tree-selector">
                    <div v-for="dept in authStore.departments" :key="dept.id" class="tree-node">
                      <div
                        class="tree-node-header"
                        :class="{ selected: isDepartmentSelected(step, dept.id) }"
                        @click="toggleDepartment(step, dept)"
                      >
                        <input
                          type="checkbox"
                          :checked="isDepartmentSelected(step, dept.id)"
                          @click.stop
                          @change="toggleDepartment(step, dept)"
                        />
                        <span class="tree-icon">🏢</span>
                        <span class="tree-label">{{ dept.name }}</span>
                        <span class="tree-count">({{ getUsersByDepartment(dept.id).length }}人)</span>
                      </div>
                      <div class="tree-children">
                        <div
                          v-for="user in getUsersByDepartment(dept.id)"
                          :key="user.id"
                          class="tree-node-child"
                        >
                          <div
                            class="tree-node-header"
                            :class="{ selected: isUserSelected(step, user.id) }"
                            @click="toggleStepUser(step, user.id)"
                          >
                            <input
                              type="checkbox"
                              :checked="isUserSelected(step, user.id)"
                              @click.stop
                              @change="toggleStepUser(step, user.id)"
                            />
                            <span class="tree-icon">👥</span>
                            <span class="tree-label">{{ user.name }}</span>
                            <span class="tree-role">{{ user.roleName }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 指定用户选择 -->
                <div v-if="step.assigneeType === 'users'" class="form-group mb-4">
                  <label class="form-label">选择用户</label>
                  <div class="user-selector">
                    <label v-for="user in authStore.users" :key="user.id" class="checkbox-label">
                      <input
                        :checked="isUserSelected(step, user.id)"
                        @change="toggleStepUser(step, user.id)"
                        type="checkbox"
                      />
                      <span>{{ user.name }} ({{ user.department }})</span>
                    </label>
                  </div>
                </div>

                <!-- 发起人上级 -->
                <div v-if="step.assigneeType === 'initiator'" class="form-group mb-4">
                  <label class="text-sm text-gray-500">将自动分配给发起人的直属上级</label>
                </div>
              </div>
            </div>
            <div v-if="workflow.steps.length === 0" class="text-center text-gray-500 py-8">
              暂无步骤，点击"添加步骤"创建
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">
        <h3 class="card-title">流程预览</h3>
      </div>
      <div class="card-body">
        <div class="workflow-preview">
          <div v-for="(step, index) in workflow.steps" :key="index" class="preview-step">
            <div class="preview-step-number">{{ index + 1 }}</div>
            <div class="preview-step-content">
              <div class="font-medium">{{ step.name }}</div>
              <div class="text-sm text-gray-500">{{ getAssigneeDisplay(step) }}</div>
            </div>
            <div v-if="index < workflow.steps.length - 1" class="preview-arrow">→</div>
          </div>
          <div v-if="workflow.steps.length === 0" class="text-center text-gray-500 py-4">
            添加步骤后预览流程
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const dataStore = useDataStore()
const authStore = useAuthStore()

const isEdit = computed(() => route.name === 'WorkflowEdit')
const isCreate = computed(() => route.name === 'WorkflowCreate')

// 备用判断逻辑
const isEditFallback = computed(() => {
  return route.path.includes('/workflows/') && route.params.id && route.params.id !== 'create'
})
const isCreateFallback = computed(() => {
  return route.path === '/admin/workflows' || route.params.id === 'create'
})

// 同时检查两种方式
const shouldShowSave = computed(() => {
  return isEdit.value || isCreate.value || isEditFallback.value || isCreateFallback.value
})

console.log('Workflows mounted:', {
  path: route.path,
  routeName: route.name,
  params: route.params,
  isEdit: isEdit.value,
  isCreate: isCreate.value,
  isEditFallback: isEditFallback.value,
  isCreateFallback: isCreateFallback.value
})

const workflow = ref({
  name: '',
  description: '',
  templateId: '',
  status: 'active',
  steps: []
})

onMounted(() => {
  // 如果是创建新流程，初始化步骤
  if (isCreate.value && workflow.value.steps.length === 0) {
    addStep()
  }

  // 如果是编辑，加载数据
  if (isEdit.value) {
    const existing = dataStore.getWorkflowById(Number(route.params.id))
    if (existing) {
      workflow.value = JSON.parse(JSON.stringify(existing))
      // 确保每个步骤都有必要的字段
      workflow.value.steps.forEach(step => {
        if (!step.assigneeType) {
          step.assigneeType = 'role'
        }
        if (!step.assigneeIds) {
          step.assigneeIds = []
        }
      })
    }
  }
})

function goBack() {
  router.push('/admin')
}

function addStep() {
  workflow.value.steps.push({
    name: '',
    assigneeType: 'role',
    assignees: '',
    assigneeIds: [],
    order: workflow.value.steps.length + 1
  })
}

function removeStep(index) {
  workflow.value.steps.splice(index, 1)
  // 重新排序
  workflow.value.steps.forEach((step, i) => {
    step.order = i + 1
  })
}

function isUserSelected(step, userId) {
  return step.assigneeIds && step.assigneeIds.includes(userId)
}

// 检查部门是否被选中
function isDepartmentSelected(step, deptId) {
  // 部门被选中条件：assignees 等于该部门ID
  return step.assignees === deptId
}

function toggleStepUser(step, userId) {
  if (!step.assigneeIds) {
    step.assigneeIds = []
  }
  const index = step.assigneeIds.indexOf(userId)
  if (index > -1) {
    step.assigneeIds.splice(index, 1)
  } else {
    step.assigneeIds.push(userId)
  }

  // 如果选择了用户，自动设置部门
  if (step.assigneeIds.includes(userId)) {
    const user = authStore.users.find(u => u.id === userId)
    if (user) {
      step.assignees = user.department
    }
  }
}

// 切换角色选择
function toggleRole(step, role) {
  if (step.assignees === role.id && !step.assigneeIds?.length) {
    // 取消选择该角色
    step.assignees = ''
  } else {
    // 选择该角色，清空具体用户选择
    step.assignees = role.id
    step.assigneeIds = []
  }
}

// 切换部门选择
function toggleDepartment(step, dept) {
  if (step.assignees === dept.id && !step.assigneeIds?.length) {
    // 取消选择该部门
    step.assignees = ''
  } else {
    // 选择该部门，清空具体用户选择
    step.assignees = dept.id
    step.assigneeIds = []
  }
}

// 根据角色获取用户列表
function getUsersByRole(roleId) {
  return authStore.users.filter(u => u.role === roleId)
}

// 根据部门获取用户列表
function getUsersByDepartment(deptId) {
  return authStore.users.filter(u => u.department === deptId)
}

function getAssigneeDisplay(step) {
  if (!step.assigneeType) return '未设置'

  switch (step.assigneeType) {
    case 'role':
      const role = authStore.roles.find(r => r.id === step.assignees)
      return role ? role.name : step.assignees || '未选择'
    case 'department':
      const dept = authStore.departments.find(d => d.id === step.assignees)
      return dept ? dept.name : step.assignees || '未选择'
    case 'users':
      if (step.assigneeIds && step.assigneeIds.length > 0) {
        const users = step.assigneeIds.map(id => {
          const user = authStore.users.find(u => u.id === id)
          return user ? user.name : id
        })
        return users.join('、')
      }
      return '未选择用户'
    case 'initiator':
      return '发起人上级'
    default:
      return step.assignees || '未设置'
  }
}

async function saveWorkflow() {
  if (!workflow.value.name) {
    alert('请输入流程名称')
    return
  }
  if (!workflow.value.templateId) {
    alert('请选择关联模板')
    return
  }
  if (workflow.value.steps.length === 0) {
    alert('请至少添加一个步骤')
    return
  }

  // 验证步骤
  for (const step of workflow.value.steps) {
    if (!step.name) {
      alert('请完善所有步骤名称')
      return
    }

    // 验证处理人配置
    if (step.assigneeType === 'role' && !step.assignees) {
      alert('请选择角色')
      return
    }
    if (step.assigneeType === 'department' && !step.assignees) {
      alert('请选择部门')
      return
    }
    if (step.assigneeType === 'users' && (!step.assigneeIds || step.assigneeIds.length === 0)) {
      alert('请选择用户')
      return
    }
  }

  // 转换数据格式以兼容旧版本
  const stepsToSave = workflow.value.steps.map(step => {
    let assignees = ''
    let assigneeIds = []

    if (step.assigneeType === 'users') {
      // 指定用户时，只使用 assigneeIds（必须是数字ID）
      assigneeIds = (step.assigneeIds || []).filter(id => typeof id === 'number')
      assignees = ''
    } else if (step.assigneeType === 'department') {
      // 按部门时，assignees 是部门名称，assigneeIds 必须清空
      assignees = step.assignees || ''
      assigneeIds = []
    } else if (step.assigneeType === 'role') {
      // 按角色时，assignees 是角色ID
      assignees = step.assignees || ''
      assigneeIds = []
    }

    return {
      id: step.id,
      name: step.name,
      assigneeType: step.assigneeType,
      assignees: assignees,
      assigneeIds: assigneeIds,
      order: step.order
    }
  })

  const workflowToSave = {
    ...workflow.value,
    steps: stepsToSave
  }

  if (isEdit.value) {
    await dataStore.updateWorkflow(Number(route.params.id), workflowToSave)
  } else {
    await dataStore.addWorkflow(workflowToSave)

    // 新建流程后，自动下发任务（只下发第一步）
    const template = dataStore.getTemplateById(workflow.value.templateId)
    const firstStep = workflow.value.steps[0]

    if (firstStep) {
      console.log('firstStep 配置:', firstStep)
      let assigneeIds = []

      // 根据处理人类型确定任务接收人
      if (firstStep.assigneeType === 'role' && firstStep.assignees) {
        // 按角色：获取该角色下的所有用户
        assigneeIds = authStore.users.filter(u => u.role === firstStep.assignees).map(u => u.id)
      } else if (firstStep.assigneeType === 'department' && firstStep.assignees) {
        // 按部门：获取该部门下的填报角色用户（employee），不是审批角色
        assigneeIds = authStore.users
          .filter(u => u.department === firstStep.assignees && u.role === 'employee')
          .map(u => u.id)
        console.log('按部门获取填报角色用户:', firstStep.assignees, assigneeIds)
      } else if (firstStep.assigneeType === 'users' && firstStep.assigneeIds) {
        // 指定用户
        assigneeIds = [...firstStep.assigneeIds]
        console.log('指定用户:', assigneeIds)
      }

      console.log('最终 assigneeIds:', assigneeIds)

      // 为每个任务接收人创建任务
      for (const assigneeId of assigneeIds) {
        const assignee = authStore.users.find(u => u.id === assigneeId)
        // 确保 assigneeId 是有效的数字用户ID
        if (typeof assigneeId !== 'number' || !assignee) {
          console.warn('跳过无效的 assigneeId:', assigneeId)
          continue
        }
        const taskData = {
          workflowId: workflowToSave.id || dataStore.workflows[dataStore.workflows.length - 1]?.id,
          workflowName: workflow.value.name,
          templateId: workflow.value.templateId,
          templateName: template?.name || '',
          title: `${workflow.value.name} - ${firstStep.name}`,
          status: 'pending',
          currentStep: firstStep.id,
          currentStepName: firstStep.name,
          assigneeId: assigneeId,
          assigneeName: assignee?.name || '',
          department: assignee?.department || '',
          createdBy: '系统自动创建',
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: '',
          data: {},
          ssjson: null,
          history: []
        }
        await dataStore.addTask(taskData)
      }
    }
  }

  alert('流程保存成功')
  router.push('/admin')
}
</script>

<style scoped>
.workflow-manage {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 13px;
  color: var(--gray-700);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-item {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 1rem;
  background-color: var(--gray-50);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 14px;
}

.radio-label input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.user-selector {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 0.5rem;
  background-color: white;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 14px;
  padding: 0.25rem 0;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

/* 树形选择器样式 */
.tree-selector {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background-color: white;
  max-height: 250px;
  overflow-y: auto;
}

.tree-node {
  border-bottom: 1px solid var(--gray-100);
}

.tree-node:last-child {
  border-bottom: none;
}

.tree-node-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 0.5rem;
}

.tree-node-header:hover {
  background-color: var(--gray-50);
}

.tree-node-header.selected {
  background-color: #e3f2fd;
}

.tree-node-header input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.tree-children {
  padding-left: 1.5rem;
}

.tree-node-child .tree-node-header {
  padding-left: 1rem;
}

.tree-icon {
  font-size: 14px;
}

.tree-label {
  flex: 1;
  font-size: 14px;
}

.tree-count {
  font-size: 12px;
  color: var(--gray-500);
}

.tree-dept, .tree-role {
  font-size: 12px;
  color: var(--gray-500);
  margin-left: 0.5rem;
}

.workflow-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.preview-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  font-weight: 600;
}

.preview-step-content {
  padding: 0.5rem 0.75rem;
  background-color: var(--gray-50);
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.preview-arrow {
  color: var(--gray-400);
  font-size: 18px;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.py-4 {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
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

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 12px;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

.text-sm {
  font-size: 12px;
}

.text-gray-500 {
  color: var(--gray-500);
}

.text-center {
  text-align: center;
}

.font-medium {
  font-weight: 500;
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

.justify-between {
  justify-content: space-between;
}

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

textarea.input {
  resize: vertical;
  min-height: 80px;
}
</style>
