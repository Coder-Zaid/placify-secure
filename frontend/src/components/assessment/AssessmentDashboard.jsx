import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BarChart2, ShieldAlert, Clock, Copy, Check, Power, AlertTriangle, Eye, Trash2 } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export default function AssessmentDashboard() {
  const [assessments, setAssessments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/assessment/list`)
      setAssessments(response.data.assessments || [])
    } catch (err) {
      console.error("Error fetching assessments:", err)
    } finally {
      setIsLoading(false)
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

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="flex justify-between items-center border-b border-[#0F0F11]/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F0F11]">Assessment Control Center</h1>
          <p className="text-sm text-[#6F6F75] mt-1">Manage assessment templates, integrity settings, access control, and student records.</p>
        </div>
        <Link to="/assessments/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Assessment
        </Link>
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
                {assessments.map(a => (
                  <tr key={a.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                    <td className="py-5">
                      <div className="font-semibold text-[#0F0F11]">{a.title}</div>
                      <div className="text-xs text-[#6F6F75] mt-0.5 line-clamp-1 max-w-sm">{a.description || 'No description provided.'}</div>
                    </td>
                    <td className="py-5">
                      <span className={`badge badge-${a.status}`}>{a.status}</span>
                    </td>
                    <td className="py-5 font-mono text-xs">
                      {a.access_code ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-[#FAFAF8] px-2.5 py-1 border border-[#0F0F11]/5 rounded-lg text-[#0F0F11]">
                            {a.access_code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/exam/${a.access_code}`)}
                            className="text-[#6F6F75] hover:text-[#0F0F11] p-1 transition-colors"
                            title="Copy student link"
                          >
                            {copiedCode === a.access_code ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#A8A8AE]">Not Published</span>
                      )}
                    </td>
                    <td className="py-5 font-mono text-xs text-[#6F6F75]">
                      {a.question_count} Qs
                    </td>
                    <td className="py-5 font-mono text-xs text-[#6F6F75]">
                      {a.attempt_count} ({a.completed_count} done)
                    </td>
                    <td className="py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(a.id)}
                            className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" />
                            Publish
                          </button>
                        )}
                        {a.status === 'published' && (
                          <button
                            onClick={() => handleClose(a.id)}
                            className="btn-secondary px-3 py-1.5 text-xs text-red-600 hover:text-red-700 border-red-200/50 hover:bg-red-50/50 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Close
                          </button>
                        )}
                        <Link
                          to={`/assessments/${a.id}/analytics`}
                          className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                        >
                          <BarChart2 className="w-3 h-3" />
                          Analytics & Live Board
                        </Link>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-2 text-[#A8A8AE] hover:text-red-600 rounded-lg hover:bg-red-50/30 transition-colors"
                          title="Delete Assessment"
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
