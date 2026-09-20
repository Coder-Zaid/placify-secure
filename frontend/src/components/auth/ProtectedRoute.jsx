import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const isAuth =
    sessionStorage.getItem('placify_instructor_auth') === 'true' ||
    localStorage.getItem('placify_instructor_auth') === 'true'

  if (!isAuth) {
    return <Navigate to="/instructor/login" replace state={{ from: location }} />
  }

  return children
}
