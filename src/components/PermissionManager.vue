<template>
  <div v-if="show" class="permission-dialog-overlay" @click.self="close">
    <div class="permission-dialog">
      <div class="dialog-header">
        <h3 class="dialog-title">权限管理</h3>
        <button @click="close" class="btn-close">×</button>
      </div>

      <div class="dialog-body">
        <!-- 选择区域 -->
        <div class="form-group">
          <label class="form-label">当前区域: {{ selectionInfo }}</label>
        </div>

        <!-- 权限类型选择 -->
        <div class="form-group">
          <label class="form-label">权限类型</label>
          <div class="radio-group">
            <label class="radio-label">
              <input v-model="config.type" type="radio" value="visible" />
              <span>可见性控制</span>
            </label>
            <label class="radio-label">
              <input v-model="config.type" type="radio" value="masked" />
              <span>数据脱敏</span>
            </label>
          </div>
        </div>

        <!-- 可见性控制 -->
        <div v-if="config.type === 'visible'" class="form-group">
          <label class="form-label">谁可以查看此区域</label>
          <div class="permission-selector">
            <label class="checkbox-label">
              <input v-model="config.allVisible" type="checkbox" @change="onAllVisibleChange" />
              <span>所有人可见</span>
            </label>
          </div>

          <div v-if="!config.allVisible" class="mt-4">
            <label class="form-label text-sm">选择可见用户/角色</label>
            <div class="tabs">
              <button
                :class="['tab', { active: activeTab === 'users' }]"
                @click="activeTab = 'users'"
              >
                用户
              </button>
              <button
                :class="['tab', { active: activeTab === 'roles' }]"
                @click="activeTab = 'roles'"
              >
                角色
              </button>
              <button
                :class="['tab', { active: activeTab === 'departments' }]"
                @click="activeTab = 'departments'"
              >
                部门
              </button>
            </div>

            <div class="permission-list">
              <!-- 用户列表 -->
              <div v-if="activeTab === 'users'" class="checkbox-list">
                <label v-for="user in userStore.users" :key="user.id" class="checkbox-label">
                  <input
                    :checked="config.visibleUsers.includes(user.id)"
                    @change="toggleVisibleUser(user.id)"
                    type="checkbox"
                  />
                  <span>{{ user.name }} ({{ user.department }})</span>
                </label>
              </div>

              <!-- 角色列表 -->
              <div v-if="activeTab === 'roles'" class="checkbox-list">
                <label v-for="role in userStore.roles" :key="role.id" class="checkbox-label">
                  <input
                    :checked="config.visibleRoles.includes(role.id)"
                    @change="toggleVisibleRole(role.id)"
                    type="checkbox"
                  />
                  <span>{{ role.name }}</span>
                </label>
              </div>

              <!-- 部门列表 -->
              <div v-if="activeTab === 'departments'" class="checkbox-list">
                <label v-for="dept in userStore.departments" :key="dept.id" class="checkbox-label">
                  <input
                    :checked="config.visibleDepartments.includes(dept.id)"
                    @change="toggleVisibleDepartment(dept.id)"
                    type="checkbox"
                  />
                  <span>{{ dept.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据脱敏配置 -->
        <div v-if="config.type === 'masked'" class="form-group">
          <label class="form-label">脱敏类型</label>
          <select v-model="config.maskType" class="input">
            <option value="phone">手机号 (139*******4)</option>
            <option value="idcard">身份证 (320621********1234)</option>
            <option value="email">邮箱 (e******@gmail.com)</option>
            <option value="card">银行卡 (622202*******890)</option>
            <option value="custom">自定义 (保留前后2位)</option>
          </select>

          <div class="mt-4">
            <label class="form-label text-sm">谁可以查看原始数据（未脱敏）</label>
            <div class="permission-selector">
              <label class="checkbox-label">
                <input v-model="config.unmaskedAll" type="checkbox" @change="onUnmaskedAllChange" />
                <span>所有人可见原始数据</span>
              </label>
            </div>

            <div v-if="!config.unmaskedAll" class="tabs mt-4">
              <button
                :class="['tab', { active: unmaskedTab === 'users' }]"
                @click="unmaskedTab = 'users'"
              >
                用户
              </button>
              <button
                :class="['tab', { active: unmaskedTab === 'roles' }]"
                @click="unmaskedTab = 'roles'"
              >
                角色
              </button>
              <button
                :class="['tab', { active: unmaskedTab === 'departments' }]"
                @click="unmaskedTab = 'departments'"
              >
                部门
              </button>
            </div>

            <div class="permission-list">
              <!-- 可查看原始数据的用户列表 -->
              <div v-if="unmaskedTab === 'users'" class="checkbox-list">
                <label v-for="user in userStore.users" :key="user.id" class="checkbox-label">
                  <input
                    :checked="config.unmaskedUsers.includes(user.id)"
                    @change="toggleUnmaskedUser(user.id)"
                    type="checkbox"
                  />
                  <span>{{ user.name }} ({{ user.department }})</span>
                </label>
              </div>

              <!-- 可查看原始数据的角色列表 -->
              <div v-if="unmaskedTab === 'roles'" class="checkbox-list">
                <label v-for="role in userStore.roles" :key="role.id" class="checkbox-label">
                  <input
                    :checked="config.unmaskedRoles.includes(role.id)"
                    @change="toggleUnmaskedRole(role.id)"
                    type="checkbox"
                  />
                  <span>{{ role.name }}</span>
                </label>
              </div>

              <!-- 可查看原始数据的部门列表 -->
              <div v-if="unmaskedTab === 'departments'" class="checkbox-list">
                <label v-for="dept in userStore.departments" :key="dept.id" class="checkbox-label">
                  <input
                    :checked="config.unmaskedDepartments.includes(dept.id)"
                    @change="toggleUnmaskedDepartment(dept.id)"
                    type="checkbox"
                  />
                  <span>{{ dept.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="applyConfig" class="btn btn-primary">应用</button>
        <button @click="clearConfig" class="btn btn-secondary">清除权限</button>
        <button @click="close" class="btn btn-secondary">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/stores/users'

const props = defineProps({
  show: Boolean,
  selectionInfo: String,
  currentConfig: Object
})

const emit = defineEmits(['close', 'apply', 'clear'])

const userStore = useUserStore()
const activeTab = ref('users')
const unmaskedTab = ref('users')

const config = reactive({
  type: 'visible',
  allVisible: true,
  visibleUsers: [],
  visibleRoles: [],
  visibleDepartments: [],
  maskType: 'phone',
  unmaskedAll: true,
  unmaskedUsers: [],
  unmaskedRoles: [],
  unmaskedDepartments: []
})

// 初始化配置
if (props.currentConfig) {
  Object.assign(config, props.currentConfig)
}

function close() {
  emit('close')
}

function onAllVisibleChange() {
  if (config.allVisible) {
    config.visibleUsers = []
    config.visibleRoles = []
    config.visibleDepartments = []
  }
}

function onUnmaskedAllChange() {
  if (config.unmaskedAll) {
    config.unmaskedUsers = []
    config.unmaskedRoles = []
    config.unmaskedDepartments = []
  }
}

function toggleVisibleUser(userId) {
  const index = config.visibleUsers.indexOf(userId)
  if (index > -1) {
    config.visibleUsers.splice(index, 1)
  } else {
    config.visibleUsers.push(userId)
  }
}

function toggleVisibleRole(roleId) {
  const index = config.visibleRoles.indexOf(roleId)
  if (index > -1) {
    config.visibleRoles.splice(index, 1)
  } else {
    config.visibleRoles.push(roleId)
  }
}

function toggleVisibleDepartment(deptId) {
  const index = config.visibleDepartments.indexOf(deptId)
  if (index > -1) {
    config.visibleDepartments.splice(index, 1)
  } else {
    config.visibleDepartments.push(deptId)
  }
}

function toggleUnmaskedUser(userId) {
  const index = config.unmaskedUsers.indexOf(userId)
  if (index > -1) {
    config.unmaskedUsers.splice(index, 1)
  } else {
    config.unmaskedUsers.push(userId)
  }
}

function toggleUnmaskedRole(roleId) {
  const index = config.unmaskedRoles.indexOf(roleId)
  if (index > -1) {
    config.unmaskedRoles.splice(index, 1)
  } else {
    config.unmaskedRoles.push(roleId)
  }
}

function toggleUnmaskedDepartment(deptId) {
  const index = config.unmaskedDepartments.indexOf(deptId)
  if (index > -1) {
    config.unmaskedDepartments.splice(index, 1)
  } else {
    config.unmaskedDepartments.push(deptId)
  }
}

function applyConfig() {
  emit('apply', { ...config })
  close()
}

function clearConfig() {
  emit('clear')
  close()
}
</script>

<style scoped>
.permission-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.permission-dialog {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--gray-500);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background-color: var(--gray-100);
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--gray-200);
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 13px;
  color: var(--gray-700);
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"],
.radio-label input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.permission-selector {
  padding: 0.75rem;
  background-color: var(--gray-50);
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
}

.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--gray-200);
  margin-bottom: 1rem;
}

.tab {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--gray-600);
  transition: all 0.2s;
}

.tab:hover {
  color: var(--primary);
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 500;
}

.permission-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 0.5rem;
  background-color: var(--gray-50);
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.text-sm {
  font-size: 12px;
}

.input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--gray-200);
  color: var(--gray-700);
}

.btn-secondary:hover {
  background-color: var(--gray-300);
}
</style>
