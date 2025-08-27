'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { Button } from '@/components/ui/Button';
import { SparklesIcon, Wand2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface FloatingToolbar {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export function TreatmentTab() {
  const { guide, updateTreatment } = useGuideStore();
  const { invokeCue } = useCue();
  const [content, setContent] = useState(guide.filmTreatment);
  const [isClient, setIsClient] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbar>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
  });
  const contentRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

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
        content: floatingToolbar.selectedText
      });
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
    }
  };

  // Handle content updates
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateTreatment(newContent);
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
            return <h1 key={Math.random()} className="text-2xl font-bold text-white mb-4">{children}</h1>;
          case 'h2':
            return <h2 key={Math.random()} className="text-xl font-semibold text-white mb-3">{children}</h2>;
          case 'h3':
            return <h3 key={Math.random()} className="text-lg font-semibold text-white mb-2">{children}</h3>;
          case 'p':
            return <p key={Math.random()} className="text-gray-300 mb-3 leading-relaxed">{children}</p>;
          case 'strong':
            return <strong key={Math.random()} className="font-semibold text-white">{children}</strong>;
          case 'em':
            return <em key={Math.random()} className="italic text-gray-200">{children}</em>;
          case 'ul':
            return <ul key={Math.random()} className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>;
          case 'ol':
            return <ol key={Math.random()} className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>;
          case 'li':
            return <li key={Math.random()} className="ml-4">{children}</li>;
          case 'blockquote':
            return <blockquote key={Math.random()} className="border-l-4 border-teal-400 pl-4 italic text-gray-200 mb-3">{children}</blockquote>;
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
        <div className="w-full max-w-4xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh] flex items-center justify-center">
          <div className="text-gray-400">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 sm:py-6 flex justify-center">
      <div className="w-full max-w-4xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
        {/* Header with AI Refine button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Film Treatment</h1>
          <Button 
            onClick={() => invokeCue({
              type: 'text',
              content: 'Refine the entire film treatment'
            })}
            className="bg-sf-primary hover:bg-sf-primary-dark text-white"
          >
            <SparklesIcon className="w-4 h-4 mr-2" />
            Refine with Cue
          </Button>
        </div>
        
        {/* Content Display with Selection Support */}
        <div 
          ref={contentRef}
          className="prose prose-invert max-w-none relative select-text"
          style={{ userSelect: 'text' }}
        >
          {renderContent(content)}
          
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
                className="bg-sf-primary hover:bg-sf-primary-dark text-white px-3 py-1.5 text-xs"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Ask Cue
              </Button>
            </div>
          )}
        </div>
        
        {/* Edit Mode Toggle */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Edit Mode</h3>
            <Button 
              onClick={() => invokeCue({
                type: 'text',
                content: 'Help me improve this treatment'
              })}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </Button>
          </div>
          
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-64 bg-gray-700 border border-gray-600 rounded-lg p-4 text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            placeholder="Enter your film treatment here... You can use HTML tags like <h1>, <h2>, <p>, <strong>, <em>, <ul>, <li> for formatting."
          />
          
          <div className="mt-3 text-xs text-gray-400">
            <p>💡 <strong>Pro tip:</strong> Use HTML tags for formatting. Examples:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><code className="bg-gray-600 px-1 rounded">&lt;h1&gt;</code> for main titles</li>
              <li><code className="bg-gray-600 px-1 rounded">&lt;h2&gt;</code> for section headers</li>
              <li><code className="bg-gray-600 px-1 rounded">&lt;strong&gt;</code> for bold text</li>
              <li><code className="bg-gray-600 px-1 rounded">&lt;ul&gt;&lt;li&gt;</code> for bullet lists</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
