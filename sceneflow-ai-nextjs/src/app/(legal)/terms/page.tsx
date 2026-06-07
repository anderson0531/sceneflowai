'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
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
        
        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: June 5, 2026</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using SceneFlow AI ("Service"), operated by Life Focus, LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow AI is an AI-powered filmmaking platform that enables users to create video content including scripts, pre-visualization, voice synthesis, and video generation. The Service uses artificial intelligence technologies from third-party providers including Google (Gemini, Imagen, Veo), and ElevenLabs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Account Registration</h2>
            <p className="text-gray-300 leading-relaxed mb-4">To use certain features of the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Credits and Payments</h2>
            <p className="text-gray-300 leading-relaxed mb-4">The Service operates on a credit-based system:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Subscription Credits:</strong> Monthly credits expire 30 days after issuance if unused</li>
              <li><strong>One-time Purchase Credits:</strong> Credits from packs (Explorer, Basic Pack, Value Pack, Pro Pack) never expire</li>
              <li><strong>Payment Processing:</strong> Payments are processed securely by Whop, our Merchant of Record payment partner</li>
              <li><strong>Pricing:</strong> All prices are in USD and include applicable taxes calculated at checkout</li>
              <li><strong>Automatic Renewal:</strong> Subscriptions renew automatically unless cancelled before the renewal date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Acceptable Use</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Generate content that is illegal, harmful, threatening, abusive, or harassing</li>
              <li>Create deepfakes or impersonate real individuals without consent</li>
              <li>Produce content depicting minors in any inappropriate context</li>
              <li>Generate content that infringes on intellectual property rights</li>
              <li>Create spam, phishing content, or malware</li>
              <li>Circumvent usage limits or abuse the credit system</li>
              <li>Reverse engineer or attempt to extract AI models or source code</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
            <h3 className="text-xl font-medium text-white mb-3">Your Content</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You retain ownership of the original content you input (prompts, scripts, uploaded assets). For AI-generated content, you are granted a license to use the output for personal and commercial purposes, subject to the limitations of our AI providers&apos; terms.
            </p>
            <h3 className="text-xl font-medium text-white mb-3">Our Content</h3>
            <p className="text-gray-300 leading-relaxed">
              The Service, including its design, features, and technology, is owned by Life Focus, LLC and protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. AI-Generated Content Disclaimer</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              AI-generated content may contain errors, biases, or unexpected outputs. You are solely responsible for reviewing and approving all generated content before use. We do not guarantee the accuracy, appropriateness, or legal compliance of AI outputs.
            </p>
            <p className="text-gray-300 leading-relaxed">
              AI outputs are provided for your review and editorial control. <strong>You are solely responsible for any modifications, edits, overlays, re-voicing, or other alterations made to Service output using third-party applications or tools after export or download.</strong> SceneFlow does not monitor or control post-export use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. BYOK (Bring Your Own Keys)</h2>
            <p className="text-gray-300 leading-relaxed">
              If you use the BYOK feature with your own API keys, you are responsible for compliance with the terms of those third-party providers (Google, ElevenLabs, OpenAI, etc.). We are not liable for charges incurred on your personal API accounts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Voice Cloning & Consent Requirements</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Voice cloning is a restricted feature subject to additional requirements:
            </p>
            <h3 className="text-xl font-medium text-white mb-3">9.1 Voice Verification (&quot;Voice Captcha&quot;)</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              To create a voice clone, you must complete our Voice Captcha verification process, which requires a live recording of the voice owner speaking a randomized consent phrase. If the verification recording does not match the uploaded voice sample, the clone request will be rejected.
            </p>
            <h3 className="text-xl font-medium text-white mb-3">9.2 Consent Representation</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              By creating a voice clone, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li>You are the owner of the voice being cloned, OR</li>
              <li>You have obtained explicit written consent from the voice owner</li>
              <li>The voice owner has been informed of and consents to the intended use</li>
              <li>You will not use cloned voices for impersonation, fraud, or deception</li>
            </ul>
            <h3 className="text-xl font-medium text-white mb-3">9.3 Tiered Access</h3>
            <p className="text-gray-300 leading-relaxed">
              Voice cloning is available only to verified, paid accounts with established account history. New accounts are restricted to our curated Stock Voice library until they meet trust requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Content Moderation & Prohibited Content</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Content submitted to the Service is subject to layered moderation. All generation runs through Google Vertex AI safety filters. When the primary path is blocked by policy, Extended Creative Services with Guardrails may apply—with mandatory pre-storage review on alternate paths. Additional moderation and risk mitigation is available in Studio (informational validation signals). The following content is strictly prohibited:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li>Hate speech, discriminatory content, or content promoting violence</li>
              <li>Fraud scripts, scam content, or phishing material</li>
              <li>Political disinformation or election interference content</li>
              <li>Non-consensual impersonation of real individuals</li>
              <li>Content depicting or targeting minors in any harmful context</li>
              <li>Content designed to deceive recipients about the synthetic nature of the audio/video</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              Violation of content policies may result in immediate account termination and reporting to law enforcement where appropriate.
            </p>
            <h3 className="text-xl font-medium text-white mb-3 mt-6">10.1 Moderation Enforcement</h3>
            <p className="text-gray-300 leading-relaxed">
              The Service uses automated and manual enforcement, including violation strikes, temporary suspension, feature restrictions, and termination for cause. <strong>Repeated policy violations—including blocks on guarded generation paths and confirmed abuse—may result in enforcement action without refund.</strong> Full enforcement rules are in our{' '}
              <Link href="/trust-safety" className="text-purple-400 hover:text-purple-300">Trust &amp; Safety Policy</Link>, incorporated by reference.
            </p>
            <h3 className="text-xl font-medium text-white mb-3 mt-6">10.2 Generation Routing</h3>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow may route generation across multiple provider paths (including primary Google Vertex AI paths and alternate guarded paths) at its sole discretion. Routing does not guarantee successful generation. Alternate paths are subject to additional pre-storage review. You acknowledge that model availability, latency, and outputs may vary by path.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Audit Logging & Law Enforcement Cooperation</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We maintain comprehensive audit logs of all content generation activity, including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li>User ID and account information</li>
              <li>Prompts and scripts submitted</li>
              <li>Audio/video fingerprints of generated content</li>
              <li>Timestamps and voice identifiers used</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              These logs may be disclosed to law enforcement agencies upon valid legal request. Segment video may include SceneFlow provenance records (content hashes and signed metadata). Optional credentials embedding may apply when enabled. Provider-native watermarks may be present depending on upstream models.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Limitation of Liability</h2>
            <h3 className="text-xl font-medium text-white mb-3">12.1 Limitation of Liability</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCENEFLOW AI AND LIFE FOCUS, LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong>Service-Delivered Output Only.</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR OBLIGATIONS, WARRANTIES, AND LIABILITY RELATE ONLY TO CONTENT AS DELIVERED BY THE SERVICE AT THE TIME OF EXPORT OR DOWNLOAD. WE ARE NOT RESPONSIBLE FOR CLAIMS, HARM, OR LIABILITY ARISING FROM MODIFICATIONS, EDITS, COMBINATIONS, OR REPUBLICATION OF OUTPUT AFTER IT LEAVES THE SERVICE, INCLUDING VIA THIRD-PARTY EDITING OR PUBLISHING TOOLS (E.G., CAPCUT, ADOBE PREMIERE, SOCIAL PLATFORM EDITORS).
            </p>
            <h3 className="text-xl font-medium text-white mb-3">12.2 User Responsibility, Representations &amp; Indemnification</h3>
            <p className="text-gray-300 leading-relaxed">
              YOU ARE SOLELY RESPONSIBLE FOR ALL CONTENT YOU GENERATE, EXPORT, PUBLISH, OR DISTRIBUTE USING THE SERVICE, <strong>INCLUDING ANY SUBSEQUENT MODIFICATIONS, EDITS, OR ALTERATIONS YOU OR THIRD PARTIES MAKE AFTER EXPORT.</strong> You agree to indemnify, defend, and hold harmless Life Focus, LLC, its officers, directors, employees, and Merchant of Record partners from any claims, damages, losses, or legal actions arising from your content or its use, including defamation, copyright infringement, privacy violations, fraud, impersonation, and misrepresentation of the synthetic nature of media. <strong>You represent that you will not represent edited or composite content as unaltered Service output without clear disclosure to recipients.</strong> Provenance records and audit logs, where available, reflect Service-delivered state only. This indemnification is a material condition of your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may suspend or terminate your account at any time for violation of these terms, particularly violations of voice cloning consent requirements or content moderation policies. Upon termination, your right to use the Service ceases immediately. Unused credits are non-refundable upon termination for cause.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Without limiting our discretion, <strong>five (5) or more confirmed content-policy violations within a rolling twenty-four (24) hour period may result in temporary account suspension.</strong> Sustained or egregious violations—including attempts to circumvent moderation, guarded-path blocks, or consent requirements—may result in permanent termination for cause and forfeiture of unused subscription credits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update these terms at any time. Material changes will be notified via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Contact</h2>
            <p className="text-gray-300">
              <strong>Email:</strong> brian@sfai.studio<br />
              <strong>Website:</strong> https://sceneflowai.studio
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            See also: <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link> | <Link href="/trust-safety" className="text-purple-400 hover:text-purple-300">Trust & Safety</Link> | <Link href="/refunds" className="text-purple-400 hover:text-purple-300">Refund Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
