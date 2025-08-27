// Enhanced Project Structure Types
// This file defines the hierarchical structure for long-form video content

export interface EnhancedProject extends BaseProject {
  structure: ProjectStructure;
  metadata: EnhancedProjectMetadata;
  workflow: EnhancedWorkflow;
  collaboration: CollaborationSettings;
  aiAssistance: AIAssistanceSettings;
  projectBible: ProjectBible; // Add Project Bible for consistency
}

export interface BaseProject {
  id: string;
  title: string;
  description: string;
  currentStep: WorkflowStep;
  progress: number; // 0-100
  status: 'draft' | 'in-progress' | 'completed' | 'archived' | 'review';
  createdAt: Date;
  updatedAt: Date;
  completedSteps: WorkflowStep[];
}

export interface ProjectStructure {
  type: 'short' | 'medium' | 'long';
  storyStructure: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom';
  acts: Act[];
  currentChapter: string;
  currentScene: string;
  globalElements: GlobalElements;
  storyArc: StoryArc;
  targetRuntime: number; // minutes
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedBudget: number;
  estimatedTimeline: number; // days
}

export interface Act {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
  summary: string;
  targetDuration: number; // minutes
  keyEvents: KeyEvent[];
  emotionalArc: EmotionalArc;
  status: 'planned' | 'in-progress' | 'completed' | 'review';
  progress: number; // 0-100
  notes: string[];
  aiSuggestions: AISuggestion[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  actId: string;
  scenes: Scene[];
  summary: string;
  targetDuration: number; // minutes
  keyObjectives: string[];
  transitions: Transition[];
  status: 'planned' | 'in-progress' | 'completed' | 'review';
  progress: number; // 0-100
  notes: string[];
  aiSuggestions: AISuggestion[];
}

export interface Scene {
  id: string;
  title: string;
  order: number;
  chapterId: string;
  actId: string;
  description: string;
  targetDuration: number; // seconds
  location: Location;
  characters: Character[];
  props: Prop[];
  visualStyle: VisualStyle;
  audioStyle: AudioStyle;
  cameraWork: CameraWork;
  lighting: Lighting;
  mood: string;
  keyActions: KeyAction[];
  dialogue: Dialogue[];
  status: 'planned' | 'storyboarded' | 'directed' | 'generated' | 'reviewed';
  progress: number; // 0-100
  notes: string[];
  aiSuggestions: AISuggestion[];
  generatedContent: GeneratedContent;
}

export interface GlobalElements {
  characters: Character[];
  locations: Location[];
  props: Prop[];
  visualStyle: VisualStyle;
  tone: string;
  theme: string;
  colorPalette: ColorPalette;
  musicStyle: string;
  soundEffects: string[];
  culturalContext: string;
  targetDemographics: string[];
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'background';
  description: string;
  personality: string[];
  appearance: string;
  motivations: string[];
  arc: CharacterArc;
  relationships: CharacterRelationship[];
  dialogueStyle: string;
  visualReferences: string[];
  aiGenerated: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'interior' | 'exterior' | 'virtual' | 'hybrid';
  description: string;
  visualStyle: string;
  mood: string;
  lighting: string;
  props: string[];
  accessibility: string[];
  restrictions: string[];
  visualReferences: string[];
  aiGenerated: boolean;
}

export interface Prop {
  id: string;
  name: string;
  category: 'set' | 'hand' | 'costume' | 'special';
  description: string;
  importance: 'critical' | 'important' | 'background';
  visualStyle: string;
  interactions: string[];
  aiGenerated: boolean;
}

export interface VisualStyle {
  overall: string;
  colorScheme: string;
  lighting: string;
  composition: string;
  movement: string;
  texture: string;
  references: string[];
  aiGenerated: boolean;
}

export interface AudioStyle {
  music: string;
  soundEffects: string[];
  ambient: string;
  dialogue: string;
  mixing: string;
  aiGenerated: boolean;
}

export interface CameraWork {
  angles: string[];
  movements: string[];
  framing: string;
  transitions: string[];
  aiGenerated: boolean;
}

export interface Lighting {
  type: string;
  intensity: string;
  color: string;
  direction: string;
  mood: string;
  aiGenerated: boolean;
}

export interface StoryArc {
  setup: string;
  risingAction: string[];
  climax: string;
  fallingAction: string[];
  resolution: string;
  themes: string[];
  messages: string[];
  emotionalBeats: EmotionalBeat[];
}

export interface EmotionalArc {
  start: string;
  development: string[];
  peak: string;
  resolution: string;
  overall: string;
}

export interface KeyEvent {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  characters: string[];
  location: string;
  timestamp: number; // minutes from start
}

export interface KeyAction {
  id: string;
  description: string;
  characters: string[];
  props: string[];
  duration: number; // seconds
  importance: 'critical' | 'important' | 'background';
}

export interface Dialogue {
  id: string;
  character: string;
  text: string;
  emotion: string;
  timing: number; // seconds from scene start
  importance: 'critical' | 'important' | 'background';
}

export interface Transition {
  from: string;
  to: string;
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'custom';
  duration: number; // seconds
  style: string;
}

export interface EmotionalBeat {
  timestamp: number; // minutes from start
  emotion: string;
  intensity: number; // 1-10
  description: string;
}

export interface CharacterArc {
  start: string;
  development: string[];
  end: string;
  growth: string;
}

export interface CharacterRelationship {
  characterId: string;
  relationship: string;
  dynamics: string;
  evolution: string;
}

export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  mood: Record<string, string[]>;
}

