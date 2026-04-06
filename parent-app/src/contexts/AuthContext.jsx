import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [school, setSchool] = useState(null)
  const [children_, setChildren] = useState([])
  const [loading, setLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('sk_parent_token')
    const savedUser = localStorage.getItem('sk_parent_user')

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
        fetchDashboard()
      } catch {
        logout()
      }
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchDashboard() {
    try {
      const { data } = await api.get('/parent-data/dashboard')
      setSchool(data.school)
      setChildren(data.learners || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data } = await api.post('/parent-auth/login', { email, password })
    localStorage.setItem('sk_parent_token', data.token)
    localStorage.setItem('sk_parent_user', JSON.stringify(data.user))
    setUser(data.user)
    await fetchDashboard()
    return data
  }

  function logout() {
    localStorage.removeItem('sk_parent_token')
    localStorage.removeItem('sk_parent_user')
    setUser(null)
    setSchool(null)
    setChildren([])
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, school, children: children_, loading, login, logout, refreshDashboard: fetchDashboard }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
