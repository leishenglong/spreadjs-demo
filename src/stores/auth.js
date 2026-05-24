import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  // 用户列表
  const users = ref([
    { id: 1, username: 'admin', password: 'admin123', name: '管理员', role: 'admin', roleName: '系统管理员', department: '管理部' },
    { id: 2, username: 'user1', password: 'user123', name: 'user1', role: 'employee', roleName: '填报角色', department: '业务投放预算-节能环保部（西北区域）' },
    { id: 3, username: 'user2', password: 'user123', name: 'user2', role: 'employee', roleName: '填报角色', department: '财务部' },
    { id: 4, username: 'dep1', password: 'user123', name: 'dep1', role: 'manager', roleName: '审批角色', department: '业务投放预算-节能环保部（西北区域）' },
    { id: 5, username: 'dep2', password: 'user123', name: 'dep2', role: 'manager', roleName: '审批角色', department: '财务部' },
    { id: 6, username: 'caiwu1', password: 'user123', name: 'caiwu1', role: 'finance', roleName: '财务角色', department: '财务部' }
  ])

  // 角色定义
  const roles = ref([
    { id: 'admin', name: '系统管理员', code: 'admin' },
    { id: 'employee', name: '填报角色', code: 'employee' },
    { id: 'manager', name: '审批角色', code: 'manager' },
    { id: 'finance', name: '财务角色', code: 'finance' }
  ])

  // 部门定义
  const departments = ref([
    { id: '管理部', name: '管理部' },
    { id: '业务投放预算-节能环保部（西北区域）', name: '业务投放预算-节能环保部（西北区域）' },
    { id: '财务部', name: '财务部' }
  ])

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isFinance = computed(() => user.value?.role === 'finance')
  const isManager = computed(() => user.value?.role === 'manager')
  const isEmployee = computed(() => user.value?.role === 'employee')

  // 检查用户是否有指定权限
  function hasPermission(permission) {
    if (!user.value) return false
    const role = user.value.role

    const permissions = {
      admin: ['template:create', 'template:edit', 'template:delete', 'template:import', 'task:fill', 'task:approve', 'task:view', 'formula:edit', 'permission:assign'],
      employee: ['task:fill', 'task:view'],
      manager: ['task:approve', 'task:view'],
      finance: ['task:approve', 'task:view', 'formula:edit', 'template:create', 'template:edit', 'template:delete', 'template:import', 'permission:assign']
    }

    return permissions[role]?.includes(permission) || false
  }

  // 检查是否是本部门的数据
  function isOwnDepartment(userDept, targetDept) {
    return userDept === targetDept
  }

  function login(username, password) {
    const foundUser = users.value.find(u => u.username === username && u.password === password)
    if (foundUser) {
      user.value = { ...foundUser }
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    }
    return false
  }

  function logout() {
    user.value = null
    localStorage.removeItem('user')
  }

  function initFromStorage() {
    const stored = localStorage.getItem('user')
    if (stored) {
      user.value = JSON.parse(stored)
    }
  }

  function getUserById(id) {
    return users.value.find(u => u.id === id)
  }

  function getUsersByRole(role) {
    return users.value.filter(u => u.role === role)
  }

  function getUsersByDepartment(dept) {
    return users.value.filter(u => u.department === dept)
  }

  return {
    user,
    users,
    roles,
    departments,
    isAuthenticated,
    isAdmin,
    isFinance,
    isManager,
    isEmployee,
    hasPermission,
    isOwnDepartment,
    login,
    logout,
    initFromStorage,
    getUserById,
    getUsersByRole,
    getUsersByDepartment
  }
})
