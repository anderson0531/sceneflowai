'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, Shield, HelpCircle, CreditCard, Scale } from 'lucide-react'

export default function ContactPage() {
  const contactChannels = [
    {
      icon: HelpCircle,
      title: 'General Support',
      email: 'support@sceneflowai.com',
      description: 'Help with using SceneFlow AI, technical issues, and feature questions.',
      responseTime: 'Within 24 hours',
      color: 'purple'
    },
    {
      icon: CreditCard,
      title: 'Billing & Subscriptions',
      email: 'billing@sceneflowai.com',
      description: 'Questions about payments, refunds, subscriptions, and credits.',
      responseTime: 'Within 24 hours',
      color: 'emerald'
    },
    {
      icon: Shield,
      title: 'Abuse Reporting',
      email: 'abuse@sceneflowai.com',
      description: 'Report misuse of our platform, content violations, or safety concerns.',
      responseTime: 'Within 12 hours',
      color: 'red'
    },
    {
      icon: Scale,
      title: 'Legal & Compliance',
      email: 'legal@sceneflowai.com',
      description: 'Legal inquiries, DMCA requests, data protection, and compliance matters.',
      responseTime: 'Within 48 hours',
      color: 'amber'
    },
    {
      icon: MessageSquare,
      title: 'Trust & Safety',
      email: 'trust@sceneflowai.com',
      description: 'Voice verification issues, account reviews, and trust-related inquiries.',
      responseTime: 'Within 24 hours',
      color: 'cyan'
    },
    {
      icon: Mail,
      title: 'General Inquiries',
      email: 'hello@sceneflowai.com',
      description: 'Partnerships, press inquiries, and general questions.',
      responseTime: 'Within 48 hours',
      color: 'blue'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', icon: 'text-purple-400', text: 'text-purple-300' },
      emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: 'text-emerald-400', text: 'text-emerald-300' },
      red: { bg: 'bg-red-500/20', border: 'border-red-500/30', icon: 'text-red-400', text: 'text-red-300' },
      amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: 'text-amber-400', text: 'text-amber-300' },
      cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: 'text-cyan-400', text: 'text-cyan-300' },
      blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: 'text-blue-400', text: 'text-blue-300' }
    }
    return colors[color] || colors.purple
  }

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
        
        <h1 className="text-4xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-gray-400 mb-8">We&apos;re here to help. Choose the right channel for your inquiry.</p>
        
        <div className="space-y-8">
          {/* Contact Cards */}
          <section className="grid gap-4 md:grid-cols-2">
            {contactChannels.map((channel) => {
              const Icon = channel.icon
              const colors = getColorClasses(channel.color)
              
              return (
                <div 
                  key={channel.email}
                  className={`bg-gray-800/50 rounded-xl p-6 border ${colors.border} hover:border-opacity-60 transition-all duration-200`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{channel.title}</h3>
                      <a 
                        href={`mailto:${channel.email}`}
                        className={`${colors.text} hover:underline text-sm font-medium`}
                      >
                        {channel.email}
                      </a>
                      <p className="text-gray-400 text-sm mt-2">{channel.description}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        Response time: {channel.responseTime}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Company Information */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Company Information</h2>
            <div className="space-y-3 text-gray-300">
              <p><strong className="text-gray-200">Company Name:</strong> SceneFlow AI Inc.</p>
              <p><strong className="text-gray-200">Website:</strong> sceneflowai.studio</p>
              <p><strong className="text-gray-200">Service:</strong> AI-Powered Video Production Platform</p>
            </div>
          </section>

          {/* Before You Contact */}
          <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Before You Contact Us</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Check our <Link href="#faq" className="text-purple-400 hover:underline">FAQ section</Link> for quick answers to common questions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>For billing questions, have your account email and transaction ID ready.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>For technical issues, include your browser, operating system, and steps to reproduce the issue.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Review our <Link href="/refunds" className="text-purple-400 hover:underline">Refund Policy</Link> before requesting a refund.</span>
              </li>
            </ul>
          </section>

          {/* Response Commitment */}
          <section className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl p-6 border border-purple-500/20">
            <h2 className="text-xl font-semibold text-white mb-3">Our Commitment</h2>
            <p className="text-gray-300">
              We aim to respond to all inquiries within the timeframes listed above. For urgent safety or abuse reports, 
              we prioritize faster response times. Your satisfaction and trust are our top priorities.
            </p>
          </section>

          {/* Related Policies */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Related Policies</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/privacy" className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm">
                Terms of Service
              </Link>
              <Link href="/trust-safety" className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm">
                Trust & Safety
              </Link>
              <Link href="/refunds" className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm">
                Refund Policy
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
