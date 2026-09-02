import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Shield, Clock, AlertTriangle, AlertCircle, CheckCircle, Info, Play, Wifi } from 'lucide-react'
import axios from 'axios'
import { useSecureExam } from '../../hooks/useSecureExam'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export default function StudentPortal() {
  const { accessCode } = useParams()
  const navigate = useNavigate()
  
  const [assessmentInfo, setAssessmentInfo] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [errorInfo, setErrorInfo] = useState('')

  // Student registration details
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [examStarted, setExamStarted] = useState(false)
  const [examCompleted, setExamCompleted] = useState(false)
  const [examTerminated, setExamTerminated] = useState(false)

  // Exam execution state
  const [attemptId, setAttemptId] = useState('')
  const [questions, setQuestions] = useState([])
  const [responses, setResponses] = useState({})
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [examResult, setExamResult] = useState(null)

  // Security warning overlay state
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [lastWarningReason, setLastWarningReason] = useState('')

  const examContainerRef = useRef(null)
  
  // Camera state
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef(null)

  // Pre-assessment checklist status
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [isFullscreenAllowed, setIsFullscreenAllowed] = useState(false)
  const [browserSupported, setBrowserSupported] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine)

  useEffect(() => {
    fetchAssessmentInfo()
    checkSystemCompatibility()
    
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [accessCode, cameraStream])

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraStream(stream)
      setCameraActive(true)
    } catch (err) {
      console.error("Camera access denied", err)
      setCameraActive(false)
      alert("Camera access is required for this assessment.")
    }
  }

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream, videoRef, examStarted])

  const checkSystemCompatibility = () => {
    // Check browser compatibility
    const ua = navigator.userAgent
    const isChrome = ua.includes("Chrome") && !ua.includes("Chromium")
    const isEdge = ua.includes("Edg")
    setBrowserSupported(isChrome || isEdge)

    // Check fullscreen availability
    setIsFullscreenAllowed(!!document.documentElement.requestFullscreen)
  }

  // Monitor extension existence check
  useEffect(() => {
    let pingReceivedCount = 0

    const markInstalled = () => {
      pingReceivedCount++
      setExtensionInstalled(true)
    }

    // Check if DOM attribute was already injected
    if (document.documentElement.getAttribute('data-placify-extension-installed') === 'true') {
      markInstalled()
    }
    
    const handlePingResponse = (e) => {
      if (e.data && e.data.source === 'placify-secure-extension' && e.data.type === 'PING_RESPONSE') {
        markInstalled()
      }
    }

    const handleCustomPing = () => {
      markInstalled()
    }

    window.addEventListener('message', handlePingResponse)
    window.addEventListener('placify-ping-response', handleCustomPing)
    
    // Ping extension
    const sendPing = () => {
      window.postMessage({ source: 'placify-secure-exam-page', type: 'PING_REQUEST' }, '*')
      window.dispatchEvent(new CustomEvent('placify-ping-request'))
      if (document.documentElement.getAttribute('data-placify-extension-installed') === 'true') {
        markInstalled()
      }
    }

    sendPing()
    const interval = setInterval(sendPing, 1000)

    return () => {
      window.removeEventListener('message', handlePingResponse)
      window.removeEventListener('placify-ping-response', handleCustomPing)
      clearInterval(interval)
    }
  }, [])

  const fetchAssessmentInfo = async () => {
    setLoadingInfo(true)
    setErrorInfo('')
    try {
      const res = await axios.get(`${API_BASE}/assessment/join/${accessCode}`)
      setAssessmentInfo(res.data)
    } catch (err) {
      console.error("Error fetching assessment details:", err)
      setErrorInfo(err.response?.data?.detail || "Invalid access code. Please verify the URL.")
    } finally {
      setLoadingInfo(false)
    }
  }

  // Enforce security policies via hook
  const {
    warningCount,
    isFullscreen,
    requestFullscreen
  } = useSecureExam({
    attemptId: examStarted && !examCompleted && !examTerminated ? attemptId : null,
    assessmentId: assessmentInfo?.id,
    policy: assessmentInfo?.security_policy || {},
    onWarning: (reason) => {
      setLastWarningReason(reason)
      setShowWarningModal(true)
    },
    onTerminate: (reason) => {
      handleForceTermination(reason)
    },
    onLogViolation: async (payload) => {
      try {
        await axios.post(`${API_BASE}/assessment/${assessmentInfo.id}/violations`, payload)
      } catch (err) {
        console.error("Error logging violation event:", err)
      }
    }
  })

  // Timer Countdown & Extension HUD sync
  useEffect(() => {
    if (!examStarted || examCompleted || examTerminated || timeLeftSeconds <= 0) return

    // Push HUD status to extension
    window.postMessage({
      source: 'placify-secure-exam-page',
      type: 'UPDATE_HUD',
      title: assessmentInfo?.title || 'Assessment in Progress',
      timeLeft: timeLeftSeconds,
      warningCount: warningCount,
      maxWarnings: assessmentInfo?.security_policy?.max_warnings ?? 1
    }, '*')

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [examStarted, examCompleted, examTerminated, timeLeftSeconds, warningCount, assessmentInfo])

  const handleStartExam = async (e) => {
    e.preventDefault()
    if (!studentName.trim() || !studentEmail.trim()) {
      alert("Please enter your name and email to start the exam.")
      return
    }

    try {
      const res = await axios.post(`${API_BASE}/assessment/${assessmentInfo.id}/start`, {
        student_name: studentName,
        student_email: studentEmail,
        roll_number: rollNumber
      })

      const data = res.data
      setAttemptId(data.attempt_id)
      setQuestions(data.questions || [])
      setTimeLeftSeconds(data.duration_minutes * 60)
      setExamStarted(true)
      
      // Request Fullscreen immediately
      setTimeout(() => {
        requestFullscreen(examContainerRef.current)
      }, 500)
    } catch (err) {
      console.error("Error starting attempt:", err)
      alert(err.response?.data?.detail || "Failed to start assessment. Attempt count might be exceeded.")
    }
  }

  // Periodic answer sync to backend so admin can view updates live
  const syncResponsesDebounced = useRef(null)
  const syncResponses = (updatedResponses) => {
    if (syncResponsesDebounced.current) clearTimeout(syncResponsesDebounced.current)
    syncResponsesDebounced.current = setTimeout(async () => {
      try {
        if (attemptId && assessmentInfo?.id) {
          await axios.post(`${API_BASE}/assessment/${assessmentInfo.id}/sync`, {
            attempt_id: attemptId,
            responses: updatedResponses
          })
        }
      } catch (err) {
        console.warn("Failed to sync responses live:", err)
      }
    }, 800)
  }

  const handleOptionSelect = (qIndex, option) => {
    setResponses(prev => {
      const updated = {
        ...prev,
        [qIndex]: option
      }
      syncResponses(updated)
      return updated
    })
  }

  const handleTextChange = (qIndex, text) => {
    setResponses(prev => {
      const updated = {
        ...prev,
        [qIndex]: text
      }
      syncResponses(updated)
      return updated
    })
  }

  const handleForceTermination = async (reason) => {
    setExamTerminated(true)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err))
    }
    
    try {
      const res = await axios.post(`${API_BASE}/assessment/${assessmentInfo.id}/terminate`, {
        attempt_id: attemptId,
        responses: responses
      })
      setExamResult(res.data)
    } catch (err) {
      console.error("Error sending force termination data:", err)
    }
  }

  const handleAutoSubmit = () => {
    handleSubmit(true)
  }

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto && !confirm("Are you sure you want to submit your assessment responses?")) return
    
    setSubmitting(true)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err))
    }

    try {
      const res = await axios.post(`${API_BASE}/assessment/${assessmentInfo.id}/submit`, {
        attempt_id: attemptId,
        responses: responses
      })
      setExamResult(res.data)
      setExamCompleted(true)
    } catch (err) {
      console.error("Error submitting assessment:", err)
      alert("Error submitting assessment. Check connection status.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loadingInfo) {
    return <div className="text-center py-24 text-[#6F6F75] font-mono text-sm">Verifying Access Token...</div>
  }

  if (errorInfo) {
    return (
      <div className="max-w-md mx-auto mt-24 q-card text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-red-500 stroke-[1.5]" />
        <h2 className="text-lg font-semibold text-[#0F0F11]">Access Failure</h2>
        <p className="text-sm text-[#6F6F75]">{errorInfo}</p>
        <button onClick={() => navigate('/assessments')} className="btn-secondary w-full py-3">Return to Control Center</button>
      </div>
    )
  }

  // 1. Completion Screen
  if (examCompleted && examResult) {
    return (
      <div className="max-w-xl mx-auto mt-16 q-card space-y-8">
        <div className="text-center space-y-3">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600 stroke-[1.5]" />
          <h2 className="text-2xl font-bold tracking-tight text-[#0F0F11]">Assessment Submitted</h2>
          <p className="text-sm text-[#6F6F75]">Your responses have been successfully submitted and recorded.</p>
        </div>

        <div className="bg-[#FAFAF8] rounded-2xl border border-[#0F0F11]/5 p-6 text-center font-mono text-sm space-y-2">
          <div className="text-xs text-[#A8A8AE] uppercase tracking-wider">Submission Status</div>
          <div className="text-xl font-semibold text-green-600">CONFIRMED & RECEIVED</div>
          <p className="text-xs text-[#6F6F75] mt-2 font-sans">
            Results and evaluation will be reviewed by the administrator/instructor.
          </p>
        </div>

        <div className="space-y-3">
          <button onClick={() => navigate('/assessments')} className="btn-primary w-full py-3">
            Exit Assessment
          </button>
        </div>
      </div>
    )
  }

  // 2. Forced Termination Screen
  if (examTerminated) {
    return (
      <div className="max-w-md mx-auto mt-24 q-card text-center space-y-6">
        <AlertCircle className="w-12 h-12 mx-auto text-red-600 stroke-[1.5]" />
        <h2 className="text-2xl font-bold text-[#0F0F11]">Assessment Terminated</h2>
        <p className="text-sm text-[#6F6F75] leading-relaxed">
          Suspicious activity has been repeatedly detected. Your current responses have been submitted automatically, and your exam session has been locked.
        </p>
        <button onClick={() => navigate('/assessments')} className="btn-secondary w-full py-3">Return to Dashboard</button>
      </div>
    )
  }

  // 3. System Pre-check and Registration Screen
  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F0F11] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
              P
            </div>
            <div className="font-extrabold text-base tracking-tight text-[#0F0F11]">
              PLACIFY <span className="text-xs font-mono font-medium text-indigo-600 ml-1">SECURE</span>
            </div>
          </div>
          <div className="text-xs font-mono text-[#6F6F75] bg-[#FAFAF8] px-3 py-1 rounded-full border border-[#0F0F11]/5">
            Code: {accessCode}
          </div>
        </div>

        <div className="q-card space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F0F11]">{assessmentInfo.title}</h1>
            <p className="text-sm text-[#6F6F75] mt-1">{assessmentInfo.description || 'Welcome to the Secure Assessment workspace.'}</p>
          </div>

          {/* Policy Checklist */}
          <div className="border-t border-b border-[#0F0F11]/10 py-5 space-y-3 text-xs font-mono text-[#6F6F75]">
            <div className="font-semibold text-[#0F0F11] uppercase tracking-wider mb-2">Exam Integrity Constraints:</div>
            {assessmentInfo.security_policy.fullscreen_required && <div>• Fullscreen display lock is enforced throughout the run</div>}
            {assessmentInfo.security_policy.detect_tab_switch && <div>• Leaving the workspace tab triggers instant log exclusions</div>}
            {assessmentInfo.security_policy.disable_copy && <div>• Clipboard options (Copy/Paste/Cut) are locked</div>}
            {assessmentInfo.security_policy.detect_dev_tools && <div>• Developer tools detection is armed for immediate termination</div>}
          </div>

          {/* System Check */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0F0F11]">Pre-Exam System Readiness</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex items-center justify-between p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-xl col-span-1 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${extensionInstalled ? 'bg-green-500 ring-4 ring-green-100' : 'bg-amber-500 animate-pulse'}`} />
                  <div>
                    <div className="font-medium text-[#0F0F11]">Placify Secure Extension</div>
                    <div className="text-[11px] text-[#6F6F75] mt-0.5">
                      {extensionInstalled 
                        ? 'Extension linked & verified. You are ready to start.' 
                        : 'Required: Sideload/link the companion extension in your browser to take this test.'}
                    </div>
                  </div>
                </div>
                {!extensionInstalled ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger ping check
                      window.postMessage({ source: 'placify-secure-exam-page', type: 'PING_REQUEST' }, '*')
                      window.dispatchEvent(new CustomEvent('placify-ping-request'))
                    }}
                    className="text-xs font-mono px-3 py-1.5 bg-[#0F0F11] text-white hover:bg-[#202024] rounded-lg font-medium transition-colors"
                  >
                    Check Link
                  </button>
                ) : (
                  <span className="text-xs font-mono text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md font-semibold">
                    ✓ Linked
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-xl">
                <Wifi className={`w-4 h-4 ${onlineStatus ? 'text-green-600' : 'text-red-500'}`} />
                <div>
                  <div className="font-medium text-[#0F0F11]">Internet Link</div>
                  <div className="text-[10px] mt-0.5">{onlineStatus ? 'Connected & Stable' : 'Disconnected'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-xl">
                <Shield className={`w-4 h-4 ${browserSupported ? 'text-green-600' : 'text-red-500'}`} />
                <div>
                  <div className="font-medium text-[#0F0F11]">Browser Compatibility</div>
                  <div className="text-[10px] mt-0.5">{browserSupported ? 'Supported Browser' : 'Use Chrome or Microsoft Edge'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-xl">
                <Shield className={`w-4 h-4 ${isFullscreenAllowed ? 'text-green-600' : 'text-red-500'}`} />
                <div>
                  <div className="font-medium text-[#0F0F11]">Fullscreen Capability</div>
                  <div className="text-[10px] mt-0.5">{isFullscreenAllowed ? 'Supported' : 'Fullscreen Not Allowed'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#FAFAF8] border border-[#0F0F11]/5 rounded-xl col-span-1 md:col-span-2 justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${cameraActive ? 'bg-green-600' : 'bg-red-500 animate-pulse'}`} />
                  <div>
                    <div className="font-medium text-[#0F0F11]">Camera Feed Check</div>
                    <div className="text-[10px] mt-0.5">{cameraActive ? 'Camera Active' : 'Camera Required'}</div>
                  </div>
                </div>
                {!cameraActive && (
                  <button onClick={requestCamera} className="text-xs font-semibold px-4 py-2 bg-[#0F0F11] text-white rounded-lg hover:bg-[#161616]">
                    Enable Camera
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleStartExam} className="space-y-4 pt-4 border-t border-[#0F0F11]/10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0F0F11]">Register Credentials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Full Name *"
                className="input-field"
                required
              />
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="Roll No. / Student ID"
                className="input-field"
              />
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="Student Email Address *"
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!extensionInstalled || !onlineStatus || !browserSupported || !cameraActive}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Launch Secure Exam Session
            </button>

            {!extensionInstalled && (
              <p className="text-[10px] text-center text-red-500 font-mono">
                * You must sideload the Placify Secure Extension to bypass integrity locks.
              </p>
            )}
          </form>
        </div>
      </div>
    )
  }

  // 4. Live Exam Workspace View

  return (
    <div
      ref={examContainerRef}
      className="fixed inset-0 bg-[#FAF7F0] z-50 overflow-y-auto select-none"
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        
        {/* Header Dashboard HUD */}
        <div className="q-card flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 shadow-sm border border-x-[#0F0F11]/5 border-b-[#0F0F11]/5 border-t-[8px] border-t-indigo-600 rounded-xl gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[#0F0F11]">{assessmentInfo.title}</h2>
            <div className="flex items-center gap-4 text-xs font-mono text-[#6F6F75]">
              <span>Name: {studentName}</span>
              <span>Attempt ID: {attemptId}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="flex items-center gap-2 font-mono text-sm text-[#0F0F11] bg-[#FAFAF8] px-3.5 py-1.5 border border-[#0F0F11]/5 rounded-xl">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>

            {/* Warn count display */}
            <div className="text-xs font-mono font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1">
              Warnings: {warningCount}/{assessmentInfo.security_policy.max_warnings}
            </div>
          </div>
        </div>

        {/* Floating Proctoring Camera Feed */}
        {cameraActive && (
          <div className="fixed bottom-6 right-6 w-48 h-36 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/50 z-50 transition-opacity">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-mode"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-mono font-bold text-white uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
              Rec
            </div>
          </div>
        )}

        {/* Question Panel */}
        <div className="flex flex-col space-y-6 items-center w-full">
          
          {/* Question Workspace Content */}
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="w-full q-card space-y-6 bg-white border border-[#0F0F11]/5 shadow-sm rounded-xl p-6">
              <div className="flex justify-between items-center border-b border-[#0F0F11]/5 pb-4">
                <span className="text-xs font-mono text-[#A8A8AE] uppercase tracking-wider">
                  Question {qIdx + 1} of {questions.length} • {q.points} Points
                </span>
              </div>

              {/* Question Statement */}
              <div className="text-lg font-medium text-[#0F0F11] leading-relaxed">
                {q.question}
              </div>

              {/* Answers Grid */}
              <div className="space-y-4">
                {/* MCQ Answer Options */}
                {q.type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`w-full flex items-center px-5 py-4 border rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          responses[qIdx] === opt
                            ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm'
                            : 'bg-[#FAFAF8] border-[#0F0F11]/5 text-[#6F6F75] hover:bg-[#FAFAF8]/80 hover:border-[#0F0F11]/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${qIdx}`}
                          checked={responses[qIdx] === opt}
                          onChange={() => handleOptionSelect(qIdx, opt)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-4"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {/* True/False Options */}
                {q.type === 'true_false' && (
                  <div className="grid grid-cols-1 gap-3">
                    {['True', 'False'].map((val) => (
                      <label
                        key={val}
                        className={`w-full flex items-center px-5 py-4 border rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                          responses[qIdx] === val
                            ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm'
                            : 'bg-[#FAFAF8] border-[#0F0F11]/5 text-[#6F6F75] hover:bg-[#FAFAF8]/80 hover:border-[#0F0F11]/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${qIdx}`}
                          checked={responses[qIdx] === val}
                          onChange={() => handleOptionSelect(qIdx, val)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-4"
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                )}

                {/* Text & Short Answer Inputs */}
                {(q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'coding') && (
                  <div className="space-y-2 mt-4">
                    <textarea
                      value={responses[qIdx] || ''}
                      onChange={(e) => handleTextChange(qIdx, e.target.value)}
                      placeholder={q.type === 'coding' ? '// Write your code solution here...' : 'Your answer'}
                      className={`w-full px-4 py-3 border-b-2 border-[#0F0F11]/10 bg-[#FAFAF8] focus:bg-white focus:border-indigo-600 focus:ring-0 transition-all font-mono text-sm leading-relaxed ${q.type === 'short_answer' ? 'h-16' : 'h-48'}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Submit Button Section */}
          <div className="w-full bg-white border border-[#0F0F11]/5 shadow-sm rounded-xl p-6 flex justify-end">
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-8 py-3 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
          
        </div>
      </div>

      {/* Warning Modal Overlay */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-[#0F0F11]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#0F0F11]">Assessment Warning Alert</h3>
              <p className="text-sm text-[#6F6F75] leading-relaxed">
                Suspicious activity has been detected ({lastWarningReason.replace(/_/g, ' ')}). This is your only warning. If another security violation occurs, your exam will be terminated immediately.
              </p>
            </div>
            <button
              onClick={() => {
                setShowWarningModal(false)
                requestFullscreen(examContainerRef.current)
              }}
              className="btn-primary w-full py-3 text-xs uppercase tracking-wider font-semibold"
            >
              Return to Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
