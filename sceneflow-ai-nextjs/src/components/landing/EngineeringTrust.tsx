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
    description: 'Built on Google Cloud infrastructure with scalable orchestration for production workloads and growing teams.',
    highlights: [
      'Vertex AI for generation workflows',
      'Veo video synthesis',
      'Imagen image generation',
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
    description: 'Creative assets stay protected with encryption at rest, access controls, and privacy-first handling.',
    highlights: [
      'Enterprise-ready cloud controls',
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
    description: 'Global cloud delivery supports reliable render and review pipelines as your volume grows.',
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
  { value: 'Global', label: 'Cloud Regions', icon: Zap },
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
            Startup-friendly architecture with Google Cloud components that support security, scale, and practical production delivery.
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

        {/* Why Google Vertex AI? Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-12"
        >
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-900 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Why Google Vertex AI?</h3>
                <p className="text-sm text-gray-400">The technical moat that matters</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Data Privacy */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-semibold text-white">Data Privacy</h4>
                </div>
                <p className="text-sm text-gray-400">
                  Your scripts and creative assets are <span className="text-emerald-400 font-medium">not used to train shared models</span>, helping protect your IP and client work.
                </p>
              </div>
              
              {/* Enterprise Speed */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-white">Built for Reliable Throughput</h4>
                </div>
                <p className="text-sm text-gray-400">
                  Production-oriented infrastructure helps maintain stable generation workflows during high-demand cycles.
                </p>
              </div>
              
              {/* Frame-Anchored Precision */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-white">Reference-Aware Consistency</h4>
                </div>
                <p className="text-sm text-gray-400">
                  SceneFlow uses reference-aware generation to improve consistency across characters, locations, and props from scene to scene.
                </p>
              </div>
            </div>
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
              Powered by <span className="text-white font-medium">Google Cloud</span> with Vertex AI, Cloud Storage, and translation tooling
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-3 max-w-lg mx-auto">
            SceneFlow AI runs on scalable Google Cloud infrastructure designed for startup growth and enterprise expectations.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Google Startups application contact: <span className="text-gray-300">brian@sfai.studio</span>
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
