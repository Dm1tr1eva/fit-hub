type SpeechOptions = {
  lang?: string
  /** Live partial transcript (Web Speech path) — fires repeatedly while speaking. */
  onPartial?: (text: string) => void
  /** Final transcript (both paths). */
  onResult?: (text: string) => void
}

const BARS = 28

/**
 * Voice input with two paths:
 *  - Web Speech API (Google's on-device/cloud ASR) — live, word-by-word, like a
 *    phone keyboard. Works in Google Chrome and most Edge builds.
 *  - Fallback: record the mic and transcribe server-side with Gemini — used when
 *    Web Speech is missing or fails (Brave / Vivaldi / Arc emit a "network"
 *    error because they lack Google's private speech key).
 *
 * Only ONE mic capture is open at a time: in Web Speech mode we do NOT open a
 * parallel getUserMedia stream, so the recognizer is never disturbed.
 */
export function useSpeech(opts: SpeechOptions = {}) {
  const { lang = "ru-RU", onPartial, onResult } = opts

  const isBrowser = import.meta.client && typeof window !== "undefined"
  const SR = isBrowser
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null
  const supported =
    isBrowser &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"

  const listening = ref(false)
  const transcribing = ref(false)
  const error = ref("")
  const mode = ref<"speech" | "gemini" | null>(null)
  /** Waveform amplitudes (0..1) — only used in the Gemini (recording) path. */
  const levels = ref<number[]>(Array(BARS).fill(0))

  // Gemini-path resources
  let stream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let raf = 0

  // Web Speech state
  let rec: any = null
  let speechFinal = ""
  let lastSpeechStart = 0
  let networkFailed = false

  // shared flags
  let discarded = false
  let stopping = false
  /** Set once Web Speech proves unavailable, so later takes skip straight to Gemini. */
  let speechUnavailable = false

  // ---------------------------------------------------------------- waveform
  function drawWaveform() {
    if (!analyser) return
    const buf = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buf)
    const block = Math.floor(buf.length / BARS)
    const next: number[] = new Array(BARS)
    for (let i = 0; i < BARS; i++) {
      let sum = 0
      for (let j = 0; j < block; j++) {
        const v = (buf[i * block + j] - 128) / 128
        sum += v * v
      }
      next[i] = Math.min(1, Math.sqrt(sum / block) * 4)
    }
    levels.value = next
    raf = requestAnimationFrame(drawWaveform)
  }
  function stopWaveform() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    levels.value = Array(BARS).fill(0)
  }
  function releaseStream() {
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
    analyser = null
    audioCtx?.close().catch(() => {})
    audioCtx = null
  }

  // ------------------------------------------------------------- WAV helpers
  function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const sampleRate = audioBuffer.sampleRate
    const src = audioBuffer.getChannelData(0)
    // Peak-normalize so quiet recordings reach full scale before transcription.
    let peak = 0
    for (let i = 0; i < src.length; i++) peak = Math.max(peak, Math.abs(src[i]))
    const gain = peak > 0 ? Math.min(20, 0.97 / peak) : 1

    const buffer = new ArrayBuffer(44 + src.length * 2)
    const view = new DataView(buffer)
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
    }
    writeStr(0, "RIFF")
    view.setUint32(4, 36 + src.length * 2, true)
    writeStr(8, "WAVE")
    writeStr(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeStr(36, "data")
    view.setUint32(40, src.length * 2, true)
    let off = 44
    for (let i = 0; i < src.length; i++) {
      const s = Math.max(-1, Math.min(1, src[i] * gain))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
    return buffer
  }
  function toBase64(ab: ArrayBuffer): string {
    const bytes = new Uint8Array(ab)
    let binary = ""
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  }

  async function transcribeBlob(blob: Blob) {
    transcribing.value = true
    try {
      const arrayBuf = await blob.arrayBuffer()
      // Decode straight to 16 kHz mono — the rate speech models expect.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })
      const audioBuffer = await ctx.decodeAudioData(arrayBuf)
      ctx.close().catch(() => {})

      if (audioBuffer.length < audioBuffer.sampleRate * 0.3) {
        error.value = "Recording too short"
        return
      }

      const { text } = await $fetch<{ text: string }>("/api/transcribe", {
        method: "POST",
        body: { audio: toBase64(encodeWav(audioBuffer)), mimeType: "audio/wav" },
      })
      if (text) onResult?.(text)
      else error.value = "Couldn't recognize speech, try again"
    } catch {
      error.value = "Couldn't recognize speech"
    } finally {
      transcribing.value = false
    }
  }

  // ----------------------------------------------------------- Web Speech path
  function finalizeSpeech() {
    stopping = false
    mode.value = null
    const text = speechFinal.replace(/\s+/g, " ").trim()
    if (discarded) return
    if (text) onResult?.(text)
    else error.value = "Couldn't recognize speech, try again"
  }

  function startSpeech(): boolean {
    try {
      rec = new SR()
    } catch {
      return false
    }
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) speechFinal += r[0].transcript
        else interim += r[0].transcript
      }
      onPartial?.((speechFinal + interim).replace(/\s+/g, " ").trim())
    }
    rec.onerror = (e: any) => {
      const code = e?.error
      if (code === "network" || code === "service-not-allowed") {
        speechUnavailable = true
        networkFailed = true
      } else if (code === "not-allowed") {
        error.value = "No microphone access. Allow it in your browser settings."
        discarded = true
      }
      // "no-speech" / "aborted" are benign
    }
    rec.onend = () => {
      rec = null
      if (discarded) return
      if (stopping) return finalizeSpeech()
      if (networkFailed) {
        // Web Speech can't reach the recognizer in this browser → use Gemini.
        networkFailed = false
        listening.value = false
        startGemini()
        return
      }
      // Ended on its own (silence). Keep listening unless it's tight-looping.
      if (listening.value && Date.now() - lastSpeechStart > 800) startSpeech()
      else if (listening.value) finalizeSpeech()
    }

    try {
      lastSpeechStart = Date.now()
      rec.start()
      return true
    } catch {
      rec = null
      return false
    }
  }

  // -------------------------------------------------------------- Gemini path
  async function startGemini() {
    mode.value = "gemini"
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (e: any) {
      error.value =
        e?.name === "NotAllowedError"
          ? "No microphone access. Allow it in your browser settings."
          : "Couldn't start the microphone"
      mode.value = null
      return
    }

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      await audioCtx.resume()
      const source = audioCtx.createMediaStreamSource(stream)
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      drawWaveform()
    } catch {
      /* waveform optional */
    }

    chunks = []
    recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = async () => {
      stopWaveform()
      const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" })
      releaseStream()
      recorder = null
      mode.value = null
      if (discarded || blob.size === 0) return
      await transcribeBlob(blob)
    }
    recorder.start()
    listening.value = true
  }

  // ------------------------------------------------------------------ controls
  async function start() {
    if (!supported || listening.value || transcribing.value) return
    error.value = ""
    discarded = false
    stopping = false
    networkFailed = false
    speechFinal = ""

    if (SR && !speechUnavailable) {
      mode.value = "speech"
      if (startSpeech()) {
        listening.value = true
      } else {
        speechUnavailable = true
        mode.value = null
        await startGemini()
      }
    } else {
      await startGemini()
    }
  }

  /** Stop and use whatever was recognized. */
  function stop() {
    if (!listening.value) return
    listening.value = false
    if (mode.value === "speech") {
      stopping = true
      if (rec) {
        try {
          rec.stop()
        } catch {
          finalizeSpeech()
        }
      } else {
        finalizeSpeech()
      }
    } else if (recorder && recorder.state !== "inactive") {
      recorder.stop() // → onstop → Gemini
    } else {
      stopWaveform()
      releaseStream()
      mode.value = null
    }
  }

  /** Stop and discard. */
  function cancel() {
    discarded = true
    listening.value = false
    stopping = false
    mode.value = null
    try {
      rec?.abort()
    } catch {
      /* noop */
    }
    rec = null
    stopWaveform()
    if (recorder && recorder.state !== "inactive") recorder.stop()
    else releaseStream()
  }

  if (isBrowser) {
    onScopeDispose(() => {
      discarded = true
      try {
        rec?.abort()
      } catch {
        /* noop */
      }
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop()
      } catch {
        /* noop */
      }
      stopWaveform()
      releaseStream()
    })
  }

  return { supported, listening, transcribing, error, mode, levels, start, stop, cancel }
}
