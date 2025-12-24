'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
        
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: December 25, 2025</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow AI Inc. (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service at sceneflowai.studio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, password (hashed)</li>
              <li><strong>Profile Data:</strong> Avatar, display name, preferences</li>
              <li><strong>Payment Information:</strong> Processed securely by Paddle; we do not store credit card numbers</li>
              <li><strong>Content:</strong> Scripts, prompts, uploaded images, and project data you create</li>
              <li><strong>BYOK API Keys:</strong> Encrypted and stored securely if you choose to use your own keys</li>
            </ul>
            
            <h3 className="text-xl font-medium text-white mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Usage Data:</strong> Features used, credits consumed, generation history</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed, referring URLs</li>
              <li><strong>Cookies:</strong> Session cookies for authentication, preference cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and manage your account</li>
              <li>Generate AI content based on your inputs</li>
              <li>Send transactional emails (receipts, account notifications)</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We share your data with:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>AI Service Providers:</strong> Google (Vertex AI), ElevenLabs, Shotstack — to generate content (prompts and outputs only)</li>
              <li><strong>Payment Processor:</strong> Paddle.com Market Limited — to process payments as our Merchant of Record</li>
              <li><strong>Authentication Provider:</strong> Clerk — for secure user authentication</li>
              <li><strong>Infrastructure Providers:</strong> Vercel, Supabase — for hosting and database services</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do NOT sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account deletion request</li>
              <li><strong>Project Content:</strong> Retained until you delete it or close your account</li>
              <li><strong>Transaction Records:</strong> Retained for 7 years for legal/tax compliance</li>
              <li><strong>Usage Logs:</strong> Retained for 90 days, then anonymized</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-4">
              <li>TLS/SSL encryption for all data in transit</li>
              <li>AES-256 encryption for BYOK API keys at rest</li>
              <li>Row-Level Security (RLS) in our database</li>
              <li>Regular security audits and penetration testing</li>
              <li>SOC 2 compliant infrastructure providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to processing for marketing purposes</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, email privacy@sceneflowai.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your data may be transferred to and processed in the United States. We use Standard Contractual Clauses and other safeguards to ensure adequate protection for EU/UK residents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected data from a child, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We use the following types of cookies:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Essential:</strong> Required for authentication and security</li>
              <li><strong>Functional:</strong> Remember your preferences</li>
              <li><strong>Analytics:</strong> Understand how you use the Service (anonymized)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You can manage cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification. The &quot;Last updated&quot; date at the top reflects the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p className="text-gray-300">
              <strong>Data Protection Inquiries:</strong> privacy@sceneflowai.com<br />
              <strong>General Support:</strong> support@sceneflowai.com<br />
              <strong>Website:</strong> https://sceneflowai.studio
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            See also: <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link> | <Link href="/refunds" className="text-purple-400 hover:text-purple-300">Refund Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
