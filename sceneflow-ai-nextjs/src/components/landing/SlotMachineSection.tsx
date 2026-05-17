'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SlotMachineSection() {
  return (
    <section id="comparison" className="py-20 sm:py-28 bg-gray-950 overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)] border border-cyan-500/20"
          >
            <img 
              src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Gemini_Generated_Image_y6ocnvy6ocnvy6oc.jpeg" 
              alt="Remove production cost and time barriers. Traditional production overhead vs SceneFlow speed."
              className="w-full h-auto object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
