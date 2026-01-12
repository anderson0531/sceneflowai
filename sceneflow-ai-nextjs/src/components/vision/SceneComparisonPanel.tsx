'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Film, Users, Volume2, Music } from 'lucide-react'

interface SceneComparisonPanelProps {
  originalScene: any
  optimizedScene: any
  changesSummary: {
    category: string
    changes: string
    rationaleDirector: string
    rationaleAudience: string
  }[]
}

export function SceneComparisonPanel({
  originalScene,
  optimizedScene,
  changesSummary
}: SceneComparisonPanelProps) {
  return (
    <div className="space-y-6">
      {/* Two-column comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Original Scene */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Film className="w-5 h-5" />
              Original Scene
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {originalScene.heading && (
              <div>
                <Badge variant="outline" className="mb-2">Heading</Badge>
                <p className="text-sm font-mono">{originalScene.heading}</p>
              </div>
            )}
            
            {originalScene.action && (
              <div>
                <Badge variant="outline" className="mb-2">Action</Badge>
                <p className="text-sm whitespace-pre-wrap">{originalScene.action}</p>
              </div>
            )}
            
            {originalScene.narration && (
              <div>
                <Badge variant="outline" className="mb-2">Narration</Badge>
                <p className="text-sm whitespace-pre-wrap italic">"{originalScene.narration}"</p>
              </div>
            )}
            
            {originalScene.dialogue && originalScene.dialogue.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">Dialogue</Badge>
                <div className="space-y-2">
                  {originalScene.dialogue.map((d: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <strong>{d.character}:</strong> {d.line || d.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {originalScene.music && (
              <div>
                <Badge variant="outline" className="mb-2 flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  Music
                </Badge>
                <p className="text-sm">{originalScene.music}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimized Scene */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Film className="w-5 h-5" />
              Optimized Scene
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {optimizedScene.heading && (
              <div>
                <Badge variant="outline" className="mb-2">Heading</Badge>
                <p className="text-sm font-mono">{optimizedScene.heading}</p>
              </div>
            )}
            
            {optimizedScene.action && (
              <div>
                <Badge variant="outline" className="mb-2">Action</Badge>
                <p className="text-sm whitespace-pre-wrap">{optimizedScene.action}</p>
              </div>
            )}
            
            {optimizedScene.narration && (
              <div>
                <Badge variant="outline" className="mb-2">Narration</Badge>
                <p className="text-sm whitespace-pre-wrap italic">"{optimizedScene.narration}"</p>
              </div>
            )}
            
            {optimizedScene.dialogue && optimizedScene.dialogue.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">Dialogue</Badge>
                <div className="space-y-2">
                  {optimizedScene.dialogue.map((d: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <strong>{d.character}:</strong> {d.line || d.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {optimizedScene.music && (
              <div>
                <Badge variant="outline" className="mb-2 flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  Music
                </Badge>
                <p className="text-sm">{optimizedScene.music}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Changes Summary */}
      {changesSummary && changesSummary.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Summary of Changes and Rationale</h3>
          <div className="space-y-4">
            {changesSummary.map((change, idx) => (
              <Card key={idx} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{idx + 1}. {change.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Badge variant="outline" className="mb-1">Changes</Badge>
                    <p className="text-sm whitespace-pre-wrap">{change.changes}</p>
                  </div>
                  
                  {change.rationaleDirector && (
                    <div>
                      <Badge variant="outline" className="mb-1 flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        Rationale (Director)
                      </Badge>
                      <p className="text-sm">{change.rationaleDirector}</p>
                    </div>
                  )}
                  
                  {change.rationaleAudience && (
                    <div>
                      <Badge variant="outline" className="mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Rationale (Audience)
                      </Badge>
                      <p className="text-sm">{change.rationaleAudience}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

