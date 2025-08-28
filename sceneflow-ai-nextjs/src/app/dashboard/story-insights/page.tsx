"use client";

import React from 'react';
import { StoryInsights } from '@/components/StoryInsights';

// Mock story data for demonstration
const mockStoryData = {
  title: "The CRISPR Revolution",
  acts: [
    {
      id: "act1",
      name: "Act I: The Discovery",
      beats: [
        { id: "beat1", title: "Sarah's Lab Breakthrough", duration: 15 },
        { id: "beat2", title: "Initial CRISPR Success", duration: 20 },
        { id: "beat3", title: "Ethical Concerns Arise", duration: 25 }
      ]
    },
    {
      id: "act2", 
      name: "Act II: The Conflict",
      beats: [
        { id: "beat4", title: "Corporate Interest", duration: 30 },
        { id: "beat5", title: "Regulatory Pushback", duration: 25 },
        { id: "beat6", title: "Sarah's Dilemma", duration: 20 }
      ]
    },
    {
      id: "act3",
      name: "Act III: Resolution", 
      beats: [
        { id: "beat7", title: "Finding Balance", duration: 20 },
        { id: "beat8", title: "New Framework", duration: 15 }
      ]
    }
  ],
  characters: [
    {
      id: "sarah",
      name: "Dr. Sarah Chen",
      motivation: "Sarah wants to succeed in her career."
    }
  ]
};

export default function StoryInsightsPage() {
  return (
    <div className="min-h-screen bg-sf-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Story Insights Demo</h1>
          <p className="text-gray-300">
            Experience the AI-powered story analysis with adaptive interaction modes
          </p>
        </div>

        {/* StoryInsights Component */}
        <StoryInsights 
          currentStoryData={mockStoryData}
          className="mb-8"
        />

        {/* Feature Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Co-Pilot Mode */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-white">Co-Pilot Mode</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Perfect for novice creators. AI automatically applies low-risk, high-confidence 
              recommendations while you focus on the creative process.
            </p>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Automatic application of safe changes</li>
              <li>• Real-time notifications of applied changes</li>
              <li>• Easy undo functionality for all changes</li>
              <li>• Guided assistance for high-impact decisions</li>
            </ul>
          </div>

          {/* Guidance Mode */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <span className="text-2xl">👁️</span>
              </div>
              <h3 className="text-xl font-bold text-white">Guidance Mode</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Ideal for expert creators who want full control. Review every recommendation 
              before application with detailed change previews.
            </p>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Full control over all changes</li>
              <li>• Detailed change previews</li>
              <li>• Side-by-side comparisons</li>
              <li>• Professional workflow integration</li>
            </ul>
          </div>
        </div>

        {/* Technical Features */}
        <div className="mt-8 bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Technical Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Type-Safe Mutations</h4>
              <p className="text-sm text-gray-300">
                Discriminated unions ensure AI returns actionable, type-safe data mutations 
                that can be automatically applied or reviewed.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-2">Confidence Scoring</h4>
              <p className="text-sm text-gray-300">
                AI provides confidence scores (0-1) for each recommendation, enabling 
                intelligent automation decisions based on risk assessment.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-400 mb-2">Undo/Redo Stack</h4>
              <p className="text-sm text-gray-300">
                Complete change history with undo/redo functionality, ensuring no creative 
                decision is permanent without your approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
