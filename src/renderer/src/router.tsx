import { createRouter, createMemoryHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// 为生产环境创建内存历史记录
const memoryHistory = createMemoryHistory({
  initialEntries: ['/'] // 初始路由地址
})

export const router = createRouter({
  routeTree,
  // 在生产环境中使用 memoryHistory
  history: import.meta.env.PROD ? memoryHistory : undefined
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
