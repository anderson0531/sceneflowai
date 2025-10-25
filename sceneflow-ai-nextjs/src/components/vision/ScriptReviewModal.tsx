'use client'

import { useState } from 'react'
import { X, Film, Users, Star, Download, RefreshCw, Loader } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Review {
  overallScore: number
  categories: {
    name: string
    score: number
  }[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  generatedAt: string
}

interface ScriptReviewModalProps {
  isOpen: boolean
  onClose: () => void
  directorReview: Review | null
  audienceReview: Review | null
  onRegenerate: () => void
  isGenerating: boolean
}

export default function ScriptReviewModal({
  isOpen,
  onClose,
  directorReview,
  audienceReview,
  onRegenerate,
  isGenerating
}: ScriptReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'director' | 'audience'>('director')

  if (!isOpen) return null

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 75) return 'text-blue-600 dark:text-blue-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 75) return 'bg-blue-100 dark:bg-blue-900/30'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  const renderReview = (review: Review | null, type: 'director' | 'audience') => {
    if (!review) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {type} review available</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              {type === 'director' ? (
                <Film className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
              {type === 'director' ? "Director's Perspective" : "Audience Perspective"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(review.overallScore)}`}>
                {review.overallScore}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">out of 100</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${review.overallScore}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Generated {new Date(review.generatedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {review.categories.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className={`text-sm font-semibold ${getScoreColor(category.score)}`}>
                      {category.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {review.analysis}
            </p>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">✨ Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚠️ Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎯 Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const exportAsPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export as PDF functionality to be implemented')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Script Review & Analysis</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'director' | 'audience')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="director" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Director ({directorReview?.overallScore || 'N/A'})
              </TabsTrigger>
              <TabsTrigger value="audience" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Audience ({audienceReview?.overallScore || 'N/A'})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="director">
              {renderReview(directorReview, 'director')}
            </TabsContent>

            <TabsContent value="audience">
              {renderReview(audienceReview, 'audience')}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
