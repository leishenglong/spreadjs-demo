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
    console.log('deleteWorkflow called, id:', id, typeof id)
    await dbOperation.delete(STORES.WORKFLOWS, id)
    console.log('delete from IndexedDB completed')
    const index = workflows.value.findIndex(w => w.id === id)
    console.log('found index:', index)
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
