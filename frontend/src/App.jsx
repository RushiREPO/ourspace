import { useState, useEffect } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('couple_chat_token')
    const savedUser = localStorage.getItem('couple_chat_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('couple_chat_token', authToken)
    localStorage.setItem('couple_chat_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('couple_chat_token')
    localStorage.removeItem('couple_chat_user')
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-heart">💞</div>
      </div>
    )
  }

  return (
    <div className="app">
      {user && token ? (
        <Chat user={user} token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}
