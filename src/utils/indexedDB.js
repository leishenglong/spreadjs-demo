/**
 * IndexedDB 封装模块
 * 数据库名: SpreadJS_DataCollect
 */

const DB_NAME = 'SpreadJS_DataCollect'
const DB_VERSION = 1

// 存储区定义
export const STORES = {
  TEMPLATES: 'templates',
  WORKFLOWS: 'workflows',
  TASKS: 'tasks',
  APPROVALS: 'approvals'
}

let db = null

/**
 * 打开数据库连接
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('打开 IndexedDB 失败'))
    }

    request.onsuccess = (event) => {
      db = event.target.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // 创建模板存储区
      if (!database.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = database.createObjectStore(STORES.TEMPLATES, { keyPath: 'id', autoIncrement: true })
        templateStore.createIndex('name', 'name', { unique: false })
        templateStore.createIndex('category', 'category', { unique: false })
        templateStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // 创建流程存储区
      if (!database.objectStoreNames.contains(STORES.WORKFLOWS)) {
        const workflowStore = database.createObjectStore(STORES.WORKFLOWS, { keyPath: 'id', autoIncrement: true })
        workflowStore.createIndex('name', 'name', { unique: false })
        workflowStore.createIndex('templateId', 'templateId', { unique: false })
        workflowStore.createIndex('status', 'status', { unique: false })
      }

      // 创建任务存储区
      if (!database.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = database.createObjectStore(STORES.TASKS, { keyPath: 'id', autoIncrement: true })
        taskStore.createIndex('workflowId', 'workflowId', { unique: false })
        taskStore.createIndex('templateId', 'templateId', { unique: false })
        taskStore.createIndex('assigneeId', 'assigneeId', { unique: false })
        taskStore.createIndex('status', 'status', { unique: false })
      }

      // 创建审批记录存储区
      if (!database.objectStoreNames.contains(STORES.APPROVALS)) {
        const approvalStore = database.createObjectStore(STORES.APPROVALS, { keyPath: 'id', autoIncrement: true })
        approvalStore.createIndex('taskId', 'taskId', { unique: false })
        approvalStore.createIndex('stepId', 'stepId', { unique: false })
        approvalStore.createIndex('approverId', 'approverId', { unique: false })
        approvalStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

/**
 * 获取数据库实例
 */
async function getDB() {
  if (!db) {
    await openDB()
  }
  return db
}

/**
 * 通用的增删改查操作
 */
export const dbOperation = {
  /**
   * 添加记录
   * @param {string} storeName - 存储区名称
   * @param {object} data - 要添加的数据
   * @returns {Promise<number>} 新记录的 ID
   */
  async add(storeName, data) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      // 使用 JSON.parse(JSON.stringify()) 深拷贝并清理不可序列化的数据
      const cleanData = JSON.parse(JSON.stringify(data))
      const request = store.add(cleanData)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`添加数据到 ${storeName} 失败`))
      }
    })
  },

  /**
   * 更新记录
   * @param {string} storeName - 存储区名称
   * @param {object} data - 要更新的数据（必须包含 id）
   * @returns {Promise}
   */
  async put(storeName, data) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      // 使用 JSON.parse(JSON.stringify()) 深拷贝并清理不可序列化的数据
      const cleanData = JSON.parse(JSON.stringify(data))
      const request = store.put(cleanData)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`更新 ${storeName} 数据失败`))
      }
    })
  },

  /**
   * 根据 ID 删除记录
   * @param {string} storeName - 存储区名称
   * @param {number} id - 记录 ID
   * @returns {Promise}
   */
  async delete(storeName, id) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      console.log(`delete called: store=${storeName}, id=${id}, typeof=${typeof id}`)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('delete success')
        resolve()
      }

      request.onerror = () => {
        console.log('delete failed')
        reject(new Error(`从 ${storeName} 删除数据失败`))
      }
    })
  },

  /**
   * 根据 ID 获取单条记录
   * @param {string} storeName - 存储区名称
   * @param {number} id - 记录 ID
   * @returns {Promise<object>}
   */
  async get(storeName, id) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error(`从 ${storeName} 获取数据失败`))
      }
    })
  },

  /**
   * 获取所有记录
   * @param {string} storeName - 存储区名称
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error(`从 ${storeName} 获取所有数据失败`))
      }
    })
  },

  /**
   * 根据索引获取所有匹配记录
   * @param {string} storeName - 存储区名称
   * @param {string} indexName - 索引名称
   * @param {any} value - 索引值
   * @returns {Promise<Array>}
   */
  async getAllByIndex(storeName, indexName, value) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error(`从 ${storeName} 按索引查询失败`))
      }
    })
  },

  /**
   * 清空存储区
   * @param {string} storeName - 存储区名称
   * @returns {Promise}
   */
  async clear(storeName) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`清空 ${storeName} 失败`))
      }
    })
  },

  /**
   * 批量添加数据
   * @param {string} storeName - 存储区名称
   * @param {Array} items - 数据数组
   * @returns {Promise}
   */
  async bulkAdd(storeName, items) {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      items.forEach(item => {
        store.add(item)
      })

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.onerror = () => {
        reject(new Error(`批量添加数据到 ${storeName} 失败`))
      }
    })
  }
}

/**
 * 初始化数据库（不添加预设数据）
 */
export async function initDB() {
  await openDB()
  // 不再自动添加预设数据，所有数据由用户手动创建
}
