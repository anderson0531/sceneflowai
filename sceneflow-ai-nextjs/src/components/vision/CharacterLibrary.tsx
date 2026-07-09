"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  Plus,
  Loader,
  Wand2,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Lightbulb,
  Info,
  Volume2,
  ImageIcon,
  Edit,
  Trash2,
  Shirt,
  Mic,
  Play,
  AlertCircle,
  Maximize2,
  User,
  FileText,
  RefreshCw,
  Zap,
  Settings2,
  Camera,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { upload } from "@vercel/blob/client";
import { VoiceSelectionDialog } from "@/components/tts/VoiceSelectionDialog";
import { VoiceDirectionEditor } from "@/components/tts/VoiceDirectionEditor";
import { GeminiVoicePicker } from "@/components/tts/GeminiVoicePicker";
import { NarratorVoicePicker } from "@/components/tts/NarratorVoicePicker";
import { CharacterPromptBuilder } from "@/components/vision/CharacterPromptBuilder";
import { buildCharacterIdentityReferencePromptFromCharacter } from "@/lib/character/characterReferencePrompts";
import {
  AddCharacterModal,
  useOrphanCharacters,
} from "@/components/vision/AddCharacterModal";
import { useOverlayStore } from "@/store/useOverlayStore";
import type {
  CharacterContext,
  ScreenplayContext,
} from "@/lib/voiceRecommendation";
import {
  getCharacterVoiceRecommendations,
  resolveCharacterGender,
  type ElevenLabsVoice,
} from "@/lib/voiceRecommendation";
import { enrichGeminiVoicesForScoring } from "@/lib/tts/geminiVoiceCatalog";
import {
  type WardrobeVoiceAnalysisResult,
} from "@/lib/character/wardrobeVoiceAnalysis";
import type { EdgeVoiceConfig } from "@/types/vision";
import {
  DeferredImageSkeleton,
  isDeferredImageUrl,
  isDisplayableImageUrl,
} from "@/components/vision/DeferredImageSkeleton";
import { getSceneBeats } from "@/lib/script/beatMigration";

/** Parse API response body without throwing on Vercel HTML/plain-text error pages (504, etc.). */
async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {
      error:
        res.status === 504 || res.status === 408
          ? "Generation timed out — please try again"
          : text.slice(0, 200),
    };
  }
}

export interface CharacterLibraryProps {
  projectId?: string;
  characters: any[];
  /** Script scenes for character detection */
  scenes?: any[];
  onRegenerateCharacter: (characterId: string) => void;
  onGenerateCharacter: (
    characterId: string,
    promptOrPayload: any,
  ) => Promise<void>;
  onUploadCharacter: (characterId: string, file: File) => void;
  onApproveCharacter: (characterId: string) => void;
  onUpdateCharacterAttributes?: (characterId: string, attributes: any) => void;
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void;
  onUpdateCharacterEdgeVoice?: (
    characterId: string,
    lang: string,
    edgeVoiceConfig: EdgeVoiceConfig | null,
  ) => void;
  onUpdateCharacterAppearance?: (
    characterId: string,
    description: string,
  ) => void;
  onUpdateCharacterName?: (characterId: string, name: string) => void;
  onUpdateCharacterRole?: (characterId: string, role: string) => void;
  onUpdateCharacterWardrobe?: (
    characterId: string,
    wardrobe: {
      defaultWardrobe?: string;
      wardrobeAccessories?: string;
      wardrobeId?: string;
      wardrobeName?: string;
      previewImageUrl?: string;
      headshotUrl?: string;
      fullBodyUrl?: string;
      sceneNumbers?: number[];
      appearanceNotes?: string;
      reason?: string;
      action?: "add" | "update" | "delete" | "setDefault";
    },
  ) => void;
  /** Callback to batch update wardrobes from script analysis */
  onBatchUpdateWardrobes?: (
    characterId: string,
    wardrobes: Array<{
      name: string;
      description: string;
      accessories?: string;
      sceneNumbers: number[];
      appearanceNotes?: string;
      reason: string;
    }>,
  ) => void;
  onAddCharacter?: (characterData: any) => void;
  onRemoveCharacter?: (characterName: string) => void;
  /** Apply enhanced reference directly (URL + vision description) without re-upload */
  onApplyEnhancedReference?: (
    characterId: string,
    payload: {
      referenceImageUrl: string
      visionDescription?: string | null
      enhanceIterationCount?: number
    },
  ) => void;
  ttsProvider: "google" | "elevenlabs";
  /**
   * When set (e.g. `"google"` in the Vision Reference Library), voice picker and Auto voice
   * use Gemini 3.1 TTS exclusively for character dialogue assignment.
   */
  voiceAssignmentProvider?: "google" | "elevenlabs";
  compact?: boolean;
  uploadingRef?: Record<string, boolean>;
  setUploadingRef?: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  enableDrag?: boolean;
  showProTips?: boolean;
  /** Reference Library layout — dialog enables per-character tabs + split pane */
  layout?: "sidebar" | "dialog";
  // Screenplay context for AI wardrobe recommendations
  screenplayContext?: {
    genre?: string;
    tone?: string;
    setting?: string;
    logline?: string;
    visualStyle?: string;
  };
}

// Wardrobe item in collection with scene-aware tracking
interface CharacterWardrobe {
  id: string;
  name: string;
  description: string;
  accessories?: string;
  isDefault: boolean;
  createdAt: string;
  previewImageUrl?: string; // Legacy: AI-generated preview of character in this outfit
  headshotUrl?: string; // 16:9 diptych: close-up face + full-body wardrobe
  fullBodyUrl?: string; // 1-row mannequin outfit turnaround (4 full-body views)
  sceneNumbers?: number[]; // Scenes where this outfit is used (from script analysis)
  appearanceNotes?: string; // Makeup, hair state, visible injuries/marks
  reason?: string; // AI explanation for why this outfit is needed
}

interface CharacterCardProps {
  character: any;
  characterId: string;
  isSelected: boolean;
  onClick: () => void;
  onRegenerate: () => void;
  onGenerate: () => void;
  onUpload: (file: File) => void;
  onApprove: () => void;
  prompt: string;
  isGenerating: boolean;
  isUploading?: boolean;
  /** Character has no dialogue in script */
  isOrphan?: boolean;
  expandedCharId?: string | null;
  onToggleExpand?: (
    charId: string,
    section: "coreIdentity" | "appearance",
  ) => void;
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void;
  onUpdateCharacterEdgeVoice?: (
    characterId: string,
    lang: string,
    edgeVoiceConfig: EdgeVoiceConfig | null,
  ) => void;
  onUpdateAppearance?: (characterId: string, description: string) => void;
  onUpdateCharacterName?: (characterId: string, name: string) => void;
  onUpdateCharacterRole?: (characterId: string, role: string) => void;
  onUpdateCharacterAttributes?: (characterId: string, attributes: any) => void;
  onUpdateWardrobe?: (
    characterId: string,
    wardrobe: {
      defaultWardrobe?: string;
      wardrobeAccessories?: string;
      wardrobeId?: string;
      wardrobeName?: string;
      headshotUrl?: string;
      fullBodyUrl?: string;
      previewImageUrl?: string;
      sceneNumbers?: number[];
      appearanceNotes?: string;
      reason?: string;
      action?: "add" | "update" | "delete" | "setDefault";
    },
  ) => void;
  /** Batch update wardrobes from script analysis */
  onBatchUpdateWardrobes?: (
    characterId: string,
    wardrobes: Array<{
      name: string;
      description: string;
      accessories?: string;
      sceneNumbers: number[];
      appearanceNotes?: string;
      reason: string;
    }>,
  ) => void;
  /** Script scenes for wardrobe analysis */
  scenes?: any[];
  onRemove?: () => void;
  /** Callback to edit the character's reference image */
  onEditImage?: () => void;
  onApplyEnhancedReference?: (
    characterId: string,
    payload: {
      referenceImageUrl: string
      visionDescription?: string | null
      enhanceIterationCount?: number
    },
  ) => void;
  ttsProvider: "google" | "elevenlabs";
  voiceAssignmentProvider?: "google" | "elevenlabs";
  voiceSectionExpanded?: boolean;
  onToggleVoiceSection?: () => void;
  enableDrag?: boolean;
  onOpenCharacterPrompt?: () => void;
  // Screenplay context for AI wardrobe recommendations
  screenplayContext?: {
    genre?: string;
    tone?: string;
    setting?: string;
    logline?: string;
    visualStyle?: string;
  };
  projectId?: string;
  /** Skip collapsed row; always show full editor (Reference Library dialog) */
  forceExpanded?: boolean;
  /** 50/50 image | controls layout */
  splitLayout?: boolean;
}

