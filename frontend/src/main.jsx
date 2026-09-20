import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StudentEntry from './components/assessment/StudentEntry'
import AssessmentDashboard from './components/assessment/AssessmentDashboard'
import AssessmentBuilder from './components/assessment/AssessmentBuilder'
import StudentPortal from './components/assessment/StudentPortal'
import AssessmentAnalytics from './components/assessment/AssessmentAnalytics'
import InstructorLogin from './components/auth/InstructorLogin'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NotFound from './components/common/NotFound'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Student Entry */}
        <Route path="/" element={<StudentEntry />} />
        <Route path="/exam/:accessCode" element={<StudentPortal />} />

        {/* Instructor Authentication */}
        <Route path="/login" element={<InstructorLogin />} />
        <Route path="/instructor/login" element={<InstructorLogin />} />

        {/* Protected Instructor Routes */}
        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <AssessmentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/new"
          element={
            <ProtectedRoute>
              <AssessmentBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:id/edit"
          element={
            <ProtectedRoute>
              <AssessmentBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:id/analytics"
          element={
            <ProtectedRoute>
              <AssessmentAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Typo and 404 Fallback */}
        <Route path="/assesments" element={<Navigate to="/assessments" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
