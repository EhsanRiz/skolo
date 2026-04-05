import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [school, setSchool]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sk_token')
    const saved = localStorage.getItem('sk_user')
    if (token && saved) {
      setUser(JSON.parse(saved))
      // Fetch school config
      api.get('/schools/me')
        .then(r => setSchool(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('sk_token', data.token)
    localStorage.setItem('sk_user', JSON.stringify(data.user))
    setUser(data.user)
    const schoolRes = await api.get('/schools/me')
    setSchool(schoolRes.data)
    return data
  }

  const refreshSchool = async () => {
    try {
      const r = await api.get('/schools/me')
      setSchool(r.data)
    } catch {}
  }

  const logout = () => {
    localStorage.removeItem('sk_token')
    localStorage.removeItem('sk_user')
    setUser(null)
    setSchool(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, school, loading, login, logout, refreshSchool }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
