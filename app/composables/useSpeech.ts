export function useSpeech(onResult: (text: string) => void) {
  const isBrowser = process.client && typeof window !== "undefined"
  const SR = isBrowser
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null

  const supported = isBrowser && !!SR
  let rec: any = null
  const listening = ref(false)

  function start() {
    if (!SR) return
    rec = new SR()
    rec.lang = "ru-RU"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript)
    rec.onend = () => { listening.value = false }
    rec.onerror = () => { listening.value = false }
    rec.start()
    listening.value = true
  }

  function stop() {
    rec?.stop()
  }

  return { supported, listening, start, stop }
}
