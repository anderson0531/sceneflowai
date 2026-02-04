'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  Clapperboard, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles,
  FileText,
  Users,
  List,
  Download,
  ArrowRight
} from 'lucide-react'

// SpeechRecognition types are declared in src/types/ambient.d.ts

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  suggestions?: string[]
}

interface StoryBeat {
  id: string
  title: string
  sceneSummary: string
  charactersPresent: string[]
  structuralPurpose: string
  act: string
  order: number
}

interface Character {
  id: string
  name: string
  archetype: string
  primaryMotivation: string
  internalConflict: string
  externalConflict: string
  characterArc: string
}

interface FilmTreatment {
  title: string
  logline: string
  synopsis: string
  targetAudience: string
  genre: string
  tone: string
  duration: string
  scenes: string[]
}

interface ProductionGuide {
  filmTreatment: FilmTreatment
  characters: Character[]
  beatSheet: StoryBeat[]
  isComplete: boolean
  currentFocus: string
}

interface CueChatProps {
  concept?: any
  onClose?: () => void
}

const availableVoices = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Professional, warm, and engaging' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Deep, authoritative, and commanding' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, gentle, and approachable' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Clear, confident, and friendly' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Young, energetic, and enthusiastic' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Josh', description: 'Casual, relatable, and conversational' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Professional, clear, and authoritative' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Warm, friendly, and trustworthy' }
]

