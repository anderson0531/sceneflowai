'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { Button } from '@/components/ui/Button';
import { SparklesIcon, Wand2, Edit3, Eye, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FloatingToolbar {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export function TreatmentTab() {
  const { guide, updateTreatment } = useGuideStore();
  const { invokeCue } = useCue();
  
  // Debug logging
  console.log('🎬 TreatmentTab: Current guide state:', guide);
  console.log('🎬 TreatmentTab: Film treatment content:', guide.filmTreatment);
  const [isClient, setIsClient] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbar>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
  });
  const [showRefinementOptions, setShowRefinementOptions] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Monitor store changes
  useEffect(() => {
    console.log('🎬 TreatmentTab: Store updated, new film treatment:', guide.filmTreatment);
  }, [guide.filmTreatment]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || !contentRef.current) return;

      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        
        // Position toolbar near the selection
        setFloatingToolbar({
          visible: true,
          x: rect.left + (rect.width / 2) - containerRect.left,
          y: rect.top - containerRect.top - 50, // Position above the selection
          selectedText: selectedText
        });
      } else {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleAskCue = () => {
    if (floatingToolbar.selectedText) {
      invokeCue({
        type: 'text',
        content: `Refine this selected text from the Film Treatment: "${floatingToolbar.selectedText}"`
      });
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
    }
  };

  const handleRefineSection = (section: string) => {
    invokeCue({
      type: 'text',
      content: `Refine the ${section} section of the Film Treatment. Make it more compelling, clear, and production-ready.`
    });
  };

  const handleRefineEntireTreatment = () => {
    invokeCue({
      type: 'text',
      content: `Refine the entire Film Treatment. Improve clarity, flow, and production value while maintaining the core story and themes.`
    });
  };

  const handleExpandSection = (section: string) => {
    invokeCue({
      type: 'text',
      content: `Expand the ${section} section of the Film Treatment with more detail, examples, and production considerations.`
    });
  };

  // Parse HTML content and render it properly
  const renderContent = (htmlContent: string) => {
    if (!isClient) return null;
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Convert to React elements
    const convertNode = (node: Node): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const children = Array.from(element.childNodes).map(convertNode);
        
        switch (tagName) {
          case 'h1':
            return <h1 key={Math.random()} className="text-3xl font-bold text-white mb-6">{children}</h1>;
          case 'h2':
            return <h2 key={Math.random()} className="text-2xl font-semibold text-white mb-4 mt-8">{children}</h2>;
          case 'h3':
            return <h3 key={Math.random()} className="text-xl font-semibold text-white mb-3 mt-6">{children}</h3>;
          case 'p':
            return <p key={Math.random()} className="text-gray-300 mb-4 leading-relaxed text-base">{children}</p>;
          case 'strong':
            return <strong key={Math.random()} className="font-semibold text-white">{children}</strong>;
          case 'em':
            return <em key={Math.random()} className="italic text-gray-200">{children}</em>;
          case 'ul':
            return <ul key={Math.random()} className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">{children}</ul>;
          case 'ol':
            return <ol key={Math.random()} className="list-decimal list-inside text-gray-300 mb-4 space-y-2 ml-4">{children}</ol>;
          case 'li':
            return <li key={Math.random()} className="ml-2">{children}</li>;
          case 'blockquote':
            return <blockquote key={Math.random()} className="border-l-4 border-blue-500 pl-6 italic text-gray-200 mb-4 bg-gray-700/30 py-3 rounded-r-lg">{children}</blockquote>;
          default:
            return <span key={Math.random()}>{children}</span>;
        }
      }
      
      return null;
    };
    
    return Array.from(tempDiv.childNodes).map(convertNode);
  };

  if (!isClient) {
    return (
      <div className="py-3 sm:py-6 flex justify-center">
        <div className="w-full max-w-5xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh] flex items-center justify-center">
          <div className="text-gray-400">Loading Film Treatment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 sm:py-6 flex justify-center">
      <div className="w-full max-w-5xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
        {/* Header with AI Refine button */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Film Treatment</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowRefinementOptions(!showRefinementOptions)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Refine Options
            </Button>
            <Button 
              onClick={handleRefineEntireTreatment}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Refine with Cue
            </Button>
          </div>
        </div>

        {/* Refinement Options Panel */}
        {showRefinementOptions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gray-700/50 border border-gray-600 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Refine Your Film Treatment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() => handleRefineSection('Title and Logline')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Title & Logline</div>
                  <div className="text-xs text-gray-400 mt-1">Make it more compelling</div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleRefineSection('Synopsis')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Synopsis</div>
                  <div className="text-xs text-gray-400 mt-1">Improve flow and clarity</div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleRefineSection('Target Audience')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Target Audience</div>
                  <div className="text-xs text-gray-400 mt-1">Define more precisely</div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleRefineSection('Genre and Tone')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Genre & Tone</div>
                  <div className="text-xs text-gray-400 mt-1">Clarify style and mood</div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleRefineSection('Key Themes')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Key Themes</div>
                  <div className="text-xs text-gray-400 mt-1">Strengthen messaging</div>
                </div>
              </Button>
              
              <Button
                onClick={() => handleRefineSection('Story Structure')}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white text-left justify-start h-auto py-3 px-4"
              >
                <div>
                  <div className="font-medium">Story Structure</div>
                  <div className="text-xs text-gray-400 mt-1">Optimize pacing</div>
                </div>
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="flex gap-3">
                <Button
                  onClick={() => handleExpandSection('Synopsis')}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Expand Synopsis
                </Button>
                <Button
                  onClick={() => handleExpandSection('Character Development')}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Add Character Details
                </Button>
                <Button
                  onClick={() => handleExpandSection('Production Notes')}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Add Production Notes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Content Display with Selection Support */}
        <div 
          ref={contentRef}
          className="prose prose-invert max-w-none relative select-text bg-gray-900/30 rounded-xl p-8 border border-gray-700/50"
          style={{ userSelect: 'text' }}
        >
          {guide.filmTreatment ? (
            renderContent(guide.filmTreatment)
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Film Treatment Yet</h3>
              <p className="text-gray-400 mb-6">Cue will generate a comprehensive Film Treatment based on your project idea.</p>
              <Button
                onClick={handleRefineEntireTreatment}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Generate with Cue
              </Button>
            </div>
          )}
          
          {/* Floating Toolbar */}
          {floatingToolbar.visible && (
            <div 
              className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 animate-in fade-in-0 zoom-in-95"
              style={{
                left: `${floatingToolbar.x}px`,
                top: `${floatingToolbar.y}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <Button
                onClick={handleAskCue}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Ask Cue
              </Button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            💡 <strong>Pro tip:</strong> Select any text to get AI suggestions, or use the refinement options above to improve specific sections.
          </p>
        </div>
      </div>
    </div>
  );
}
