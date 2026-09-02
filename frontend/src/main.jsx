import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AssessmentDashboard from './components/assessment/AssessmentDashboard'
import AssessmentBuilder from './components/assessment/AssessmentBuilder'
import StudentPortal from './components/assessment/StudentPortal'
import AssessmentAnalytics from './components/assessment/AssessmentAnalytics'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/assessments" replace />} />
        <Route path="/assessments" element={<AssessmentDashboard />} />
        <Route path="/assessments/new" element={<AssessmentBuilder />} />
        <Route path="/assessments/:id/edit" element={<AssessmentBuilder />} />
        <Route path="/assessments/:id/analytics" element={<AssessmentAnalytics />} />
        <Route path="/exam/:accessCode" element={<StudentPortal />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
