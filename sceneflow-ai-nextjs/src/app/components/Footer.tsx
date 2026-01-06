'use client'

import { Mail, Twitter, Linkedin, Github, ExternalLink } from 'lucide-react'

export function Footer() {
  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'FAQ', href: '#faq' }
    ],
    resources: [
      { name: 'Getting Started', href: '#how-it-works' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'FAQ', href: '#faq' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Trust & Safety', href: '/trust-safety' },
      { name: 'Refund Policy', href: '/refunds' },
      { name: 'Contact Us', href: '/contact' }
    ]
  }

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
    { name: 'GitHub', icon: Github, href: '#' },
    { name: 'Email', icon: Mail, href: 'mailto:hello@sceneflowai.com' }
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t border-gray-800 py-16 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center mb-6">
              <span className="text-2xl font-bold text-white">
                SceneFlow AI
              </span>
            </div>
            <p className="text-gray-400 max-w-md mb-6">
              Transform your ideas into published video with AI-powered filmmaking. 
              From script to screening room—the future of video production is here.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                    target={social.href.startsWith('http') ? '_blank' : undefined}
                    rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>
          
          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith('#') ? (
                    <button
                      onClick={() => scrollToSection(link.href.slice(1))}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm flex items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Resources Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  {link.href.startsWith('#') ? (
                    <button
                      onClick={() => scrollToSection(link.href.slice(1))}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Tagline Banner */}
        <div className="border-t border-gray-800 mt-12 pt-10">
          <div className="text-center mb-8">
            <p className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Made with ❤️ for creators
            </p>
            <p className="text-gray-500 mt-2">From Idea to Published Video</p>
          </div>
          
          {/* Payment & Compliance Notice */}
          <div className="flex flex-col items-center gap-3 pt-6 border-t border-gray-800/50 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-400">Secure payments processed by our authorized Merchant of Record</span>
            </div>
            <p className="text-xs text-gray-500 text-center max-w-lg">
              All payments, tax calculation, and compliance are handled by our payment partner on behalf of SceneFlow AI.
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-gray-800/50">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">
                © 2025 SceneFlow AI. All rights reserved.
              </p>
              {/* Business Address - Required for payment processor compliance */}
              <p className="text-gray-600 text-xs mt-1">
                Life Focus, LLC • 7435 Paradiso Drive, Apollo Beach FL 33572 • Contact: support@sceneflowai.studio
              </p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded flex items-center justify-center">
                  <span className="text-xs font-bold bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">G</span>
                </div>
                <span className="text-xs text-gray-400">Powered by Google Cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
