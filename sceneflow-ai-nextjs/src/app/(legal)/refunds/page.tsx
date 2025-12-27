'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: December 25, 2025</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow AI wants you to be completely satisfied with your purchase. This Refund Policy outlines when and how you can request a refund. Payments are processed by Paddle.com Market Limited as our Merchant of Record.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Subscription Refunds</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">2.1 14-Day Money-Back Guarantee</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              All new subscriptions (Starter, Pro, Studio) include a <strong>14-day money-back guarantee</strong>. If you are not satisfied with the Service, you may request a full refund within 14 days of your initial purchase.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">2.2 After 14 Days</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              After the 14-day period, subscriptions are non-refundable for the current billing period. However, you may cancel at any time to prevent future charges. Your access will continue until the end of your paid period.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">2.3 Annual Subscriptions</h3>
            <p className="text-gray-300 leading-relaxed">
              Annual subscriptions are eligible for a prorated refund within the first 30 days. After 30 days, annual subscriptions are non-refundable but you may continue using the Service until the end of your annual term.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. One-Time Purchases</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">3.1 Trial ($15 Starter Pack)</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Trial one-time purchase is refundable within 7 days if no credits have been used. Once credits are consumed, refunds are not available.
            </p>
            
            <h3 className="text-xl font-medium text-white mb-3">3.2 Credit Packs</h3>
            <p className="text-gray-300 leading-relaxed">
              Credit pack purchases (Basic Pack, Value Pack, Pro Pack) are refundable within 7 days if no credits from the pack have been used. Partial refunds are not available for partially used packs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Non-Refundable Situations</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Refunds are NOT available in the following situations:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Credits have already been used</li>
              <li>Account was terminated due to Terms of Service violation</li>
              <li>Subscription was renewed after the 14-day period</li>
              <li>Request is made after the applicable refund window</li>
              <li>Fraudulent or abusive refund requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. How to Request a Refund</h2>
            <p className="text-gray-300 leading-relaxed mb-4">To request a refund:</p>
            <ol className="list-decimal pl-6 text-gray-300 space-y-2">
              <li>Email <strong>billing@sceneflowai.com</strong> with subject line &quot;Refund Request&quot;</li>
              <li>Include your account email address and order/transaction ID</li>
              <li>Briefly explain the reason for your refund request</li>
              <li>We will respond within 2 business days</li>
            </ol>
            <p className="text-gray-300 leading-relaxed mt-4">
              Alternatively, you can request a refund directly through Paddle&apos;s customer portal if you received an invoice link.
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
              If you believe you are entitled to a refund outside of these guidelines due to technical issues or service outages, please contact us with details. We review each case individually. For payment disputes, Paddle handles chargebacks per their policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
            <p className="text-gray-300">
              <strong>Billing Inquiries:</strong> billing@sceneflowai.com<br />
              <strong>General Support:</strong> support@sceneflowai.com<br />
              <strong>Website:</strong> https://sceneflowai.studio
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            See also: <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link> | <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
