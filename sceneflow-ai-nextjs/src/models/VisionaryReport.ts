import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

/**
 * VisionaryReport — Sequelize model
 * 
 * Stores AI-generated market-gap analysis, language arbitrage maps,
 * and idea-to-production bridge plans from the Visionary Engine.
 * 
 * Table: visionary_reports
 * Migration: Run POST /api/setup/database or create manually.
 */

export interface VisionaryReportAttributes {
  id: string
  user_id: string
  concept: string
  genre: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'failed'
  market_scan: Record<string, any> | null
  gap_analysis: Record<string, any> | null
  arbitrage_map: Record<string, any> | null
  bridge_plan: Record<string, any> | null
  overall_score: number | null
  credits_used: number
  error_message: string | null
  target_regions: string[] | null
  focus_languages: string[] | null
  project_id: string | null
  created_at: Date
  updated_at: Date
}

export interface VisionaryReportCreationAttributes extends Optional<
  VisionaryReportAttributes,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'market_scan'
  | 'gap_analysis'
  | 'arbitrage_map'
  | 'bridge_plan'
  | 'overall_score'
  | 'credits_used'
  | 'error_message'
  | 'target_regions'
  | 'focus_languages'
  | 'project_id'
  | 'genre'
> {}

export class VisionaryReport extends Model<VisionaryReportAttributes, VisionaryReportCreationAttributes>
  implements VisionaryReportAttributes {
  public id!: string
  public user_id!: string
  public concept!: string
  public genre!: string | null
  public status!: 'pending' | 'in_progress' | 'complete' | 'failed'
  public market_scan!: Record<string, any> | null
  public gap_analysis!: Record<string, any> | null
  public arbitrage_map!: Record<string, any> | null
  public bridge_plan!: Record<string, any> | null
  public overall_score!: number | null
  public credits_used!: number
  public error_message!: string | null
  public target_regions!: string[] | null
  public focus_languages!: string[] | null
  public project_id!: string | null
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  /**
   * Compute overall viability score from sub-analyses
   */
  public computeOverallScore(): number {
    let scores: number[] = []

    if (this.gap_analysis) {
      const fitScore = (this.gap_analysis as any)?.conceptFit?.score
      if (typeof fitScore === 'number') scores.push(fitScore)
    }

    if (this.arbitrage_map) {
      const opps = (this.arbitrage_map as any)?.opportunities
      if (Array.isArray(opps) && opps.length > 0) {
        const avgArb = opps.reduce((s: number, o: any) => s + (o.arbitrageScore || 0), 0) / opps.length
        scores.push(avgArb)
      }
    }

    if (this.bridge_plan) {
      const prob = (this.bridge_plan as any)?.successProbability
      if (typeof prob === 'number') scores.push(prob)
    }

    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }
}

VisionaryReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    concept: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The concept or idea being analyzed',
    },
    genre: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'complete', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    market_scan: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Phase 1: Market scan results',
    },
    gap_analysis: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Phase 2: Gap analysis results',
    },
    arbitrage_map: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Phase 3: Language/region arbitrage heat map',
    },
    bridge_plan: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Phase 4: Idea-to-production bridge plan',
    },
    overall_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Computed viability score 0-100',
    },
    credits_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total credits consumed for this analysis',
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    target_regions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'ISO 3166-1 alpha-2 region codes',
    },
    focus_languages: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'BCP 47 language codes',
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Optional linked project',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'visionary_reports',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_visionary_reports_user_id',
      },
      {
        fields: ['status'],
        name: 'idx_visionary_reports_status',
      },
      {
        fields: ['created_at'],
        name: 'idx_visionary_reports_created_at',
      },
      {
        fields: ['project_id'],
        name: 'idx_visionary_reports_project_id',
      },
    ],
  }
)

export default VisionaryReport
