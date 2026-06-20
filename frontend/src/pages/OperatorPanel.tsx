import { useState, useEffect } from 'react'
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select,
  message, Drawer, Descriptions, Statistic, Row, Col, Progress,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, WarningOutlined,
  ThunderboltOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { pumpApi, pumpStationApi, sensorApi } from '@/services/api'
import type { Pump, PumpStation, Sensor } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const OperatorPanel = () => {
  const [pumps, setPumps] = useState<Pump[]>([])
  const [stations, setStations] = useState<PumpStation[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(false)
  const [controlModal, setControlModal] = useState<{
    visible: boolean
    pump: Pump | null
    action: string
  }>({ visible: false, pump: null, action: '' })
  const [form] = Form.useForm()
  const [selectedStation, setSelectedStation] = useState<number | undefined>()
  const [detailDrawer, setDetailDrawer] = useState<{
    visible: boolean
    pump: Pump | null
  }>({ visible: false, pump: null })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [selectedStation])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = selectedStation ? { station_id: selectedStation } : {}
      const [pumpsData, stationsData, sensorsData] = await Promise.all([
        pumpApi.list(params),
        pumpStationApi.list(),
        sensorApi.list(),
      ])
      setPumps(pumpsData)
      setStations(stationsData)
      setSensors(sensorsData)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const showControlModal = (pump: Pump, action: string) => {
    form.resetFields()
    setControlModal({ visible: true, pump, action })
  }

  const handleControl = async () => {
    if (!controlModal.pump) return

    try {
      const values = await form.validateFields()
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : undefined

      await pumpApi.control(
        controlModal.pump.id,
        controlModal.action,
        values.remark,
        userId
      )

      const actionText = controlModal.action === 'start' ? '启动' :
                         controlModal.action === 'stop' ? '停止' :
                         controlModal.action === 'report_fault' ? '报故障' : '故障恢复'

      message.success(`${actionText}成功`)
      setControlModal({ visible: false, pump: null, action: '' })
      loadData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    }
  }

  const showDetail = (pump: Pump) => {
    setDetailDrawer({ visible: true, pump })
  }

  const statusColorMap: Record<string, string> = {
    stopped: 'default',
    running: 'green',
    fault: 'red',
    maintenance: 'orange',
  }

  const statusTextMap: Record<string, string> = {
    stopped: '停机',
    running: '运行中',
    fault: '故障',
    maintenance: '维护中',
  }

  const runningCount = pumps.filter(p => p.status === 'running').length
  const faultCount = pumps.filter(p => p.status === 'fault').length

  const columns = [
    {
      title: '水泵编号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '水泵名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '所属泵站',
      dataIndex: 'station_id',
      key: 'station_id',
      render: (stationId: number) => {
        const station = stations.find(s => s.id === stationId)
        return station?.name || '--'
      },
      filters: stations.map(s => ({ text: s.name, value: s.id })),
      onFilter: (value: number, record: Pump) => record.station_id === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]} icon={status === 'running' ? <ThunderboltOutlined /> : undefined}>
          {statusTextMap[status]}
        </Tag>
      ),
    },
    {
      title: '当前电流',
      dataIndex: 'current_current',
      key: 'current_current',
      render: (current: number, record: Pump) => {
        if (current === undefined || current === null) return '--'
        const rated = record.rated_current || 100
        const percent = Math.min((current / rated) * 100, 100)
        const isAbnormal = record.rated_current && (current > record.rated_current * 1.2 || current < record.rated_current * 0.3)
        return (
          <div>
            <span style={{ color: isAbnormal ? '#ff4d4f' : 'inherit' }}>
              {current.toFixed(1)} A
            </span>
            <Progress
              percent={percent}
              size="small"
              status={isAbnormal ? 'exception' : 'active'}
              style={{ marginTop: 4, width: 100 }}
            />
          </div>
        )
      },
    },
    {
      title: '额定电流',
      dataIndex: 'rated_current',
      key: 'rated_current',
      render: (v: number) => v ? `${v} A` : '--',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Pump) => (
        <Space size="small">
          <Button type="link" size="small" icon={<InfoCircleOutlined />} onClick={() => showDetail(record)}>
            详情
          </Button>
          {record.status === 'stopped' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => showControlModal(record, 'start')}
            >
              启动
            </Button>
          )}
          {record.status === 'running' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => showControlModal(record, 'stop')}
            >
              停机
            </Button>
          )}
          {record.status !== 'fault' && record.status !== 'maintenance' && (
            <Button
              type="link"
              size="small"
              icon={<WarningOutlined />}
              onClick={() => showControlModal(record, 'report_fault')}
            >
              报故障
            </Button>
          )}
          {record.status === 'fault' && (
            <Button
              type="link"
              size="small"
              onClick={() => showControlModal(record, 'resolve_fault')}
            >
              故障恢复
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="水泵总数"
              value={pumps.length}
              prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={runningCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="故障"
              value={faultCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行率"
              value={pumps.length ? Math.round((runningCount / pumps.length) * 100) : 0}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="水泵设备管理"
        extra={
          <Select
            placeholder="选择泵站筛选"
            style={{ width: 200 }}
            allowClear
            value={selectedStation}
            onChange={setSelectedStation}
          >
            {stations.map(station => (
              <Option key={station.id} value={station.id}>
                {station.name}
              </Option>
            ))}
          </Select>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={pumps}
          loading={loading}
        />
      </Card>

      <Modal
        title={
          controlModal.action === 'start' ? '启动水泵' :
          controlModal.action === 'stop' ? '停止水泵' :
          controlModal.action === 'report_fault' ? '上报故障' : '故障恢复'
        }
        open={controlModal.visible}
        onOk={handleControl}
        onCancel={() => setControlModal({ visible: false, pump: null, action: '' })}
        okText="确认"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16 }}>
          确定要对 <strong>{controlModal.pump?.name}</strong> 执行
          <strong>
            {controlModal.action === 'start' ? '启动' :
             controlModal.action === 'stop' ? '停止' :
             controlModal.action === 'report_fault' ? '故障上报' : '故障恢复'}
          </strong>
          操作吗？
        </p>
        <Form form={form} layout="vertical">
          <Form.Item label="备注说明" name="remark">
            <TextArea rows={3} placeholder="请输入备注说明（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="水泵详情"
        width={500}
        open={detailDrawer.visible}
        onClose={() => setDetailDrawer({ visible: false, pump: null })}
      >
        {detailDrawer.pump && (
          <div>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="水泵编号">{detailDrawer.pump.code}</Descriptions.Item>
              <Descriptions.Item label="水泵名称">{detailDrawer.pump.name}</Descriptions.Item>
              <Descriptions.Item label="所属泵站">
                {stations.find(s => s.id === detailDrawer.pump!.station_id)?.name || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[detailDrawer.pump.status]}>
                  {statusTextMap[detailDrawer.pump.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="额定功率">
                {detailDrawer.pump.rated_power ? `${detailDrawer.pump.rated_power} kW` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="额定电流">
                {detailDrawer.pump.rated_current ? `${detailDrawer.pump.rated_current} A` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="额定流量">
                {detailDrawer.pump.rated_flow ? `${detailDrawer.pump.rated_flow} m³/s` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="当前电流">
                {detailDrawer.pump.current_current !== undefined && detailDrawer.pump.current_current !== null
                  ? `${detailDrawer.pump.current_current} A`
                  : '--'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>相关传感器</h4>
              {sensors
                .filter(s => s.station_id === detailDrawer.pump!.station_id)
                .map(sensor => (
                  <Card key={sensor.id} size="small" style={{ marginTop: 8 }}>
                    <Space>
                      <span>{sensor.name}</span>
                      <Tag color={sensor.status === 'online' ? 'green' : 'default'}>
                        {sensor.status === 'online' ? '在线' : '离线'}
                      </Tag>
                      <span>
                        当前值：{sensor.last_value !== undefined && sensor.last_value !== null
                          ? `${sensor.last_value} ${sensor.unit || ''}`
                          : '--'}
                      </span>
                    </Space>
                  </Card>
                ))}
            </div>

            {detailDrawer.pump.description && (
              <div style={{ marginTop: 24 }}>
                <h4>设备说明</h4>
                <p>{detailDrawer.pump.description}</p>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <h4>运行记录</h4>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="上次启动时间">
                  {detailDrawer.pump.last_start_time
                    ? dayjs(detailDrawer.pump.last_start_time).format('YYYY-MM-DD HH:mm:ss')
                    : '--'}
                </Descriptions.Item>
                <Descriptions.Item label="上次停机时间">
                  {detailDrawer.pump.last_stop_time
                    ? dayjs(detailDrawer.pump.last_stop_time).format('YYYY-MM-DD HH:mm:ss')
                    : '--'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default OperatorPanel
