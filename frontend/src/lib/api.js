import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sk_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sk_token')
      localStorage.removeItem('sk_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Best-effort error message extraction for axios errors.
// Falls back through: backend JSON .error → backend JSON .message → axios err.message → fallback.
// Use in catch blocks: toast.error(errMessage(err, 'Could not save'))
export function errMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error
      || err?.response?.data?.message
      || err?.message
      || fallback
}
