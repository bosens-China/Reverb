import '@ant-design/v5-patch-for-react-19'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import 'virtual:uno.css'
import '@unocss/reset/tailwind-compat.css'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { ConfigProvider } from 'antd'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{ cssVar: true, hashed: false }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>
)
