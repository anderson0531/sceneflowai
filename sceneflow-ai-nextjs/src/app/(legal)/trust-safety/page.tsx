'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Mic, FileSearch, Users, Fingerprint } from 'lucide-react'

export default function TrustSafetyPage() {
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
        
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl font-bold text-white">Trust & Safety Policy</h1>
        </div>
        <p className="text-gray-400 mb-8">Last updated: December 28, 2025</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Commitment to Responsible AI</h2>
            <p className="text-gray-300 leading-relaxed">
              We understand the concerns regarding Generative AI risks. While we utilize industry-leading providers (ElevenLabs, Google) who have their own safety layers, SceneFlow AI enforces its own strict application-level guardrails to prevent misuse before it ever reaches our upstream providers.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              SceneFlow AI operates as an active gatekeeper—not a pass-through service. Our Compliance Layer sits between users and AI providers, implementing multiple safeguards to ensure responsible use of generative AI technology.
            </p>
          </section>

          {/* The Four Pillars */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6">The Four Pillars of Our Guardrails</h2>
            
            {/* Pillar A: Voice Verification */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">A. Identity Verification (&quot;Voice Captcha&quot;)</h3>
                  <span className="text-xs text-red-400 font-medium">CRITICAL FEATURE</span>
                </div>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">Mechanism</h4>
                  <p>We use ElevenLabs&apos; Voice Verification technology. When creating a voice clone, the user must record themselves speaking a specific, randomized prompt (e.g., &quot;I, [User Name], consent to having my voice cloned by SceneFlow&quot;).</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">Guardrail</h4>
                  <p>If the voice in the consent prompt doesn&apos;t match the voice in the uploaded sample, the clone request is automatically rejected. Users cannot impersonate others without physical access to the person.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">Goal</h4>
                  <p>Prove users can only clone their own voices or voices they have explicit rights to use.</p>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;We enforce biometric verification on all voice clones. Users cannot impersonate others without physical access to the person providing live consent.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar B: Content Moderation */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <FileSearch className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">B. Content Moderation (Input Scanning)</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-1">Mechanism</h4>
                  <p>All text content is processed through our moderation layer before being sent to voice synthesis providers. This includes integration with content moderation APIs and keyword filtering systems.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-1">Guardrail</h4>
                  <p>High-risk content categories are blocked specifically for Custom/Cloned voices:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Hate speech and discriminatory content</li>
                    <li>Fraud-related terminology and scam scripts</li>
                    <li>Political disinformation and election interference content</li>
                    <li>Impersonation of public figures</li>
                    <li>Content depicting or targeting minors</li>
                  </ul>
                  <p className="mt-2">Standard (&quot;Stock&quot;) voices have more lenient restrictions as they present lower impersonation risk.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-1">Goal</h4>
                  <p>Formalize content review to prevent deepfake abuse and misuse of synthesized voices.</p>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;We pre-scan all scripts assigned to custom voices to prevent deepfake abuse. Prohibited content is blocked before it ever reaches our AI providers.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar C: Tiered Access */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">C. Tiered Access (&quot;Trust Score&quot;)</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wide mb-2">Access Tiers</h4>
                
                <div className="space-y-3">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <h5 className="font-semibold text-white mb-2">Tier 1: New User</h5>
                    <p><span className="text-amber-300">Mechanism:</span> Can only use our curated &quot;Golden Set&quot; of Stock Voices from ElevenLabs.</p>
                    <p><span className="text-amber-300">Guardrail:</span> High-risk features (voice cloning) are restricted for new accounts, eliminating quick &quot;burner account&quot; abuse.</p>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <h5 className="font-semibold text-white mb-2">Tier 2: Verified/Paid User</h5>
                    <p><span className="text-amber-300">Mechanism:</span> Can access Voice Cloning after a minimum 7-day account age or after manual review of their project by our Trust & Safety team.</p>
                    <p><span className="text-amber-300">Guardrail:</span> Payment verification and account history review before enabling cloning capabilities.</p>
                  </div>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;High-risk features are behind a &apos;Trust Wall.&apos; We manually review account standing before enabling voice cloning, eliminating &apos;burner account&apos; abuse.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar D: Watermarking */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">D. Watermarking & Attribution</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-pink-300 uppercase tracking-wide mb-1">Mechanism</h4>
                  <p>All generated audio includes forensic watermarking through ElevenLabs&apos; Audio Native technology. Video content utilizes Google&apos;s SynthID invisible watermarking for AI-generated media.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-pink-300 uppercase tracking-wide mb-1">Guardrail</h4>
                  <p>If a piece of audio or video content leaks or is used maliciously, it can be traced back to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>The SceneFlow platform</li>
                    <li>The specific user account</li>
                    <li>The exact generation timestamp</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-pink-300 uppercase tracking-wide mb-1">Goal</h4>
                  <p>Enable rapid identification and banning of bad actors while supporting law enforcement investigations when required.</p>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;All generated audio and video carries forensic watermarks, allowing us to trace and ban bad actors instantly.&quot;
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Liability & Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Liability & Compliance</h2>
            
            <h3 className="text-xl font-medium text-white mb-3">Liability Shielding</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our Terms of Service explicitly transfer liability for generated content to the user. Users agree that they are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-6">
              <li>The content of prompts and scripts submitted to the platform</li>
              <li>How generated content is used, distributed, or published</li>
              <li>Ensuring they have rights to clone any voices they upload</li>
              <li>Compliance with applicable laws in their jurisdiction</li>
            </ul>
            
            <h3 className="text-xl font-medium text-white mb-3">Audit Logging</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We maintain comprehensive audit logs of every generation, including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li><strong>User ID:</strong> Account identifier linked to the generation</li>
              <li><strong>Prompt/Script:</strong> The input text used for generation</li>
              <li><strong>Audio Fingerprint:</strong> Unique identifier for the generated content</li>
              <li><strong>Timestamp:</strong> Exact date and time of generation</li>
              <li><strong>Voice Used:</strong> Whether stock or cloned, with voice identifier</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              These logs are retained to assist law enforcement if requested, support content attribution investigations, and enable rapid response to abuse reports.
            </p>
          </section>

          {/* Reporting Abuse */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Reporting Abuse</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you encounter content generated by SceneFlow AI that you believe violates our policies or is being used for malicious purposes, please report it immediately:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Email:</strong> abuse@sceneflowai.com</li>
              <li><strong>Include:</strong> URLs, screenshots, or audio/video files if available</li>
              <li><strong>Response Time:</strong> We investigate all reports within 24 hours</li>
            </ul>
          </section>

          {/* Summary for Partners */}
          <section className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-2xl font-semibold text-white mb-4">Summary: SceneFlow AI Guardrails</h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Non-Consensual Cloning Block:</strong> We mandate &quot;Voice Captcha&quot; verification. Users cannot clone a voice without a live recording of that person giving consent.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Input Moderation:</strong> We use an intermediate AI layer to scan scripts for prohibited content (fraud, hate speech) before audio generation is permitted.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Tiered Access:</strong> Voice Cloning is a restricted feature available only to verified, paid accounts—eliminating &quot;burner account&quot; abuse.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Forensic Watermarking:</strong> All generated content carries invisible watermarks for traceability and attribution.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Liability Shielding:</strong> Our ToS explicitly transfers liability for generated content to the user, and we maintain audit logs (User ID + Prompt + Audio Fingerprint) to assist law enforcement if requested.</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Our Trust & Safety Team</h2>
            <p className="text-gray-300">
              <strong>Trust & Safety:</strong> trust@sceneflowai.com<br />
              <strong>Abuse Reports:</strong> abuse@sceneflowai.com<br />
              <strong>Legal Inquiries:</strong> legal@sceneflowai.com<br />
              <strong>Website:</strong> https://sceneflowai.studio
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            See also: <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link> | <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link> | <Link href="/refunds" className="text-purple-400 hover:text-purple-300">Refund Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
