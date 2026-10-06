import type { Metadata } from 'next'
import {
  LEGAL_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_SERVICE_NAME,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_WEBSITE,
  WHOP_MOR_FULL,
} from '@/config/legal/legalCopy'
import { buildLegalMetadata, getLegalPageById } from '@/config/legal/legalPages'

export const metadata: Metadata = buildLegalMetadata(getLegalPageById('refunds'))

export default function RefundPolicyPage() {
  return (
    <>
        <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: {LEGAL_LAST_UPDATED}</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
            <p className="text-gray-300 leading-relaxed">
              {LEGAL_COMPANY_NAME} operates {LEGAL_SERVICE_NAME} and wants you to be completely satisfied with your purchase. This Refund Policy outlines when and how you can request a refund.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mt-4">
              <p className="text-gray-300 text-sm">
                <strong className="text-purple-400">Payment Processing:</strong> All payments and refunds are processed by {WHOP_MOR_FULL} Sales tax, VAT, or GST collected at the time of purchase will be refunded proportionally with any approved refund.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Subscription Refunds</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">2.1 Try the studio with Explorer</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The $9 Explorer pack is the way to evaluate SceneFlow before a subscription. Starter, Pro, and Studio are billed for a production period. You may cancel anytime so the next renewal does not charge. Access continues until the end of the period already paid for.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">2.2 Unused subscription credits, first 7 days</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              A new monthly or annual subscription is refundable within <strong>7 days of the initial purchase only when no subscription credits from that grant have been used</strong>. After any generation spends those credits, the current period is non-refundable.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">2.3 Renewals and annual plans</h3>
            <p className="text-gray-300 leading-relaxed">
              Renewal charges are non-refundable. Annual subscriptions are not prorated. Cancel before the renewal date to stop the next term. You may keep using the Service until the end of the term already paid for.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. One-Time Purchases</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">3.1 Explorer ($9 pack)</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Explorer one-time purchase is refundable within 7 days if no credits from that pack have been used. Once credits are consumed, refunds are not available. Unused Explorer credits expire 90 days after purchase.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">3.2 Add-on credit packs</h3>
            <p className="text-gray-300 leading-relaxed">
              Add-on packs ($25, $100, and $250) are refundable within 7 days if no credits from that pack have been used. Partial refunds are not available for a pack that has been used. Each pack expires 12 months after its own purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Non-Refundable Situations</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Refunds are NOT available in the following situations:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Any credits from that subscription grant or pack have already been used</li>
              <li>Account was terminated due to Terms of Service violation</li>
              <li>The charge is a subscription renewal</li>
              <li>Request is made after the 7-day window</li>
              <li>Fraudulent or abusive refund requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. How to Request a Refund</h2>
            <p className="text-gray-300 leading-relaxed mb-4">To request a refund:</p>
            <ol className="list-decimal pl-6 text-gray-300 space-y-2">
              <li>Email <strong>{LEGAL_SUPPORT_EMAIL}</strong> with subject line &quot;Refund Request&quot;</li>
              <li>Include your account email address and order/transaction ID</li>
              <li>Briefly explain the reason for your refund request</li>
              <li>We will respond within 2 business days</li>
            </ol>
            <p className="text-gray-300 leading-relaxed mt-4">
              Alternatively, you can request a refund directly through the Whop customer portal if you received an invoice link from Whop.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Refund Processing</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Approved refunds are processed within 5-10 business days</li>
              <li>Refunds are issued to the original payment method</li>
              <li>Upon refund, any associated credits are immediately revoked</li>
              <li>Your account access may be downgraded to the free tier</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Cancellation vs. Refund</h2>
            <div className="bg-gray-800/50 rounded-lg p-6 mt-4">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-white">Cancellation:</strong> Stops future billing. You keep access until the end of your paid period.<br /><br />
                <strong className="text-white">Refund:</strong> Returns your money. Access and credits are immediately revoked.
              </p>
            </div>
            <p className="text-gray-300 leading-relaxed mt-4">
              To cancel your subscription without requesting a refund, go to <strong>Settings → Billing → Cancel Subscription</strong> in your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Exceptions and Disputes</h2>
            <p className="text-gray-300 leading-relaxed">
              If you believe you are entitled to a refund outside of these guidelines due to technical issues or service outages, please contact us with details. We review each case individually. For payment disputes, Whop, our Merchant of Record, handles chargebacks per its policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
            <p className="text-gray-300">
              <strong>{LEGAL_COMPANY_NAME}</strong><br />
              {LEGAL_ADDRESS}<br />
              <strong>Support and Billing Inquiries:</strong> {LEGAL_SUPPORT_EMAIL}<br />
              <strong>Website:</strong> {LEGAL_WEBSITE}
            </p>
          </section>
        </div>
    </>
  )
}
