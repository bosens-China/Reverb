import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { App, Button, Popconfirm, Space, Table, Tooltip, Typography, Empty } from 'antd'
import { useEffect, useState } from 'react'
import { useStore } from '@renderer/store/store'
import {
  PlayCircleOutlined,
  DeleteOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  SyncOutlined
} from '@ant-design/icons'
import type { Recording } from '../../../../../preload/index.d'
import dayjs from 'dayjs'
import { formatSecondsToHuman } from '@renderer/utils/time'

const { Title, Text } = Typography

// --- 数据计算辅助函数 ---

// 计算总学习时长
function calculateTotalLearningTime(sessions: Recording['sessions']): number {
  return (sessions || []).reduce((acc, s) => acc + s.duration, 0)
}

function CourseDetailPage() {
  const { courseId } = Route.useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { courses, actions, paginationState } = useStore()
  const { setLearningRecording, addRecordingsToCourse, deleteRecording, setCoursePagination, setRecordingLastLearnedDate } = actions

  const course = courses.find((c) => c.id === courseId)
  const coursePagination = paginationState[courseId] || { currentPage: 1, pageSize: 20 }

  const [loading, setLoading] = useState(false)
  const [fileStatus, setFileStatus] = useState<Record<string, boolean>>({})

  const checkAllFiles = async (recordings: Recording[]) => {
    setLoading(true)
    const status: Record<string, boolean> = {}
    for (const file of recordings) {
      status[file.path] = await window.api.checkFileExists(file.path)
    }
    setFileStatus(status)
    setLoading(false)
  }

  useEffect(() => {
    if (course) {
      checkAllFiles(course.recordings)
    }
  }, [course])

  const handleAddFiles = async () => {
    const files = await window.api.openFileDialog()
    if (files.length > 0) {
      const { addedCount, skippedCount } = await addRecordingsToCourse(courseId, files)
      if (addedCount > 0) message.success(`成功添加 ${addedCount} 个文件。`)
      if (skippedCount > 0) message.info(`跳过 ${skippedCount} 个重复文件。`)
    }
  }

  const handleAddFolder = async () => {
    const files = await window.api.openFolderDialog()
    if (files.length > 0) {
      const { addedCount, skippedCount } = await addRecordingsToCourse(courseId, files)
      if (addedCount > 0) message.success(`成功添加 ${addedCount} 个文件。`)
      if (skippedCount > 0) message.info(`跳过 ${skippedCount} 个重复文件。`)
    }
  }

  const handleStartLearning = async (record: Recording) => {
    const exists = await window.api.checkFileExists(record.path)
    if (exists) {
      setLearningRecording(record)
      setRecordingLastLearnedDate(record.path) // 在开始学习时就更新时间
      navigate({ to: '/focus' })
    } else {
      message.error('文件不存在，无法开始学习。')
      setFileStatus((prev) => ({ ...prev, [record.path]: false }))
    }
  }

  const handlePaginationChange = (page: number, pageSize: number) => {
    setCoursePagination(courseId, page, pageSize)
  }

  const columns = [
    {
      title: '音频名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Recording) => (
        <Tooltip title={record.path} placement="topLeft">
          <Text className="!text-white" disabled={!fileStatus[record.path]}>
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'sessions',
      key: 'sessions',
      width: 100,
      render: (sessions: Recording['sessions']) =>
        sessions && sessions.length > 0 ? (
          <span className="text-green-400">已学习</span>
        ) : (
          <span className="text-gray-400">未学习</span>
        )
    },
    {
      title: '上次学习',
      dataIndex: 'lastLearnedDate',
      key: 'lastLearnedDate',
      width: 160,
      render: (date: string | undefined) =>
        date ? (
          <span className="text-gray-400">{dayjs(date).format('YYYY-MM-DD HH:mm')}</span>
        ) : (
          <span className="text-gray-500">-</span>
        )
    },
    {
      title: '总学习时长',
      dataIndex: 'sessions',
      key: 'learningTime',
      width: 150,
      render: (sessions: Recording['sessions']) => (
        <span className="text-gray-300">{formatSecondsToHuman(calculateTotalLearningTime(sessions), 'full')}</span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Recording) => (
        <Space>
          <Tooltip title="开始学习">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartLearning(record)}
              disabled={!fileStatus[record.path]}
            />
          </Tooltip>
          <Tooltip title="移除">
            <Popconfirm
              title="确认移除录音？"
              onConfirm={() => deleteRecording(courseId, record.path)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  if (!course) {
    return (
      <div className="text-center">
        <Title level={3}>课程未找到</Title>
        <Link to="/courses">返回课程列表</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!text-white !m-0">
          {course.name}
        </Title>
        <Space>
          <Button icon={<FileAddOutlined />} onClick={handleAddFiles}>
            添加文件
          </Button>
          <Button icon={<FolderAddOutlined />} onClick={handleAddFolder}>
            添加文件夹
          </Button>
          <Button icon={<SyncOutlined />} onClick={() => checkAllFiles(course.recordings)}>
            刷新状态
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={course.recordings.map((r) => ({ ...r, key: r.path }))}
        loading={loading}
        pagination={{
          current: coursePagination.currentPage,
          pageSize: coursePagination.pageSize,
          onChange: handlePaginationChange,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        locale={{ emptyText: <Empty description="暂无录音，快去添加吧！" /> }}
        className="!bg-transparent"
      />
    </div>
  )
}

export const Route = createFileRoute('/_main/courses/$courseId')({
  component: CourseDetailPage
})