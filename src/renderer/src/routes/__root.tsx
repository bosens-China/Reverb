import { Outlet, createRootRoute } from '@tanstack/react-router'
import { App, ConfigProvider, theme } from 'antd'

export const Route = createRootRoute({
  component: () => (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm
        // token: {
        //   // --- 主色调: 静谧蓝 ---
        //   colorPrimary: '#5294E2',

        //   // --- 背景层次 ---
        //   colorBgLayout: '#141414', // 最深的底色
        //   colorBgContainer: '#1D1D1D', // 内容区背景
        //   colorBgElevated: '#2A2A2A', // 卡片、抽屉等浮动元素背景

        //   // --- 边框与分割线 ---
        //   colorBorder: '#3A3A3A',
        //   colorSplit: 'rgba(255, 255, 255, 0.08)',

        //   // --- 圆角 ---
        //   borderRadius: 8
        // },
        // components: {
        //   Layout: {
        //     siderBg: '#141414' // 保持侧边栏与底色一致
        //   },
        //   Card: {
        //     // 统一卡片背景色
        //     colorBgContainer: '#2A2A2A'
        //   }
        // }
      }}
    >
      <App>
        <Outlet />
      </App>
    </ConfigProvider>
  )
})
