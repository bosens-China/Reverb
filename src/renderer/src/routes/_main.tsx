import { Outlet, Link, createFileRoute } from '@tanstack/react-router'
import { Layout, Menu } from 'antd'
import { BookOutlined, SettingOutlined, LineChartOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useStore } from '@renderer/store/store'

const { Sider, Content } = Layout

const Main = () => {
  const { loadCourses, loadSettings, setSidebarCollapsed } = useStore((state) => state.actions)
  const isSidebarCollapsed = useStore((state) => state.isSidebarCollapsed)

  useEffect(() => {
    loadCourses()
    loadSettings()
  }, [loadCourses, loadSettings])

  return (
    <Layout className="h-screen">
      <Sider
        collapsible
        collapsed={isSidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        width={200}
      >
        <div className="h-16 flex items-center justify-center overflow-hidden">
          <h1 className="text-xl text-white font-bold whitespace-nowrap">
            {isSidebarCollapsed ? '晓声' : '晓声 Reverb'}
          </h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['courses']}
          items={[
            {
              key: 'courses',
              icon: <BookOutlined />,
              label: <Link to="/courses">我的课程</Link>
            },
            {
              key: 'statistics',
              icon: <LineChartOutlined />,
              label: <Link to="/statistics">学习统计</Link>
            },
            {
              key: 'settings',
              icon: <SettingOutlined />,
              label: <Link to="/settings">设置</Link>
            }
          ]}
        />
      </Sider>
      <Content className="p-6 overflow-y-auto">
        <Outlet />
      </Content>
    </Layout>
  )
}

export const Route = createFileRoute('/_main')({
  component: Main
})
