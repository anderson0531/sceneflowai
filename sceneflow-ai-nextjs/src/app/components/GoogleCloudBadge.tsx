'use client';

import { motion } from 'framer-motion';
import { Cloud, Sparkles, Video, ImageIcon, Brain, Cpu } from 'lucide-react';

export function GoogleCloudBadge() {
  const googleServices = [
    { name: 'Veo 3', description: 'Video Generation', icon: Video },
    { name: 'Imagen 4', description: 'Image Creation', icon: ImageIcon },
    { name: 'Gemini 2.5', description: 'AI Intelligence', icon: Brain },
  ];

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-y border-blue-500/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/10 via-red-500/10 to-yellow-500/10 border border-white/10 rounded-full mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">G</span>
              </div>
              <span className="text-white font-semibold text-lg">Powered by Google Cloud</span>
            </div>
          </div>
          
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Built on Google&apos;s Most Advanced AI
          </h3>
          <p className="text-gray-400 max-w-2xl mx-auto">
            SceneFlow AI is the commercial showcase for Google&apos;s generative AI video capabilities. 
            Our success directly validates Veo 3, Imagen 4, and Gemini 2.5 as production-ready creative tools.
          </p>
        </motion.div>

        {/* Google Services Grid */}
        <div className="grid md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {googleServices.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:border-blue-500/40 transition-all">
                  <service.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{service.name}</h4>
                  <p className="text-sm text-gray-400">{service.description}</p>
                </div>
              </div>
              
              {/* Subtle Google Colors Accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl" />
            </motion.div>
          ))}
        </div>

        {/* Infrastructure Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center items-center gap-3 text-sm text-gray-500"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Cloud Run</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Cpu className="w-4 h-4 text-green-400" />
            <span>Vertex AI</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Cloud Storage</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
