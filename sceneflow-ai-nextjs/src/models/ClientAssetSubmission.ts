import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type ContinuitySlotType =
  | 'character'
  | 'wardrobe'
  | 'location'
  | 'location_version'
  | 'prop'
  | 'character_voice'
  | 'live_video'
  | 'story_audio'
export type QuarantineStatus = 'clean' | 'flagged'
export type SubmissionApprovalStatus = 'pending' | 'promoted' | 'rejected'

export type ClientMediaUsageIntent = 'live_intro' | 'reenactment_vo' | 'voice_clone'

export type ClientVoiceCloneStatus =
  | 'minted'
  | 'tier2_dna_ready'
  | 'pending_consent'
  | 'failed'

export interface AcousticVoiceDnaPayload {
  summary: string
  gender?: string
  apparentAge?: string
  vocalAttributes: {
    register: 'low' | 'low-mid' | 'mid' | 'mid-high' | 'high'
    vocalWeight: 'light' | 'medium' | 'heavy'
    timbre: string
    accent: string
    cadence: string
    wpm: number
    emotionalState: string
    inflection: string
    tone: string
  }
  /** <300 char pure acoustic prompt for Gemini 3.8 Flash VOICE_TYPE_PROMPTED JIT pool */
  voiceDesignPrompt: string
  /** Concise vocal matching cue injected into Veo on-camera dialogue prompts */
  veoVoiceCue: string
  /** Best matched Gemini base voice name (e.g. Charon, Kore, Aoede) for 0-slot fallback */
  recommendedGeminiBaseVoice?: string
}

export interface ClientMediaChapter {
  title: string
  startSeconds: number
  endSeconds: number
  quote: string
  suggestedUsage: 'live_intro' | 'reenactment_vo'
}

export interface ClientAssetSubmissionMetadata {
  mediaKind?: 'image' | 'audio' | 'video'
  usageIntent?: ClientMediaUsageIntent
  targetCharacterId?: string | null
  targetCharacterName?: string | null
  languageCode?: string | null
  durationSeconds?: number | null
  /** Optional scene linkage when recorded via Guided Teleprompter / Scene Intro Prompt Card */
  linkedSceneId?: string | null
  linkedSceneNumber?: number | null
  linkedSceneTitle?: string | null
  /** Optional voice story recorded right after uploading a vintage photo */
  photoVoiceNoteUrl?: string | null
  photoVoiceNoteTranscript?: string | null
  photoVoiceNoteDurationSec?: number | null
  /** Whether a promoted archival photo should be used as AI ref or Ken Burns documentary photo */
  archivalDisplayMode?: 'ai_reference' | 'archival_ken_burns' | null
  /** Auto-detected story chapters from longer interview/story recordings */
  chapters?: ClientMediaChapter[] | null
  /** Cleanest uninterrupted speech window detected for voice cloning */
  bestVoiceSliceWindow?: { startSeconds: number; endSeconds: number; reason?: string } | null
  /** Optional spoken consent WAV/audio Blob URL for Google Chirp 3 Instant Custom Voice */
  consentAudioBlobUrl?: string | null
  /** Clean loudness-normalized speech stem (MP3) extracted from uploaded video/audio */
  extractedAudioUrl?: string | null
  /** Clean 15s LINEAR16 24kHz mono WAV reference slice stored for instant re-minting */
  referenceSliceWavUrl?: string | null
  /** Verbatim transcript extracted via Gemini multimodal audio analysis */
  transcript?: string | null
  /** Permanent 0-slot Acoustic Voice DNA derived directly from the real audio recording */
  acousticVoiceDna?: AcousticVoiceDnaPayload | null
  /** Stateless Google Chirp 3 Instant Custom Voice key (0 saved slots on Google) */
  googleVoiceCloningKey?: string | null
  voiceCloneStatus?: ClientVoiceCloneStatus | null
  voiceCloneNote?: string | null
  /** Portrait vs landscape hint for uploaded live videos */
  aspectOrientation?: 'landscape' | 'portrait' | 'square' | null
}

export interface ClientAssetSubmissionAttributes {
  id: string
  collab_session_id: string
  project_id: string
  owner_user_id: string
  slot_id: string
  slot_type: ContinuitySlotType
  slot_name: string
  customer_name: string
  customer_email: string | null
  blob_url: string
  mime_type: string
  file_size_bytes: number
  caption: string | null
  metadata: ClientAssetSubmissionMetadata | null
  quarantine_status: QuarantineStatus
  quarantine_reason: string | null
  approval_status: SubmissionApprovalStatus
  promoted_reference_asset_id: string | null
  created_at: Date
  updated_at: Date
}

export interface ClientAssetSubmissionCreationAttributes
  extends Optional<
    ClientAssetSubmissionAttributes,
    | 'id'
    | 'customer_email'
    | 'file_size_bytes'
    | 'caption'
    | 'metadata'
    | 'quarantine_status'
    | 'quarantine_reason'
    | 'approval_status'
    | 'promoted_reference_asset_id'
    | 'created_at'
    | 'updated_at'
  > {}

export class ClientAssetSubmission
  extends Model<ClientAssetSubmissionAttributes, ClientAssetSubmissionCreationAttributes>
  implements ClientAssetSubmissionAttributes
{
  declare id: string
  declare collab_session_id: string
  declare project_id: string
  declare owner_user_id: string
  declare slot_id: string
  declare slot_type: ContinuitySlotType
  declare slot_name: string
  declare customer_name: string
  declare customer_email: string | null
  declare blob_url: string
  declare mime_type: string
  declare file_size_bytes: number
  declare caption: string | null
  declare metadata: ClientAssetSubmissionMetadata | null
  declare quarantine_status: QuarantineStatus
  declare quarantine_reason: string | null
  declare approval_status: SubmissionApprovalStatus
  declare promoted_reference_asset_id: string | null
  declare created_at: Date
  declare updated_at: Date
}

ClientAssetSubmission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    collab_session_id: { type: DataTypes.UUID, allowNull: false },
    project_id: { type: DataTypes.UUID, allowNull: false },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    slot_id: { type: DataTypes.STRING(160), allowNull: false },
    slot_type: { type: DataTypes.STRING(32), allowNull: false },
    slot_name: { type: DataTypes.STRING(200), allowNull: false },
    customer_name: { type: DataTypes.STRING(160), allowNull: false },
    customer_email: { type: DataTypes.STRING(255), allowNull: true },
    blob_url: { type: DataTypes.STRING(1200), allowNull: false },
    mime_type: { type: DataTypes.STRING(64), allowNull: false },
    file_size_bytes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    caption: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    quarantine_status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'clean' },
    quarantine_reason: { type: DataTypes.TEXT, allowNull: true },
    approval_status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
    promoted_reference_asset_id: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'client_asset_submissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)

export default ClientAssetSubmission