export interface AISuggestion {
  id: string;
  type: 'improvement' | 'alternative' | 'optimization' | 'creative';
  content: string;
  confidence: number; // 0-100
  reasoning: string;
  impact: 'low' | 'medium' | 'high';
  accepted: boolean;
  timestamp: Date;
  aiModel: string;
}

export interface GeneratedContent {
  storyboard: StoryboardFrame[];
  directions: SceneDirection[];
  prompts: string[];
  variations: ContentVariation[];
  quality: ContentQuality;
  metadata: Record<string, any>;
}

export interface StoryboardFrame {
  id: string;
  order: number;
  description: string;
  visualNotes: string;
  cameraAngle: string;
  composition: string;
  aiGenerated: boolean;
}

export interface SceneDirection {
  id: string;
  sceneId: string;
  cameraAngle: string;
  movement: string;
  lighting: string;
  props: string;
  talent: string;
  notes: string;
  aiGenerated: boolean;
}

export interface ContentVariation {
  id: string;
  type: 'alternative' | 'optimization' | 'creative';
  content: any;
  description: string;
  aiGenerated: boolean;
}

export interface ContentQuality {
  relevance: number; // 0-100
  creativity: number; // 0-100
  coherence: number; // 0-100
  originality: number; // 0-100
  technicalQuality: number; // 0-100
  overall: number; // 0-100
}

export interface EnhancedProjectMetadata {
  genre: string;
  duration: number;
  targetAudience: string;
  style: string;
  concept: string;
  keyMessage: string;
  tone: string;
  budget: number;
  timeline: number;
  teamSize: number;
  complexity: 'simple' | 'moderate' | 'complex';
  marketResearch: MarketResearch;
  competitiveAnalysis: CompetitiveAnalysis;
  successMetrics: SuccessMetrics;
}

export interface MarketResearch {
  targetDemographics: string[];
  marketSize: string;
  trends: string[];
  opportunities: string[];
  challenges: string[];
}

export interface CompetitiveAnalysis {
  competitors: string[];
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
  marketPosition: string;
}

export interface SuccessMetrics {
  engagement: string[];
  conversion: string[];
  brand: string[];
  business: string[];
  creative: string[];
}

export interface EnhancedWorkflow {
  currentStep: WorkflowStep;
  stepProgress: Record<WorkflowStep, number>;
  stepHistory: WorkflowStepHistory[];
  nextSteps: WorkflowStep[];
  blockers: WorkflowBlocker[];
  aiAssistance: AIWorkflowAssistance;
}

