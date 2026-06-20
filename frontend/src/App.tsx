import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import MapDashboard from '@/pages/MapDashboard'
import StrategyManagement from '@/pages/StrategyManagement'
import OperatorPanel from '@/pages/OperatorPanel'
import PatrolPanel from '@/pages/PatrolPanel'
import WorkOrderManagement from '@/pages/WorkOrderManagement'
import FloodWarningList from '@/pages/FloodWarningList'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<MapDashboard />} />
            <Route path="strategies" element={<StrategyManagement />} />
            <Route path="operator" element={<OperatorPanel />} />
            <Route path="patrol" element={<PatrolPanel />} />
            <Route path="work-orders" element={<WorkOrderManagement />} />
            <Route path="warnings" element={<FloodWarningList />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
