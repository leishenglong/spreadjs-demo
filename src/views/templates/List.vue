<template>
  <div class="template-list">
    <div class="page-header">
      <h2 class="text-xl font-semibold">模板管理</h2>
      <router-link v-if="canManage" to="/templates/create" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        新建模板
      </router-link>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table">
          <thead>
            <tr>
              <th>模板名称</th>
              <th>描述</th>
              <th>分类</th>
              <th>部门</th>
              <th>字段数</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in dataStore.templates" :key="template.id">
              <td class="font-medium">{{ template.name }}</td>
              <td class="text-gray-500">{{ template.description || '-' }}</td>
              <td><span class="badge badge-primary">{{ template.category || '-' }}</span></td>
              <td>{{ template.department || '-' }}</td>
              <td>{{ template.dataFields?.length || 0 }} 个</td>
              <td class="text-gray-500">{{ template.createdAt }}</td>
              <td>
                <div class="flex gap-2">
                  <router-link v-if="canManage" :to="`/templates/edit/${template.id}`" class="btn btn-secondary btn-sm">
                    编辑
                  </router-link>
                  <router-link :to="`/tasks/start`" class="btn btn-primary btn-sm">
                    发起
                  </router-link>
                  <button v-if="canManage" @click="handleDelete(template.id)" class="btn btn-danger btn-sm">
                    删除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="dataStore.templates.length === 0">
              <td colspan="7" class="text-center text-gray-500 py-8">
                暂无模板，点击"新建模板"创建
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const dataStore = useDataStore()
const authStore = useAuthStore()

const canManage = computed(() => {
  return authStore.isAdmin || authStore.isFinance
})

async function handleDelete(id) {
  if (confirm('确定要删除这个模板吗？')) {
    await dataStore.deleteTemplate(id)
  }
}
</script>

<style scoped>
.template-list {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
