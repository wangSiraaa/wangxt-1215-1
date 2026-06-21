export interface User {
  id: number
  username: string
  full_name: string
  role: 'commander' | 'operator' | 'patrol'
  phone?: string
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface PumpStation {
  id: number
  code: string
  name: string
  address?: string
  latitude: number
  longitude: number
  design_capacity?: number
  status: 'normal' | 'warning' | 'fault' | 'offline'
  description?: string
  created_at: string
  updated_at?: string
}

export interface Pump {
  id: number
  station_id: number
  code: string
  name: string
  rated_power?: number
  rated_current?: number
  rated_flow?: number
  status: 'stopped' | 'running' | 'fault' | 'maintenance'
  current_current?: number
  last_start_time?: string
  last_stop_time?: string
  description?: string
  created_at: string
  updated_at?: string
}

export interface Sensor {
  id: number
  station_id?: number
  code: string
  name: string
  sensor_type: 'water_level' | 'rainfall' | 'current' | 'flow'
  latitude?: number
  longitude?: number
  status: 'online' | 'offline' | 'fault'
  unit?: string
  warning_threshold?: number
  critical_threshold?: number
  last_report_time?: string
  last_value?: number
  description?: string
  created_at: string
}

export interface SensorData {
  id: number
  sensor_id: number
  value: number
  timestamp: string
  received_at: string
}

export interface DrainStrategy {
  id: number
  station_id: number
  creator_id?: number
  title: string
  level: 'level_4' | 'level_3' | 'level_2' | 'level_1'
  status: 'draft' | 'published' | 'executing' | 'completed' | 'cancelled'
  trigger_rainfall?: number
  trigger_water_level?: number
  target_water_level?: number
  pump_config?: string
  description?: string
  auto_execute: boolean
  published_at?: string
  executed_at?: string
  completed_at?: string
  created_at: string
  updated_at?: string
  related_work_orders?: StrategyWorkOrderBrief[]
}

export interface WorkOrder {
  id: number
  order_no: string
  order_type: 'repair' | 'maintenance' | 'inspection' | 'emergency'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description?: string
  station_id?: number
  pump_id?: number
  assigned_user_id?: number
  assigned_user_name?: string
  reported_by?: string
  fault_description?: string
  resolution?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at?: string
}

export interface StrategyWorkOrderBrief {
  id: number
  order_no: string
  title: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_user_id?: number
  assigned_user_name?: string
  created_at: string
}

export interface FloodWarning {
  id: number
  warning_no: string
  location_name: string
  latitude: number
  longitude: number
  level: 'light' | 'moderate' | 'severe' | 'extreme'
  status: 'active' | 'resolved' | 'false_alarm'
  water_depth?: number
  road_type?: string
  description?: string
  reported_by?: string
  source?: string
  photo_url?: string
  resolved_at?: string
  resolved_by?: string
  resolution_note?: string
  created_at: string
  updated_at?: string
}

export interface PatrolRecord {
  id: number
  patrol_user_id: number
  warning_id?: number
  location_name: string
  latitude: number
  longitude: number
  status: 'in_progress' | 'completed' | 'reported'
  water_depth?: number
  description?: string
  photo_url?: string
  created_at: string
  updated_at?: string
}
