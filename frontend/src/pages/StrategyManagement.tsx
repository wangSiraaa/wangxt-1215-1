import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select,
  Switch, message, Drawer, Descriptions, Divider,
} from 'antd'
import { PlusOutlined, PlayCircleOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { strategyApi, pumpStationApi } from '@/services/api'
import type { DrainStrategy, PumpStation } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const StrategyManagement = () => {
  const [strategies, setStrategies] = useState<DrainStrategy[]>([])
  const [stations, setStations] = useState<PumpStation[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<DrainStrategy | null>(null)
  const [form] = Form.useForm()
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; strategy: DrainStrategy | null; action: string }>({
    visible: false,
    strategy: null,
    action: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [strategiesData, stationsData] = await Promise.all([
        strategyApi.list(),
        pumpStationApi.list(),
      ])
      setStrategies(strategiesData)
      setStations(stationsData)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await strategyApi.create(values)
      message.success('创建成功')
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handlePublish = async (id: number) => {
    try {
      await strategyApi.publish(id)
      message.success('发布成功')
      loadData()
    } catch (error) {
      message.error('发布失败')
    }
  }

  const showConfirm = (strategy: DrainStrategy, action: string) => {
    setConfirmModal({ visible: true, strategy, action })
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.strategy) return

    try {
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : 1

      if (confirmModal.action === 'execute') {
        await strategyApi.execute(confirmModal.strategy.id, userId)
        message.success('策略已执行')
      } else if (confirmModal.action === 'stop') {
        await strategyApi.stop(confirmModal.strategy.id, userId)
        message.success('策略已停止')
      }
      setConfirmModal({ visible: false, strategy: null, action: '' })
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    }
  }

  const handleViewDetail = (strategy: DrainStrategy) => {
    setCurrentStrategy(strategy)
    setDrawerVisible(true)
  }

  const levelColorMap: Record<string, string> = {
    level_4: 'blue',
    level_3: 'cyan',
    level_2: 'orange',
    level_1: 'red',
  }

  const levelTextMap: Record<string, string> = {
    level_4: '四级响应',
    level_3: '三级响应',
    level_2: '二级响应',
    level_1: '一级响应',
  }

  const statusColorMap: Record<string, string> = {
    draft: 'default',
    published: 'blue',
    executing: 'green',
    completed: 'green',
    cancelled: 'default',
  }

  const statusTextMap: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    executing: '执行中',
    completed: '已完成',
    cancelled: '已取消',
  }

  const columns = [
    {
      title: '策略标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '所属泵站',
      dataIndex: 'station_id',
      key: 'station_id',
      render: (stationId: number) => {
        const station = stations.find(s => s.id === stationId)
        return station?.name || '--'
      },
    },
    {
      title: '响应级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={levelColorMap[level]}>{levelTextMap[level]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusTextMap[status]}</Tag>
      ),
    },
    {
      title: '触发水位',
      dataIndex: 'trigger_water_level',
      key: 'trigger_water_level',
      render: (v: number) => v ? `${v} m` : '--',
    },
    {
      title: '触发雨量',
      dataIndex: 'trigger_rainfall',
      key: 'trigger_rainfall',
      render: (v: number) => v ? `${v} mm/h` : '--',
    },
    {
      title: '自动执行',
      dataIndex: 'auto_execute',
      key: 'auto_execute',
      render: (v: boolean) => v ? '是' : '否',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DrainStrategy) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'draft' && (
            <Button type="link" size="small" onClick={() => handlePublish(record.id)}>
              发布
            </Button>
          )}
          {record.status === 'published' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => showConfirm(record, 'execute')}
            >
              执行
            </Button>
          )}
          {record.status === 'executing' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => showConfirm(record, 'stop')}
            >
              停止
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="排涝策略管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建策略
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={strategies}
          loading={loading}
        />
      </Card>

      <Modal
        title="新建排涝策略"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="策略标题"
            name="title"
            rules={[{ required: true, message: '请输入策略标题' }]}
          >
            <Input placeholder="请输入策略标题" />
          </Form.Item>

          <Form.Item
            label="所属泵站"
            name="station_id"
            rules={[{ required: true, message: '请选择泵站' }]}
          >
            <Select placeholder="请选择泵站">
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="响应级别"
            name="level"
            rules={[{ required: true, message: '请选择响应级别' }]}
            initialValue="level_4"
          >
            <Select>
              <Option value="level_4">四级响应（常规）</Option>
              <Option value="level_3">三级响应（加强）</Option>
              <Option value="level_2">二级响应（紧急）</Option>
              <Option value="level_1">一级响应（极端）</Option>
            </Select>
          </Form.Item>

          <Form.Item label="触发水位 (m)" name="trigger_water_level">
            <Input type="number" placeholder="达到该水位时触发策略" />
          </Form.Item>

          <Form.Item label="触发雨量 (mm/h)" name="trigger_rainfall">
            <Input type="number" placeholder="达到该雨量时触发策略" />
          </Form.Item>

          <Form.Item label="目标水位 (m)" name="target_water_level">
            <Input type="number" placeholder="排涝目标水位" />
          </Form.Item>

          <Form.Item label="自动执行" name="auto_execute" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>

          <Form.Item label="策略说明" name="description">
            <TextArea rows={3} placeholder="请输入策略说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="策略详情"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {currentStrategy && (
          <div>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="策略标题">{currentStrategy.title}</Descriptions.Item>
              <Descriptions.Item label="所属泵站">
                {stations.find(s => s.id === currentStrategy.station_id)?.name || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="响应级别">
                <Tag color={levelColorMap[currentStrategy.level]}>
                  {levelTextMap[currentStrategy.level]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[currentStrategy.status]}>
                  {statusTextMap[currentStrategy.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="触发水位">
                {currentStrategy.trigger_water_level
                  ? `${currentStrategy.trigger_water_level} m`
                  : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="触发雨量">
                {currentStrategy.trigger_rainfall
                  ? `${currentStrategy.trigger_rainfall} mm/h`
                  : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="目标水位">
                {currentStrategy.target_water_level
                  ? `${currentStrategy.target_water_level} m`
                  : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="自动执行">
                {currentStrategy.auto_execute ? '是' : '否'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <h4>策略说明</h4>
              <p>{currentStrategy.description || '暂无说明'}</p>
            </div>

            <Divider />

            <Descriptions title="时间信息" column={1} bordered size="small">
              <Descriptions.Item label="创建时间">
                {dayjs(currentStrategy.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {currentStrategy.published_at && (
                <Descriptions.Item label="发布时间">
                  {dayjs(currentStrategy.published_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {currentStrategy.executed_at && (
                <Descriptions.Item label="执行时间">
                  {dayjs(currentStrategy.executed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {currentStrategy.completed_at && (
                <Descriptions.Item label="完成时间">
                  {dayjs(currentStrategy.completed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Drawer>

      <Modal
        title={confirmModal.action === 'execute' ? '确认执行策略' : '确认停止策略'}
        open={confirmModal.visible}
        onOk={handleConfirmAction}
        onCancel={() => setConfirmModal({ visible: false, strategy: null, action: '' })}
        okText="确认"
        cancelText="取消"
      >
        <p>
          {confirmModal.action === 'execute'
            ? `确定要执行策略「${confirmModal.strategy?.title}」吗？`
            : `确定要停止策略「${confirmModal.strategy?.title}」吗？`}
        </p>
        {confirmModal.strategy?.status === 'published' && (
          <p style={{ color: '#faad14' }}>
            注意：执行策略后，将启动对应泵站的水泵将开始运行。
          </p>
        )}
      </Modal>
    </div>
  )
}

export default StrategyManagement
