import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Mail, User, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export default function InstructorLogin() {
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Register State
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  // Status & Feedback
  const [error, setError] = useState('')
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/assessments'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setPendingApprovalMsg('')
    setIsLoading(true)

    const cleanEmail = loginEmail.trim().toLowerCase()
    const cleanPassword = loginPassword.trim()

    // 1. Direct Master Admin check (instant access for admin)
    if ((cleanEmail === 'admin' || cleanEmail === 'admin@woxsen.edu.in') && (cleanPassword === 'admin123' || cleanPassword === 'admin')) {
      sessionStorage.setItem('placify_instructor_auth', 'true')
      localStorage.setItem('placify_instructor_auth', 'true')
      localStorage.setItem('placify_user_role', 'admin')
      localStorage.setItem('placify_user_name', 'System Administrator')
      localStorage.setItem('placify_user_email', 'admin@woxsen.edu.in')
      setIsLoading(false)
      navigate(from, { replace: true })
      return
    }

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: cleanEmail,
        password: cleanPassword
      })

      if (res.data.success) {
        sessionStorage.setItem('placify_instructor_auth', 'true')
        localStorage.setItem('placify_instructor_auth', 'true')
        localStorage.setItem('placify_user_role', res.data.role)
        localStorage.setItem('placify_user_name', res.data.name)
        localStorage.setItem('placify_user_email', res.data.email)
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err.response?.status === 403) {
        setPendingApprovalMsg(
          err.response?.data?.detail || 
          'Your Woxsen faculty account is pending Admin approval. The administrator must approve your account before you can create assessments.'
        )
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else if (!err.response) {
        setError(`Unable to connect to backend server (${API_BASE}). Please ensure the server is online.`)
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setPendingApprovalMsg('')

    const cleanEmail = regEmail.trim().toLowerCase()
    
    // Validate Woxsen Email Constraint
    if (!cleanEmail.includes('woxsen')) {
      setError("Registration restricted: Email must be an official Woxsen University email containing 'woxsen' (e.g. name@woxsen.edu.in).")
      return
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }

    setIsLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        name: regName.trim(),
        email: cleanEmail,
        password: regPassword.trim()
      })

      if (res.data.success) {
        setRegisteredSuccess(true)
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.response?.data?.detail || 'Failed to submit registration. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
                WOXSEN PORTAL
              </span>
            </div>
            <div className="text-[10px] text-[#6F6F75]">Faculty & Administrator Access</div>
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

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full q-card p-6 sm:p-8 space-y-6 shadow-sm border border-[#0F0F11]/5 bg-white rounded-3xl">
        
        {/* Navigation Tabs (Login vs Register) */}
        <div className="flex p-1 bg-[#F5F5F0] rounded-xl border border-[#0F0F11]/5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login')
              setError('')
              setPendingApprovalMsg('')
              setRegisteredSuccess(false)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'login'
                ? 'bg-white text-[#0F0F11] shadow-xs'
                : 'text-[#6F6F75] hover:text-[#0F0F11]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register')
              setError('')
              setPendingApprovalMsg('')
              setRegisteredSuccess(false)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-white text-[#0F0F11] shadow-xs'
                : 'text-[#6F6F75] hover:text-[#0F0F11]'
            }`}
          >
            Faculty Register
          </button>
        </div>

        {/* 1. SIGN IN TAB */}
        {activeTab === 'login' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0F0F11] text-white flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-5 h-5 stroke-[2] text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-[#0F0F11] tracking-tight">Faculty & Admin Sign In</h1>
              <p className="text-xs text-[#6F6F75] leading-relaxed">
                Log in with your authorized Woxsen email or Master Admin credentials.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                  Email or Admin Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="e.g. name@woxsen.edu.in or admin"
                    className="input-field pl-10 py-3 text-sm font-mono tracking-wide w-full"
                    autoFocus
                    required
                  />
                  <Mail className="w-4 h-4 text-[#A8A8AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Enter password..."
                    className="input-field pl-10 pr-11 py-3 text-sm font-mono tracking-wide w-full"
                    required
                  />
                  <Lock className="w-4 h-4 text-[#A8A8AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A8AE] hover:text-[#0F0F11] transition-colors p-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  <span className="font-bold">Error:</span> {error}
                </div>
              )}

              {/* Pending Approval Notice */}
              {pendingApprovalMsg && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <Clock className="w-4 h-4" />
                    <span>Account Pending Approval</span>
                  </div>
                  <p className="leading-relaxed">{pendingApprovalMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !loginEmail.trim() || !loginPassword.trim()}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <span className="font-mono text-xs">Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Control Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="bg-[#FAF7F0] p-2.5 rounded-xl border border-[#0F0F11]/5 text-[11px] font-mono text-[#6F6F75] space-y-0.5">
                <div><span className="font-bold text-[#0F0F11]">Admin:</span> admin / admin123</div>
                <div><span className="font-bold text-[#0F0F11]">Faculty:</span> Use approved @woxsen email</div>
              </div>
            </form>
          </div>
        )}

        {/* 2. FACULTY REGISTER TAB */}
        {activeTab === 'register' && (
          <div className="space-y-5">
            {registeredSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-[#0F0F11]">Registration Submitted!</h2>
                  <p className="text-xs text-[#6F6F75] leading-relaxed">
                    Your Woxsen faculty account has been registered. For security, all test authoring accounts require approval from the administrator.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-mono flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Status: Pending Admin Approval</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login')
                    setRegisteredSuccess(false)
                  }}
                  className="btn-primary w-full py-3 text-xs font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto shadow-xs">
                    <User className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h1 className="text-xl font-bold text-[#0F0F11] tracking-tight">Faculty Registration</h1>
                  <p className="text-xs text-[#6F6F75] leading-relaxed">
                    Register with your official Woxsen email to request exam authoring permissions.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                      Full Name & Title
                    </label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="input-field py-2.5 text-sm w-full"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                        Woxsen Institutional Email
                      </label>
                      <span className="text-[10px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        Must contain 'woxsen'
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value)
                          if (error) setError('')
                        }}
                        placeholder="e.g. yourname@woxsen.edu.in"
                        className="input-field pl-10 py-2.5 text-sm font-mono w-full"
                        required
                      />
                      <Mail className="w-4 h-4 text-[#A8A8AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 4 characters..."
                        className="input-field pl-10 pr-11 py-2.5 text-sm font-mono w-full"
                        required
                      />
                      <Lock className="w-4 h-4 text-[#A8A8AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A8AE] hover:text-[#0F0F11] transition-colors p-1"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password..."
                      className="input-field py-2.5 text-sm font-mono w-full"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      <span className="font-bold">Error:</span> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !regName.trim() || !regEmail.trim() || !regPassword.trim()}
                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide disabled:opacity-50 cursor-pointer shadow-sm mt-2"
                  >
                    {isLoading ? (
                      <span className="font-mono text-xs">Submitting Request...</span>
                    ) : (
                      <>
                        <span>Submit for Admin Approval</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-[#0F0F11]/5 text-center">
          <p className="text-[11px] text-[#A8A8AE]">
            Woxsen University Assessment Infrastructure • Integrity Protected
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
