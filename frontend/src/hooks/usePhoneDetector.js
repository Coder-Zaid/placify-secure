import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

/**
 * usePhoneDetector
 * 
 * In-browser client-side ML object detection using TensorFlow.js & COCO-SSD.
 * Continuously monitors the webcam video stream for the 'cell phone' class.
 * 
 * Per security protocol:
 * 1. Obscures content momentarily when a phone is raised.
 * 2. Captures camera evidence snapshot (Base64 JPEG).
 * 3. Silently sends snapshot to the backend warning log (no disruptive alert to candidate).
 * 4. Displays evidence snapshot on the instructor analytics dashboard.
 */
export function usePhoneDetector({ videoRef, cameraActive, attemptId, assessmentId, examStarted, enabled = false }) {
  const [modelLoaded, setModelLoaded] = useState(false)
  const [phoneDetected, setPhoneDetected] = useState(false)
  const [lastDetectionTime, setLastDetectionTime] = useState(0)
  const modelRef = useRef(null)
  const isDetectingRef = useRef(false)
  const lastLoggedTimeRef = useRef(0)
  const consecutiveHitsRef = useRef(0)

  // 1. Dynamically load TensorFlow.js and COCO-SSD scripts ONLY if phone detection is enabled
  useEffect(() => {
    let isMounted = true

    if (!enabled) {
      setModelLoaded(false)
      setPhoneDetected(false)
      return
    }

    const loadScriptsAndModel = async () => {
      try {
        // Load TensorFlow.js
        if (!window.tf) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        // Load COCO-SSD
        if (!window.cocoSsd) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
        }

        if (window.cocoSsd && isMounted) {
          const loadedModel = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' })
          modelRef.current = loadedModel
          setModelLoaded(true)
          console.log('[AI Proctor] COCO-SSD Vision model loaded successfully')
        }
      } catch (err) {
        console.warn('[AI Proctor] TensorFlow/COCO-SSD dynamic load skipped or offline:', err)
      }
    }

    if (examStarted && cameraActive) {
      loadScriptsAndModel()
    }

    return () => {
      isMounted = false
    }
  }, [examStarted, cameraActive, enabled])

  // 2. Continuous detection loop with strict filtering and multi-frame temporal confirmation
  useEffect(() => {
    if (!enabled || !examStarted || !cameraActive || !modelLoaded || !videoRef.current) return

    let clearPhoneTimeout = null

    const interval = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState !== 4 || isDetectingRef.current || !modelRef.current) {
        return
      }

      try {
        isDetectingRef.current = true
        const predictions = await modelRef.current.detect(video)

        // Strict cell phone detection:
        // 1. Must be strictly 'cell phone' (NEVER laptop, mouse, or remote which caused classroom false positives)
        // 2. High confidence threshold >= 0.70 (ignores shadows, classroom lighting glare, and reflections)
        // 3. Minimum bounding box size (ignores distant background specks)
        const phonePrediction = predictions.find(p => {
          if (p.class !== 'cell phone' || p.score < 0.70) return false
          const bbox = p.bbox || []
          const width = bbox[2] || 0
          const height = bbox[3] || 0
          return width >= 30 && height >= 40
        })

        if (phonePrediction) {
          consecutiveHitsRef.current += 1
          
          // Require at least 3 consecutive frames (~1.5s persistent presence) to confirm a phone
          if (consecutiveHitsRef.current >= 3) {
            console.warn('[AI Proctor] Confirmed phone detected:', phonePrediction)
            setPhoneDetected(true)
            setLastDetectionTime(Date.now())

            if (clearPhoneTimeout) clearTimeout(clearPhoneTimeout)
            clearPhoneTimeout = setTimeout(() => {
              setPhoneDetected(false)
            }, 1500)

            // Capture evidence snapshot for instructor review (throttled to 1 per 10s)
            const now = Date.now()
            if (now - lastLoggedTimeRef.current > 10000) {
              lastLoggedTimeRef.current = now

              try {
                const canvas = document.createElement('canvas')
                canvas.width = video.videoWidth || 320
                canvas.height = video.videoHeight || 240
                const ctx = canvas.getContext('2d')
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const snapshotBase64 = canvas.toDataURL('image/jpeg', 0.65)

                if (attemptId && assessmentId) {
                  axios.post(`${API_BASE}/assessment/${assessmentId}/violations`, {
                    attempt_id: attemptId,
                    event_type: 'phone_detected',
                    duration_seconds: 0.0,
                    browser: navigator.userAgent,
                    os: navigator.platform,
                    fullscreen_status: !!document.fullscreenElement,
                    snapshot_data: snapshotBase64
                  }).catch(e => console.error('[AI Proctor] Failed to send violation:', e))
                }
              } catch (snapErr) {
                console.error('[AI Proctor] Failed to capture snapshot:', snapErr)
              }
            }
          }
        } else {
          // If no phone detected in this frame, reset consecutive hits counter
          consecutiveHitsRef.current = 0
        }
      } catch (detectErr) {
        // Ignore single frame error
      } finally {
        isDetectingRef.current = false
      }
    }, 500)

    return () => {
      clearInterval(interval)
      if (clearPhoneTimeout) clearTimeout(clearPhoneTimeout)
    }
  }, [enabled, examStarted, cameraActive, modelLoaded, attemptId, assessmentId, videoRef])

  return {
    modelLoaded,
    phoneDetected,
    lastDetectionTime
  }
}
