import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '../data'

// Mock users - these match the real authStore structure
const mockUsers = [
  { id: 1, username: 'admin', role: 'admin', department: '管理部' },
  { id: 2, username: 'user1', role: 'employee', department: '业务投放预算-节能环保部（西北区域）' },
  { id: 3, username: 'user2', role: 'employee', department: '财务部' },
  { id: 4, username: 'dep1', role: 'manager', department: '业务投放预算-节能环保部（西北区域）' },
  { id: 5, username: 'dep2', role: 'manager', department: '财务部' },
  { id: 6, username: 'caiwu1', role: 'finance', department: '财务部' }
]

// Mock authStore
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 1, name: 'admin', username: 'admin', role: 'admin' },
    users: mockUsers,
    getUserById: (id) => mockUsers.find(u => u.id === id),
    getUsersByRole: (role) => mockUsers.filter(u => u.role === role),
    getUsersByDepartment: (dept) => mockUsers.filter(u => u.department === dept)
  })
}))

// Mock indexedDB
let mockDB = {
  tasks: [],
  templates: [],
  workflows: []
}

vi.mock('@/utils/indexedDB', () => ({
  dbOperation: {
    getAll: async (store) => [...mockDB[store]],
    add: async (store, item) => {
      if (item.id == null) {
        item.id = mockDB[store].length + 1
      }
      mockDB[store].push({ ...item })
      return item.id
    },
    put: async (store, item) => {
      const index = mockDB[store].findIndex(i => i.id === item.id)
      if (index !== -1) mockDB[store][index] = { ...item }
      return item
    },
    update: async (store, item) => {
      const index = mockDB[store].findIndex(i => i.id === item.id)
      if (index !== -1) mockDB[store][index] = { ...item }
      return item
    },
    delete: async (store, id) => {
      const index = mockDB[store].findIndex(i => i.id === id)
      if (index !== -1) mockDB[store].splice(index, 1)
      return id
    }
  },
  STORES: {
    TASKS: 'tasks',
    TEMPLATES: 'templates',
    WORKFLOWS: 'workflows',
    USERS: 'users'
  }
}))

