import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, Tag, Badge, Statistic, Row, Col, List, Typography } from 'antd'
import { ThunderboltOutlined, WarningOutlined, SafetyOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { pumpStationApi, pumpApi, floodWarningApi, sensorApi } from '@/services/api'
import type { PumpStation, Pump, FloodWarning, Sensor } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const createCustomIcon = (color: string, icon: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px;
      height: 36px;
      background: ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">${icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

const stationIconMap = {
  normal: createCustomIcon('#52c41a', '⚡'),
  warning: createCustomIcon('#faad14', '⚠'),
  fault: createCustomIcon('#ff4d4f', '✕'),
  offline: createCustomIcon('#8c8c8c', '○'),
}

const warningIconMap = {
  light: createCustomIcon('#faad14', '💧'),
  moderate: createCustomIcon('#fa8c16', '🌊'),
  severe: createCustomIcon('#f5222d', '🌊'),
  extreme: createCustomIcon('#722ed1', '🌪'),
}

const statusColorMap: Record<string, string> = {
  normal: 'green',
  warning: 'orange',
  fault: 'red',
  offline: 'default',
  running: 'green',
  stopped: 'default',
  active: 'red',
  resolved: 'green',
  online: 'green',
  offline: 'default',
}

const MapDashboard = () => {
  const [stations, setStations] = useState<PumpStation[]>([])
  const [pumps, setPumps] = useState<Pump[]>([])
  const [warnings, setWarnings] = useState<FloodWarning[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [stats, setStats] = useState({
    stationCount: 0,
    runningPumps: 0,
    activeWarnings: 0,
    onlineSensors: 0,
  })

  const center: [number, number] = [39.9087, 116.4074]

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [stationsData, pumpsData, warningsData, sensorsData] = await Promise.all([
        pumpStationApi.list(),
        pumpApi.list(),
        floodWarningApi.list({ status: 'active' }),
        sensorApi.list(),
      ])

      setStations(stationsData)
      setPumps(pumpsData)
      setWarnings(warningsData)
      setSensors(sensorsData)

      const runningPumps = pumpsData.filter(p => p.status === 'running').length
      const activeWarnings = warningsData.filter(w => w.status === 'active').length
      const onlineSensors = sensorsData.filter(s => s.status === 'online').length

      setStats({
        stationCount: stationsData.length,
        runningPumps,
        activeWarnings,
        onlineSensors,
      })
    } catch (error) {
      console.error('加载数据失败', error)
    }
  }

  const getStationPumps = (stationId: number) => {
    return pumps.filter(p => p.station_id === stationId)
  }

  const getStationSensors = (stationId: number) => {
    return sensors.filter(s => s.station_id === stationId)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {stations.map(station => (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={stationIconMap[station.status as keyof typeof stationIconMap]}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <Title level={5} style={{ margin: '0 0 8px 0' }}>{station.name}</Title>
                  <Text type="secondary">编码：{station.code}</Text>
                  <br />
                  <Tag color={statusColorMap[station.status]}>
                    {station.status === 'normal' ? '正常' :
                     station.status === 'warning' ? '预警' :
                     station.status === 'fault' ? '故障' : '离线'}
                  </Tag>
                  <div style={{ marginTop: 8 }}>
                    <Text strong>水泵状态：</Text>
                    {getStationPumps(station.id).map(pump => (
                      <Tag key={pump.id} color={pump.status === 'running' ? 'green' : 'default'}>
                        {pump.name}: {pump.status === 'running' ? '运行' : '停机'}
                      </Tag>
                    ))}
                  </div>
                  {station.address && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">{station.address}</Text>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {warnings.map(warning => (
            <div key={warning.id}>
              <Marker
                position={[warning.latitude, warning.longitude]}
                icon={warningIconMap[warning.level as keyof typeof warningIconMap]}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <Title level={5} style={{ margin: '0 0 8px 0' }}>{warning.location_name}</Title>
                    <Tag color="red">积水告警</Tag>
                    <Tag color={warning.level === 'light' ? 'orange' :
                               warning.level === 'moderate' ? 'orange' :
                               warning.level === 'severe' ? 'red' : 'purple'}>
                      {warning.level === 'light' ? '轻度' :
                       warning.level === 'moderate' ? '中度' :
                       warning.level === 'severe' ? '严重' : '极端'}
                    </Tag>
                    {warning.water_depth !== undefined && (
                      <div style={{ marginTop: 8 }}>
                        <Text>积水深度：{warning.water_depth} cm</Text>
                      </div>
                    )}
                    {warning.description && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">{warning.description}</Text>
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                      上报时间：{dayjs(warning.created_at).format('YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[warning.latitude, warning.longitude]}
                radius={100}
                pathOptions={{
                  color: warning.level === 'extreme' ? '#722ed1' :
                         warning.level === 'severe' ? '#f5222d' : '#fa8c16',
                  fillColor: warning.level === 'extreme' ? '#722ed1' :
                             warning.level === 'severe' ? '#f5222d' : '#fa8c16',
                  fillOpacity: 0.2,
                }}
              />
            </div>
          ))}
        </MapContainer>

        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
        }}>
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <Statistic
                  title="泵站总数"
                  value={stats.stationCount}
                  prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <Statistic
                  title="运行水泵"
                  value={stats.runningPumps}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<SafetyOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <Statistic
                  title="活动告警"
                  value={stats.activeWarnings}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <Statistic
                  title="在线传感器"
                  value={stats.onlineSensors}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<EnvironmentOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      <div style={{ width: 360, background: '#fff', borderLeft: '1px solid #e8e8e8', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8' }}>
          <Title level={5} style={{ margin: 0 }}>实时告警</Title>
        </div>
        <List
          dataSource={warnings.slice(0, 10)}
          renderItem={item => (
            <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <List.Item.Meta
                avatar={<Badge status="error" />}
                title={
                  <div>
                    <span>{item.location_name}</span>
                    <Tag
                      style={{ marginLeft: 8 }}
                      color={item.level === 'light' ? 'orange' :
                             item.level === 'moderate' ? 'orange' :
                             item.level === 'severe' ? 'red' : 'purple'}
                    >
                      {item.level === 'light' ? '轻度' :
                       item.level === 'moderate' ? '中度' :
                       item.level === 'severe' ? '严重' : '极端'}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <div>积水深度：{item.water_depth || '--'} cm</div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {dayjs(item.created_at).format('HH:mm')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />

        <div style={{ padding: 16, borderBottom: '1px solid #e8e8e8', borderTop: '1px solid #e8e8e8', marginTop: 16 }}>
          <Title level={5} style={{ margin: 0 }}>泵站状态</Title>
        </div>
        <List
          dataSource={stations}
          renderItem={item => (
            <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <List.Item.Meta
                title={
                  <div>
                    {item.name}
                    <Tag style={{ marginLeft: 8 }} color={statusColorMap[item.status]}>
                      {item.status === 'normal' ? '正常' :
                       item.status === 'warning' ? '预警' :
                       item.status === 'fault' ? '故障' : '离线'}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    {getStationPumps(item.id).filter(p => p.status === 'running').length} 台运行 / {getStationPumps(item.id).length} 台总数
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  )
}

export default MapDashboard
