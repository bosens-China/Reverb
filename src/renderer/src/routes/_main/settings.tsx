import { createFileRoute } from '@tanstack/react-router'
import { SettingsForm } from '@renderer/components/SettingsForm'
import { Tabs, Typography } from 'antd'

const { Title } = Typography

function SettingsPage() {
  const tabItems = [
    {
      key: '1',
      label: '专注设置',
      children: <SettingsForm />
    }
    // 更多设置可以作为新的 tab 添加到这里
  ]

  return (
    <div>
      <Title level={2} className="!text-white !mb-4">
        设置
      </Title>
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  )
}

export const Route = createFileRoute('/_main/settings')({
  component: SettingsPage
})
