/**
 * Audio Duration Helper
 * 
 * Get MP3 duration without playing the audio file
 */

export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration)
      audio.remove() // Clean up
    })
    
    audio.addEventListener('error', (error) => {
      reject(new Error(`Failed to load audio: ${error}`))
    })
    
    // Load the audio
    audio.load()
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (audio.readyState < 2) { // HAVE_METADATA
        reject(new Error('Timeout loading audio metadata'))
      }
    }, 10000)
  })
}
