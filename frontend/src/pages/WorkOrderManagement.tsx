import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select,
  message, Drawer, Descriptions, Badge,
} from 'antd'
import {
  PlusOutlined, ToolOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined,
} from '@ant-design/icons'
import { workOrderApi, pumpStationApi, pumpApi } from '@/services/api'
import type { WorkOrder, PumpStation, Pump } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const WorkOrderManagement = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [stations, setStations] = useState<PumpStation[]>([])
  const [pumps, setPumps] = useState<Pump[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<WorkOrder | null>(null)
  const [form] = Form.useForm()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const [ordersData, stationsData, pumpsData] = await Promise.all([
        workOrderApi.list(params),
        pumpStationApi.list(),
        pumpApi.list(),
      ])
      setOrders(ordersData)
      setStations(stationsData)
      setPumps(pumpsData)
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
      await workOrderApi.create(values)
      message.success('创建成功')
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await workOrderApi.update(id, { status })
      message.success('状态更新成功')
      loadData()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleViewDetail = (order: WorkOrder) => {
    setCurrentOrder(order)
    setDrawerVisible(true)
  }

  const typeColorMap: Record<string, string> = {
    repair: 'red',
    maintenance: 'blue',
    inspection: 'green',
    emergency: 'orange',
  }

  const typeTextMap: Record<string, string> = {
    repair: '维修',
    maintenance: '维护',
    inspection: '巡检',
    emergency: '应急',
  }

  const statusColorMap: Record<string, string> = {
    pending: 'default',
    assigned: 'blue',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'default',
  }

  const statusTextMap: Record<string, string> = {
    pending: '待处理',
    assigned: '已指派',
    in_progress: '处理中',
    completed: '已完成',
    cancelled: '已取消',
  }

  const priorityColorMap: Record<string, string> = {
    low: 'default',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
  }

  const priorityTextMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }

  const columns = [
    {
      title: '工单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 150,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 80,
      render: (type: string) => (
        <Tag color={typeColorMap[type]}>{typeTextMap[type]}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={priorityColorMap[priority]}>{priorityTextMap[priority]}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={statusColorMap[status] as any} text={statusTextMap[status]} />
      ),
    },
    {
      title: '关联泵站',
      dataIndex: 'station_id',
      key: 'station_id',
      render: (stationId: number) => {
        const station = stations.find(s => s.id === stationId)
        return station?.name || '--'
      },
    },
    {
      title: '上报人',
      dataIndex: 'reported_by',
      key: 'reported_by',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: WorkOrder) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'in_progress')}>
              开始处理
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'completed')}>
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length
  const completedCount = orders.filter(o => o.status === 'completed').length

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type={statusFilter === undefined ? 'primary' : 'default'}
            onClick={() => setStatusFilter(undefined)}
          >
            全部 ({orders.length})
          </Button>
          <Button
            type={statusFilter === 'pending' ? 'primary' : 'default'}
            icon={<ClockCircleOutlined />}
            onClick={() => setStatusFilter('pending')}
          >
            待处理 ({pendingCount})
          </Button>
          <Button
            type={statusFilter === 'in_progress' ? 'primary' : 'default'}
            icon={<ToolOutlined />}
            onClick={() => setStatusFilter('in_progress')}
          >
            处理中 ({inProgressCount})
          </Button>
          <Button
            type={statusFilter === 'completed' ? 'primary' : 'default'}
            icon={<CheckCircleOutlined />}
            onClick={() => setStatusFilter('completed')}
          >
            已完成 ({completedCount})
          </Button>
        </Space>
      </div>

      <Card
        title="工单管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建工单
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
        />
      </Card>

      <Modal
        title="新建工单"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="工单标题"
            name="title"
            rules={[{ required: true, message: '请输入工单标题' }]}
          >
            <Input placeholder="请输入工单标题" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="工单类型"
              name="order_type"
              rules={[{ required: true, message: '请选择类型' }]}
              initialValue="repair"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="repair">维修</Option>
                <Option value="maintenance">维护</Option>
                <Option value="inspection">巡检</Option>
                <Option value="emergency">应急</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="优先级"
              name="priority"
              rules={[{ required: true, message: '请选择优先级' }]}
              initialValue="medium"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
                <Option value="urgent">紧急</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item label="关联泵站" name="station_id">
            <Select placeholder="请选择泵站" allowClear>
              {stations.map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="关联水泵" name="pump_id">
            <Select placeholder="请选择水泵" allowClear>
              {pumps.map(pump => (
                <Option key={pump.id} value={pump.id}>
                  {pump.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="故障描述" name="fault_description">
            <TextArea rows={3} placeholder="请输入故障描述" />
          </Form.Item>

          <Form.Item label="详细说明" name="description">
            <TextArea rows={3} placeholder="请输入详细说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="工单详情"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {currentOrder && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={typeColorMap[currentOrder.order_type]}>
                {typeTextMap[currentOrder.order_type]}
              </Tag>
              <Tag color={priorityColorMap[currentOrder.priority]}>
                {priorityTextMap[currentOrder.priority]} 优先级
              </Tag>
              <Badge status={statusColorMap[currentOrder.status] as any} text={statusTextMap[currentOrder.status]} />
            </Space>

            <h3 style={{ marginTop: 0 }}>{currentOrder.title}</h3>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="工单号">{currentOrder.order_no}</Descriptions.Item>
              <Descriptions.Item label="关联泵站">
                {stations.find(s => s.id === currentOrder.station_id)?.name || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="关联水泵">
                {pumps.find(p => p.id === currentOrder.pump_id)?.name || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="上报人">{currentOrder.reported_by || '--'}</Descriptions.Item>
            </Descriptions>

            {currentOrder.fault_description && (
              <div style={{ marginTop: 16 }}>
                <h4>故障描述</h4>
                <p>{currentOrder.fault_description}</p>
              </div>
            )}

            {currentOrder.description && (
              <div style={{ marginTop: 16 }}>
                <h4>详细说明</h4>
                <p>{currentOrder.description}</p>
              </div>
            )}

            {currentOrder.resolution && (
              <div style={{ marginTop: 16 }}>
                <h4>处理结果</h4>
                <p>{currentOrder.resolution}</p>
              </div>
            )}

            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="创建时间">
                {dayjs(currentOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {currentOrder.started_at && (
                <Descriptions.Item label="开始时间">
                  {dayjs(currentOrder.started_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {currentOrder.completed_at && (
                <Descriptions.Item label="完成时间">
                  {dayjs(currentOrder.completed_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default WorkOrderManagement
