"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  Plus,
  Loader,
  Wand2,
  Upload,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Lightbulb,
  Info,
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
  Shield,
  Clapperboard,
  Clock,
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
import { saveImageFile } from "@/lib/download/saveFile";
import { useDraggable } from "@dnd-kit/core";
import { isVertexContentPolicyError } from "@/lib/generation/contentPolicy";
import { CSS } from "@dnd-kit/utilities";
import { upload } from "@vercel/blob/client";
import { CharacterPromptBuilder } from "@/components/vision/CharacterPromptBuilder";
import { ReferenceStillDirectorDialog } from "@/components/vision/ReferenceStillDirectorDialog";
import {
  resolveCastIdentityGenerationPrompt,
  seedCastDirectorPrompt,
  seedWardrobeDirectorPrompt,
} from "@/lib/intelligence/reference-still-director-fallback";
import {
  detectTraitDonorCandidatesFromProse,
  resolveAnchorWardrobeForTransition,
  resolveCharacterLikenessInput,
  type DetectedTraitDonorCandidate,
} from "@/lib/character/characterReferencePrompts";
import {
  defaultCharacterWardrobeId,
  resolveCharacterId,
} from "@/lib/vision/updateCharacterReference";
import {
  AddCharacterModal,
  useOrphanCharacters,
} from "@/components/vision/AddCharacterModal";
import {
  buildAgeVariantCharacter,
  extractSamePersonAgeStage,
  formatAgeVariantCharacterName,
} from "@/lib/character/ageStageContinuity";
import { failAgentRun, finishAgentRun, patchAgentRun, startAgentRun } from "@/store/useAgentRunStore";
import type {
  CharacterContext,
  ScreenplayContext,
} from "@/lib/voiceRecommendation";
import {
  resolveCharacterGender,
} from "@/lib/voiceRecommendation";
import {
  resolveVisualGender,
  normalizeCharacterGender,
  formatGenderLabel,
  type CharacterGender,
} from "@/lib/character/visualGender";
import { resolveAutoVoiceScoringGender } from "@/lib/tts/autoVoiceGender";
import { buildGoogleVoiceAssignment } from "@/lib/tts/pickGeminiBaseVoice";
import { composeVoiceDesignDescription, isDesignedGeminiVoiceId } from "@/lib/tts/geminiVoiceDesign";
import {
  characterVoiceProfileFromAnalysis,
  narrativeVoiceInputs,
  vocalCharacterContext,
} from "@/lib/tts/buildCharacterVoiceProfile";
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
import { runWithConcurrencyLimit } from "@/lib/utils/concurrency";
import { DictationTextarea } from "@/components/ui/DictationTextarea";
import {
  ExpandableText,
  isShortCharacterRole,
} from "@/components/ui/ExpandableText";
import { cn } from "@/lib/utils";
import { requestCastingBrief } from "@/lib/character/requestCastingBrief";
import {
  applyCastingBriefUpdate,
  refreshCastingBriefForAppearance,
} from "@/lib/character/applyCastingBriefUpdate";
import { LibraryKindToolbar } from "@/components/vision/LibraryKindToolbar";
import {
  castReferenceActions,
  countCastAgentItems,
  formatReferenceActionCue,
  kindAgentToolbarLabel,
  type ReferenceActionItem,
  type ReferenceActionSummary,
} from "@/lib/vision/libraryKindAgents";
import { ReferenceActionCue } from "./ReferenceActionCue";
import type { ReferenceExpressKind, ReferenceExpressScope } from "@/lib/vision/referenceExpress/types";
import { usePendingKindAgentRun } from "@/components/vision/usePendingKindAgentRun";
import {
  characterNeedsBaselineEnrichment,
  isPoisonedPlaceholderImagePrompt,
  type CastCharacterSyncUpdate,
} from "@/lib/character/characterIntelligence";

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
  onUploadCharacter: (characterId: string, file: File) => Promise<void> | void;
  onApproveCharacter: (characterId: string) => Promise<void> | void;
  onUpdateCharacterAttributes?: (
    characterId: string,
    attributes: any,
    options?: { quiet?: boolean },
  ) => Promise<void> | void;
  onUpdateCharacterVoice?: (
    characterId: string,
    voiceConfig: any,
    options?: { quiet?: boolean },
  ) => Promise<void> | void;
  onUpdateCharacterEdgeVoice?: (
    characterId: string,
    lang: string,
    edgeVoiceConfig: EdgeVoiceConfig | null,
  ) => Promise<void> | void;
  onUpdateCharacterAppearance?: (
    characterId: string,
    description: string,
  ) => Promise<void> | void;
  onUpdateCharacterName?: (
    characterId: string,
    name: string,
  ) => Promise<void> | void;
  onUpdateCharacterRole?: (
    characterId: string,
    role: string,
  ) => Promise<void> | void;
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
      combinedCharacterRefUrl?: string;
      sceneNumbers?: number[];
      appearanceNotes?: string;
      reason?: string;
      needsImageRegen?: boolean;
      generationPrompt?: string;
      action?: "add" | "update" | "delete";
    },
  ) => Promise<void> | void;
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
  ) => Promise<void> | void;
  /** Apply non-destructive wardrobe sync diffs from script */
  onApplyWardrobeSyncDiffs?: (
    diffs: Array<{
      characterId: string;
      characterName: string;
      updates: Array<{
        wardrobeId: string;
        patch: Record<string, unknown>;
        imageStale: boolean;
        reason: string;
      }>;
      creates: Array<{
        name: string;
        description: string;
        accessories?: string;
        appearanceNotes?: string;
        sceneNumbers: number[];
        reason: string;
      }>;
      obsolete: Array<{ wardrobeId: string; name: string; reason: string }>;
    }>,
  ) => Promise<{ staleWardrobeIdsByCharacter: Record<string, string[]> } | void> | void;
  onAddCharacter?: (characterData: any) => void;
  onRemoveCharacter?: (characterName: string) => void;
  /** Duplicate speaking roles the Cast toolbar can merge. */
  duplicateCastCount?: number;
  onMergeDuplicateCast?: () => void;
  /** Callback to edit a character's reference image */
  onEditCharacterImage?: (
    characterId: string,
    imageUrl: string,
  ) => Promise<void> | void;
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
  onExpressGenerateReferences?: (
    scope?: ReferenceExpressScope,
    options?: { waitUntilDone?: boolean },
  ) => Promise<unknown>;
  isExpressGeneratingReferences?: boolean;
  getLatestCharacters?: () => any[];
  pendingKindAgentRun?: ReferenceExpressKind | null;
  onPendingKindAgentRunConsumed?: () => void;
  focusTarget?: {
    characterId?: string;
    wardrobeId?: string;
    nonce?: number;
  } | null;
  defaultArtStyle?: string;
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
  combinedCharacterRefUrl?: string; // Stored PiP character card
  sceneNumbers?: number[]; // Scenes where this outfit is used (from script analysis)
  appearanceNotes?: string; // Makeup, hair state, visible injuries/marks
  reason?: string; // AI explanation for why this outfit is needed
  needsImageRegen?: boolean;
  generationPrompt?: string;
}

function generateCharacterFallbackDescription(character: any): string {
  const parts: string[] = [];
  if (character.ethnicity) parts.push(character.ethnicity);
  if (character.keyFeature) parts.push(character.keyFeature);
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
}

interface WardrobeRegenTarget {
  characterId: string;
  character: any;
  wardrobe: CharacterWardrobe;
}

async function regenerateWardrobeImage(
  target: WardrobeRegenTarget,
  projectId: string | undefined,
  onUpdateWardrobe?: CharacterLibraryProps["onUpdateCharacterWardrobe"],
): Promise<void> {
  const { characterId, character, wardrobe } = target;
  if (!character.referenceImage?.trim()?.startsWith("http")) {
    throw new Error(`${character.name || "Character"} needs an identity reference image first`);
  }
  if (!wardrobe.description?.trim()) {
    throw new Error(`Wardrobe "${wardrobe.name}" needs an outfit description`);
  }

  const sceneAction = [wardrobe.description, wardrobe.accessories]
    .filter(Boolean)
    .join(" ")
    .trim();
  const uploadPath = `characters/${projectId || "default"}/${characterId}/wardrobes/${wardrobe.id}/full-body-${Date.now()}.png`;
  const anchorWardrobe = resolveAnchorWardrobeForTransition(
    character.wardrobes,
    wardrobe,
  );

  const response = await fetch("/api/character/generate-scene-headshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      characterId,
      wardrobeId: wardrobe.id,
      characterName: character.name,
      identityReferenceUrl: character.referenceImage,
      wardrobeDescription: wardrobe.description,
      wardrobeAccessories: wardrobe.accessories,
      appearanceNotes: wardrobe.appearanceNotes,
      appearanceDescription:
        character.appearanceDescription ||
        generateCharacterFallbackDescription(character),
      hairStyle: character.hairStyle,
      hairColor: character.hairColor,
      sceneAction,
      referenceMode: "fullBody",
      existingFullBodyUrl: wardrobe.fullBodyUrl,
      ...(anchorWardrobe
        ? {
            baseWardrobeUrl: anchorWardrobe.baseWardrobeUrl,
            baseWardrobeDescription: anchorWardrobe.baseWardrobeDescription,
            baseWardrobeName: anchorWardrobe.baseWardrobeName,
          }
        : {}),
      forceRegenerate: !!wardrobe.fullBodyUrl,
      uploadPath,
      ...(wardrobe.generationPrompt?.trim()
        ? { promptOverride: wardrobe.generationPrompt.trim() }
        : {}),
    }),
  });

  const body = await readJsonSafe(response);
  if (!response.ok) {
    if (response.status === 504 || response.status === 408) {
      throw new Error("Generation timed out — please try again");
    }
    if (body.code === "INSUFFICIENT_CREDITS") {
      throw new Error(`Insufficient credits. Need ${body.required as number} credits.`);
    }
    throw new Error((body.error as string) || "Failed to generate wardrobe image");
  }

  const { imageUrl, fullBodyUrl, combinedCharacterRefUrl } = body as {
    imageUrl?: string;
    fullBodyUrl?: string;
    combinedCharacterRefUrl?: string;
  };
  const resolvedUrl = fullBodyUrl || imageUrl;
  if (!resolvedUrl) {
    throw new Error("No image URL returned");
  }

  await onUpdateWardrobe?.(characterId, {
    wardrobeId: wardrobe.id,
    wardrobeName: wardrobe.name,
    defaultWardrobe: wardrobe.description,
    wardrobeAccessories: wardrobe.accessories,
    appearanceNotes: wardrobe.appearanceNotes,
    fullBodyUrl: resolvedUrl,
    ...(combinedCharacterRefUrl
      ? { combinedCharacterRefUrl }
      : {}),
    ...(wardrobe.generationPrompt?.trim()
      ? { generationPrompt: wardrobe.generationPrompt.trim() }
      : {}),
    needsImageRegen: false,
    action: "update",
  });
}

/** Regenerate stale wardrobes with up to `limit` characters in parallel; sequential per character. */
async function regenerateStaleWardrobesBatch(
  targets: WardrobeRegenTarget[],
  projectId: string | undefined,
  onUpdateWardrobe: CharacterLibraryProps["onUpdateCharacterWardrobe"] | undefined,
  limit = 6,
): Promise<{ succeeded: number; failed: number }> {
  if (targets.length === 0) return { succeeded: 0, failed: 0 };

  const byCharacter = new Map<string, WardrobeRegenTarget[]>();
  for (const target of targets) {
    const list = byCharacter.get(target.characterId) || [];
    list.push(target);
    byCharacter.set(target.characterId, list);
  }

  let succeeded = 0;
  let failed = 0;

  await runWithConcurrencyLimit(
    Array.from(byCharacter.entries()),
    limit,
    async ([, charTargets]) => {
      for (const target of charTargets) {
        try {
          await regenerateWardrobeImage(target, projectId, onUpdateWardrobe);
          succeeded++;
        } catch (error) {
          failed++;
          console.error("[Wardrobe Regen] Error:", error);
        }
      }
    },
  );

  return { succeeded, failed };
}

