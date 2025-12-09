'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2, Info, Film, Camera, Sun, Layout, Users, Volume2 } from 'lucide-react'
import { DetailedSceneDirection } from '@/types/scene-direction'

interface SceneDirectionStructure {
  // Camera
  shots: string[]
  angle: string
  movement: string
  lensChoice: string
  focus: string
  // Lighting
  overallMood: string
  timeOfDay: string
  keyLight: string
  fillLight: string
  backlight: string
  practicals: string
  colorTemperature: string
  // Scene
  location: string
  keyProps: string[]
  atmosphere: string
  // Talent
  blocking: string
  keyActions: string[]
  emotionalBeat: string
  // Audio
  audioPriorities: string
  audioConsiderations: string
}

interface SceneDirectionBuilderProps {
  open: boolean
  onClose: () => void
  scene: any
  existingDirection?: DetailedSceneDirection
  onGenerate: (customDirection?: Partial<DetailedSceneDirection>) => void
  isGenerating?: boolean
}

const SHOT_TYPE_OPTIONS = [
  'Wide Shot',
  'Establishing Shot',
  'Medium Shot',
  'Medium Close-Up',
  'Close-Up',
  'Extreme Close-Up',
  'Insert Shot',
  'Over-the-Shoulder',
  'Two-Shot',
  'POV Shot',
]

const CAMERA_ANGLE_OPTIONS = [
  'Eye-Level',
  'Low Angle',
  'High Angle',
  'Bird\'s Eye',
  'Dutch Angle',
  'Over-the-Shoulder',
]

const CAMERA_MOVEMENT_OPTIONS = [
  'Static',
  'Handheld',
  'Steadicam',
  'Dolly In',
  'Dolly Out',
  'Pan Left',
  'Pan Right',
  'Tilt Up',
  'Tilt Down',
  'Tracking Shot',
  'Jib Up',
  'Jib Down',
]

const LIGHTING_MOOD_OPTIONS = [
  'High-Key',
  'Low-Key',
  'Soft & Natural',
  'Hard & Dramatic',
  'Film Noir',
  'Silhouette',
  'Chiaroscuro',
]

const TIME_OF_DAY_OPTIONS = [
  'Dawn',
  'Morning',
  'Mid-day',
  'Golden Hour',
  'Twilight',
  'Night',
]

const COLOR_TEMP_OPTIONS = [
  'Warm (Tungsten)',
  'Cool (Daylight)',
  'Neutral',
  'Stylized (Blue/Orange)',
  'Stylized (Green)',
]

