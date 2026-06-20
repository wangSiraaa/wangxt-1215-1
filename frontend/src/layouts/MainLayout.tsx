import { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  ToolOutlined,
  WarningOutlined,
  UserOutlined,
  LogoutOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import type { User } from '@/types'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const MainLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    } else {
      navigate('/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const getMenuItems = () => {
    const role = user?.role
    const items = []

    items.push({
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '调度大屏',
    })

    if (role === 'commander') {
      items.push({
        key: '/strategies',
        icon: <FileTextOutlined />,
        label: '策略管理',
      })
      items.push({
        key: '/work-orders',
        icon: <ToolOutlined />,
        label: '工单管理',
      })
      items.push({
        key: '/warnings',
        icon: <WarningOutlined />,
        label: '积水告警',
      })
    }

    if (role === 'operator') {
      items.push({
        key: '/operator',
        icon: <ThunderboltOutlined />,
        label: '设备操作',
      })
      items.push({
        key: '/work-orders',
        icon: <ToolOutlined />,
        label: '工单管理',
      })
    }

    if (role === 'patrol') {
      items.push({
        key: '/patrol',
        icon: <CameraOutlined />,
        label: '巡查上报',
      })
      items.push({
        key: '/warnings',
        icon: <WarningOutlined />,
        label: '积水告警',
      })
    }

    return items
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const roleTextMap: Record<string, string> = {
    commander: '指挥员',
    operator: '值守员',
    patrol: '巡查员',
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThunderboltOutlined style={{ color: '#fff', fontSize: 24 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            城市内涝泵站调度系统
          </Title>
        </div>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer', color: '#fff' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.full_name}</span>
            <span style={{ opacity: 0.7 }}>({roleTextMap[user?.role || '']})</span>
          </Space>
        </Dropdown>
      </Header>

      <Layout>
        <Sider
          width={200}
          theme="dark"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[location.pathname]}
            items={getMenuItems()}
            onClick={({ key }) => navigate(key as string)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>

        <Layout style={{ background: '#f0f2f5' }}>
          <Content
            style={{
              margin: 0,
              minHeight: 280,
              overflow: 'auto',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default MainLayout
