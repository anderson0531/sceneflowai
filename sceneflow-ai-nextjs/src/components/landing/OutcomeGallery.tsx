'use client';

import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

const DemoVideo = ({ title, delay }) => (
  <motion.div
    className="group relative"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <div className="aspect-video bg-slate-800 rounded-lg border-2 border-white/10 overflow-hidden">
      {/* Placeholder for video thumbnail */}
    </div>
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <PlayCircle className="w-16 h-16 text-white" />
    </div>
    <h4 className="mt-4 text-lg font-semibold text-white text-center">{title}</h4>
  </motion.div>
);

export function OutcomeGallery() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">See the Results</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <DemoVideo title="The 10-Minute Real Estate Tour" delay={0.2} />
          <DemoVideo title="Automated HR Training Series" delay={0.4} />
          <DemoVideo title="Indie Film: Character Continuity Test" delay={0.6} />
        </div>
      </div>
    </section>
  );
}
