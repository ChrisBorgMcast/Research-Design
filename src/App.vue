<template>
  <div>
    <nav class="switcher">
      <RouterLink to="/form-a" class="sw-btn" :class="{ active: route.path === '/form-a' }">
        Form A — single page
      </RouterLink>
      <RouterLink to="/form-b" class="sw-btn" :class="{ active: route.path === '/form-b' }">
        Form B — multi-step
      </RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