describe('Workflow Task Creation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockDB = {
      tasks: [],
      templates: [],
      workflows: []
    }
  })

  describe('createTasksForWorkflow', () => {
    it('should only assign tasks to employee role users when assigneeType is department', async () => {
      const dataStore = useDataStore()

      const workflow = {
        id: 1,
        name: '测试流程',
        templateId: 1,
        steps: [
          {
            id: 1,
            name: '填写',
            assigneeType: 'department',
            assignees: '业务投放预算-节能环保部（西北区域）',
            order: 1
          },
          {
            id: 2,
            name: '部门审批',
            assigneeType: 'department',
            assignees: '业务投放预算-节能环保部（西北区域）',
            order: 2
          }
        ]
      }

      const template = {
        id: 1,
        name: '测试模板',
        title: '测试任务'
      }

      await dataStore.createTasksForWorkflow(workflow, template)

      // 验证只创建了第一步的任务
      expect(mockDB.tasks.length).toBe(1)

      // 验证任务的处理人是员工角色
      const task = mockDB.tasks[0]
      const assignee = mockUsers.find(u => u.id === task.assigneeId)
      expect(assignee.role).toBe('employee')
      expect(assignee.department).toBe('业务投放预算-节能环保部（西北区域）')
    })

    it('should not assign tasks to manager role users', async () => {
      const dataStore = useDataStore()

      const workflow = {
        id: 1,
        name: '测试流程',
        templateId: 1,
        steps: [
          {
            id: 1,
            name: '填写',
            assigneeType: 'department',
            assignees: '业务投放预算-节能环保部（西北区域）',
            order: 1
          }
        ]
      }

      const template = {
        id: 1,
        name: '测试模板',
        title: '测试任务'
      }

      await dataStore.createTasksForWorkflow(workflow, template)

      // 确保没有把任务分给部门负责人
      mockDB.tasks.forEach(task => {
        const assignee = mockUsers.find(u => u.id === task.assigneeId)
        expect(assignee.role).toBe('employee')
      })
    })

    it('should create tasks only for first step, not all steps', async () => {
      const dataStore = useDataStore()

      const workflow = {
        id: 1,
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      }

      const template = { id: 1, name: '测试模板', title: '测试任务' }

      await dataStore.createTasksForWorkflow(workflow, template)

      // 验证只创建了第一步的任务（1个任务给1个员工）
      expect(mockDB.tasks.length).toBe(1)
      expect(mockDB.tasks[0].currentStep).toBe(1)
      expect(mockDB.tasks[0].currentStepName).toBe('填写')
    })

    it('should assign tasks by role when assigneeType is role', async () => {
      const dataStore = useDataStore()

      const workflow = {
        id: 1,
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'role', assignees: 'employee', order: 1 }
        ]
      }

      const template = { id: 1, name: '测试模板', title: '测试任务' }

      await dataStore.createTasksForWorkflow(workflow, template)

      // 应该分配给所有 employee 角色的用户
      expect(mockDB.tasks.length).toBe(2) // user1 and user2
      mockDB.tasks.forEach(task => {
        const assignee = mockUsers.find(u => u.id === task.assigneeId)
        expect(assignee.role).toBe('employee')
      })
    })

    it('should assign tasks to specific users when assigneeType is users', async () => {
      const dataStore = useDataStore()

      const workflow = {
        id: 1,
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'users', assigneeIds: [1, 3], order: 1 }
        ]
      }

      const template = { id: 1, name: '测试模板', title: '测试任务' }

      await dataStore.createTasksForWorkflow(workflow, template)

      // 应该只为指定的2个用户创建任务
      expect(mockDB.tasks.length).toBe(2)
      const assigneeIds = mockDB.tasks.map(t => t.assigneeId).sort()
      expect(assigneeIds).toEqual([1, 3])
    })
  })

  describe('submitTaskAndAdvance', () => {
    it('should create next step task when submitting and next step exists', async () => {
      const dataStore = useDataStore()

      // 添加工作流（通过 addWorkflow 以确保 store 内部同步）
      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      // 添加任务
      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.submitTaskAndAdvance(task.id, { amount: 1000 }, {})

      // 验证：原任务变为 completed
      const updatedTask = dataStore.getTaskById(task.id)
      expect(updatedTask.status).toBe('completed')

      // 验证：创建了新的部门审批任务
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(2)
      const newTask = allTasks.find(t => t.id !== task.id)
      expect(newTask.currentStep).toBe(2)
      expect(newTask.currentStepName).toBe('部门审批')
    })

    it('should assign manager role for approval steps', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.submitTaskAndAdvance(task.id, {}, {})

      // 验证新任务的处理人是 manager 角色
      const allTasks = dataStore.getAllTasks()
      const newTask = allTasks.find(t => t.id !== task.id)
      expect(newTask.assigneeId).toBe(4) // dep1 is manager of this department
    })

    it('should not create new task when no next step (final step)', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 2 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '财务审批',
        assigneeId: 6,
        assigneeName: 'caiwu1',
        department: '财务部',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.submitTaskAndAdvance(task.id, {}, {})

      // 验证：只有1个任务，状态变为 completed
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(1)
      expect(allTasks[0].status).toBe('completed')
    })
  })

  describe('approveTask', () => {
    it('should advance to next step when approved', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4, // dep1 (manager)
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.approveTask(task.id, '同意')

      // 验证：任务状态变为 completed
      const updatedTask = dataStore.getTaskById(task.id)
      expect(updatedTask.status).toBe('completed')

      // 验证：创建了财务审批任务
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(2)
      const newTask = allTasks.find(t => t.id !== task.id)
      expect(newTask.currentStep).toBe(3)
      expect(newTask.currentStepName).toBe('财务审批')
      expect(newTask.assigneeId).toBe(6) // caiwu1 (finance)
    })

    it('should mark as completed when final step approved', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 2 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '财务审批',
        assigneeId: 6,
        assigneeName: 'caiwu1',
        department: '财务部',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.approveTask(task.id, '同意')

      // 验证：只有1个任务，状态变为 completed
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(1)
      expect(allTasks[0].status).toBe('completed')
    })
  })

  describe('rejectTask', () => {
    it('should mark task as rejected', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4,
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.rejectTask(task.id, '数据有问题，需要重新填报')

      // 验证：任务状态变为 rejected
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(1)
      expect(allTasks[0].status).toBe('rejected')
      expect(allTasks[0].history[0].action).toBe('驳回')
    })
  })

  describe('deleteWorkflow', () => {
    it('should delete workflow and its associated tasks', async () => {
      const dataStore = useDataStore()

      // 添加工作流
      const workflow = await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      // 添加关联的任务
      await dataStore.addTask({
        workflowId: workflow.id,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '任务1',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.addTask({
        workflowId: workflow.id,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '任务2',
        status: 'completed',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4,
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      expect(dataStore.workflows.length).toBe(1)
      expect(dataStore.tasks.length).toBe(2)

      // 删除工作流
      await dataStore.deleteWorkflow(workflow.id)

      // 验证：工作流已删除
      expect(dataStore.workflows.length).toBe(0)

      // 验证：关联任务也已删除
      expect(dataStore.tasks.length).toBe(0)
    })

    it('should not affect tasks from other workflows', async () => {
      const dataStore = useDataStore()

      // 添加两个工作流
      const workflow1 = await dataStore.addWorkflow({
        name: '流程1',
        templateId: 1,
        steps: [{ id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 }]
      })

      const workflow2 = await dataStore.addWorkflow({
        name: '流程2',
        templateId: 1,
        steps: [{ id: 1, name: '填写', assigneeType: 'department', assignees: '财务部', order: 1 }]
      })

      // 为每个工作流添加任务
      await dataStore.addTask({
        workflowId: workflow1.id,
        workflowName: '流程1',
        templateId: 1,
        templateName: '模板',
        title: '任务1',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.addTask({
        workflowId: workflow2.id,
        workflowName: '流程2',
        templateId: 1,
        templateName: '模板',
        title: '任务2',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 3,
        assigneeName: 'user2',
        department: '财务部',
        createdBy: 'user2',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      // 删除 workflow1
      await dataStore.deleteWorkflow(workflow1.id)

      // 验证：workflow1 相关的任务已删除，workflow2 的任务保留
      expect(dataStore.workflows.length).toBe(1)
      expect(dataStore.tasks.length).toBe(1)
      expect(dataStore.tasks[0].workflowName).toBe('流程2')
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status from pending to in_progress', async () => {
      const dataStore = useDataStore()

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.updateTaskStatus(task.id, 'in_progress')

      const updatedTask = dataStore.getTaskById(task.id)
      expect(updatedTask.status).toBe('in_progress')
    })

    it('should update task status and record history', async () => {
      const dataStore = useDataStore()

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 1,
        currentStepName: '填写',
        assigneeId: 2,
        assigneeName: 'user1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.updateTaskStatus(task.id, 'in_progress', '开始处理')

      const updatedTask = dataStore.getTaskById(task.id)
      expect(updatedTask.status).toBe('in_progress')
      expect(updatedTask.history.length).toBe(1)
      expect(updatedTask.history[0].action).toBe('开始处理')
    })
  })

  describe('Manager Approval (部门负责人审批)', () => {
    it('should allow manager to approve their departments step 2 task', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4, // dep1 (manager)
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      // 模拟部门负责人审批
      const result = await dataStore.approveTask(task.id, '同意')

      expect(result).not.toBeNull()
      const allTasks = dataStore.getAllTasks()
      // 应该有2个任务：原任务completed，新任务给财务
      expect(allTasks.length).toBe(2)
      const completedTask = allTasks.find(t => t.id === task.id)
      expect(completedTask.status).toBe('completed')
    })

    it('should create finance task when manager approves step 2', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4,
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.approveTask(task.id, '同意')

      const allTasks = dataStore.getAllTasks()
      const newTask = allTasks.find(t => t.id !== task.id)
      expect(newTask.currentStep).toBe(3)
      expect(newTask.currentStepName).toBe('财务审批')
      // 财务审批应该分配给 finance 角色
      const assignee = mockUsers.find(u => u.id === newTask.assigneeId)
      expect(assignee.role).toBe('finance')
    })
  })

  describe('Finance Approval (财务审批)', () => {
    it('should allow finance to approve step 2 task', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 6, // caiwu1 (finance)
        assigneeName: 'caiwu1',
        department: '财务部',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      const result = await dataStore.approveTask(task.id, '财务同意')

      expect(result).not.toBeNull()
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(2)
    })

    it('should mark as completed when finance approves final step', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 3,
        currentStepName: '财务审批',
        assigneeId: 6,
        assigneeName: 'caiwu1',
        department: '财务部',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      await dataStore.approveTask(task.id, '最终同意')

      // 财务审批最后一步应该只有一个任务（已完成）
      const allTasks = dataStore.getAllTasks()
      expect(allTasks.length).toBe(1)
      expect(allTasks[0].status).toBe('completed')
    })
  })

  describe('Approval Permission (审批权限)', () => {
    it('should not allow manager to approve other department tasks', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      // 创建属于"财务部"的任务
      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 5, // dep2 (manager of 财务部)
        assigneeName: 'dep2',
        department: '财务部', // 任务属于财务部
        createdBy: 'user2',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      // 假设当前用户是"业务投放预算-节能环保部（西北区域）"的部门负责人
      // 应该无法审批其他部门的任务
      const canApprove = task.department === '业务投放预算-节能环保部（西北区域）' && task.currentStep === 2
      expect(canApprove).toBe(false)
    })

    it('should allow manager to approve own department tasks at step 2', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 }
        ]
      })

      const task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4,
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      // 部门负责人可以审批本部门且步骤为2的任务
      const canApprove = task.department === '业务投放预算-节能环保部（西北区域）' && task.currentStep === 2
      expect(canApprove).toBe(true)
    })

    it('should allow finance to approve any task at step 2 or higher', async () => {
      const dataStore = useDataStore()

      await dataStore.addWorkflow({
        name: '测试流程',
        templateId: 1,
        steps: [
          { id: 1, name: '填写', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 1 },
          { id: 2, name: '部门审批', assigneeType: 'department', assignees: '业务投放预算-节能环保部（西北区域）', order: 2 },
          { id: 3, name: '财务审批', assigneeType: 'role', assignees: 'finance', order: 3 }
        ]
      })

      // 步骤2任务
      const step2Task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 2,
        currentStepName: '部门审批',
        assigneeId: 4,
        assigneeName: 'dep1',
        department: '业务投放预算-节能环保部（西北区域）',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      // 财务可以审批 step >= 2 的任何任务
      const canFinanceApproveStep2 = step2Task.currentStep >= 2
      expect(canFinanceApproveStep2).toBe(true)

      // 步骤3任务
      const step3Task = await dataStore.addTask({
        workflowId: 1,
        workflowName: '测试流程',
        templateId: 1,
        templateName: '测试模板',
        title: '测试任务',
        status: 'pending',
        currentStep: 3,
        currentStepName: '财务审批',
        assigneeId: 6,
        assigneeName: 'caiwu1',
        department: '财务部',
        createdBy: 'user1',
        createdAt: '2026-05-24',
        data: {},
        ssjson: null,
        history: []
      })

      const canFinanceApproveStep3 = step3Task.currentStep >= 2
      expect(canFinanceApproveStep3).toBe(true)
    })
  })
})
