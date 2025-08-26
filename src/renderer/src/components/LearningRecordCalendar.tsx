import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Tooltip, Badge, Typography, Card, Button, Space } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { formatSecondsToHuman } from '@renderer/utils/time'
import type { Course } from '../../../preload/index.d'

const { Title, Text } = Typography

export function LearningRecordCalendar({ courses, token }) {
  const [currentDate, setCurrentDate] = useState(dayjs())

  // 1. 数据处理
  const learningDataByDate = useMemo(() => {
    const data = new Map<string, { totalDuration: number; recordings: Map<string, number> }>()
    courses.forEach((course: Course) => {
      course.recordings?.forEach((rec) => {
        rec.sessions?.forEach((session) => {
          if (session?.date && session.duration > 0) {
            if (!data.has(session.date)) {
              data.set(session.date, { totalDuration: 0, recordings: new Map() })
            }
            const dayData = data.get(session.date)!
            dayData.totalDuration += session.duration
            const recDuration = dayData.recordings.get(rec.name) || 0
            dayData.recordings.set(rec.name, recDuration + session.duration)
          }
        })
      })
    })
    const finalData = new Map<
      string,
      { totalDuration: number; recordings: { name: string; duration: number }[] }
    >()
    for (const [date, dayData] of data.entries()) {
      finalData.set(date, {
        totalDuration: dayData.totalDuration,
        recordings: Array.from(dayData.recordings.entries()).map(([name, duration]) => ({
          name,
          duration
        }))
      })
    }
    return finalData
  }, [courses])

  // 2. 生成日历网格
  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')
    const startDay = startOfMonth.startOf('week')
    const endDay = endOfMonth.endOf('week')

    const grid: import('dayjs').Dayjs[] = []
    let day = startDay
    while (day.isBefore(endDay, 'day') || day.isSame(endDay, 'day')) {
      grid.push(day)
      day = day.add(1, 'day')
    }
    return grid
  }, [currentDate])

  // 3. 统计数据
  const { monthlyTotal, overallTotal } = useMemo(() => {
    const total = Array.from(learningDataByDate.values()).reduce(
      (acc, curr) => acc + curr.totalDuration,
      0
    )

    let monthly = 0
    for (const [dateString, data] of learningDataByDate.entries()) {
      if (dayjs(dateString).isSame(currentDate, 'month')) {
        monthly += data.totalDuration
      }
    }
    return { monthlyTotal: monthly, overallTotal: total }
  }, [learningDataByDate, currentDate])

  // 4. 渲染
  return (
    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
      {/* 头部控制器和统计 */}
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!text-white !m-0">
          {currentDate.format('YYYY 年 M 月')}
        </Title>
        <Space>
          <Button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}>
            <LeftOutlined /> 上一月
          </Button>
          <Button onClick={() => setCurrentDate(dayjs())}>本月</Button>
          <Button onClick={() => setCurrentDate(currentDate.add(1, 'month'))}>
            下一月 <RightOutlined />
          </Button>
        </Space>
      </div>
      <Card className="!bg-gray-800/30 !border-gray-700/50 mb-6">
        <div className="flex justify-around items-center">
          <div>
            <Text className="text-base text-gray-400">本月总学习</Text>
            <Text className="block text-2xl font-bold text-blue-400">
              {formatSecondsToHuman(monthlyTotal, 'short')}
            </Text>
          </div>
          <div className="h-12 w-px bg-gray-600" />
          <div>
            <Text className="text-base text-gray-400">累计总学习</Text>
            <Text className="block text-2xl font-bold text-green-400">
              {formatSecondsToHuman(overallTotal, 'short')}
            </Text>
          </div>
        </div>
      </Card>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-400 pb-2">
            {day}
          </div>
        ))}
        {calendarGrid.map((day) => {
          const dateString = day.format('YYYY-MM-DD')
          const dayData = learningDataByDate.get(dateString)
          const isCurrentMonth = day.isSame(currentDate, 'month')
          const isToday = day.isSame(dayjs(), 'day')

          const cellContent = (
            <div
              className={clsx(
                'h-28 flex flex-col p-2 rounded-md transition-colors duration-200',
                isCurrentMonth ? 'bg-gray-700/50' : 'bg-gray-800/30',
                isCurrentMonth && 'hover:bg-gray-600/50',
                isToday && 'ring-2 ring-blue-500'
              )}
            >
              <div
                className={clsx(
                  'font-medium',
                  isCurrentMonth ? 'text-white' : 'text-gray-500',
                  isToday && 'text-blue-400'
                )}
              >
                {day.format('D')}
              </div>
              {dayData && (
                <div className="flex-grow flex flex-col items-center justify-center text-xs leading-tight mt-1">
                  <div style={{ color: token.colorTextSecondary }}>
                    打卡 {dayData.recordings.length} 节
                  </div>
                  <div className="font-semibold" style={{ color: token.colorPrimary }}>
                    {formatSecondsToHuman(dayData.totalDuration, 'short')}
                  </div>
                </div>
              )}
            </div>
          )

          if (!dayData) {
            return <div key={dateString}>{cellContent}</div>
          }

          const tooltipContent = (
            <div
              className="flex flex-col gap-2 p-2"
              style={{ minWidth: '250px', maxWidth: '300px' }}
            >
              <div className="font-bold mb-1 text-white">{day.format('YYYY-MM-DD')} 学习列表:</div>
              {dayData.recordings.map((rec) => (
                <div key={rec.name} className="flex justify-between items-center w-full">
                  <div className="flex items-center overflow-hidden pr-2">
                    <Badge color={token.colorPrimary} className="mr-2 flex-shrink-0" />
                    <Typography.Text className="!text-gray-300" ellipsis={{ tooltip: rec.name }}>
                      {rec.name}
                    </Typography.Text>
                  </div>
                  <Typography.Text type="secondary" className="whitespace-nowrap flex-shrink-0">
                    {formatSecondsToHuman(rec.duration, 'short')}
                  </Typography.Text>
                </div>
              ))}
            </div>
          )

          return (
            <Tooltip
              key={dateString}
              title={tooltipContent}
              placement="right"
              overlayInnerStyle={{
                padding: 0,
                backgroundColor: 'rgba(42, 42, 42, 0.9)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}
            >
              {cellContent}
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