interface CharacterCardProps {
  character: any;
  characterId: string;
  isSelected: boolean;
  onClick: () => void;
  onRegenerate: () => void;
  onGenerate: (override?: { likenessTransformNote?: string }) => void;
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
  onUpdateCharacterVoice?: (
    characterId: string,
    voiceConfig: any,
    options?: { quiet?: boolean },
  ) => Promise<void> | void;
  onUpdateCharacterEdgeVoice?: (
    characterId: string,
    lang: string,
    edgeVoiceConfig: EdgeVoiceConfig | null,
  ) => Promise<void> | void;
  onUpdateAppearance?: (
    characterId: string,
    description: string,
  ) => Promise<void> | void;
  onUpdateCharacterName?: (
    characterId: string,
    name: string,
  ) => Promise<void> | void;
  onUpdateCharacterRole?: (
    characterId: string,
    role: string,
  ) => Promise<void> | void;
  onUpdateCharacterAttributes?: (
    characterId: string,
    attributes: any,
    options?: { quiet?: boolean },
  ) => Promise<void> | void;
  onUpdateWardrobe?: (
    characterId: string,
    wardrobe: {
      defaultWardrobe?: string;
      wardrobeAccessories?: string;
      wardrobeId?: string;
      wardrobeName?: string;
      headshotUrl?: string;
      fullBodyUrl?: string;
      combinedCharacterRefUrl?: string;
      previewImageUrl?: string;
      sceneNumbers?: number[];
      appearanceNotes?: string;
      reason?: string;
      needsImageRegen?: boolean;
      generationPrompt?: string;
      action?: "add" | "update" | "delete";
    },
  ) => Promise<void> | void;
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
  ) => Promise<void> | void;
  onApplyWardrobeSyncDiffs?: CharacterLibraryProps["onApplyWardrobeSyncDiffs"];
  /** Script scenes for wardrobe analysis */
  scenes?: any[];
  onRemove?: () => void;
  /** Open modal to split/create separate character card(s) for different ages/eras */
  onCreateAgeVariant?: () => void;
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
  onDirectCast?: (payload: { prompt: string; generate: boolean }) => void | Promise<void>;
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
  /** Designed voices still assigned to other characters. Kept when the library is full. */
  retainVoiceIds?: string[];
  focusWardrobeId?: string;
  focusNonce?: number;
  defaultArtStyle?: string;
  /** Other cast members available as optional facial likeness anchors (sorted same-person & drawn first). */
  castReferenceCandidates?: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    hasPortrait: boolean;
    isSamePersonSibling?: boolean;
  }>;
  /** Parent/relative trait donors auto-detected from prose (e.g. "inheriting Arthur's hazel eyes and Eleanor's cheekbones"). */
  suggestedTraitDonors?: DetectedTraitDonorCandidate[];
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
  onApplyWardrobeSyncDiffs,
  onAddCharacter,
  onRemoveCharacter,
  duplicateCastCount = 0,
  onMergeDuplicateCast,
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
  onExpressGenerateReferences,
  isExpressGeneratingReferences = false,
  getLatestCharacters,
  pendingKindAgentRun = null,
  onPendingKindAgentRunConsumed,
  focusTarget = null,
  defaultArtStyle,
}: CharacterLibraryProps) {
  const effectiveVoiceProvider =
    voiceAssignmentProvider ?? ttsProvider ?? "elevenlabs";
  const splitLayout = layout === "dialog";

  const castCharacters = useMemo(
    () => characters.filter((char) => char.type !== "description"),
    [characters],
  );

  const getCharacterId = (char: (typeof castCharacters)[number], idx: number) => {
    const origIdx = characters.indexOf(char);
    return resolveCharacterId(char, origIdx >= 0 ? origIdx : idx);
  };

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
  const [addCharacterModalOpen, setAddCharacterModalOpen] = useState(false);
  const [ageVariantModalCharId, setAgeVariantModalCharId] = useState<string | null>(null);
  const [ageVariantTargetAgesInput, setAgeVariantTargetAgesInput] = useState("");
  const [ageVariantCurrentCardAge, setAgeVariantCurrentCardAge] = useState("");
  const [ageVariantEraLabel, setAgeVariantEraLabel] = useState("");
  const [ageVariantWardrobe, setAgeVariantWardrobe] = useState("");
  const [ageVariantLookNote, setAgeVariantLookNote] = useState("");
  const [isCreatingAgeVariants, setIsCreatingAgeVariants] = useState(false);
  const [isSyncingAllWardrobes, setIsSyncingAllWardrobes] = useState(false);
  const [isCastAgentRunning, setIsCastAgentRunning] = useState(false);

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

  const resolvedFocusCharId = useMemo(() => {
    if (!focusTarget) return null;
    const rawId = focusTarget.characterId?.trim();
    if (rawId) {
      const idx = castCharacters.findIndex(
        (c, i) =>
          getCharacterId(c, i) === rawId ||
          String(c.id ?? "").toLowerCase() === rawId.toLowerCase() ||
          String(c.name ?? "").trim().toLowerCase() === rawId.toLowerCase(),
      );
      if (idx >= 0) return getCharacterId(castCharacters[idx], idx);
    }
    if (focusTarget.wardrobeId) {
      const idx = castCharacters.findIndex((c) =>
        Array.isArray(c.wardrobes) &&
        c.wardrobes.some((w: CharacterWardrobe) => w.id === focusTarget.wardrobeId),
      );
      if (idx >= 0) return getCharacterId(castCharacters[idx], idx);
    }
    return null;
  }, [focusTarget, castCharacters]);

  useEffect(() => {
    if (!resolvedFocusCharId) return;
    setActiveCharacterId(resolvedFocusCharId);
    setSelectedChar(resolvedFocusCharId);
    if (layout !== "dialog") {
      setTimeout(() => {
        document
          .getElementById(`character-card-${resolvedFocusCharId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [resolvedFocusCharId, focusTarget?.nonce, layout]);

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
          await onUploadCharacter(characterId, file);
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

  const openAgeVariantDialog = (char: any, charId: string) => {
    const stageInfo = extractSamePersonAgeStage(String(char?.name || ""));
    const numericCurrent =
      stageInfo.numericAge ??
      (/^\d{1,3}$/.test(String(char?.age || "").trim())
        ? Number(String(char.age).trim())
        : undefined);
    setAgeVariantModalCharId(charId);
    setAgeVariantTargetAgesInput("");
    setAgeVariantCurrentCardAge(
      !stageInfo.isAgeVariant && numericCurrent ? String(numericCurrent) : "",
    );
    setAgeVariantEraLabel("");
    setAgeVariantWardrobe("");
    setAgeVariantLookNote("");
  };

  const handleConfirmCreateAgeVariants = async () => {
    if (!ageVariantModalCharId || !onAddCharacter) return;
    const sourceIdx = castCharacters.findIndex(
      (c, idx) => getCharacterId(c, idx) === ageVariantModalCharId,
    );
    const sourceChar = sourceIdx >= 0 ? castCharacters[sourceIdx] : null;
    if (!sourceChar) return;

    const rawAges = ageVariantTargetAgesInput
      .split(/[,;/\s]+/)
      .map((token) => Number(token.replace(/[^0-9]/g, "")))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 115);
    const uniqueAges = Array.from(new Set(rawAges)).sort((a, b) => a - b);

    if (uniqueAges.length === 0) {
      toast.error("Enter at least one target age (e.g. 16, 32, 62)");
      return;
    }

    setIsCreatingAgeVariants(true);
    try {
      const stageInfo = extractSamePersonAgeStage(String(sourceChar.name || ""));
      const baseName = stageInfo.baseName || String(sourceChar.name || "Character").trim();
      const groupKey =
        sourceChar.samePersonGroupId ||
        `person-${baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

      // Optionally stamp the current card's own age if user entered one and card is not yet age-stamped
      const currentAgeTrimmed = ageVariantCurrentCardAge.trim();
      const currentAgeNum = /^\d{1,3}$/.test(currentAgeTrimmed)
        ? Number(currentAgeTrimmed)
        : null;
      let stampedCurrentName: string | null = null;
      if (!stageInfo.isAgeVariant && currentAgeNum && currentAgeNum >= 1 && currentAgeNum <= 115) {
        stampedCurrentName = formatAgeVariantCharacterName(baseName, currentAgeNum);
        await onUpdateCharacterName?.(ageVariantModalCharId, stampedCurrentName);
        await onUpdateCharacterAttributes?.(
          ageVariantModalCharId,
          {
            age: String(currentAgeNum),
            samePersonGroupId: groupKey,
          },
          { quiet: true },
        );
      } else if (!sourceChar.samePersonGroupId) {
        await onUpdateCharacterAttributes?.(
          ageVariantModalCharId,
          { samePersonGroupId: groupKey },
          { quiet: true },
        );
      }

      const existingLowerNames = new Set(
        characters.map((c) => String(c?.name || "").trim().toLowerCase()),
      );
      if (stampedCurrentName) {
        existingLowerNames.add(stampedCurrentName.toLowerCase());
      }

      const createdNames: string[] = [];
      for (const targetAge of uniqueAges) {
        const candidateName = formatAgeVariantCharacterName(baseName, targetAge);
        if (existingLowerNames.has(candidateName.toLowerCase())) {
          continue;
        }
        const variantChar = buildAgeVariantCharacter(sourceChar, {
          targetAge,
          eraLabel: ageVariantEraLabel.trim() || undefined,
          defaultWardrobeOverride: ageVariantWardrobe.trim() || undefined,
          samePersonGroupId: groupKey,
          lookTransformNote: ageVariantLookNote.trim() || undefined,
          likenessCharacterId: ageVariantModalCharId,
          likenessCharacterName:
            stampedCurrentName || String(sourceChar.name || "").trim() || undefined,
        });
        await onAddCharacter(variantChar);
        existingLowerNames.add(candidateName.toLowerCase());
        createdNames.push(candidateName);
      }

      if (createdNames.length > 0) {
        toast.success(
          `Created ${createdNames.length} age-stage character${createdNames.length > 1 ? "s" : ""}: ${createdNames.join(", ")}`,
        );
      } else if (stampedCurrentName) {
        toast.success(`Updated character to ${stampedCurrentName}`);
      } else {
        toast.info("Those age-stage characters already exist in Cast.");
      }
      setAgeVariantModalCharId(null);
    } catch (err) {
      console.error("[Age Variant] Failed to create age variant:", err);
      toast.error("Failed to create age variant character");
    } finally {
      setIsCreatingAgeVariants(false);
    }
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
    const selfStage = extractSamePersonAgeStage(String(char.name || ""));
    const selfBaseLower = selfStage.baseName.toLowerCase().trim();
    const selfGroupId = String(char.samePersonGroupId || "").trim();
    const castReferenceCandidates = castCharacters
      .flatMap((other, otherIdx) => {
        const otherId = getCharacterId(other, otherIdx);
        if (otherId === charId) {
          return [];
        }
        const hasPortrait = isDisplayableImageUrl(other.referenceImage);
        const otherStage = extractSamePersonAgeStage(String(other.name || ""));
        const otherBaseLower = otherStage.baseName.toLowerCase().trim();
        const otherGroupId = String(other.samePersonGroupId || "").trim();
        const isSamePersonSibling = Boolean(
          (selfGroupId && otherGroupId && selfGroupId === otherGroupId) ||
            (selfBaseLower &&
              otherBaseLower &&
              selfBaseLower === otherBaseLower &&
              (selfStage.isAgeVariant || otherStage.isAgeVariant)),
        );
        return [
          {
            id: otherId,
            name: String(other.name || "Character"),
            imageUrl: hasPortrait ? String(other.referenceImage) : undefined,
            hasPortrait,
            isSamePersonSibling,
          },
        ];
      })
      .sort((a, b) => {
        if (Boolean(a.isSamePersonSibling) !== Boolean(b.isSamePersonSibling)) {
          return a.isSamePersonSibling ? -1 : 1;
        }
        if (a.hasPortrait !== b.hasPortrait) {
          return a.hasPortrait ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    const suggestedTraitDonors = detectTraitDonorCandidatesFromProse(
      char,
      castCharacters,
      charId,
    );

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
        onGenerate={async (override) => {
          setGeneratingChars((prev) => new Set(prev).add(charId));
          try {
            const latestList = getLatestCharacters?.() ?? characters;
            const latestChar =
              latestList.find(
                (c, i) => resolveCharacterId(c, i) === charId,
              ) || char;
            const effectiveMode =
              latestChar?.likenessSourceType === "character" ||
              latestChar?.likenessSourceType === "upload" ||
              latestChar?.likenessSourceType === "none"
                ? latestChar.likenessSourceType
                : latestChar?.likenessCharacterId ||
                    latestChar?.likenessCharacterName ||
                    latestChar?.secondaryLikenessCharacterId ||
                    latestChar?.secondaryLikenessCharacterName
                  ? "character"
                  : latestChar?.likenessImageUrl ||
                      latestChar?.secondaryLikenessImageUrl
                    ? "upload"
                    : "none";
            if (effectiveMode === "character") {
              const primaryDonorCand = latestChar?.likenessCharacterId || latestChar?.likenessCharacterName
                ? castReferenceCandidates.find(
                    (cand) =>
                      cand.id === latestChar?.likenessCharacterId ||
                      (Boolean(latestChar?.likenessCharacterName) &&
                        cand.name.trim().toLowerCase() ===
                          String(latestChar.likenessCharacterName).trim().toLowerCase()),
                  )
                : undefined;
              const secondaryDonorCand = latestChar?.secondaryLikenessCharacterId || latestChar?.secondaryLikenessCharacterName
                ? castReferenceCandidates.find(
                    (cand) =>
                      cand.id === latestChar?.secondaryLikenessCharacterId ||
                      (Boolean(latestChar?.secondaryLikenessCharacterName) &&
                        cand.name.trim().toLowerCase() ===
                          String(latestChar.secondaryLikenessCharacterName).trim().toLowerCase()),
                  )
                : undefined;
              const missingCastDonor = [primaryDonorCand, secondaryDonorCand].find(
                (cand) => cand && !cand.hasPortrait,
              );
              if (missingCastDonor) {
                toast.error(
                  `Generate or upload ${missingCastDonor.name}'s portrait first so ${latestChar?.name || "this character"} can inherit their reference features (or run Cast Agent to generate donors first).`,
                );
                return;
              }
            }
            const likeness = resolveCharacterLikenessInput(
              latestChar,
              latestList,
              charId,
            );
            if (
              effectiveMode === "character" &&
              !likeness.likenessReferenceImageUrl
            ) {
              const donorLabel =
                latestChar?.likenessCharacterName ||
                castReferenceCandidates.find(
                  (cand) => cand.id === latestChar?.likenessCharacterId,
                )?.name ||
                "the selected donor character";
              toast.error(
                `Generate or upload ${donorLabel}'s portrait first so ${latestChar?.name || "this character"} can anchor to their facial likeness (or run Cast Agent to generate both in sequence).`,
              );
              return;
            }
            if (
              effectiveMode === "upload" &&
              !likeness.likenessReferenceImageUrl
            ) {
              toast.error(
                "Upload a reference photo first, or switch Reference Likeness to None.",
              );
              return;
            }
            const resolved = resolveCastIdentityGenerationPrompt(
              latestChar,
              defaultArtStyle,
            );
            const effectiveTransformNote =
              override?.likenessTransformNote !== undefined
                ? override.likenessTransformNote
                : likeness.likenessTransformNote;
            await onGenerateCharacter(charId, {
              characterPrompt: resolved.prompt,
              ...(resolved.rawMode ? { rawMode: true } : {}),
              artStyle: defaultArtStyle,
              ...(likeness.likenessReferenceImageUrl
                ? {
                    likenessReferenceImageUrl: likeness.likenessReferenceImageUrl,
                    likenessDonors: likeness.donors,
                    likenessMode: likeness.likenessMode,
                    likenessTransformNote: effectiveTransformNote,
                    donorCharacterName: likeness.donorCharacterName,
                  }
                : {}),
              ...(latestChar?.age ? { targetAge: latestChar.age } : {}),
              ...(latestChar?.gender ? { targetGender: latestChar.gender } : {}),
            });
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
        onApplyWardrobeSyncDiffs={onApplyWardrobeSyncDiffs}
        scenes={scenes}
        onRemove={() => onRemoveCharacter?.(char.id || char.name)}
        onCreateAgeVariant={
          onAddCharacter ? () => openAgeVariantDialog(char, charId) : undefined
        }
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
        onDirectCast={async ({ prompt, generate }) => {
          if (generate) {
            setGeneratingChars((prev) => new Set(prev).add(charId));
          }
          try {
            const latestList = getLatestCharacters?.() ?? characters;
            const latestChar =
              latestList.find(
                (c, i) => resolveCharacterId(c, i) === charId,
              ) || char;
            const likeness = generate
              ? resolveCharacterLikenessInput(latestChar, latestList, charId)
              : null;
            await onGenerateCharacter(charId, {
              characterPrompt: prompt,
              rawMode: true,
              saveOnly: !generate,
              ...(likeness?.likenessReferenceImageUrl
                ? {
                    likenessReferenceImageUrl: likeness.likenessReferenceImageUrl,
                    likenessDonors: likeness.donors,
                    likenessMode: likeness.likenessMode,
                    likenessTransformNote: likeness.likenessTransformNote,
                    donorCharacterName: likeness.donorCharacterName,
                  }
                : {}),
              ...(generate && latestChar?.age ? { targetAge: latestChar.age } : {}),
              ...(generate && latestChar?.gender ? { targetGender: latestChar.gender } : {}),
            });
          } finally {
            if (generate) {
              setGeneratingChars((prev) => {
                const next = new Set(prev);
                next.delete(charId);
                return next;
              });
            }
          }
        }}
        screenplayContext={screenplayContext}
        projectId={projectId}
        defaultArtStyle={defaultArtStyle}
        forceExpanded={cardOptions?.forceExpanded}
        splitLayout={cardOptions?.splitLayout}
        focusWardrobeId={
          resolvedFocusCharId === charId ? focusTarget?.wardrobeId : undefined
        }
        focusNonce={
          resolvedFocusCharId === charId ? (focusTarget?.nonce ?? 1) : undefined
        }
        retainVoiceIds={castCharacters.flatMap((other, otherIdx) => {
          const otherId = getCharacterId(other, otherIdx);
          const voiceId = other.voiceConfig?.voiceId;
          if (otherId === charId || !isDesignedGeminiVoiceId(voiceId)) return [];
          return [voiceId as string];
        })}
        castReferenceCandidates={castReferenceCandidates}
        suggestedTraitDonors={suggestedTraitDonors}
      />
    );
  };

  const activeCharacterIndex = castCharacters.findIndex(
    (char, idx) => getCharacterId(char, idx) === activeCharacterId,
  );
  const activeCharacter =
    activeCharacterIndex >= 0 ? castCharacters[activeCharacterIndex] : null;

  const handleSyncCastBaselinesFromScript = async (): Promise<any[]> => {
    const currentCast = getLatestCharacters?.()?.filter((c) => c.type !== "description") ?? castCharacters;
    if (!scenes || scenes.length === 0 || currentCast.length === 0) {
      return currentCast;
    }
    const needsBaseline = currentCast.some(
      (char) =>
        characterNeedsBaselineEnrichment(char) ||
        isPoisonedPlaceholderImagePrompt(char.imagePrompt),
    );
    if (!needsBaseline) {
      return currentCast;
    }

    const runId = `cast-baseline-sync:${projectId || "default"}`;
    startAgentRun({
      id: runId,
      title: "Cast Agent",
      subtitle: "Enriching character descriptions, localization & family lineage...",
    });

    try {
      const response = await fetch("/api/character/sync-cast-from-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          persist: Boolean(projectId),
          characters: currentCast.map((char, idx) => ({
            ...char,
            id: getCharacterId(char, idx),
          })),
          scenes: buildScenesPayloadForWardrobeSync(scenes),
          screenplayContext: {
            genre: screenplayContext?.genre,
            tone: screenplayContext?.tone,
            setting: screenplayContext?.setting,
            logline: screenplayContext?.logline,
            artStyle: defaultArtStyle,
          },
        }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to sync cast baselines from script",
        );
      }

      const updates = (body.updates as CastCharacterSyncUpdate[]) || [];
      if (updates.length > 0) {
        const patchById = new Map<string, Record<string, any>>();
        for (const u of updates) {
          patchById.set(u.characterId, u.patch as Record<string, any>);
          await onUpdateCharacterAttributes?.(u.characterId, u.patch, {
            quiet: true,
          });
          if (typeof u.patch.appearanceDescription === "string" && u.patch.appearanceDescription.trim()) {
            await onUpdateCharacterAppearance?.(u.characterId, u.patch.appearanceDescription);
          }
        }
        finishAgentRun(runId, {
          subtitle: `Enriched ${updates.length} character baseline(s) with world & family continuity`,
        });
        return currentCast.map((char, idx) => {
          const cid = getCharacterId(char, idx);
          const patch = patchById.get(cid);
          return patch ? { ...char, ...patch } : char;
        });
      }

      finishAgentRun(runId, { subtitle: "Character baselines already aligned" });
      return currentCast;
    } catch (err) {
      console.warn("[Cast Baseline Sync] Non-blocking error:", err);
      failAgentRun(
        runId,
        err instanceof Error ? err.message : "Failed to enrich character baselines",
      );
      return currentCast;
    }
  };

  const handleUpdateAllWardrobesFromScript = async (
    overrideCast?: any[],
  ) => {
    const sourceCast = overrideCast ?? castCharacters;
    if (!scenes || scenes.length === 0) {
      toast.error("No scenes available for analysis");
      return false;
    }
    if (sourceCast.length === 0) {
      toast.error("No characters to sync");
      return false;
    }

    const syncRunId = `cast-wardrobe-sync:${projectId || "default"}`;
    setIsSyncingAllWardrobes(true);
    startAgentRun({
      id: syncRunId,
      title: "Cast Agent",
      subtitle: "Syncing cast looks from script — you can keep editing",
    });
    try {
      const response = await fetch("/api/character/sync-wardrobes-from-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characters: sourceCast.map((char, idx) => ({
            id: getCharacterId(char, idx),
            name: char.name,
            role: char.role,
            appearanceDescription: char.appearanceDescription,
            wardrobes: (char.wardrobes || []).map((w: CharacterWardrobe) => ({
              id: w.id,
              name: w.name,
              description: w.description,
              accessories: w.accessories,
              appearanceNotes: w.appearanceNotes,
              sceneNumbers: w.sceneNumbers,
              previewImageUrl: w.previewImageUrl,
              headshotUrl: w.headshotUrl,
              fullBodyUrl: w.fullBodyUrl,
              isDefault: w.isDefault,
              createdAt: w.createdAt,
              reason: w.reason,
            })),
          })),
          scenes: buildScenesPayloadForWardrobeSync(scenes),
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
          (body.error as string) || "Failed to sync wardrobes from script",
        );
      }
      const diffs = (body.diffs as WardrobeSyncDiffPreview[]) || [];
      if (!diffs.length) {
        finishAgentRun(syncRunId, { subtitle: "Cast already matches script" });
        toast.info("Cast already matches the script");
        return true;
      }
      if (!onApplyWardrobeSyncDiffs) {
        failAgentRun(syncRunId, "Wardrobe sync handler unavailable");
        toast.error("Wardrobe sync handler unavailable");
        return false;
      }
      await onApplyWardrobeSyncDiffs(diffs);
      finishAgentRun(syncRunId, { subtitle: "Cast looks synced from script" });
      return true;
    } catch (error) {
      console.error("[Wardrobe Sync All] Error:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to sync all wardrobes";
      failAgentRun(syncRunId, msg);
      toast.error(msg);
      return false;
    } finally {
      setIsSyncingAllWardrobes(false);
    }
  };

  const collectStaleWardrobeTargets = (chars: any[]): WardrobeRegenTarget[] => {
    const targets: WardrobeRegenTarget[] = [];
    chars.forEach((char, idx) => {
      if (char.type === "narrator" || char.type === "description") return;
      const charId = getCharacterId(char, idx);
      for (const wardrobe of (char.wardrobes || []) as CharacterWardrobe[]) {
        if (wardrobe.needsImageRegen) {
          targets.push({ characterId: charId, character: char, wardrobe });
        }
      }
    });
    return targets;
  };

  const handleRegenerateAllStaleWardrobeImages = async (
    chars: any[] = getLatestCharacters?.() ?? characters,
  ) => {
    const targets = collectStaleWardrobeTargets(chars);
    if (targets.length === 0) {
      return { succeeded: 0, failed: 0 };
    }
    if (!onUpdateCharacterWardrobe) {
      toast.error("Wardrobe update handler unavailable");
      return { succeeded: 0, failed: 0 };
    }
    return regenerateStaleWardrobesBatch(
      targets,
      projectId,
      onUpdateCharacterWardrobe,
      6,
    );
  };

  const handleCastAgent = async () => {
    if (!onExpressGenerateReferences) return;
    if (isExpressGeneratingReferences) {
      await onExpressGenerateReferences({ kinds: ["cast"], includeNestedStills: true });
      return;
    }
    setIsCastAgentRunning(true);
    try {
      const enrichedCast = await handleSyncCastBaselinesFromScript();
      const synced = await handleUpdateAllWardrobesFromScript(enrichedCast);
      if (!synced) return;
      await onExpressGenerateReferences({ kinds: ["cast"], includeNestedStills: true });
    } finally {
      setIsCastAgentRunning(false);
    }
  };

  usePendingKindAgentRun(
    pendingKindAgentRun,
    "cast",
    handleCastAgent,
    onPendingKindAgentRunConsumed,
  );

  const castAgentCount = countCastAgentItems(castCharacters);
  const castAgentLabel = kindAgentToolbarLabel("Cast Agent", castAgentCount);
  const mergeDuplicatesButton =
    duplicateCastCount > 0 && onMergeDuplicateCast ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onMergeDuplicateCast}
        className="h-7 text-xs font-medium"
      >
        Merge duplicates ({duplicateCastCount})
      </Button>
    ) : null;
  const showCastToolbar =
    (Boolean(scenes && scenes.length > 0 && castCharacters.length > 0)) ||
    duplicateCastCount > 0;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? "p-4" : "p-6"} ${
        layout === "dialog"
          ? "flex flex-col flex-1 min-h-0 overflow-hidden"
          : "h-full overflow-y-auto"
      }`}
    >
      {!compact && (
        <div className={`flex items-center justify-between mb-6 gap-3 flex-wrap`}>
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
          {showCastToolbar && (
            <LibraryKindToolbar
              agentLabel={castAgentLabel}
              onAgent={
                onExpressGenerateReferences
                  ? () => void handleCastAgent()
                  : undefined
              }
              isUpdating={isSyncingAllWardrobes}
              isAgentRunning={
                isCastAgentRunning || isExpressGeneratingReferences
              }
              agentHasWork={castAgentCount > 0}
              agentTitle="Sync wardrobes from the script, then draw missing cast identity stills and stale looks in the background"
              extra={mergeDuplicatesButton}
            />
          )}
        </div>
      )}

      {compact && showCastToolbar && (
        <div className="mb-3 shrink-0">
          <LibraryKindToolbar
            agentLabel={castAgentLabel}
            onAgent={
              onExpressGenerateReferences
                ? () => void handleCastAgent()
                : undefined
            }
            isUpdating={isSyncingAllWardrobes}
            isAgentRunning={
              isCastAgentRunning || isExpressGeneratingReferences
            }
            agentHasWork={castAgentCount > 0}
            agentTitle="Sync wardrobes from the script, then draw missing cast identity stills and stale looks in the background"
            extra={mergeDuplicatesButton}
          />
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
        <div className="flex flex-col flex-1 min-h-0 gap-3">
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

          <div className="flex-1 min-h-0 overflow-y-auto">
          {activeCharacter && activeCharacterIndex >= 0
            ? renderCharacterCard(activeCharacter, activeCharacterIndex, {
                forceExpanded: true,
                splitLayout: true,
              })
            : null}
          </div>

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
              defaultArtStyle={defaultArtStyle}
              character={castCharacters.find(
                (c, idx) => getCharacterId(c, idx) === promptBuilderOpenFor,
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
              defaultArtStyle={defaultArtStyle}
              character={castCharacters.find(
                (c, idx) => getCharacterId(c, idx) === promptBuilderOpenFor,
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
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void saveImageFile({
                  url: zoomedImage.url,
                  label: `cast-${zoomedImage.name}`,
                })
                  .then((saved) => {
                    if (saved) toast.success("Character image saved");
                  })
                  .catch(() => toast.error("Failed to download character image"));
              }}
              className="absolute -top-10 right-10 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              title="Download Image"
              aria-label={`Download ${zoomedImage.name}`}
            >
              <Download className="w-5 h-5" />
            </button>
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

      {/* Multi-Age / Life-Stage Character Variant Modal */}
      {ageVariantModalCharId && (() => {
        const sourceIdx = castCharacters.findIndex(
          (c, idx) => getCharacterId(c, idx) === ageVariantModalCharId,
        );
        const sourceChar = sourceIdx >= 0 ? castCharacters[sourceIdx] : null;
        if (!sourceChar) return null;
        const parsedStage = extractSamePersonAgeStage(String(sourceChar.name || ""));
        const baseName = parsedStage.baseName || String(sourceChar.name || "Character");
        return (
          <Dialog
            open={Boolean(ageVariantModalCharId)}
            onOpenChange={(open) => {
              if (!open && !isCreatingAgeVariants) {
                setAgeVariantModalCharId(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-gray-100">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Create Age-Stage Characters — {baseName}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 leading-relaxed">
                  Production Stage locks one base face per character card and uses Wardrobes only for outfits at that age. Create separate{" "}
                  <span className="text-cyan-300 font-medium">{baseName} (Age NN)</span>{" "}
                  cards so each life stage gets its own age-accurate reference portrait while sharing core genetics ({sourceChar.ethnicity || "shared heritage"}
                  {sourceChar.eyeColor ? `, ${sourceChar.eyeColor} eyes` : ""}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div>
                  <label className="block text-xs font-medium text-gray-200 mb-1">
                    New age stage(s) to create <span className="text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={ageVariantTargetAgesInput}
                    onChange={(e) => setAgeVariantTargetAgesInput(e.target.value)}
                    placeholder="e.g. 16, 32, 62"
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-700 bg-gray-800 text-gray-100 focus:border-cyan-500 focus:outline-none"
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Creates {baseName} (Age 16), {baseName} (Age 32), etc. with dedicated reference slots.
                  </p>
                </div>

                {!parsedStage.isAgeVariant && onUpdateCharacterName && (
                  <div>
                    <label className="block text-xs font-medium text-gray-200 mb-1">
                      Stamp current &ldquo;{sourceChar.name}&rdquo; card&apos;s age <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ageVariantCurrentCardAge}
                      onChange={(e) => setAgeVariantCurrentCardAge(e.target.value)}
                      placeholder="e.g. 62 (renames current card to Name (Age 62))"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-gray-700 bg-gray-800 text-gray-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Era / Period note <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ageVariantEraLabel}
                      onChange={(e) => setAgeVariantEraLabel(e.target.value)}
                      placeholder="e.g. 1976 High School"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-700 bg-gray-800 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Period Wardrobe <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ageVariantWardrobe}
                      onChange={(e) => setAgeVariantWardrobe(e.target.value)}
                      placeholder="e.g. Vintage varsity jacket"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-700 bg-gray-800 text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Look / Hair / Facial Hair from Reference{" "}
                    <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ageVariantLookNote}
                    onChange={(e) => setAgeVariantLookNote(e.target.value)}
                    placeholder="e.g. thick tousled chestnut-brown hair, clean-shaven jawline, warm smile"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-700 bg-gray-800 text-gray-100"
                  />
                  <p className="text-[11px] text-cyan-400/90 mt-1">
                    New character card(s) will automatically link &ldquo;{sourceChar.name}&rdquo; as a facial likeness reference without coupling deletion.
                    {!isDisplayableImageUrl(sourceChar.referenceImage)
                      ? " Upload your photo or generate a portrait on the base card first (or run Cast Agent to generate both in sequence)."
                      : ""}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAgeVariantModalCharId(null)}
                  disabled={isCreatingAgeVariants}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleConfirmCreateAgeVariants()}
                  disabled={isCreatingAgeVariants || !ageVariantTargetAgesInput.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {isCreatingAgeVariants ? (
                    <>
                      <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create Age Variant(s)
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

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

function buildScenesPayloadForWardrobeSync(scenes: any[]) {
  return scenes.map((s: any, idx: number) => ({
    sceneNumber: idx + 1,
    heading: typeof s.heading === "string" ? s.heading : s.heading?.text,
    action: s.action,
    visualDescription: s.visualDescription,
    dialogue: Array.isArray(s.dialogue)
      ? s.dialogue.map((d: any) => `${d.character || ""}: ${d.line || ""}`).join(" ")
      : undefined,
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
  }));
}

type WardrobeSyncDiffPreview = {
  characterId: string;
  characterName: string;
  updates: Array<{
    wardrobeId: string;
    patch: Record<string, unknown>;
    imageStale: boolean;
    reason: string;
  }>;
  creates: Array<{
    name: string;
    description: string;
    accessories?: string;
    appearanceNotes?: string;
    sceneNumbers: number[];
    reason: string;
  }>;
  obsolete: Array<{ wardrobeId: string; name: string; reason: string }>;
  analysis?: string;
};

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
  onApplyWardrobeSyncDiffs,
  scenes = [],
  onRemove,
  onCreateAgeVariant,
  onEditImage,
  onApplyEnhancedReference,
  ttsProvider: _ttsProvider,
  voiceAssignmentProvider: _voiceAssignmentProvider,
  voiceSectionExpanded,
  onToggleVoiceSection,
  enableDrag = false,
  onOpenCharacterPrompt,
  onDirectCast,
  screenplayContext,
  projectId,
  forceExpanded = false,
  splitLayout = false,
  retainVoiceIds = [],
  focusWardrobeId,
  focusNonce,
  defaultArtStyle,
  castReferenceCandidates = [],
  suggestedTraitDonors = [],
}: CharacterCardProps) => {
  const [imageError, setImageError] = useState(false); // Track if image failed to load
  const [likenessNoteDraft, setLikenessNoteDraft] = useState<string>(
    character.likenessTransformNote || "",
  );
  const [isUploadingLikenessRef, setIsUploadingLikenessRef] = useState(false);
  const [isUploadingSecondaryLikenessRef, setIsUploadingSecondaryLikenessRef] =
    useState(false);
  const likenessFileInputRef = useRef<HTMLInputElement>(null);
  const secondaryLikenessFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLikenessNoteDraft(character.likenessTransformNote || "");
  }, [character.likenessTransformNote]);

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
  const [focusedWardrobeId, setFocusedWardrobeId] = useState<string | null>(null);
  const [heightText, setHeightText] = useState<string>(character.height || "");

  useEffect(() => {
    setHeightText(character.height || "");
  }, [character.height]);

  useEffect(() => {
    if (!focusNonce) return;
    setIsCollapsed(false);
    if (focusWardrobeId) {
      setActiveTab("wardrobe");
      setFocusedWardrobeId(focusWardrobeId);
    } else {
      setActiveTab("identity");
      setFocusedWardrobeId(null);
    }
  }, [focusNonce, focusWardrobeId]);
  const [editingWardrobe, setEditingWardrobe] = useState(false);
  const [editingWardrobeId, setEditingWardrobeId] = useState<string | null>(
    null,
  ); // Which wardrobe is being edited
  const [wardrobeText, setWardrobeText] = useState("");
  const [editingBodyDescription, setEditingBodyDescription] = useState(false);
  const [bodyDirectorText, setBodyDirectorText] = useState("");
  const [isGeneratingBody, setIsGeneratingBody] = useState(false);
  const [accessoriesText, setAccessoriesText] = useState("");
  const [appearanceNotesText, setAppearanceNotesText] = useState("");
  const [wardrobeName, setWardrobeName] = useState(""); // Name for new/edited wardrobe
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [isGeneratingWardrobe, setIsGeneratingWardrobe] = useState(false);
  const [editingCastingBrief, setEditingCastingBrief] = useState(false);
  const [castingDirectorText, setCastingDirectorText] = useState("");
  const [isGeneratingCasting, setIsGeneratingCasting] = useState(false);
  const [expandedWardrobeDescriptions, setExpandedWardrobeDescriptions] = useState<Set<string>>(new Set());
  const [isEnhancingReference, setIsEnhancingReference] = useState(false);
  const [directorTarget, setDirectorTarget] = useState<
    { kind: "cast" } | { kind: "wardrobe"; wardrobeId: string } | null
  >(null);

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
    const wardrobeImageUrl = w.fullBodyUrl || w.headshotUrl;
    const hasWardrobeImage = Boolean(wardrobeImageUrl);
    const loadingOverlay = isGenerating ? (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
        <Loader className="w-6 h-6 animate-spin text-white" />
      </div>
    ) : null;
    const directorOverlay = (
      <div
        className={`absolute inset-0 z-10 bg-black/40 flex items-center justify-center gap-2.5 ${
          hasWardrobeImage ? "opacity-0 group-hover:opacity-100 transition-opacity" : ""
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isGenerating || !hasCharacterReferenceForVoice) return;
            void handleGenerateWardrobeImage(w);
          }}
          disabled={isGenerating || !hasCharacterReferenceForVoice}
          className="p-2.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
          title={
            !hasCharacterReferenceForVoice
              ? "Generate character identity reference first"
              : hasWardrobeImage
                ? "Quick Regenerate Wardrobe"
                : "Quick Generate Wardrobe"
          }
        >
          {isGenerating ? (
            <Loader className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Zap className="w-4 h-4 text-white" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isGenerating) return;
            setDirectorTarget({ kind: "wardrobe", wardrobeId: w.id });
          }}
          disabled={isGenerating}
          className="p-2.5 bg-teal-600/90 hover:bg-teal-500 rounded-full transition-colors disabled:opacity-50"
          title="Director"
        >
          <Clapperboard className="w-4 h-4 text-white" />
        </button>
        {wardrobeImageUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void saveImageFile({
                url: wardrobeImageUrl,
                label: `wardrobe-${character.name}-${w.name}`,
              })
                .then((saved) => {
                  if (saved) toast.success("Wardrobe image saved");
                })
                .catch(() => toast.error("Failed to download wardrobe image"));
            }}
            className="p-2.5 bg-sky-600/80 hover:bg-sky-600 rounded-full transition-colors"
            title="Download Image"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        )}
        {expandedWardrobe?.id !== w.id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedWardrobe(w);
            }}
            className="p-2.5 bg-slate-700/80 hover:bg-slate-600 rounded-full transition-colors"
            title="Expand Details"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    );

    if (variant === "split") {
      return (
        <div className="relative h-full w-full group">
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
          {directorOverlay}
          {loadingOverlay}
        </div>
      );
    }

    const imageSrc = w.fullBodyUrl || w.headshotUrl;
    return (
      <div
        className={`relative group bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${
          w.fullBodyUrl ? "aspect-auto max-h-64" : "aspect-video max-h-48"
        }`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${character.name} — ${w.name} wardrobe reference`}
            className={`w-full h-full ${w.fullBodyUrl ? "object-contain" : "object-cover object-top"}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full min-h-[120px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
            <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No wardrobe reference yet</span>
          </div>
        )}
        {directorOverlay}
        {loadingOverlay}
      </div>
    );
  };
  const [genderConfirmOpen, setGenderConfirmOpen] = useState(false);
  const [isAutoSelectingVoice, setIsAutoSelectingVoice] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const voicePreviewAudioRef = React.useRef<HTMLAudioElement | null>(null);

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
  const [softeningWardrobeId, setSofteningWardrobeId] = useState<string | null>(
    null,
  ); // Which wardrobe is being AI-softened for image safety
  const [generatingWardrobeImageId, setGeneratingWardrobeImageId] = useState<
    string | null
  >(null);

  // Script analysis / sync for wardrobes state
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
  const [wardrobeSyncDiff, setWardrobeSyncDiff] =
    useState<WardrobeSyncDiffPreview | null>(null);
  const [isApplyingSync, setIsApplyingSync] = useState(false);
  const [isRegeneratingStale, setIsRegeneratingStale] = useState(false);

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
              id: defaultCharacterWardrobeId(characterId),
              name: "Default Outfit",
              description: character.defaultWardrobe,
              accessories: character.wardrobeAccessories,
              isDefault: true,
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

  const stillActions = castReferenceActions({
    type: character.type,
    referenceImage: character.referenceImage,
    wardrobes,
  });
  const identityAction = stillActions.items.find((item) => item.id === "identity");
  const wardrobeActions: ReferenceActionSummary = {
    tone: stillActions.items.some((item) => item.id !== "identity" && item.action !== "changed")
      ? "action"
      : stillActions.items.some((item) => item.id !== "identity")
        ? "attention"
        : "ready",
    items: stillActions.items.filter((item) => item.id !== "identity"),
    primary: stillActions.items.find((item) => item.id !== "identity") ?? null,
  };
  const stillStatusLine = [
    ...(identityAction ? [identityAction] : []),
    ...wardrobeActions.items,
  ]
    .map((item) => formatReferenceActionCue(item))
    .join(" | ");

  const openCastAction = (item: ReferenceActionItem) => {
    setIsCollapsed(false);
    if (item.id === "identity") {
      setActiveTab("identity");
      setFocusedWardrobeId(null);
      return;
    }
    setActiveTab("wardrobe");
    setFocusedWardrobeId(item.id);
  };

  useEffect(() => {
    if (!focusedWardrobeId || isCollapsed || activeTab !== "wardrobe") return;
    document.getElementById(`wardrobe-still-${focusedWardrobeId}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [focusedWardrobeId, isCollapsed, activeTab]);

  const hasCharacterReferenceForVoice =
    typeof character.referenceImage === "string" &&
    character.referenceImage.trim().startsWith("http");

  const hasNarrativeForVoice =
    Boolean(character.description?.trim()) ||
    Boolean(character.appearanceDescription?.trim()) ||
    Boolean(character.role?.trim()) ||
    Boolean(character.keyFeature?.trim());

  const isNarratorCharacter =
    character.type === "narrator" ||
    String(character.role || "").toLowerCase() === "narrator" ||
    String(character.name || "").toLowerCase() === "narrator";

  // Build character context for voice recommendations
  const characterContext: CharacterContext = {
    ...vocalCharacterContext({
      name: character.name || "Unknown",
      role: isNarratorCharacter ? "narrator" : character.role,
      gender: character.gender,
      age: character.age,
      ethnicity: character.ethnicity,
      keyFeature: character.keyFeature,
      description: character.description,
      appearanceDescription: character.appearanceDescription,
      voiceDescription: character.voiceDescription,
      referenceImage: character.referenceImage,
    }),
  };

  const playGeminiVoicePreview = async (
    voiceId: string,
    prompt?: string,
    sampleText?: string,
    designPrompt?: string,
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
        ...(designPrompt ? { designPrompt } : {}),
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

    if (vc.provider === "google" || vc.voiceId.startsWith("gemini-") || isDesignedGeminiVoiceId(vc.voiceId)) {
      try {
        await playGeminiVoicePreview(
          vc.voiceId,
          isDesignedGeminiVoiceId(vc.voiceId) ? undefined : vc.prompt,
          undefined,
          isDesignedGeminiVoiceId(vc.voiceId) ? vc.designPrompt || vc.prompt : undefined,
        );
      } catch (err) {
        console.warn("[Voice Preview] Playback failed:", err);
        toast.error("Could not play voice preview.");
        setIsPlayingVoice(false);
      }
      return;
    }

    toast.info("Generate a voice to use Gemini TTS for this character.");
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
        "Add a character description or reference image before Generate.",
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
          ...vocalCharacterContext({
            name: characterContext.name,
            role: character.role,
            gender: character.gender,
            age: character.age,
            ethnicity: character.ethnicity,
            keyFeature: character.keyFeature,
            description: character.description,
            appearanceDescription: character.appearanceDescription,
            voiceDescription: character.voiceDescription,
            referenceImage: character.referenceImage,
          }),
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

  const resolvedGender = useMemo(
    () => resolveVisualGender(character),
    [character]
  );

  const handleGenderChange = (gender: CharacterGender) => {
    onUpdateCharacterAttributes?.(characterId, {
      gender,
      genderSource: "user",
    });
  };

  const handleAutoVoiceClick = () => {
    if (!onUpdateCharacterVoice) {
      toast.error("Voice update is not available.");
      return;
    }

    if (!hasCharacterReferenceForVoice && !hasNarrativeForVoice) {
      toast.error(
        "Add a character description or reference image before Generate.",
      );
      return;
    }

    void handleAutoVoice();
  };

  const handleGenderConfirmForAutoVoice = (gender: "male" | "female" | "non-binary") => {
    setGenderConfirmOpen(false);
    if (onUpdateCharacterAttributes) {
      onUpdateCharacterAttributes(characterId, {
        gender,
        genderSource: "user",
      });
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
    let testAudioPlayed = false;
    let assignment: {
      provider: "google";
      voiceId: string;
      voiceName: string;
      prompt: string;
      designPrompt?: string;
    } | null = null;

    try {
      let visionAnalysis: WardrobeVoiceAnalysisResult | null = null;
      try {
        visionAnalysis = await fetchWardrobeVoiceAnalysis();
      } catch (analysisErr) {
        console.warn("[Auto Voice] Wardrobe voice analysis failed:", analysisErr);
        if (!genderOverride && character.genderSource !== "user") {
          const { confidence } = resolveCharacterGender(characterContext);
          if (confidence === "ambiguous") {
            setGenderConfirmOpen(true);
            setIsAutoSelectingVoice(false);
            return;
          }
        }
      }

      if (!visionAnalysis && !genderOverride && character.genderSource !== "user") {
        const { confidence } = resolveCharacterGender(characterContext);
        if (confidence === "ambiguous") {
          setGenderConfirmOpen(true);
          setIsAutoSelectingVoice(false);
          return;
        }
      }

      if (visionAnalysis && onUpdateCharacterAttributes) {
        const attrs: Record<string, unknown> = {
          age: visionAnalysis.apparentAge,
          ethnicity: visionAnalysis.ethnicity,
          voiceDescription: visionAnalysis.voiceDescription,
        };
        if (character.genderSource !== "user") {
          attrs.gender = visionAnalysis.gender;
          attrs.genderSource = "ai";
        }
        await onUpdateCharacterAttributes(characterId, attrs, { quiet: true });
        toast.success(
          visionAnalysis.confidence === "narrative"
            ? "Matched voice profile from character narrative."
            : "Matched voice profile from character reference.",
        );
      }

      const analysisProfile = visionAnalysis
        ? characterVoiceProfileFromAnalysis(visionAnalysis, {
            name: character.name,
            role: character.role,
            personality: character.keyFeature ?? character.personality,
          })
        : null;

      const scoringGender = resolveAutoVoiceScoringGender({
        genderOverride,
        genderSource: character.genderSource,
        characterGender: character.gender,
        analysisGender: analysisProfile?.identity.gender,
      });

      const scoringContext: CharacterContext = {
        ...characterContext,
        role: character.role ?? characterContext.role,
        personality: character.keyFeature ?? characterContext.personality,
        ...(scoringGender ? { gender: scoringGender } : {}),
        ...(analysisProfile
          ? {
              age: analysisProfile.identity.age,
              ethnicity: analysisProfile.identity.ethnicity,
              voiceDescription: analysisProfile.matchingBrief,
            }
          : {}),
      };

      const matchingBrief =
        analysisProfile?.matchingBrief ||
        narrativeVoiceInputs(character).matchingBrief ||
        "";

      if (!isNarratorCharacter) {
        const description = composeVoiceDesignDescription({
          role: character.role,
          gender: scoringContext.gender,
          apparentAge: visionAnalysis?.apparentAge || String(scoringContext.age ?? ""),
          accent: analysisProfile?.vocalAttributes?.accent,
          timbre: analysisProfile?.vocalAttributes?.timbre,
          pace: analysisProfile?.vocalAttributes?.pace,
          warmth: analysisProfile?.vocalAttributes?.warmth,
          authority: analysisProfile?.vocalAttributes?.authority,
          emotionalDefault: analysisProfile?.vocalAttributes?.emotionalDefault,
          voiceDescription: matchingBrief,
        });
        const currentVoiceId = character.voiceConfig?.voiceId;
        const designResponse = await fetch("/api/tts/google/voice-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            displayName: character.name || "Character",
            retainVoiceIds,
            ...(isDesignedGeminiVoiceId(currentVoiceId)
              ? { replaceVoiceId: currentVoiceId }
              : {}),
          }),
        });
        const designed = await designResponse.json().catch(() => ({}));
        if (!designResponse.ok || !designed?.voiceId) {
          throw new Error(designed?.error || "Voice Design failed");
        }
        assignment = {
          provider: "google",
          voiceId: designed.voiceId,
          voiceName: designed.voiceName || character.name || "Designed voice",
          prompt: description,
          designPrompt: description,
        };
      } else {
        assignment = buildGoogleVoiceAssignment(matchingBrief, {
          gender: scoringContext.gender,
          name: character.name,
          age: scoringContext.age,
          role: scoringContext.role,
          screenplayContext: screenplayContext as ScreenplayContext,
          vocalAttributes: analysisProfile?.vocalAttributes,
        });
      }

      if (matchingBrief && onUpdateCharacterAttributes) {
        await onUpdateCharacterAttributes(
          characterId,
          { voiceDescription: matchingBrief },
          { quiet: true },
        );
      }

      await onUpdateCharacterVoice(characterId, assignment);
      toast.success("Voice profile ready.");

      try {
        const sampleText = characterContext?.name
          ? `${characterContext.name}: This is my automatically recommended voice profile test.`
          : "This is my automatically recommended voice profile test.";

        testAudioPlayed = await playGeminiVoicePreview(
          assignment.voiceId,
          isDesignedGeminiVoiceId(assignment.voiceId) ? undefined : assignment.prompt,
          sampleText,
          isDesignedGeminiVoiceId(assignment.voiceId)
            ? assignment.designPrompt || assignment.prompt
            : undefined,
        );
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

  const handleGenerateBody = async (recommendMode: boolean = false) => {
    if (!onUpdateAppearance) {
      toast.error("Body update is not available.");
      return;
    }
    if (!recommendMode && !bodyDirectorText.trim()) {
      toast.error("Describe the change, or use Recommend from the screenplay.");
      return;
    }

    setIsGeneratingBody(true);
    try {
      const response = await fetch("/api/character/generate-body-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: character.name,
          characterRole: character.role,
          gender: character.gender,
          age: character.age,
          ethnicity: character.ethnicity,
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          logline: screenplayContext?.logline,
          visualStyle: screenplayContext?.visualStyle,
          currentAppearance: character.appearanceDescription,
          directorNotes: recommendMode ? undefined : bodyDirectorText,
          recommendMode,
        }),
      });

      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to generate body description",
        );
      }

      const nextDescription =
        typeof body.appearanceDescription === "string"
          ? body.appearanceDescription.trim()
          : "";
      if (!nextDescription) {
        throw new Error("Body description response was empty.");
      }

      await onUpdateAppearance(characterId, nextDescription);
      if (typeof body.height === "string" && body.height.trim() && onUpdateCharacterAttributes) {
        await onUpdateCharacterAttributes(
          characterId,
          { height: body.height.trim() },
          { quiet: true },
        );
      }
      setBodyDirectorText("");
      setEditingBodyDescription(false);
      toast.success(
        recommendMode
          ? "Body description recommended from the screenplay."
          : "Body description updated.",
      );
      await syncCastingBriefFromAppearance(nextDescription);
    } catch (error) {
      console.error("[Direct Body] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate body description",
      );
    } finally {
      setIsGeneratingBody(false);
    }
  };

  const persistCastingBrief = async (brief: string, quietRematch: boolean) => {
    const applied = applyCastingBriefUpdate(character, brief, {
      screenplayContext: screenplayContext as ScreenplayContext,
    });
    await onUpdateCharacterAttributes?.(
      characterId,
      { voiceDescription: applied.voiceDescription },
      { quiet: quietRematch },
    );
    if (applied.voiceConfig) {
      await onUpdateCharacterVoice?.(characterId, applied.voiceConfig, {
        quiet: quietRematch,
      });
    }
  };

  const syncCastingBriefFromAppearance = async (appearanceDescription: string) => {
    if (isNarratorCharacter) return;
    try {
      const applied = await refreshCastingBriefForAppearance({
        character,
        appearanceDescription,
        screenplayContext: screenplayContext as ScreenplayContext,
        hasPortrait: hasCharacterReferenceForVoice,
      });
      if (!applied) return;
      await persistCastingBrief(applied.voiceDescription, true);
      toast.success("Casting brief updated to match the body.");
    } catch (error) {
      console.warn("[Casting Brief] Appearance sync failed:", error);
      toast.error("Body updated, but the casting brief could not be refreshed.");
    }
  };

  const handleGenerateCasting = async (recommendMode: boolean = false) => {
    if (!onUpdateCharacterAttributes) {
      toast.error("Casting brief update is not available.");
      return;
    }
    if (!recommendMode && !castingDirectorText.trim()) {
      toast.error("Describe the change, or use Recommend from the screenplay.");
      return;
    }

    setIsGeneratingCasting(true);
    try {
      const { voiceDescription } = await requestCastingBrief({
        characterName: character.name,
        characterRole: character.role,
        gender: character.gender,
        age: character.age,
        ethnicity: character.ethnicity,
        genre: screenplayContext?.genre,
        tone: screenplayContext?.tone,
        setting: screenplayContext?.setting,
        logline: screenplayContext?.logline,
        visualStyle: screenplayContext?.visualStyle,
        appearanceDescription: character.appearanceDescription,
        currentBrief: character.voiceDescription,
        directorNotes: recommendMode ? undefined : castingDirectorText,
        recommendMode,
        hasPortrait: hasCharacterReferenceForVoice,
      });
      await persistCastingBrief(voiceDescription, false);
      setCastingDirectorText("");
      setEditingCastingBrief(false);
      toast.success(
        recommendMode
          ? "Casting brief recommended from appearance and role."
          : "Casting brief updated.",
      );
    } catch (error) {
      console.error("[Direct Casting] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate casting brief",
      );
    } finally {
      setIsGeneratingCasting(false);
    }
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

  // Sync wardrobes from script (non-destructive diff)
  const handleUpdateWardrobesFromScript = async () => {
    if (!scenes || scenes.length === 0) {
      toast.error("No scenes available for analysis");
      return;
    }

    setIsAnalyzingScript(true);
    setWardrobeSuggestions([]);
    setWardrobeSyncDiff(null);

    try {
      const response = await fetch("/api/character/sync-wardrobes-from-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: {
            id: characterId,
            name: character.name,
            role: character.role,
            appearanceDescription: character.appearanceDescription,
            wardrobes: wardrobes.map((w) => ({
              id: w.id,
              name: w.name,
              description: w.description,
              accessories: w.accessories,
              appearanceNotes: w.appearanceNotes,
              sceneNumbers: w.sceneNumbers,
              previewImageUrl: w.previewImageUrl,
              headshotUrl: w.headshotUrl,
              fullBodyUrl: w.fullBodyUrl,
              isDefault: w.isDefault,
              createdAt: w.createdAt,
              reason: w.reason,
            })),
          },
          scenes: buildScenesPayloadForWardrobeSync(scenes),
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
          (body.error as string) || "Failed to sync wardrobes from script",
        );
      }

      const diff = (body.diffs as WardrobeSyncDiffPreview[] | undefined)?.[0];
      if (!diff) {
        toast.info("No wardrobe changes detected from the script");
        return;
      }

      const changeCount =
        diff.updates.length + diff.creates.length + diff.obsolete.length;
      if (changeCount === 0) {
        toast.info("Wardrobes already match the script");
        return;
      }

      if (!onApplyWardrobeSyncDiffs) {
        setWardrobeSyncDiff(diff);
        toast.success(
          `Found ${diff.updates.length} update(s), ${diff.creates.length} new look(s)`,
        );
        return;
      }

      await onApplyWardrobeSyncDiffs([diff]);
    } catch (error) {
      console.error("[Wardrobe Sync] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to sync wardrobes",
      );
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  const handleApplyWardrobeSync = async () => {
    if (!wardrobeSyncDiff || !onApplyWardrobeSyncDiffs) {
      // Fallback: treat creates as batch replace when merge handler missing
      if (wardrobeSyncDiff?.creates.length && onBatchUpdateWardrobes) {
        onBatchUpdateWardrobes(
          characterId,
          wardrobeSyncDiff.creates.map((s) => ({
            name: s.name,
            description: s.description,
            accessories: s.accessories,
            sceneNumbers: s.sceneNumbers,
            appearanceNotes: s.appearanceNotes,
            reason: s.reason,
          })),
        );
        setWardrobeSyncDiff(null);
      }
      return;
    }

    setIsApplyingSync(true);
    try {
      await onApplyWardrobeSyncDiffs([wardrobeSyncDiff]);
      setWardrobeSyncDiff(null);
    } finally {
      setIsApplyingSync(false);
    }
  };

  // Analyze script to suggest wardrobes for this character (legacy additive path)
  const handleAnalyzeScriptForWardrobes = async () => {
    await handleUpdateWardrobesFromScript();
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
  ) => {
    if (!recommendMode && !aiPromptText.trim()) {
      toast.error("Describe the look, or use Recommend from the screenplay.");
      return;
    }

    const editingLook = editingWardrobeId
      ? wardrobes.find((w) => w.id === editingWardrobeId)
      : undefined;

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
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          logline: screenplayContext?.logline,
          visualStyle: screenplayContext?.visualStyle,
          currentOutfit: editingLook?.description,
          currentAccessories: editingLook?.accessories,
          currentAppearanceNotes: editingLook?.appearanceNotes,
        }),
      });

      const body = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(
          (body.error as string) || "Failed to generate wardrobe",
        );
      }

      const { wardrobe } = body as {
        wardrobe: {
          defaultWardrobe?: string;
          wardrobeAccessories?: string;
          wardrobeName?: string;
          appearanceNotes?: string;
        };
      };

      if (!wardrobe?.defaultWardrobe?.trim()) {
        throw new Error("Wardrobe response was empty.");
      }

      if (editingWardrobeId) {
        const hadDrawnImage = Boolean(
          editingLook?.fullBodyUrl ||
            editingLook?.headshotUrl ||
            editingLook?.previewImageUrl,
        );
        await onUpdateWardrobe?.(characterId, {
          defaultWardrobe: wardrobe.defaultWardrobe.trim(),
          wardrobeAccessories: wardrobe.wardrobeAccessories?.trim() || "",
          appearanceNotes: wardrobe.appearanceNotes?.trim() || "",
          wardrobeId: editingWardrobeId,
          generationPrompt: "",
          ...(hadDrawnImage ? { needsImageRegen: true } : {}),
          action: "update",
        });
        toast.success("Wardrobe updated.");
      } else {
        const name =
          wardrobeName.trim() ||
          wardrobe.wardrobeName?.trim() ||
          `Outfit ${wardrobes.length + 1}`;
        await onUpdateWardrobe?.(characterId, {
          defaultWardrobe: wardrobe.defaultWardrobe.trim(),
          wardrobeAccessories: wardrobe.wardrobeAccessories?.trim() || undefined,
          appearanceNotes: wardrobe.appearanceNotes?.trim() || undefined,
          wardrobeName: name,
          action: "add",
        });
        toast.success(`Added "${name}" to wardrobe collection`);
      }

      setAiPromptText("");
      cancelEditingWardrobe();
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
    setShowAiAssist(false);
    setWardrobeText("");
    setAccessoriesText("");
    setAppearanceNotesText("");
    setWardrobeName("");
    setAiPromptText("");
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
    setAiPromptText("");
  };

  const renderWardrobeDirectorForm = (mode: "add" | "edit") => {
    const currentHint = [
      wardrobeText.trim() && `Outfit: ${wardrobeText.trim()}`,
      accessoriesText.trim() && `Accessories: ${accessoriesText.trim()}`,
      appearanceNotesText.trim() && `Look: ${appearanceNotesText.trim()}`,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div
        className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          Direct wardrobe
        </div>
        {mode === "add" && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Look name (optional)
            </label>
            <input
              type="text"
              value={wardrobeName}
              onChange={(e) => setWardrobeName(e.target.value)}
              placeholder="e.g., Office Attire"
              className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={isGeneratingWardrobe}
            />
          </div>
        )}
        {mode === "edit" && currentHint && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Current look — {currentHint}
          </p>
        )}
        <DictationTextarea
          value={aiPromptText}
          onChange={setAiPromptText}
          placeholder={
            mode === "edit"
              ? "Say the change, e.g. Navy suit instead of black, keep the glasses, bloodshot eyes"
              : "Describe the look, or leave empty and Recommend from the screenplay"
          }
          rows={3}
          disabled={isGeneratingWardrobe}
          className="text-xs border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800"
        />
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleGenerateWardrobe(false);
            }}
            disabled={isGeneratingWardrobe || !aiPromptText.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingWardrobe ? (
              <>
                <Loader className="w-3 h-3 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Apply
              </>
            )}
          </button>
          {mode === "add" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleGenerateWardrobe(true);
              }}
              disabled={isGeneratingWardrobe}
              className="px-2 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
              title="Recommend a look from the character and screenplay"
            >
              Recommend
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              cancelEditingWardrobe();
            }}
            disabled={isGeneratingWardrobe}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
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
      const existingLook = wardrobes.find((w) => w.id === editingWardrobeId);
      const hadDrawnImage = Boolean(
        existingLook?.fullBodyUrl ||
          existingLook?.headshotUrl ||
          existingLook?.previewImageUrl,
      );
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim(),
        appearanceNotes: appearanceNotesText.trim(),
        wardrobeId: editingWardrobeId,
        generationPrompt: "",
        ...(hadDrawnImage ? { needsImageRegen: true } : {}),
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
      const hadDrawnImage = Boolean(
        wardrobe.fullBodyUrl || wardrobe.headshotUrl || wardrobe.previewImageUrl,
      );
      await onUpdateWardrobe?.(characterId, {
        defaultWardrobe: enhanced.description,
        wardrobeAccessories: enhanced.accessories || wardrobe.accessories,
        wardrobeId: wardrobeId,
        generationPrompt: "",
        ...(hadDrawnImage ? { needsImageRegen: true } : {}),
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

      toast.success("Wardrobe description updated");
    } catch (error) {
      console.error("[Enhance Wardrobe] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to enhance wardrobe",
      );
    } finally {
      setEnhancingWardrobeId(null);
    }
  };

  /** Soften wardrobe text for Gemini Image safety; persists and returns softened fields. */
  const softenWardrobeDescription = async (
    wardrobeId: string,
  ): Promise<{ description: string; accessories: string }> => {
    const wardrobe = wardrobes.find((w) => w.id === wardrobeId);
    if (!wardrobe) {
      throw new Error("Wardrobe not found");
    }

    const response = await fetch("/api/character/soften-wardrobe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterName: character.name,
        currentWardrobeDescription: wardrobe.description,
        currentAccessories: wardrobe.accessories,
        wardrobeName: wardrobe.name,
      }),
    });

    const body = await readJsonSafe(response);

    if (!response.ok) {
      throw new Error((body.error as string) || "Failed to soften wardrobe");
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const accessories =
      typeof body.accessories === "string"
        ? body.accessories.trim()
        : wardrobe.accessories || "";

    if (!description) {
      throw new Error("Softened wardrobe description was empty");
    }

    await onUpdateWardrobe?.(characterId, {
      defaultWardrobe: description,
      wardrobeAccessories: accessories || wardrobe.accessories,
      wardrobeId,
      generationPrompt: "",
      action: "update",
    });

    if (expandedWardrobe?.id === wardrobeId) {
      setExpandedWardrobe({
        ...expandedWardrobe,
        description,
        accessories: accessories || expandedWardrobe.accessories,
        generationPrompt: undefined,
      });
    }

    return { description, accessories };
  };

  const handleSoftenWardrobe = async (wardrobeId: string) => {
    setSofteningWardrobeId(wardrobeId);
    try {
      await softenWardrobeDescription(wardrobeId);
      toast.success("Wardrobe softened for image safety");
    } catch (error) {
      console.error("[Soften Wardrobe] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to soften wardrobe",
      );
    } finally {
      setSofteningWardrobeId(null);
    }
  };

  const handleGenerateWardrobeImage = async (
    wardrobe: CharacterWardrobe,
    options?: { allowSoftenRetry?: boolean },
  ) => {
    if (!character.referenceImage?.trim()?.startsWith("http")) {
      toast.error("Generate a character identity reference image first");
      return;
    }
    if (!wardrobe.description?.trim()) {
      toast.error("Add an outfit description before generating a wardrobe image");
      return;
    }

    const allowSoftenRetry = options?.allowSoftenRetry !== false;

    setGeneratingWardrobeImageId(wardrobe.id);
    try {
      const sceneAction = [wardrobe.description, wardrobe.accessories]
        .filter(Boolean)
        .join(" ")
        .trim();
      const uploadPath = `characters/${projectId || "default"}/${characterId}/wardrobes/${wardrobe.id}/full-body-${Date.now()}.png`;
      const anchorWardrobe = resolveAnchorWardrobeForTransition(
        wardrobes,
        wardrobe,
      );

      const response = await fetch("/api/character/generate-scene-headshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          characterId,
          wardrobeId: wardrobe.id,
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
          ...(anchorWardrobe
            ? {
                baseWardrobeUrl: anchorWardrobe.baseWardrobeUrl,
                baseWardrobeDescription: anchorWardrobe.baseWardrobeDescription,
                baseWardrobeName: anchorWardrobe.baseWardrobeName,
              }
            : {}),
          forceRegenerate: !!wardrobe.fullBodyUrl,
          uploadPath,
          ...(wardrobe.generationPrompt?.trim()
            ? { promptOverride: wardrobe.generationPrompt.trim() }
            : {}),
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

      const { imageUrl, fullBodyUrl, combinedCharacterRefUrl } = body as {
        imageUrl?: string;
        fullBodyUrl?: string;
        combinedCharacterRefUrl?: string;
      };
      const resolvedUrl = fullBodyUrl || imageUrl;
      if (!resolvedUrl) {
        throw new Error("No image URL returned");
      }

      await onUpdateWardrobe?.(characterId, {
        wardrobeId: wardrobe.id,
        wardrobeName: wardrobe.name,
        defaultWardrobe: wardrobe.description,
        wardrobeAccessories: wardrobe.accessories,
        appearanceNotes: wardrobe.appearanceNotes,
        fullBodyUrl: resolvedUrl,
        ...(combinedCharacterRefUrl ? { combinedCharacterRefUrl } : {}),
        ...(wardrobe.generationPrompt?.trim()
          ? { generationPrompt: wardrobe.generationPrompt.trim() }
          : {}),
        needsImageRegen: false,
        action: "update",
      });

      if (expandedWardrobe?.id === wardrobe.id) {
        setExpandedWardrobe({
          ...expandedWardrobe,
          fullBodyUrl: resolvedUrl,
          ...(combinedCharacterRefUrl ? { combinedCharacterRefUrl } : {}),
          needsImageRegen: false,
        });
      }

      toast.success(
        wardrobe.fullBodyUrl
          ? "Full-body wardrobe reference regenerated"
          : "Full-body wardrobe reference generated",
      );
    } catch (error) {
      console.error("[Wardrobe Image] Error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate wardrobe image";

      if (allowSoftenRetry && isVertexContentPolicyError(message)) {
        toast.error("Image blocked by content policy", {
          description:
            "Soften costume wording for Gemini Image safety, then retry once.",
          duration: 15000,
          action: {
            label: "Soften & retry",
            onClick: () => {
              void (async () => {
                setSofteningWardrobeId(wardrobe.id);
                try {
                  const softened = await softenWardrobeDescription(wardrobe.id);
                  setSofteningWardrobeId(null);
                  await handleGenerateWardrobeImage(
                    {
                      ...wardrobe,
                      description: softened.description,
                      accessories: softened.accessories,
                      generationPrompt: undefined,
                    },
                    { allowSoftenRetry: false },
                  );
                } catch (retryError) {
                  console.error("[Soften & retry] Error:", retryError);
                  setSofteningWardrobeId(null);
                  toast.error(
                    retryError instanceof Error
                      ? retryError.message
                      : "Soften & retry failed",
                  );
                }
              })();
            },
          },
        });
        return;
      }

      toast.error(message);
    } finally {
      setGeneratingWardrobeImageId(null);
    }
  };

  const handleRegenerateStaleWardrobeImages = async () => {
    const targets = wardrobes
      .filter((w) => w.needsImageRegen)
      .map((w) => ({ characterId, character, wardrobe: w }));
    if (targets.length === 0) {
      toast.info("No wardrobe images marked for regeneration");
      return;
    }
    if (!onUpdateWardrobe) {
      toast.error("Wardrobe update handler unavailable");
      return;
    }
    const runId = `wardrobe-regen:${characterId}`;
    setIsRegeneratingStale(true);
    startAgentRun({
      id: runId,
      title: "Wardrobe Agent",
      subtitle: `Updating ${targets.length} wardrobe look(s) — you can keep editing`,
    });
    try {
      const { succeeded, failed } = await regenerateStaleWardrobesBatch(
        targets,
        projectId,
        onUpdateWardrobe,
        6,
      );
      if (succeeded > 0) {
        toast.success(`Regenerated ${succeeded} wardrobe image(s)`);
      }
      if (failed > 0) {
        toast.error(`${failed} wardrobe image(s) failed to regenerate`);
        finishAgentRun(runId, {
          tone: succeeded === 0 ? "error" : "warning",
          subtitle: `${failed} of ${targets.length} wardrobe image(s) failed`,
        });
      } else {
        finishAgentRun(runId, { subtitle: "Wardrobe images updated" });
      }
    } catch (error) {
      console.error("[Wardrobe Sync] Regen error:", error);
      failAgentRun(runId, "Failed to regenerate wardrobe images");
    } finally {
      setIsRegeneratingStale(false);
    }
  };

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

    const runId = `character-enhance:${characterId}`
    setIsEnhancingReference(true);
    startAgentRun({
      id: runId,
      title: 'Portrait enhance',
      subtitle: 'you can keep editing',
      itemLabel: character.name,
    });
    try {
      patchAgentRun(runId, { subtitle: 'Setting up studio lighting...', progressPct: 25 });
      const response = await fetch("/api/character/enhance-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
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

      patchAgentRun(runId, { subtitle: 'Generating enhanced portrait...', progressPct: 70 });

      if (!response.ok) {
        if (body.code === "INSUFFICIENT_CREDITS") {
          toast.error(
            `Insufficient credits. Need ${body.required as number} credits.`,
          );
          failAgentRun(runId, 'Insufficient credits');
          return;
        }
        if (body.code === "ALREADY_OPTIMIZED") {
          toast.info(
            "This image is already well-optimized. Try uploading a different source image.",
          );
          finishAgentRun(runId, {
            tone: 'warning',
            subtitle: 'Already well-optimized',
          });
          return;
        }
        throw new Error((body.error as string) || "Enhancement failed");
      }

      patchAgentRun(runId, { subtitle: 'Applying final retouching...', progressPct: 90 });
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

      finishAgentRun(runId, { subtitle: 'Portrait enhanced' });
      toast.success(
        `Enhanced to professional headshot! ${result.remainingIterations} iteration(s) remaining.`,
      );
    } catch (error) {
      console.error("[Enhance Reference] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Enhancement failed",
      );
      failAgentRun(runId, error instanceof Error ? error.message : 'Enhancement failed');
    } finally {
      setIsEnhancingReference(false);
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
        id={`character-card-${characterId}`}
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
          <ReferenceActionCue summary={stillActions} onSelect={openCastAction} />
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

  const activeLikenessMode: "none" | "character" | "upload" =
    character.likenessSourceType === "character" ||
    character.likenessSourceType === "upload" ||
    character.likenessSourceType === "none"
      ? character.likenessSourceType
      : character.likenessCharacterId ||
          character.likenessCharacterName ||
          character.secondaryLikenessCharacterId ||
          character.secondaryLikenessCharacterName
        ? "character"
        : character.likenessImageUrl || character.secondaryLikenessImageUrl
          ? "upload"
          : "none";
  const selectedLikenessDonor = castReferenceCandidates.find(
    (c) =>
      c.id === character.likenessCharacterId ||
      (Boolean(character.likenessCharacterName) &&
        c.name.trim().toLowerCase() ===
          String(character.likenessCharacterName).trim().toLowerCase()),
  );
  const secondaryLikenessDonor = castReferenceCandidates.find(
    (c) =>
      c.id === character.secondaryLikenessCharacterId ||
      (Boolean(character.secondaryLikenessCharacterName) &&
        c.name.trim().toLowerCase() ===
          String(character.secondaryLikenessCharacterName).trim().toLowerCase()),
  );
  const hasUploadedLikeness = isDisplayableImageUrl(character.likenessImageUrl);
  const hasSecondaryUploadedLikeness = isDisplayableImageUrl(
    character.secondaryLikenessImageUrl,
  );
  const activeLikenessRelationMode: "same_person" | "family_blend" =
    character.likenessMode === "family_blend" ||
    Boolean(secondaryLikenessDonor || hasSecondaryUploadedLikeness)
      ? "family_blend"
      : character.likenessMode === "same_person"
        ? "same_person"
        : !selectedLikenessDonor?.isSamePersonSibling &&
            (suggestedTraitDonors.length > 0 ||
              /\b(?:daughter|son|child|offspring|granddaughter|grandson|sister|brother|sibling|inherit(?:s|ing|ed)?)\b/i.test(
                `${likenessNoteDraft} ${character.appearanceDescription || ""} ${character.description || ""}`,
              ))
          ? "family_blend"
          : "same_person";
  const canGenerateFromReference =
    (activeLikenessMode === "character" &&
      Boolean(selectedLikenessDonor?.hasPortrait) &&
      (!secondaryLikenessDonor || Boolean(secondaryLikenessDonor.hasPortrait))) ||
    (activeLikenessMode === "upload" && hasUploadedLikeness);
  const suggestedSamePersonDonor = castReferenceCandidates.find(
    (c) => c.isSamePersonSibling,
  );
  const likenessBadgeLabel =
    activeLikenessMode === "character" && selectedLikenessDonor
      ? secondaryLikenessDonor
        ? `Family Blend: ${selectedLikenessDonor.name} + ${secondaryLikenessDonor.name}`
        : activeLikenessRelationMode === "family_blend"
          ? `Family Trait: ${selectedLikenessDonor.name}`
          : `Likeness: ${selectedLikenessDonor.name}`
      : activeLikenessMode === "upload" && hasUploadedLikeness
        ? hasSecondaryUploadedLikeness
          ? "Family Blend: 2 Photos"
          : activeLikenessRelationMode === "family_blend"
            ? "Family Trait: Photo"
            : "Likeness: Uploaded Photo"
        : null;

  const flushLikenessNoteIfDirty = async (): Promise<string> => {
    const trimmed = likenessNoteDraft.trim();
    if (
      onUpdateCharacterAttributes &&
      trimmed !== (character.likenessTransformNote || "")
    ) {
      await onUpdateCharacterAttributes(
        characterId,
        { likenessTransformNote: trimmed },
        { quiet: true },
      );
    }
    return trimmed;
  };

  const identityImageSection = (
    <div
      className={`relative bg-gray-100 dark:bg-gray-800 group rounded-md overflow-hidden ${
        splitLayout ? "h-full w-full" : "aspect-[9/16]"
      }`}
    >
      {likenessBadgeLabel && (
        <div className="absolute top-2 left-2 z-20 max-w-[85%] pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/85 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-medium text-cyan-200 shadow-sm truncate">
            <ImagePlus className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
            <span className="truncate">{likenessBadgeLabel}</span>
          </span>
        </div>
      )}
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
        <div className="w-full h-full flex flex-col items-center justify-center px-3 text-center">
          <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {likenessBadgeLabel
              ? `Ready to generate from ${selectedLikenessDonor?.name || "reference photo"}`
              : "No reference image"}
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
          onClick={async (e) => {
            e.stopPropagation();
            if (isGenerating) return;
            const trimmed = await flushLikenessNoteIfDirty();
            onGenerate(
              activeLikenessMode !== "none"
                ? { likenessTransformNote: trimmed }
                : undefined,
            );
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

        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            if (isGenerating) return;
            await flushLikenessNoteIfDirty();
            setDirectorTarget({ kind: "cast" });
          }}
          disabled={isGenerating}
          className="p-3 bg-teal-600/90 hover:bg-teal-500 rounded-full transition-colors disabled:opacity-50"
          title="Director"
        >
          <Clapperboard className="w-5 h-5 text-white" />
        </button>

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
        {character.referenceImage && !imageError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void saveImageFile({
                url: character.referenceImage!,
                label: `cast-${character.name}`,
              })
                .then((saved) => {
                  if (saved) toast.success("Character image saved");
                })
                .catch(() => toast.error("Failed to download character image"));
            }}
            className="p-3 bg-sky-600/80 hover:bg-sky-600 rounded-full transition-colors"
            title="Download Image"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        )}
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
      id={`character-card-${characterId}`}
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
                      <div className="flex flex-wrap items-center gap-1.5">
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
                        {extractSamePersonAgeStage(character.name || "").isAgeVariant && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 rounded-full font-medium"
                            title="Dedicated life-stage character card — locks base portrait for this specific age/era"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            Life Stage
                          </span>
                        )}
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
                    <div className="flex items-center gap-1 shrink-0">
                      {onCreateAgeVariant && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateAgeVariant();
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors"
                          title="Create separate character cards for different ages/eras (e.g. Age 16, Age 32, Age 62) instead of wardrobes"
                        >
                          <Clock className="w-3 h-3" />
                          <span>+ Age</span>
                        </button>
                      )}
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
                    </div>
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
                  {character.role &&
                    (isShortCharacterRole(character.role) ? (
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
                    ) : (
                      <ExpandableText
                        text={character.role}
                        lines={2}
                        className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onTextClick={(e) => {
                          e.stopPropagation();
                          if (onUpdateCharacterRole) {
                            setEditingRole(true);
                          }
                        }}
                      />
                    ))}
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
              {Array.isArray(character.familyRelationships) &&
                character.familyRelationships.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {character.familyRelationships.map((rel: any, rIdx: number) => (
                      <span
                        key={`${rel.relatedCharacterName}-${rIdx}`}
                        className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                      >
                        {rel.label ||
                          `${String(rel.relation || "").replace(/_/g, " ")} ${rel.relatedCharacterName}`}
                      </span>
                    ))}
                  </div>
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
        <ExpandableText
          text={character.description}
          lines={2}
          className="text-sm text-gray-600 dark:text-gray-400"
        />

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
                className={cn(
                  "text-xs gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900",
                  identityAction &&
                    "text-amber-800 dark:text-amber-100 bg-amber-400/30 data-[state=active]:bg-amber-400/40 data-[state=active]:text-amber-950 dark:data-[state=active]:text-amber-50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Identity
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
                className={cn(
                  "text-xs gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900",
                  wardrobeActions.items.length > 0 &&
                    "text-amber-800 dark:text-amber-100 bg-amber-400/30 data-[state=active]:bg-amber-400/40 data-[state=active]:text-amber-950 dark:data-[state=active]:text-amber-50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Shirt className="w-3.5 h-3.5" />
                Wardrobe
                {wardrobes.length > 0 ? (
                  <span className="text-[10px] opacity-70 tabular-nums">
                    ({wardrobes.length})
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
            {stillStatusLine ? (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-200">
                {stillStatusLine}
              </p>
            ) : null}

            <TabsContent
              value="identity"
              className="mt-3 focus-visible:ring-0 space-y-3"
            >
                {!splitLayout && identityImageSection}

                {onUpdateCharacterAttributes && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                        <ImagePlus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        Reference Likeness
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium truncate max-w-[165px] ${
                          activeLikenessMode !== "none"
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/35"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {activeLikenessMode === "character" && selectedLikenessDonor
                          ? secondaryLikenessDonor
                            ? `Blend · ${selectedLikenessDonor.name} + ${secondaryLikenessDonor.name}`
                            : `Active · ${selectedLikenessDonor.name}`
                          : activeLikenessMode === "upload" && hasUploadedLikeness
                            ? hasSecondaryUploadedLikeness
                              ? "Blend · 2 Photos"
                              : "Active · Photo"
                            : activeLikenessMode !== "none"
                              ? "Select Source"
                              : "Optional"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                      Create a younger/older version of the same person, or blend inherited traits from 1–2 parents/relatives (e.g. father&apos;s eyes + mother&apos;s cheekbones).
                    </p>

                    {activeLikenessMode === "none" && suggestedSamePersonDonor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const parsedSelf = extractSamePersonAgeStage(
                            String(character.name || ""),
                          );
                          const targetAgeStr =
                            parsedSelf.numericAge || character.age || "";
                          const starterNote =
                            likenessNoteDraft.trim() ||
                            (targetAgeStr
                              ? `${targetAgeStr}-year-old version of ${suggestedSamePersonDonor.name}`
                              : `Transformed version of ${suggestedSamePersonDonor.name}`);
                          setLikenessNoteDraft(starterNote);
                          void onUpdateCharacterAttributes(
                            characterId,
                            {
                              likenessSourceType: "character",
                              likenessMode: "same_person",
                              likenessCharacterId: suggestedSamePersonDonor.id,
                              likenessCharacterName: suggestedSamePersonDonor.name,
                              likenessTransformNote: starterNote,
                            },
                            { quiet: true },
                          );
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-[11px] bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 transition-colors"
                      >
                        <span className="truncate">
                          Link facial likeness from{" "}
                          <strong>{suggestedSamePersonDonor.name}</strong>
                        </span>
                        <span className="text-[10px] text-cyan-400 shrink-0 font-medium">
                          Link →
                        </span>
                      </button>
                    )}

                    {activeLikenessMode === "none" &&
                      !suggestedSamePersonDonor &&
                      suggestedTraitDonors.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const primary = suggestedTraitDonors[0]!;
                            const secondary = suggestedTraitDonors[1];
                            const starterNote =
                              likenessNoteDraft.trim() ||
                              String(
                                character.appearanceDescription ||
                                  character.description ||
                                  "",
                              ).trim();
                            if (starterNote) {
                              setLikenessNoteDraft(starterNote);
                            }
                            void onUpdateCharacterAttributes(
                              characterId,
                              {
                                likenessSourceType: "character",
                                likenessMode: "family_blend",
                                likenessCharacterId: primary.characterId,
                                likenessCharacterName: primary.characterName,
                                secondaryLikenessCharacterId:
                                  secondary?.characterId || "",
                                secondaryLikenessCharacterName:
                                  secondary?.characterName || "",
                                ...(starterNote
                                  ? { likenessTransformNote: starterNote }
                                  : {}),
                              },
                              { quiet: true },
                            );
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left text-[11px] bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 transition-colors"
                        >
                          <span className="truncate">
                            Link inherited family traits from{" "}
                            <strong>
                              {suggestedTraitDonors
                                .slice(0, 2)
                                .map((d) => d.characterName)
                                .join(" + ")}
                            </strong>
                          </span>
                          <span className="text-[10px] text-cyan-400 shrink-0 font-medium">
                            Link →
                          </span>
                        </button>
                      )}

                    <div className="space-y-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            { key: "none", label: "None" },
                            { key: "character", label: "Cast Character" },
                            { key: "upload", label: "Upload Photo" },
                          ] as const
                        ).map((opt) => {
                          const isActive = activeLikenessMode === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const patch: Record<string, any> = {
                                  likenessSourceType: opt.key,
                                };
                                if (
                                  opt.key === "character" &&
                                  !character.likenessCharacterId
                                ) {
                                  if (suggestedTraitDonors[0]) {
                                    patch.likenessMode = "family_blend";
                                    patch.likenessCharacterId =
                                      suggestedTraitDonors[0].characterId;
                                    patch.likenessCharacterName =
                                      suggestedTraitDonors[0].characterName;
                                    if (suggestedTraitDonors[1]) {
                                      patch.secondaryLikenessCharacterId =
                                        suggestedTraitDonors[1].characterId;
                                      patch.secondaryLikenessCharacterName =
                                        suggestedTraitDonors[1].characterName;
                                    }
                                  } else if (castReferenceCandidates[0]) {
                                    patch.likenessCharacterId =
                                      castReferenceCandidates[0].id;
                                    patch.likenessCharacterName =
                                      castReferenceCandidates[0].name;
                                  }
                                }
                                void onUpdateCharacterAttributes(
                                  characterId,
                                  patch,
                                  { quiet: true },
                                );
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
                                isActive
                                  ? "bg-cyan-600/25 text-cyan-200 border-cyan-500/50"
                                  : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-500"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {activeLikenessMode !== "none" && (
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              {
                                key: "same_person",
                                label: "Same Person (Age / Era)",
                              },
                              {
                                key: "family_blend",
                                label: "Family / Parent Blend",
                              },
                            ] as const
                          ).map((relOpt) => {
                            const isRelActive =
                              activeLikenessRelationMode === relOpt.key;
                            return (
                              <button
                                key={relOpt.key}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const patch: Record<string, any> = {
                                    likenessMode: relOpt.key,
                                  };
                                  if (relOpt.key === "same_person") {
                                    patch.secondaryLikenessCharacterId = "";
                                    patch.secondaryLikenessCharacterName = "";
                                    patch.secondaryLikenessImageUrl = "";
                                  }
                                  void onUpdateCharacterAttributes(
                                    characterId,
                                    patch,
                                    { quiet: true },
                                  );
                                }}
                                className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
                                  isRelActive
                                    ? "bg-indigo-500/25 text-indigo-200 border-indigo-400/50"
                                    : "bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-500"
                                }`}
                              >
                                {relOpt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {activeLikenessMode === "character" && (
                        <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/50 p-2">
                          {castReferenceCandidates.length === 0 ? (
                            <p className="text-[11px] text-amber-400">
                              No other cast characters exist yet. Add a base character card or switch to Upload Photo.
                            </p>
                          ) : (
                            <>
                              <div>
                                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                  {activeLikenessRelationMode === "family_blend"
                                    ? "Parent / Relative Donor [1]"
                                    : "Base Character Reference [1]"}
                                </label>
                                <select
                                  value={
                                    selectedLikenessDonor?.id ||
                                    character.likenessCharacterId ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const nextId = e.target.value;
                                    const nextCand = castReferenceCandidates.find(
                                      (cand) => cand.id === nextId,
                                    );
                                    void onUpdateCharacterAttributes(
                                      characterId,
                                      {
                                        likenessSourceType: nextId
                                          ? "character"
                                          : secondaryLikenessDonor
                                            ? "character"
                                            : "none",
                                        likenessCharacterId: nextId || "",
                                        likenessCharacterName:
                                          nextCand?.name || "",
                                      },
                                      { quiet: true },
                                    );
                                  }}
                                  className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">Select cast character…</option>
                                  {castReferenceCandidates.map((cand) => (
                                    <option key={cand.id} value={cand.id}>
                                      {cand.name}
                                      {cand.isSamePersonSibling
                                        ? " (Same person)"
                                        : ""}
                                      {!cand.hasPortrait
                                        ? " — needs portrait"
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {activeLikenessRelationMode === "family_blend" ? (
                                <div>
                                  <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                    Second Parent / Relative Donor [2] (Optional)
                                  </label>
                                  <select
                                    value={
                                      secondaryLikenessDonor?.id ||
                                      character.secondaryLikenessCharacterId ||
                                      ""
                                    }
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      const nextId = e.target.value;
                                      const nextCand =
                                        castReferenceCandidates.find(
                                          (cand) => cand.id === nextId,
                                        );
                                      void onUpdateCharacterAttributes(
                                        characterId,
                                        {
                                          likenessMode: "family_blend",
                                          secondaryLikenessCharacterId:
                                            nextId || "",
                                          secondaryLikenessCharacterName:
                                            nextCand?.name || "",
                                        },
                                        { quiet: true },
                                      );
                                    }}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  >
                                    <option value="">
                                      None (single parent / relative)…
                                    </option>
                                    {castReferenceCandidates
                                      .filter(
                                        (cand) =>
                                          cand.id !== selectedLikenessDonor?.id,
                                      )
                                      .map((cand) => (
                                        <option key={cand.id} value={cand.id}>
                                          {cand.name}
                                          {!cand.hasPortrait
                                            ? " — needs portrait"
                                            : ""}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              ) : (
                                castReferenceCandidates.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void onUpdateCharacterAttributes(
                                        characterId,
                                        { likenessMode: "family_blend" },
                                        { quiet: true },
                                      );
                                    }}
                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                                  >
                                    + Blend 2nd parent / relative character
                                  </button>
                                )
                              )}

                              {selectedLikenessDonor ? (
                                selectedLikenessDonor.hasPortrait &&
                                (!secondaryLikenessDonor ||
                                  secondaryLikenessDonor.hasPortrait) ? (
                                  <div className="flex items-center gap-2 pt-1">
                                    <div className="flex items-center -space-x-1.5 flex-shrink-0">
                                      {selectedLikenessDonor.imageUrl && (
                                        <img
                                          src={selectedLikenessDonor.imageUrl}
                                          alt={selectedLikenessDonor.name}
                                          className="w-8 h-8 rounded object-cover border border-cyan-500/40"
                                        />
                                      )}
                                      {secondaryLikenessDonor?.imageUrl && (
                                        <img
                                          src={secondaryLikenessDonor.imageUrl}
                                          alt={secondaryLikenessDonor.name}
                                          className="w-8 h-8 rounded object-cover border border-indigo-400/50"
                                        />
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 leading-tight">
                                      {activeLikenessRelationMode ===
                                      "family_blend" ? (
                                        <>
                                          Blends inherited traits from{" "}
                                          <strong className="text-gray-200">
                                            {selectedLikenessDonor.name}
                                            {secondaryLikenessDonor
                                              ? ` + ${secondaryLikenessDonor.name}`
                                              : ""}
                                          </strong>{" "}
                                          into a distinct person.
                                        </>
                                      ) : (
                                        <>
                                          Anchors bone structure &amp; eyes to{" "}
                                          <strong className="text-gray-200">
                                            {selectedLikenessDonor.name}
                                          </strong>{" "}
                                          as an independent character slot.
                                        </>
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-amber-400 leading-snug pt-0.5">
                                    Generate or upload{" "}
                                    <strong>
                                      {!selectedLikenessDonor.hasPortrait
                                        ? selectedLikenessDonor.name
                                        : secondaryLikenessDonor?.name}
                                    </strong>
                                    &apos;s portrait first, or run{" "}
                                    <strong>Cast Agent</strong> to generate
                                    donors first.
                                  </p>
                                )
                              ) : null}
                            </>
                          )}
                        </div>
                      )}

                      {activeLikenessMode === "upload" && (
                        <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-900/50 p-2">
                          <input
                            ref={likenessFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              setIsUploadingLikenessRef(true);
                              try {
                                const ext =
                                  file.name.split(".").pop()?.toLowerCase() ||
                                  "jpg";
                                const blob = await upload(
                                  `characters/likeness-${characterId}-${Date.now()}.${ext}`,
                                  file,
                                  {
                                    access: "public",
                                    handleUploadUrl:
                                      "/api/character/upload-url",
                                  },
                                );
                                await onUpdateCharacterAttributes(
                                  characterId,
                                  {
                                    likenessSourceType: "upload",
                                    likenessImageUrl: blob.url,
                                  },
                                  { quiet: true },
                                );
                                toast.success(
                                  "Reference photo uploaded — add a transform note and click Generate Portrait from Reference",
                                );
                              } catch (err) {
                                console.error(
                                  "[Likeness Upload] Failed:",
                                  err,
                                );
                                toast.error(
                                  "Failed to upload reference photo",
                                );
                              } finally {
                                setIsUploadingLikenessRef(false);
                              }
                            }}
                          />
                          <input
                            ref={secondaryLikenessFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              setIsUploadingSecondaryLikenessRef(true);
                              try {
                                const ext =
                                  file.name.split(".").pop()?.toLowerCase() ||
                                  "jpg";
                                const blob = await upload(
                                  `characters/likeness2-${characterId}-${Date.now()}.${ext}`,
                                  file,
                                  {
                                    access: "public",
                                    handleUploadUrl:
                                      "/api/character/upload-url",
                                  },
                                );
                                await onUpdateCharacterAttributes(
                                  characterId,
                                  {
                                    likenessSourceType: "upload",
                                    likenessMode: "family_blend",
                                    secondaryLikenessImageUrl: blob.url,
                                  },
                                  { quiet: true },
                                );
                                toast.success("Second parent/relative photo uploaded");
                              } catch (err) {
                                console.error(
                                  "[Secondary Likeness Upload] Failed:",
                                  err,
                                );
                                toast.error(
                                  "Failed to upload second reference photo",
                                );
                              } finally {
                                setIsUploadingSecondaryLikenessRef(false);
                              }
                            }}
                          />
                          {hasUploadedLikeness ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={character.likenessImageUrl}
                                  alt="Likeness reference 1"
                                  className="w-10 h-10 rounded object-cover border border-cyan-500/30 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-gray-300 leading-tight">
                                    {activeLikenessRelationMode === "family_blend"
                                      ? "Donor photo [1] ready"
                                      : "Donor photo ready — generates a transformed portrait"}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <button
                                      type="button"
                                      disabled={isUploadingLikenessRef}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        likenessFileInputRef.current?.click();
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700"
                                    >
                                      {isUploadingLikenessRef
                                        ? "Uploading…"
                                        : "Replace"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void onUpdateCharacterAttributes(
                                          characterId,
                                          {
                                            likenessImageUrl: "",
                                            secondaryLikenessImageUrl: "",
                                            likenessSourceType: "none",
                                          },
                                          { quiet: true },
                                        );
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] text-gray-400 hover:text-red-400"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {activeLikenessRelationMode === "family_blend" ? (
                                hasSecondaryUploadedLikeness ? (
                                  <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                                    <img
                                      src={character.secondaryLikenessImageUrl}
                                      alt="Likeness reference 2"
                                      className="w-10 h-10 rounded object-cover border border-indigo-400/40 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-gray-300 leading-tight">
                                        Donor photo [2] ready
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <button
                                          type="button"
                                          disabled={
                                            isUploadingSecondaryLikenessRef
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            secondaryLikenessFileInputRef.current?.click();
                                          }}
                                          className="px-2 py-0.5 rounded text-[10px] bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700"
                                        >
                                          {isUploadingSecondaryLikenessRef
                                            ? "Uploading…"
                                            : "Replace"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void onUpdateCharacterAttributes(
                                              characterId,
                                              {
                                                secondaryLikenessImageUrl: "",
                                              },
                                              { quiet: true },
                                            );
                                          }}
                                          className="px-2 py-0.5 rounded text-[10px] text-gray-400 hover:text-red-400"
                                        >
                                          Remove [2]
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isUploadingSecondaryLikenessRef}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      secondaryLikenessFileInputRef.current?.click();
                                    }}
                                    className="w-full h-7 text-xs"
                                  >
                                    {isUploadingSecondaryLikenessRef ? (
                                      <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    Upload 2nd Parent / Relative Photo [2]
                                  </Button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void onUpdateCharacterAttributes(
                                      characterId,
                                      { likenessMode: "family_blend" },
                                      { quiet: true },
                                    );
                                  }}
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                                >
                                  + Blend 2nd parent / relative photo
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploadingLikenessRef}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  likenessFileInputRef.current?.click();
                                }}
                                className="w-full h-7 text-xs"
                              >
                                {isUploadingLikenessRef ? (
                                  <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {isUploadingLikenessRef
                                  ? "Uploading Reference Photo…"
                                  : "Upload Your Photo / Reference [1]"}
                              </Button>
                              <p className="text-[10px] text-gray-500 leading-tight">
                                Uses uploaded photo(s) strictly for genetic facial traits without overwriting this character with the raw upload.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeLikenessMode !== "none" && (
                        <div
                          className="space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="block text-[10px] font-medium text-gray-300">
                            {activeLikenessRelationMode === "family_blend"
                              ? "Inherited Traits & Look (Parents, Age, Hair & Outfit)"
                              : "Transform Note (Age, Era, Hair, Expression & Outfit)"}
                          </label>
                          <DictationTextarea
                            value={likenessNoteDraft}
                            onChange={setLikenessNoteDraft}
                            onBlur={() => {
                              void flushLikenessNoteIfDirty();
                            }}
                            rows={3}
                            placeholder={
                              activeLikenessRelationMode === "family_blend"
                                ? "e.g., Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones, chestnut shoulder-length hair, sage knit sweater"
                                : "e.g., 26-year-old 1974 version with thick tousled chestnut-brown hair, clean-shaven jawline, identical hazel-green eyes and warm smile, vintage cream cable-knit sweater under tan corduroy jacket"
                            }
                            className="text-xs min-h-[68px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              isGenerating || !canGenerateFromReference
                            }
                            onClick={async (e) => {
                              e.stopPropagation();
                              const trimmed = await flushLikenessNoteIfDirty();
                              onGenerate({ likenessTransformNote: trimmed });
                            }}
                            className="w-full h-8 text-xs font-medium border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                          >
                            {isGenerating ? (
                              <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {isGenerating
                              ? "Generating Portrait…"
                              : activeLikenessRelationMode === "family_blend"
                                ? "Generate Blended Family Portrait"
                                : "Generate Portrait from Reference"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                      <User className="w-3.5 h-3.5" />
                      Gender
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        character.genderSource === "user"
                          ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                      }`}
                      title={
                        character.genderSource === "user"
                          ? "You set this gender — used for frame and video generation"
                          : "Auto-detected from script, reference image, or description"
                      }
                    >
                      {character.genderSource === "user" ? "Set by you" : "Auto"}
                    </span>
                  </div>
                  {onUpdateCharacterAttributes ? (
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          "male",
                          "female",
                          "non-binary",
                          "unspecified",
                        ] as CharacterGender[]
                      ).map((value) => {
                        const active =
                          (normalizeCharacterGender(character.gender) ||
                            resolvedGender.gender ||
                            "unspecified") === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenderChange(value);
                            }}
                            className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                              active
                                ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                                : "border-gray-600/50 bg-gray-800/40 text-gray-300 hover:border-gray-500"
                            }`}
                          >
                            {formatGenderLabel(value)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      {formatGenderLabel(
                        normalizeCharacterGender(character.gender) ||
                          resolvedGender.gender
                      )}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500">
                    Controls how this character is depicted in generated frames and video.
                  </p>
                </div>

                {/* Standing Height - proportional scale anchor */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Standing Height (Scale)
                    </span>
                    {onUpdateCharacterAttributes ? (
                      <input
                        type="text"
                        value={heightText}
                        onChange={(e) => setHeightText(e.target.value)}
                        onBlur={() => {
                          const next = heightText.trim();
                          if (next !== (character.height || "")) {
                            onUpdateCharacterAttributes(characterId, {
                              height: next || undefined,
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder='e.g. 6-foot tall, 5&apos;8"'
                        className="w-40 px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">
                        {character.height || "Not set"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Locks character-to-set proportions (e.g. 6-foot tall vs 11-foot ceiling).
                  </p>
                </div>

                {/* Body Description - director prompt for image-generation identity */}
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
                          setBodyDirectorText("");
                          setEditingBodyDescription(true);
                        }}
                        className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                        title="Direct body description"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {editingBodyDescription ? (
                    <div
                      className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        Direct body
                      </div>
                      {character.appearanceDescription?.trim() ? (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          Current — {character.appearanceDescription.trim()}
                        </p>
                      ) : null}
                      <DictationTextarea
                        value={bodyDirectorText}
                        onChange={setBodyDirectorText}
                        placeholder={
                          character.appearanceDescription?.trim()
                            ? "Say the change, e.g. Taller, keep the cheekbones, late 40s"
                            : "Describe the body, or leave empty and Recommend from the screenplay"
                        }
                        rows={3}
                        disabled={isGeneratingBody}
                        className="text-xs border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleGenerateBody(false);
                          }}
                          disabled={isGeneratingBody || !bodyDirectorText.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingBody ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Apply
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleGenerateBody(true);
                          }}
                          disabled={isGeneratingBody}
                          className="px-2 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                          title="Recommend a body from the character and screenplay"
                        >
                          Recommend
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBodyDescription(false);
                            setBodyDirectorText("");
                          }}
                          disabled={isGeneratingBody}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                      {character.appearanceDescription ||
                        "Direct a body description, or Recommend from the screenplay"}
                    </p>
                  )}
                </div>
            </TabsContent>

            <TabsContent
              value="voice"
              className="mt-3 focus-visible:ring-0 space-y-3"
            >
              {character.voiceConfig?.voiceId ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  SceneFlow voice
                  {character.voiceDescription || character.voiceConfig.prompt ? (
                    <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                      · Voice profile
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Create a voice profile so dialogue uses a SceneFlow voice.
                </p>
              )}
              {!hasCharacterReferenceForVoice && !hasNarrativeForVoice ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Add a character description or reference image for Generate.
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
                  {!editingCastingBrief && onUpdateCharacterAttributes && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCastingDirectorText("");
                        setEditingCastingBrief(true);
                      }}
                      className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                      title="Revise casting brief"
                    >
                      <Sparkles className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingCastingBrief ? (
                  <div
                    className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {character.voiceDescription?.trim() ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Current — {character.voiceDescription.trim()}
                      </p>
                    ) : null}
                    <DictationTextarea
                      value={castingDirectorText}
                      onChange={setCastingDirectorText}
                      placeholder={
                        character.voiceDescription?.trim()
                          ? "Say the change, e.g. Older, drier, keep the quiet authority"
                          : "Describe the voice, or leave empty and Recommend from appearance and role"
                      }
                      rows={3}
                      disabled={isGeneratingCasting}
                      className="text-xs border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGenerateCasting(false);
                        }}
                        disabled={isGeneratingCasting || !castingDirectorText.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingCasting ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Apply
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGenerateCasting(true);
                        }}
                        disabled={isGeneratingCasting}
                        className="px-2 py-1.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                        title="Recommend a casting brief from appearance and role"
                      >
                        Recommend
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCastingBrief(false);
                          setCastingDirectorText("");
                        }}
                        disabled={isGeneratingCasting}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <ExpandableText
                    text={character.voiceDescription}
                    lines={3}
                    className="text-xs text-gray-500 dark:text-gray-500 italic"
                    empty="Add a casting brief, or Recommend from appearance and role"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAutoVoiceClick();
                  }}
                  disabled={
                    isAutoSelectingVoice ||
                    (!hasCharacterReferenceForVoice && !hasNarrativeForVoice)
                  }
                  className="w-full flex items-center justify-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md transition-colors bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-60"
                  title={
                    hasCharacterReferenceForVoice || hasNarrativeForVoice
                      ? "Generate a voice from the character and casting brief"
                      : "Add character description or reference image first"
                  }
                >
                  {isAutoSelectingVoice ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Generate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAssignedVoice();
                  }}
                  disabled={!character.voiceConfig?.voiceId}
                  className="w-full flex items-center justify-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md transition-colors bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    character.voiceConfig?.voiceId
                      ? isPlayingVoice
                        ? "Stop voice preview"
                        : "Play assigned voice preview"
                      : "Assign a voice first"
                  }
                >
                  {isPlayingVoice ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Play
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
                <div className="rounded-md border border-cyan-500/25 bg-cyan-500/5 px-2.5 py-2 flex items-start justify-between gap-2">
                  <p className="text-[10px] text-cyan-700 dark:text-cyan-300/90 leading-relaxed">
                    <span className="font-semibold">Multi-age continuity:</span> Wardrobes keep this same base face &amp; age. For different decades/ages (e.g. Age 16, 32, 62), create separate Age Variant characters.
                  </p>
                  {onCreateAgeVariant && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAgeVariant();
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-700 dark:text-cyan-200"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      + Age Variant
                    </button>
                  )}
                </div>
                {/* Primary CTA: Update wardrobes from script */}
                {scenes &&
                  scenes.length > 0 &&
                  wardrobes.length === 0 &&
                  !isAnalyzingScript &&
                  !wardrobeSyncDiff &&
                  wardrobeSuggestions.length === 0 && (
                    <div className="text-center py-3">
                      <p className="text-xs text-gray-400 mb-2">
                        Scan the script to create outfits and looks for{" "}
                        {character.name} across scenes.
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateWardrobesFromScript();
                        }}
                        disabled={isAnalyzingScript}
                        className="w-full flex items-center justify-center gap-2 h-7 px-3 text-xs font-medium rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Update wardrobes from script for each scene"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Update</span>
                        <span className="text-[10px] opacity-75">
                          ({scenes.length} scenes)
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddWardrobeForm(true);
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-500/10"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Direct wardrobe
                      </button>
                    </div>
                  )}

                {/* Analyzing indicator */}
                {isAnalyzingScript && (
                  <div className="flex items-center justify-center gap-2 py-4 text-amber-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs">
                      Syncing looks from {scenes?.length || 0} scenes...
                    </span>
                  </div>
                )}

                {/* Sync diff preview */}
                {wardrobeSyncDiff && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Script sync preview
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWardrobeSyncDiff(null);
                        }}
                        className="text-[10px] text-gray-500 hover:text-gray-700"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        {wardrobeSyncDiff.updates.length} update
                        {wardrobeSyncDiff.updates.length === 1 ? "" : "s"}
                        {" · "}
                        {wardrobeSyncDiff.creates.length} new
                        {" · "}
                        {wardrobeSyncDiff.obsolete.length} unassigned
                      </p>
                      {wardrobeSyncDiff.updates.slice(0, 4).map((u) => (
                        <p key={u.wardrobeId} className="truncate">
                          Update: {(u.patch.name as string) || u.wardrobeId}
                          {u.imageStale ? " (image stale)" : ""}
                        </p>
                      ))}
                      {wardrobeSyncDiff.creates.slice(0, 4).map((c) => (
                        <p key={c.name} className="truncate">
                          New: {c.name}
                          {c.sceneNumbers?.length
                            ? ` · scenes ${formatSceneRange(c.sceneNumbers)}`
                            : ""}
                        </p>
                      ))}
                      {wardrobeSyncDiff.obsolete.slice(0, 3).map((o) => (
                        <p key={o.wardrobeId} className="truncate text-gray-500">
                          Unassign: {o.name}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleApplyWardrobeSync();
                      }}
                      disabled={isApplyingSync}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      {isApplyingSync ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Apply sync
                    </button>
                  </div>
                )}

                {wardrobes.length === 0 &&
                  !showAddWardrobeForm &&
                  !showAiAssist &&
                  !isAnalyzingScript && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddWardrobeForm(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 h-7 px-3 text-xs font-medium rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Direct wardrobe
                    </button>
                  )}

                {wardrobes.some((w) => w.needsImageRegen) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRegenerateStaleWardrobeImages();
                    }}
                    disabled={isRegeneratingStale}
                    className="w-full flex items-center justify-center gap-2 h-7 px-3 text-xs font-medium rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isRegeneratingStale ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Regenerate{" "}
                    {wardrobes.filter((w) => w.needsImageRegen).length} changed
                    wardrobe image
                    {wardrobes.filter((w) => w.needsImageRegen).length === 1
                      ? ""
                      : "s"}
                  </button>
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

                {(showAiAssist || showAddWardrobeForm) &&
                  !editingWardrobeId &&
                  renderWardrobeDirectorForm("add")}

                {/* Wardrobe cards with optional waist-up reference preview */}
                {wardrobes.length > 0 && (
                  <div className="space-y-3">
                    {wardrobes.map((w) => {
                      const wardrobeAction = stillActions.items.find((item) => item.id === w.id)
                      return (
                      <div
                        key={w.id}
                        id={`wardrobe-still-${w.id}`}
                        className={`rounded-lg border overflow-hidden transition-colors bg-gray-50/50 dark:bg-gray-800/10 border-gray-200 dark:border-gray-700/50 ${
                          focusedWardrobeId === w.id ? "ring-2 ring-amber-400/80" : ""
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
                                  {wardrobeAction && (
                                    <ReferenceActionCue
                                      summary={{
                                        tone: wardrobeAction.action === "changed" ? "attention" : "action",
                                        items: [wardrobeAction],
                                        primary: wardrobeAction,
                                      }}
                                      onSelect={() => handleGenerateWardrobeImage(w)}
                                    />
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
                                        className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-50"
                                        title={
                                          !hasCharacterReferenceForVoice
                                            ? "Generate character identity reference first"
                                            : (w.fullBodyUrl || w.headshotUrl)
                                              ? "Quick Regenerate Wardrobe"
                                              : "Quick Generate Wardrobe"
                                        }
                                      >
                                        {generatingWardrobeImageId === w.id ? (
                                          <Loader className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Zap className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDirectorTarget({
                                            kind: "wardrobe",
                                            wardrobeId: w.id,
                                          });
                                        }}
                                        disabled={generatingWardrobeImageId === w.id}
                                        className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-50"
                                        title="Director"
                                      >
                                        <Clapperboard className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingWardrobe(w);
                                        }}
                                        className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
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
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                                          title="Delete wardrobe"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {(w.fullBodyUrl || w.headshotUrl) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const url = (w.fullBodyUrl || w.headshotUrl)!;
                                            void saveImageFile({
                                              url,
                                              label: `wardrobe-${character.name}-${w.name}`,
                                            })
                                              .then((saved) => {
                                                if (saved) toast.success("Wardrobe image saved");
                                              })
                                              .catch(() => toast.error("Failed to download wardrobe image"));
                                          }}
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                                          title="Download wardrobe image"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedWardrobe(w);
                                        }}
                                        className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                                        title="Expand details"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {editingWardrobeId === w.id ? (
                                renderWardrobeDirectorForm("edit")
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
                                  {wardrobeAction && (
                                    <ReferenceActionCue
                                      summary={{
                                        tone: wardrobeAction.action === "changed" ? "attention" : "action",
                                        items: [wardrobeAction],
                                        primary: wardrobeAction,
                                      }}
                                      onSelect={() => handleGenerateWardrobeImage(w)}
                                    />
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
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-50"
                                          title={
                                            !hasCharacterReferenceForVoice
                                              ? "Generate character identity reference first"
                                              : (w.fullBodyUrl || w.headshotUrl)
                                                ? "Quick Regenerate Wardrobe"
                                                : "Quick Generate Wardrobe"
                                          }
                                        >
                                          {generatingWardrobeImageId === w.id ? (
                                            <Loader className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Zap className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDirectorTarget({
                                              kind: "wardrobe",
                                              wardrobeId: w.id,
                                            });
                                          }}
                                          disabled={generatingWardrobeImageId === w.id}
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-50"
                                          title="Director"
                                        >
                                          <Clapperboard className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditingWardrobe(w);
                                          }}
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
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
                                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                                            title="Delete wardrobe"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {(w.fullBodyUrl || w.headshotUrl) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const url = (w.fullBodyUrl || w.headshotUrl)!;
                                              void saveImageFile({
                                                url,
                                                label: `wardrobe-${character.name}-${w.name}`,
                                              })
                                                .then((saved) => {
                                                  if (saved) toast.success("Wardrobe image saved");
                                                })
                                                .catch(() => toast.error("Failed to download wardrobe image"));
                                            }}
                                            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                                            title="Download wardrobe image"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedWardrobe(w);
                                          }}
                                          className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
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
                                <div className="mt-1">
                                  {renderWardrobeDirectorForm("edit")}
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
                      )
                    })}
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
                profile. Pick one so Generate can assign an appropriate voice.
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
                <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-transparent">
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
                <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500/50">
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

            {expandedWardrobe &&
              editingWardrobeId === expandedWardrobe.id && (
                <div className="mb-3">
                  {renderWardrobeDirectorForm("edit")}
                </div>
              )}

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
                              Use Director to refine the visual prompt or Edit to
                              update the outfit description and scene appearance notes.
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDirectorTarget({
                                kind: "wardrobe",
                                wardrobeId: expandedWardrobe.id,
                              });
                            }}
                            className="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-teal-500/40 text-teal-300 hover:bg-teal-500/10"
                          >
                            <Clapperboard className="w-3 h-3" /> Director
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingWardrobe(expandedWardrobe);
                            }}
                            className="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                          >
                            <Edit className="w-3 h-3" /> Edit
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
                          Makeup, hair, and injury details from script analysis — baked into the full-body wardrobe reference.
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
                    Wardrobe Reference
                  </h4>
                  <div className="relative min-h-[220px] max-h-[50vh] max-w-md mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {renderWardrobeImage(expandedWardrobe, "split")}
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
                          Use Director to refine the visual prompt or Edit to
                          update the outfit description and scene appearance notes.
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDirectorTarget({
                            kind: "wardrobe",
                            wardrobeId: expandedWardrobe.id,
                          });
                        }}
                        className="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-teal-500/40 text-teal-300 hover:bg-teal-500/10"
                      >
                        <Clapperboard className="w-3 h-3" /> Director
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingWardrobe(expandedWardrobe);
                        }}
                        className="flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                      >
                        <Edit className="w-3 h-3" /> Edit
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
                  variant="outline"
                  className="h-7 text-xs font-medium"
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
              {expandedWardrobe && (expandedWardrobe.fullBodyUrl || expandedWardrobe.headshotUrl) && (
                <Button
                  variant="outline"
                  className="h-7 text-xs font-medium"
                  onClick={() => {
                    const url = (expandedWardrobe.fullBodyUrl || expandedWardrobe.headshotUrl)!;
                    void saveImageFile({
                      url,
                      label: `wardrobe-${character.name}-${expandedWardrobe.name}`,
                    })
                      .then((saved) => {
                        if (saved) toast.success("Wardrobe image saved");
                      })
                      .catch(() => toast.error("Failed to download wardrobe image"));
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
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
        {directorTarget && (
          <ReferenceStillDirectorDialog
            open={!!directorTarget}
            onOpenChange={(next) => {
              if (!next) setDirectorTarget(null);
            }}
            projectId={projectId}
            kind={directorTarget.kind}
            label={
              directorTarget.kind === "cast"
                ? character.name || "Character"
                : `${character.name} — ${
                    wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.name || "Wardrobe"
                  }`
            }
            currentPrompt={
              directorTarget.kind === "cast"
                ? seedCastDirectorPrompt(character, defaultArtStyle)
                : seedWardrobeDirectorPrompt({
                    storedPrompt: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.generationPrompt,
                    characterName: character.name || "Character",
                    appearanceDescription: character.appearanceDescription,
                    hairStyle: character.hairStyle,
                    hairColor: character.hairColor,
                    wardrobeDescription: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.description,
                    wardrobeAccessories: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.accessories,
                    appearanceNotes: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.appearanceNotes,
                    artStyle: defaultArtStyle,
                  })
            }
            context={
              directorTarget.kind === "cast"
                ? {
                    name: character.name,
                    appearance: [
                      character.appearanceDescription,
                      activeLikenessMode !== "none" && likenessNoteDraft.trim()
                        ? `Likeness transformation target: ${likenessNoteDraft.trim()}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(". "),
                  }
                : {
                    name: character.name,
                    appearance: character.appearanceDescription,
                    outfit: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.description,
                    accessories: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.accessories,
                    appearanceNotes: wardrobes.find(
                      (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                    )?.appearanceNotes,
                  }
            }
            isGenerating={
              directorTarget.kind === "cast"
                ? isGenerating
                : generatingWardrobeImageId === directorTarget.wardrobeId
            }
            onSave={async ({ prompt, generate }) => {
              if (directorTarget.kind === "wardrobe") {
                const wardrobe = wardrobes.find(
                  (row: CharacterWardrobe) => row.id === directorTarget.wardrobeId,
                );
                await onUpdateWardrobe?.(characterId, {
                  wardrobeId: directorTarget.wardrobeId,
                  wardrobeName: wardrobe?.name,
                  action: "update",
                  generationPrompt: prompt,
                  defaultWardrobe: wardrobe?.description,
                  wardrobeAccessories: wardrobe?.accessories,
                  appearanceNotes: wardrobe?.appearanceNotes,
                });
                if (generate && wardrobe) {
                  await handleGenerateWardrobeImage({
                    ...wardrobe,
                    generationPrompt: prompt,
                  });
                }
                return;
              }
              await onDirectCast?.({ prompt, generate });
            }}
          />
        )}
      </div>
    </div>
  );
};
