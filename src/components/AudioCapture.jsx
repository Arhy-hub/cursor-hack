import { useEffect, useRef, useState } from 'react'

export default function AudioCapture({ active, onTranscriptChunk, onInterim, onModeChange }) {
  const recognitionRef = useRef(null)
  const [micStatus, setMicStatus] = useState('IDLE')

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      onModeChange('fallback')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          const now = new Date()
          const timestamp = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
          onTranscriptChunk({ timestamp, speaker: 'caller', text: transcript.trim() })
          onInterim('')
        } else {
          interim += transcript
        }
      }
      if (interim) onInterim(interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicStatus('ERROR')
        onModeChange('fallback')
      } else {
        setMicStatus('ERROR')
      }
    }

    recognition.onstart = () => {
      setMicStatus('LISTENING')
      onModeChange('live')
    }

    recognition.onend = () => {
      setMicStatus('PAUSED')
      if (active) {
        try { recognition.start() } catch {}
      }
    }

    recognitionRef.current = recognition
  }, [])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (active) {
      try {
        recognition.start()
      } catch (err) {
        if (err.name !== 'InvalidStateError') {
          onModeChange('fallback')
        }
      }
    } else {
      try {
        recognition.stop()
        setMicStatus('PAUSED')
      } catch {}
    }
  }, [active])

  return null
}
