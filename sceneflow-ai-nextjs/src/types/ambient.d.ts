declare global {
  // Minimal SpeechRecognition types
  type SpeechRecognition = any
  type RecognitionConstructor = new () => SpeechRecognition
  interface Window {
    webkitSpeechRecognition?: RecognitionConstructor
    SpeechRecognition?: RecognitionConstructor
  }
  interface SpeechRecognitionResultList extends ArrayLike<SpeechRecognitionResult> {
    [index: number]: SpeechRecognitionResult
    length: number
  }
  interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }
  interface SpeechRecognitionResult {
    isFinal: boolean
    length: number
    [index: number]: SpeechRecognitionAlternative
  }
  interface SpeechRecognitionEvent {
    resultIndex: number
    results: SpeechRecognitionResultList
  }
}

export {}

// External modules without types
declare module 'shotstack-sdk';
declare module 'pdfjs-dist/build/pdf' {
  const content: any
  export default content
}
