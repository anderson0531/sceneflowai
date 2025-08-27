'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/Button';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useCallback, useState } from 'react';
import { debounce } from 'lodash';

interface TiptapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  onAIRefine: (selectedText: string) => void;
}

export default function TiptapEditor({ content, onUpdate, onAIRefine }: TiptapEditorProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering editor
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced update function
  const debouncedUpdate = useCallback(
    debounce((newContent: string) => {
      onUpdate(newContent);
      console.log("Treatment Saved.");
    }, 1000),
    [onUpdate]
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      debouncedUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // Style the editable area itself (the "paper")
        class: 'prose prose-sm sm:prose-base lg:prose-lg m-2 sm:m-3 lg:m-5 focus:outline-none leading-relaxed text-gray-900',
      },
    },
    immediatelyRender: false, // Fix hydration mismatch
  });

  // Handle external updates (e.g., if AI Co-Pilot changes the content)
  useEffect(() => {
    if (editor && mounted && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor, mounted]);

  const handleAIRefine = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (selectedText) {
      onAIRefine(selectedText);
    }
  };

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="w-full max-w-4xl bg-white p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <>
      {/* Contextual AI Bubble Menu */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <Button onClick={handleAIRefine} size="sm" variant="default" className="shadow-md">
            <SparklesIcon className="w-4 h-4 mr-2"/> Refine with AI
          </Button>
        </BubbleMenu>
      )}

      {/* Document Container */}
      <div className="w-full max-w-4xl bg-white p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