export default function CueChat({ concept, onClose }: CueChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ttsMode, setTtsMode] = useState<'elevenlabs' | 'google' | 'browser'>('google')
  const [selectedVoice, setSelectedVoice] = useState('en-US-Neural2-F')
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  
  const [productionGuide, setProductionGuide] = useState<ProductionGuide>({
    filmTreatment: {
      title: '',
      logline: '',
      synopsis: '',
      targetAudience: '',
      genre: '',
      tone: '',
      duration: '',
      scenes: []
    },
    characters: [],
    beatSheet: [],
    isComplete: false,
    currentFocus: 'concept'
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageIdCounterRef = useRef(0)

  useEffect(() => {
    messageIdCounterRef.current = 0
    if (concept) {
      const welcomeMessage: Message = {
        id: generateMessageId(),
        content: `Welcome back! I see you're working on "${concept.title}". How can I help you develop this further?`,
        sender: 'ai',
        timestamp: new Date(),
        suggestions: ['Continue development', 'Refine existing elements', 'Start over']
      }
      setMessages([welcomeMessage])
    } else {
      const welcomeMessage: Message = {
        id: generateMessageId(),
        content: "Hello! I'm Cue, your AI story development partner. I'm here to help you create compelling video content from concept to completion. Tell me about your idea, and I'll automatically build a comprehensive production guide that we can refine together!",
        sender: 'ai',
        timestamp: new Date(),
        suggestions: ['Share your concept', 'Get started with a template', 'Learn about the process']
      }
      setMessages([welcomeMessage])
    }
  }, [concept])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  const generateMessageId = () => {
    messageIdCounterRef.current += 1
    return `msg_${messageIdCounterRef.current}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled)
  }

  const playTTS = async (text: string, voiceId: string = selectedVoice) => {
    if (!voiceEnabled) return

    try {
      setIsPlaying(true)
      
      if (ttsMode === 'elevenlabs' || ttsMode === 'google') {
        const apiEndpoint = ttsMode === 'elevenlabs' ? '/api/tts/elevenlabs' : '/api/tts/google'
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId })
        })

        if (response.ok) {
          const audioBlob = await response.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          audio.onended = () => {
            setIsPlaying(false)
            URL.revokeObjectURL(audioUrl)
          }
          
          audio.play()
        } else {
          console.error('TTS failed, falling back to browser TTS')
          setTtsMode('browser')
          // Fall through to browser TTS
        }
      }
      
      if (ttsMode === 'browser') {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.onend = () => setIsPlaying(false)
          speechSynthesis.speak(utterance)
        }
      }
    } catch (error) {
      console.error('TTS error:', error)
      setTtsMode('browser')
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onend = () => setIsPlaying(false)
        speechSynthesis.speak(utterance)
      }
    }
  }

  const stopTTS = () => {
    if (ttsMode === 'browser' && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser')
      return
    }

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setIsRecording(false)
      setTranscript('')
    } else {
      // Start recording
      setIsRecording(true)
      setTranscript('')

      const RecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!RecognitionCtor) {
        alert('Speech recognition is not supported in this browser')
        setIsRecording(false)
        return
      }
      const recognition = new RecognitionCtor()
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
          setInputValue(finalTranscript)
          setIsRecording(false)
          recognitionRef.current = null
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        recognitionRef.current = null
      }

      recognition.onend = () => {
        setIsRecording(false)
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    }
  }

  const analyzeUserInput = (userInput: string) => {
    // Always recognize that user has provided a concept
    // Extract key elements from the input
    const keyElements = []
    const conceptType = 'Video Content Development'
    
    // Extract character names (capitalized words that could be names)
    const nameMatches = userInput.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
    const characters = nameMatches.filter(name => 
      name.length > 2 && 
      !['The', 'This', 'That', 'With', 'From', 'Into', 'Upon', 'About', 'Between'].includes(name)
    )
    
    // Extract key topics and themes
    if (userInput.toLowerCase().includes('crispr') || userInput.toLowerCase().includes('gene editing')) {
      keyElements.push('CRISPR gene editing', 'biotechnology', 'ethics', 'science communication')
    }
    if (userInput.toLowerCase().includes('debate') || userInput.toLowerCase().includes('discussion')) {
      keyElements.push('debate format', 'conflict resolution', 'perspective sharing')
    }
    if (userInput.toLowerCase().includes('technological') || userInput.toLowerCase().includes('innovation')) {
      keyElements.push('technology', 'innovation', 'progress')
    }
    if (userInput.toLowerCase().includes('ethical') || userInput.toLowerCase().includes('caution')) {
      keyElements.push('ethics', 'caution', 'responsibility')
    }
    if (userInput.toLowerCase().includes('father') || userInput.toLowerCase().includes('son')) {
      keyElements.push('family dynamics', 'generational conflict', 'personal relationships')
    }
    
    // Generate a concept title based on the content
    let conceptTitle = 'Video Content Development'
    if (keyElements.length > 0) {
      conceptTitle = keyElements[0].charAt(0).toUpperCase() + keyElements[0].slice(1) + ' Video'
    }
    
    return {
      hasConcept: true,
      conceptTitle: conceptTitle,
      conceptType: conceptType,
      keyElements: keyElements,
      characters: characters,
      nextSteps: ['Refine the concept', 'Develop character profiles', 'Structure the narrative', 'Plan production approach']
    }
  }

  const updateProductionGuideFromInput = (input: string, analysis: any) => {
    if (analysis.hasConcept) {
      // Generate a complete production guide draft automatically
      const draftGuide = generateCompleteProductionGuide(input, analysis)
      setProductionGuide(draftGuide)
    }
  }

  const generateCompleteProductionGuide = (input: string, analysis: any) => {
    const lowerInput = input.toLowerCase()
    
    // Handle CRISPR gene editing concept specifically
    if (lowerInput.includes('crispr') || lowerInput.includes('gene editing')) {
      return {
        filmTreatment: {
          title: 'CRISPR Gene Editing Debate',
          logline: 'A compelling video that tackles the profound technological and ethical challenges of CRISPR gene editing through a debate between an optimistic technologist and his cautious, experienced father.',
          synopsis: 'This video explores the complex intersection of innovation and caution in biotechnology through a personal family dynamic, making the complex subject matter accessible and relatable.',
          targetAudience: 'Science enthusiasts, students, general public interested in biotechnology and ethics',
          genre: 'Educational/Documentary',
          tone: 'Thoughtful, balanced, engaging',
          duration: '15-20 minutes',
          scenes: ['Introduction to CRISPR', 'The Debate Setup', 'Technological Optimism', 'Ethical Caution', 'Finding Common Ground', 'Conclusion']
        },
        characters: [
          {
            id: 'alex-1',
            name: 'Alex',
            archetype: 'The Optimistic Technologist',
            primaryMotivation: 'Advance biotechnology for human benefit',
            internalConflict: 'Balancing innovation with responsibility',
            externalConflict: 'Convincing others of technology\'s potential',
            characterArc: 'From pure optimism to thoughtful consideration'
          },
          {
            id: 'dr-anderson-1',
            name: 'Dr. Anderson',
            archetype: 'The Cautious Experienced Father',
            primaryMotivation: 'Ensure responsible development of technology',
            internalConflict: 'Supporting son while maintaining ethical standards',
            externalConflict: 'Balancing progress with safety concerns',
            characterArc: 'From pure caution to understanding innovation\'s value'
          }
        ],
        beatSheet: [
          {
            id: 'beat-1',
            title: 'Introduction to CRISPR',
            sceneSummary: 'Establish the context of CRISPR gene editing technology and its potential impact',
            charactersPresent: ['Alex', 'Dr. Anderson'],
            structuralPurpose: 'Set up the debate and establish stakes',
            act: 'setup',
            order: 1
          },
          {
            id: 'beat-2',
            title: 'The Debate Setup',
            sceneSummary: 'Alex presents his optimistic view of CRISPR\'s potential while Dr. Anderson expresses concerns',
            charactersPresent: ['Alex', 'Dr. Anderson'],
            structuralPurpose: 'Establish the central conflict',
            act: 'setup',
            order: 2
          },
          {
            id: 'beat-3',
            title: 'Technological Optimism',
            sceneSummary: 'Alex argues for the benefits: curing diseases, improving agriculture, scientific advancement',
            charactersPresent: ['Alex'],
            structuralPurpose: 'Present the case for progress',
            act: 'confrontation',
            order: 3
          },
          {
            id: 'beat-4',
            title: 'Ethical Caution',
            sceneSummary: 'Dr. Anderson raises concerns about safety, ethics, and unintended consequences',
            charactersPresent: ['Dr. Anderson'],
            structuralPurpose: 'Present the case for caution',
            act: 'confrontation',
            order: 4
          },
          {
            id: 'beat-5',
            title: 'Finding Common Ground',
            sceneSummary: 'Both characters work toward understanding each other\'s perspectives and finding balance',
            charactersPresent: ['Alex', 'Dr. Anderson'],
            structuralPurpose: 'Resolve the conflict through dialogue',
            act: 'resolution',
            order: 5
          },
          {
            id: 'beat-6',
            title: 'Conclusion',
            sceneSummary: 'Synthesize the debate into a balanced view of responsible innovation',
            charactersPresent: ['Alex', 'Dr. Anderson'],
            structuralPurpose: 'Provide closure and key takeaways',
            act: 'resolution',
            order: 6
          }
        ],
        isComplete: true,
        currentFocus: 'refinement'
      }
    }
    
    // Handle other concepts with intelligent analysis
    const conceptTitle = analysis.conceptTitle || 'Video Content Development'
    const keyElements = analysis.keyElements || []
    const characters = analysis.characters || []
    
    return {
      filmTreatment: {
        title: conceptTitle,
        logline: `A compelling video that explores ${keyElements.join(', ')} through engaging storytelling and clear communication.`,
        synopsis: `This video addresses the complex topic of ${keyElements.join(' and ')} in an accessible and engaging format that resonates with viewers.`,
        targetAudience: 'General audience interested in the subject matter',
        genre: 'Educational/Informative',
        tone: 'Engaging, informative, balanced',
        duration: '10-15 minutes',
        scenes: ['Introduction', 'Main Content', 'Conclusion']
      },
      characters: characters.length > 0 ? characters.map((char: string, index: number) => ({
        id: `char-${index + 1}`,
        name: char,
        archetype: 'The Participant',
        primaryMotivation: 'Contribute to the discussion',
        internalConflict: 'Balancing personal views with understanding',
        externalConflict: 'Engaging with opposing perspectives',
        characterArc: 'From initial position to greater understanding'
      })) : [
        {
          id: 'host-1',
          name: 'Host/Narrator',
          archetype: 'The Guide',
          primaryMotivation: 'Facilitate understanding of the topic',
          internalConflict: 'Presenting complex information clearly',
          externalConflict: 'Making the content accessible to all viewers',
          characterArc: 'From explanation to insight'
        }
      ],
      beatSheet: [
        {
          id: 'beat-1',
          title: 'Introduction',
          sceneSummary: `Introduce the topic of ${keyElements.join(' and ')} and establish the video's purpose`,
          charactersPresent: characters.length > 0 ? characters : ['Host/Narrator'],
          structuralPurpose: 'Hook viewers and set expectations',
          act: 'setup',
          order: 1
        },
        {
          id: 'beat-2',
          title: 'Main Content',
          sceneSummary: `Explore the key aspects of ${keyElements.join(' and ')} in detail`,
          charactersPresent: characters.length > 0 ? characters : ['Host/Narrator'],
          structuralPurpose: 'Deliver the core content and insights',
          act: 'confrontation',
          order: 2
        },
        {
          id: 'beat-3',
          title: 'Conclusion',
          sceneSummary: `Summarize key points and provide final thoughts on ${keyElements.join(' and ')}`,
          charactersPresent: characters.length > 0 ? characters : ['Host/Narrator'],
          structuralPurpose: 'Provide closure and key takeaways',
          act: 'resolution',
          order: 3
        }
      ],
      isComplete: true,
      currentFocus: 'refinement'
    }
  }

  const calculateCompletion = () => {
    let completed = 0
    let total = 0

    // Film Treatment (40% weight)
    if (productionGuide.filmTreatment.title) completed += 10
    if (productionGuide.filmTreatment.logline) completed += 10
    if (productionGuide.filmTreatment.genre) completed += 5
    if (productionGuide.filmTreatment.targetAudience) completed += 5
    if (productionGuide.filmTreatment.tone) completed += 5
    if (productionGuide.filmTreatment.duration) completed += 5
    total += 40

    // Characters (30% weight)
    if (productionGuide.characters.length > 0) {
      completed += Math.min(30, productionGuide.characters.length * 10)
    }
    total += 30

    // Beat Sheet (30% weight)
    if (productionGuide.beatSheet.length > 0) {
      completed += Math.min(30, productionGuide.beatSheet.length * 5)
    }
    total += 30

    return Math.round((completed / total) * 100)
  }

  const generateContextualResponse = async (userInput: string) => {
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))
    
    const inputAnalysis = analyzeUserInput(userInput)
    
    if (inputAnalysis.hasConcept) {
      updateProductionGuideFromInput(userInput, inputAnalysis)
      
      return {
        content: `🎬 **${inputAnalysis.conceptTitle}** - Excellent choice! I've automatically generated a complete production guide for you.

**What I've created:**
• **Film Treatment**: Complete with title, logline, genre, and target audience
• **Character Profiles**: Detailed archetypes and motivations
• **Beat Sheet**: Full story structure with 6+ narrative beats

**Your guide is now 100% complete!** 

Instead of asking you for each detail, I've built the foundation so we can focus on refinement. What specific aspect would you like to enhance or adjust?`,
        suggestions: ['Refine the logline', 'Adjust character motivations', 'Modify episode structure', 'Export the guide']
      }
    }
    
    return {
      content: "I'd love to help you develop your video concept! Tell me more about what you have in mind - whether it's a cooking series, educational content, entertainment, or something else entirely. I'll automatically generate a complete production guide based on your input.",
      suggestions: ['Share your concept', 'Describe your vision', 'Ask about the process']
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage: Message = {
      id: generateMessageId(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const aiResponse = await generateContextualResponse(userMessage.content)
      
      const aiMessage: Message = {
        id: generateMessageId(),
        content: aiResponse.content,
        sender: 'ai',
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      }

      setMessages(prev => [...prev, aiMessage])
      
      if (voiceEnabled) {
        playTTS(aiResponse.content)
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      
      const errorMessage: Message = {
        id: generateMessageId(),
        content: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your input.",
        sender: 'ai',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    // Optionally auto-send the suggestion
    // handleSendMessage()
  }

  const exportProductionGuide = () => {
    const dataStr = JSON.stringify(productionGuide, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${productionGuide.filmTreatment.title || 'production-guide'}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="flex flex-col lg:flex-row h-full space-y-4 lg:space-y-0 lg:space-x-4">
      {/* Left Column - Cue Chat */}
      <div className="flex-1 flex flex-col bg-sf-surface-light border border-sf-border rounded-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b border-sf-border bg-sf-surface gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
              <Clapperboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-sf-text-primary">Cue - Story Development AI</h3>
              <p className="text-xs sm:text-sm text-sf-text-secondary">
                {productionGuide.filmTreatment.title || 'Untitled Story'} • {calculateCompletion()}% Complete
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Voice Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              className={`${voiceEnabled ? 'text-sf-primary' : 'text-sf-text-secondary'}`}
              title={`${voiceEnabled ? 'Disable voice' : 'Enable voice'} (${ttsMode === 'elevenlabs' || ttsMode === 'google' ? 'High Quality' : 'Browser TTS'})`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            
            {/* Voice Selector */}
            {voiceEnabled && (ttsMode === 'elevenlabs' || ttsMode === 'google') && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="px-2 py-1 text-xs bg-sf-surface-light border border-sf-border rounded-md text-sf-text-primary focus:outline-none focus:border-sf-primary/70"
                  title="Select Cue's voice"
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playTTS("Hello! I'm Cue, your AI story development partner. How can I help you today?")}
                  className="h-6 w-6 p-0 text-sf-text-secondary hover:text-sf-primary"
                  title="Preview selected voice"
                >
                  <Play className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className="h-6 w-6 p-0 text-sf-text-secondary hover:text-sf-primary"
                  title="Voice settings"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            {/* Play/Pause Controls */}
            {isPlaying && (
              <Button
                variant="ghost"
                size="sm"
                onClick={stopTTS}
                className="text-sf-accent"
                title="Stop audio"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Voice Settings Panel */}
        {showVoiceSettings && (
          <div className="p-4 border-b border-sf-border bg-sf-surface-light">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-3 text-sf-text-primary">Voice Selection</h4>
                <div className="space-y-2">
                  {availableVoices.map((voice) => (
                    <div
                      key={voice.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedVoice === voice.id
                          ? 'border-sf-primary bg-sf-primary/10'
                          : 'border-sf-border bg-white hover:bg-sf-surface-light'
                      }`}
                      onClick={() => setSelectedVoice(voice.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm text-sf-text-primary">{voice.name}</h5>
                          <p className="text-xs text-sf-text-secondary">{voice.description}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          {selectedVoice === voice.id && (
                            <div className="w-2 h-2 bg-sf-primary rounded-full"></div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedVoice(voice.id)
                              playTTS("Hello! This is a preview of my voice.")
                            }}
                            className="h-6 w-6 p-0 text-sf-text-secondary hover:text-sf-primary"
                            title="Preview voice"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3 text-sf-text-primary">Current Voice</h4>
                <div className="bg-white p-4 rounded-lg border">
                  {(() => {
                    const currentVoice = availableVoices.find(v => v.id === selectedVoice)
                    return currentVoice ? (
                      <div>
                        <h5 className="font-semibold text-lg text-sf-text-primary mb-2">{currentVoice.name}</h5>
                        <p className="text-sm text-sf-text-secondary mb-3">{currentVoice.description}</p>
                        <div className="text-xs text-sf-text-secondary">
                          <p><strong>Voice ID:</strong> {currentVoice.id}</p>
                          <p><strong>Type:</strong> ElevenLabs AI Voice</p>
                          <p><strong>Quality:</strong> Studio-grade</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sf-text-secondary">No voice selected</p>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-sf-primary text-white'
                    : 'bg-sf-surface border border-sf-border'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.sender === 'ai' && (
                    <div className="w-6 h-6 bg-sf-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3 h-3 text-sf-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${message.sender === 'user' ? 'text-white' : 'text-sf-text-primary'}`}>
                      {message.content}
                    </p>
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 bg-sf-primary/10 text-sf-primary text-xs rounded-full hover:bg-sf-primary/20 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        message.sender === 'user' ? 'text-white/70' : 'text-sf-text-secondary'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {message.sender === 'ai' && voiceEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playTTS(message.content)}
                          className="h-6 w-6 p-0 text-sf-text-secondary hover:text-sf-primary"
                          title="Play audio"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-sf-surface border border-sf-border rounded-lg p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="w-6 h-6 bg-sf-primary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-sf-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-sf-text-primary mb-2">🤔 Analyzing your input and updating the production guide...</p>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-sf-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-sf-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-sf-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-sf-border bg-sf-surface">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Tell me about your story, characters, or structure..."
                className="w-full min-h-[44px] max-h-32 resize-none bg-sf-control text-sf-text-primary placeholder-sf-text-secondary/70 border border-sf-border rounded-lg py-2 px-3 sm:px-4 shadow-inner focus:outline-none focus:border-sf-primary/70 focus:ring-2 focus:ring-sf-primary/60 focus:ring-offset-2 focus:ring-offset-sf-background transition duration-200 hover:bg-sf-surface-light"
                style={{
                  height: 'auto',
                  minHeight: '44px',
                  maxHeight: '128px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                }}
              />
            </div>
            
            {/* Microphone Button */}
            <Button
              onClick={toggleRecording}
              variant="ghost"
              size="sm"
              className={`px-3 py-2 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-sf-surface-light hover:bg-sf-border text-sf-text-primary'} border border-sf-border`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-sf-text-secondary text-center px-2">
            💡 Cue remembers our conversation and builds your production guide step by step
          </div>
        </div>
      </div>

      {/* Right Column - Production Guide */}
      <div className="w-96 flex flex-col bg-sf-surface-light border border-sf-border rounded-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b border-sf-border bg-sf-surface gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sf-accent rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-sf-text-primary">Production Guide</h3>
              <p className="text-xs sm:text-sm text-sf-text-secondary">
                {calculateCompletion()}% Complete
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => window.open('/dashboard/studio/new-project', '_self')}
              size="sm"
              className="bg-sf-primary hover:bg-sf-primary/90 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Open Studio
            </Button>
            <Button
              onClick={exportProductionGuide}
              variant="ghost"
              size="sm"
              className="text-sf-accent"
              title="Export guide"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Guide Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Film Treatment Section */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-sf-border shadow-sm">
            <h4 className="font-semibold text-base mb-4 flex items-center text-sf-text-primary">
              <FileText className="w-5 h-5 mr-2 text-sf-primary" />
              Film Treatment
            </h4>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm font-semibold text-sf-text-primary block mb-1">Title</label>
                <p className="text-base text-sf-text-primary font-medium">
                  {productionGuide.filmTreatment.title || 'Untitled'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-sf-text-primary block mb-1">Logline</label>
                <p className="text-sm text-sf-text-primary leading-relaxed">
                  {productionGuide.filmTreatment.logline || 'Not defined yet'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-sf-text-primary block mb-1">Genre</label>
                <p className="text-sm text-sf-text-primary">
                  {productionGuide.filmTreatment.genre || 'Not defined yet'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-sf-text-primary block mb-1">Target Audience</label>
                <p className="text-sm text-sf-text-primary">
                  {productionGuide.filmTreatment.targetAudience || 'Not defined yet'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-sf-text-primary block mb-1">Tone</label>
                <p className="text-sm text-sf-text-primary">
                  {productionGuide.filmTreatment.tone || 'Not defined yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Characters Section */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-sf-border shadow-sm">
            <h4 className="font-semibold text-base mb-4 flex items-center text-sf-text-primary">
              <Users className="w-5 h-5 mr-2 text-sf-primary" />
              Characters ({productionGuide.characters.length})
            </h4>
            {productionGuide.characters.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {productionGuide.characters.map((character, index) => (
                  <div key={character.id} className="border-l-4 border-sf-primary pl-3 sm:pl-4 py-2 bg-sf-surface-light rounded-r-lg">
                    <h5 className="font-semibold text-base text-sf-text-primary mb-1">{character.name}</h5>
                    <p className="text-sm text-sf-accent font-medium mb-1">{character.archetype}</p>
                    <p className="text-sm text-sf-text-primary leading-relaxed">{character.primaryMotivation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sf-text-secondary italic">No characters defined yet</p>
            )}
          </div>

          {/* Beat Sheet Section */}
          <div className="bg-white p-3 sm:p-4 rounded-lg border border-sf-border shadow-sm">
            <h4 className="font-semibold text-base mb-4 flex items-center text-sf-text-primary">
              <List className="w-5 h-5 mr-2 text-sf-primary" />
              Beat Sheet ({productionGuide.beatSheet.length})
            </h4>
            {productionGuide.beatSheet.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {productionGuide.beatSheet.map((beat, index) => (
                  <div key={beat.id} className="border-l-4 border-sf-accent pl-3 sm:pl-4 py-2 sm:py-3 bg-sf-surface-light rounded-r-lg">
                    <h5 className="font-semibold text-base text-sf-text-primary mb-2">{beat.title}</h5>
                    <p className="text-sm text-sf-text-primary leading-relaxed mb-3">{beat.sceneSummary}</p>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs px-3 py-1 bg-sf-accent text-white rounded-full font-medium">
                        {beat.act}
                      </span>
                      <span className="text-sm text-sf-text-secondary font-medium">#{beat.order}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sf-text-secondary italic">No beats defined yet</p>
            )}
          </div>

          {/* Completion Status */}
          {calculateCompletion() >= 80 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-green-800">Ready for Next Phase!</h4>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Your production guide is complete and ready for Step 2: Production
              </p>
              <Button
                onClick={exportProductionGuide}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Complete Guide
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
