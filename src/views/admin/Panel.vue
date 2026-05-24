<template>
  <div class="admin-panel">
    <div class="page-header">
      <h2 class="text-xl font-semibold">流程管理</h2>
      <router-link to="/admin/workflows" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        创建流程
      </router-link>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ dataStore.templates.length }}</div>
          <div class="stat-label">模板总数</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ dataStore.workflows.length }}</div>
          <div class="stat-label">流程总数</div>
        </div>
      </div>
      <div class="stat-card card">
        <div class="card-body">
          <div class="stat-value">{{ dataStore.getAllTasks().length }}</div>
          <div class="stat-label">任务总数</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">模板列表</h3>
          <router-link to="/templates" class="btn btn-secondary btn-sm">管理</router-link>
        </div>
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>分类</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="template in dataStore.templates.slice(0, 5)" :key="template.id">
                <td>{{ template.name }}</td>
                <td><span class="badge badge-primary">{{ template.category }}</span></td>
                <td><span class="badge badge-success">启用</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">流程列表</h3>
          <router-link to="/admin/workflows/create" class="btn btn-secondary btn-sm">创建流程</router-link>
        </div>
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>关联模板</th>
                <th>步骤数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="workflow in dataStore.workflows" :key="workflow.id">
                <td>{{ workflow.name }}</td>
                <td>{{ getTemplateName(workflow.templateId) }}</td>
                <td>{{ workflow.steps?.length || 0 }}</td>
                <td>
                  <span :class="['badge', workflow.status === 'active' ? 'badge-success' : 'badge-warning']">
                    {{ workflow.status === 'active' ? '启用' : '停用' }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <router-link :to="`/admin/workflows/${workflow.id}`" class="btn btn-secondary btn-sm">编辑</router-link>
                    <button @click="deleteWorkflow(workflow.id)" class="btn btn-danger btn-sm">删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="dataStore.workflows.length === 0">
                <td colspan="5" class="text-center text-gray-500 py-4">暂无流程</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">
        <h3 class="card-title">所有任务状态</h3>
      </div>
      <div class="card-body">
        <table class="table">
          <thead>
            <tr>
              <th>任务标题</th>
              <th>流程</th>
              <th>当前处理人</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in dataStore.getAllTasks()" :key="task.id">
              <td class="font-medium">{{ task.title }}</td>
              <td>{{ task.workflowName }}</td>
              <td>{{ task.assigneeName }}</td>
              <td>
                <span :class="['badge', `badge-${task.status === 'completed' ? 'success' : 'warning'}`]">
                  {{ task.status === 'completed' ? '已完成' : '进行中' }}
                </span>
              </td>
              <td>{{ task.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()

function getTemplateName(templateId) {
  const template = dataStore.getTemplateById(templateId)
  return template?.name || '-'
}

async function deleteWorkflow(id) {
  if (confirm('确定要删除这个流程吗？')) {
    await dataStore.deleteWorkflow(id)
  }
}
</script>

<style scoped>
.admin-panel {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
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
</style>
