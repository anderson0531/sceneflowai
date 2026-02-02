'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Film, 
  FileVideo, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

interface UploadedScreening {
  id: string
  title: string
  description: string
  duration: number
  videoUrl: string
  thumbnailUrl?: string
  genre: string
  targetAudience: string
  createdAt: Date
}

interface ExternalUploadProps {
  onUploadComplete: (screening: UploadedScreening) => void
  onCancel?: () => void
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

const ACCEPTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm']
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB

const GENRE_OPTIONS = [
  'Drama',
  'Comedy',
  'Action',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Documentary',
  'Animation',
  'Romance',
  'Other'
]

const AUDIENCE_OPTIONS = [
  'General Audience',
  'Film Industry Professionals',
  'Festival Programmers',
  'Investors/Producers',
  'Focus Group',
  'Friends & Family',
  'Internal Team'
]

export function ExternalUpload({ onUploadComplete, onCancel }: ExternalUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `Unsupported format. Please upload MP4, MOV, M4V, or WebM files.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 5GB.`
    }
    return null
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^/.]+$/, '')) // Strip extension
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [validateFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [])

  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setDuration(0)
    setTitle('')
    setDescription('')
    setGenre('')
    setTargetAudience('')
    setStatus('idle')
    setUploadProgress(0)
    setError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return
    
    // Validate required fields
    if (!title.trim()) {
      setError('Please enter a title for your screening')
      return
    }
    if (!genre) {
      setError('Please select a genre')
      return
    }
    if (!targetAudience) {
      setError('Please select a target audience')
      return
    }
    
    setStatus('uploading')
    setError(null)
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('video', selectedFile)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('genre', genre)
      formData.append('targetAudience', targetAudience)
      formData.append('duration', String(duration))
      
      // Simulate upload with progress
      // In production, use fetch with upload progress via XMLHttpRequest
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })
      
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('processing')
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const response = JSON.parse(xhr.responseText)
          
          setStatus('success')
          
          // Create screening object
          const screening: UploadedScreening = {
            id: response.id || `screening-${Date.now()}`,
            title,
            description,
            duration,
            videoUrl: response.videoUrl || previewUrl || '',
            thumbnailUrl: response.thumbnailUrl,
            genre,
            targetAudience,
            createdAt: new Date()
          }
          
          onUploadComplete(screening)
        } else {
          throw new Error('Upload failed')
        }
      })
      
      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.')
        setStatus('error')
      })
      
      // For MVP, we'll just simulate success
      // In production, point to actual upload endpoint
      // xhr.open('POST', '/api/screenings/upload')
      // xhr.send(formData)
      
      // Simulated upload for MVP
      await simulateUpload()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  // MVP: Simulated upload
  const simulateUpload = async () => {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }
    
    setStatus('processing')
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setStatus('success')
    
    const screening: UploadedScreening = {
      id: `screening-${Date.now()}`,
      title,
      description,
      duration,
      videoUrl: previewUrl || '',
      genre,
      targetAudience,
      createdAt: new Date()
    }
    
    // Small delay before callback
    await new Promise(resolve => setTimeout(resolve, 500))
    onUploadComplete(screening)
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          Upload External Video
        </CardTitle>
        <CardDescription>
          Upload your finished film or cut for audience screening and behavioral analytics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Privacy-First Analytics</AlertTitle>
          <AlertDescription>
            Your video will be securely hosted. Audience reactions and biometrics are 
            analyzed locally on viewers' devices – no video of viewers is ever uploaded.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Zone / File Preview */}
        {!selectedFile ? (
          <motion.div
            ref={dropZoneRef}
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragging ? 'Drop your video here' : 'Drag & drop your video'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">MP4</span>
                <span className="px-2 py-1 bg-muted rounded">MOV</span>
                <span className="px-2 py-1 bg-muted rounded">M4V</span>
                <span className="px-2 py-1 bg-muted rounded">WebM</span>
                <span className="px-2 py-1 bg-muted rounded">Up to 5GB</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Video Preview */}
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={previewUrl || undefined}
                className="w-full h-full object-contain"
                controls
                onLoadedMetadata={handleVideoLoaded}
              />
              
              {status === 'idle' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={handleClearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* File Info */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <FileVideo className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                  {duration > 0 && ` • ${formatDuration(duration)}`}
                </p>
              </div>
            </div>

            {/* Upload Progress */}
            {(status === 'uploading' || status === 'processing') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm">
                  <span>
                    {status === 'uploading' ? 'Uploading...' : 'Processing video...'}
                  </span>
                  <span>{status === 'uploading' ? `${uploadProgress}%` : ''}</span>
                </div>
                <Progress 
                  value={status === 'processing' ? 100 : uploadProgress} 
                  className="h-2"
                />
              </motion.div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 p-4 bg-green-500/10 text-green-500 rounded-lg"
              >
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Upload complete!</span>
              </motion.div>
            )}

            {/* Metadata Form - Only show when idle */}
            {status === 'idle' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter screening title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre *</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRE_OPTIONS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience *</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Who will view this screening?" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your project for viewers..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && status === 'idle' && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          {selectedFile && status === 'idle' && (
            <Button onClick={handleUpload} className="min-w-[120px]">
              <Upload className="h-4 w-4 mr-2" />
              Upload & Create Screening
            </Button>
          )}
          
          {(status === 'uploading' || status === 'processing') && (
            <Button disabled className="min-w-[120px]">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {status === 'uploading' ? 'Uploading...' : 'Processing...'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ExternalUpload
