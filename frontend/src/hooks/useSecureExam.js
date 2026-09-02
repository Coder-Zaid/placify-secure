import { useState, useEffect, useRef } from 'react'

export function useSecureExam({
  attemptId,
  assessmentId,
  policy = {},
  onWarning,
  onTerminate,
  onLogViolation
}) {
  const [warningCount, setWarningCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExtensionActive, setIsExtensionActive] = useState(false)
  const [extensionVersion, setExtensionVersion] = useState('')
  const [isExamTabActive, setIsExamTabActive] = useState(true)
  
  const blurTimeoutRef = useRef(null)
  const lastEventTimeRef = useRef(Date.now())

  const maxWarnings = policy.max_warnings ?? 1
  const gracePeriodSeconds = policy.grace_period_seconds ?? 2

  // 1. Detect browser name and OS info
  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    if (ua.includes("Edg")) return "Microsoft Edge"
    if (ua.includes("Chrome")) return "Chrome"
    if (ua.includes("Firefox")) return "Firefox"
    return "Unknown Browser"
  }

  const getOSInfo = () => {
    const ua = navigator.userAgent
    if (ua.includes("Win")) return "Windows"
    if (ua.includes("Mac")) return "macOS"
    if (ua.includes("Linux")) return "Linux"
    return "Unknown OS"
  }

  const logViolationEvent = async (eventType, duration = 0.0) => {
    const eventPayload = {
      attempt_id: attemptId,
      event_type: eventType,
      duration_seconds: duration,
      browser: getBrowserInfo(),
      os: getOSInfo(),
      fullscreen_status: !!document.fullscreenElement
    }
    
    if (onLogViolation) {
      await onLogViolation(eventPayload)
    }
  }

  const triggerViolation = (eventType, duration = 0.0) => {
    setWarningCount(prev => {
      const nextCount = prev + 1
      logViolationEvent(eventType, duration)
      
      // Immediate termination events
      const immediateTerminationEvents = ["dev_tools", "extension_removed", "multiple_tabs"]
      
      if (immediateTerminationEvents.includes(eventType) || nextCount > maxWarnings) {
        if (onTerminate) onTerminate(eventType)
      } else {
        if (onWarning) onWarning(eventType)
      }
      return nextCount
    })
  }

  useEffect(() => {
    if (!attemptId) return

    // 2. Fullscreen Enforcement
    const handleFullscreenChange = () => {
      const activeFS = !!document.fullscreenElement
      setIsFullscreen(activeFS)
      
      if (policy.fullscreen_required && !activeFS) {
        triggerViolation("fullscreen_exit")
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    // 3. Tab Visibility (Visibility API)
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      setIsExamTabActive(isVisible)
      
      if (policy.detect_tab_switch && !isVisible) {
        triggerViolation("tab_switch")
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // 4. Window Focus / Blur with Grace Period
    const handleWindowBlur = () => {
      if (policy.detect_window_blur) {
        lastEventTimeRef.current = Date.now()
        // Wait for grace period before triggering violation to ignore notifications or system dialogues
        blurTimeoutRef.current = setTimeout(() => {
          const duration = (Date.now() - lastEventTimeRef.current) / 1000
          triggerViolation("window_blur", duration)
        }, gracePeriodSeconds * 1000)
      }
    }

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = null
      }
    }

    window.addEventListener("blur", handleWindowBlur)
    window.addEventListener("focus", handleWindowFocus)

    // 5. Input & Clipboard Restrictions
    const preventDefault = (e) => e.preventDefault()
    
    if (policy.disable_copy) document.addEventListener("copy", preventDefault)
    if (policy.disable_paste) document.addEventListener("paste", preventDefault)
    if (policy.disable_cut) document.addEventListener("cut", preventDefault)
    if (policy.disable_print) {
      window.addEventListener("beforeprint", preventDefault)
      // Capture Ctrl+P key binding
      const handlePrintKey = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
          e.preventDefault()
          triggerViolation("print_attempt")
        }
      }
      window.addEventListener("keydown", handlePrintKey)
    }
    if (policy.disable_right_click) document.addEventListener("contextmenu", preventDefault)
    if (policy.disable_selection) {
      document.body.style.userSelect = "none"
      document.body.style.webkitUserSelect = "none"
    }

    // Keyboard Shortcuts Monitoring
    const handleKeyDown = (e) => {
      // Prevent Refresh (F5, Ctrl+R, Cmd+R)
      if (policy.disable_refresh) {
        if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
          e.preventDefault()
          triggerViolation("refresh_attempt")
        }
      }
      // Prevent developer tools triggers
      if (policy.detect_dev_tools) {
        if (e.key === 'F12' || 
            ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
            ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'I' || e.key === 'i'))) {
          e.preventDefault()
          triggerViolation("dev_tools")
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    // 6. Communication with companion extension
    let lastPingReceived = Date.now()
    
    const handleExtensionMessage = (e) => {
      if (e.data && e.data.source === 'placify-secure-extension') {
        if (e.data.type === 'PING_RESPONSE') {
          setIsExtensionActive(true)
          setExtensionVersion(e.data.version)
          lastPingReceived = Date.now()
        }
        if (e.data.type === 'VIOLATION_EVENT') {
          triggerViolation(e.data.eventType)
        }
      }
    }
    window.addEventListener("message", handleExtensionMessage)

    // Initial ping to extension
    window.postMessage({ source: 'placify-secure-exam-page', type: 'PING_REQUEST' }, '*')

    // Extension heartbeat monitoring
    const extensionCheckInterval = setInterval(() => {
      window.postMessage({ source: 'placify-secure-exam-page', type: 'PING_REQUEST' }, '*')
      
      // If we haven't received a ping response in the last 12 seconds, assume extension is removed
      if (Date.now() - lastPingReceived > 12000) {
        if (policy.detect_extension_removal) {
          triggerViolation("extension_removed")
        }
        setIsExtensionActive(false)
      }
    }, 5000)

    // Cleanups
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleWindowBlur)
      window.removeEventListener("focus", handleWindowFocus)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("message", handleExtensionMessage)
      clearInterval(extensionCheckInterval)
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)

      if (policy.disable_copy) document.removeEventListener("copy", preventDefault)
      if (policy.disable_paste) document.removeEventListener("paste", preventDefault)
      if (policy.disable_cut) document.removeEventListener("cut", preventDefault)
      if (policy.disable_right_click) document.removeEventListener("contextmenu", preventDefault)
      if (policy.disable_selection) {
        document.body.style.userSelect = "auto"
        document.body.style.webkitUserSelect = "auto"
      }
    }
  }, [attemptId, assessmentId, policy])

  const requestFullscreen = async (element) => {
    try {
      if (element && element.requestFullscreen) {
        await element.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch (err) {
      console.error("Failed to enter fullscreen mode:", err)
    }
  }

  return {
    warningCount,
    isFullscreen,
    isExtensionActive,
    extensionVersion,
    isExamTabActive,
    requestFullscreen
  }
}
