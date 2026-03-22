import { useState } from 'react'
import './Login.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      onLogin(data.user, data.token)
    } catch (err) {
      setError('Cannot connect to server. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`,
            '--delay': `${Math.random() * 5}s`,
            '--size': `${Math.random() * 4 + 2}px`
          }} />
        ))}
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">💞</div>
          <h1>Just Us</h1>
          <p>Your private space, together.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your name..."
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Secret key..."
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>Enter our space →</>
            )}
          </button>
        </form>

        <p className="login-note">🔒 End-to-end private. Only two of you.</p>
      </div>
    </div>
  )
}
