'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  Send, 
  Mic, 
  Volume2, 
  VolumeX, 
  Clapperboard,
  User,
  Bot,
  CheckCircle
} from 'lucide-react';
import FlowAvatar from './FlowAvatar';
import { useCue } from '@/store/useCueStore';
import { useGuideStore } from '@/store/useGuideStore';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface CueSidebarProps {
  className?: string;
}

export function CueSidebar({ className }: CueSidebarProps) {
  const { activeContext, clearContext, setSidebarOpen } = useCue();
  const { guide, updateBeat } = useGuideStore();
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: "Welcome! To refine the draft, click a Beat Card or highlight text in the Film Treatment, then ask me here.",
    timestamp: new Date(),
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContextId, setLastContextId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Utility to extract improved idea text from Flow output
  const extractImprovedIdea = (text: string): string | null => {
    const tagMatch = text.match(/<<<IMPROVED_IDEA>>>[\s\S]*?<<<END>>>/);
    if (tagMatch) {
      const body = tagMatch[0].replace('<<<IMPROVED_IDEA>>>', '').replace('<<<END>>>', '').trim();
      return body.length > 0 ? body : null;
    }
    // Fallback: use first paragraph up to 700 chars if it looks like a single-line summary
    const firstPara = text.split('\n\n')[0]?.trim();
    if (firstPara && firstPara.length >= 40 && firstPara.length <= 700) return firstPara;
    return null;
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-expand textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Focus input field when context is invoked
  useEffect(() => {
    if (activeContext && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeContext]);

  // Update welcome message only when context actually changes
  useEffect(() => {
    // Skip the initial render to prevent duplicate messages
    if (!hasInitialized) {
      setHasInitialized(true);
      if (activeContext) {
        setLastContextId(activeContext.id || null);
      }
      return;
    }

    if (activeContext && activeContext.id !== lastContextId) {
      // Add a visual separator for new chat threads
      const separatorMessage: Message = {
        id: `separator-${Date.now()}`,
        role: 'assistant',
        content: `--- New Focus: ${activeContext.content} ---`,
        timestamp: new Date(),
      };
      
      const contextMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I'm ready to help you with "${activeContext.content}". What would you like me to focus on?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, separatorMessage, contextMessage]);
      setLastContextId(activeContext.id || null);
    } else if (!activeContext && lastContextId) {
      // Context was cleared
      setLastContextId(null);
    }
  }, [activeContext, lastContextId, hasInitialized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create assistant message for streaming
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add the current user message
      conversationHistory.push({
        role: 'user',
        content: userMessage.content
      });

      // Build context from active context and current location
      const context = {
        pathname: window.location.pathname,
        currentStep: 'spark-studio',
        project: {
          id: guide.projectId,
          title: guide.title,
          description: activeContext ? `Working on: ${activeContext.content}` : undefined,
          metadata: {
            concept: guide.filmTreatment ? guide.filmTreatment.slice(0, 500) : undefined,
            characters: guide.characters.map(c => ({
              name: c.name,
              archetype: c.archetype,
              motivation: c.primaryMotivation
            })),
            beatSheet: guide.beatSheet.map(b => ({
              title: b.title,
              act: b.act,
              summary: b.summary.slice(0, 200)
            })),
            activeContext: activeContext
          }
        }
      };

      // Call the Cue API
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const responseText = data.reply || "I apologize, but I couldn't generate a response. Please try again.";

      // Simulate streaming for better UX
      for (let i = 0; i <= responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 15));
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: responseText.slice(0, i) }
              : msg
          )
        );
      }

      // Mark streaming as complete
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, streaming: false }
            : msg
        )
      );

      // Avoid adding extra hint messages; Apply button will render inline once

    } catch (error) {
      console.error('Error calling Cue API:', error);
      
      // Show error message
      const errorText = "I'm having trouble connecting right now. Please check your connection and try again.";
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { 
                ...msg, 
                content: errorText,
                streaming: false 
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run idea optimization when requested from ProjectIdeaTab
  useEffect(() => {
    const handler = async (e: any) => {
      const payload = e?.detail;
      if (!payload) return;

      const userPrompt = [
        'You are Flow, an AI Co‑Director assisting the creator in refining a Concept Treatment input description for blueprint generation.',
        '',
        'TASKS:',
        '1) From the provided context, build an accurate single‑paragraph INPUT_DESCRIPTION that faithfully represents the current concept (title, synopsis/logline, genre, audience, tone, duration, structure).',
        '2) If the creator provides additional instructions, refine that INPUT_DESCRIPTION accordingly to produce a stronger, clearer paragraph suited for concept blueprint generation.',
        '3) If no instruction has been given yet, invite the creator to provide one (e.g., "Make the story more inspirational"), but still return the baseline INPUT_DESCRIPTION now.',
        '',
        'FORMATTING (STRICT):',
        'Return ONLY these blocks in order:',
        '<<<INPUT_DESCRIPTION>>>',
        '{single paragraph}',
        '<<<IMPROVED_IDEA>>>',
        '{single paragraph (refined if instruction present, otherwise same as INPUT_DESCRIPTION)}',
        '<<<GUIDANCE>>>',
        'Suggest 1-2 example refinement prompts the creator could try.',
        '',
        'CONSTRAINTS:',
        '- Preserve creator intent; strengthen clarity, hook, tone, and audience resonance.',
        '- No bullet lists except inside <<<GUIDANCE>>>. No templates. No extra prose outside blocks.'
      ].join('\n');

      const syntheticUserMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `${userPrompt}\n\nContext: ${JSON.stringify(payload)}`,
        timestamp: new Date(),
      } as any;

      setMessages(prev => [...prev, syntheticUserMessage]);
      setIsLoading(true);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true,
      };
      setMessages(prev => [...prev, assistantMessage]);

      try {
        const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
        conversationHistory.push({ role: 'user', content: syntheticUserMessage.content });

        const context = {
          pathname: window.location.pathname,
          currentStep: 'spark-studio',
          project: {
            id: guide.projectId,
            title: guide.title,
            metadata: { activeContext: { type: 'text', payload } }
          }
        };

        const response = await fetch('/api/cue/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory, context })
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const responseText = data.reply || '';

        for (let i = 0; i <= responseText.length; i++) {
          await new Promise(r => setTimeout(r, 12));
          setMessages(prev => prev.map(msg => msg.id === assistantMessage.id ? { ...msg, content: responseText.slice(0, i) } : msg));
        }

        setMessages(prev => prev.map(msg => msg.id === assistantMessage.id ? { ...msg, streaming: false } : msg));

        // Show apply button hint
        const improved = extractImprovedIdea(responseText);
        const inputBlock = (() => {
          const m = responseText.match(/<<<INPUT_DESCRIPTION>>>[\s\S]*?<<<IMPROVED_IDEA>>>/);
          if (!m) return '';
          return m[0]
            .replace('<<<INPUT_DESCRIPTION>>>', '')
            .replace('<<<IMPROVED_IDEA>>>', '')
            .trim();
        })();
        if (improved || inputBlock) {
          setMessages(prev => [...prev, { id: `${Date.now()}-apply-hint`, role: 'assistant', content: 'Click “Apply to Idea Input” to use the improved text.', timestamp: new Date() }]);
        }
      } catch (err) {
        console.error('Idea optimization failed', err);
        setMessages(prev => prev.map(msg => msg.id === assistantMessage.id ? { ...msg, content: 'I hit a snag optimizing the text. Please try again.', streaming: false } : msg));
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('flow.optimizeIdea', handler as EventListener);
    return () => window.removeEventListener('flow.optimizeIdea', handler as EventListener);
  }, [messages, guide]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMicClick = () => {
    setIsRecording(!isRecording);
    // TODO: Implement VTT (Voice-to-Text) functionality
    console.log('Microphone clicked:', !isRecording ? 'Start recording' : 'Stop recording');
  };

  const handleSpeakerClick = () => {
    setIsMuted(!isMuted);
    // TODO: Implement TTS control
    console.log('Speaker clicked:', !isMuted ? 'Muted' : 'Unmuted');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-800", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-700 bg-gray-750">
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded-lg">
            <FlowAvatar status={isLoading ? 'processing' : 'idle'} size={36} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Flow Co‑Pilot</h2>
            <p className="text-xs text-purple-300 font-medium">Context‑Aware Assistant</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          className="text-gray-100 hover:text-white hover:bg-gray-700"
          aria-label="Close Flow Co-Pilot"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Chat History Body */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => {
          // Check if this is a separator message
          const isSeparator = message.id.startsWith('separator-');
          
          if (isSeparator) {
            return (
              <div key={message.id} className="flex justify-center my-6">
                <div className="flex items-center space-x-3 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-purple-300">{message.content}</span>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            );
          }
          
          return (
            <div
              key={message.id}
              className={cn(
                "flex space-x-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg border border-purple-500/30 flex items-center justify-center">
                <Clapperboard className="w-5 h-5 text-purple-400" />
              </div>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2",
                message.role === 'user'
                  ? 'bg-sf-primary text-white'
                  : 'bg-gray-700 text-white'
              )}
            >
              <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {message.streaming && (
                <div className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
              
              {/* Apply Changes Button for Beat Card Context */}
              {message.role === 'assistant' && 
               activeContext?.type === 'beatCard' && 
               !message.streaming && 
               message.content.length > 100 && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <Button
                    onClick={() => {
                      const currentBeat = guide.beatSheet.find(b => b.id === activeContext.id);
                      if (currentBeat) {
                        // Extract key improvements from Cue's response
                        const enhancement = message.content.substring(0, 300).replace(/[\n\r]+/g, ' ');
                        const improvedSummary = currentBeat.summary + "\n\n[Cue Enhancement]: " + enhancement;
                        
                        // Update the beat
                        updateBeat(activeContext.id!, { summary: improvedSummary });
                        
                        // Show success message
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: "✅ Changes applied to the beat card! The improvements have been integrated into your story structure.",
                          timestamp: new Date()
                        }]);
                      }
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Apply to Beat Card
                  </Button>
                </div>
              )}

              {/* Apply to Idea Input when Flow returns IMPROVED_IDEA */}
              {message.role === 'assistant' &&
               activeContext?.payload?.input !== undefined &&
               !message.streaming && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <Button
                    onClick={() => {
                      // Parse improved text; if missing, fall back to INPUT_DESCRIPTION
                      const improved = extractImprovedIdea(message.content);
                      let applyText = improved || '';
                      if (!applyText) {
                        const m = message.content.match(/<<<INPUT_DESCRIPTION>>>[\s\S]*?(?=<<<)/);
                        if (m) applyText = m[0].replace('<<<INPUT_DESCRIPTION>>>', '').trim();
                      }
                      if (applyText) {
                        window.dispatchEvent(new CustomEvent('flow.applyIdeaInput', { detail: { improved: applyText } }));
                        setMessages(prev => ([...prev, {
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: '✅ Applied the refined description to your Concept Treatment input.',
                          timestamp: new Date()
                        }]));
                      }
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md"
                  >
                    Apply to Idea Input
                  </Button>
                </div>
              )}
              
              <div className={cn(
                "text-sm mt-1 opacity-80",
                message.role === 'user' ? 'text-gray-100' : 'text-gray-300'
              )}>
                {formatTime(message.timestamp)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Indicator Area */}
      {activeContext && (
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between bg-sf-primary/10 border border-sf-primary/20 rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-sf-primary rounded-full animate-pulse" />
              <span className="text-sm text-sf-text-primary">
                {activeContext.type === 'text' && 'Refining text: '}
                {activeContext.type === 'beatCard' && 'Working on beat card: '}
                {activeContext.type === 'character' && 'Developing character: '}
                "{activeContext.content.length > 50 ? activeContext.content.substring(0, 50) + '...' : activeContext.content}"
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearContext}
              className="text-sf-primary hover:text-sf-accent hover:bg-sf-primary/10 p-1 h-auto"
              aria-label="Clear context"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer Input Area */}
      <div className="border-t border-gray-700 bg-gray-750 p-4">
        <div className="flex items-end space-x-2">
          {/* Microphone Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMicClick}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-colors",
              isRecording 
                ? "text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20" 
                : "text-gray-100 hover:text-white hover:bg-gray-600"
            )}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
          >
            <Mic className={cn("w-4 h-4", isRecording && "animate-pulse")} />
          </Button>

          {/* Textarea Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Flow to refine or brainstorm..."
              className="min-h-[44px] max-h-32 resize-none bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-sf-primary focus:ring-sf-primary pr-20"
              disabled={isLoading}
              rows={1}
            />
            
            {/* Right side buttons container */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              {/* Speaker Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeakerClick}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isMuted 
                    ? "text-gray-400 hover:text-gray-300" 
                    : "text-gray-100 hover:text-white hover:bg-gray-600"
                )}
                aria-label={isMuted ? "Unmute Flow" : "Mute Flow"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-1.5 bg-sf-primary hover:bg-sf-primary-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Input hints */}
        <div className="mt-2 text-sm text-gray-100 font-medium">
          Press Enter to send • Shift+Enter for new line • Click mic for voice input
        </div>
      </div>
    </div>
  );
}
