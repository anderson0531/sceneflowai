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
        <p className="text-gray-400 mb-8">Last updated: December 25, 2025</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using SceneFlow AI (&quot;Service&quot;), operated by SceneFlow AI Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow AI is an AI-powered filmmaking platform that enables users to create video content including scripts, storyboards, voice synthesis, and video generation. The Service uses artificial intelligence technologies from third-party providers including Google (Gemini, Imagen, Veo), ElevenLabs, and Shotstack.
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
              <li><strong>One-time Purchase Credits:</strong> Credits from packs (Trial, Basic Pack, Value Pack, Pro Pack) never expire</li>
              <li><strong>Payment Processing:</strong> Payments are processed by Paddle.com Market Limited as our Merchant of Record</li>
              <li><strong>Pricing:</strong> All prices are in USD and include applicable taxes calculated by Paddle</li>
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
              The Service, including its design, features, and technology, is owned by SceneFlow AI Inc. and protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. AI-Generated Content Disclaimer</h2>
            <p className="text-gray-300 leading-relaxed">
              AI-generated content may contain errors, biases, or unexpected outputs. You are solely responsible for reviewing and approving all generated content before use. We do not guarantee the accuracy, appropriateness, or legal compliance of AI outputs.
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
              All content submitted to the Service, particularly scripts for voice synthesis, is subject to automated content moderation. The following content is strictly prohibited:
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
              These logs may be disclosed to law enforcement agencies upon valid legal request. All generated content carries forensic watermarks enabling content attribution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCENEFLOW AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
            <h3 className="text-xl font-medium text-white mb-3">User Liability for Generated Content</h3>
            <p className="text-gray-300 leading-relaxed">
              YOU ARE SOLELY RESPONSIBLE FOR ALL CONTENT YOU GENERATE USING THE SERVICE. By using SceneFlow AI, you agree to indemnify and hold harmless SceneFlow AI Inc. from any claims, damages, or legal actions arising from your use of generated content, including but not limited to claims of defamation, copyright infringement, privacy violations, or fraud. This liability transfer is a material condition of your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may suspend or terminate your account at any time for violation of these terms, particularly violations of voice cloning consent requirements or content moderation policies. Upon termination, your right to use the Service ceases immediately. Unused credits are non-refundable upon termination for cause.
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
              These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Contact</h2>
            <p className="text-gray-300">
              <strong>Email:</strong> legal@sceneflowai.com<br />
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
