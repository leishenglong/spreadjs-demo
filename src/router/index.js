import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/dashboard',
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'HomePage',
        component: () => import('@/views/Home.vue')
      }
    ]
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin', 'finance']
    },
    children: [
      {
        path: '',
        name: 'TemplateList',
        component: () => import('@/views/templates/List.vue')
      },
      {
        path: 'create',
        name: 'TemplateCreate',
        component: () => import('@/views/templates/Designer.vue')
      },
      {
        path: 'edit/:id',
        name: 'TemplateEdit',
        component: () => import('@/views/templates/Designer.vue')
      }
    ]
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'TaskList',
        component: () => import('@/views/tasks/List.vue')
      },
      {
        path: 'start',
        name: 'TaskStart',
        component: () => import('@/views/tasks/Start.vue'),
        meta: { allowedRoles: ['employee'] }
      },
      {
        path: 'fill/:id',
        name: 'TaskFill',
        component: () => import('@/views/tasks/Fill.vue')
      },
      {
        path: 'view/:id',
        name: 'TaskView',
        component: () => import('@/views/tasks/View.vue')
      },
      {
        path: 'approve/:id',
        name: 'TaskApprove',
        component: () => import('@/views/tasks/Approve.vue')
      }
    ]
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['admin']
    },
    children: [
      {
        path: '',
        name: 'AdminPanel',
        component: () => import('@/views/admin/Panel.vue')
      },
      {
        path: 'workflows',
        name: 'WorkflowManage',
        component: () => import('@/views/admin/Workflows.vue')
      },
      {
        path: 'workflows/create',
        name: 'WorkflowCreate',
        component: () => import('@/views/admin/Workflows.vue')
      },
      {
        path: 'workflows/:id',
        name: 'WorkflowEdit',
        component: () => import('@/views/admin/Workflows.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  // 检查角色权限
  if (to.meta.allowedRoles) {
    const userRole = authStore.user?.role
    if (!to.meta.allowedRoles.includes(userRole)) {
      next('/dashboard')
      return
    }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/dashboard')
    return
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
