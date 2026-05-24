<template>
  <div class="main-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="sidebar-title">预算填报系统</h1>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>首页</span>
        </router-link>
        <router-link v-if="authStore.isAdmin || authStore.isFinance" to="/templates" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>模板管理</span>
        </router-link>
        <router-link to="/tasks" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <span>{{ taskMenuText }}</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span>流程管理</span>
        </router-link>
      </nav>
    </aside>
    <div class="main-content">
      <header class="topbar">
        <h2 class="page-title">{{ pageTitle }}</h2>
        <div class="user-menu">
          <span class="user-name">{{ authStore.user?.name }}</span>
          <span class="badge badge-primary">{{ getRoleName }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">退出</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const taskMenuText = computed(() => {
  if (authStore.isEmployee) return '我的任务'
  if (authStore.isManager) return '部门审批'
  if (authStore.isFinance) return '预算审批'
  return '任务管理'
})

const getRoleName = computed(() => {
  switch (authStore.user?.role) {
    case 'admin':
      return '管理员'
    case 'employee':
      return '部门员工'
    case 'manager':
      return '部门负责人'
    case 'finance':
      return '财务'
    default:
      return '用户'
  }
})

const pageTitle = computed(() => {
  const titles = {
    HomePage: '首页',
    TemplateList: '模板管理',
    TemplateCreate: '创建模板',
    TemplateEdit: '编辑模板',
    TaskList: taskMenuText.value,
    TaskFill: '填写表单',
    TaskView: '查看表单',
    TaskStart: '发起流程',
    TaskApprove: '审批任务',
    AdminPanel: '管理面板',
    WorkflowManage: '流程管理'
  }
  return titles[route.name] || '预算填报系统'
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: var(--gray-900);
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.router-link-active {
  background-color: var(--primary);
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid var(--gray-200);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-900);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-weight: 500;
  color: var(--gray-700);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>