export interface WorkflowStepHistory {
  step: WorkflowStep;
  startedAt: Date;
  completedAt?: Date;
  duration: number; // minutes
  status: 'completed' | 'skipped' | 'failed';
  notes: string[];
}

export interface WorkflowBlocker {
  id: string;
  type: 'technical' | 'creative' | 'resource' | 'approval';
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved' | 'mitigated';
  resolution?: string;
  aiSuggestions: AISuggestion[];
}

export interface AIWorkflowAssistance {
  enabled: boolean;
  suggestions: AISuggestion[];
  automation: WorkflowAutomation[];
  qualityChecks: QualityCheck[];
  optimization: WorkflowOptimization[];
}

export interface WorkflowAutomation {
  id: string;
  type: 'auto-advance' | 'quality-check' | 'resource-allocation' | 'collaboration';
  enabled: boolean;
  conditions: string[];
  actions: string[];
}

export interface QualityCheck {
  id: string;
  type: 'content' | 'technical' | 'creative' | 'business';
  criteria: string[];
  threshold: number;
  status: 'pending' | 'passed' | 'failed';
  feedback: string[];
}

export interface WorkflowOptimization {
  id: string;
  type: 'efficiency' | 'quality' | 'cost' | 'collaboration';
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  implementation: string;
}

export interface CollaborationSettings {
  enabled: boolean;
  teamMembers: TeamMember[];
  permissions: Permission[];
  communication: CommunicationSettings;
  versionControl: VersionControlSettings;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'reviewer';
  permissions: string[];
  assignedTasks: string[];
  lastActive: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  scope: 'project' | 'act' | 'chapter' | 'scene';
  actions: string[];
}

export interface CommunicationSettings {
  channels: string[];
  notifications: NotificationSettings;
  meetings: MeetingSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface MeetingSettings {
  frequency: string;
  duration: number; // minutes
  participants: string[];
  agenda: string[];
}

export interface VersionControlSettings {
  enabled: boolean;
  autoSave: boolean;
  saveInterval: number; // minutes
  maxVersions: number;
  branching: boolean;
}

export interface AIAssistanceSettings {
  enabled: boolean;
  level: 'minimal' | 'moderate' | 'aggressive';
  categories: {
    ideation: boolean;
    storyboard: boolean;
    direction: boolean;
    generation: boolean;
    review: boolean;
    optimization: boolean;
  };
  learning: boolean;
  personalization: boolean;
  collaboration: boolean;
}

export type WorkflowStep = 'ideation' | 'storyboard' | 'scene-direction' | 'video-generation' | 'review' | 'optimization';

// Project Bible System for Consistency Across Projects
export interface ProjectBible {
  id: string;
  projectId: string;
  title: string;
  version: string;
  lastUpdated: Date;
  
  // Core Story Elements
  logline: string;
  synopsis: string;
  tagline: string;
  
  // Story Structure
  storyStructure: 'linear' | 'three-act' | 'hero-journey' | 'save-the-cat' | 'custom';
  acts: Act[];
  currentChapter: string;
  
  // Characters
  characters: Character[];
  characterArcs: CharacterArc[];
  
  // World Building
  locations: Location[];
  props: Prop[];
  visualStyles: VisualStyle[];
  themes: Theme[];
  
  // Creative Guidelines
  visualGuidelines: VisualGuidelines;
  audioGuidelines: AudioGuidelines;
  toneGuidelines: ToneGuidelines;
  
  // Production Notes
  productionNotes: ProductionNote[];
  references: Reference[];
  inspirations: Inspiration[];
  
  // Consistency Rules
  consistencyRules: ConsistencyRule[];
  namingConventions: NamingConvention[];
  