export function SceneDirectionBuilder({
  open,
  onClose,
  scene,
  existingDirection,
  onGenerate,
  isGenerating = false
}: SceneDirectionBuilderProps) {
  const [mode, setMode] = useState<'guided' | 'advanced'>('guided')
  const [structure, setStructure] = useState<SceneDirectionStructure>({
    // Camera defaults
    shots: ['Medium Shot'],
    angle: 'Eye-Level',
    movement: 'Static',
    lensChoice: 'Standard (50mm)',
    focus: 'Deep Focus',
    // Lighting defaults
    overallMood: 'Soft & Natural',
    timeOfDay: 'Day',
    keyLight: '',
    fillLight: '',
    backlight: '',
    practicals: '',
    colorTemperature: 'Neutral',
    // Scene defaults
    location: '',
    keyProps: [],
    atmosphere: '',
    // Talent defaults
    blocking: '',
    keyActions: [],
    emotionalBeat: '',
    // Audio defaults
    audioPriorities: 'Capture clean dialogue',
    audioConsiderations: '',
  })
  
  const [advancedJson, setAdvancedJson] = useState('')
  const [newShot, setNewShot] = useState('')
  const [newProp, setNewProp] = useState('')
  const [newAction, setNewAction] = useState('')

  // Populate from existing direction or parse from scene
  useEffect(() => {
    if (!open || !scene) return
    
    const updates: Partial<SceneDirectionStructure> = {}
    
    // First, try to use existing scene direction
    if (existingDirection) {
      // Camera
      if (existingDirection.camera) {
        if (existingDirection.camera.shots) updates.shots = existingDirection.camera.shots
        if (existingDirection.camera.angle) updates.angle = existingDirection.camera.angle
        if (existingDirection.camera.movement) updates.movement = existingDirection.camera.movement
        if (existingDirection.camera.lensChoice) updates.lensChoice = existingDirection.camera.lensChoice
        if (existingDirection.camera.focus) updates.focus = existingDirection.camera.focus
      }
      
      // Lighting
      if (existingDirection.lighting) {
        if (existingDirection.lighting.overallMood) updates.overallMood = existingDirection.lighting.overallMood
        if (existingDirection.lighting.timeOfDay) updates.timeOfDay = existingDirection.lighting.timeOfDay
        if (existingDirection.lighting.keyLight) updates.keyLight = existingDirection.lighting.keyLight
        if (existingDirection.lighting.fillLight) updates.fillLight = existingDirection.lighting.fillLight
        if (existingDirection.lighting.backlight) updates.backlight = existingDirection.lighting.backlight
        if (existingDirection.lighting.practicals) updates.practicals = existingDirection.lighting.practicals
        if (existingDirection.lighting.colorTemperature) updates.colorTemperature = existingDirection.lighting.colorTemperature
      }
      
      // Scene
      if (existingDirection.scene) {
        if (existingDirection.scene.location) updates.location = existingDirection.scene.location
        if (existingDirection.scene.keyProps) updates.keyProps = existingDirection.scene.keyProps
        if (existingDirection.scene.atmosphere) updates.atmosphere = existingDirection.scene.atmosphere
      }
      
      // Talent
      if (existingDirection.talent) {
        if (existingDirection.talent.blocking) updates.blocking = existingDirection.talent.blocking
        if (existingDirection.talent.keyActions) updates.keyActions = existingDirection.talent.keyActions
        if (existingDirection.talent.emotionalBeat) updates.emotionalBeat = existingDirection.talent.emotionalBeat
      }
      
      // Audio
      if (existingDirection.audio) {
        if (existingDirection.audio.priorities) updates.audioPriorities = existingDirection.audio.priorities
        if (existingDirection.audio.considerations) updates.audioConsiderations = existingDirection.audio.considerations
      }
      
      setAdvancedJson(JSON.stringify(existingDirection, null, 2))
    } else {
      // Parse from scene heading
      if (scene.heading) {
        const headingMatch = scene.heading.match(/(INT|EXT)\.\s+(.+?)\s+-\s+(.+)/i)
        if (headingMatch) {
          updates.location = headingMatch[2].trim()
          const time = headingMatch[3].trim().toLowerCase()
          if (time.includes('night') || time.includes('evening')) updates.timeOfDay = 'Night'
          else if (time.includes('morning') || time.includes('dawn')) updates.timeOfDay = 'Dawn'
          else if (time.includes('afternoon')) updates.timeOfDay = 'Mid-day'
          else if (time.includes('dusk') || time.includes('sunset')) updates.timeOfDay = 'Golden Hour'
          else updates.timeOfDay = 'Mid-day'
        }
      }
      
      // Parse atmosphere from action
      if (scene.action) {
        updates.atmosphere = scene.action.substring(0, 200) + (scene.action.length > 200 ? '...' : '')
      }
    }
    
    setStructure(prev => ({ ...prev, ...updates }))
  }, [open, scene, existingDirection])

  // Construct direction object from structure
  const constructDirection = (): DetailedSceneDirection => {
    return {
      camera: {
        shots: structure.shots,
        angle: structure.angle,
        movement: structure.movement,
        lensChoice: structure.lensChoice,
        focus: structure.focus,
      },
      lighting: {
        overallMood: structure.overallMood,
        timeOfDay: structure.timeOfDay,
        keyLight: structure.keyLight,
        fillLight: structure.fillLight,
        backlight: structure.backlight,
        practicals: structure.practicals,
        colorTemperature: structure.colorTemperature,
      },
      scene: {
        location: structure.location,
        keyProps: structure.keyProps,
        atmosphere: structure.atmosphere,
      },
      talent: {
        blocking: structure.blocking,
        keyActions: structure.keyActions,
        emotionalBeat: structure.emotionalBeat,
      },
      audio: {
        priorities: structure.audioPriorities,
        considerations: structure.audioConsiderations,
      },
    }
  }

  const handleGenerate = () => {
    if (mode === 'advanced') {
      try {
        const parsed = JSON.parse(advancedJson)
        onGenerate(parsed)
      } catch {
        // If JSON is invalid, generate fresh
        onGenerate()
      }
    } else {
      // Use the constructed direction from guided mode
      onGenerate(constructDirection())
    }
    onClose()
  }

  const handleModeChange = (newMode: string) => {
    const m = newMode as 'guided' | 'advanced'
    if (m === 'advanced' && !advancedJson) {
      setAdvancedJson(JSON.stringify(constructDirection(), null, 2))
    }
    setMode(m)
  }

  const addShot = () => {
    if (newShot && !structure.shots.includes(newShot)) {
      setStructure(prev => ({ ...prev, shots: [...prev.shots, newShot] }))
      setNewShot('')
    }
  }

  const removeShot = (shot: string) => {
    setStructure(prev => ({ ...prev, shots: prev.shots.filter(s => s !== shot) }))
  }

  const addProp = () => {
    if (newProp && !structure.keyProps.includes(newProp)) {
      setStructure(prev => ({ ...prev, keyProps: [...prev.keyProps, newProp] }))
      setNewProp('')
    }
  }

  const removeProp = (prop: string) => {
    setStructure(prev => ({ ...prev, keyProps: prev.keyProps.filter(p => p !== prop) }))
  }

  const addAction = () => {
    if (newAction && !structure.keyActions.includes(newAction)) {
      setStructure(prev => ({ ...prev, keyActions: [...prev.keyActions, newAction] }))
      setNewAction('')
    }
  }

  const removeAction = (action: string) => {
    setStructure(prev => ({ ...prev, keyActions: prev.keyActions.filter(a => a !== action) }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gray-900 text-white border-gray-700 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            Scene Direction Builder - {scene?.heading || `Scene ${scene?.sceneNumber || ''}`}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="w-full">
              <TabsTrigger value="guided" className="flex-1">
                Guided Mode
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">
                Advanced Mode (JSON)
              </TabsTrigger>
            </TabsList>

            {/* Info Banner */}
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-purple-300">
                  <p className="font-medium mb-1">Scene Direction</p>
                  <p className="text-purple-400/80">
                    {existingDirection 
                      ? 'Edit the existing direction or regenerate with AI using the fields below.'
                      : 'Configure camera, lighting, scene, and talent direction. Click Generate to create AI-powered professional direction.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Guided Mode */}
            <TabsContent value="guided" className="space-y-4 mt-4">
              
              {/* Camera Section */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Camera
                </h3>
                
                {/* Shot Types */}
                <div>
                  <label className="text-xs text-gray-400">Shot Types</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {structure.shots.map(shot => (
                      <span 
                        key={shot} 
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs flex items-center gap-1 cursor-pointer hover:bg-blue-500/30"
                        onClick={() => removeShot(shot)}
                      >
                        {shot}
                        <span className="text-blue-400">×</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Select value={newShot} onValueChange={setNewShot}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add shot type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SHOT_TYPE_OPTIONS.filter(s => !structure.shots.includes(s)).map(shot => (
                          <SelectItem key={shot} value={shot}>{shot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addShot} disabled={!newShot}>Add</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Camera Angle</label>
                    <Select value={structure.angle} onValueChange={(v) => setStructure(prev => ({ ...prev, angle: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_ANGLE_OPTIONS.map(angle => (
                          <SelectItem key={angle} value={angle}>{angle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Camera Movement</label>
                    <Select value={structure.movement} onValueChange={(v) => setStructure(prev => ({ ...prev, movement: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_MOVEMENT_OPTIONS.map(mov => (
                          <SelectItem key={mov} value={mov}>{mov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Lens Choice</label>
                    <Input
                      value={structure.lensChoice}
                      onChange={(e) => setStructure(prev => ({ ...prev, lensChoice: e.target.value }))}
                      placeholder="e.g., Wide-Angle (24mm), Telephoto (85mm)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Focus</label>
                    <Input
                      value={structure.focus}
                      onChange={(e) => setStructure(prev => ({ ...prev, focus: e.target.value }))}
                      placeholder="e.g., Deep Focus, Shallow DOF, Rack Focus"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Lighting Section */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  Lighting
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Overall Mood</label>
                    <Select value={structure.overallMood} onValueChange={(v) => setStructure(prev => ({ ...prev, overallMood: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_MOOD_OPTIONS.map(mood => (
                          <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Time of Day</label>
                    <Select value={structure.timeOfDay} onValueChange={(v) => setStructure(prev => ({ ...prev, timeOfDay: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OF_DAY_OPTIONS.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Key Light</label>
                    <Input
                      value={structure.keyLight}
                      onChange={(e) => setStructure(prev => ({ ...prev, keyLight: e.target.value }))}
                      placeholder="e.g., Hard light from camera left"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Fill Light</label>
                    <Input
                      value={structure.fillLight}
                      onChange={(e) => setStructure(prev => ({ ...prev, fillLight: e.target.value }))}
                      placeholder="e.g., Soft fill from camera right, 50%"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Backlight</label>
                    <Input
                      value={structure.backlight}
                      onChange={(e) => setStructure(prev => ({ ...prev, backlight: e.target.value }))}
                      placeholder="e.g., Rim light for separation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Practicals</label>
                    <Input
                      value={structure.practicals}
                      onChange={(e) => setStructure(prev => ({ ...prev, practicals: e.target.value }))}
                      placeholder="e.g., Desk lamp ON, TV glow"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400">Color Temperature</label>
                  <Select value={structure.colorTemperature} onValueChange={(v) => setStructure(prev => ({ ...prev, colorTemperature: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_TEMP_OPTIONS.map(temp => (
                        <SelectItem key={temp} value={temp}>{temp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scene Section */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-green-400" />
                  Scene
                </h3>
                
                <div>
                  <label className="text-xs text-gray-400">Location</label>
                  <Input
                    value={structure.location}
                    onChange={(e) => setStructure(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Messy apartment living room"
                    className="mt-1"
                  />
                </div>
                
                {/* Key Props */}
                <div>
                  <label className="text-xs text-gray-400">Key Props</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {structure.keyProps.map(prop => (
                      <span 
                        key={prop} 
                        className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1 cursor-pointer hover:bg-green-500/30"
                        onClick={() => removeProp(prop)}
                      >
                        {prop}
                        <span className="text-green-400">×</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newProp}
                      onChange={(e) => setNewProp(e.target.value)}
                      placeholder="Add a key prop..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addProp()}
                    />
                    <Button size="sm" onClick={addProp} disabled={!newProp}>Add</Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400">Atmosphere</label>
                  <Textarea
                    value={structure.atmosphere}
                    onChange={(e) => setStructure(prev => ({ ...prev, atmosphere: e.target.value }))}
                    placeholder="e.g., Hazy/Smoky, Cluttered & Chaotic, Clean & Minimalist"
                    className="mt-1 min-h-[60px]"
                  />
                </div>
              </div>

              {/* Talent Section */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  Talent
                </h3>
                
                <div>
                  <label className="text-xs text-gray-400">Blocking</label>
                  <Textarea
                    value={structure.blocking}
                    onChange={(e) => setStructure(prev => ({ ...prev, blocking: e.target.value }))}
                    placeholder="e.g., Actor A starts at the window, walks to the desk on [line]"
                    className="mt-1 min-h-[60px]"
                  />
                </div>
                
                {/* Key Actions */}
                <div>
                  <label className="text-xs text-gray-400">Key Actions</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {structure.keyActions.map(action => (
                      <span 
                        key={action} 
                        className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs flex items-center gap-1 cursor-pointer hover:bg-orange-500/30"
                        onClick={() => removeAction(action)}
                      >
                        {action}
                        <span className="text-orange-400">×</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      placeholder="Add a key action..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addAction()}
                    />
                    <Button size="sm" onClick={addAction} disabled={!newAction}>Add</Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400">Emotional Beat</label>
                  <Input
                    value={structure.emotionalBeat}
                    onChange={(e) => setStructure(prev => ({ ...prev, emotionalBeat: e.target.value }))}
                    placeholder="e.g., Convey anxiety, A moment of realization"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Audio Section */}
              <div className="space-y-3 p-3 rounded border border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-pink-400" />
                  Audio
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Priorities</label>
                    <Input
                      value={structure.audioPriorities}
                      onChange={(e) => setStructure(prev => ({ ...prev, audioPriorities: e.target.value }))}
                      placeholder="e.g., Capture clean dialogue"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Considerations</label>
                    <Input
                      value={structure.audioConsiderations}
                      onChange={(e) => setStructure(prev => ({ ...prev, audioConsiderations: e.target.value }))}
                      placeholder="e.g., Be aware of HVAC noise"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Scene Direction JSON (edit directly or let AI generate)
                </label>
                <Textarea
                  value={advancedJson}
                  onChange={(e) => setAdvancedJson(e.target.value)}
                  placeholder='{"camera": {...}, "lighting": {...}, ...}'
                  className="min-h-[400px] font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Edit the JSON directly to customize all direction fields. Invalid JSON will trigger fresh AI generation.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-700 p-4 flex justify-between items-center">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {existingDirection ? 'Update Direction' : 'Generate Direction'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
