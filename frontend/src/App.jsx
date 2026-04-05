import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Learners from './pages/Learners'
import Fees from './pages/Fees'
import Events from './pages/Events'
import Announcements from './pages/Announcements'
import Settings from './pages/Settings'
import ParentPortal from './pages/ParentPortal'
import LearnerProfile from './pages/LearnerProfile'
import Waivers from './pages/Waivers'
import MyClasses from './pages/MyClasses'
import ExamGrades from './pages/ExamGrades'
import Attendance from './pages/Attendance'
import SetPassword from './pages/SetPassword'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SuperAdmin from './pages/SuperAdmin'
import SuperAdminLogin from './pages/SuperAdminLogin'
import LandingPage from './pages/LandingPage'
import RequestDemo from './pages/RequestDemo'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>
  if (!user) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function HomeRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Super Admin (separate auth) */}
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />

          {/* Landing / Public */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/request-demo" element={<RequestDemo />} />
          <Route path="/parent/:token" element={<ParentPortal />} />
          <Route path="/set-password/:token" element={<SetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="learners"      element={<Learners />} />
            <Route path="learners/:id" element={<LearnerProfile />} />
            <Route path="waivers"      element={<Waivers />} />
            <Route path="my-classes"    element={<MyClasses />} />
            <Route path="exam-grades"   element={<ExamGrades />} />
            <Route path="attendance"    element={<Attendance />} />
            <Route path="fees"          element={<Fees />} />
            <Route path="events"        element={<Events />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
