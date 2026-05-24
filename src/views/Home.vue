<template>
  <div class="home-page">
    <div class="welcome-banner card mb-6">
      <div class="card-body">
        <h2 class="text-xl font-semibold mb-2">欢迎使用预算填报系统</h2>
        <p class="text-white-80">{{ authStore.user?.name }} ({{ authStore.user?.department }})</p>
        <p class="text-white-60">{{ currentDate }}</p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-icon stat-icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="stat-value">{{ dataStore.templates.length }}</div>
          <div class="stat-label">模板数量</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-icon stat-icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </div>
          <div class="stat-value">{{ dataStore.workflows.length }}</div>
          <div class="stat-label">流程数量</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-icon stat-icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-value">{{ myTasks.length }}</div>
          <div class="stat-label">待办任务</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-icon stat-icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div class="stat-value">{{ completedTasks }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">我的待办任务</h3>
          <router-link to="/tasks" class="btn btn-secondary btn-sm">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="pendingTasks.length === 0" class="text-center text-gray-500 py-8">
            暂无待办任务
          </div>
          <div v-else class="task-list">
            <div v-for="task in pendingTasks.slice(0, 5)" :key="task.id" class="task-item">
              <div class="task-info">
                <div class="font-medium">{{ task.title }}</div>
                <div class="text-sm text-gray-500">{{ task.templateName }}</div>
              </div>
              <router-link :to="`/tasks/fill/${task.id}`" class="btn btn-primary btn-sm">
                处理
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">最近完成</h3>
          <router-link to="/tasks" class="btn btn-secondary btn-sm">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="recentCompleted.length === 0" class="text-center text-gray-500 py-8">
            暂无已完成任务
          </div>
          <div v-else class="task-list">
            <div v-for="task in recentCompleted.slice(0, 5)" :key="task.id" class="task-item">
              <div class="task-info">
                <div class="font-medium">{{ task.title }}</div>
                <div class="text-sm text-gray-500">{{ task.templateName }}</div>
              </div>
              <router-link :to="`/tasks/view/${task.id}`" class="btn btn-secondary btn-sm">
                查看
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const authStore = useAuthStore()
const dataStore = useDataStore()

const currentDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

const userTasks = computed(() => {
  return authStore.isAdmin
    ? dataStore.getAllTasks()
    : dataStore.getTasksByAssignee(authStore.user.id)
})

const myTasks = computed(() => {
  return userTasks.value.filter(t => t.status !== 'completed')
})

const completedTasks = computed(() => {
  return userTasks.value.filter(t => t.status === 'completed').length
})

const pendingTasks = computed(() => {
  return userTasks.value.filter(t => t.status === 'pending' || t.status === 'in_progress')
})

const recentCompleted = computed(() => {
  return userTasks.value
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})
</script>

<style scoped>
.home-page {
  max-width: 100%;
}

.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.welcome-banner .card-body h2 {
  color: white;
}

.welcome-banner .text-gray-500 {
  color: rgba(255, 255, 255, 0.8);
}

.welcome-banner .text-white-60 {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.stat-card {
  position: relative;
}

.stat-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon-blue {
  background-color: #3b82f6;
}

.stat-icon-green {
  background-color: #10b981;
}

.stat-icon-orange {
  background-color: #f59e0b;
}

.stat-icon-purple {
  background-color: #8b5cf6;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 0.25rem;
}

.stat-label {
  color: var(--gray-500);
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
