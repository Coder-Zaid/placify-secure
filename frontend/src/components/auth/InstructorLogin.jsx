import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'

// Default fallback passkey if not configured in .env
const VALID_PASSKEY = import.meta.env.VITE_INSTRUCTOR_PASSKEY || 'admin123';

export default function InstructorLogin() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Where to send user after login (defaults to /assessments)
  const from = location.state?.from?.pathname || '/assessments'

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    setTimeout(() => {
      if (password.trim() === VALID_PASSKEY) {
        // Store authenticated state
        sessionStorage.setItem('placify_instructor_auth', 'true')
        localStorage.setItem('placify_instructor_auth', 'true')
        navigate(from, { replace: true })
      } else {
        setError('Incorrect Instructor Passkey. Please try again.')
        setIsLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-between p-6">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0F0F11] text-white flex items-center justify-center font-bold text-base shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#0F0F11]">PLACIFY</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                PROCTOR
              </span>
            </div>
            <div className="text-[10px] text-[#6F6F75]">Secure Instructor Management</div>
          </div>
        </Link>

        <Link
          to="/"
          className="text-xs font-mono text-[#6F6F75] hover:text-[#0F0F11] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Student Portal</span>
        </Link>
      </header>

      {/* Login Card */}
      <main className="max-w-md mx-auto w-full q-card p-8 sm:p-10 space-y-6 shadow-sm border border-[#0F0F11]/5 bg-white rounded-3xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0F0F11] text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6 stroke-[2] text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F0F11] tracking-tight">Instructor Access</h1>
          <p className="text-xs text-[#6F6F75] leading-relaxed">
            Enter the authorized instructor passkey to manage assessments, review analytics, and monitor live exam sessions.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
              Instructor Passkey
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter admin password..."
                className="input-field pr-11 py-3 text-sm font-mono tracking-wider w-full"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A8AE] hover:text-[#0F0F11] transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <span className="font-mono text-xs">Authenticating...</span>
            ) : (
              <>
                <span>Unlock Control Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[#0F0F11]/5 text-center">
          <p className="text-[11px] text-[#A8A8AE]">
            Protected Area • Unauthorized student attempts are monitored
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center">
        <p className="text-[11px] text-[#A8A8AE] font-mono">
          Placify Secure Assessment Control • Session Encrypted
        </p>
      </footer>
    </div>
  )
}
