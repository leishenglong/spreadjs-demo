import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('users', () => {
  // 模拟用户数据
  const users = ref([
    { id: 1, name: '管理员', username: 'admin', role: 'admin', department: '管理部' },
    { id: 2, name: '张三', username: 'user1', role: 'employee', department: '人事部' },
    { id: 3, name: '李四', username: 'user2', role: 'employee', department: '财务部' },
    { id: 4, name: '王五', username: 'user3', role: 'manager', department: '人事部' },
    { id: 5, name: '赵六', username: 'user4', role: 'manager', department: '财务部' },
    { id: 6, name: '孙七', username: 'user5', role: 'employee', department: '业务部' },
    { id: 7, name: '周八', username: 'user6', role: 'employee', department: '业务部' }
  ])

  // 角色列表
  const roles = ref([
    { id: 'admin', name: '管理员' },
    { id: 'manager', name: '经理' },
    { id: 'employee', name: '员工' },
    { id: 'finance', name: '财务' },
    { id: 'hr', name: '人事' }
  ])

  // 部门列表
  const departments = ref([
    { id: 'admin', name: '管理部' },
    { id: 'finance', name: '财务部' },
    { id: 'hr', name: '人事部' },
    { id: 'business', name: '业务部' },
    { id: 'it', name: '技术部' }
  ])

  function getAllUsers() {
    return users.value
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

  function getUsersByRoles(roles) {
    return users.value.filter(u => roles.includes(u.role))
  }

  return {
    users,
    roles,
    departments,
    getAllUsers,
    getUserById,
    getUsersByRole,
    getUsersByDepartment,
    getUsersByRoles
  }
})
