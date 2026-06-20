import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select,
  message, Drawer, Descriptions, Image, Badge,
} from 'antd'
import {
  PlusOutlined, WarningOutlined, CheckCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { floodWarningApi } from '@/services/api'
import type { FloodWarning } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const FloodWarningList = () => {
  const [warnings, setWarnings] = useState<FloodWarning[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [currentWarning, setCurrentWarning] = useState<FloodWarning | null>(null)
  const [resolveModal, setResolveModal] = useState<{ visible: boolean; warning: FloodWarning | null }>({
    visible: false,
    warning: null,
  })
  const [form] = Form.useForm()
  const [resolveForm] = Form.useForm()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const data = await floodWarningApi.list(params)
      setWarnings(data)
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
      await floodWarningApi.create(values)
      message.success('创建成功')
      setModalVisible(false)
      loadData()
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleResolve = () => {
    if (!currentWarning) return
    resolveForm.resetFields()
    setResolveModal({ visible: true, warning: currentWarning })
  }

  const handleResolveSubmit = async () => {
    if (!resolveModal.warning) return

    try {
      const values = await resolveForm.validateFields()
      const userStr = localStorage.getItem('user')
      const resolvedBy = userStr ? JSON.parse(userStr).full_name : '系统'

      await floodWarningApi.resolve(
        resolveModal.warning.id,
        resolvedBy,
        values.resolution_note
      )

      message.success('告警已解除')
      setResolveModal({ visible: false, warning: null })
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '解除失败')
    }
  }

  const handleViewDetail = (warning: FloodWarning) => {
    setCurrentWarning(warning)
    setDrawerVisible(true)
  }

  const levelColorMap: Record<string, string> = {
    light: 'orange',
    moderate: 'orange',
    severe: 'red',
    extreme: 'purple',
  }

  const levelTextMap: Record<string, string> = {
    light: '轻度',
    moderate: '中度',
    severe: '严重',
    extreme: '极端',
  }

  const statusColorMap: Record<string, string> = {
    active: 'error',
    resolved: 'success',
    false_alarm: 'default',
  }

  const statusTextMap: Record<string, string> = {
    active: '活动中',
    resolved: '已解除',
    false_alarm: '误报',
  }

  const activeCount = warnings.filter(w => w.status === 'active').length
  const resolvedCount = warnings.filter(w => w.status === 'resolved').length

  const columns = [
    {
      title: '告警编号',
      dataIndex: 'warning_no',
      key: 'warning_no',
      width: 140,
    },
    {
      title: '地点',
      dataIndex: 'location_name',
      key: 'location_name',
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={levelColorMap[level]}>{levelTextMap[level]}</Tag>
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
      title: '积水深度',
      dataIndex: 'water_depth',
      key: 'water_depth',
      width: 100,
      render: (v: number) => (v !== undefined && v !== null ? `${v} cm` : '--'),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (v: string) => {
        const sourceMap: Record<string, string> = {
          patrol: '巡查上报',
          sensor: '传感器',
          manual: '手动创建',
        }
        return sourceMap[v] || v || '--'
      },
    },
    {
      title: '上报人',
      dataIndex: 'reported_by',
      key: 'reported_by',
      width: 120,
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
      width: 150,
      render: (_: any, record: FloodWarning) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setCurrentWarning(record)
                handleResolve()
              }}
            >
              解除
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type={statusFilter === undefined ? 'primary' : 'default'}
            onClick={() => setStatusFilter(undefined)}
          >
            全部 ({warnings.length})
          </Button>
          <Button
            type={statusFilter === 'active' ? 'primary' : 'default'}
            danger
            icon={<WarningOutlined />}
            onClick={() => setStatusFilter('active')}
          >
            活动中 ({activeCount})
          </Button>
          <Button
            type={statusFilter === 'resolved' ? 'primary' : 'default'}
            icon={<CheckCircleOutlined />}
            onClick={() => setStatusFilter('resolved')}
          >
            已解除 ({resolvedCount})
          </Button>
        </Space>
      </div>

      <Card
        title="积水告警管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            手动告警
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={warnings}
          loading={loading}
        />
      </Card>

      <Modal
        title="创建积水告警"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="地点名称"
            name="location_name"
            rules={[{ required: true, message: '请输入地点名称' }]}
          >
            <Input placeholder="请输入积水地点名称" prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="纬度"
              name="latitude"
              rules={[{ required: true, message: '请输入纬度' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="纬度" />
            </Form.Item>
            <Form.Item
              label="经度"
              name="longitude"
              rules={[{ required: true, message: '请输入经度' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="经度" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="告警级别"
              name="level"
              rules={[{ required: true, message: '请选择级别' }]}
              initialValue="moderate"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="light">轻度</Option>
                <Option value="moderate">中度</Option>
                <Option value="severe">严重</Option>
                <Option value="extreme">极端</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="积水深度 (cm)"
              name="water_depth"
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="请输入积水深度" />
            </Form.Item>
          </div>

          <Form.Item label="道路类型" name="road_type">
            <Input placeholder="如：主干道、次干道、小区道路等" />
          </Form.Item>

          <Form.Item label="情况描述" name="description">
            <TextArea rows={3} placeholder="请描述积水情况" />
          </Form.Item>

          <Form.Item label="照片链接" name="photo_url">
            <Input placeholder="请输入照片URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="告警详情"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {currentWarning && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={levelColorMap[currentWarning.level]}>
                {levelTextMap[currentWarning.level]}
              </Tag>
              <Badge status={statusColorMap[currentWarning.status] as any} text={statusTextMap[currentWarning.status]} />
            </Space>

            <h3 style={{ marginTop: 0 }}>{currentWarning.location_name}</h3>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="告警编号">{currentWarning.warning_no}</Descriptions.Item>
              <Descriptions.Item label="积水深度">
                {currentWarning.water_depth !== undefined && currentWarning.water_depth !== null
                  ? `${currentWarning.water_depth} cm`
                  : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="道路类型">{currentWarning.road_type || '--'}</Descriptions.Item>
              <Descriptions.Item label="来源">
                {currentWarning.source || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="上报人">{currentWarning.reported_by || '--'}</Descriptions.Item>
            </Descriptions>

            {currentWarning.description && (
              <div style={{ marginTop: 16 }}>
                <h4>情况描述</h4>
                <p>{currentWarning.description}</p>
              </div>
            )}

            {currentWarning.photo_url && (
              <div style={{ marginTop: 16 }}>
                <h4>现场照片</h4>
                <Image src={currentWarning.photo_url} />
              </div>
            )}

            {currentWarning.status === 'resolved' && (
              <div style={{ marginTop: 16 }}>
                <h4>解除信息</h4>
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="解除人">{currentWarning.resolved_by || '--'}</Descriptions.Item>
                  <Descriptions.Item label="解除时间">
                    {currentWarning.resolved_at
                      ? dayjs(currentWarning.resolved_at).format('YYYY-MM-DD HH:mm:ss')
                      : '--'}
                  </Descriptions.Item>
                  {currentWarning.resolution_note && (
                    <Descriptions.Item label="解除说明">
                      {currentWarning.resolution_note}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            )}

            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="创建时间">
                {dayjs(currentWarning.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {currentWarning.status === 'active' && (
              <div style={{ marginTop: 24 }}>
                <Button type="primary" block icon={<CheckCircleOutlined />} onClick={handleResolve}>
                  解除告警
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="解除告警"
        open={resolveModal.visible}
        onOk={handleResolveSubmit}
        onCancel={() => setResolveModal({ visible: false, warning: null })}
        okText="确认解除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要解除告警「<strong>{resolveModal.warning?.location_name}</strong>」吗？
        </p>
        <p style={{ color: '#faad14' }}>
          注意：请确认积水已完全消退后再解除告警。积水解除前不能关闭道路告警！
        </p>
        <Form form={resolveForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="解除说明" name="resolution_note">
            <TextArea rows={3} placeholder="请输入解除说明（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FloodWarningList
