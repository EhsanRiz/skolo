import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

const CSS = `
.demo-wrapper {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #003049 0%, #162d5a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
}

.demo-header {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  text-decoration: none;
  letter-spacing: -0.5px;
}

.demo-header:hover {
  opacity: 0.8;
}

.demo-dot {
  width: 8px;
  height: 8px;
  background: #003049;
  border-radius: 50%;
  display: inline-block;
}

.demo-card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: cardIn 0.4s ease-out;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.demo-heading {
  font-size: 28px;
  font-weight: 900;
  color: #1f2937;
  margin: 0 0 8px 0;
  letter-spacing: -0.6px;
}

.demo-subtext {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px 0;
  line-height: 1.5;
}

.demo-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-field {
  display: flex;
  flex-direction: column;
}

.demo-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.demo-label .required {
  color: #dc2626;
  margin-left: 2px;
}

.demo-input,
.demo-textarea,
.demo-select {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  background: #fff;
  color: #1f2937;
}

.demo-input:focus,
.demo-textarea:focus,
.demo-select:focus {
  border-color: #003049;
  box-shadow: 0 0 0 3px rgba(0, 48, 73, 0.12);
}

.demo-input::placeholder,
.demo-textarea::placeholder {
  color: #d1d5db;
}

.demo-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.demo-button {
  width: 100%;
  padding: 14px 24px;
  background: #003049;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.demo-button:hover:not(:disabled) {
  background: #1a3a52;
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 32, 68, 0.2);
}

.demo-button:active:not(:disabled) {
  transform: translateY(0);
}

.demo-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-footer {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 13px;
}

.demo-footer a {
  color: #003049;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}

.demo-footer a:hover {
  color: #00253a;
}

.demo-back-link {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.15s;
}

.demo-back-link:hover {
  color: #fff;
}

.demo-error {
  padding: 12px 14px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 13px;
  color: #991b1b;
  margin-bottom: 20px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.demo-success {
  text-align: center;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.demo-success-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.demo-success-title {
  font-size: 20px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 8px;
}

.demo-success-text {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 24px;
}

.demo-success-link {
  display: inline-block;
  padding: 12px 24px;
  background: #003049;
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s;
}

.demo-success-link:hover {
  background: #1a3a52;
  transform: translateY(-1px);
}
`

export default function RequestDemo() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    schoolName: '',
    country: 'South Africa',
    message: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required'
    if (!form.email.trim()) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email'
    if (!form.schoolName.trim()) return 'School name is required'
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await api.post('/demo-requests', {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || null,
        school_name: form.schoolName,
        country: form.country,
        message: form.message || null
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit demo request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="demo-wrapper">
        <Link to="/" className="demo-back-link">
          ← Back to homepage
        </Link>

        <Link to="/" className="demo-header">
          skolo<span className="demo-dot"></span>
        </Link>

        <div className="demo-card">
          {submitted ? (
            <div className="demo-success">
              <div className="demo-success-icon">✓</div>
              <div className="demo-success-title">Thank you!</div>
              <div className="demo-success-text">
                We'll be in touch within 24 hours. Check your email for updates.
              </div>
              <Link to="/" className="demo-success-link">
                Return to homepage
              </Link>
            </div>
          ) : (
            <>
              <h1 className="demo-heading">Request a Demo</h1>
              <p className="demo-subtext">
                See how Skolo can help your school
              </p>

              {error && <div className="demo-error">{error}</div>}

              <form onSubmit={handleSubmit} className="demo-form">
                <div className="demo-field">
                  <label className="demo-label">
                    Full name
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="demo-input"
                  />
                </div>

                <div className="demo-field">
                  <label className="demo-label">
                    Email
                    <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="demo-input"
                  />
                </div>

                <div className="demo-field">
                  <label className="demo-label">Phone number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+27 (optional)"
                    className="demo-input"
                  />
                </div>

                <div className="demo-field">
                  <label className="demo-label">
                    School name
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    value={form.schoolName}
                    onChange={handleChange}
                    placeholder="Your school name"
                    className="demo-input"
                  />
                </div>

                <div className="demo-field">
                  <label className="demo-label">Country</label>
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="demo-select"
                  >
                    <option value="Lesotho">Lesotho</option>
                    <option value="South Africa">South Africa</option>
                  </select>
                </div>

                <div className="demo-field">
                  <label className="demo-label">Message/notes</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us a bit about your school and what you're looking for..."
                    className="demo-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="demo-button"
                >
                  {loading ? 'Submitting...' : 'Request Demo'}
                </button>
              </form>

              <div className="demo-footer">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
