import { createFileRoute, Link } from '@tanstack/react-router'
import { useStore } from '@renderer/store/store'
import { Button, Input, Drawer, Card, Popconfirm, Form, Empty, Typography, App, Tooltip } from 'antd'
import { useState } from 'react'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Course } from '../../../../../preload/index.d'

const { Title, Text } = Typography

function CoursesIndex() {
  const { courses, actions } = useStore()
  const { addCourse, deleteCourse, updateCourseName } = actions
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const showDrawer = (course: Course | null = null) => {
    setEditingCourse(course)
    form.setFieldsValue({ name: course ? course.name : '' })
    setDrawerVisible(true)
  }

  const closeDrawer = () => {
    setDrawerVisible(false)
    setEditingCourse(null)
    form.resetFields()
  }

  const handleFormSubmit = (values: { name: string }) => {
    if (editingCourse) {
      updateCourseName(editingCourse.id, values.name)
      message.success(`课程 "${values.name}" 已更新`)
    } else {
      addCourse(values.name)
      message.success(`课程 "${values.name}" 已创建`)
    }
    closeDrawer()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!text-white !m-0">
          我的课程
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showDrawer()}>
          创建新课程
        </Button>
      </div>

      {courses.length === 0 ? (
        <Empty description="暂无课程，快去创建一个吧！" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              hoverable
              className="border-gray-700"
              actions={[
                <EditOutlined key="edit" onClick={() => showDrawer(course)} />,
                <Popconfirm
                  key={'delete'}
                  title={`确认删除课程 "${course.name}"？`}
                  description="这将删除课程及其下所有录音记录。"
                  onConfirm={() => deleteCourse(course.id)}
                >
                  <DeleteOutlined key="delete" />
                </Popconfirm>
              ]}
            >
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                <Card.Meta
                  title={
                    <Tooltip title={course.name}>
                      {/* 固定高度容器，确保描述对齐 */}
                      <div className="h-[2.8em] mb-1">
                        <Text className="text-white text-base line-clamp-2 leading-tight">
                          {course.name}
                        </Text>
                      </div>
                    </Tooltip>
                  }
                  description={`${course.recordings.length} 个录音`}
                />
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        title={editingCourse ? '编辑课程' : '创建新课程'}
        width={400}
        onClose={closeDrawer}
        open={drawerVisible}
        styles={{ body: { paddingBottom: 80 } }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeDrawer} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button onClick={() => form.submit()} type="primary">
              提交
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="课程名称"
            rules={[{ required: true, message: '请输入课程名称' }]}
          >
            <Input placeholder="例如：新概念英语第一册" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export const Route = createFileRoute('/_main/courses/')({
  component: CoursesIndex
})
