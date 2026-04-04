export function isSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startListening(onResult, onInterim, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) { onError?.('not_supported'); return null }

  const recognition = new SpeechRecognition()
  recognition.lang = 'es-MX'
  recognition.continuous = false
  recognition.interimResults = true

  recognition.onresult = (event) => {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) final += event.results[i][0].transcript
      else interim += event.results[i][0].transcript
    }
    if (interim) onInterim?.(interim)
    if (final) onResult?.(final)
  }

  recognition.onerror = (e) => onError?.(e.error)
  recognition.start()
  return recognition
}

export function stopListening(recognition) {
  recognition?.stop()
}
