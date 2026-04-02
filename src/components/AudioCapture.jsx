import { useEffect, useRef } from 'react'
import { DeepgramClient } from '@deepgram/sdk'

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowTs() {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export default function AudioCapture({ stream, onTranscriptChunk, onInterim, onModeChange, onLog }) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const audioStream = stream?.audio ?? null
    if (audioStream) {
      startDeepgram(audioStream)
    }
    return () => stopTranscription()
  }, [stream])

  async function startDeepgram(audioStream) {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY
    if (!apiKey) {
      onLog({ type: 'ERROR', message: 'VITE_DEEPGRAM_API_KEY is not set', timestamp: new Date().toISOString() })
      return
    }

    const tracks = audioStream.getAudioTracks()
    onLog({ type: 'PROCESSING', message: `Audio stream acquired — ${tracks.length} track(s): ${tracks.map(t => t.label || t.id).join(', ')}`, timestamp: new Date().toISOString() })

    try {
      const dg = new DeepgramClient({ apiKey })
      const socket = await dg.listen.v1.connect({
        model: 'nova-2',
        language: 'en-GB',
        smart_format: true,
        punctuate: true,
        interim_results: true,
        utterance_end_ms: 1000
      })
      socketRef.current = socket

      socket.on('open', () => {
        onLog({ type: 'VERIFIED', message: 'Deepgram connection open — recording started', timestamp: new Date().toISOString() })

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

        let chunkCount = 0
        const recorder = new MediaRecorder(audioStream, { mimeType })
        mediaRecorderRef.current = recorder

        recorder.addEventListener('dataavailable', (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data)
            chunkCount++
            if (chunkCount === 1) {
              onLog({ type: 'PROCESSING', message: 'Audio data flowing to Deepgram', timestamp: new Date().toISOString() })
            }
          }
        })

        recorder.start(250)
        onModeChange('live')
      })

      socket.on('message', (data) => {
        if (data?.type !== 'Results') return
        const transcript = data.channel?.alternatives?.[0]?.transcript?.trim()
        if (!transcript) return

        const confidence = data.channel?.alternatives?.[0]?.confidence ?? null
        if (data.is_final) {
          onTranscriptChunk({ timestamp: nowTs(), speaker: 'caller', text: transcript, confidence })
          onInterim('')
        } else {
          onInterim(transcript)
        }
      })

      socket.on('error', (err) => {
        onLog({ type: 'ERROR', message: `Deepgram error: ${err?.message || err}`, timestamp: new Date().toISOString() })
      })

      socket.on('close', (event) => {
        onLog({ type: 'PROCESSING', message: `Deepgram connection closed (code ${event?.code})`, timestamp: new Date().toISOString() })
      })

    } catch (err) {
      onLog({ type: 'ERROR', message: `Deepgram init failed: ${err.message}`, timestamp: new Date().toISOString() })
    }
  }

  function stopTranscription() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    socketRef.current?.finish?.()
    socketRef.current = null
  }

  return null
}
