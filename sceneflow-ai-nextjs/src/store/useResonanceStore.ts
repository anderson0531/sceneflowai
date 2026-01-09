/**
 * Audience Resonance Store
 * 
 * Zustand store with localStorage persistence for Audience Resonance analysis state.
 * Caches analysis results per treatment ID so users don't lose their work when
 * hiding/showing the side panel or navigating between pages.
 * 
 * NEW: Supports local score recalculation with checkpoint overrides
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  AudienceIntent, 
  AudienceResonanceAnalysis,
  CheckpointResults
} from '@/lib/types/audienceResonance';
import { DEFAULT_INTENT } from '@/lib/types/audienceResonance';
import type { CheckpointOverride } from '@/lib/treatment/localScoring';

// Cache entry for a single treatment's resonance analysis
export interface ResonanceCacheEntry {
  intent: AudienceIntent;
  analysis: AudienceResonanceAnalysis | null;
  previousScore: number | null;
  appliedFixes: string[];
  iterationCount: number;
  isReadyForProduction: boolean;
  pendingFixesCount: number;
  lastUpdated: number;
  
  // NEW: Local scoring support
  serverCheckpointResults: CheckpointResults | null; // Original results from API
  checkpointOverrides: CheckpointOverride[]; // User-applied fixes
  isScoreEstimated: boolean; // True if using local calculation with overrides
}

interface ResonanceState {
  // Per-treatment analysis cache (keyed by treatment ID)
  analysisCache: Record<string, ResonanceCacheEntry>;
  
  // Actions
  getAnalysis: (treatmentId: string) => ResonanceCacheEntry | null;
  setAnalysis: (treatmentId: string, data: Partial<ResonanceCacheEntry>) => void;
  clearAnalysis: (treatmentId: string) => void;
  resetAll: () => void;
}

// Default cache entry for new treatments
const createDefaultEntry = (): ResonanceCacheEntry => ({
  intent: DEFAULT_INTENT,
  analysis: null,
  previousScore: null,
  appliedFixes: [],
  iterationCount: 0,
  isReadyForProduction: false,
  pendingFixesCount: 0,
  lastUpdated: Date.now(),
  // NEW: Local scoring defaults
  serverCheckpointResults: null,
  checkpointOverrides: [],
  isScoreEstimated: false,
});

export const useResonanceStore = create<ResonanceState>()(
  persist(
    (set, get) => ({
      analysisCache: {},
      
      getAnalysis: (treatmentId: string) => {
        const cache = get().analysisCache[treatmentId];
        if (!cache) return null;
        
        // Check if cache is stale (older than 7 days)
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - cache.lastUpdated > SEVEN_DAYS_MS) {
          // Clear stale cache
          set((state) => {
            const { [treatmentId]: _, ...rest } = state.analysisCache;
            return { analysisCache: rest };
          });
          return null;
        }
        
        return cache;
      },
      
      setAnalysis: (treatmentId: string, data) => {
        set((state) => {
          const existing = state.analysisCache[treatmentId] || createDefaultEntry();
          return {
            analysisCache: {
              ...state.analysisCache,
              [treatmentId]: {
                ...existing,
                ...data,
                lastUpdated: Date.now(),
              },
            },
          };
        });
      },
      
      clearAnalysis: (treatmentId: string) => {
        set((state) => {
          const { [treatmentId]: _, ...rest } = state.analysisCache;
          return { analysisCache: rest };
        });
      },
      
      resetAll: () => set({ analysisCache: {} }),
    }),
    {
      name: 'sceneflow-resonance-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist the cache, not the functions
      partialize: (state) => ({ analysisCache: state.analysisCache }),
    }
  )
);

// Helper hook for easy access to resonance state for a specific treatment
export const useResonanceForTreatment = (treatmentId: string) => {
  const store = useResonanceStore();
  const cached = store.getAnalysis(treatmentId);
  
  return {
    // Cached state (null if not found)
    cached,
    
    // Actions scoped to this treatment
    updateAnalysis: (data: Partial<ResonanceCacheEntry>) => 
      store.setAnalysis(treatmentId, data),
    clearAnalysis: () => store.clearAnalysis(treatmentId),
    
    // Convenience getters with defaults
    intent: cached?.intent || DEFAULT_INTENT,
    analysis: cached?.analysis || null,
    previousScore: cached?.previousScore ?? null,
    appliedFixes: cached?.appliedFixes || [],
    iterationCount: cached?.iterationCount || 0,
    isReadyForProduction: cached?.isReadyForProduction || false,
    pendingFixesCount: cached?.pendingFixesCount || 0,
    
    // NEW: Local scoring getters
    serverCheckpointResults: cached?.serverCheckpointResults || null,
    checkpointOverrides: cached?.checkpointOverrides || [],
    isScoreEstimated: cached?.isScoreEstimated || false,
  };
};
