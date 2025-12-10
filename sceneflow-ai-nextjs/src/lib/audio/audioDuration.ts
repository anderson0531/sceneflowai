/**
 * Audio Duration Helper
 * 
 * Get MP3 duration without playing the audio file
 * Properly cancels preload when done to prevent ghost audio
 */

export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    let resolved = false
    
    const cleanup = () => {
      if (!resolved) return
      // Properly cancel the preload to prevent ghost audio
      audio.pause()
      audio.src = ''  // Clear source to cancel any ongoing preload
      audio.load()    // Reset the element
      try {
        audio.remove()
      } catch (e) {
        // Ignore removal errors
      }
    }
    
    audio.addEventListener('loadedmetadata', () => {
      resolved = true
      const duration = audio.duration
      cleanup()
      resolve(duration)
    })
    
    audio.addEventListener('error', (error) => {
      resolved = true
      cleanup()
      reject(new Error(`Failed to load audio: ${error}`))
    })
    
    // Set source and load
    audio.src = url
    audio.load()
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!resolved && audio.readyState < 2) { // HAVE_METADATA
        resolved = true
        cleanup()
        reject(new Error('Timeout loading audio metadata'))
      }
    }, 10000)
  })
}
