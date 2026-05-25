import { createRouter, createWebHashHistory } from 'vue-router'
import FormA from '../views/FormA.vue'
import FormB from '../views/FormB.vue'

const routes = [
  { path: '/', redirect: '/form-a' },
  { path: '/form-a', component: FormA },
  { path: '/form-b', component: FormB },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
