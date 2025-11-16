import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { metaGet, metaSet } from './storage'
import { useSecurityGuards } from './security'
import Spline from '@splinetool/react-spline'

const ADMIN_USERNAME = 'dakshPRTF'
const ADMIN_PASSWORD = '200307@port'
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [warning, setWarning] = useState('')

  useSecurityGuards({ onDevtoolsDetected: () => setWarning('Developer tools are disabled for security.') })

  // Load attempts state from IndexedDB
  useEffect(() => {
    (async () => {
      const attempts = await metaGet('login_attempts')
      const locked = await metaGet('login_locked_until')
      setAttemptsLeft(attempts != null ? attempts : MAX_ATTEMPTS)
      setLockedUntil(locked)
    })()
  }, [])

  const isLocked = useMemo(() => {
    if (!lockedUntil) return false
    const now = Date.now()
    const until = new Date(lockedUntil).getTime()
    return now < until
  }, [lockedUntil])

  const lockTimeLeft = useMemo(() => {
    if (!isLocked) return 0
    return Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000)
  }, [isLocked, lockedUntil])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (isLocked) return

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await metaSet('login_attempts', MAX_ATTEMPTS)
      await metaSet('login_locked_until', null)
      await metaSet('session_role', 'admin')
      navigate('/dashboard')
      return
    }

    // wrong attempt
    const remaining = attemptsLeft - 1
    setAttemptsLeft(remaining)
    await metaSet('login_attempts', remaining)

    if (remaining <= 0) {
      const until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      setLockedUntil(until)
      await metaSet('login_locked_until', until)
    }
  }

  const continueViewer = async () => {
    await metaSet('session_role', 'viewer')
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/vi0ijCQQJTRFc8LA/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/70 to-black/80 pointer-events-none" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Crypto Trading Portfolio</h1>
            <p className="text-white/70">Secure access to manage and view trades</p>
          </div>

          {warning && (
            <div className="text-amber-400 text-sm text-center">{warning}</div>
          )}

          {isLocked ? (
            <div className="text-center text-red-400">
              Login locked. Try again in {Math.ceil(lockTimeLeft / 60)} minutes.
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Attempts left: {attemptsLeft}</span>
                <span>Max {MAX_ATTEMPTS}</span>
              </div>
              <button type="submit" className="w-full py-2 rounded bg-emerald-500 hover:bg-emerald-600 transition">Login</button>
            </form>
          )}

          <div className="flex items-center gap-3">
            <button onClick={continueViewer} className="w-full py-2 rounded bg-white/10 hover:bg-white/20 transition border border-white/10">Continue as Viewer</button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/60">
            <div className="backdrop-blur bg-white/5 rounded p-2">F12 Blocked</div>
            <div className="backdrop-blur bg-white/5 rounded p-2">Right-click Disabled</div>
            <div className="backdrop-blur bg-white/5 rounded p-2">Ctrl+Shift+I Blocked</div>
          </div>
        </div>
      </div>
    </div>
  )
}
