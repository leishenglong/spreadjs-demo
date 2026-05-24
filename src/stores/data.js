import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOperation, STORES, initDB } from '@/utils/indexedDB'

export const useDataStore = defineStore('data', () => {
  const templates = ref([])
  const workflows = ref([])
  const tasks = ref([])
  const isInitialized = ref(false)
  let initPromise = null

  // 初始化：加载所有数据
  async function init() {
    // 如果正在初始化，等待完成
    if (initPromise) {
      return initPromise
    }

    // 如果已初始化，直接刷新数据
    if (isInitialized.value) {
      await refresh()
      return
    }

    initPromise = (async () => {
      try {
        await initDB()

        const [templatesData, workflowsData, tasksData] = await Promise.all([
          dbOperation.getAll(STORES.TEMPLATES),
          dbOperation.getAll(STORES.WORKFLOWS),
          dbOperation.getAll(STORES.TASKS)
        ])

        templates.value = templatesData
        workflows.value = workflowsData
        tasks.value = tasksData
        isInitialized.value = true

        console.log('数据加载完成:', {
          templates: templates.value.length,
          workflows: workflows.value.length,
          tasks: tasks.value.length
        })
      } catch (error) {
        console.error('初始化数据失败:', error)
        throw error
      } finally {
        initPromise = null
      }
    })()

    return initPromise
  }

  // 刷新数据（从 IndexedDB 重新加载）
  async function refresh() {
    const [templatesData, workflowsData, tasksData] = await Promise.all([
      dbOperation.getAll(STORES.TEMPLATES),
      dbOperation.getAll(STORES.WORKFLOWS),
      dbOperation.getAll(STORES.TASKS)
    ])

    templates.value = templatesData
    workflows.value = workflowsData
    tasks.value = tasksData
  }

  // ==================== 模板操作 ====================

  async function addTemplate(template) {
    const newTemplate = {
      ...template,
      id: undefined // 让 IndexedDB 自动生成 ID
    }
    const id = await dbOperation.add(STORES.TEMPLATES, newTemplate)
    newTemplate.id = id
    templates.value.push(newTemplate)
    return newTemplate
  }

  async function updateTemplate(id, data) {
    const index = templates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      const updated = { ...templates.value[index], ...data, id }
      await dbOperation.put(STORES.TEMPLATES, updated)
      templates.value[index] = updated
      console.log('模板已更新到 IndexedDB:', updated.name, 'ssjson sheets:', updated.ssjson?.sheets ? '有' : '无')

      // 同步更新已存在的任务（更新任务的模板相关数据）
      const relatedTasks = tasks.value.filter(t => t.templateId === id)
      console.log('找到相关任务数量:', relatedTasks.length)
      for (const task of relatedTasks) {
        const updatedTask = {
          ...task,
          templateName: updated.name,
          ssjson: updated.ssjson,
          dataFields: updated.dataFields
        }
        await dbOperation.put(STORES.TASKS, updatedTask)
        const taskIndex = tasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          tasks.value[taskIndex] = updatedTask
        }
        console.log('任务已同步到 IndexedDB:', task.id, task.title)
      }

      return updated
    }
    return null
  }

  async function deleteTemplate(id) {
    await dbOperation.delete(STORES.TEMPLATES, id)
    const index = templates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.value.splice(index, 1)
      return true
    }
    return false
  }

  function getTemplateById(id) {
    return templates.value.find(t => t.id === id)
  }

  // ==================== 流程操作 ====================

  async function addWorkflow(workflow) {
    const newWorkflow = {
      ...workflow,
      id: undefined
    }
    const id = await dbOperation.add(STORES.WORKFLOWS, newWorkflow)
    newWorkflow.id = id
    workflows.value.push(newWorkflow)
    return newWorkflow
  }

  async function updateWorkflow(id, data) {
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const updated = { ...workflows.value[index], ...data, id }
      await dbOperation.put(STORES.WORKFLOWS, updated)
      workflows.value[index] = updated
      return updated
    }
    return null
  }

  function getWorkflowById(id) {
    return workflows.value.find(w => w.id === id)
  }

  async function deleteWorkflow(id) {
    // 删除关联的任务
    const relatedTasks = tasks.value.filter(t => t.workflowId === id)
    for (const task of relatedTasks) {
      await dbOperation.delete(STORES.TASKS, task.id)
    }
    // 从 store 中移除关联任务
    tasks.value = tasks.value.filter(t => t.workflowId !== id)

    // 删除工作流
    await dbOperation.delete(STORES.WORKFLOWS, id)
    const index = workflows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workflows.value.splice(index, 1)
      return true
    }
    return false
  }

  // ==================== 任务操作 ====================

  async function addTask(task) {
    const newTask = {
      ...task,
      id: undefined
    }
    const id = await dbOperation.add(STORES.TASKS, newTask)
    newTask.id = id
    tasks.value.push(newTask)
    return newTask
  }

  async function updateTask(id, data) {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      const updated = { ...tasks.value[index], ...data, id }
      await dbOperation.put(STORES.TASKS, updated)
      tasks.value[index] = updated
      return updated
    }
    return null
  }

  function getTaskById(id) {
    return tasks.value.find(t => t.id === id)
  }

  function getTasksByAssignee(userId) {
    return tasks.value.filter(t => t.assigneeId === userId)
  }

  function getTasksByDepartment(department) {
    return tasks.value.filter(t => t.department === department)
  }

  function getTasksByTemplate(templateId) {
    return tasks.value.filter(t => t.templateId === templateId)
  }

  function getAllTasks() {
    return tasks.value
  }

  // 根据模板获取关联的工作流
  function getWorkflowByTemplate(templateId) {
    return workflows.value.find(w => w.templateId === templateId)
  }

  // 创建工作流任务（仅创建第一步的任务）
  async function createTasksForWorkflow(workflow, template) {
    // 动态导入 authStore 以避免循环依赖
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    const firstStep = workflow.steps[0]
    if (!firstStep) return []

    let assigneeIds = []

    if (firstStep.assigneeType === 'department' && firstStep.assignees) {
      // 部门类型：只分配给员工角色的用户
      assigneeIds = authStore.users
        .filter(u => u.department === firstStep.assignees && u.role === 'employee')
        .map(u => u.id)
    } else if (firstStep.assigneeType === 'role' && firstStep.assignees) {
      // 角色类型：分配给指定角色的所有用户
      assigneeIds = authStore.users
        .filter(u => u.role === firstStep.assignees)
        .map(u => u.id)
    } else if (firstStep.assigneeType === 'users' && firstStep.assigneeIds?.length) {
      // 指定用户类型
      assigneeIds = firstStep.assigneeIds
    }

    const createdTasks = []
    for (const assigneeId of assigneeIds) {
      const assignee = authStore.getUserById(assigneeId)
      const task = {
        workflowId: workflow.id,
        workflowName: workflow.name,
        templateId: template.id,
        templateName: template.name,
        title: template.title || template.name,
        status: 'pending',
        currentStep: firstStep.id,
        currentStepName: firstStep.name,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        department: assignee.department,
        createdBy: assignee.username,
        createdAt: new Date().toISOString().split('T')[0],
        dueDate: null,
        data: {},
        ssjson: null,
        history: []
      }
      const savedTask = await addTask(task)
      createdTasks.push(savedTask)
    }

    return createdTasks
  }

  // 提交任务并推进到下一步
  async function submitTaskAndAdvance(taskId, formData, ssjson) {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    const currentTask = tasks.value.find(t => t.id === taskId)
    if (!currentTask) return null

    const workflow = workflows.value.find(w => w.id === currentTask.workflowId)
    if (!workflow) return null

    const steps = workflow.steps || []
    const currentStepIndex = steps.findIndex(s => s.id === currentTask.currentStep)
    const nextStep = steps[currentStepIndex + 1]

    if (nextStep) {
      // 有下一步，为下一步创建新任务
      let assigneeIds = []

      if (nextStep.assigneeType === 'role' && nextStep.assignees) {
        assigneeIds = authStore.users
          .filter(u => u.role === nextStep.assignees)
          .map(u => u.id)
      } else if (nextStep.assigneeType === 'department' && nextStep.assignees) {
        // 审批步骤分配给 manager 角色
        assigneeIds = authStore.users
          .filter(u => u.department === nextStep.assignees && u.role === 'manager')
          .map(u => u.id)
      } else if (nextStep.assigneeType === 'users' && nextStep.assigneeIds?.length) {
        assigneeIds = nextStep.assigneeIds
      }

      for (const assigneeId of assigneeIds) {
        const assignee = authStore.getUserById(assigneeId)
        const newTask = {
          workflowId: workflow.id,
          workflowName: workflow.name,
          templateId: currentTask.templateId,
          templateName: currentTask.templateName,
          title: `${workflow.name} - ${nextStep.name}`,
          status: 'pending',
          currentStep: nextStep.id,
          currentStepName: nextStep.name,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          department: assignee.department,
          createdBy: authStore.user?.name || '',
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: '',
          data: formData,
          ssjson: ssjson,
          history: []
        }
        await addTask(newTask)
      }

      // 更新当前任务为已完成
      await updateTask(currentTask.id, {
        status: 'completed',
        ssjson: ssjson,
        data: formData,
        history: [
          ...(currentTask.history || []),
          {
            step: currentTask.currentStepName,
            operator: authStore.user?.name || '',
            action: '提交',
            time: new Date().toLocaleString()
          }
        ]
      })
    } else {
      // 所有步骤完成
      await updateTask(currentTask.id, {
        status: 'completed',
        ssjson: ssjson,
        data: formData,
        history: [
          ...(currentTask.history || []),
          {
            step: currentTask.currentStepName,
            operator: authStore.user?.name || '',
            action: '提交',
            time: new Date().toLocaleString()
          }
        ]
      })
    }

    return currentTask
  }

  // 审批通过并推进到下一步
  async function approveTask(taskId, comment = '') {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    const currentTask = tasks.value.find(t => t.id === taskId)
    if (!currentTask) return null

    const workflow = workflows.value.find(w => w.id === currentTask.workflowId)
    if (!workflow) return null

    const steps = workflow.steps || []
    const currentStepIndex = steps.findIndex(s => s.id === currentTask.currentStep)
    const nextStep = steps[currentStepIndex + 1]

    if (nextStep) {
      // 有下一步，为下一步创建新任务
      let assigneeIds = []

      if (nextStep.assigneeType === 'role' && nextStep.assignees) {
        assigneeIds = authStore.users
          .filter(u => u.role === nextStep.assignees)
          .map(u => u.id)
      } else if (nextStep.assigneeType === 'department' && nextStep.assignees) {
        assigneeIds = authStore.users
          .filter(u => u.department === nextStep.assignees && u.role === 'manager')
          .map(u => u.id)
      } else if (nextStep.assigneeType === 'users' && nextStep.assigneeIds?.length) {
        assigneeIds = nextStep.assigneeIds
      }

      for (const assigneeId of assigneeIds) {
        const assignee = authStore.getUserById(assigneeId)
        const newTask = {
          workflowId: workflow.id,
          workflowName: workflow.name,
          templateId: currentTask.templateId,
          templateName: currentTask.templateName,
          title: `${workflow.name} - ${nextStep.name}`,
          status: 'pending',
          currentStep: nextStep.id,
          currentStepName: nextStep.name,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          department: assignee.department,
          createdBy: currentTask.createdBy,
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: '',
          data: currentTask.data,
          ssjson: currentTask.ssjson,
          history: []
        }
        await addTask(newTask)
      }

      await updateTask(currentTask.id, {
        status: 'completed',
        history: [
          ...(currentTask.history || []),
          {
            step: currentTask.currentStepName,
            operator: authStore.user?.name || '',
            action: '通过',
            time: new Date().toLocaleString(),
            comment: comment
          }
        ]
      })
    } else {
      // 所有步骤完成
      await updateTask(currentTask.id, {
        status: 'completed',
        history: [
          ...(currentTask.history || []),
          {
            step: currentTask.currentStepName,
            operator: authStore.user?.name || '',
            action: '通过',
            time: new Date().toLocaleString(),
            comment: comment
          }
        ]
      })
    }

    return currentTask
  }

  // 驳回任务
  async function rejectTask(taskId, comment = '') {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    const currentTask = tasks.value.find(t => t.id === taskId)
    if (!currentTask) return null

    await updateTask(currentTask.id, {
      status: 'rejected',
      history: [
        ...(currentTask.history || []),
        {
          step: currentTask.currentStepName,
          operator: authStore.user?.name || '',
          action: '驳回',
          time: new Date().toLocaleString(),
          comment: comment
        }
      ]
    })

    return currentTask
  }

  // 更新任务状态
  async function updateTaskStatus(taskId, status, action = '') {
    const currentTask = tasks.value.find(t => t.id === taskId)
    if (!currentTask) return null

    const historyEntry = action ? {
      step: currentTask.currentStepName,
      operator: '',
      action: action,
      time: new Date().toLocaleString()
    } : null

    await updateTask(currentTask.id, {
      status: status,
      history: historyEntry
        ? [...(currentTask.history || []), historyEntry]
        : currentTask.history
    })

    return currentTask
  }

  return {
    // 状态
    templates,
    workflows,
    tasks,
    isInitialized,
    // 方法
    init,
    refresh,
    // 模板
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    // 流程
    addWorkflow,
    updateWorkflow,
    getWorkflowById,
    deleteWorkflow,
    getWorkflowByTemplate,
    createTasksForWorkflow,
    submitTaskAndAdvance,
    approveTask,
    rejectTask,
    updateTaskStatus,
    // 任务
    addTask,
    updateTask,
    getTaskById,
    getTasksByAssignee,
    getTasksByDepartment,
    getTasksByTemplate,
    getAllTasks
  }
})
