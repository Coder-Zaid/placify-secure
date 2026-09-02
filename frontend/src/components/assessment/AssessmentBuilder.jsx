import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Shield, Settings, HelpCircle, Save, BookOpen, AlertTriangle } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

const DEFAULT_SECURITY_POLICY = {
  fullscreen_required: true,
  single_tab: true,
  disable_copy: true,
  disable_paste: true,
  disable_cut: true,
  disable_print: true,
  disable_right_click: true,
  disable_selection: true,
  disable_refresh: true,
  disable_back_navigation: true,
  detect_dev_tools: true,
  detect_fullscreen_exit: true,
  detect_tab_switch: true,
  detect_window_blur: true,
  detect_window_minimize: true,
  detect_extension_removal: true,
  max_warnings: 1,
  grace_period_seconds: 2
}

export default function AssessmentBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [passingScore, setPassingScore] = useState(50)
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const [questions, setQuestions] = useState([])
  const [securityPolicy, setSecurityPolicy] = useState(DEFAULT_SECURITY_POLICY)

  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
    if (isEdit) {
      fetchAssessment()
    }
  }, [id])

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/assessment/templates`)
      if (res.data && res.data.templates && res.data.templates.length > 0) {
        setTemplates(res.data.templates)
        return
      }
    } catch (err) {
      console.error("Error fetching templates:", err)
    }

    // Fallback preset template for testing
    setTemplates([
      {
        id: "preset-1",
        title: "Basic Software Engineering Quiz",
        description: "A simple preset test to verify the assessment system.",
        duration_minutes: 15,
        passing_score: 50,
        questions: [
          {
            type: "mcq",
            question: "What does HTML stand for?",
            options: ["Hyper Text Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hyper Tool Markup Language"],
            answer: "Hyper Text Markup Language",
            points: 2,
            negative_marking: 0.0
          },
          {
            type: "true_false",
            question: "JavaScript is a statically typed language.",
            options: ["True", "False"],
            answer: "False",
            points: 1,
            negative_marking: 0.5
          },
          {
            type: "short_answer",
            question: "What does CSS stand for?",
            answer: "Cascading Style Sheets",
            points: 2,
            negative_marking: 0.0
          },
          {
            type: "coding",
            question: "Write a JavaScript function named 'add' that takes two parameters and returns their sum.",
            answer: "function add(a, b) {\n  return a + b;\n}",
            points: 5,
            negative_marking: 0.0
          }
        ]
      }
    ])
  }

  const fetchAssessment = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/assessment/${id}`)
      const data = res.data
      setTitle(data.title)
      setDescription(data.description)
      setDurationMinutes(data.duration_minutes)
      setPassingScore(data.passing_score)
      setMaxAttempts(data.max_attempts)
      setRandomizeQuestions(data.randomize_questions)
      setShuffleOptions(data.shuffle_options)
      setQuestions(data.questions || [])
      setSecurityPolicy(data.security_policy || DEFAULT_SECURITY_POLICY)
    } catch (err) {
      console.error("Error fetching assessment:", err)
      alert("Failed to load assessment details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyTemplate = (templateId) => {
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl) return
    setTitle(tmpl.title)
    setDescription(tmpl.description)
    setDurationMinutes(tmpl.duration_minutes)
    setPassingScore(tmpl.passing_score)
    setQuestions(tmpl.questions || [])
  }

  const handleAddQuestion = (type = 'mcq') => {
    const newQ = {
      type,
      question: '',
      points: 2,
      negative_marking: 0.0
    }
    if (type === 'mcq') {
      newQ.options = ['', '', '', '']
      newQ.answer = ''
    } else if (type === 'true_false') {
      newQ.options = ['True', 'False']
      newQ.answer = 'True'
    } else {
      newQ.options = null
      newQ.answer = ''
    }
    setQuestions([...questions, newQ])
  }

  const handleQuestionChange = (index, key, val) => {
    const updated = [...questions]
    updated[index][key] = val
    setQuestions(updated)
  }

  const handleOptionChange = (qIdx, optIdx, val) => {
    const updated = [...questions]
    updated[qIdx].options[optIdx] = val
    setQuestions(updated)
  }

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handlePolicyToggle = (key) => {
    setSecurityPolicy(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handlePolicyNumChange = (key, val) => {
    setSecurityPolicy(prev => ({
      ...prev,
      [key]: parseInt(val) || 0
    }))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the assessment.")
      return
    }
    if (questions.length === 0) {
      alert("Please add at least one question.")
      return
    }

    const payload = {
      title,
      description,
      duration_minutes: durationMinutes,
      passing_score: passingScore,
      max_attempts: maxAttempts,
      randomize_questions: randomizeQuestions,
      shuffle_options: shuffleOptions,
      questions,
      security_policy: securityPolicy
    }

    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/assessment/update/${id}`, payload)
      } else {
        await axios.post(`${API_BASE}/assessment/create`, payload)
      }
      navigate('/assessments')
    } catch (err) {
      console.error("Error saving assessment:", err)
      alert("Error saving assessment: " + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="flex justify-between items-center border-b border-[#0F0F11]/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F0F11]">
            {isEdit ? 'Edit Assessment Campaign' : 'Create Assessment Campaign'}
          </h1>
          <p className="text-sm text-[#6F6F75] mt-1">Configure evaluation campaigns, questions, and custom browser integrity policies.</p>
        </div>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Assessment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Parameters & Security */}
        <div className="lg:col-span-4 space-y-8">
          {/* Templates */}
          {!isEdit && templates.length > 0 && (
            <div className="q-card space-y-4">
              <h3 className="text-sm font-semibold text-[#0F0F11] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#A8A8AE]" />
                Template Library
              </h3>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t.id)}
                    className="w-full text-left p-3 border border-[#0F0F11]/10 rounded-xl hover:border-[#0F0F11] hover:bg-[#FAFAF8] transition text-xs font-mono"
                  >
                    <div className="font-semibold text-[#0F0F11] mb-1">{t.title}</div>
                    <div className="text-[#6F6F75] line-clamp-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assessment Parameters */}
          <div className="q-card space-y-6">
            <h3 className="text-sm font-semibold text-[#0F0F11] uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#A8A8AE]" />
              Exam Parameters
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Assessment Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Frontend Engineering Quiz"
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Instructions</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide instruction details here..."
                  className="textarea-field h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Duration (Min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Passing Score %</label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Max Allowed Attempts</label>
                <input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                  className="input-field"
                />
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="rounded border-gray-300 text-[#0F0F11] focus:ring-[#0F0F11]"
                  />
                  <span className="text-xs font-medium text-[#0F0F11]">Randomize questions flow</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded border-gray-300 text-[#0F0F11] focus:ring-[#0F0F11]"
                  />
                  <span className="text-xs font-medium text-[#0F0F11]">Shuffle option parameters</span>
                </label>
              </div>
            </div>
          </div>

          {/* Security Policy Settings */}
          <div className="q-card space-y-6">
            <h3 className="text-sm font-semibold text-[#0F0F11] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#A8A8AE]" />
              Exam Security Policy
            </h3>

            <div className="space-y-4">
              {Object.keys(DEFAULT_SECURITY_POLICY).map(key => {
                if (key === 'max_warnings' || key === 'grace_period_seconds') return null
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-xs font-mono text-[#6F6F75] capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => handlePolicyToggle(key)}
                      data-state={securityPolicy[key] ? "checked" : "unchecked"}
                      className="toggle-switch"
                    >
                      <span className="toggle-dot" />
                    </button>
                  </div>
                )
              })}

              <div className="grid grid-cols-2 gap-4 border-t border-[#0F0F11]/10 pt-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Max Warnings</label>
                  <input
                    type="number"
                    value={securityPolicy.max_warnings}
                    onChange={(e) => handlePolicyNumChange('max_warnings', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Grace Period (Sec)</label>
                  <input
                    type="number"
                    value={securityPolicy.grace_period_seconds}
                    onChange={(e) => handlePolicyNumChange('grace_period_seconds', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Question Bank */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center bg-white border border-[#0F0F11]/5 rounded-[20px] p-6 shadow-sm">
            <h2 className="text-lg font-medium tracking-tight">Question Bank ({questions.length} questions)</h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleAddQuestion('mcq')}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                MCQ
              </button>
              <button
                onClick={() => handleAddQuestion('true_false')}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                T/F
              </button>
              <button
                onClick={() => handleAddQuestion('short_answer')}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Short Text
              </button>
              <button
                onClick={() => handleAddQuestion('coding')}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Coding
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="q-card text-center py-16 text-[#6F6F75] border-dashed border-2">
              <HelpCircle className="w-10 h-10 mx-auto text-[#A8A8AE] mb-3 stroke-[1.5]" />
              <p className="text-sm">Click above to populate your question bank catalog.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="q-card space-y-6 relative border border-[#0F0F11]/10 bg-white">
                  <div className="flex justify-between items-center border-b border-[#0F0F11]/5 pb-4">
                    <span className="text-xs font-mono text-[#A8A8AE] uppercase tracking-widest font-semibold">
                      Question #{qIdx + 1} ({q.type.toUpperCase()})
                    </span>
                    <button
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="p-1.5 text-[#A8A8AE] hover:text-red-600 rounded-lg hover:bg-red-50/50 transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Question Statement</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                      placeholder="Type the question content here..."
                      className="textarea-field h-20"
                    />
                  </div>

                  {/* Options (MCQ only) */}
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Options Catalog</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 bg-[#FAFAF8] px-3.5 py-1 border border-[#0F0F11]/5 rounded-xl">
                            <span className="text-xs font-mono text-[#A8A8AE] uppercase">{String.fromCharCode(65 + optIdx)}</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="bg-transparent outline-none text-sm text-[#0F0F11] w-full py-2"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Correct Target Answer</label>
                      {q.type === 'true_false' ? (
                        <select
                          value={q.answer}
                          onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                          className="input-field"
                        >
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      ) : q.type === 'mcq' && q.options ? (
                        <select
                          value={q.answer}
                          onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Select correct option...</option>
                          {q.options.map((opt, idx) => (
                            <option key={idx} value={opt}>
                              {opt ? `${String.fromCharCode(65 + idx)}: ${opt}` : `Empty Option ${String.fromCharCode(65 + idx)}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={q.answer}
                          onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                          placeholder="e.g. answer key value"
                          className="input-field"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Points</label>
                        <input
                          type="number"
                          value={q.points}
                          onChange={(e) => handleQuestionChange(qIdx, 'points', parseInt(e.target.value) || 1)}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#6F6F75] uppercase tracking-wider">Negative Mark</label>
                        <input
                          type="number"
                          step="0.25"
                          value={q.negative_marking}
                          onChange={(e) => handleQuestionChange(qIdx, 'negative_marking', parseFloat(e.target.value) || 0.0)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
