/**
 * When models get cheaper or more capable, the better deal is more credits
 * on purchases and renewals made after the change.
 *
 * Outstanding credits keep buying the same number of operations they bought
 * when they were issued. Do not deliver a price cut by lowering operation
 * credit costs while those balances are still on the books.
 */

export const SAVINGS_DELIVERED_AS = 'more_credits_per_new_dollar' as const

export function passModelSavingsToNewPurchases(input: {
  previousCreditsPerDollar: number
  nextCreditsPerDollar: number
  operationCredits: number
  outstandingCredits: number
  newPurchaseDollars: number
}): {
  operationCredits: number
  outstandingCredits: number
  newPurchaseCredits: number
  savingsDeliveredAs: typeof SAVINGS_DELIVERED_AS
} {
  if (input.nextCreditsPerDollar < input.previousCreditsPerDollar) {
    throw new Error(
      'Model savings increase credits granted per new dollar. Do not lower the credits-per-dollar rate, and do not lower operation credit costs for balances already issued.'
    )
  }

  return {
    operationCredits: input.operationCredits,
    outstandingCredits: input.outstandingCredits,
    newPurchaseCredits: Math.round(input.newPurchaseDollars * input.nextCreditsPerDollar),
    savingsDeliveredAs: SAVINGS_DELIVERED_AS,
  }
}
