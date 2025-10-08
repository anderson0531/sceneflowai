"use client";
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Link as LinkIcon, ExternalLink, Copy } from 'lucide-react'

export default function ShareCollabModal({ open, onOpenChange, link }: { open: boolean; onOpenChange: (v:boolean)=>void; link: string | null }) {
  const [copied, setCopied] = useState(false)
  useEffect(()=>{ if (!open) setCopied(false) }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={()=>onOpenChange(false)} />
      <div className="relative w-full max-w-lg mx-auto rounded-lg border border-gray-800 bg-gray-900 p-5 shadow-xl">
        <div className="text-lg font-semibold text-white mb-2">Share for Collaboration</div>
        <div className="text-sm text-gray-300 mb-3">Share this link with collaborators. No login required; responses are anonymous.</div>
        <div className="flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded px-3 py-2">
          <LinkIcon className="w-4 h-4 text-gray-400" />
          <input readOnly value={link || ''} className="flex-1 bg-transparent outline-none text-gray-100" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={async ()=>{ if (link) { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false), 1200) } }}>{copied ? 'Copied' : <><Copy className="w-4 h-4 mr-1"/>Copy</>}</Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-700 text-white border border-gray-600">Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={()=> link && window.open(link, '_blank')}><ExternalLink className="w-4 h-4"/></Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-700 text-white border border-gray-600">Open reviewer page</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </div>
  )
}


