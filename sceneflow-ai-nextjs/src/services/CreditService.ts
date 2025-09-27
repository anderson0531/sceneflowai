import { sequelize, AIPricing, CreditLedger, User, AIUsage } from '@/models'

export const CREDIT_VALUE_USD = Number(process.env.CREDIT_VALUE_USD ?? '0.0001')
export const MARKUP_MULTIPLIER = Number(process.env.MARKUP_MULTIPLIER ?? '4')

export type PricingCategory = 'text' | 'images' | 'tts' | 'whisper' | 'other'

export class CreditService {
  static async getPricing(provider: 'openai', category: PricingCategory, model: string, variant: string) {
    const row = await AIPricing.findOne({ where: { provider, category, model, variant, is_active: true } })
    if (!row) throw new Error(`Pricing not found for ${provider}/${category}/${model}/${variant}`)
    return {
      price_usd: Number(row.price_usd),
      metric: row.metric,
      unit_per: row.unit_per,
    }
  }

  static usdToCredits(usd: number): number {
    return Math.ceil((usd * MARKUP_MULTIPLIER) / CREDIT_VALUE_USD)
  }

  static async ensureCredits(userId: string, minCredits: number): Promise<boolean> {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('User not found')
    return Number(user.credits ?? 0) >= minCredits
  }

  static async charge(userId: string, chargeCredits: number, reason: CreditLedger['reason'], ref?: string | null, meta?: any) {
    if (chargeCredits <= 0) return
    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')
      const prev = Number(user.credits ?? 0)
      if (prev < chargeCredits) throw new Error('INSUFFICIENT_CREDITS')
      const next = prev - chargeCredits
      user.credits = next
      await user.save({ transaction: tx })
      await CreditLedger.create({
        user_id: userId,
        delta_credits: -chargeCredits,
        prev_balance: prev,
        new_balance: next,
        reason,
        ref: ref || null,
        meta: meta || null,
      } as any, { transaction: tx })
      return { prev, next }
    })
  }

  static async logUsage(data: Partial<AIUsage>) {
    return AIUsage.create(data as any)
  }
}


