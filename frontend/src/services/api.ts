import axios from 'axios'
import type {
  User, LoginResponse,
  PumpStation, Pump,
  Sensor, SensorData,
  DrainStrategy,
  WorkOrder,
  FloodWarning,
  PatrolRecord,
} from '@/types'

const API_BASE = '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { username, password }),
  register: (data: any): Promise<User> =>
    api.post('/auth/register', data),
}

export const pumpStationApi = {
  list: (params?: any): Promise<PumpStation[]> =>
    api.get('/pump-stations', { params }),
  get: (id: number): Promise<PumpStation> =>
    api.get(`/pump-stations/${id}`),
  create: (data: any): Promise<PumpStation> =>
    api.post('/pump-stations', data),
  update: (id: number, data: any): Promise<PumpStation> =>
    api.put(`/pump-stations/${id}`, data),
  delete: (id: number): Promise<void> =>
    api.delete(`/pump-stations/${id}`),
}

export const pumpApi = {
  list: (params?: any): Promise<Pump[]> =>
    api.get('/pumps', { params }),
  get: (id: number): Promise<Pump> =>
    api.get(`/pumps/${id}`),
  create: (data: any): Promise<Pump> =>
    api.post('/pumps', data),
  update: (id: number, data: any): Promise<Pump> =>
    api.put(`/pumps/${id}`, data),
  control: (id: number, action: string, remark?: string, operatorId?: number): Promise<Pump> =>
    api.post(`/pumps/${id}/control`, { action, remark }, { params: { operator_id: operatorId } }),
  updateCurrent: (id: number, current: number): Promise<any> =>
    api.post(`/pumps/${id}/current`, null, { params: { current_value: current } }),
  delete: (id: number): Promise<void> =>
    api.delete(`/pumps/${id}`),
}

export const sensorApi = {
  list: (params?: any): Promise<Sensor[]> =>
    api.get('/sensors', { params }),
  get: (id: number): Promise<Sensor> =>
    api.get(`/sensors/${id}`),
  create: (data: any): Promise<Sensor> =>
    api.post('/sensors', data),
  update: (id: number, data: any): Promise<Sensor> =>
    api.put(`/sensors/${id}`, data),
  delete: (id: number): Promise<void> =>
    api.delete(`/sensors/${id}`),
  reportData: (sensorCode: string, value: number, timestamp?: string): Promise<any> =>
    api.post('/sensors/data', { sensor_code: sensorCode, value, timestamp }),
  getData: (id: number, params?: any): Promise<SensorData[]> =>
    api.get(`/sensors/data/${id}`, { params }),
  getQueueSize: (): Promise<{ queue_size: number }> =>
    api.get('/sensors/queue/size'),
  processQueue: (batchSize?: number): Promise<any> =>
    api.post('/sensors/queue/process', null, { params: { batch_size: batchSize } }),
}

export const strategyApi = {
  list: (params?: any): Promise<DrainStrategy[]> =>
    api.get('/strategies', { params }),
  get: (id: number): Promise<DrainStrategy> =>
    api.get(`/strategies/${id}`),
  create: (data: any): Promise<DrainStrategy> =>
    api.post('/strategies', data),
  update: (id: number, data: any): Promise<DrainStrategy> =>
    api.put(`/strategies/${id}`, data),
  publish: (id: number): Promise<DrainStrategy> =>
    api.post(`/strategies/${id}/publish`),
  execute: (id: number, operatorId: number): Promise<DrainStrategy> =>
    api.post(`/strategies/${id}/execute`, { operator_id: operatorId }),
  stop: (id: number, operatorId: number): Promise<DrainStrategy> =>
    api.post(`/strategies/${id}/stop`, { operator_id: operatorId }),
  checkExecutable: (id: number): Promise<any> =>
    api.get(`/strategies/${id}/check-executable`),
  delete: (id: number): Promise<void> =>
    api.delete(`/strategies/${id}`),
}

export const workOrderApi = {
  list: (params?: any): Promise<WorkOrder[]> =>
    api.get('/work-orders', { params }),
  get: (id: number): Promise<WorkOrder> =>
    api.get(`/work-orders/${id}`),
  create: (data: any): Promise<WorkOrder> =>
    api.post('/work-orders', data),
  update: (id: number, data: any): Promise<WorkOrder> =>
    api.put(`/work-orders/${id}`, data),
  assign: (id: number, userId: number): Promise<WorkOrder> =>
    api.post(`/work-orders/${id}/assign`, null, { params: { user_id: userId } }),
  delete: (id: number): Promise<void> =>
    api.delete(`/work-orders/${id}`),
}

export const floodWarningApi = {
  list: (params?: any): Promise<FloodWarning[]> =>
    api.get('/flood-warnings', { params }),
  get: (id: number): Promise<FloodWarning> =>
    api.get(`/flood-warnings/${id}`),
  create: (data: any): Promise<FloodWarning> =>
    api.post('/flood-warnings', data),
  update: (id: number, data: any): Promise<FloodWarning> =>
    api.put(`/flood-warnings/${id}`, data),
  resolve: (id: number, resolvedBy: string, resolutionNote?: string): Promise<FloodWarning> =>
    api.post(`/flood-warnings/${id}/resolve`, { resolved_by: resolvedBy, resolution_note: resolutionNote }),
  delete: (id: number): Promise<void> =>
    api.delete(`/flood-warnings/${id}`),
}

export const patrolRecordApi = {
  list: (params?: any): Promise<PatrolRecord[]> =>
    api.get('/patrol-records', { params }),
  get: (id: number): Promise<PatrolRecord> =>
    api.get(`/patrol-records/${id}`),
  create: (data: any): Promise<PatrolRecord> =>
    api.post('/patrol-records', data),
  update: (id: number, data: any): Promise<PatrolRecord> =>
    api.put(`/patrol-records/${id}`, data),
  reportWarning: (id: number): Promise<any> =>
    api.post(`/patrol-records/${id}/report-warning`),
  delete: (id: number): Promise<void> =>
    api.delete(`/patrol-records/${id}`),
}

export const uploadApi = {
  uploadFloodPhoto: (file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/uploads/flood-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api
