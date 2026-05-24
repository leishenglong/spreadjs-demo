<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const authStore = useAuthStore()
const dataStore = useDataStore()

onMounted(async () => {
  authStore.initFromStorage()
  await dataStore.init()
})
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}
</style>
