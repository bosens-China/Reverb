import React, { useEffect } from 'react'
import { Form, Input, InputNumber, Button, Select, Space, Card, Typography, App } from 'antd'
import {
  MinusCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  UndoOutlined,
  BorderOutlined
} from '@ant-design/icons'
import { useStore, DEFAULT_PHASES } from '@renderer/store/store'
import type { PhaseSetting } from '../../../preload/index.d'
import { v4 as uuidv4 } from 'uuid'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { Text } = Typography

interface DraggablePhaseCardProps {
  id: string
  name: number
  remove: (name: number) => void
}

// 抽离出的可拖拽卡片组件
const DraggablePhaseCard: React.FC<DraggablePhaseCardProps> = ({ id, name, remove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1
  }

  return (
    <Card ref={setNodeRef} style={style} bodyStyle={{ padding: '16px' }}>
      <Space align="baseline" className="flex">
        <Button type="text" {...listeners} {...attributes} icon={<BorderOutlined />} />
        <Form.Item
          name={[name, 'name']}
          rules={[{ required: true, message: '请输入名称' }]}
          className="!mb-0 flex-1"
        >
          <Input placeholder="阶段名称 (如: 默写)" />
        </Form.Item>
        <Form.Item
          name={[name, 'type']}
          rules={[{ required: true, message: '请选择' }]}
          className="!mb-0"
        >
          <Select style={{ width: 100 }}>
            <Select.Option value="学习">学习</Select.Option>
            <Select.Option value="休息">休息</Select.Option>
            <Select.Option value="结束">结束</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.phases[name]?.type !== currentValues.phases[name]?.type
          }
        >
          {({ getFieldValue }) =>
            getFieldValue(['phases', name, 'type']) !== '结束' ? (
              <Form.Item
                name={[name, 'duration']}
                rules={[{ required: true, message: '请输入' }]}
                className="!mb-0"
              >
                <InputNumber min={1} placeholder="分钟" addonAfter="分钟" />
              </Form.Item>
            ) : (
              <div style={{ width: 135 }} /> // 占位符
            )
          }
        </Form.Item>
        <Form.Item name={[name, 'id']} hidden>
          <Input />
        </Form.Item>
        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
      </Space>
    </Card>
  )
}

/**
 * @description 新版设置表单组件，允许用户自定义学习流程
 */
export function SettingsForm(): React.JSX.Element {
  const { phases, actions } = useStore()
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const formPhaseIds = Form.useWatch('phases', form)?.map((p) => p?.id) || []

  useEffect(() => {
    const formValues = phases.map((p) => ({
      ...p,
      duration: p.type === '结束' ? 1 : p.duration / 60
    }))
    form.setFieldsValue({ phases: formValues })
  }, [phases, form])

  const handleSave = (values: {
    phases: (Omit<PhaseSetting, 'duration' | 'id'> & { id?: string; duration: number })[]
  }): void => {
    if (!values.phases || values.phases.length === 0) {
      message.error('至少需要一个学习阶段！')
      return
    }
    const newPhases = values.phases.map((p) => ({
      ...p,
      id: p.id || uuidv4(),
      duration: p.type === '结束' ? 0 : p.duration * 60
    }))
    actions.setPhases(newPhases)
    message.success('专注流已保存！')
  }

  const handleReset = (): void => {
    const defaultPhasesInMinutes = DEFAULT_PHASES.map((p) => ({ ...p, duration: p.duration / 60 }))
    form.setFieldsValue({ phases: defaultPhasesInMinutes })
    message.info('已恢复为默认设置')
  }

  const onDragEnd = ({ active, over }: DragEndEvent, move) => {
    if (active.id !== over?.id) {
      const oldIndex = formPhaseIds.indexOf(active.id)
      const newIndex = formPhaseIds.indexOf(over?.id)
      move(oldIndex, newIndex)
    }
  }

  return (
    <div>
      <Text type="secondary" className="mb-6 block">
        规划你的学习、休息与结束阶段。应用将按列表顺序循环执行，你可以通过左侧的图标拖拽排序。
      </Text>
      <Form form={form} layout="vertical" onFinish={handleSave} autoComplete="off">
        <Form.List name="phases">
          {(fields, { add, remove, move }) => (
            <DndContext onDragEnd={(e) => onDragEnd(e, move)}>
              <SortableContext items={formPhaseIds}>
                <div className="space-y-4">
                  {fields.map(({ key, name }) => (
                    <DraggablePhaseCard
                      key={key}
                      id={form.getFieldValue(['phases', name, 'id'])}
                      name={name}
                      remove={remove}
                    />
                  ))}
                </div>
              </SortableContext>
              <Form.Item className="!mt-6">
                <Button
                  type="dashed"
                  onClick={() => add({ id: uuidv4(), name: '', type: '学习', duration: 10 })}
                  block
                  icon={<PlusOutlined />}
                >
                  添加新阶段
                </Button>
              </Form.Item>
            </DndContext>
          )}
        </Form.List>
        <Space className="mt-8">
          <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
            保存设置
          </Button>
          <Button icon={<UndoOutlined />} onClick={handleReset}>
            恢复默认
          </Button>
        </Space>
      </Form>
    </div>
  )
}
