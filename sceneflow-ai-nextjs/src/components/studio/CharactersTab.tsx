'use client';

import { useState } from 'react';
import { useGuideStore } from '@/store/useGuideStore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function CharactersTab() {
  const { guide, updateCharacter } = useGuideStore();
  const [activeCharacterId, setActiveCharacterId] = useState(guide.characters[0]?.id);

  const activeCharacter = guide.characters.find(c => c.id === activeCharacterId);
  const safeArc = activeCharacter?.arc || { act1: '', act2: '', act3: '' };

  // Generic handler for field updates
  const handleFieldChange = (field: string, value: string, subfield?: string) => {
    if (!activeCharacter) return;
    let updatedData;
    if (subfield) {
        const base: any = (activeCharacter as any)[field] && typeof (activeCharacter as any)[field] === 'object' ? (activeCharacter as any)[field] : {}
        updatedData = {
            ...activeCharacter,
            [field]: { ...base, [subfield]: value }
        };
    } else {
        updatedData = { ...activeCharacter, [field]: value };
    }
    updateCharacter(updatedData);
  };

  const inputClass = "bg-gray-800 border-gray-700 focus-visible:ring-teal-500";

  return (
    <div className="py-3 sm:py-6 grid grid-cols-1 lg:grid-cols-10 gap-3 sm:gap-6">
      {/* Master List */}
      <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
        {guide.characters.map((char) => (
          <Card
            key={char.id}
            onClick={() => setActiveCharacterId(char.id)}
            className={cn(
                "cursor-pointer transition-colors bg-gray-800 border-gray-700 hover:bg-gray-700",
                char.id === activeCharacterId && "border-teal-500 bg-gray-700"
            )}
          >
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-md">{char.name}</CardTitle>
              <p className="text-xs sm:text-sm text-gray-400">{char.archetype}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Detail View */}
      <div className="lg:col-span-7 order-1 lg:order-2">
        {activeCharacter ? (
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-bold">Character Editor</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input value={activeCharacter.name} onChange={(e) => handleFieldChange('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Archetype</label>
                    <Input value={activeCharacter.archetype} onChange={(e) => handleFieldChange('archetype', e.target.value)} className={inputClass} />
                </div>
            </div>

            <div>
              <h3 className="font-semibold text-base sm:text-lg mb-2 text-teal-400">Motivation</h3>
              <Textarea value={activeCharacter.motivation} onChange={(e) => handleFieldChange('motivation', e.target.value)} className={inputClass} rows={4} />
            </div>

            <div>
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-teal-400">Conflicts</h3>
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Internal Conflict</label>
                        <Textarea value={activeCharacter.internalConflict} onChange={(e) => handleFieldChange('internalConflict', e.target.value)} className={inputClass} rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">External Conflict</label>
                        <Textarea value={activeCharacter.externalConflict} onChange={(e) => handleFieldChange('externalConflict', e.target.value)} className={inputClass} rows={3} />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-teal-400">Character Arc</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Act I</label>
                        <Textarea value={safeArc.act1} onChange={(e) => handleFieldChange('arc', e.target.value, 'act1')} className={inputClass} rows={5} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Act II</label>
                        <Textarea value={safeArc.act2} onChange={(e) => handleFieldChange('arc', e.target.value, 'act2')} className={inputClass} rows={5} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Act III</label>
                        <Textarea value={safeArc.act3} onChange={(e) => handleFieldChange('arc', e.target.value, 'act3')} className={inputClass} rows={5} />
                    </div>
                </div>
            </div>

          </div>
        ) : (
          <p>Select a character to view details.</p>
        )}
      </div>
    </div>
  );
}
