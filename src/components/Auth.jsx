import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMsg(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) setError(error.message)
    else setMsg('Check your email for the login link!')
    setLoading(false)
  }

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-form glass-panel">
        <h2>Welcome to GemLang</h2>
        <p>Sign in or create an account to save your progress.</p>
        
        {error && <div className="auth-error">{error}</div>}
        {msg && <div className="auth-msg">{msg}</div>}

        <input
          className="auth-input"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        
        <div className="auth-button-group">
          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleSignUp}
            disabled={loading || !email || !password}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
