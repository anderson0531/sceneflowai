'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SparklesIcon, Eye, RefreshCw, Clapperboard, Lightbulb, Users, Award, ChevronDown, LayoutGrid, Type, ImageIcon } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ModernTreatmentView } from '@/components/treatment';
import type { TreatmentVisuals, TreatmentMood } from '@/types/treatment-visuals';
import type { FilmTreatmentData } from '@/lib/types/reports';
import { OutlineEditor } from '@/components/studio/OutlineEditor';
import ScriptViewer from '@/components/studio/ScriptViewer';

interface FloatingToolbar {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export function TreatmentTab() {
  const { guide, updateTreatment, updateTitle, updateTreatmentDetails, setFullScriptText, setScenesOutline } = useGuideStore();
  const { invokeCue } = useCue();
  
  // Debug logging
  console.log('🎬 TreatmentTab: Current guide state:', guide);
  console.log('🎬 TreatmentTab: Film treatment content:', guide.filmTreatment);
  console.log('🎬 TreatmentTab: Guide type:', typeof guide.filmTreatment);
  console.log('🎬 TreatmentTab: Guide filmTreatment length:', guide.filmTreatment?.length || 0);
  const [isClient, setIsClient] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbar>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
  });
  const [showRefinementOptions, setShowRefinementOptions] = useState(false);
  const [isGeneratingTreatment, setIsGeneratingTreatment] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [fullScript, setFullScript] = useState<string | null>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentText, setAssessmentText] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);

  interface ParsedAssessment {
    header: {
      projectTitle?: string;
      assessedBy?: string;
      dateAssessed?: string;
      dateSubmitted?: string;
      writers?: string;
      genre?: string;
      pageCount?: string;
    };
    summary: {
      logline?: string;
      coreConcept?: string;
      strengths: string[];
      weaknesses: string[];
      recommendation?: string;
    };
    nextSteps: string[];
  }

  const [parsedAssessment, setParsedAssessment] = useState<ParsedAssessment | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // Modern Treatment View state
  const [treatmentViewMode, setTreatmentViewMode] = useState<'classic' | 'modern'>('classic');
  const [treatmentVisuals, setTreatmentVisuals] = useState<TreatmentVisuals | null>(null);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);

  // Parse treatment data for ModernTreatmentView
  // Works with existing Blueprint data - handles JSON, HTML, and treatmentDetails
  const parsedTreatment = useMemo((): FilmTreatmentData | null => {
    // Build base treatment object from treatmentDetails (always available for existing projects)
    const details = guide.treatmentDetails || {};
    
    // Extract synopsis - try filmTreatment first, then details.synopsis
    let synopsis = '';
    if (guide.filmTreatment && typeof guide.filmTreatment === 'string') {
      // Check if it's HTML content - extract text content for synopsis
      if (guide.filmTreatment.includes('<') && guide.filmTreatment.includes('>')) {
        // It's HTML - use treatmentDetails.synopsis if available, otherwise extract from HTML
        synopsis = details.synopsis || guide.filmTreatment.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      } else {
        // Try parsing as JSON
        try {
          const parsed = JSON.parse(guide.filmTreatment);
          // It's JSON - merge with details and return
          const mergedData = {
            ...parsed,
            title: parsed.title || details.title || guide.title || '',
            logline: parsed.logline || details.logline || '',
            synopsis: parsed.synopsis || details.synopsis || '',
          };
          // Merge with characters from guide if available
          if (guide.characters && guide.characters.length > 0) {
            mergedData.character_descriptions = guide.characters.map(char => ({
              name: char.name,
              role: char.role || 'Supporting',
              description: char.description || char.backstory || '',
              image_prompt: char.imagePrompt || ''
            }));
          }
          return mergedData as FilmTreatmentData;
        } catch {
          // Not JSON - use as synopsis directly
          synopsis = guide.filmTreatment;
        }
      }
    } else {
      synopsis = details.synopsis || '';
    }
    
    // Build from treatmentDetails (for existing Blueprint projects)
    const baseTreatment: FilmTreatmentData = {
      title: details.title || guide.title || 'Untitled Project',
      logline: details.logline || '',
      synopsis: synopsis,
      genre: details.genre || '',
      author_writer: details.author || '',
      setting: details.setting || '',
      protagonist: details.protagonist || '',
      antagonist: details.antagonist || '',
      tone: details.tone || '',
      visual_style: details.visualStyle || '',
      themes: details.themes || [],
      act_breakdown: details.structure ? {
        act1: details.structure.act1 || '',
        act2: details.structure.act2 || '',
        act3: details.structure.act3 || ''
      } : undefined,
      character_descriptions: guide.characters?.map(char => ({
        name: char.name,
        role: char.role || 'Supporting',
        description: char.description || char.backstory || '',
        image_prompt: char.imagePrompt || ''
      })) || []
    };
    
    // Only return null if we have absolutely nothing to show
    if (!baseTreatment.title && !baseTreatment.logline && !baseTreatment.synopsis) {
      return null;
    }
    
    return baseTreatment;
  }, [guide.filmTreatment, guide.treatmentDetails, guide.characters, guide.title]);

  // Handler for generating all treatment visuals
  const handleGenerateVisuals = useCallback(async () => {
    if (!parsedTreatment) return;
    
    setIsGeneratingVisuals(true);
    try {
      const response = await fetch('/api/treatment/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guide.projectId,
          treatment: parsedTreatment,
          generateAll: true,
          mood: treatmentVisuals?.mood || 'balanced'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTreatmentVisuals(data.visuals);
      }
    } catch (error) {
      console.error('Failed to generate treatment visuals:', error);
    } finally {
      setIsGeneratingVisuals(false);
    }
  }, [parsedTreatment, guide.projectId, treatmentVisuals?.mood]);

  // Handler for regenerating a single visual
  const handleRegenerateVisual = useCallback(async (
    type: 'hero' | 'character' | 'act' | 'keyProp',
    id?: string | number
  ) => {
    if (!parsedTreatment) return;
    
    setIsGeneratingVisuals(true);
    try {
      const response = await fetch('/api/treatment/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guide.projectId,
          treatment: parsedTreatment,
          visualType: type,
          visualId: id,
          mood: treatmentVisuals?.mood || 'balanced'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update specific visual in state
        setTreatmentVisuals(prev => prev ? { ...prev, ...data.visuals } : data.visuals);
      }
    } catch (error) {
      console.error('Failed to regenerate visual:', error);
    } finally {
      setIsGeneratingVisuals(false);
    }
  }, [parsedTreatment, guide.projectId, treatmentVisuals?.mood]);

  // Handler for mood change
  const handleMoodChange = useCallback((mood: TreatmentMood) => {
    setTreatmentVisuals(prev => prev ? { ...prev, mood } : null);
  }, []);

  const parseAssessment = (text: string): ParsedAssessment => {
    const getBlockAfter = (label: string): string => {
      const pattern = new RegExp(`${label}\\**?\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*\\\n|\\n\\*\\*\\d|\\n---|$)`, 'i');
      const m = text.match(pattern);
      return (m && m[1] || '').trim();
    };
    const getInlineAfter = (label: string): string => {
      const pattern = new RegExp(`${label}\\**?:\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`, 'i');
      const m = text.match(pattern);
      return (m && m[1] || '').trim();
    };
    const collectBullets = (sectionLabel: string): string[] => {
      const section = getBlockAfter(sectionLabel);
      return section
        .split(/\n/)
        .map(l => l.replace(/^\s*[-*]\s*/, '').trim())
        .filter(l => l.length > 0 && !/^\*\*/.test(l));
    };

    const header: ParsedAssessment['header'] = {
      projectTitle: (text.match(/\*\*Project Title:\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      assessedBy: (text.match(/\*\*Assessed By:\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      dateAssessed: (text.match(/\*\*Date Assessed:\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      dateSubmitted: (text.match(/\*\*Date Submitted:\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      writers: (text.match(/\*\*Writer\(s\):\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      genre: (text.match(/\*\*Genre:\*\*\s*`?([^\n`]+)`?/i) || [])[1],
      pageCount: (text.match(/\*\*Page Count:\*\*\s*`?([^\n`]+)`?/i) || [])[1]
    };

    const recommendationLine = getBlockAfter('\\*\\*5\\. Overall Recommendation');

    return {
      header,
      summary: {
        logline: getBlockAfter('\\*\\*1\\. Logline'),
        coreConcept: getBlockAfter('\\*\\*2\\. Core Concept Analysis'),
        strengths: collectBullets('\\*\\*3\\. Key Strengths'),
        weaknesses: collectBullets('\\*\\*4\\. Key Weaknesses'),
        recommendation: recommendationLine.replace(/^[-*]\s*/, '').trim()
      },
      nextSteps: collectBullets('\\*\\*3\\. Recommended Next Steps').length
        ? collectBullets('\\*\\*3\\. Recommended Next Steps')
        : collectBullets('Recommended Next Steps')
    };
  };

  useEffect(() => {
    if (!assessmentText) {
      setParsedAssessment(null);
      return;
    }
    try {
      setParsedAssessment(parseAssessment(assessmentText));
    } catch {
      setParsedAssessment(null);
    }
  }, [assessmentText]);

  // Seed an editable refinement instruction from assessment findings
  useEffect(() => {
    try {
      const weaknesses = parsedAssessment?.summary.weaknesses || []
      const nextSteps = parsedAssessment?.nextSteps || []
      const list = [...weaknesses, ...nextSteps].slice(0, 8)
      const base = list.length
        ? `Revise the Film Treatment by addressing: ${list.map(s=>s.replace(/^[\-•]\s*/, '')).join('; ')}.`
        : 'Revise the Film Treatment to strengthen theme, character depth, pacing, and stakes.'
      const guardrails = 'Preserve the core concept and title unless the instruction says otherwise. Return ONLY a JSON object with keys: title, logline, synopsis, targetAudience, genre, duration, themes, structure.'
      setRefineInstruction(`${base} ${guardrails}`)
    } catch {
      setRefineInstruction('Revise the Film Treatment to improve clarity, theme, character depth, pacing, and stakes. Return ONLY a JSON object with keys: title, logline, synopsis, targetAudience, genre, duration, themes, structure.')
    }
  }, [parsedAssessment])

  const handleRefineTreatment = async () => {
    if (!guide.filmTreatment) return
    setIsRefining(true)
    try {
      const treatmentText = typeof guide.filmTreatment === 'string' ? guide.filmTreatment : JSON.stringify(guide.filmTreatment)
      const prompt = [
        'You are a senior development executive. Revise the following Film Treatment according to the instruction.',
        '',
        'CURRENT TREATMENT (JSON or text):',
        treatmentText,
        '',
        'REVISION INSTRUCTION:',
        refineInstruction || 'Revise for clarity and commercial potential while preserving the core concept.',
        '',
        'Output ONLY valid JSON with these keys: title, logline, synopsis, targetAudience, genre, duration, themes, structure.'
      ].join('\n')

      const resp = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data?.reply) {
          try { updateTreatment(data.reply) } catch {}
          setAssessmentOpen(false)
        }
      }
    } finally {
      setIsRefining(false)
    }
  }

  // Minimal Markdown → HTML renderer tailored to our assessment template
  const markdownToHtml = (md: string): string => {
    if (!md) return '';
    let html = md;
    // Escape basic HTML to avoid accidental tags
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Horizontal rules
    html = html.replace(/^\s*---\s*$/gm, '<hr />');
    // Headings (###, ##, #) – our template uses ###
    html = html.replace(/^######\s*(.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s*(.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');
    // Bold and code
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Convert bullet lists: group consecutive * or - lines into <ul>
    html = html.replace(/(^([ \t]*)(?:[-*])\s.+(?:\n\2(?:[-*])\s.+)*)/gm, (m) => {
      const items = m.split(/\n/).map(l => l.replace(/^\s*[-*]\s+/, '').trim()).filter(Boolean);
      return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    });
    // Paragraphs: wrap standalone lines/blocks that are not already block tags
    const lines = html.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    html = lines.map(block => {
      if (/^(<h\d|<ul>|<hr\s*\/>)|<p>|<blockquote>|<ol>|<pre>|<table>/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    }).join('\n');
    return html;
  };

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate scene outline and script once when treatment arrives
  useEffect(() => {
    if (!guide.filmTreatment) return;
    generateOutlineAndScript();
  }, [guide.filmTreatment]);

  // Removed billboard image state

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
    const title = (guide as any)?.treatmentDetails?.title || (guide as any)?.title || 'Untitled Project';
    const treatmentText = typeof guide.filmTreatment === 'string' ? guide.filmTreatment : JSON.stringify(guide.filmTreatment || {});
    const today = new Date().toISOString().slice(0,10);
    const prompt = [
      'You are a senior Development Executive at a film studio. Assess the following film treatment and produce a professional Film Treatment Assessment using the exact markdown template provided.',
      '',
      'CONTEXT – TREATMENT:',
      treatmentText,
      '',
      'OUTPUT REQUIREMENTS:',
      '- Use the following template verbatim, filling all fields. If any field is unknown, infer briefly and label as "N/A" only if truly unavailable.',
      '- Keep section headings and bold labels exactly as shown.',
      '- Ratings should be integers 1–5.',
      '- Output ONLY the completed markdown; do not include any preamble or analysis outside the template.',
      '',
      'TEMPLATE:',
      '### **Film Treatment Assessment Structure**',
      '',
      `**Project Title:** \`${title}\``,
      '**Writer(s):** `[Writer\'s Name]`',
      '**Genre:** `[Primary Genre / Secondary Genre]`',
      '**Page Count:** `[e.g., 25 pages]`',
      `**Date Submitted:** \`[Date]\``,
      '**Assessed By:** `[SceneFlow Development]`',
      `**Date Assessed:** \`${today}\``,
      '',
      '---',
      '',
      '### **Part 1: Executive Summary**',
      '*(This section is for a quick, top-level overview. It should provide a clear picture and recommendation in under a minute.)*',
      '',
      '**1. Logline:**',
      '*(A one-to-two-sentence summary of the core concept, character, and conflict. If the treatment doesn\'t provide one, create it.)*',
      '',
      '**2. Core Concept Analysis:**',
      '*(A brief evaluation of the central idea.)*',
      '',
      '**3. Key Strengths:**',
      '* `…`',
      '* `…`',
      '* `…`',
      '* `…`',
      '',
      '**4. Key Weaknesses / Areas for Development:**',
      '* `…`',
      '* `…`',
      '* `…`',
      '* `…`',
      '',
      '**5. Overall Recommendation:**',
      '* **RECOMMEND** | **CONSIDER** | **PASS**',
      '',
      '---',
      '',
      '### **Part 2: Detailed Creative Analysis**',
      '*(This section provides the evidence and reasoning for the summary above. Use a rating scale for each category, e.g., 1-5, where 1=Poor, 3=Average, 5=Excellent.)*',
      '',
      '**1. Premise & Concept (Rating: [1-5])**',
      '* **Originality:** …',
      '* **Hook:** …',
      '* **Clarity:** …',
      '',
      '**2. Plot & Structure (Rating: [1-5])**',
      '* **Structure:** …',
      '* **Pacing:** …',
      '* **Stakes & Conflict:** …',
      '* **Logic & Plausibility:** …',
      '* **Resolution:** …',
      '',
      '**3. Characters (Rating: [1-5])**',
      '* **Protagonist:** …',
      '* **Antagonist:** …',
      '* **Supporting Characters:** …',
      '* **Character Dynamics:** …',
      '',
      '**4. Theme & Tone (Rating: [1-5])**',
      '* **Thematic Resonance:** …',
      '* **Tone:** …',
      '* **Visual Potential:** …',
      '',
      '---',
      '',
      '### **Part 3: Commercial & Production Assessment**',
      '',
      '**1. Marketability & Audience (Rating: [1-5])**',
      '* **Target Audience:** …',
      '* **Genre Appeal:** …',
      '* **Comparable Films ("Comps"):** …',
      '',
      '**2. Casting Potential**',
      '* …',
      '',
      '**3. Budgetary & Production Considerations**',
      '* **Estimated Scale:** …',
      '* **Production Challenges:** …',
      '',
      '**4. Franchise / IP Potential**',
      '* …',
      '',
      '---',
      '',
      '### **Part 4: Concluding Remarks & Next Steps**',
      '',
      '**1. Detailed Synopsis:**',
      '*(A neutral, one-to-two-paragraph summary of the plot from beginning to end.)*',
      '',
      '**2. In-Depth Comments & Suggestions:**',
      '*(Be specific, constructive, and actionable.)*',
      '',
      '**3. Recommended Next Steps:**',
      '* …',
    ].join('\n');

    invokeCue({ type: 'analysis', content: 'Generate Film Treatment Assessment', payload: { initialMessage: prompt, autoSend: true } });
  };

  const buildAssessmentPrompt = (): string => {
    const title = (guide as any)?.treatmentDetails?.title || (guide as any)?.title || 'Untitled Project';
    const treatmentText = typeof guide.filmTreatment === 'string' ? guide.filmTreatment : JSON.stringify(guide.filmTreatment || {});
    const today = new Date().toISOString().slice(0,10);
    return [
      'You are a senior Development Executive at a film studio. Assess the following film treatment and produce a professional Film Treatment Assessment using the exact markdown template provided.',
      '',
      'CONTEXT – TREATMENT:',
      treatmentText,
      '',
      'OUTPUT REQUIREMENTS:',
      '- Use the following template verbatim, filling all fields. If any field is unknown, infer briefly and label as "N/A" only if truly unavailable.',
      '- Keep section headings and bold labels exactly as shown.',
      '- Ratings should be integers 1–5.',
      '- Output ONLY the completed markdown; do not include any preamble or analysis outside the template.',
      '',
      'TEMPLATE:',
      '### **Film Treatment Assessment Structure**',
      '',
      `**Project Title:** \`${title}\``,
      '**Writer(s):** `[Writer\'s Name]`',
      '**Genre:** `[Primary Genre / Secondary Genre]`',
      '**Page Count:** `[e.g., 25 pages]`',
      `**Date Submitted:** \`[Date]\``,
      '**Assessed By:** `[SceneFlow Development]`',
      `**Date Assessed:** \`${today}\``,
      '',
      '---',
      '',
      '### **Part 1: Executive Summary**',
      '*(This section is for a quick, top-level overview. It should provide a clear picture and recommendation in under a minute.)*',
      '',
      '**1. Logline:**',
      '*(A one-to-two-sentence summary of the core concept, character, and conflict. If the treatment doesn\'t provide one, create it.)*',
      '',
      '**2. Core Concept Analysis:**',
      '*(A brief evaluation of the central idea.)*',
      '',
      '**3. Key Strengths:**',
      '* `…`',
      '* `…`',
      '* `…`',
      '* `…`',
      '',
      '**4. Key Weaknesses / Areas for Development:**',
      '* `…`',
      '* `…`',
      '* `…`',
      '* `…`',
      '',
      '**5. Overall Recommendation:**',
      '* **RECOMMEND** | **CONSIDER** | **PASS**',
      '',
      '---',
      '',
      '### **Part 2: Detailed Creative Analysis**',
      '*(This section provides the evidence and reasoning for the summary above. Use a rating scale for each category, e.g., 1-5, where 1=Poor, 3=Average, 5=Excellent.)*',
      '',
      '**1. Premise & Concept (Rating: [1-5])**',
      '* **Originality:** …',
      '* **Hook:** …',
      '* **Clarity:** …',
      '',
      '**2. Plot & Structure (Rating: [1-5])**',
      '* **Structure:** …',
      '* **Pacing:** …',
      '* **Stakes & Conflict:** …',
      '* **Logic & Plausibility:** …',
      '* **Resolution:** …',
      '',
      '**3. Characters (Rating: [1-5])**',
      '* **Protagonist:** …',
      '* **Antagonist:** …',
      '* **Supporting Characters:** …',
      '* **Character Dynamics:** …',
      '',
      '**4. Theme & Tone (Rating: [1-5])**',
      '* **Thematic Resonance:** …',
      '* **Tone:** …',
      '* **Visual Potential:** …',
      '',
      '---',
      '',
      '### **Part 3: Commercial & Production Assessment**',
      '',
      '**1. Marketability & Audience (Rating: [1-5])**',
      '* **Target Audience:** …',
      '* **Genre Appeal:** …',
      '* **Comparable Films ("Comps"):** …',
      '',
      '**2. Casting Potential**',
      '* …',
      '',
      '**3. Budgetary & Production Considerations**',
      '* **Estimated Scale:** …',
      '* **Production Challenges:** …',
      '',
      '**4. Franchise / IP Potential**',
      '* …',
      '',
      '---',
      '',
      '### **Part 4: Concluding Remarks & Next Steps**',
      '',
      '**1. Detailed Synopsis:**',
      '*(A neutral, one-to-two-paragraph summary of the plot from beginning to end.)*',
      '',
      '**2. In-Depth Comments & Suggestions:**',
      '*(Be specific, constructive, and actionable.)*',
      '',
      '**3. Recommended Next Steps:**',
      '* …',
    ].join('\n');
  };

  const handleAssessment = async () => {
    try {
      setIsAssessing(true);
      const prompt = buildAssessmentPrompt();
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: {
            pathname: '/treatment/assessment',
            project: { metadata: { title: (guide as any)?.treatmentDetails?.title || guide.title } }
          }
        })
      });
      const data = await response.json();
      const text = data?.reply || 'No assessment returned.';
      setAssessmentText(text);
      setAssessmentOpen(true);
    } catch (e) {
      setAssessmentText('Assessment failed. Please try again.');
      setAssessmentOpen(true);
    } finally {
      setIsAssessing(false);
    }
  };

  const handleExpandSection = (section: string) => {
      invokeCue({
        type: 'text',
        content: `Expand the ${section} section of the Film Treatment with more detail, examples, and production considerations.`
      });
  };

  // Removed billboard image generation

  const generateOutlineAndScript = async () => {
    // Deprecated in favor of explicit outline + chunked script
  };

  const generateOutline = async () => {
    if (!guide.filmTreatment) return;
    setIsGeneratingOutline(true);
    try {
      const resp = await fetch('/api/generate/outline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatment: guide.filmTreatment })
      })
      if (resp.ok) {
        const data = await resp.json();
        const scenesData = data.scenes as any[];
        setScenes(scenesData);
        try { setScenesOutline(scenesData as any); } catch {}
        // Route to Scene Outline tab section
        try { window.dispatchEvent(new CustomEvent('studio.goto.beats')); } catch {}
      }
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const generateScriptFromOutline = async () => {
    if (scenes.length === 0) return;
    setIsGeneratingScript(true);
    setFullScript('');
    try { setFullScriptText(''); } catch {}
    const chunks = chunkArray(scenes, 10);
    let aggregated = '';
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prev = i > 0 ? chunks[i - 1][chunks[i - 1].length - 1]?.summary || '' : '';
      const resp = await fetch('/api/generate/script-chunk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline_chunk: chunk, treatment_context: guide.filmTreatment, previous_scene_summary: prev })
      });
      if (!resp.ok || !resp.body) continue;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        setFullScript(prevText => (prevText || '') + text);
        aggregated += text;
        try { setFullScriptText(aggregated); } catch {}
      }
    }
    setIsGeneratingScript(false);
  };

  const generateFilmTreatment = async () => {
    console.log('🎬 TreatmentTab: Starting Film Treatment generation...');
    setIsGeneratingTreatment(true);
    
    try {
      // Call the intelligence API to generate Film Treatment content
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Generate a comprehensive Film Treatment for a video project. Include title, logline, synopsis, target audience, genre, duration, themes, and structure. Return ONLY valid JSON.'
          }
        ],
        context: {
          type: 'project-creation'
        }
      };
      
      console.log('🎬 TreatmentTab: API request body:', requestBody);
      
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('🎬 TreatmentTab: API response status:', response.status);
      console.log('🎬 TreatmentTab: API response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎬 TreatmentTab: Generated Film Treatment response:', data);
        
        // Update the guide store with the new treatment
        if (data.reply) {
          console.log('🎬 TreatmentTab: Updating treatment with:', data.reply);
          updateTreatment(data.reply);
          
          // Verify the update
          console.log('🎬 TreatmentTab: Treatment updated, new guide state:', guide);
        } else {
          console.error('🎬 TreatmentTab: No reply in response data');
        }
      } else {
        const errorText = await response.text();
        console.error('🎬 TreatmentTab: Failed to generate Film Treatment:', response.status, errorText);
      }
    } catch (error) {
      console.error('🎬 TreatmentTab: Error generating Film Treatment:', error);
    } finally {
      setIsGeneratingTreatment(false);
    }
  };

  // Parse and render Film Treatment content from JSON or HTML
  const renderContent = (content: string) => {
    if (!isClient) return null;
    
    try {
      // First, try to parse as JSON
      const jsonData = JSON.parse(content);
      
      // If it's JSON with a "Treatment" key, extract that
      const treatment = jsonData.Treatment || jsonData.treatment || jsonData;
      
      // Helper: derive audience analysis from available details
      const deriveAudienceAnalysis = () => {
        try {
          const details = {
            targetAudience: treatment.targetAudience,
            tone: treatment.tone || (Array.isArray(treatment.tone_style) ? treatment.tone_style.join(', ') : treatment.tone_style),
            keyThemes: treatment.themes,
            duration: treatment.duration || treatment.estimated_duration
          } as any
          const bullets: string[] = []
          const lines: string[] = []
          if (details.targetAudience) bullets.push(`Primary Audience: ${details.targetAudience}`)
          if (details.tone) bullets.push(`Tone & Style: ${details.tone}`)
          if (details.keyThemes) bullets.push(`Core Themes: ${details.keyThemes}`)
          if (details.duration) bullets.push(`Typical Runtime: ${details.duration}`)
          if (details.keyThemes) lines.push(`Themes such as ${details.keyThemes} resonate strongly with this cohort.`)
          if (details.tone) lines.push(`The ${String(details.tone).toLowerCase()} tone aligns with their content preferences.`)
          if (details.duration) lines.push(`A ${String(details.duration)} runtime matches typical viewing sessions.`)
          if (!lines.length) lines.push('The narrative focus and presentation style align with the interests and consumption patterns of the target cohort.')
          return [bullets.join(' • '), '', 'Why this audience:', '- ' + lines.join('\n- ')].join('\n')
        } catch { return '' }
      }
      
      // Helper: group beats by act from the store
      const renderSeriesStructure = () => {
        try {
          const beats = (guide as any).beatSheet || [];
          if (!Array.isArray(beats) || beats.length === 0) return null;
          const template: string = (guide as any).beatTemplate || 'three-act';
          const templateActs: Record<string, string[]> = {
            'three-act': ['ACT_I','ACT_II','ACT_III'],
            'five-act': ['EXPOSITION','RISING_ACTION','CLIMAX','FALLING_ACTION','DENOUEMENT'],
            'documentary': ['HOOK','INVESTIGATION','COMPLICATION','REVELATION','SYNTHESIS'],
            'debate-educational': ['ACT_I','ACT_IIA','ACT_IIB','ACT_III'],
            'hero-journey': ['ORDINARY_WORLD','CALL_ADVENTURE','SPECIAL_WORLD','ORDEAL','REWARD','RETURN'],
            'save-the-cat': ['SETUP','CATALYST','DEBATE','FUN_GAMES','MIDPOINT','BAD_GUYS','DARK_NIGHT','FINALE']
          }
          const order = templateActs[template] || templateActs['three-act']
          const labelFor: Record<string, string> = {
            ACT_I: 'Act 1', ACT_II: 'Act 2', ACT_III: 'Act 3',
            EXPOSITION: 'Exposition', RISING_ACTION: 'Rising Action', CLIMAX: 'Climax', FALLING_ACTION: 'Falling Action', DENOUEMENT: 'Denouement',
            HOOK: 'Hook', INVESTIGATION: 'Investigation', COMPLICATION: 'Complication', REVELATION: 'Revelation', SYNTHESIS: 'Synthesis',
            ACT_IIA: 'Act II-A', ACT_IIB: 'Act II-B',
            ORDINARY_WORLD: 'Ordinary World', CALL_ADVENTURE: 'Call to Adventure', SPECIAL_WORLD: 'Special World', ORDEAL: 'Ordeal', REWARD: 'Reward', RETURN: 'Return',
            SETUP: 'Setup', CATALYST: 'Catalyst', DEBATE: 'Debate', FUN_GAMES: 'Fun & Games', MIDPOINT: 'Midpoint', BAD_GUYS: 'Bad Guys Close In', DARK_NIGHT: 'Dark Night of the Soul', FINALE: 'Finale'
          }
          const groups: Record<string, any[]> = {};
          for (const code of order) groups[code] = []
          for (const b of beats) {
            const code = (b as any).act || order[0]
            if (!groups[code]) groups[code] = []
            groups[code].push(b)
          }
          return (
            <div className="space-y-6">
              {order.filter(code => (groups[code]||[]).length>0).map(code => (
                <div key={code} className="bg-gray-800/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-white font-semibold text-xl">{labelFor[code] || code}</h5>
                  </div>
                  <div className="space-y-4">
                    {(groups[code]||[]).map((beat:any, idx:number) => (
                      <div key={idx} className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="text-white font-medium text-lg">{beat.title || `Beat ${idx+1}`}</h6>
                          {beat.estimatedDuration && (
                            <span className="text-gray-400 text-sm font-medium bg-gray-600/20 px-2 py-1 rounded">{beat.estimatedDuration}</span>
                          )}
                        </div>
                        <p className="text-gray-300 text-base leading-relaxed">{beat.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        } catch { return null }
      }
      
      // Render structured form fields
      return (
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
            <div className="text-xl font-semibold text-white">{treatment.title || 'No title provided'}</div>
          </div>
          
          {/* Billboard image removed per request */}
          
          {/* Logline */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Logline</label>
            <div className="text-gray-300 leading-relaxed">{treatment.logline || 'No logline provided'}</div>
          </div>
          
          {/* Synopsis */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Synopsis</label>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{treatment.synopsis || 'No synopsis provided'}</div>
          </div>
          
          {/* Target Audience */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Target Audience</label>
            <div className="text-gray-300 leading-relaxed">{treatment.targetAudience || 'No target audience specified'}</div>
          </div>
          
          {/* Genre */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
            <div className="text-gray-300 leading-relaxed">{treatment.genre || 'No genre specified'}</div>
          </div>
          
          {/* Duration */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
            <div className="text-gray-300 leading-relaxed">{treatment.duration || 'No duration specified'}</div>
          </div>
          
          {/* Themes */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Themes</label>
            <div className="text-gray-300 leading-relaxed">{treatment.themes || 'No themes specified'}</div>
          </div>
          
          {/* Structure */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Structure</label>
            <div className="text-gray-300 leading-relaxed">{treatment.structure || 'No structure specified'}</div>
          </div>
          
          {/* Audience Analysis derived */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">Audience Analysis</label>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{deriveAudienceAnalysis() || 'Target audience insights will appear here based on your input.'}</div>
          </div>
          
          {/* Characters from guide store */}
          {Array.isArray((guide as any).characters) && (guide as any).characters.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-sm font-medium text-gray-400 mb-4">Characters</label>
              <div className="space-y-4">
                {(guide as any).characters.map((c:any, i:number) => (
                  <div key={i} className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-white font-medium text-lg">{c.name}</h5>
                      {c.archetype && <span className="text-blue-300 text-sm">{c.archetype}</span>}
                    </div>
                    {c.motivation && <p className="text-gray-300 text-base leading-relaxed">{c.motivation}</p>}
                    {c.arc && typeof c.arc === 'object' && (c.arc.act1 || c.arc.act2 || c.arc.act3) && (
                      <div className="mt-2 text-gray-400 text-sm">Arc — {c.arc.act1 && `Act 1: ${c.arc.act1} `}{c.arc.act2 && `• Act 2: ${c.arc.act2} `}{c.arc.act3 && `• Act 3: ${c.arc.act3}`}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Series Structure from beats */}
          {(guide as any).beatSheet && Array.isArray((guide as any).beatSheet) && (guide as any).beatSheet.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <label className="block text-sm font-medium text-gray-400 mb-4">Series Structure</label>
              {renderSeriesStructure()}
            </div>
          )}
          
          {/* Narrative Reasoning */}
          {(treatment as any).narrative_reasoning && (
            <div className="mt-6 border-t border-gray-700/50 pt-6">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-white">
                    AI Narrative Reasoning
                  </h3>
                  <span className="text-xs text-gray-400">
                    Why the AI made these storytelling choices
                  </span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
              </button>
              
              {showReasoning && (treatment as any).narrative_reasoning && (
                <div className="mt-4 space-y-4">
                  {/* Character Focus */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Character Focus
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {(treatment as any).narrative_reasoning.character_focus}
                    </p>
                  </div>
                  
                  {/* Key Decisions */}
                  {(treatment as any).narrative_reasoning.key_decisions && Array.isArray((treatment as any).narrative_reasoning.key_decisions) && (treatment as any).narrative_reasoning.key_decisions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-purple-500" />
                        Key Creative Decisions
                      </h4>
                      {(treatment as any).narrative_reasoning.key_decisions.map((decision: any, idx: number) => (
                        <div key={idx} className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border-l-4 border-purple-500">
                          <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                            {decision.decision}
                          </div>
                          <div className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                            <strong>Why:</strong> {decision.why}
                          </div>
                          <div className="text-sm text-purple-700 dark:text-purple-300 italic">
                            <strong>Impact:</strong> {decision.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Story Strengths */}
                  {(treatment as any).narrative_reasoning.story_strengths && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Story Strengths
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {(treatment as any).narrative_reasoning.story_strengths}
                      </p>
                    </div>
                  )}
                  
                  {/* User Adjustments */}
                  {(treatment as any).narrative_reasoning.user_adjustments && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Want Different Emphasis?
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {(treatment as any).narrative_reasoning.user_adjustments}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Additional fields - handle any other fields dynamically */}
          {Object.entries(treatment).map(([key, value]) => {
            // Skip fields we've already handled
            const handledFields = ['title', 'logline', 'synopsis', 'targetAudience', 'genre', 'duration', 'themes', 'structure', 'narrative_reasoning'];
            if (handledFields.includes(key)) return null;
            
            return (
              <div key={key} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{String(value) || 'No content provided'}</div>
              </div>
            );
          })}
        </div>
      );
      
    } catch (error) {
      // If JSON parsing fails, try to render as HTML (fallback)
      console.log('🎬 TreatmentTab: Content is not JSON, treating as HTML:', error);
      
      // Use dangerouslySetInnerHTML for SSR-safe HTML rendering
      // This avoids using document.createElement which isn't available on server
      return (
        <div className="space-y-6">
          {/* HTML Content - rendered safely with dangerouslySetInnerHTML */}
          <div 
            className="prose prose-invert max-w-none space-y-4 
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-6
              [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-4 [&_h2]:mt-8
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mb-3 [&_h3]:mt-6
              [&_p]:text-gray-300 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base
              [&_strong]:font-semibold [&_strong]:text-white
              [&_em]:italic [&_em]:text-gray-200
              [&_ul]:list-disc [&_ul]:list-inside [&_ul]:text-gray-300 [&_ul]:mb-4 [&_ul]:space-y-2 [&_ul]:ml-4
              [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:text-gray-300 [&_ol]:mb-4 [&_ol]:space-y-2 [&_ol]:ml-4
              [&_li]:ml-2
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-gray-200 [&_blockquote]:mb-4 [&_blockquote]:bg-gray-700/30 [&_blockquote]:py-3 [&_blockquote]:rounded-r-lg"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      );
    }
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
        {/* Header with AI Refine button and actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Film Treatment</h1>
          </div>
          <div className="flex gap-3 items-center">
            <Button
              onClick={handleAssessment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isAssessing}
            >
              {isAssessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Flow Assessment…
                </>
              ) : (
                'Flow Assessment'
              )}
            </Button>
            <Button 
              onClick={handleRefineEntireTreatment}
              className="bg-blue-600 hover:bg-blue-700 text-white relative"
              disabled={false}
            >
              <Clapperboard className="w-4 h-4 mr-2" />
              Ask Flow
            </Button>
            
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-900/60 rounded-lg p-1 border border-gray-700/50">
              <button
                onClick={() => setTreatmentViewMode('classic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  treatmentViewMode === 'classic'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Type className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setTreatmentViewMode('modern')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  treatmentViewMode === 'modern'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Visual
              </button>
            </div>
          </div>
        </div>

      {/* Assessment Modal */}
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Film Treatment Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-400">A structured, actionable report based on Flow's assessment.</div>

            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Project</div>
                    <div className="text-white font-semibold">{parsedAssessment?.header.projectTitle || (guide as any)?.treatmentDetails?.title || guide.title || 'Untitled Project'}</div>
                  </div>
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Assessed</div>
                    <div className="text-white">{parsedAssessment?.header.dateAssessed || '—'}</div>
                  </div>
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Genre</div>
                    <div className="text-white">{parsedAssessment?.header.genre || '—'}</div>
                  </div>
                  <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Recommendation</div>
                    <div className="text-white font-semibold">{parsedAssessment?.summary.recommendation || '—'}</div>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">Executive Summary</h4>
                  </div>
                  {parsedAssessment?.summary.logline && (
                    <div className="text-gray-300 mb-4">{parsedAssessment.summary.logline}</div>
                  )}
                  {parsedAssessment?.summary.coreConcept && (
                    <div className="text-gray-300">{parsedAssessment.summary.coreConcept}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
                    <h5 className="text-white font-semibold mb-2">Key Strengths</h5>
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                      {(parsedAssessment?.summary.strengths || []).map((s,i)=> (
                        <li key={`str-${i}`}>{s}</li>
                      ))}
                      {(!parsedAssessment || parsedAssessment.summary.strengths.length===0) && (
                        <li className="text-gray-500">—</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-white font-semibold">Key Weaknesses</h5>
                    </div>
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                      {(parsedAssessment?.summary.weaknesses || []).map((w,i)=> (
                        <li key={`weak-${i}`}>{w}</li>
                      ))}
                      {(!parsedAssessment || parsedAssessment.summary.weaknesses.length===0) && (
                        <li className="text-gray-500">—</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Refine Treatment */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-white mb-3">Refine Film Treatment</h4>
                  <p className="text-sm text-gray-400 mb-3">Edit the instruction and submit to revise and repopulate the Film Treatment based on the assessment findings.</p>
                  <textarea
                    className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-gray-100 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={refineInstruction}
                    onChange={(e)=>setRefineInstruction(e.target.value)}
                  />
                  <div className="mt-3 flex gap-3 justify-end">
                    <Button onClick={handleRefineTreatment} disabled={isRefining} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {isRefining ? 'Refining…' : 'Apply Refinement'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
            <Button onClick={()=>setAssessmentOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white">Close</Button>
                  <Button onClick={generateOutline} className="bg-green-600 hover:bg-green-700 text-white">Generate Outline</Button>
                </div>
              </div>
            </div>
            {/* Always-rendered formatted report */}
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <div className="prose prose-invert max-w-none bg-gray-900/40 border border-gray-800 rounded-lg p-5">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(assessmentText) }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        {/* Refinement Options removed */}
        
        {/* View Mode: Modern Treatment View */}
        {treatmentViewMode === 'modern' && parsedTreatment ? (
          <ModernTreatmentView
            treatment={parsedTreatment}
            visuals={treatmentVisuals}
            onGenerateVisuals={handleGenerateVisuals}
            onRegenerateVisual={handleRegenerateVisual}
            onMoodChange={handleMoodChange}
            isGenerating={isGeneratingVisuals}
            showControls={true}
          />
        ) : (
        /* View Mode: Classic Text View */
        <div 
          ref={contentRef}
          className="prose prose-invert max-w-none relative select-text bg-gray-900/30 rounded-xl p-8 border border-gray-700/50"
          style={{ userSelect: 'text' }}
        >
          {/* Structured editor when treatment not yet converted to rich content */}
          {guide.filmTreatment ? (
              <>
                <div className="flex items-center justify-end mb-4">
                  <Button onClick={generateOutline} disabled={isGeneratingOutline} className="bg-green-600 hover:bg-green-700 text-white">
                    {isGeneratingOutline ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating Scene Outline…
                      </>
                    ) : (
                      'Create Scene Outline'
                    )}
                  </Button>
                </div>
                {renderContent(guide.filmTreatment)}
              </>
          ) : (
            <div className="space-y-6">
              {/* Project Title */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
                <input
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={guide.treatmentDetails?.title || guide.title || ''}
                  onChange={(e) => { updateTitle(e.target.value); updateTreatmentDetails({ title: e.target.value }); }}
                  placeholder="Enter a clear, compelling title"
                />
                  <p className="text-xs text-gray-400 mt-2">Ask Flow for impact.</p>
                </div>

                {/* Visual Header Image under title */}
                <div className="rounded-lg overflow-hidden border border-gray-700/50">
                  <img src={(guide.treatmentDetails as any)?.billboardImageUrl || '/window.svg'} alt="Story illustration" className="w-full h-64 object-cover" />
              </div>

              {/* Logline */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Logline</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[84px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="A concise one- to two-sentence summary that captures the premise and core conflict"
                  value={guide.treatmentDetails?.logline || ''}
                  onChange={(e) => updateTreatmentDetails({ logline: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-2">Use Flow to sharpen phrasing and hook.</p>
              </div>

              {/* Synopsis / Plot Summary */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Synopsis / Plot Summary</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Describe the story from beginning to end, focusing on main plot points, conflicts, climax, and resolution. Keep it brisk and engaging."
                  value={guide.treatmentDetails?.synopsis || ''}
                  onChange={(e) => updateTreatmentDetails({ synopsis: e.target.value })}
                />
              </div>

              {/* Key Character Descriptions */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Key Character Descriptions</label>
                <p className="text-xs text-gray-400 mb-3">Profiles should include traits, motivations, and emotional arcs.</p>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Summarize the primary characters and their arcs."
                  value={guide.treatmentDetails?.keyCharacters || ''}
                  onChange={(e) => updateTreatmentDetails({ keyCharacters: e.target.value })}
                />
              </div>

              {/* Tone and Style */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Tone and Style</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Convey the intended mood and creative vision."
                  value={guide.treatmentDetails?.toneAndStyle || ''}
                  onChange={(e) => updateTreatmentDetails({ toneAndStyle: e.target.value })}
                />
              </div>

              {/* Themes */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Themes</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="What central ideas does the story explore?"
                  value={guide.treatmentDetails?.themes || ''}
                  onChange={(e) => updateTreatmentDetails({ themes: e.target.value })}
                />
              </div>

              {/* Visual Language */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <label className="block text-sm font-medium text-gray-400 mb-2">Visual Language</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Use vivid, cinematic descriptions to help visualize key scenes and moments."
                  value={guide.treatmentDetails?.visualLanguage || ''}
                  onChange={(e) => updateTreatmentDetails({ visualLanguage: e.target.value })}
                />
              </div>
              
              {/* Film Treatment Generation Section */}
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Film Treatment Yet</h3>
                <p className="text-gray-400 mb-6">Cue will generate a comprehensive Film Treatment based on your project idea.</p>
                <Button
                  onClick={generateFilmTreatment}
                  disabled={isGeneratingTreatment}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingTreatment ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating Treatment...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      Generate Film Treatment
                    </>
                  )}
                </Button>
              </div>
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
                <Clapperboard className="w-3 h-3 mr-1" />
                Ask Flow
              </Button>
            </div>
          )}
        </div>
        )}

        {/* Scene Outline moved to dedicated tab at studio level */}

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            💡 <strong>Pro tip:</strong> Use Cue to refine your Film Treatment! Select any text to get AI suggestions, or use the refinement options above to improve specific sections. Cue can help enhance clarity, add production details, and optimize your story structure.
          </p>
        </div>
      </div>
    </div>
  );
}
