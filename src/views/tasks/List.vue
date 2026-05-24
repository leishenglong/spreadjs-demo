<template>
  <div class="task-list">
    <div class="page-header">
      <h2 class="text-xl font-semibold">
        {{ isEmployee ? '我的任务' : isManager ? '部门审批' : isFinance ? '预算审批' : '任务管理' }}
      </h2>
      <div class="header-actions">
        <select v-model="statusFilter" class="input">
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="rejected">已驳回</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ stats.inProgress }}</div>
          <div class="stat-label">进行中</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table">
          <thead>
            <tr>
              <th>任务标题</th>
              <th>部门</th>
              <th>模板</th>
              <th>当前步骤</th>
              <th>状态</th>
              <th>截止日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredTasks" :key="task.id">
              <td class="font-medium">{{ task.title }}</td>
              <td>{{ task.department || '-' }}</td>
              <td>{{ task.templateName }}</td>
              <td>
                <span class="badge badge-primary">{{ task.currentStepName }}</span>
              </td>
              <td>
                <span :class="['badge', getStatusBadgeClass(task.status)]">
                  {{ statusText[task.status] }}
                </span>
              </td>
              <td>{{ task.dueDate }}</td>
              <td>
                <div class="flex gap-2">
                  <!-- 员工：填写按钮 -->
                  <router-link v-if="isEmployee && task.status === 'pending' && canFillTask(task)" :to="`/tasks/fill/${task.id}`" class="btn btn-primary btn-sm">
                    填写
                  </router-link>
                  <!-- 部门负责人/财务：审批按钮 -->
                  <router-link v-if="canApproveTask(task)" :to="`/tasks/approve/${task.id}`" class="btn btn-warning btn-sm">
                    审批
                  </router-link>
                  <!-- 查看按钮 -->
                  <router-link :to="`/tasks/view/${task.id}`" class="btn btn-secondary btn-sm">
                    查看
                  </router-link>
                </div>
              </td>
            </tr>
            <tr v-if="filteredTasks.length === 0">
              <td colspan="7" class="text-center text-gray-500 py-8">
                暂无任务
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const authStore = useAuthStore()
const dataStore = useDataStore()

const statusFilter = ref('all')

const statusText = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  rejected: '已驳回'
}

const isAdmin = computed(() => authStore.isAdmin)
const isEmployee = computed(() => authStore.isEmployee)
const isManager = computed(() => authStore.isManager)
const isFinance = computed(() => authStore.isFinance)

// 获取当前用户可见的任务列表
const userTasks = computed(() => {
  const allTasks = dataStore.getAllTasks()

  // 管理员看到所有任务
  if (isAdmin.value) {
    return allTasks
  }

  // 财务看到所有任务
  if (isFinance.value) {
    return allTasks
  }

  // 部门负责人看到本部门的审批任务（currentStep > 1）
  if (isManager.value) {
    return allTasks.filter(t => t.department === authStore.user.department && t.currentStep > 1)
  }

  // 部门员工看到自己被分配的任务
  if (isEmployee.value) {
    return allTasks.filter(t => t.assigneeId === authStore.user.id)
  }

  return []
})

const filteredTasks = computed(() => {
  if (statusFilter.value === 'all') return userTasks.value
  return userTasks.value.filter(t => t.status === statusFilter.value)
})

const stats = computed(() => {
  const tasks = userTasks.value
  return {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  }
})

// 判断员工是否可以填写任务
function canFillTask(task) {
  // 只有任务的当前处理人是该员工且任务处于待处理状态才能填写
  return task.assigneeId === authStore.user.id && task.currentStep === 1
}

// 判断是否可以审批任务
function canApproveTask(task) {
  if (task.status === 'completed' || task.status === 'rejected') {
    return false
  }

  // 财务可以审批所有任务
  if (isFinance.value) {
    return task.currentStep >= 2 // 部门审批和财务审批阶段
  }

  // 部门负责人只能审批本部门的任务
  if (isManager.value) {
    return task.department === authStore.user.department && task.currentStep === 2
  }

  return false
}

function getStatusBadgeClass(status) {
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
</script>

<style scoped>
.task-list {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  color: var(--gray-500);
  font-size: 14px;
}

.badge-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.badge-info {
  background-color: #cce5ff;
  color: #004085;
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

.btn-warning {
  background-color: #ffc107;
  color: #000;
  border: none;
}

.btn-warning:hover {
  background-color: #e0a800;
}
</style>
