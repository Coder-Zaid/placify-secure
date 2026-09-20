import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, KeyRound, Home, ArrowRight } from 'lucide-react'

export default function NotFound() {
  const [accessCode, setAccessCode] = useState('')
  const navigate = useNavigate()

  const handleQuickJoin = (e) => {
    e.preventDefault()
    const code = accessCode.trim().toUpperCase()
    if (code) {
      navigate(`/exam/${code}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5">
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
            <div className="text-[10px] text-[#6F6F75]">Integrity Assessment Platform</div>
          </div>
        </Link>

        <Link
          to="/instructor/login"
          className="text-xs font-mono text-[#6F6F75] hover:text-[#0F0F11] transition-colors flex items-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </Link>
      </header>

      {/* Main 404 Card */}
      <main className="max-w-lg mx-auto w-full q-card p-8 sm:p-10 space-y-8 shadow-sm border border-[#0F0F11]/5 bg-white rounded-3xl text-center">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-amber-700 font-semibold">
            Error 404 • Route Not Found
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F0F11] tracking-tight">
            Page Does Not Exist
          </h1>
          <p className="text-xs text-[#6F6F75] leading-relaxed max-w-sm mx-auto">
            The link you accessed may be broken, misspelled, or the assessment access code could not be verified.
          </p>
        </div>

        {/* Quick Access Code Input */}
        <div className="p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-2xl space-y-3 text-left">
          <label className="block text-[11px] font-semibold text-[#6F6F75] uppercase tracking-wider">
            Looking for your assessment?
          </label>
          <form onSubmit={handleQuickJoin} className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter 8-digit access code..."
              className="input-field py-2 text-xs font-mono uppercase tracking-wider flex-1"
            />
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            to="/"
            className="btn-primary py-3 text-xs flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Student Portal</span>
          </Link>
          <Link
            to="/instructor/login"
            className="btn-secondary py-3 text-xs flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Instructor Center</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center">
        <p className="text-[11px] text-[#A8A8AE] font-mono">
          Placify Secure • Built with strict integrity & proctoring guardrails
        </p>
      </footer>
    </div>
  )
}
