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

  /**
   * Calculate BYOK platform fee (20% of full price)
   */
  static calculateBYOKFee(fullPrice: number): number {
    return Math.ceil(fullPrice * 0.20) // 20% platform fee
  }

  /**
   * Get credit breakdown (subscription vs addon credits)
   */
  static async getCreditBreakdown(userId: string): Promise<{
    subscription_credits: number
    subscription_expires_at: Date | null
    addon_credits: number
    total_credits: number
  }> {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('User not found')

    return {
      subscription_credits: Number(user.subscription_credits_monthly || 0),
      subscription_expires_at: user.subscription_credits_expires_at || null,
      addon_credits: Number(user.addon_credits || 0),
      total_credits: Number(user.credits || 0),
    }
  }

  /**
   * Charge with priority: use addon credits first, then subscription credits
   */
  static async chargeWithPriority(
    userId: string,
    credits: number,
    reason: CreditLedger['reason'],
    hasBYOK: boolean = false,
    ref?: string | null,
    meta?: any
  ): Promise<{ prev: number; next: number; usedAddon: number; usedSubscription: number }> {
    if (credits <= 0) {
      const breakdown = await this.getCreditBreakdown(userId)
      return {
        prev: breakdown.total_credits,
        next: breakdown.total_credits,
        usedAddon: 0,
        usedSubscription: 0,
      }
    }

    return await sequelize.transaction(async (tx) => {
      const user = await User.findByPk(userId, { transaction: tx, lock: tx.LOCK.UPDATE })
      if (!user) throw new Error('User not found')

      const prevTotal = Number(user.credits ?? 0)
      if (prevTotal < credits) throw new Error('INSUFFICIENT_CREDITS')

      // Get current breakdown
      let addonCredits = Number(user.addon_credits || 0)
      let subscriptionCredits = Number(user.subscription_credits_monthly || 0)

      // Use addon credits first, then subscription credits
      let remainingToCharge = credits
      let usedAddon = 0
      let usedSubscription = 0

      // First, use addon credits
      if (addonCredits > 0 && remainingToCharge > 0) {
        usedAddon = Math.min(addonCredits, remainingToCharge)
        addonCredits -= usedAddon
        remainingToCharge -= usedAddon
      }

      // Then, use subscription credits
      if (subscriptionCredits > 0 && remainingToCharge > 0) {
        usedSubscription = Math.min(subscriptionCredits, remainingToCharge)
        subscriptionCredits -= usedSubscription
        remainingToCharge -= usedSubscription
      }

      // Update user credits
      user.addon_credits = addonCredits
      user.subscription_credits_monthly = subscriptionCredits
      user.credits = addonCredits + subscriptionCredits

      await user.save({ transaction: tx })

      // Determine credit type for ledger
      const creditType: 'addon' | 'subscription' | null = 
        usedAddon > 0 && usedSubscription === 0 ? 'addon' :
        usedAddon === 0 && usedSubscription > 0 ? 'subscription' :
        null // Mixed usage

      // Log the charge in credit ledger
      await CreditLedger.create({
        user_id: userId,
        delta_credits: -credits,
        prev_balance: prevTotal,
        new_balance: Number(user.credits),
        reason,
        credit_type: creditType,
        ref: ref || null,
        meta: {
          ...(meta || {}),
          hasBYOK,
          usedAddon,
          usedSubscription,
        },
      } as any, { transaction: tx })

      return {
        prev: prevTotal,
        next: Number(user.credits),
        usedAddon,
        usedSubscription,
      }
    })
  }
}


