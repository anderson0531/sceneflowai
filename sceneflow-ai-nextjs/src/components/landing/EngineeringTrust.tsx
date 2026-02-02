'use client';

import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  Server, 
  Lock, 
  Globe, 
  Clock, 
  CheckCircle2,
  Cpu,
  Database,
  Cloud
} from 'lucide-react';
import Image from 'next/image';

const trustPillars = [
  {
    icon: Cpu,
    title: 'Enterprise Architecture',
    description: 'Built on Google Cloud\'s Vertex AI infrastructure with automatic scaling, load balancing, and 99.9% uptime SLA.',
    highlights: [
      'Vertex AI Gemini 3.0 Pro',
      'Veo 3 video synthesis',
      'Imagen 4 image generation',
      'ElevenLabs TTS integration'
    ],
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    iconColor: 'text-cyan-400'
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Your creative assets are protected with enterprise-grade security, encryption at rest, and strict data isolation.',
    highlights: [
      'SOC 2 Type II compliant infra',
      'AES-256 encryption',
      'GDPR-ready data handling',
      'No training on user content'
    ],
    gradient: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    iconColor: 'text-purple-400'
  },
  {
    icon: Globe,
    title: 'Scale & Reliability',
    description: 'Global edge network ensures fast renders regardless of location. Built to handle production workloads.',
    highlights: [
      'Multi-region deployment',
      'CDN-accelerated delivery',
      'Automatic failover',
      'Real-time monitoring'
    ],
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    iconColor: 'text-emerald-400'
  }
];

const metrics = [
  { value: '99.9%', label: 'Uptime SLA', icon: Server },
  { value: '<2s', label: 'Avg. API Latency', icon: Zap },
  { value: '256-bit', label: 'Encryption', icon: Lock },
  { value: '24/7', label: 'Monitoring', icon: Clock }
];

export function EngineeringTrust() {
  return (
    <section id="engineering" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <Shield className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-emerald-300 text-sm font-medium">Engineering & Security</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built for{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Production Workloads
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Enterprise-grade infrastructure trusted by professional creators who demand uptime, speed, and data security.
          </p>
        </motion.div>

        {/* Trust Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {trustPillars.map((pillar, index) => {
            const PillarIcon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-6 rounded-2xl ${pillar.bgColor} border ${pillar.borderColor} overflow-hidden`}
              >
                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${pillar.gradient} opacity-10 rounded-full blur-3xl`} />
                
                <div className="relative">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <PillarIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white mb-2">{pillar.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{pillar.description}</p>
                  
                  {/* Highlights */}
                  <ul className="space-y-2">
                    {pillar.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 ${pillar.iconColor} flex-shrink-0`} />
                        <span className="text-gray-300">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Metrics Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-2xl p-6 sm:p-8 border border-slate-700/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className="text-center">
                  <MetricIcon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-400">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Google Cloud Partnership */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Image 
              src="/images/google-cloud-logo.png" 
              alt="Google Cloud" 
              width={24} 
              height={24}
              className="opacity-90"
            />
            <span className="text-gray-300 text-sm">
              Powered by <span className="text-white font-medium">Google Cloud</span> Vertex AI
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-3 max-w-lg mx-auto">
            SceneFlow AI runs on Google's enterprise infrastructure, leveraging the same AI models used by Fortune 500 companies.
          </p>
        </motion.div>

        {/* Attribution */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-gray-500 text-sm italic">
            — The SceneFlow Engineering Team
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default EngineeringTrust;
