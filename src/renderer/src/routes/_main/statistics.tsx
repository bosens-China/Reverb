import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '@renderer/store/store'
import { Button, Space, Typography, Card, theme, Tabs } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import localeData from 'dayjs/plugin/localeData'
import 'dayjs/locale/zh-cn'
import { useMemo, useState } from 'react'
import type { Course } from 'src/preload/index.d'
import { LearningRecordCalendar } from '@renderer/components/LearningRecordCalendar'
import { formatSecondsToHuman } from '@renderer/utils/time'

// --- 全局设置 ---
dayjs.extend(localeData)
dayjs.extend(weekOfYear)
dayjs.locale('zh-cn')

const { Title, Text } = Typography

// --- 辅助函数 ---
const getWeekRange = (date: dayjs.Dayjs) => {
  const startOfWeek = date.startOf('week')
  const endOfWeek = date.endOf('week')
  return { start: startOfWeek, end: endOfWeek }
}

// --- 子组件：学习统计图表 ---
function StatisticsChart({ courses, token }) {
  const [currentDate, setCurrentDate] = useState(dayjs())

  const handlePrevWeek = () => setCurrentDate(currentDate.subtract(1, 'week'))
  const handleNextWeek = () => setCurrentDate(currentDate.add(1, 'week'))
  const handleThisWeek = () => setCurrentDate(dayjs())

  const { start, end } = getWeekRange(currentDate)
  const isFutureWeek = currentDate.isAfter(dayjs(), 'week')

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = start.add(i, 'day')
      const dayString = day.format('YYYY-MM-DD')
      let totalSeconds = 0
      const details: Record<string, Record<string, number>> = {}

      courses.forEach((course: Course) => {
        if (!course?.recordings) return
        course.recordings.forEach((rec) => {
          let recordingTotalSeconds = 0
          rec.sessions?.forEach((session) => {
            if (session?.date === dayString) {
              recordingTotalSeconds += session.duration || 0
            }
          })

          if (recordingTotalSeconds > 0) {
            const courseName = course.name || '未命名课程'
            if (!details[courseName]) {
              details[courseName] = {}
            }
            details[courseName][rec.name] = recordingTotalSeconds
            totalSeconds += recordingTotalSeconds
          }
        })
      })

      return {
        day: day.format('dddd'),
        date: day.format('M月D日'),
        value: totalSeconds,
        displayValue: totalSeconds,
        details: details
      }
    })
  }, [courses, start])

  const totalWeeklySeconds = weeklyData.reduce((sum, day) => sum + day.displayValue, 0)

  const chartOption = {
    backgroundColor: 'transparent',
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: weeklyData.map((item) => item.day),
      boundaryGap: false,
      axisLine: { lineStyle: { color: token.colorBorder } },
      axisLabel: { color: token.colorTextSecondary, fontSize: 12 },
      axisTick: { lineStyle: { color: token.colorBorder } }
    },
    yAxis: {
      type: 'value',
      name: '学习时长',
      nameTextStyle: { color: token.colorTextSecondary, fontSize: 12 },
      axisLine: { lineStyle: { color: token.colorBorder } },
      axisLabel: {
        color: token.colorTextSecondary,
        fontSize: 12,
        formatter: (value: number) => formatSecondsToHuman(value, 'short')
      },
      splitLine: { lineStyle: { color: token.colorSplit, type: 'dashed' } },
      axisTick: { lineStyle: { color: token.colorBorder } },
      min: 0
    },
    series: [
      {
        data: weeklyData.map((item) => ({
          value: item.value,
          displayValue: item.displayValue,
          details: item.details,
          day: item.day,
          date: item.date
        })),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: token.colorPrimary },
        lineStyle: { width: 3, shadowColor: token.colorPrimary, shadowBlur: 10 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: token.colorPrimary },
              { offset: 1, color: 'rgba(0,0,0,0)' }
            ]
          },
          opacity: 0.2
        },
        emphasis: {
          focus: 'series',
          itemStyle: { borderColor: '#fff', borderWidth: 2 }
        }
      }
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: token.colorBgElevated,
      borderColor: token.colorBorderSecondary,
      borderWidth: 1,
      textStyle: { color: token.colorText, fontSize: 12 },
      padding: [8, 12],
      extraCssText: `border-radius: ${token.borderRadiusLG}px; box-shadow: ${token.boxShadowSecondary};`,
      formatter: (params: {
        data: {
          displayValue: number
          details: Record<string, Record<string, number>>
          day: string
          date: string
        }
      }) => {
        const { data } = params
        const { displayValue, details, day, date } = data

        let content = `<div style="font-weight: 600; margin-bottom: 8px; color: ${token.colorText}; border-bottom: 1px solid ${token.colorBorderSecondary}; padding-bottom: 4px;">${day} - ${date}</div>`

        if (!displayValue || displayValue === 0) {
          content += `<div style="color: ${token.colorTextSecondary};">暂无学习记录</div>`
        } else {
          content += `<div style="font-weight: 600; margin-bottom: 4px; color: ${token.colorText};">总计: ${formatSecondsToHuman(displayValue, 'full')}</div>`
          Object.entries(details).forEach(([courseName, recordings]) => {
            content += `<div style="margin: 5px 0; font-weight: 500; color: ${token.colorText};">${courseName}</div>`
            Object.entries(recordings).forEach(([recName, seconds]) => {
              content += `<div style="margin: 3px 0 3px 10px; display: flex; justify-content: space-between; align-items: center;">
                          <span style="color: ${token.colorTextSecondary};">- ${recName}</span>
                          <span style="color: ${token.colorPrimary}; font-weight: 500; margin-left: 12px;">${formatSecondsToHuman(seconds, 'full')}</span>
                        </div>`
            })
          })
        }

        return `<div style="line-height: 1.5; min-width: 180px;">${content}</div>`
      }
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="!text-white !m-0">
          每周趋势
        </Title>
        <Space>
          <Button onClick={handlePrevWeek}>
            <LeftOutlined /> 上一周
          </Button>
          <Button onClick={handleThisWeek}>本周</Button>
          <Button onClick={handleNextWeek} disabled={isFutureWeek}>
            下一周 <RightOutlined />
          </Button>
        </Space>
      </div>
      <Card className="!bg-gray-800/50 !border-gray-700 mb-6">
        <div className="flex justify-between items-center">
          <Text className="text-base">当前周范围</Text>
          <Text className="text-lg font-semibold">
            {start.format('YYYY年M月D日')} - {end.format('YYYY年M月D日')}
          </Text>
          <Text className="text-base">本周总学习</Text>
          <Text className="text-2xl font-bold text-blue-400">
            {formatSecondsToHuman(totalWeeklySeconds, 'short')}
          </Text>
        </div>
      </Card>
      <ReactECharts
        option={chartOption}
        style={{ height: '400px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </>
  )
}

// --- 主页面 ---
function StatisticsPage() {
  const { courses } = useStore()
  const { token } = theme.useToken()

  const tabItems = [
    {
      key: '1',
      label: '学习统计',
      children: <StatisticsChart courses={courses} token={token} />
    },
    {
      key: '2',
      label: '学习日历',
      children: <LearningRecordCalendar courses={courses} token={token} />
    }
  ]

  return (
    <div>
      <Title level={2} className="!text-white !mb-4">
        学习统计
      </Title>
      <Tabs defaultActiveKey="1" items={tabItems} />
    </div>
  )
}

export const Route = createFileRoute('/_main/statistics')({
  component: StatisticsPage
})
