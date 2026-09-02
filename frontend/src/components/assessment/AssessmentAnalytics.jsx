import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, BarChart2, ShieldAlert, Clock, AlertTriangle, Users, Search, RefreshCw, X, Eye, FileText, CheckCircle2, XCircle } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export default function AssessmentAnalytics() {
  const { id } = useParams()
  
  const [analytics, setAnalytics] = useState(null)
  const [monitor, setMonitor] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000) // Poll every 4 seconds for live updates
    return () => clearInterval(interval)
  }, [id])

  const fetchData = async () => {
    try {
      const [analyticsRes, monitorRes, violationsRes] = await Promise.all([
        axios.get(`${API_BASE}/assessment/${id}/analytics`),
        axios.get(`${API_BASE}/assessment/${id}/monitor`),
        axios.get(`${API_BASE}/assessment/${id}/violations`)
      ])
      
      setAnalytics(analyticsRes.data)
      setMonitor(monitorRes.data)
      setViolations(violationsRes.data.violations || [])
      setLastRefreshed(new Date())

      // If a student modal is currently open, keep their live data updated
      if (selectedStudent) {
        const updatedStudent = monitorRes.data.students?.find(s => s.attempt_id === selectedStudent.attempt_id)
        if (updatedStudent) {
          setSelectedStudent(updatedStudent)
        }
      }
    } catch (err) {
      console.error("Error loading analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatSeconds = (seconds) => {
    if (!seconds && seconds !== 0) return 'In Progress'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const filteredStudents = (monitor?.students || []).filter(s => {
    const matchesSearch = 
      (s.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.student_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && s.status === statusFilter
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-[#6F6F75] font-mono text-sm">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <p>Loading Real-time Assessment Analytics...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10 animate-fade-in pb-24">
      {/* Placify Navigation Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#0F0F11]/10">
        <Link to="/assessments" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F0F11] text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#0F0F11]">PLACIFY</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                SECURE
              </span>
            </div>
            <p className="text-xs text-[#6F6F75]">Live Proctoring & Analytics Console</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="btn-secondary flex items-center gap-2 text-xs font-mono px-3.5 py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <div className="text-[11px] font-mono text-[#A8A8AE]">
            {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#0F0F11]/10 pb-6">
        <div className="space-y-1">
          <Link to="/assessments" className="flex items-center gap-1.5 text-xs font-mono text-[#6F6F75] hover:text-[#0F0F11] transition-colors mb-2">
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Assessments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F0F11]">{analytics?.assessment_title || monitor?.assessment_title} Analytics</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-green-50 text-green-700 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Tracking
            </span>
          </div>
          <p className="text-sm text-[#6F6F75]">Monitoring student details (Name, Roll No, Email), answers updated in real-time, scores, and security logs.</p>
        </div>
      </div>

      {/* Metrics Summary Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Total Candidates
          </div>
          <div className="text-3xl font-bold text-[#0F0F11] mt-1">{analytics?.total_attempts}</div>
          <div className="text-[11px] font-mono text-[#6F6F75] mt-1">
            {analytics?.in_progress} active | {analytics?.completed} done | {analytics?.terminated} terminated
          </div>
        </div>

        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            Average Score Rate
          </div>
          <div className="text-3xl font-bold text-[#0F0F11] mt-1">{analytics?.average_score}%</div>
          <div className="text-[11px] font-mono text-green-600 mt-1 font-semibold">
            Pass rate: {analytics?.pass_rate}% ({analytics?.passed_count} passed)
          </div>
        </div>

        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Average Time Taken
          </div>
          <div className="text-3xl font-bold text-[#0F0F11] mt-1">{formatSeconds(analytics?.average_completion_time || 0)}</div>
          <div className="text-[11px] font-mono text-[#6F6F75] mt-1">
            Completed candidate average
          </div>
        </div>

        <div className="stat-card">
          <div className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            Total Integrity Incidents
          </div>
          <div className="text-3xl font-bold text-red-600 mt-1">{analytics?.total_violations}</div>
          <div className="text-[11px] font-mono text-red-600 mt-1 font-semibold">
            Across {analytics?.total_warnings} warnings logged
          </div>
        </div>
      </div>

      {/* Main Student Board */}
      <div className="q-card space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-[#0F0F11] uppercase tracking-wider">Candidate Progress & Updates</h3>
            <p className="text-xs text-[#6F6F75] mt-0.5">Click "View Responses" on any student to see what they have updated and submitted.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, roll no, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAFAF8] border border-[#0F0F11]/10 rounded-lg focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            {/* Filter by status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono bg-[#FAFAF8] border border-[#0F0F11]/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600 text-[#0F0F11]"
            >
              <option value="all">All Statuses ({monitor?.students?.length || 0})</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto border border-[#0F0F11]/5 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#0F0F11]/10 text-xs font-mono text-[#6F6F75] uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Roll Number</th>
                <th className="py-3.5 px-4 font-semibold">Student Details</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Progress / Answers</th>
                <th className="py-3.5 px-4 font-semibold">Violations</th>
                <th className="py-3.5 px-4 font-semibold">Duration</th>
                <th className="py-3.5 px-4 font-semibold">Score</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F0F11]/5">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-xs font-mono text-[#A8A8AE]">
                    {searchTerm ? "No students matching your search query." : "No student attempts recorded yet. Share the exam link with students to start."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.attempt_id || idx} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-[#0F0F11]">
                      {s.roll_number && s.roll_number !== 'N/A' ? (
                        <span className="bg-[#FAFAF8] px-2.5 py-1 border border-[#0F0F11]/10 rounded-md text-[#0F0F11]">
                          {s.roll_number}
                        </span>
                      ) : (
                        <span className="text-[#A8A8AE] font-normal italic">Not Provided</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-sm text-[#0F0F11]">{s.student_name}</div>
                      <div className="text-[11px] text-[#6F6F75] font-mono mt-0.5">{s.student_email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`badge badge-${s.status} uppercase tracking-wider text-[10px]`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${s.total_questions > 0 ? (s.answered_count / s.total_questions) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-medium text-[#0F0F11]">
                          {s.answered_count} / {s.total_questions}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6F6F75] font-mono">
                        {s.status === 'in_progress' ? 'Updating live' : 'Submitted'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-mono text-xs">
                        <span className={s.violation_count > 0 ? "text-red-600 font-bold" : "text-[#6F6F75]"}>
                          {s.violation_count} violations
                        </span>
                        <div className="text-[10px] text-[#A8A8AE]">{s.warning_count} warnings</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-[#6F6F75]">
                      {s.completion_time ? formatSeconds(s.completion_time) : (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-sm text-[#0F0F11]">
                      {s.score !== null ? (
                        <span className={s.score >= (analytics?.passing_score || 50) ? "text-green-600" : "text-red-600"}>
                          {s.score}%
                        </span>
                      ) : (
                        <span className="text-[#A8A8AE] font-normal">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="btn-secondary px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ml-auto text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Responses
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Distribution & Violation Logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Score Distribution Histogram */}
        <div className="q-card md:col-span-1 space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0F0F11]">Score Distribution</h3>
          <div className="space-y-4 pt-2">
            {Object.entries(analytics?.score_distribution || {}).map(([bucket, count]) => {
              const maxCount = Math.max(...Object.values(analytics?.score_distribution || {}));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={bucket} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-[#6F6F75]">
                    <span>{bucket}%</span>
                    <span>{count} candidates</span>
                  </div>
                  <div className="w-full bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detailed Violation Log */}
        <div className="q-card md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0F0F11]">Security Incident Feed</h3>
            <span className="text-xs font-mono text-[#6F6F75]">{violations.length} incidents logged</span>
          </div>
          
          {violations.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#A8A8AE]">
              No integrity violations recorded. All candidates are following exam rules.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {violations.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-[#FAFAF8] border border-red-100 rounded-xl font-mono text-[11px] leading-relaxed">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-[#0F0F11]">{v.student_name}</span>
                      <span className="text-[#6F6F75] ml-1">({v.student_email})</span>
                      <span className="text-red-600 bg-red-50 px-2 py-0.5 border border-red-200 rounded-md ml-2 inline-block font-semibold">
                        {v.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[#6F6F75] space-y-0.5">
                    <div>{v.browser} • {v.os}</div>
                    <div className="text-[10px] text-[#A8A8AE]">{new Date(v.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Detailed Response Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-[#0F0F11]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#0F0F11]/10 animate-fade-in overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#0F0F11]/10 flex justify-between items-start bg-[#FAFAF8]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-[#0F0F11]">{selectedStudent.student_name}</h3>
                  <span className={`badge badge-${selectedStudent.status} text-[10px] uppercase font-mono`}>
                    {selectedStudent.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#6F6F75] mt-1.5">
                  <span><strong>Roll No:</strong> {selectedStudent.roll_number || 'N/A'}</span>
                  <span><strong>Email:</strong> {selectedStudent.student_email}</span>
                  <span><strong>Attempt ID:</strong> {selectedStudent.attempt_id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Stats Bar */}
            <div className="grid grid-cols-4 border-b border-[#0F0F11]/10 bg-white p-4 text-center font-mono text-xs divide-x divide-[#0F0F11]/10">
              <div>
                <div className="text-[#A8A8AE] text-[10px] uppercase">Score</div>
                <div className="text-lg font-bold text-[#0F0F11] mt-0.5">
                  {selectedStudent.score !== null ? `${selectedStudent.score}%` : 'In Progress'}
                </div>
              </div>
              <div>
                <div className="text-[#A8A8AE] text-[10px] uppercase">Questions Answered</div>
                <div className="text-lg font-bold text-indigo-600 mt-0.5">
                  {selectedStudent.answered_count} / {selectedStudent.total_questions}
                </div>
              </div>
              <div>
                <div className="text-[#A8A8AE] text-[10px] uppercase">Violations Logged</div>
                <div className={`text-lg font-bold mt-0.5 ${selectedStudent.violation_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedStudent.violation_count}
                </div>
              </div>
              <div>
                <div className="text-[#A8A8AE] text-[10px] uppercase">Time Duration</div>
                <div className="text-lg font-bold text-[#0F0F11] mt-0.5">
                  {selectedStudent.completion_time ? formatSeconds(selectedStudent.completion_time) : 'Active'}
                </div>
              </div>
            </div>

            {/* Modal Body: Question by Question answers */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F0F11] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Detailed Question Updates & Responses
                </h4>
                <span className="text-[11px] font-mono text-[#6F6F75]">
                  Updates live as candidate answers
                </span>
              </div>

              {monitor?.questions?.map((q, idx) => {
                const rawResp = selectedStudent.responses?.[String(idx)]
                let studentAnswer = ""
                let isGraded = false
                let isCorrect = false
                let correctAnswer = q.answer || ""

                if (rawResp && typeof rawResp === 'object' && 'answer' in rawResp) {
                  studentAnswer = rawResp.answer
                  isGraded = true
                  isCorrect = rawResp.correct
                  if (rawResp.correct_answer) correctAnswer = rawResp.correct_answer
                } else if (rawResp !== undefined) {
                  studentAnswer = String(rawResp)
                }

                const hasAnswered = studentAnswer && studentAnswer.trim().length > 0

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      !hasAnswered
                        ? 'bg-gray-50/50 border-gray-200/60'
                        : isGraded
                        ? isCorrect
                          ? 'bg-green-50/30 border-green-200'
                          : 'bg-red-50/30 border-red-200'
                        : 'bg-indigo-50/20 border-indigo-100'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="font-mono text-xs font-semibold text-[#0F0F11]">
                        Question {idx + 1} ({q.points || 1} Pt) • <span className="uppercase text-[10px] text-gray-500">{q.type}</span>
                      </span>
                      {hasAnswered ? (
                        isGraded ? (
                          isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-green-700 bg-green-100/80 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{q.points || 1})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-red-700 bg-red-100/80 px-2 py-0.5 rounded">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-medium">
                            Answer Logged
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-mono text-gray-400 italic">Not Answered Yet</span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-[#0F0F11] mb-3">{q.question}</p>

                    {/* Student's answer display */}
                    <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
                      <div className="text-xs">
                        <span className="font-mono text-[11px] text-[#6F6F75] uppercase tracking-wider font-semibold">Student Response:</span>
                        <div className={`mt-1 p-2.5 rounded-lg font-mono text-xs ${
                          hasAnswered ? 'bg-white border border-black/10 text-[#0F0F11]' : 'bg-gray-100/60 text-gray-400 italic'
                        }`}>
                          {hasAnswered ? studentAnswer : 'No answer entered by student yet.'}
                        </div>
                      </div>

                      {correctAnswer && (
                        <div className="text-xs">
                          <span className="font-mono text-[11px] text-green-700 uppercase tracking-wider font-semibold">Expected Answer:</span>
                          <div className="mt-0.5 p-2 rounded-lg bg-green-50/60 border border-green-200 text-green-800 font-mono text-xs">
                            {correctAnswer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAFAF8] border-t border-[#0F0F11]/10 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="btn-primary px-6 py-2 text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
