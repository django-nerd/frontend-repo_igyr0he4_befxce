import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const navigate = useNavigate()
  useEffect(() => {
    // Default route goes to login
    if (location.pathname === '/') navigate('/login', { replace: true })
  }, [])
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