  // Version Control
  changelog: ChangelogEntry[];
  contributors: Contributor[];
}

export interface CharacterArc {
  characterId: string;
  act: number;
  chapter: number;
  emotionalState: string;
  goals: string[];
  obstacles: string[];
  growth: string;
  setbacks: string;
  resolution: string;
}

export interface VisualGuidelines {
  colorPalette: string[];
  lightingPrinciples: string[];
  compositionRules: string[];
  visualEffects: string[];
  referenceMaterials: string[];
  styleGuide: string;
}

export interface AudioGuidelines {
  musicPrinciples: string[];
  soundEffectStyle: string[];
  voiceGuidelines: string[];
  audioTransitions: string[];
  referenceAudio: string[];
}

export interface ToneGuidelines {
  overallTone: string;
  emotionalRange: string[];
  humorStyle: string;
  dramaticMoments: string;
  pacingGuidelines: string;
  audienceResponse: string;
}

export interface ProductionNote {
  id: string;
  name: string;
  category: 'technical' | 'creative' | 'logistical' | 'budget' | 'schedule';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  notes: string[];
}

export interface Reference {
  id: string;
  type: 'visual' | 'audio' | 'narrative' | 'technical' | 'inspirational';
  title: string;
  description: string;
  url?: string;
  filePath?: string;
  notes: string;
  relevance: string;
}

export interface Inspiration {
  id: string;
  source: string;
  description: string;
  impact: string;
  application: string;
  notes: string;
}

export interface ConsistencyRule {
  id: string;
  category: 'visual' | 'narrative' | 'character' | 'technical' | 'brand';
  rule: string;
  reason: string;
  examples: string[];
  exceptions: string[];
  enforcement: 'strict' | 'flexible' | 'guideline';
}

export interface NamingConvention {
  category: string;
  pattern: string;
  examples: string[];
  notes: string;
}

export interface ChangelogEntry {
  id: string;
  timestamp: Date;
  author: string;
  change: string;
  reason: string;
  impact: string;
  version: string;
}

export interface Contributor {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  contributions: string[];
  contactInfo: string;
}

// Story Structure Templates
export const STORY_STRUCTURE_TEMPLATES = {
  'three-act': {
    name: 'Three-Act Structure',
    description: 'Classic storytelling structure with setup, confrontation, and resolution',
    acts: [
      {
        name: 'Act 1: Setup',
        purpose: 'Introduce characters, world, and conflict',
        targetDuration: 0.25, // 25% of total runtime
        emotionalArc: 'setup'
      },
      {
        name: 'Act 2: Confrontation',
        purpose: 'Develop conflict and raise stakes',
        targetDuration: 0.5, // 50% of total runtime
        emotionalArc: 'rising'
      },
      {
        name: 'Act 3: Resolution',
        purpose: 'Climax and resolution',
        targetDuration: 0.25, // 25% of total runtime
        emotionalArc: 'resolution'
      }
    ]
  },
  'hero-journey': {
    name: 'Hero\'s Journey',
    description: 'Mythological structure following the hero\'s transformation',
    acts: [
      {
        name: 'Act 1: Departure',
        purpose: 'Call to adventure and crossing the threshold',
        targetDuration: 0.3,
        emotionalArc: 'setup'
      },
      {
        name: 'Act 2: Initiation',
        purpose: 'Tests, allies, enemies, and the ordeal',
        targetDuration: 0.4,
        emotionalArc: 'rising'
      },
      {
        name: 'Act 3: Return',
        purpose: 'The road back and transformation',
        targetDuration: 0.3,
        emotionalArc: 'resolution'
      }
    ]
  },
  'save-the-cat': {
    name: 'Save the Cat',
    description: 'Screenwriting structure with 15 story beats',
    acts: [
      {
        name: 'Act 1: Setup',
        purpose: 'Establish world and character',
        targetDuration: 0.25,
        emotionalArc: 'setup'
      },
      {
        name: 'Act 2: Confrontation',
        purpose: 'Rising action and complications',
        targetDuration: 0.5,
        emotionalArc: 'rising'
      },
      {
        name: 'Act 3: Resolution',
        purpose: 'Climax and denouement',
        targetDuration: 0.25,
        emotionalArc: 'resolution'
      }
    ]
  }
};