export function CharacterLibrary({
  projectId,
  characters,
  scenes = [],
  onRegenerateCharacter,
  onGenerateCharacter,
  onUploadCharacter,
  onApproveCharacter,
  onUpdateCharacterAttributes,
  onUpdateCharacterVoice,
  onUpdateCharacterEdgeVoice,
  onUpdateCharacterAppearance,
  onUpdateCharacterName,
  onUpdateCharacterRole,
  onUpdateCharacterWardrobe,
  onBatchUpdateWardrobes,
  onAddCharacter,
  onRemoveCharacter,
  onEditCharacterImage,
  onApplyEnhancedReference,
  ttsProvider,
  voiceAssignmentProvider,
  compact = false,
  uploadingRef = {},
  setUploadingRef,
  enableDrag = false,
  showProTips: showProTipsProp,
  screenplayContext,
  layout = "sidebar",
}: CharacterLibraryProps) {
  const effectiveVoiceProvider =
    voiceAssignmentProvider ?? ttsProvider ?? "elevenlabs";
  const splitLayout = layout === "dialog";

  const castCharacters = useMemo(
    () => characters.filter((char) => char.type !== "description"),
    [characters],
  );

  const getCharacterId = (char: (typeof castCharacters)[number], idx: number) =>
    char.id || idx.toString();

  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(
    null,
  );
  const [generatingChars, setGeneratingChars] = useState<Set<string>>(
    new Set(),
  );
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, string | null>
  >({});
  const [needsReupload, setNeedsReupload] = useState<Record<string, boolean>>(
    {},
  );
  const [showProTipsInternal, setShowProTipsInternal] = useState(false);
  const [voiceSectionExpanded, setVoiceSectionExpanded] = useState<
    Record<string, boolean>
  >({});
  const [promptBuilderOpenFor, setPromptBuilderOpenFor] = useState<
    string | null
  >(null);
  const [createVoiceDialogOpen, setCreateVoiceDialogOpen] = useState(false);
  const [addCharacterModalOpen, setAddCharacterModalOpen] = useState(false);

  useEffect(() => {
    if (layout !== "dialog") return;
    if (castCharacters.length === 0) {
      setActiveCharacterId(null);
      return;
    }
    const ids = castCharacters.map((c, i) => getCharacterId(c, i));
    setActiveCharacterId((prev) =>
      prev && ids.includes(prev) ? prev : ids[0],
    );
  }, [layout, castCharacters]);

  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const orphanCharacters = useOrphanCharacters(scenes, characters);

  // Use prop if provided (for compact mode), otherwise use internal state
  const showProTips =
    showProTipsProp !== undefined ? showProTipsProp : showProTipsInternal;

  // Detect low-resolution images that need re-upload
  useEffect(() => {
    const warnings: Record<string, boolean> = {};
    characters.forEach((char) => {
      const charId = char.id || characters.indexOf(char).toString();
      if (char.referenceImage) {
        // Detect data URL (old method)
        if (char.referenceImage.startsWith("data:")) {
          // Estimate size from data URL length
          const base64Length = char.referenceImage.split(",")[1]?.length || 0;
          const estimatedKB = (base64Length * 0.75) / 1024;

          if (estimatedKB < 50) {
            warnings[charId] = true;
          }
        }
      }
    });
    setNeedsReupload(warnings);
  }, [characters]);

  const handleToggleSection = (
    charId: string,
    section: "coreIdentity" | "appearance",
  ) => {
    const key = `${charId}-${section === "coreIdentity" ? "core" : "appear"}`;
    setExpandedSections((prev) => ({
      ...prev,
      [charId]: prev[charId] === key ? null : key,
    }));
  };

  const handleToggleVoiceSection = (charId: string) => {
    setVoiceSectionExpanded((prev) => ({
      ...prev,
      [charId]: !prev[charId],
    }));
  };

  const handleUploadReference = async (
    characterId: string,
    file: File,
    characterName: string,
  ) => {
    // Validate file size (warn if > 5MB, block if > 10MB)
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 10) {
      toast.error("Image too large. Please use images under 10MB.");
      return;
    }

    if (sizeMB > 5) {
      toast.warning(
        `Large image (${sizeMB.toFixed(1)}MB). Consider using smaller images for better performance.`,
      );
    }

    // Validate image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width < 256 || img.height < 256) {
        toast.warning(
          "Image resolution is low. Use at least 512x512 for best facial recognition.",
        );
      }

      // Compress image if too large to avoid 413 errors
      let fileToUpload = file;
      if (sizeMB > 4) {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // Calculate new dimensions (max 2048px)
          const maxSize = 2048;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
          });

          fileToUpload = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" },
          );
          const newSizeMB = fileToUpload.size / 1024 / 1024;
          console.log(
            `[Upload] Compressed from ${sizeMB.toFixed(2)}MB to ${newSizeMB.toFixed(2)}MB`,
          );
        } catch (compressionError) {
          console.error("[Upload] Compression failed:", compressionError);
          // Continue with original file if compression fails
        }
      }

      // Proceed with client-side direct upload
      setUploadingRef?.((prev) => ({ ...prev, [characterId]: true }));

      try {
        // Step 1: Upload directly to Vercel Blob (client-side)
        const newBlob = await upload(fileToUpload.name, fileToUpload, {
          access: "public",
          handleUploadUrl: "/api/character/upload-url",
        });

        console.log("[Upload] Blob uploaded:", newBlob.url);

        // Step 2: Process upload and analyze with Gemini Vision
        const processRes = await fetch("/api/character/process-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: newBlob.url,
            characterName,
          }),
        });

        const processData = await processRes.json();
        if (processData.success) {
          // Call parent handler to update character
          onUploadCharacter(characterId, file);
          toast.success("Reference image uploaded successfully!");
        } else {
          throw new Error(processData.error || "Processing failed");
        }
      } catch (error) {
        console.error("[Upload Reference] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload";
        toast.error(errorMessage);
      } finally {
        setUploadingRef?.((prev) => ({ ...prev, [characterId]: false }));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Invalid image file");
    };

    img.src = objectUrl;
  };

  const renderCharacterCard = (
    char: (typeof castCharacters)[number],
    idx: number,
    cardOptions?: { forceExpanded?: boolean; splitLayout?: boolean },
  ) => {
    const charId = getCharacterId(char, idx);
    const appearancePrompt =
      char.appearanceDescription ||
      char.imagePrompt ||
      `${char.name || "Character"}`;

    return (
      <CharacterCard
        key={charId}
        character={char}
        characterId={charId}
        isSelected={selectedChar === charId}
        isOrphan={
          orphanCharacters.has(charId) || orphanCharacters.has(char.name)
        }
        onClick={() => setSelectedChar(charId)}
        onRegenerate={() => onRegenerateCharacter(charId)}
        onGenerate={async () => {
          setGeneratingChars((prev) => new Set(prev).add(charId));
          try {
            const promptToUse =
              buildCharacterIdentityReferencePromptFromCharacter(char);
            await onGenerateCharacter(charId, promptToUse);
          } finally {
            setGeneratingChars((prev) => {
              const newSet = new Set(prev);
              newSet.delete(charId);
              return newSet;
            });
          }
        }}
        onUpload={(file) => onUploadCharacter(charId, file)}
        onApprove={() => onApproveCharacter(charId)}
        prompt={appearancePrompt}
        isGenerating={generatingChars.has(charId)}
        isUploading={uploadingRef[charId] || false}
        expandedCharId={expandedSections[charId]}
        onToggleExpand={handleToggleSection}
        onUpdateCharacterVoice={onUpdateCharacterVoice}
        onUpdateAppearance={onUpdateCharacterAppearance}
        onUpdateCharacterName={onUpdateCharacterName}
        onUpdateCharacterRole={onUpdateCharacterRole}
        onUpdateCharacterAttributes={onUpdateCharacterAttributes}
        onUpdateWardrobe={onUpdateCharacterWardrobe}
        onBatchUpdateWardrobes={onBatchUpdateWardrobes}
        scenes={scenes}
        onRemove={() => onRemoveCharacter?.(char.name)}
        onEditImage={
          char.referenceImage && onEditCharacterImage
            ? () => onEditCharacterImage(charId, char.referenceImage)
            : undefined
        }
        onApplyEnhancedReference={onApplyEnhancedReference}
        ttsProvider={effectiveVoiceProvider}
        voiceAssignmentProvider={voiceAssignmentProvider}
        voiceSectionExpanded={voiceSectionExpanded[charId] || false}
        onToggleVoiceSection={() => handleToggleVoiceSection(charId)}
        enableDrag={enableDrag}
        onOpenCharacterPrompt={() => setPromptBuilderOpenFor(charId)}
        screenplayContext={screenplayContext}
        projectId={projectId}
        forceExpanded={cardOptions?.forceExpanded}
        splitLayout={cardOptions?.splitLayout}
      />
    );
  };

  const activeCharacterIndex = castCharacters.findIndex(
    (char, idx) => getCharacterId(char, idx) === activeCharacterId,
  );
  const activeCharacter =
    activeCharacterIndex >= 0 ? castCharacters[activeCharacterIndex] : null;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? "p-4" : "p-6"} h-full overflow-y-auto`}
    >
      {!compact && (
        <div className={`flex items-center justify-between mb-6`}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sf-primary" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Character Library
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {characters.length}
            </span>

            {/* Pro Tips Toggle Button */}
            <button
              onClick={() => setShowProTipsInternal((prev) => !prev)}
              className="ml-2 p-1.5 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors"
              title={showProTips ? "Hide Pro Tips" : "Show Pro Tips"}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {characters.length === 0 ? (
        <div
          className={`text-center ${compact ? "py-8" : "py-12"} text-gray-500 dark:text-gray-400`}
        >
          <Users
            className={`${compact ? "w-8 h-8" : "w-12 h-12"} mx-auto mb-2 text-gray-300 dark:text-gray-600`}
          />
          <p className={compact ? "text-sm" : ""}>No characters yet</p>
        </div>
      ) : layout === "dialog" ? (
        <div className="flex flex-col min-h-0 gap-3">
          <div className="flex items-center border-b border-gray-700/50 overflow-x-auto flex-shrink-0 gap-0.5 pb-px">
            {castCharacters.map((char, idx) => {
              const charId = getCharacterId(char, idx);
              const isActive = activeCharacterId === charId;
              const needsImage = !char.referenceImage?.trim();
              const needsVoice = !char.voiceConfig;
              return (
                <button
                  key={charId}
                  type="button"
                  onClick={() => setActiveCharacterId(charId)}
                  className={`
                    relative px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all flex-shrink-0
                    ${isActive
                      ? "bg-slate-800/80 text-white border-t border-x border-gray-600/50 -mb-px"
                      : "bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5 max-w-[140px]">
                    <span className="truncate">{char.name || "Unnamed"}</span>
                    {(needsImage || needsVoice) && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${needsImage ? "bg-amber-400" : "bg-green-400/80"}`}
                        title={needsImage ? "Reference image needed" : "Voice needed"}
                      />
                    )}
                  </span>
                </button>
              );
            })}
            {onAddCharacter && (
              <button
                type="button"
                onClick={() => setAddCharacterModalOpen(true)}
                className="ml-1 px-2.5 py-1.5 text-xs font-medium rounded-t-lg flex-shrink-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent"
              >
                <span className="flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add
                </span>
              </button>
            )}
          </div>

          {activeCharacter && activeCharacterIndex >= 0
            ? renderCharacterCard(activeCharacter, activeCharacterIndex, {
                forceExpanded: true,
                splitLayout: true,
              })
            : null}

          {onAddCharacter && (
            <AddCharacterModal
              open={addCharacterModalOpen}
              onClose={() => setAddCharacterModalOpen(false)}
              characters={characters}
              scenes={scenes}
              onAddCharacter={onAddCharacter}
              projectGenre={screenplayContext?.genre}
            />
          )}

          {promptBuilderOpenFor && (
            <CharacterPromptBuilder
              open={!!promptBuilderOpenFor}
              onClose={() => setPromptBuilderOpenFor(null)}
              character={characters
                .filter((c) => c.type !== "narrator")
                .find(
                  (c, idx) => (c.id || idx.toString()) === promptBuilderOpenFor,
                )}
              isGenerating={Array.from(generatingChars).includes(
                promptBuilderOpenFor,
              )}
              onGenerateImage={(payload) => {
                const targetId = promptBuilderOpenFor!;
                setPromptBuilderOpenFor(null);
                setGeneratingChars((prev) => new Set(prev).add(targetId));
                onGenerateCharacter(targetId, payload).finally(() => {
                  setGeneratingChars((prev) => {
                    const ns = new Set(prev);
                    ns.delete(targetId);
                    return ns;
                  });
                });
              }}
            />
          )}
        </div>
      ) : (
        <div
          className={`${compact ? "space-y-3" : "grid grid-cols-2 lg:grid-cols-3 gap-4"}`}
        >
          {/* Action Buttons Row - Add Character */}
          {onAddCharacter && (
            <div className="col-span-2 lg:col-span-3 flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => setAddCharacterModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Add Character</span>
              </Button>
            </div>
          )}

          {/* Add Character Modal */}
          {onAddCharacter && (
            <AddCharacterModal
              open={addCharacterModalOpen}
              onClose={() => setAddCharacterModalOpen(false)}
              characters={characters}
              scenes={scenes}
              onAddCharacter={onAddCharacter}
              projectGenre={screenplayContext?.genre}
            />
          )}

          {/* Regular Character Cards */}
          {castCharacters.map((char, idx) => renderCharacterCard(char, idx))}
          {/* Character Prompt Builder Modal */}
          {promptBuilderOpenFor && (
            <CharacterPromptBuilder
              open={!!promptBuilderOpenFor}
              onClose={() => setPromptBuilderOpenFor(null)}
              character={characters
                .filter((c) => c.type !== "narrator")
                .find(
                  (c, idx) => (c.id || idx.toString()) === promptBuilderOpenFor,
                )}
              isGenerating={Array.from(generatingChars).includes(
                promptBuilderOpenFor,
              )}
              onGenerateImage={(payload) => {
                const targetId = promptBuilderOpenFor!;
                setPromptBuilderOpenFor(null);
                setGeneratingChars((prev) => new Set(prev).add(targetId));
                onGenerateCharacter(targetId, payload).finally(() => {
                  setGeneratingChars((prev) => {
                    const ns = new Set(prev);
                    ns.delete(targetId);
                    return ns;
                  });
                });
              }}
            />
          )}
        </div>
      )}

      {/* Image Upload Pro Tips - Collapsible */}
      {showProTips && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg transition-all duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-300 mb-2">
                Pro Tips: Character Reference Images
              </h4>
              <ul className="text-xs text-blue-400/80 space-y-1.5">
                <li>
                  • <span className="font-medium">Resolution:</span> Use
                  high-quality images (at least 512x512 pixels)
                </li>
                <li>
                  • <span className="font-medium">Composition:</span> Clear,
                  well-lit headshots work best for facial recognition
                </li>
                <li>
                  • <span className="font-medium">File Size:</span> Keep images
                  under 5MB for optimal performance
                </li>
                <li>
                  • <span className="font-medium">Lighting:</span> Avoid harsh
                  shadows or extreme lighting that obscures facial features
                </li>
                <li>
                  • <span className="font-medium">Expression:</span> Neutral or
                  calm expressions provide the most consistent results
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className={`relative ${splitLayout ? "max-w-[50vw]" : "max-w-4xl"} max-h-[90vh]`}>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="text-white font-medium">{zoomedImage.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Voice Dialog */}
      <VoiceSelectionDialog
        open={createVoiceDialogOpen}
        onOpenChange={setCreateVoiceDialogOpen}
        provider={effectiveVoiceProvider}
        mode="character"
        onSelectVoice={(voiceId, voiceName) => {
          toast.success(
            `Voice "${voiceName}" selected! Assign it to a character.`,
          );
        }}
        screenplayContext={screenplayContext as ScreenplayContext}
      />
    </div>
  );
}

// Format scene numbers into compact ranges: [1,2,3,5,7,8,9] → "1-3, 5, 7-9"
function formatSceneRange(sceneNumbers: number[]): string {
  if (!sceneNumbers || sceneNumbers.length === 0) return "";
  const sorted = [...sceneNumbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

const CharacterCard = ({
  character,
  characterId,
  isSelected,
  onClick,
  onRegenerate,
  onGenerate,
  onUpload,
  onApprove,
  prompt,
  isGenerating,
  isUploading = false,
  isOrphan = false,
  expandedCharId,
  onToggleExpand,
  onUpdateCharacterVoice,
  onUpdateCharacterEdgeVoice,
  onUpdateAppearance,
  onUpdateCharacterName,
  onUpdateCharacterRole,
  onUpdateCharacterAttributes,
  onUpdateWardrobe,
  onBatchUpdateWardrobes,
  scenes = [],
  onRemove,
  onEditImage,
  onApplyEnhancedReference,
  ttsProvider,
  voiceAssignmentProvider,
  voiceSectionExpanded,
  onToggleVoiceSection,
  enableDrag = false,
  onOpenCharacterPrompt,
  screenplayContext,
  projectId,
  forceExpanded = false,
  splitLayout = false,
}: CharacterCardProps) => {
  const [imageError, setImageError] = useState(false); // Track if image failed to load

  // Reset imageError when referenceImage changes (new image uploaded)
  useEffect(() => {
    setImageError(false);
  }, [character.referenceImage]);

  const hasImage = isDisplayableImageUrl(character.referenceImage) && !imageError;
  const isDeferredImage = isDeferredImageUrl(character.referenceImage);
  const isApproved = character.imageApproved === true;
  const isCoreExpanded = expandedCharId === `${characterId}-core`;
  const isAppearanceExpanded = expandedCharId === `${characterId}-appear`;
  const [isCollapsed, setIsCollapsed] = useState(!forceExpanded);
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [editingRole, setEditingRole] = useState(false);
  type CharacterWorkflowTab = "identity" | "voice" | "wardrobe";
  const [activeTab, setActiveTab] = useState<CharacterWorkflowTab>("identity");
  const [editingWardrobe, setEditingWardrobe] = useState(false);
  const [editingWardrobeId, setEditingWardrobeId] = useState<string | null>(
    null,
  ); // Which wardrobe is being edited
  const [wardrobeText, setWardrobeText] = useState("");
  const [editingBodyDescription, setEditingBodyDescription] = useState(false);
  const [bodyDescriptionText, setBodyDescriptionText] = useState("");
  const [accessoriesText, setAccessoriesText] = useState("");
  const [appearanceNotesText, setAppearanceNotesText] = useState("");
  const [wardrobeName, setWardrobeName] = useState(""); // Name for new/edited wardrobe
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [isGeneratingWardrobe, setIsGeneratingWardrobe] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceProfileDialogOpen, setVoiceProfileDialogOpen] = useState(false);
  const [editingVoiceDescription, setEditingVoiceDescription] = useState(false);
  const [voiceDescriptionText, setVoiceDescriptionText] = useState("");
  const [expandedWardrobeDescriptions, setExpandedWardrobeDescriptions] = useState<Set<string>>(new Set());

  const toggleWardrobeDescription = (wardrobeId: string) => {
    setExpandedWardrobeDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(wardrobeId)) {
        next.delete(wardrobeId);
      } else {
        next.add(wardrobeId);
      }
      return next;
    });
  };

  const renderWardrobeImage = (
    w: CharacterWardrobe,
    variant: "split" | "stacked",
  ) => {
    const isGenerating = generatingWardrobeImageId === w.id;
    const loadingOverlay = isGenerating ? (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-white" />
      </div>
    ) : null;

    if (variant === "split") {
      return (
        <>
          {w.fullBodyUrl ? (
            <img
              src={w.fullBodyUrl}
              alt={`${character.name} — ${w.name} wardrobe reference`}
              className="w-full h-full min-h-[180px] max-h-[50vh] object-contain"
              loading="lazy"
            />
          ) : w.headshotUrl ? (
            <img
              src={w.headshotUrl}
              alt={`${character.name} — ${w.name} wardrobe reference (legacy)`}
              className="w-full h-full min-h-[180px] max-h-[50vh] object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
              <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">
                No wardrobe reference yet — generate from the outfit description
              </span>
            </div>
          )}
          {loadingOverlay}
        </>
      );
    }

    if (w.fullBodyUrl) {
      return (
        <div className="relative aspect-auto max-h-64 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <img
            src={w.fullBodyUrl}
            alt={`${character.name} — ${w.name} wardrobe reference`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
          {loadingOverlay}
        </div>
      );
    }

    if (w.headshotUrl) {
      return (
        <div className="relative aspect-video max-h-48 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <img
            src={w.headshotUrl}
            alt={`${character.name} — ${w.name} wardrobe reference (legacy)`}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          {loadingOverlay}
        </div>
      );
    }

    return null;
  };
  const [genderConfirmOpen, setGenderConfirmOpen] = useState(false);
  const [isAutoSelectingVoice, setIsAutoSelectingVoice] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const voicePreviewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const useGeminiVoicePicker = voiceAssignmentProvider === "google";

  useEffect(() => {
    return () => {
      if (voicePreviewAudioRef.current) {
        voicePreviewAudioRef.current.pause();
        voicePreviewAudioRef.current = null;
      }
    };
  }, []);
  const [showAddWardrobeForm, setShowAddWardrobeForm] = useState(false); // Toggle for add new wardrobe form
  const [enhancingWardrobeId, setEnhancingWardrobeId] = useState<string | null>(
    null,
  ); // Which wardrobe is being AI-enhanced
  const [generatingWardrobeImageId, setGeneratingWardrobeImageId] = useState<
    string | null
  >(null);

  // Script analysis for wardrobes state
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
  const [wardrobeSuggestions, setWardrobeSuggestions] = useState<
    Array<{
      name: string;
      description: string;
      accessories?: string;
      sceneNumbers: number[];
      reason: string;
      confidence: number;
      appearanceNotes?: string;
    }>
  >([]);

  // Wardrobe expansion modal state
  const [expandedWardrobe, setExpandedWardrobe] =
    useState<CharacterWardrobe | null>(null);

  // Enhance reference state
  const [enhanceIterationCount, setEnhanceIterationCount] = useState(
    character.enhanceIterationCount || 0,
  );
  const [showEnhanceConfirm, setShowEnhanceConfirm] = useState(false);
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(
    null,
  );
  const [enhancedVisionDescription, setEnhancedVisionDescription] = useState<
    string | null
  >(null);
  const [enhanceQualityFeedback, setEnhanceQualityFeedback] = useState<{
    originalScore: number;
    issuesFixed: string[];
    improvements: string[];
  } | null>(null);

  const wardrobes: CharacterWardrobe[] =
    character.wardrobes && character.wardrobes.length > 0
      ? character.wardrobes
      : character.defaultWardrobe?.trim()
        ? [
            {
              id: "legacy-wardrobe",
              name: "Default Outfit",
              description: character.defaultWardrobe,
              accessories: character.wardrobeAccessories,
              isDefault: true,
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

  const hasCharacterReferenceForVoice =
    typeof character.referenceImage === "string" &&
    character.referenceImage.trim().startsWith("http");

  const hasNarrativeForVoice =
    Boolean(character.description?.trim()) ||
    Boolean(character.appearanceDescription?.trim()) ||
    Boolean(character.role?.trim()) ||
    Boolean(character.keyFeature?.trim());

  const supportsGeminiVoiceProfileEditor =
    Boolean(character.voiceConfig?.voiceId) &&
    (useGeminiVoicePicker ||
      ttsProvider === "google" ||
      character.voiceConfig?.provider === "google" ||
      character.voiceConfig?.voiceId?.startsWith("gemini-"));

  // Build character context for voice recommendations
  const characterContext: CharacterContext = {
    name: character.name || "Unknown",
    role: character.role,
    gender: character.gender,
    age: character.age,
    ethnicity: character.ethnicity,
    personality: character.keyFeature,
    description: character.description || character.appearanceDescription,
    referenceImage: character.referenceImage,
    voiceDescription: character.voiceDescription,
  };

  const playGeminiVoicePreview = async (
    voiceId: string,
    prompt?: string,
    sampleText?: string,
  ): Promise<boolean> => {
    const text =
      sampleText ||
      (characterContext?.name
        ? `${characterContext.name}: This is how I sound in this production.`
        : "This is how I sound in this production.");

    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }

    const testRes = await fetch("/api/tts/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId,
        audioType: "dialogue",
        ...(prompt ? { prompt } : {}),
      }),
    });

    if (!testRes.ok) {
      throw new Error("Failed to generate voice preview.");
    }

    const testBlob = await testRes.blob();
    const testUrl = URL.createObjectURL(testBlob);
    const audio = new Audio(testUrl);
    voicePreviewAudioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(testUrl);
      if (voicePreviewAudioRef.current === audio) {
        voicePreviewAudioRef.current = null;
        setIsPlayingVoice(false);
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(testUrl);
      if (voicePreviewAudioRef.current === audio) {
        voicePreviewAudioRef.current = null;
        setIsPlayingVoice(false);
      }
    };
    await audio.play();
    setIsPlayingVoice(true);
    return true;
  };

  const handlePlayAssignedVoice = async () => {
    const vc = character.voiceConfig;
    if (!vc?.voiceId) {
      toast.error("Assign a voice first.");
      return;
    }

    if (isPlayingVoice && voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
      setIsPlayingVoice(false);
      return;
    }

    if (vc.provider === "google" || vc.voiceId.startsWith("gemini-")) {
      try {
        await playGeminiVoicePreview(vc.voiceId, vc.prompt);
      } catch (err) {
        console.warn("[Voice Preview] Playback failed:", err);
        toast.error("Could not play voice preview.");
        setIsPlayingVoice(false);
      }
      return;
    }

    toast.info("Re-run Auto or Select Voice to use Gemini TTS for this character.");
  };

  const fetchWardrobeVoiceAnalysis = async (): Promise<WardrobeVoiceAnalysisResult | null> => {
    const imageUrl = character.referenceImage?.trim()
    const hasNarrative =
      Boolean(character.description?.trim()) ||
      Boolean(character.appearanceDescription?.trim()) ||
      Boolean(character.role?.trim()) ||
      Boolean(character.keyFeature?.trim())

    if (!imageUrl?.startsWith("http") && !hasNarrative) {
      toast.error(
        "Add a character description or reference image before Auto Voice.",
      );
      return null;
    }

    const res = await fetch("/api/character/analyze-voice-from-wardrobe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterName: characterContext.name,
        ...(imageUrl?.startsWith("http")
          ? { characterImageUrl: imageUrl }
          : {}),
        characterContext: {
          ...characterContext,
          role: character.role,
          personality: character.keyFeature,
          description:
            character.description || character.appearanceDescription,
        },
        screenplayContext,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Wardrobe voice analysis failed.");
    }
    return data as WardrobeVoiceAnalysisResult;
  };

  const handleAutoVoiceClick = () => {
    if (!onUpdateCharacterVoice) {
      toast.error("Voice update is not available.");
      return;
    }

    const useGoogleTts =
      ttsProvider === "google" || voiceAssignmentProvider === "google";
    const hasNarrativeForVoice =
      Boolean(character.description?.trim()) ||
      Boolean(character.appearanceDescription?.trim()) ||
      Boolean(character.role?.trim()) ||
      Boolean(character.keyFeature?.trim());

    if (useGoogleTts && !hasCharacterReferenceForVoice && !hasNarrativeForVoice) {
      toast.error(
        "Add a character description or reference image before Auto Voice.",
      );
      return;
    }

    void handleAutoVoice();
  };

  const handleGenderConfirmForAutoVoice = (gender: "male" | "female" | "non-binary") => {
    setGenderConfirmOpen(false);
    if (gender !== "non-binary" && onUpdateCharacterAttributes) {
      onUpdateCharacterAttributes(characterId, { gender });
    }
    const genderOverride =
      gender === "non-binary" ? undefined : gender;
    void handleAutoVoice(genderOverride);
  };

  const handleAutoVoice = async (genderOverride?: "male" | "female") => {
    if (!onUpdateCharacterVoice) {
      toast.error("Voice update is not available.");
      return;
    }

    setIsAutoSelectingVoice(true);
    let selectedVoice: ElevenLabsVoice | null = null;
    let generatedPrompt = "";
    let testAudioPlayed = false;

    const useGoogleTts =
      ttsProvider === "google" || voiceAssignmentProvider === "google";

    try {
      if (useGoogleTts) {
        let visionAnalysis: WardrobeVoiceAnalysisResult | null = null;
        try {
          visionAnalysis = await fetchWardrobeVoiceAnalysis();
        } catch (analysisErr) {
          console.warn("[Auto Voice] Wardrobe voice analysis failed:", analysisErr);
          if (!genderOverride) {
            const { confidence } = resolveCharacterGender(characterContext);
            if (confidence === "ambiguous") {
              setGenderConfirmOpen(true);
              setIsAutoSelectingVoice(false);
              return;
            }
          }
        }

        if (!visionAnalysis && !genderOverride) {
          const { confidence } = resolveCharacterGender(characterContext);
          if (confidence === "ambiguous") {
            setGenderConfirmOpen(true);
            setIsAutoSelectingVoice(false);
            return;
          }
        }

        if (visionAnalysis && onUpdateCharacterAttributes) {
          onUpdateCharacterAttributes(characterId, {
            gender: visionAnalysis.gender,
            age: visionAnalysis.apparentAge,
            ethnicity: visionAnalysis.ethnicity,
            voiceDescription: visionAnalysis.voiceDescription,
          });
          toast.success(
            visionAnalysis.confidence === "narrative"
              ? "Matched voice profile from character narrative."
              : "Matched voice profile from character reference.",
          );
        }

        const voicesRes = await fetch("/api/tts/google/voices", {
          cache: "no-store",
        });
        const voicesData = await voicesRes.json().catch(() => ({}));
        const allVoices: ElevenLabsVoice[] = Array.isArray(voicesData?.voices)
          ? voicesData.voices
          : [];
        const geminiVoices = allVoices.filter(
          (v) => typeof v.id === "string" && v.id.startsWith("gemini-"),
        );

        if (geminiVoices.length === 0) {
          throw new Error("No Gemini voices are available right now.");
        }

        const enrichedVoices = enrichGeminiVoicesForScoring(geminiVoices);
        const scoringContext: CharacterContext = {
          ...characterContext,
          role: character.role ?? characterContext.role,
          personality: character.keyFeature ?? characterContext.personality,
          description:
            character.description ||
            character.appearanceDescription ||
            characterContext.description,
          ...(genderOverride ? { gender: genderOverride } : {}),
          ...(visionAnalysis
            ? {
                gender: visionAnalysis.gender,
                age: visionAnalysis.apparentAge,
                ethnicity: visionAnalysis.ethnicity,
                voiceDescription: visionAnalysis.voiceDescription,
              }
            : {}),
        };

        const recs = getCharacterVoiceRecommendations(
          enrichedVoices,
          scoringContext,
          screenplayContext as ScreenplayContext,
          1,
        );
        const recommendedVoiceId = recs[0]?.voiceId;
        selectedVoice =
          enrichedVoices.find((v) => v.id === recommendedVoiceId) ||
          enrichedVoices[0];

        toast.success(
          `Auto selected: ${selectedVoice.name.replace(/ \((Gemini|Studio)\)/i, "")}`,
        );

        generatedPrompt =
          visionAnalysis?.audioProfile?.trim() ||
          character.voiceConfig?.prompt ||
          "";

        if (generatedPrompt) {
          toast.success("Director's Note ready from wardrobe analysis.");
        }

        onUpdateCharacterVoice(characterId, {
          provider: "google",
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          prompt: generatedPrompt,
        });
      } else if (!voiceAssignmentProvider) {
        const voicesRes = await fetch("/api/tts/elevenlabs/voices", {
          cache: "no-store",
        });
        const voicesData = await voicesRes.json().catch(() => ({}));
        if (!voicesRes.ok || voicesData.enabled === false) {
          throw new Error(
            voicesData?.error ||
              "Could not load ElevenLabs voices. Check ELEVENLABS_API_KEY.",
          );
        }
        const allVoices: ElevenLabsVoice[] = Array.isArray(voicesData?.voices)
          ? voicesData.voices
          : [];
        const elevenVoices = allVoices.filter(
          (v) =>
            typeof v.id === "string" &&
            v.id.length > 0 &&
            !v.id.startsWith("gemini-"),
        );

        if (elevenVoices.length === 0) {
          throw new Error("No ElevenLabs voices are available right now.");
        }

        let recContext: CharacterContext = characterContext;
        const thinVoiceProfile =
          !character.voiceDescription?.trim() ||
          character.voiceDescription.trim().length < 40;
        if (
          thinVoiceProfile &&
          Boolean(character.referenceImage?.trim()) &&
          onUpdateCharacterAttributes
        ) {
          try {
            const vpRes = await fetch("/api/tts/voice-profile/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                characterName: characterContext.name,
                characterContext: {
                  role: characterContext.role,
                  gender: characterContext.gender,
                  age: characterContext.age,
                  ethnicity: characterContext.ethnicity,
                  personality: characterContext.personality,
                  description: characterContext.description,
                },
                referenceImageUrl: character.referenceImage,
                screenplayContext,
              }),
            });
            const vpData = await vpRes.json().catch(() => ({}));
            if (vpRes.ok && typeof vpData?.voiceDescription === "string") {
              const vd = vpData.voiceDescription.trim();
              if (vd) {
                onUpdateCharacterAttributes(characterId, {
                  voiceDescription: vd,
                });
                recContext = { ...characterContext, voiceDescription: vd };
                toast.success(
                  "Built an AI voice profile from your reference for smarter Auto pick.",
                );
              }
            }
          } catch (profileErr) {
            console.warn("[Auto Voice] Voice profile prefetch failed:", profileErr);
          }
        }

        const recs = getCharacterVoiceRecommendations(
          elevenVoices,
          recContext,
          screenplayContext as ScreenplayContext,
          1,
        );
        const recommendedVoiceId = recs[0]?.voiceId;
        selectedVoice =
          elevenVoices.find((v) => v.id === recommendedVoiceId) ||
          elevenVoices[0];

        toast.success(`Auto selected (ElevenLabs): ${selectedVoice.name}`);

        onUpdateCharacterVoice(characterId, {
          provider: "elevenlabs",
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          prompt: character.voiceConfig?.prompt,
        });
      } else {
        throw new Error("Gemini TTS is required for character voice assignment.");
      }

      if (!selectedVoice) {
        throw new Error("No voice could be selected.");
      }

      try {
        const sampleText = characterContext?.name
          ? `${characterContext.name}: This is my automatically recommended voice profile test.`
          : "This is my automatically recommended voice profile test.";

        if (useGoogleTts) {
          testAudioPlayed = await playGeminiVoicePreview(
            selectedVoice.id,
            generatedPrompt || character.voiceConfig?.prompt,
            sampleText,
          );
        } else {
          const testRes = await fetch("/api/tts/elevenlabs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: sampleText,
              voiceId: selectedVoice.id,
            }),
          });
          if (!testRes.ok) throw new Error("Failed to generate test dialogue.");
          const testBlob = await testRes.blob();
          const testUrl = URL.createObjectURL(testBlob);
          const audio = new Audio(testUrl);
          voicePreviewAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(testUrl);
            if (voicePreviewAudioRef.current === audio) {
              voicePreviewAudioRef.current = null;
            }
          };
          await audio.play();
          testAudioPlayed = true;
        }
      } catch (testErr) {
        console.warn("[Auto Voice] Test playback failed:", testErr);
      }

      if (testAudioPlayed) {
        toast.success("Auto voice setup complete. Playing test dialogue.");
      } else {
        toast.success("Auto voice saved. Test dialogue could not be played.");
      }
    } catch (error: any) {
      console.error("[Auto Voice] Error:", error);
      toast.error(error?.message || "Auto voice setup failed.");
    } finally {
      setIsAutoSelectingVoice(false);
    }
  };

  // Helper function to generate fallback description from attributes
  const generateFallbackDescription = (character: any): string => {
    const parts = [];

    // Core Identity
    if (character.ethnicity) parts.push(character.ethnicity);
    if (character.keyFeature) parts.push(character.keyFeature);

    // Physical Appearance
    if (character.build) parts.push(character.build);
    if (character.hairColor && character.hairStyle) {
      parts.push(`${character.hairColor} ${character.hairStyle} hair`);
    } else if (character.hairStyle) {
      parts.push(`${character.hairStyle} hair`);
    } else if (character.hairColor) {
      parts.push(`${character.hairColor} hair`);
    }
    if (character.eyeColor) parts.push(`${character.eyeColor} eyes`);
    if (character.expression) parts.push(character.expression);

    return parts.length > 0
      ? parts.join(", ")
      : "Click to add appearance description for scene generation";
  };

  const handleSaveName = async () => {
    if (nameText.trim() && onUpdateCharacterName) {
      await onUpdateCharacterName(characterId, nameText.trim());
      setEditingName(false);
    }
  };

  const handleSaveRole = async () => {
    if (onUpdateCharacterRole) {
      await onUpdateCharacterRole(
        characterId,
        (
          document.getElementById(
            `role-select-${characterId}`,
          ) as HTMLSelectElement
        )?.value || "supporting",
      );
      setEditingRole(false);
    }
  };

  // Analyze script to suggest wardrobes for this character
  const handleAnalyzeScriptForWardrobes = async () => {
    if (!scenes || scenes.length === 0) {
      toast.error("No scenes available for analysis");
      return;
    }

    setIsAnalyzingScript(true);
    setWardrobeSuggestions([]);

    try {
      const response = await fetch("/api/character/suggest-wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: {
            id: characterId,
            name: character.name,
            role: character.role,
            appearanceDescription: character.appearanceDescription,
            existingWardrobes: wardrobes.map((w) => ({
              name: w.name,
              sceneNumbers: w.sceneNumbers,
            })),
          },
          scenes: scenes.map((s: any, idx: number) => ({
            sceneNumber: idx + 1,
            heading:
              typeof s.heading === "string" ? s.heading : s.heading?.text,
            action: s.action,
            visualDescription: s.visualDescription,
            dialogue: s.dialogue
              ?.filter(
                (d: any) =>
                  d.character?.toLowerCase() === character.name?.toLowerCase(),
              )
              .map((d: any) => d.line)
              .join(" "),
            beats: (() => {
              const beats = getSceneBeats(s);
              return beats.length > 0
                ? beats.map((b) => ({
                    kind: b.kind,
                    character: b.character,
                    line: b.line,
                    actionDescription: b.actionDescription?.trim() || undefined,
                  }))
                : undefined;
            })(),
            segments: Array.isArray(s.segments)
              ? s.segments.map((seg: any) => ({
                  segmentDirection: seg.segmentDirection,
                  startFrameDescription: seg.startFrameDescription,
                  endFrameDescription: seg.endFrameDescription,
                }))
              : undefined,
          })),
          screenplayContext: {
            genre: screenplayContext?.genre,
            tone: screenplayContext?.tone,
            setting: screenplayContext?.setting,
            logline: screenplayContext?.logline,
          },
        }),
      });

      const body = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to analyze script",
        );
      }

      const { suggestions } = body;
      setWardrobeSuggestions(suggestions || []);

      if (suggestions?.length > 0) {
        toast.success(
          `Found ${suggestions.length} wardrobe suggestion(s) for ${character.name}`,
        );
      } else {
        toast.info("No additional wardrobes needed based on script analysis");
      }
    } catch (error) {
      console.error("[Script Analysis] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze script",
      );
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  // Accept a wardrobe suggestion and add it to the collection
  const handleAcceptSuggestion = (
    suggestion: (typeof wardrobeSuggestions)[0],
  ) => {
    onUpdateWardrobe?.(characterId, {
      defaultWardrobe: suggestion.description,
      wardrobeAccessories: suggestion.accessories,
      wardrobeName: suggestion.name,
      sceneNumbers: suggestion.sceneNumbers,
      appearanceNotes: suggestion.appearanceNotes,
      reason: suggestion.reason,
      action: "add",
    });

    // Remove from suggestions
    setWardrobeSuggestions((prev) =>
      prev.filter((s) => s.name !== suggestion.name),
    );
    toast.success(`Added "${suggestion.name}" to wardrobe collection`);
  };

  // Accept all suggestions at once
  const handleAcceptAllSuggestions = () => {
    if (onBatchUpdateWardrobes && wardrobeSuggestions.length > 0) {
      onBatchUpdateWardrobes(
        characterId,
        wardrobeSuggestions.map((s) => ({
          name: s.name,
          description: s.description,
          accessories: s.accessories,
          sceneNumbers: s.sceneNumbers,
          appearanceNotes: s.appearanceNotes,
          reason: s.reason,
        })),
      );
      setWardrobeSuggestions([]);
      toast.success(
        `Added ${wardrobeSuggestions.length} wardrobe(s) to collection`,
      );
    }
  };

  const handleGenerateWardrobe = async (
    recommendMode: boolean = false,
    addAsNew: boolean = false,
  ) => {
    if (!recommendMode && !aiPromptText.trim()) {
      toast.error("Please describe the wardrobe or image you want");
      return;
    }

    setIsGeneratingWardrobe(true);
    try {
      const response = await fetch("/api/character/generate-wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: character.name,
          characterRole: character.role,
          appearanceDescription:
            character.appearanceDescription ||
            generateFallbackDescription(character),
          wardrobeDescription: recommendMode ? undefined : aiPromptText,
          recommendMode,
          // Include screenplay context for smarter recommendations
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          logline: screenplayContext?.logline,
          visualStyle: screenplayContext?.visualStyle,
        }),
      });

      const body = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to generate wardrobe",
        );
      }

      const { wardrobe } = body as { wardrobe: Record<string, string> };

      // Populate the wardrobe fields with AI-generated content
      setWardrobeText(wardrobe.defaultWardrobe);
      setAccessoriesText(wardrobe.wardrobeAccessories || "");
      setShowAiAssist(false);
      setAiPromptText("");

      if (addAsNew) {
        // Show add form with pre-filled AI content including suggested name
        setShowAddWardrobeForm(true);
        setWardrobeName(wardrobe.wardrobeName || ""); // Use AI-suggested name
      } else {
        setActiveTab("wardrobe");
        setShowAddWardrobeForm(true);
        setWardrobeName(wardrobe.wardrobeName || "Default Outfit");
      }

      toast.success(
        recommendMode
          ? "Wardrobe recommended based on character & screenplay! Review and save."
          : "Wardrobe generated! Review and save when ready.",
      );
    } catch (error) {
      console.error("[AI Wardrobe] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate wardrobe",
      );
    } finally {
      setIsGeneratingWardrobe(false);
    }
  };

  // Handle saving wardrobe (add new or update existing)
  const cancelEditingWardrobe = () => {
    setEditingWardrobe(false);
    setEditingWardrobeId(null);
    setShowAddWardrobeForm(false);
    setWardrobeText("");
    setAccessoriesText("");
    setAppearanceNotesText("");
    setWardrobeName("");
  };

  const startEditingWardrobe = (w: CharacterWardrobe) => {
    setActiveTab("wardrobe");
    setShowAiAssist(false);
    setShowAddWardrobeForm(false);
    setEditingWardrobe(true);
    setEditingWardrobeId(w.id);
    setWardrobeText(w.description);
    setAccessoriesText(w.accessories || "");
    setAppearanceNotesText(w.appearanceNotes || "");
  };

  const handleSaveWardrobe = () => {
    if (!wardrobeText.trim()) {
      toast.error("Please enter a wardrobe description");
      return;
    }

    if (showAddWardrobeForm) {
      // Adding new wardrobe to collection
      const name = wardrobeName.trim() || `Outfit ${wardrobes.length + 1}`;
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined,
        wardrobeName: name,
        action: "add",
      });
      toast.success(`Added "${name}" to wardrobe collection`);
    } else if (editingWardrobeId) {
      // Updating existing wardrobe
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined,
        appearanceNotes: appearanceNotesText.trim() || undefined,
        wardrobeId: editingWardrobeId,
        action: "update",
      });
    } else {
      // Legacy: update default wardrobe
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined,
      });
    }

    cancelEditingWardrobe();
  };

  // Handle deleting a wardrobe
  const handleDeleteWardrobe = (wardrobeId: string) => {
    onUpdateWardrobe?.(characterId, {
      wardrobeId,
      action: "delete",
    });
  };

  // Handle setting a wardrobe as default
  const handleSetDefaultWardrobe = (wardrobeId: string) => {
    onUpdateWardrobe?.(characterId, {
      wardrobeId,
      action: "setDefault",
    });
  };

  // Handle AI enhancement of a wardrobe description
  // Takes a vague description and generates a highly detailed, image-gen-optimized version
  const handleEnhanceWardrobe = async (wardrobeId: string) => {
    const wardrobe = wardrobes.find((w) => w.id === wardrobeId);
    if (!wardrobe) return;

    setEnhancingWardrobeId(wardrobeId);
    try {
      const response = await fetch("/api/character/enhance-wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: character.name,
          characterRole: character.role,
          appearanceDescription:
            character.appearanceDescription ||
            generateFallbackDescription(character),
          currentWardrobeDescription: wardrobe.description,
          currentAccessories: wardrobe.accessories,
          wardrobeName: wardrobe.name,
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          visualStyle: screenplayContext?.visualStyle,
        }),
      });

      const body = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to enhance wardrobe",
        );
      }

      const { enhanced } = body as {
        enhanced: { description: string; accessories?: string };
      };

      // Save the enhanced description directly
      // The handler automatically syncs the legacy defaultWardrobe field
      // when the updated wardrobe is the one marked isDefault
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: enhanced.description,
        wardrobeAccessories: enhanced.accessories || wardrobe.accessories,
        wardrobeId: wardrobeId,
        action: "update",
      });

      // Update expanded wardrobe dialog if it's showing this wardrobe
      if (expandedWardrobe?.id === wardrobeId) {
        setExpandedWardrobe({
          ...expandedWardrobe,
          description: enhanced.description,
          accessories: enhanced.accessories || expandedWardrobe.accessories,
        });
      }

      toast.success("Wardrobe description enhanced with AI-level detail");
    } catch (error) {
      console.error("[Enhance Wardrobe] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to enhance wardrobe",
      );
    } finally {
      setEnhancingWardrobeId(null);
    }
  };

  const handleGenerateWardrobeImage = async (wardrobe: CharacterWardrobe) => {
    if (!character.referenceImage?.trim()?.startsWith("http")) {
      toast.error("Generate a character identity reference image first");
      return;
    }
    if (!wardrobe.description?.trim()) {
      toast.error("Add an outfit description before generating a wardrobe image");
      return;
    }

    setGeneratingWardrobeImageId(wardrobe.id);
    try {
      const sceneAction = [wardrobe.description, wardrobe.accessories]
        .filter(Boolean)
        .join(" ")
        .trim();
      const uploadPath = `characters/${projectId || "default"}/${characterId}/wardrobes/${wardrobe.id}/full-body-${Date.now()}.png`;

      const response = await fetch("/api/character/generate-scene-headshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          characterId,
          characterName: character.name,
          identityReferenceUrl: character.referenceImage,
          wardrobeDescription: wardrobe.description,
          wardrobeAccessories: wardrobe.accessories,
          appearanceNotes: wardrobe.appearanceNotes,
          appearanceDescription:
            character.appearanceDescription || generateFallbackDescription(character),
          hairStyle: character.hairStyle,
          hairColor: character.hairColor,
          sceneAction,
          referenceMode: "fullBody",
          existingFullBodyUrl: wardrobe.fullBodyUrl,
          forceRegenerate: !!wardrobe.fullBodyUrl,
          uploadPath,
        }),
      });

      const body = await readJsonSafe(response);

      if (!response.ok) {
        if (response.status === 504 || response.status === 408) {
          toast.error("Generation timed out — please try again");
          return;
        }
        if (body.code === "INSUFFICIENT_CREDITS") {
          toast.error(
            `Insufficient credits. Need ${body.required as number} credits.`,
          );
          return;
        }
        throw new Error(
          (body.error as string) || "Failed to generate wardrobe image",
        );
      }

      const { imageUrl, fullBodyUrl } = body as {
        imageUrl?: string;
        fullBodyUrl?: string;
      };
      const resolvedUrl = fullBodyUrl || imageUrl;
      if (!resolvedUrl) {
        throw new Error("No image URL returned");
      }

      onUpdateWardrobe?.(characterId, {
        wardrobeId: wardrobe.id,
        fullBodyUrl: resolvedUrl,
        action: "update",
      });

      if (expandedWardrobe?.id === wardrobe.id) {
        setExpandedWardrobe({ ...expandedWardrobe, fullBodyUrl: resolvedUrl });
      }

      toast.success(
        wardrobe.fullBodyUrl
          ? "Full-body wardrobe reference regenerated"
          : "Full-body wardrobe reference generated",
      );
    } catch (error) {
      console.error("[Wardrobe Image] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate wardrobe image",
      );
    } finally {
      setGeneratingWardrobeImageId(null);
    }
  };

  // Overlay store for enhance progress
  const overlayStore = useOverlayStore();

  // Derived state: check if character enhancement is in progress
  const isEnhancingReference =
    overlayStore.isVisible &&
    overlayStore.operationType === "character-enhance";

  // Handle enhancing the character reference image
  const handleEnhanceReference = async () => {
    if (!character.referenceImage) {
      toast.error("No reference image to enhance");
      return;
    }

    if (enhanceIterationCount >= 3) {
      toast.error(
        "Maximum enhancement iterations reached. Please upload a new source image.",
      );
      return;
    }

    overlayStore.show("Analyzing portrait quality...", 10, "character-enhance");
    try {
      overlayStore.setProgress(25);
      overlayStore.setStatus("Setting up studio lighting...");
      const response = await fetch("/api/character/enhance-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          sourceImageUrl: character.referenceImage,
          characterName: character.name,
          appearanceDescription:
            character.appearanceDescription ||
            generateFallbackDescription(character),
          iterationCount: enhanceIterationCount,
        }),
      });

      const body = await readJsonSafe(response);

      overlayStore.setProgress(70);
      overlayStore.setStatus("Generating enhanced portrait...");

      if (!response.ok) {
        if (body.code === "INSUFFICIENT_CREDITS") {
          toast.error(
            `Insufficient credits. Need ${body.required as number} credits.`,
          );
          return;
        }
        if (body.code === "ALREADY_OPTIMIZED") {
          toast.info(
            "This image is already well-optimized. Try uploading a different source image.",
          );
          return;
        }
        throw new Error((body.error as string) || "Enhancement failed");
      }

      overlayStore.setProgress(90);
      overlayStore.setStatus("Applying final retouching...");
      const result = body as {
        enhancedImageUrl: string;
        visionDescription?: string | null;
        qualityFeedback?: string | null;
        iterationCount: number;
        remainingIterations: number;
      };

      // Show preview for confirmation with quality feedback
      setEnhancedPreviewUrl(result.enhancedImageUrl);
      setEnhancedVisionDescription(result.visionDescription || null);
      setEnhanceQualityFeedback(result.qualityFeedback || null);
      setShowEnhanceConfirm(true);
      setEnhanceIterationCount(result.iterationCount);

      overlayStore.setProgress(100);
      overlayStore.setStatus("Portrait enhanced!");
      toast.success(
        `Enhanced to professional headshot! ${result.remainingIterations} iteration(s) remaining.`,
      );
    } catch (error) {
      console.error("[Enhance Reference] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Enhancement failed",
      );
    } finally {
      overlayStore.hide();
    }
  };

  // Accept the enhanced image
  const handleAcceptEnhanced = () => {
    if (enhancedPreviewUrl) {
      if (onApplyEnhancedReference) {
        onApplyEnhancedReference(characterId, {
          referenceImageUrl: enhancedPreviewUrl,
          visionDescription: enhancedVisionDescription,
          enhanceIterationCount,
        });
      } else if (onUpload) {
        fetch(enhancedPreviewUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], `enhanced-${characterId}.png`, {
              type: "image/png",
            });
            onUpload(file);
          });
      }
      setShowEnhanceConfirm(false);
      setEnhancedPreviewUrl(null);
      setEnhancedVisionDescription(null);
      setEnhanceQualityFeedback(null);
      toast.success("Professional headshot reference applied!");
    }
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `character-reference-${characterId}`,
      data: {
        referenceType: "character",
        referenceId: character.id || characterId,
        name: character.name,
        imageUrl: character.referenceImage,
      },
      disabled: !enableDrag,
    });

  const draggableStyle = enableDrag
    ? {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.65 : 1,
      }
    : undefined;

  // Collapsed view - shows just character name with expand button
  if (isCollapsed && !forceExpanded) {
    return (
      <div
        ref={setNodeRef}
        style={draggableStyle}
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Small avatar thumbnail */}
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {isDeferredImage ? (
                <DeferredImageSkeleton className="w-full h-full rounded-full" label={`Loading ${character.name}`} />
              ) : hasImage ? (
                <img
                  src={character.referenceImage}
                  alt={character.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate block">
                {character.name || "Unnamed"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                {character.role || "Character"}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Show character details"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const identityImageSection = (
    <div
      className={`relative bg-gray-100 dark:bg-gray-800 group rounded-md overflow-hidden ${
        splitLayout ? "h-full w-full" : "aspect-square"
      }`}
    >
      {isDeferredImage ? (
        <DeferredImageSkeleton
          className="w-full h-full"
          label={`Loading ${character.name}`}
        />
      ) : hasImage ? (
        <img
          src={character.referenceImage}
          alt={character.name}
          className={`w-full h-full ${splitLayout ? "object-contain" : "object-cover"}`}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            No reference image
          </span>
        </div>
      )}

      {isGenerating && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
          <Loader className="w-12 h-12 animate-spin text-blue-400 mb-3" />
          <span className="text-sm text-white font-medium">
            Generating Character...
          </span>
          <span className="text-xs text-gray-300 mt-1">Please wait</span>
        </div>
      )}

      <div
        className={`absolute inset-0 z-10 bg-black/40 transition-opacity flex items-center justify-center gap-3 ${
          character.referenceImage && !imageError
            ? "opacity-0 group-hover:opacity-100"
            : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isGenerating) return;
            onGenerate();
          }}
          disabled={isGenerating}
          className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
          title={
            character.referenceImage && !imageError
              ? "Quick Regenerate Character"
              : "Quick Generate Character"
          }
        >
          {isGenerating ? (
            <Loader className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Zap className="w-5 h-5 text-white" />
          )}
        </button>

        {onOpenCharacterPrompt && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCharacterPrompt();
            }}
            disabled={isGenerating}
            className="p-3 bg-amber-600/80 hover:bg-amber-600 rounded-full transition-colors disabled:opacity-50"
            title="Open Prompt Builder"
          >
            <Wand2 className="w-5 h-5 text-white" />
          </button>
        )}

        {character.referenceImage && !imageError && onEditImage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditImage();
            }}
            className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
            title="Edit Image"
          >
            <Settings2 className="w-5 h-5 text-white" />
          </button>
        )}

        {character.referenceImage && !imageError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isEnhancingReference) return;
              handleEnhanceReference();
            }}
            disabled={isEnhancingReference || enhanceIterationCount >= 3}
            className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              enhanceIterationCount >= 3
                ? "Max iterations reached - upload new image"
                : `Enhance Reference (${3 - enhanceIterationCount} left)`
            }
          >
            {isEnhancingReference ? (
              <Loader className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isUploading) return;
            const input = document.getElementById(
              `upload-${characterId}`,
            ) as HTMLInputElement;
            input?.click();
          }}
          disabled={isUploading}
          className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
          title={isUploading ? "Uploading..." : "Upload Image"}
        >
          {isUploading ? (
            <Loader className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-white" />
          )}
        </button>
        <input
          id={`upload-${characterId}`}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            e.stopPropagation();
            if (isUploading) return;
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {enableDrag && character.referenceImage && !imageError && (
        <div
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
          {...listeners}
          {...attributes}
        >
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-white/60"></div>
            <div className="w-1 h-1 rounded-full bg-white/60"></div>
            <div className="w-1 h-1 rounded-full bg-white/60"></div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={draggableStyle}
      className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden flex flex-col"
    >
      {/* Loading overlay */}
      {(isGenerating || isUploading) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
          <Loader className="w-8 h-8 animate-spin text-white mb-2" />
          <span className="text-sm text-white font-medium">
            {isUploading ? "Uploading..." : "Generating..."}
          </span>
        </div>
      )}

      {/* Approve Button */}
      {hasImage && !isApproved && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            disabled={isGenerating}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" />
            Approve Image
          </button>
        </div>
      )}

      <div className="p-4">
        <div
          className={
            splitLayout
              ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
              : "space-y-4"
          }
        >
          {splitLayout && (
            <div className="relative min-h-[180px] max-h-[50vh] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
              {identityImageSection}
            </div>
          )}
          <div
            className={
              splitLayout
                ? "space-y-4 min-w-0 overflow-y-auto max-h-[50vh]"
                : "contents"
            }
          >
        {/* Header Section */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                {editingName ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={nameText}
                      onChange={(e) => setNameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") {
                          setEditingName(false);
                          setNameText("");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 text-base font-semibold border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveName();
                      }}
                      className="p-1 text-green-600 dark:text-green-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(false);
                        setNameText("");
                      }}
                      className="p-1 text-red-600 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-bold text-base tracking-tight text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateCharacterName) {
                              setEditingName(true);
                              setNameText(character.name || "");
                            }
                          }}
                          title={
                            onUpdateCharacterName ? "Click to edit name" : ""
                          }
                        >
                          {character.name || "Unnamed"}
                        </span>
                        {/* Orphan badge - character not in script */}
                        {isOrphan && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full"
                            title="This character has no dialogue in the current script"
                          >
                            <AlertCircle className="w-2.5 h-2.5" />
                            Not in script
                          </span>
                        )}
                      </div>
                      {/* Inline voice info - shows voice name next to character name */}
                      {character.voiceConfig?.voiceName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({character.voiceConfig.voiceName})
                        </span>
                      )}
                    </div>
                    {onRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Remove ${character.name}?`)) {
                            onRemove();
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                        title="Remove character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
              {editingRole ? (
                <div className="flex gap-2 items-center">
                  <select
                    id={`role-select-${characterId}`}
                    defaultValue={character.role || "supporting"}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 uppercase tracking-wide"
                  >
                    <option value="lead">Lead</option>
                    <option value="supporting">Supporting</option>
                    <option value="minor">Minor</option>
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRole();
                    }}
                    className="p-0.5 text-green-600 dark:text-green-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRole(false);
                    }}
                    className="p-0.5 text-red-600 dark:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  {character.role && (
                    <span
                      className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onUpdateCharacterRole) {
                          setEditingRole(true);
                        }
                      }}
                      title={onUpdateCharacterRole ? "Click to edit role" : ""}
                    >
                      {character.role}
                    </span>
                  )}
                </>
              )}
              {character.aliases &&
                Array.isArray(character.aliases) &&
                character.aliases.length > 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                    Also matches:{" "}
                    {character.aliases
                      .filter((a: string) => a !== character.name)
                      .join(", ")}
                  </p>
                )}
            </div>
          </div>
          {!forceExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(true);
            }}
            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
            title="Hide character card"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2 items-center">
          {character.voiceConfig ? (
            <div
              className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-green-500/20 shadow-sm max-w-[200px]"
              title={
                character.voiceConfig.voiceName
                  ? `Assigned: ${character.voiceConfig.voiceName}`
                  : 'Voice assigned'
              }
            >
              <Mic className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {character.voiceConfig.voiceName
                  ? character.voiceConfig.voiceName.replace(
                      / \((Gemini|Studio|Premium)\)/i,
                      '',
                    )
                  : 'Voice'}
              </span>
            </div>
          ) : (
            <div
              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-500/20 shadow-sm"
              title="Assign voice for audio generation"
            >
              <AlertCircle className="w-3 h-3" /> <span>No Voice</span>
            </div>
          )}
          {character.referenceImage && (
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-blue-500/20 shadow-sm">
              <ImageIcon className="w-3 h-3" /> <span>Image</span>
            </div>
          )}
          {wardrobes.length > 0 && (
            <div className="bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-purple-500/20 shadow-sm">
              <Shirt className="w-3 h-3" />{" "}
              <span>{wardrobes.length} Wardrobes</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {character.description}
        </p>

        {/* Workflow tabs: Identity → Voice → Wardrobe */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as CharacterWorkflowTab)
            }
          >
            <TabsList className="w-full grid grid-cols-3 h-9 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-0.5">
              <TabsTrigger
                value="identity"
                className="text-xs gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Identity
                {!hasImage && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                    title="Reference image needed"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="voice"
                className="text-xs gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <Mic className="w-3.5 h-3.5" />
                Voice
                {!character.voiceConfig && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                    title="Voice required"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="wardrobe"
                className="text-xs gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <Shirt className="w-3.5 h-3.5" />
                Wardrobe
                {wardrobes.length > 0 && (
                  <span className="text-[10px] opacity-70 tabular-nums">
                    ({wardrobes.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="identity"
              className="mt-3 focus-visible:ring-0 space-y-3"
            >
                {!splitLayout && identityImageSection}

                {/* Body Description - Editable for image generation prompts */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                      <User className="w-3.5 h-3.5" />
                      Body Description
                    </span>
                    {!editingBodyDescription && onUpdateAppearance && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBodyDescriptionText(
                            character.appearanceDescription || "",
                          );
                          setEditingBodyDescription(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit body description for image generation"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {editingBodyDescription ? (
                    <div
                      className="space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        value={bodyDescriptionText}
                        onChange={(e) => setBodyDescriptionText(e.target.value)}
                        placeholder="e.g., Athletic build, tall, muscular, slim figure"
                        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingBodyDescription(false)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdateAppearance) {
                              onUpdateAppearance(
                                characterId,
                                bodyDescriptionText,
                              );
                              setEditingBodyDescription(false);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                      {character.appearanceDescription ||
                        "Click edit to add body description"}
                    </p>
                  )}
                </div>
            </TabsContent>

            <TabsContent
              value="voice"
              className="mt-3 focus-visible:ring-0 space-y-3"
            >
              {character.voiceConfig?.voiceId ? (
                <p
                  className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate"
                  title="Scene dialogue uses Gemini 3.1 TTS with this voice id"
                >
                  Gemini TTS ·{" "}
                  <span className="select-all">{character.voiceConfig.voiceId}</span>
                  {character.voiceConfig.prompt ? (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                      · Director&apos;s Note
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Assign a Gemini voice so dialogue generation uses the correct engine and voice id.
                </p>
              )}
              {useGeminiVoicePicker &&
              !hasCharacterReferenceForVoice &&
              !hasNarrativeForVoice ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Add a character description or reference image for Auto Voice profiling.
                </p>
              ) : null}
              {character.voiceConfig?.voiceName && (
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {character.voiceConfig.voiceName}
                </p>
              )}

              <div className="pt-1 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <FileText className="w-3.5 h-3.5" />
                    Casting Brief
                  </span>
                  {!editingVoiceDescription && onUpdateCharacterAttributes && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoiceDescriptionText(character.voiceDescription || "");
                        setEditingVoiceDescription(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Edit casting brief used for voice matching"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingVoiceDescription ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={voiceDescriptionText}
                      onChange={(e) => setVoiceDescriptionText(e.target.value)}
                      placeholder="e.g., Intelligent male voice with quiet authority, measured pace, and deep conviction."
                      className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingVoiceDescription(false)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onUpdateCharacterAttributes?.(characterId, {
                            voiceDescription: voiceDescriptionText.trim(),
                          });
                          setEditingVoiceDescription(false);
                          toast.success("Casting brief updated");
                        }}
                        className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-500 italic line-clamp-3">
                    {character.voiceDescription ||
                      "Run Auto Voice or edit to add a casting brief for voice matching."}
                  </p>
                )}
              </div>

              {character.voiceConfig?.prompt ? (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Director&apos;s Note
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-3">
                    {character.voiceConfig.prompt}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoiceDialogOpen(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    character.voiceConfig
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  Select Voice
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAutoVoiceClick();
                  }}
                  disabled={
                    isAutoSelectingVoice ||
                    ((useGeminiVoicePicker || ttsProvider === "google") &&
                      !hasCharacterReferenceForVoice &&
                      !hasNarrativeForVoice)
                  }
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-60"
                  title={
                    useGeminiVoicePicker || ttsProvider === "google"
                      ? hasCharacterReferenceForVoice || hasNarrativeForVoice
                        ? "Profile voice from character narrative and reference, then auto-select Gemini voice"
                        : "Add character description or reference image first"
                      : "Auto pick an ElevenLabs voice from character profile"
                  }
                >
                  {isAutoSelectingVoice ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Auto
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAssignedVoice();
                  }}
                  disabled={!character.voiceConfig?.voiceId}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    character.voiceConfig?.voiceId
                      ? isPlayingVoice
                        ? "Stop voice preview"
                        : "Play assigned voice preview"
                      : "Assign a voice first"
                  }
                >
                  {isPlayingVoice ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Play
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!supportsGeminiVoiceProfileEditor) {
                      toast.error("Assign a Gemini voice before editing the profile.");
                      return;
                    }
                    setVoiceProfileDialogOpen(true);
                  }}
                  disabled={!supportsGeminiVoiceProfileEditor}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    supportsGeminiVoiceProfileEditor
                      ? "Edit Director's Note, test delivery, and refine the voice profile"
                      : "Assign a Gemini voice first"
                  }
                >
                  <Settings2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </TabsContent>

            <TabsContent
              value="wardrobe"
              className="mt-3 focus-visible:ring-0 space-y-4 max-h-[420px] overflow-y-auto pr-1"
            >
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Reference is a diptych — close-up for identity, full-body for outfit. Turnaround
                  references work best with neutral upright pose, flat even lighting, and a plain
                  gray or white background.
                </p>
                {/* Primary CTA: Analyze Script for Outfits (Automate) */}
                {scenes &&
                  scenes.length > 0 &&
                  wardrobes.length === 0 &&
                  !isAnalyzingScript &&
                  wardrobeSuggestions.length === 0 && (
                    <div className="text-center py-3">
                      <p className="text-xs text-gray-400 mb-2">
                        Analyze your script to determine which outfits and looks{" "}
                        {character.name} needs across scenes.
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeScriptForWardrobes();
                        }}
                        disabled={isAnalyzingScript}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Analyze script to determine wardrobes needed for each scene range"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Analyze Script for Outfits & Looks</span>
                        <span className="text-[10px] opacity-75">
                          ({scenes.length} scenes)
                        </span>
                      </button>
                    </div>
                  )}

                {/* Analyzing indicator */}
                {isAnalyzingScript && (
                  <div className="flex items-center justify-center gap-2 py-4 text-amber-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs">
                      Analyzing {scenes?.length || 0} scenes...
                    </span>
                  </div>
                )}

                {/* Wardrobe Suggestions from Script Analysis (Guide) */}
                {wardrobeSuggestions.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Script Analysis Suggestions
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                          {wardrobeSuggestions.length}
                        </span>
                      </div>
                      {wardrobeSuggestions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptAllSuggestions();
                          }}
                          className="text-[10px] px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                        >
                          Accept All
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {wardrobeSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {suggestion.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                  Scenes {suggestion.sceneNumbers.join(", ")}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">
                                {suggestion.description}
                              </p>
                              {suggestion.appearanceNotes && (
                                <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 line-clamp-2">
                                  Look: {suggestion.appearanceNotes}
                                </p>
                              )}
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 italic">
                                {suggestion.reason}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptSuggestion(suggestion);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                title="Accept suggestion"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWardrobeSuggestions((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Dismiss suggestion"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guided Edit Form — AI Assist or Manual (Control) */}
                {showAiAssist ? (
                  <div className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      Guided Wardrobe Edit
                    </div>
                    <textarea
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                      placeholder="Describe the wardrobe change, e.g., 'Make the suit navy instead of black' or 'Professional tech CEO, modern minimalist'"
                      className="w-full px-2 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isGeneratingWardrobe}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateWardrobe(false, true);
                        }}
                        disabled={isGeneratingWardrobe || !aiPromptText.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingWardrobe ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Generate & Add
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAiAssist(false);
                          setAiPromptText("");
                        }}
                        disabled={isGeneratingWardrobe}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : showAddWardrobeForm ? (
                  <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Add New Wardrobe
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAiAssist(true);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800/40"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Assist
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Wardrobe Name
                      </label>
                      <input
                        type="text"
                        value={wardrobeName}
                        onChange={(e) => setWardrobeName(e.target.value)}
                        placeholder="e.g., Office Attire, Casual, Formal Event"
                        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Outfit Description
                      </label>
                      <textarea
                        value={wardrobeText}
                        onChange={(e) => setWardrobeText(e.target.value)}
                        placeholder="e.g., Charcoal grey tailored suit, white dress shirt, dark blue silk tie"
                        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        Accessories
                      </label>
                      <textarea
                        value={accessoriesText}
                        onChange={(e) => setAccessoriesText(e.target.value)}
                        placeholder="e.g., Silver wristwatch, rectangular glasses, gold wedding band"
                        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveWardrobe();
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add to Collection
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingWardrobe();
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Wardrobe cards with optional waist-up reference preview */}
                {wardrobes.length > 0 && (
                  <div className="space-y-3">
                    {wardrobes.map((w) => (
                      <div
                        key={w.id}
                        className={`rounded-lg border overflow-hidden transition-colors ${
                          w.isDefault
                            ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-700/50"
                            : "bg-gray-50/50 dark:bg-gray-800/10 border-gray-200 dark:border-gray-700/50"
                        }`}
                      >
                        {splitLayout ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 items-start">
                            <div className="relative min-h-[180px] max-h-[50vh] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                              {renderWardrobeImage(w, "split")}
                            </div>
                            <div className="space-y-4 min-w-0 overflow-y-auto max-h-[50vh]">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 min-w-0 mb-2">
                                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                    {w.name}
                                  </span>
                                  {w.isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                                      default
                                    </span>
                                  )}
                                  {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                                    <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      Scenes {formatSceneRange(w.sceneNumbers)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {editingWardrobeId !== w.id && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGenerateWardrobeImage(w);
                                        }}
                                        disabled={
                                          generatingWardrobeImageId === w.id ||
                                          !hasCharacterReferenceForVoice
                                        }
                                        className="p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
                                        title={
                                          !hasCharacterReferenceForVoice
                                            ? "Generate character identity reference first"
                                            : (w.fullBodyUrl || w.headshotUrl)
                                              ? "Regenerate wardrobe reference image"
                                              : "Generate wardrobe reference image"
                                        }
                                      >
                                        {generatingWardrobeImageId === w.id ? (
                                          <Loader className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <ImagePlus className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEnhanceWardrobe(w.id);
                                        }}
                                        disabled={enhancingWardrobeId === w.id}
                                        className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 disabled:opacity-50"
                                        title="Enhance with AI"
                                      >
                                        {enhancingWardrobeId === w.id ? (
                                          <Loader className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Wand2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingWardrobe(w);
                                        }}
                                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                        title="Edit wardrobe"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      {wardrobes.length > 1 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWardrobe(w.id);
                                          }}
                                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                          title="Delete wardrobe"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedWardrobe(w);
                                        }}
                                        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-500/10"
                                        title="Expand details"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {editingWardrobeId === w.id ? (
                                <div
                                  className="space-y-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Outfit Description
                                    </label>
                                    <textarea
                                      value={wardrobeText}
                                      onChange={(e) => setWardrobeText(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                      rows={3}
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Accessories
                                    </label>
                                    <textarea
                                      value={accessoriesText}
                                      onChange={(e) => setAccessoriesText(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Scene Appearance
                                    </label>
                                    <textarea
                                      value={appearanceNotesText}
                                      onChange={(e) => setAppearanceNotesText(e.target.value)}
                                      placeholder="Makeup, hair, injuries (e.g., bloodshot eyes, bruise on temple)"
                                      className="w-full px-2 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveWardrobe();
                                      }}
                                      className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditingWardrobe();
                                      }}
                                      className="px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {w.description}
                                  </p>
                                  {w.accessories && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5">
                                      <span className="font-medium text-gray-700 dark:text-gray-300">Accessories:</span> {w.accessories}
                                    </p>
                                  )}
                                  {w.appearanceNotes && (
                                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1.5">
                                      <span className="font-medium">Look:</span> {w.appearanceNotes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {renderWardrobeImage(w, "stacked")}
                            <div className="p-3">
                              {/* Title and badges row */}
                              <div className="mb-2">
                                <div className="flex flex-wrap items-center gap-2 min-w-0 mb-2">
                                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                    {w.name}
                                  </span>
                                  {w.isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                                      default
                                    </span>
                                  )}
                                  {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                                    <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      Scenes {formatSceneRange(w.sceneNumbers)}
                                    </span>
                                  )}
                                </div>

                                {/* Controls and Toggle row */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1">
                                    {editingWardrobeId !== w.id && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateWardrobeImage(w);
                                          }}
                                          disabled={
                                            generatingWardrobeImageId === w.id ||
                                            !hasCharacterReferenceForVoice
                                          }
                                          className="p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
                                          title={
                                            !hasCharacterReferenceForVoice
                                              ? "Generate character identity reference first"
                                              : (w.fullBodyUrl || w.headshotUrl)
                                                ? "Regenerate wardrobe reference image"
                                                : "Generate wardrobe reference image"
                                          }
                                        >
                                          {generatingWardrobeImageId === w.id ? (
                                            <Loader className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <ImagePlus className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEnhanceWardrobe(w.id);
                                          }}
                                          disabled={enhancingWardrobeId === w.id}
                                          className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 disabled:opacity-50"
                                          title="Enhance with AI"
                                        >
                                          {enhancingWardrobeId === w.id ? (
                                            <Loader className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Wand2 className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditingWardrobe(w);
                                          }}
                                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                          title="Edit wardrobe"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        {wardrobes.length > 1 && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteWardrobe(w.id);
                                            }}
                                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                            title="Delete wardrobe"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedWardrobe(w);
                                          }}
                                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-500/10"
                                          title="Expand details"
                                        >
                                          <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleWardrobeDescription(w.id);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                  >
                                    {expandedWardrobeDescriptions.has(w.id) ? (
                                      <>
                                        <span>Hide Details</span>
                                        <ChevronUp className="w-3 h-3" />
                                      </>
                                    ) : (
                                      <>
                                        <span>Show Details</span>
                                        <ChevronDown className="w-3 h-3" />
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {editingWardrobeId === w.id ? (
                                <div
                                  className="space-y-2 mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Outfit Description
                                    </label>
                                    <textarea
                                      value={wardrobeText}
                                      onChange={(e) => setWardrobeText(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                      rows={3}
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Accessories
                                    </label>
                                    <textarea
                                      value={accessoriesText}
                                      onChange={(e) => setAccessoriesText(e.target.value)}
                                      className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                      Scene Appearance
                                    </label>
                                    <textarea
                                      value={appearanceNotesText}
                                      onChange={(e) => setAppearanceNotesText(e.target.value)}
                                      placeholder="Makeup, hair, injuries (e.g., bloodshot eyes, bruise on temple)"
                                      className="w-full px-2 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveWardrobe();
                                      }}
                                      className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditingWardrobe();
                                      }}
                                      className="px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                expandedWardrobeDescriptions.has(w.id) && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                      {w.description}
                                    </p>
                                    {w.accessories && (
                                      <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Accessories:</span> {w.accessories}
                                      </p>
                                    )}
                                    {w.appearanceNotes && (
                                      <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1.5">
                                        <span className="font-medium">Look:</span> {w.appearanceNotes}
                                      </p>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom action row */}
                {wardrobes.length > 0 &&
                  !editingWardrobe &&
                  !showAddWardrobeForm &&
                  !showAiAssist && (
                    <div className="flex gap-2">
                      {/* Re-analyze button */}
                      {scenes && scenes.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyzeScriptForWardrobes();
                          }}
                          disabled={isAnalyzingScript}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-amber-500 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          {isAnalyzingScript ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Re-analyze
                        </button>
                      )}
                      {/* Manual add */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddWardrobeForm(true);
                          setWardrobeText("");
                          setAccessoriesText("");
                          setWardrobeName("");
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-gray-400 border border-gray-600/30 rounded-lg hover:bg-gray-700/30"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                      {/* AI Assist */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAiAssist(true);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI
                      </button>
                    </div>
                  )}

            </TabsContent>
          </Tabs>
        </div>
          </div>
        </div>
        {/* Voice Selection */}
        <Dialog open={genderConfirmOpen} onOpenChange={setGenderConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm character gender for voice matching</DialogTitle>
              <DialogDescription>
                We couldn&apos;t confidently infer gender from {character.name || "this character"}&apos;s
                profile. Pick one so Auto can match an appropriate Gemini voice.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenderConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGenderConfirmForAutoVoice("non-binary")}
              >
                Non-binary
              </Button>
              <Button
                type="button"
                onClick={() => handleGenderConfirmForAutoVoice("female")}
              >
                Female
              </Button>
              <Button
                type="button"
                onClick={() => handleGenderConfirmForAutoVoice("male")}
              >
                Male
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={voiceProfileDialogOpen} onOpenChange={setVoiceProfileDialogOpen}>
          <DialogContent
            className="max-w-3xl h-[85vh] max-h-[800px] p-0 overflow-hidden flex flex-col bg-gray-950 border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Edit voice profile for {character.name}</DialogTitle>
              <DialogDescription>
                Customize director notes and test voice delivery for this character.
              </DialogDescription>
            </DialogHeader>
            {character.voiceConfig?.voiceId ? (
              <VoiceDirectionEditor
                key={`${characterId}-${character.voiceConfig.voiceId}`}
                voiceId={character.voiceConfig.voiceId}
                voiceName={character.voiceConfig.voiceName || character.voiceConfig.voiceId}
                initialPrompt={character.voiceConfig.prompt || ""}
                characterContext={{
                  ...characterContext,
                  voiceDescription: character.voiceDescription,
                }}
                screenplayContext={screenplayContext}
                onSave={(prompt) => {
                  onUpdateCharacterVoice?.(characterId, {
                    ...character.voiceConfig,
                    provider: character.voiceConfig.provider || "google",
                    voiceId: character.voiceConfig.voiceId,
                    voiceName: character.voiceConfig.voiceName,
                    prompt: prompt.trim(),
                  });
                  setVoiceProfileDialogOpen(false);
                  toast.success("Voice profile updated");
                }}
                onCancel={() => setVoiceProfileDialogOpen(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        {useGeminiVoicePicker ? (
          <GeminiVoicePicker
            open={voiceDialogOpen}
            onOpenChange={setVoiceDialogOpen}
            mode="character"
            geminiOnly
            selectedVoiceId={character.voiceConfig?.voiceId || ""}
            directorPrompt={character.voiceConfig?.prompt}
            onSelectVoice={async (voiceId, voiceName) => {
              let prompt = character.voiceConfig?.prompt;
              if (!prompt && hasCharacterReferenceForVoice) {
                try {
                  const analysis = await fetchWardrobeVoiceAnalysis();
                  if (analysis) {
                    prompt = analysis.audioProfile;
                    onUpdateCharacterAttributes?.(characterId, {
                      gender: analysis.gender,
                      age: analysis.apparentAge,
                      ethnicity: analysis.ethnicity,
                      voiceDescription: analysis.voiceDescription,
                    });
                  }
                } catch (err) {
                  console.warn("[Select Voice] Wardrobe voice analysis failed:", err);
                }
              }
              if (!prompt) {
                try {
                  const characterRef = character.referenceImage?.trim();
                  const promptRes = await fetch("/api/tts/google/director-prompt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      characterContext,
                      screenplayContext,
                      characterImageUrl: characterRef,
                      wardrobeImageUrl: characterRef,
                    }),
                  });
                  if (promptRes.ok) {
                    const promptData = await promptRes.json();
                    prompt = (promptData?.script || "").trim() || prompt;
                  }
                } catch (err) {
                  console.warn("[Select Voice] Director prompt generation failed:", err);
                }
              }
              onUpdateCharacterVoice?.(characterId, {
                provider: "google",
                voiceId,
                voiceName,
                prompt,
              });
              toast.success(`Voice set to ${voiceName.replace(/ \(Premium\)/i, "")}`);
            }}
          />
        ) : (
          <VoiceSelectionDialog
            open={voiceDialogOpen}
            onOpenChange={setVoiceDialogOpen}
            provider={ttsProvider}
            mode="character"
            selectedVoiceId={character.voiceConfig?.voiceId || ""}
            onSelectVoice={(voiceId, voiceName, prompt) => {
              onUpdateCharacterVoice?.(characterId, {
                provider: ttsProvider,
                voiceId,
                voiceName,
                prompt: prompt || character.voiceConfig?.prompt,
              });
            }}
            characterContext={characterContext}
            screenplayContext={screenplayContext as ScreenplayContext}
            characterAudioSampleUrl={character.voiceTrainingAudioUrl}
            onVoiceDescriptionGenerated={(description) => {
              onUpdateCharacterAttributes?.(characterId, {
                voiceDescription: description,
              });
            }}
            onVoiceTrainingAudioSaved={(audioUrl) => {
              onUpdateCharacterAttributes?.(characterId, {
                voiceTrainingAudioUrl: audioUrl,
              });
            }}
          />
        )}

        {/* Approve Button - Show only if image exists and not approved */}
        {hasImage && !isApproved && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
            disabled={isGenerating}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" />
            Approve
          </button>
        )}

        {/* Enhance Reference Confirmation Dialog */}
        <Dialog open={showEnhanceConfirm} onOpenChange={setShowEnhanceConfirm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Professional Headshot Preview
              </DialogTitle>
              <DialogDescription>
                Your reference image has been optimized for film production use.
                Compare and accept, or try again ({3 - enhanceIterationCount}{" "}
                iteration{3 - enhanceIterationCount !== 1 ? "s" : ""}{" "}
                remaining).
              </DialogDescription>
            </DialogHeader>

            {/* Quality Improvements Banner */}
            {enhanceQualityFeedback &&
              enhanceQualityFeedback.improvements.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Enhancements Applied
                    </span>
                    {enhanceQualityFeedback.originalScore && (
                      <span className="text-xs text-gray-500 ml-auto">
                        Original quality score:{" "}
                        {enhanceQualityFeedback.originalScore}/100
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {enhanceQualityFeedback.improvements.map(
                      (improvement, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2"
                        >
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {improvement}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Original</p>
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-transparent">
                  {character.referenceImage && (
                    <img
                      src={character.referenceImage}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-purple-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Professional Headshot
                </p>
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500/50">
                  {enhancedPreviewUrl && (
                    <img
                      src={enhancedPreviewUrl}
                      alt="Enhanced"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Pro tip */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <strong>💡 Pro Tip:</strong> Professional headshots with neutral
              gray backgrounds and front-facing poses provide the most
              consistent results across all scene generations.
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEnhanceConfirm(false);
                  setEnhancedPreviewUrl(null);
                  setEnhanceQualityFeedback(null);
                }}
              >
                Keep Original
              </Button>
              {enhanceIterationCount < 3 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnhanceConfirm(false);
                    setEnhancedPreviewUrl(null);
                    setEnhanceQualityFeedback(null);
                    handleEnhanceReference();
                  }}
                  disabled={isEnhancingReference}
                >
                  {isEnhancingReference ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Try Again
                </Button>
              )}
              <Button
                onClick={handleAcceptEnhanced}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                Accept Enhanced
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wardrobe Expansion Modal */}
        <Dialog
          open={!!expandedWardrobe}
          onOpenChange={(open) => !open && setExpandedWardrobe(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-purple-500" />
                {expandedWardrobe?.name || "Wardrobe Details"}
                {expandedWardrobe?.sceneNumbers &&
                  expandedWardrobe.sceneNumbers.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      Scenes {formatSceneRange(expandedWardrobe.sceneNumbers)}
                    </span>
                  )}
              </DialogTitle>
              <DialogDescription>
                {character.name}'s wardrobe for film production
              </DialogDescription>
            </DialogHeader>

            {expandedWardrobe && (
              splitLayout ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 items-start">
                  <div className="relative min-h-[180px] max-h-[50vh] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {renderWardrobeImage(expandedWardrobe, "split")}
                  </div>
                  <div className="space-y-4 min-w-0 overflow-y-auto max-h-[50vh]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Outfit Description
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute right-0 bottom-full mb-1 w-56 p-2 bg-gray-900 text-gray-200 text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              More detailed descriptions produce more consistent
                              images across scenes. Use ✨ Enhance to automatically
                              add specifics like exact colors, materials, fit, and
                              footwear.
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnhanceWardrobe(expandedWardrobe.id);
                            }}
                            disabled={enhancingWardrobeId === expandedWardrobe.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/40 disabled:opacity-50"
                          >
                            {enhancingWardrobeId === expandedWardrobe.id ? (
                              <>
                                <Loader className="w-3 h-3 animate-spin" />{" "}
                                Enhancing...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3" /> Enhance
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        {expandedWardrobe.description}
                      </p>
                    </div>

                    {expandedWardrobe.accessories && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Accessories
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          {expandedWardrobe.accessories}
                        </p>
                      </div>
                    )}

                    {expandedWardrobe.appearanceNotes && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Scene Appearance
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800/40">
                          {expandedWardrobe.appearanceNotes}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Makeup, hair, and injury details from script analysis — applied to the close-up panel when generating the wardrobe reference.
                        </p>
                      </div>
                    )}

                    {expandedWardrobe.reason && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Analysis
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 italic">
                          {expandedWardrobe.reason}
                        </p>
                      </div>
                    )}

                    {expandedWardrobe.sceneNumbers &&
                      expandedWardrobe.sceneNumbers.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Used in Scenes
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {expandedWardrobe.sceneNumbers.map((num) => (
                              <span
                                key={num}
                                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                              >
                                Scene {num}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
              <div className="space-y-6 py-4">
                {/* Wardrobe reference image */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wardrobe Reference (Face + Full Body)
                  </h4>
                  <div className="relative aspect-video max-w-md mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {expandedWardrobe.headshotUrl ? (
                      <img
                        src={expandedWardrobe.headshotUrl}
                        alt={`${character.name} — ${expandedWardrobe.name}`}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
                        <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">
                          No wardrobe reference yet — generate a close-up + full-body diptych from the outfit description
                        </span>
                      </div>
                    )}
                    {generatingWardrobeImageId === expandedWardrobe.id && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Loader className="w-8 h-8 animate-spin text-white mb-2" />
                        <span className="text-xs text-white">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Outfit Description
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-1 w-56 p-2 bg-gray-900 text-gray-200 text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          More detailed descriptions produce more consistent
                          images across scenes. Use ✨ Enhance to automatically
                          add specifics like exact colors, materials, fit, and
                          footwear.
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnhanceWardrobe(expandedWardrobe.id);
                        }}
                        disabled={enhancingWardrobeId === expandedWardrobe.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/40 disabled:opacity-50"
                      >
                        {enhancingWardrobeId === expandedWardrobe.id ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />{" "}
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3" /> Enhance
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    {expandedWardrobe.description}
                  </p>
                </div>

                {/* Accessories */}
                {expandedWardrobe.accessories && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Accessories
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      {expandedWardrobe.accessories}
                    </p>
                  </div>
                )}

                {/* Scene appearance (makeup, hair, injuries) */}
                {expandedWardrobe.appearanceNotes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Scene Appearance
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800/40">
                      {expandedWardrobe.appearanceNotes}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Makeup, hair, and injury details from script analysis — applied to the close-up panel when generating the wardrobe reference.
                    </p>
                  </div>
                )}

                {/* Reason (if from script analysis) */}
                {expandedWardrobe.reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Analysis
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 italic">
                      {expandedWardrobe.reason}
                    </p>
                  </div>
                )}

                {/* Scene Numbers */}
                {expandedWardrobe.sceneNumbers &&
                  expandedWardrobe.sceneNumbers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Used in Scenes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {expandedWardrobe.sceneNumbers.map((num) => (
                          <span
                            key={num}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                          >
                            Scene {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
              )
            )}

            <DialogFooter className="flex flex-wrap gap-2">
              {expandedWardrobe && (
                <Button
                  onClick={() => handleGenerateWardrobeImage(expandedWardrobe)}
                  disabled={
                    generatingWardrobeImageId === expandedWardrobe.id ||
                    !hasCharacterReferenceForVoice
                  }
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  title={
                    !hasCharacterReferenceForVoice
                      ? "Generate character identity reference first"
                      : undefined
                  }
                >
                  {generatingWardrobeImageId === expandedWardrobe.id ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-2" />
                  )}
                  {(expandedWardrobe.fullBodyUrl || expandedWardrobe.headshotUrl) ? "Regenerate Image" : "Generate Image"}
                </Button>
              )}
              {expandedWardrobe && !expandedWardrobe.isDefault && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (expandedWardrobe) {
                      handleSetDefaultWardrobe(expandedWardrobe.id);
                      setExpandedWardrobe(null);
                    }
                  }}
                  className="border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Set as Default
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (expandedWardrobe) {
                    startEditingWardrobe(expandedWardrobe);
                    setExpandedWardrobe(null);
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => setExpandedWardrobe(null)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
