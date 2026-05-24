<template>
  <div class="login-container">
    <div class="login-card card">
      <div class="login-header">
        <h1 class="login-title">数据收集系统</h1>
        <p class="login-subtitle">请登录以继续</p>
      </div>
      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="input"
            placeholder="请输入用户名"
            required
            autofocus
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="input"
            placeholder="请输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      <div class="login-footer">
        <p class="text-sm text-gray-500">测试账号：</p>
        <p class="text-sm">管理员：admin / admin123</p>
        <p class="text-sm">普通用户：user1 / user123</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: ''
})

const error = ref('')
const loading = ref(false)

function handleLogin() {
  error.value = ''
  loading.value = true

  setTimeout(() => {
    if (authStore.login(form.value.username, form.value.password)) {
      router.push('/dashboard')
    } else {
      error.value = '用户名或密码错误'
    }
    loading.value = false
  }, 500)
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: var(--gray-500);
  font-size: 14px;
}

.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--gray-700);
  font-size: 14px;
}

.error-message {
  padding: 0.75rem;
  background-color: #fee2e2;
  color: var(--danger);
  border-radius: var(--radius);
  margin-bottom: 1rem;
  font-size: 14px;
}

.login-footer {
  padding-top: 1.5rem;
  border-top: 1px solid var(--gray-200);
  text-align: center;
}

.login-footer p {
  margin-bottom: 0.25rem;
}
</style>
