import { useState, useRef, useEffect } from 'react'
import {
  Card, Form, Input, Select, Button, Upload, message, Space,
  List, Tag, Modal, Avatar,
} from 'antd'
import {
  CameraOutlined, EnvironmentOutlined, UploadOutlined,
  WarningOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { patrolRecordApi, floodWarningApi, uploadApi } from '@/services/api'
import type { PatrolRecord, FloodWarning } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const PatrolPanel = () => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [myRecords, setMyRecords] = useState<PatrolRecord[]>([])
  const [activeWarnings, setActiveWarnings] = useState<FloodWarning[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [warningDetail, setWarningDetail] = useState<FloodWarning | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadMyRecords = async () => {
    try {
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : 1
      const records = await patrolRecordApi.list({ patrol_user_id: userId })
      setMyRecords(records)
    } catch (error) {
      console.error('加载巡查记录失败', error)
    }
  }

  const loadActiveWarnings = async () => {
    try {
      const warnings = await floodWarningApi.list({ status: 'active' })
      setActiveWarnings(warnings)
    } catch (error) {
      console.error('加载告警失败', error)
    }
  }

  useEffect(() => {
    loadMyRecords()
    loadActiveWarnings()
  }, [])

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件！')
      return Upload.LIST_IGNORE
    }
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('图片不能超过 10MB！')
      return Upload.LIST_IGNORE
    }
    return false
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      let photoUrl = ''
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const uploadResult = await uploadApi.uploadFloodPhoto(fileList[0].originFileObj)
        photoUrl = uploadResult.file_url
      }

      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : 1

      const randomLat = 39.9087 + (Math.random() - 0.5) * 0.1
      const randomLng = 116.4074 + (Math.random() - 0.5) * 0.1

      await patrolRecordApi.create({
        patrol_user_id: userId,
        location_name: values.location_name,
        latitude: values.latitude || randomLat,
        longitude: values.longitude || randomLng,
        water_depth: values.water_depth,
        description: values.description,
        photo_url: photoUrl,
      })

      message.success('巡查记录已提交')
      form.resetFields()
      setFileList([])
      loadMyRecords()
    } catch (error) {
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReportWarning = async (recordId: number) => {
    try {
      const result = await patrolRecordApi.reportWarning(recordId)
      message.success('告警已上报')
      loadMyRecords()
      loadActiveWarnings()
    } catch (error) {
      message.error('上报失败')
    }
  }

  const viewWarningDetail = (warning: FloodWarning) => {
    setWarningDetail(warning)
    setDetailVisible(true)
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
    in_progress: 'blue',
    completed: 'green',
    reported: 'orange',
  }

  const statusTextMap: Record<string, string> = {
    in_progress: '巡查中',
    completed: '已完成',
    reported: '已告警',
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <Card title="上报巡查记录" extra={<CameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />}>
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
                  style={{ flex: 1 }}
                >
                  <Input type="number" placeholder="自动获取" />
                </Form.Item>
                <Form.Item
                  label="经度"
                  name="longitude"
                  style={{ flex: 1 }}
                >
                  <Input type="number" placeholder="自动获取" />
                </Form.Item>
              </div>

              <Form.Item
                label="积水深度 (cm)"
                name="water_depth"
              >
                <Input type="number" placeholder="请输入积水深度（可选）" />
              </Form.Item>

              <Form.Item label="情况描述" name="description">
                <TextArea rows={4} placeholder="请描述积水情况" />
              </Form.Item>

              <Form.Item label="现场照片">
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleUploadChange}
                  beforeUpload={beforeUpload}
                  maxCount={1}
                  accept="image/*"
                >
                  {fileList.length >= 1 ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传照片</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CameraOutlined />}
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  提交巡查记录
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="我的巡查记录" style={{ marginTop: 24 }}>
            <List
              dataSource={myRecords}
              renderItem={item => (
                <List.Item
                  key={item.id}
                  actions={[
                    !item.warning_id && (
                      <Button
                        type="link"
                        size="small"
                        icon={<WarningOutlined />}
                        danger
                        onClick={() => handleReportWarning(item.id)}
                      >
                        上报告警
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<EnvironmentOutlined />} />}
                    title={
                      <Space>
                        <span>{item.location_name}</span>
                        <Tag color={statusColorMap[item.status]}>
                          {statusTextMap[item.status]}
                        </Tag>
                        {item.water_depth !== undefined && (
                          <Tag color="blue">{item.water_depth} cm</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <div>{item.description || '暂无描述'}</div>
                        <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                          {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    }
                  />
                  {item.photo_url && (
                    <img
                      src={item.photo_url}
                      alt="现场照片"
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                </List.Item>
              )}
            />
          </Card>
        </div>

        <div style={{ width: 360 }}>
          <Card title="活动积水告警" extra={<Tag color="red">{activeWarnings.length}</Tag>}>
            <List
              dataSource={activeWarnings}
              renderItem={item => (
                <List.Item onClick={() => viewWarningDetail(item)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />}
                    title={
                      <Space>
                        <span>{item.location_name}</span>
                        <Tag color={levelColorMap[item.level]}>
                          {levelTextMap[item.level]}
                        </Tag>
                      </Space>
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
          </Card>

          <Card title="巡查须知" style={{ marginTop: 24 }}>
            <div style={{ color: '#666', lineHeight: 1.8 }}>
              <p><CheckCircleOutlined style={{ color: '#52c41a' }} /> 发现积水立即上报</p>
              <p><CheckCircleOutlined style={{ color: '#52c41a' }} /> 拍照记录积水深度</p>
              <p><CheckCircleOutlined style={{ color: '#52c41a' }} /> 严重积水请升级为告警</p>
              <p><CheckCircleOutlined style={{ color: '#52c41a' }} /> 积水解除后及时反馈</p>
              <p style={{ color: '#ff4d4f' }}>
                <WarningOutlined /> 注意：积水未解除前不能关闭道路告警
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        title="告警详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={500}
      >
        {warningDetail && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color={levelColorMap[warningDetail.level]}>
                {levelTextMap[warningDetail.level]}
              </Tag>
              <Tag color="red">活动中</Tag>
            </Space>

            <h3>{warningDetail.location_name}</h3>

            <div style={{ marginBottom: 12 }}>
              <strong>积水深度：</strong>
              {warningDetail.water_depth ? `${warningDetail.water_depth} cm` : '--'}
            </div>

            {warningDetail.description && (
              <div style={{ marginBottom: 12 }}>
                <strong>情况描述：</strong>
                {warningDetail.description}
              </div>
            )}

            {warningDetail.photo_url && (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={warningDetail.photo_url}
                  alt="现场照片"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </div>
            )}

            <div style={{ color: '#999', fontSize: 12 }}>
              上报人：{warningDetail.reported_by || '--'}
              <br />
              上报时间：{dayjs(warningDetail.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PatrolPanel
