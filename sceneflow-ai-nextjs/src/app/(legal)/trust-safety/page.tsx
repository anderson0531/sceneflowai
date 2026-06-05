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
        <p className="text-gray-400 mb-8">Last updated: June 5, 2026</p>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Commitment to Responsible AI</h2>
            <p className="text-gray-300 leading-relaxed">
              SceneFlow AI uses industry-leading cloud providers for generation, and applies its own layered guardrails on top—not as a pass-through service. Our approach combines Google-native safety on every generation path, Extended Creative Services with Guardrails when policy limits apply, optional Studio content validation, and forensic provenance for segment video.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              This tiered model protects creators, reduces platform risk for our Merchant of Record operations, and maintains audit trails that support abuse investigations when required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-6">The Four Pillars of Our Guardrails</h2>
            
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">A. Consent &amp; Speaker Validation</h3>
                  <span className="text-xs text-red-400 font-medium">CRITICAL FEATURE</span>
                </div>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">Mechanism</h4>
                  <p>When creating a custom voice, the user must record themselves speaking a specific, randomized consent phrase. Speaker verification compares the consent recording to the uploaded voice sample.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-1">Guardrail</h4>
                  <p>If the voice in the consent recording does not match the uploaded sample, the clone request is rejected. Users cannot impersonate others without the person providing live consent.</p>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;Custom voice creation requires live consent validation and speaker verification before cloning is enabled.&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <FileSearch className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">B. Content Moderation &amp; Risk Mitigation</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-2">Tier 1 — Google-native safety (all generation)</h4>
                  <p>Image and video generation runs through Google Vertex AI safety filters with thresholds tuned for professional creative workflows. Text generation uses configurable harm-category thresholds on the primary Google path.</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-2">Tier 2 — Extended Creative Services with Guardrails</h4>
                  <p>When the primary Google path is blocked by policy after retries, SceneFlow may route to an alternate generation path. Content from that path undergoes mandatory pre-storage review before it is saved or delivered—subject to the same content standards.</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-2">Tier 3 — Additional moderation and risk mitigation (Studio)</h4>
                  <p>Creators may run content validation across Blueprint, script, storyboard, and segment video using the same credit model as other Studio tools. Validation surfaces policy and risk signals as informational warnings—it does not replace your editorial judgment or export review.</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Automated text screening for harmful or high-risk language</li>
                    <li>Visual content review for generated images and video</li>
                    <li>Optional copyright and likeness signals where enabled</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-1">Prohibited categories (custom voices)</h4>
                  <p>High-risk content categories receive stricter enforcement for custom voices, including hate speech, fraud scripts, political disinformation, non-consensual impersonation, and content targeting minors.</p>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;Layered moderation—from Google-native safety through guarded fallback review and optional Studio validation—helps creators ship responsibly while reducing platform risk.&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">C. Tiered Access (&quot;Trust Score&quot;)</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div className="space-y-3">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <h5 className="font-semibold text-white mb-2">Tier 1: New User</h5>
                    <p><span className="text-amber-300">Mechanism:</span> Access to curated stock voices only. Voice cloning is restricted for new accounts.</p>
                    <p><span className="text-amber-300">Guardrail:</span> High-risk features are gated to reduce burner-account abuse.</p>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <h5 className="font-semibold text-white mb-2">Tier 2: Verified User</h5>
                    <p><span className="text-amber-300">Mechanism:</span> Voice cloning unlocks after minimum account age, subscription eligibility, and trust-score requirements—including successful consent and speaker validation.</p>
                    <p><span className="text-amber-300">Guardrail:</span> Account history and payment verification before enabling cloning capabilities.</p>
                  </div>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;High-risk features sit behind a trust wall. Voice cloning requires eligibility, consent validation, and speaker verification.&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">D. Content Provenance &amp; Attribution</h3>
              </div>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="text-sm font-semibold text-pink-300 uppercase tracking-wide mb-1">Mechanism</h4>
                  <p>Successful segment video generations receive SceneFlow provenance records: a SHA-256 content hash, signed metadata (model source, user, project, timestamp), and optional in-file credentials embedding when enabled. Provider-native watermarks may also be present in generated media depending on the upstream model.</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-pink-300 uppercase tracking-wide mb-1">Guardrail</h4>
                  <p>Provenance and audit logs support tracing content back to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>The SceneFlow platform</li>
                    <li>The specific user account</li>
                    <li>The generation timestamp and model path</li>
                  </ul>
                </div>
                
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mt-4">
                  <p className="text-green-300 font-medium">
                    <span className="font-semibold">Trust Statement:</span> &quot;Segment video carries signed provenance metadata—supporting attribution investigations and platform accountability.&quot;
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Platform Risk &amp; Merchant of Record</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              SceneFlow operates shared responsibility with its Merchant of Record (Whop). Google provides provider-scale safety on generation; SceneFlow adds platform guardrails, content validation, provenance logging, violation strikes, account suspension, and abuse reporting.
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Moderation events:</strong> Validation runs and guarded-path blocks are logged for audit</li>
              <li><strong>Violation strikes:</strong> Repeated policy violations may trigger temporary suspension</li>
              <li><strong>Abuse reporting:</strong> Report concerns to abuse@sceneflowai.com — investigated within 24 hours</li>
            </ul>
          </section>

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
              We maintain audit logs of generation activity, including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li><strong>User ID:</strong> Account identifier linked to the generation</li>
              <li><strong>Prompt/Script:</strong> Input text used for generation</li>
              <li><strong>Content hash:</strong> Cryptographic fingerprint of segment video where provenance is recorded</li>
              <li><strong>Timestamp:</strong> Exact date and time of generation</li>
              <li><strong>Voice used:</strong> Whether stock or custom, with voice identifier</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              These logs may be disclosed to law enforcement upon valid legal request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Reporting Abuse</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you encounter content generated by SceneFlow AI that you believe violates our policies or is being used for malicious purposes, please report it immediately:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><strong>Email:</strong> abuse@sceneflowai.com</li>
              <li><strong>Include:</strong> URLs, screenshots, or media files if available</li>
              <li><strong>Response Time:</strong> We investigate all reports within 24 hours</li>
            </ul>
          </section>

          <section className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-xl p-6 border border-purple-700/50">
            <h2 className="text-2xl font-semibold text-white mb-4">Summary: SceneFlow AI Guardrails</h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Consent &amp; speaker validation:</strong> Custom voices require live consent recording and speaker verification.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Google-native safety:</strong> All generation runs through Google Vertex AI safety filters with production-tuned thresholds.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Extended Creative Services with Guardrails:</strong> Alternate generation paths require pre-storage review before delivery.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Additional moderation:</strong> Optional Studio content validation across project lifecycle stages.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Content provenance:</strong> Segment video receives signed hash metadata for forensic chain-of-custody.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold">✓</span>
                <p><strong>Liability &amp; audit:</strong> Users remain responsible for generated content; SceneFlow maintains audit logs to support lawful requests.</p>
              </div>
            </div>
          </section>

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
