import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, BarChart2, ShieldAlert, Clock, Copy, Check, Power, AlertTriangle, 
  Eye, Trash2, LogOut, Users, UserCheck, UserX, ShieldCheck, Mail, Download
} from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export default function AssessmentDashboard() {
  const [assessments, setAssessments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(null)

  // Auth User Data
  const userRole = localStorage.getItem('placify_user_role') || 'instructor'
  const userName = localStorage.getItem('placify_user_name') || 'Instructor'
  const userEmail = localStorage.getItem('placify_user_email') || ''

  // Admin Faculty Approvals State
  const [instructors, setInstructors] = useState([])
  const [loadingInstructors, setLoadingInstructors] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    fetchAssessments()
    if (userRole === 'admin') {
      fetchInstructors()
    }
  }, [userRole])

  const fetchAssessments = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/assessment/list`, {
        params: {
          created_by: userEmail,
          role: userRole
        }
      })
      setAssessments(response.data.assessments || [])
    } catch (err) {
      console.error("Error fetching assessments:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInstructors = async () => {
    setLoadingInstructors(true)
    try {
      const response = await axios.get(`${API_BASE}/auth/instructors`)
      setInstructors(response.data.instructors || [])
    } catch (err) {
      console.error("Error fetching instructors:", err)
    } finally {
      setLoadingInstructors(false)
    }
  }

  const handleApproveInstructor = async (id, name) => {
    try {
      await axios.post(`${API_BASE}/auth/instructors/${id}/approve`)
      setActionMessage(`Approved faculty account for ${name}`)
      setTimeout(() => setActionMessage(''), 3000)
      fetchInstructors()
    } catch (err) {
      console.error("Error approving instructor:", err)
      alert("Failed to approve instructor.")
    }
  }

  const handleRejectInstructor = async (id, name) => {
    try {
      await axios.post(`${API_BASE}/auth/instructors/${id}/reject`)
      setActionMessage(`Revoked access for ${name}`)
      setTimeout(() => setActionMessage(''), 3000)
      fetchInstructors()
    } catch (err) {
      console.error("Error rejecting instructor:", err)
      alert("Failed to revoke instructor access.")
    }
  }

  const handleDeleteInstructor = async (id, name) => {
    if (!confirm(`Are you sure you want to delete instructor account ${name}?`)) return
    try {
      await axios.delete(`${API_BASE}/auth/instructors/${id}`)
      setActionMessage(`Deleted instructor account ${name}`)
      setTimeout(() => setActionMessage(''), 3000)
      fetchInstructors()
    } catch (err) {
      console.error("Error deleting instructor:", err)
      alert("Failed to delete instructor.")
    }
  }

  const handlePublish = async (id) => {
    try {
      await axios.post(`${API_BASE}/assessment/publish/${id}`)
      fetchAssessments()
    } catch (err) {
      console.error("Error publishing assessment:", err)
      alert("Failed to publish assessment.")
    }
  }

  const handleClose = async (id) => {
    try {
      await axios.post(`${API_BASE}/assessment/close/${id}`)
      fetchAssessments()
    } catch (err) {
      console.error("Error closing assessment:", err)
      alert("Failed to close assessment.")
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this assessment? All student attempts will be lost.")) return
    try {
      await axios.delete(`${API_BASE}/assessment/delete/${id}`)
      fetchAssessments()
    } catch (err) {
      console.error("Error deleting assessment:", err)
      alert("Failed to delete assessment.")
    }
  }

  const copyToClipboard = (text, codeKey) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(codeKey || text)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const pendingInstructors = instructors.filter(i => !i.is_approved)
  const approvedInstructors = instructors.filter(i => i.is_approved)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Placify Navigation Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#0F0F11]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F0F11] text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#0F0F11]">PLACIFY</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                WOXSEN SECURE
              </span>
            </div>
            <p className="text-xs text-[#6F6F75]">Enterprise Assessment & Proctoring System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-[#FAFAF8] px-3.5 py-1.5 rounded-xl border border-[#0F0F11]/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-indigo-600' : 'bg-emerald-500'}`}></span>
            <span className="font-semibold text-[#0F0F11]">{userName}</span>
            <span className="font-mono text-[#A8A8AE]">({userRole === 'admin' ? 'Master Admin' : userEmail})</span>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('placify_instructor_auth')
              localStorage.removeItem('placify_instructor_auth')
              localStorage.removeItem('placify_user_role')
              localStorage.removeItem('placify_user_name')
              localStorage.removeItem('placify_user_email')
              window.location.href = '/instructor/login'
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs text-[#6F6F75] hover:text-red-600 border-[#0F0F11]/10 hover:border-red-200 hover:bg-red-50/50 py-2.5 px-3.5 cursor-pointer"
            title="Sign out of session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          
          <Link to="/assessments/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Assessment
          </Link>
        </div>
      </div>

      {/* ADMIN ONLY: Woxsen Faculty Approvals Hub */}
      {userRole === 'admin' && (
        <div className="q-card border-2 border-indigo-100 bg-white p-6 sm:p-7 rounded-2xl shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0F0F11]/5 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-[#0F0F11]">Woxsen Faculty Approval Hub</h2>
                {pendingInstructors.length > 0 && (
                  <span className="animate-pulse text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                    {pendingInstructors.length} Awaiting Approval
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F6F75]">
                Review faculty registered with their Woxsen email. Approve accounts to grant assessment creation permissions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono bg-[#FAFAF8] px-3 py-1.5 rounded-lg border border-[#0F0F11]/5">
                <span className="text-emerald-700 font-bold">{approvedInstructors.length}</span> Active •{' '}
                <span className="text-amber-700 font-bold">{pendingInstructors.length}</span> Pending
              </div>
              <button
                onClick={fetchInstructors}
                className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{actionMessage}</span>
            </div>
          )}

          {loadingInstructors ? (
            <div className="py-6 text-center text-xs text-[#6F6F75]">Loading registered faculty...</div>
          ) : instructors.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6F6F75]">
              No faculty accounts registered yet. Instructors can register via the Sign In portal.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#0F0F11]/5 text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">
                    <th className="py-3">Faculty Member</th>
                    <th className="py-3">Woxsen Email</th>
                    <th className="py-3">Registered On</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F0F11]/5">
                  {instructors.map((inst) => (
                    <tr key={inst.id} className="hover:bg-[#FAFAF8]/60 transition-colors">
                      <td className="py-3.5">
                        <div className="font-semibold text-[#0F0F11] flex items-center gap-2">
                          <span>{inst.name}</span>
                          {inst.role === 'admin' && (
                            <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Admin</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-xs text-[#4E4E54]">
                        {inst.email}
                      </td>
                      <td className="py-3.5 font-mono text-xs text-[#A8A8AE]">
                        {inst.created_at ? new Date(inst.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5">
                        {inst.is_approved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Approved (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!inst.is_approved ? (
                            <button
                              onClick={() => handleApproveInstructor(inst.id, inst.name)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                              title="Approve faculty member"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRejectInstructor(inst.id, inst.name)}
                              className="px-3 py-1.5 bg-[#FAFAF8] hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Revoke access"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInstructor(inst.id, inst.name)}
                            className="p-1.5 text-[#A8A8AE] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F0F11]">Assessment Control Center</h1>
          <p className="text-sm text-[#6F6F75] mt-1">Manage assessment templates, integrity settings, live access codes, and student proctoring logs.</p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">Total Campaigns</div>
          <div className="text-3xl font-medium text-[#0F0F11] mt-1">{assessments.length}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">Published Status</div>
          <div className="text-3xl font-medium text-[#0F0F11] mt-1">
            {assessments.filter(a => a.status === 'published').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">Completed Exam Runs</div>
          <div className="text-3xl font-medium text-[#0F0F11] mt-1">
            {assessments.reduce((sum, a) => sum + (a.completed_count || 0), 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">Average Attempt Count</div>
          <div className="text-3xl font-medium text-[#0F0F11] mt-1">
            {assessments.reduce((sum, a) => sum + (a.attempt_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* Assessments List Table */}
      <div className="q-card space-y-6">
        <h2 className="text-xl font-medium tracking-tight">Active Assessments</h2>
        
        {isLoading ? (
          <div className="py-12 text-center text-[#6F6F75]">Loading assessments...</div>
        ) : assessments.length === 0 ? (
          <div className="py-12 text-center text-[#6F6F75] space-y-3">
            <ShieldAlert className="w-8 h-8 mx-auto text-[#A8A8AE] stroke-[1.5]" />
            <p className="text-sm">No assessments found. Build a new assessment to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#0F0F11]/10 text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">
                  <th className="py-4">Assessment Details</th>
                  <th className="py-4">Status</th>
                  <th className="py-4">Access Link</th>
                  <th className="py-4">Questions</th>
                  <th className="py-4">Attempts</th>
                  <th className="py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F0F11]/5">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                    <td className="py-4 pr-6">
                      <div className="font-semibold text-base text-[#0F0F11] flex items-center gap-2">
                        <span>{a.title}</span>
                        {userRole === 'admin' && (
                          <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-normal">
                            Author: {a.created_by || 'admin'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6F6F75] line-clamp-1 mt-0.5">{a.description || 'No description provided.'}</div>
                      <div className="flex items-center gap-3 text-xs font-mono text-[#A8A8AE] mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {a.duration_minutes}m
                        </span>
                        <span>•</span>
                        <span>Pass: {a.passing_score}%</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                        a.status === 'published' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : a.status === 'closed'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          a.status === 'published' ? 'bg-emerald-500' : a.status === 'closed' ? 'bg-gray-500' : 'bg-amber-500'
                        }`} />
                        {a.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4">
                      {a.access_code ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold bg-[#FAFAF8] px-2 py-1 rounded border border-[#0F0F11]/10 text-[#0F0F11]">
                            {a.access_code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/exam/${a.access_code}`, a.access_code)}
                            className="p-1.5 text-[#6F6F75] hover:text-[#0F0F11] hover:bg-[#FAFAF8] border border-transparent hover:border-[#0F0F11]/10 rounded transition"
                            title={copiedCode === a.access_code ? 'Copied to clipboard!' : 'Copy student link'}
                          >
                            {copiedCode === a.access_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-[#A8A8AE]">Not Published</span>
                      )}
                    </td>
                    <td className="py-4 font-mono text-xs">
                      {a.question_count}
                    </td>
                    <td className="py-4 font-mono text-xs">
                      <span className="text-[#0F0F11] font-semibold">{a.completed_count || 0}</span>
                      <span className="text-[#A8A8AE]"> / {a.attempt_count || 0}</span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Toggle Button */}
                        {a.status === 'published' ? (
                          <button
                            onClick={() => handleClose(a.id)}
                            className="p-2 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition"
                            title="Close assessment (stop accepting attempts)"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublish(a.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition"
                            title="Publish assessment (generate access code)"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Analytics */}
                        <Link
                          to={`/assessments/${a.id}/analytics`}
                          className="p-2 text-[#6F6F75] hover:text-[#0F0F11] hover:bg-[#FAFAF8] border border-[#0F0F11]/10 rounded-lg transition"
                          title="View analytics & attempts"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>

                        {/* Export CSV (Microsoft Forms format) */}
                        <a
                          href={`${API_BASE}/assessment/${a.id}/export-csv`}
                          download
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition"
                          title="Export candidate marks & responses to CSV"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {/* Edit Button (only if not published) */}
                        {a.status !== 'published' && (
                          <Link
                            to={`/assessments/${a.id}/edit`}
                            className="p-2 text-[#6F6F75] hover:text-[#0F0F11] hover:bg-[#FAFAF8] border border-[#0F0F11]/10 rounded-lg transition"
                            title="Edit assessment"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-2 text-[#A8A8AE] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition"
                          title="Delete assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
