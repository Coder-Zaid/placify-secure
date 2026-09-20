import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowRight, Lock, KeyRound } from 'lucide-react'

export default function StudentEntry() {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleJoin = (e) => {
    e.preventDefault()
    const code = accessCode.trim().toUpperCase()
    if (!code) {
      setError('Please enter a valid assessment access code.')
      return
    }
    navigate(`/exam/${code}`)
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0F0F11] text-white flex items-center justify-center font-bold text-base shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#0F0F11]">PLACIFY</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">
                SECURE
              </span>
            </div>
            <div className="text-[10px] text-[#6F6F75]">Student Assessment Portal</div>
          </div>
        </div>

        <Link
          to="/assessments"
          className="text-xs font-mono text-[#6F6F75] hover:text-[#0F0F11] transition-colors flex items-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Admin / Instructor Login</span>
        </Link>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md mx-auto w-full q-card p-8 space-y-6 shadow-sm border border-[#0F0F11]/5 bg-white rounded-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mx-auto shadow-xs">
            <Shield className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F0F11] tracking-tight">Enter Assessment</h1>
          <p className="text-xs text-[#6F6F75] leading-relaxed">
            Enter the 8-character access code provided by your instructor to join your proctored assessment.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F0F11] mb-1.5">
              ASSESSMENT ACCESS CODE
            </label>
            <div className="relative">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="e.g. UMMDLSRJ"
                maxLength={12}
                className="input-field uppercase text-center font-mono text-lg tracking-widest font-bold py-3.5"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer shadow-xs"
          >
            <span>Proceed to Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#0F0F11]/5 space-y-2 text-[11px] text-[#6F6F75]">
          <div className="font-semibold text-[#0F0F11] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-green-600" />
            <span>Proctoring Integrity Requirements</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-[10px]">
            <li>Companion Placify Secure browser extension loaded</li>
            <li>Webcam & Fullscreen display permissions enabled</li>
            <li>Single workspace tab strictly enforced</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#A8A8AE] font-mono py-4">
        Placify Secure Standalone Proctoring Platform • Student Portal
      </footer>
    </div>
  )
}
