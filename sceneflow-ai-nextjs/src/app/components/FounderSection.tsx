'use client';

import { motion } from 'framer-motion';
import { Linkedin, Mail, Award, Building2, GraduationCap, Cloud, Zap } from 'lucide-react';

export function FounderSection() {
  const highlights = [
    {
      icon: Cloud,
      title: '6 Years at AWS',
      description: 'Services Business Development Leader & Practice Manager',
    },
    {
      icon: Building2,
      title: 'Enterprise Scale',
      description: 'Led national consulting practices for State & Local Government',
    },
    {
      icon: Award,
      title: 'Award-Winning',
      description: '2010 Community Broadband Wireless Network of the Year',
    },
    {
      icon: GraduationCap,
      title: 'Advanced Education',
      description: 'MS Organizational Dynamics (Penn) • BS IT (Drexel)',
    },
  ];

  return (
    <section id="team" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
            <Zap className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-purple-300 text-sm font-medium">Leadership</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built by an{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Enterprise Cloud Veteran
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            30+ years of technology leadership, now focused on democratizing professional video production
          </p>
        </motion.div>

        {/* Founder Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/10 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20">
                    <span className="text-4xl sm:text-5xl font-bold text-white">BA</span>
                  </div>
                  {/* AWS Badge */}
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center border-2 border-slate-900 shadow-lg">
                    <Cloud className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                {/* Name & Title */}
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Brian Anderson</h3>
                  <p className="text-cyan-400 font-medium mb-2">Founder & CEO</p>
                  <p className="text-gray-400 text-sm">Life Focus, LLC</p>
                  
                  {/* Social Links */}
                  <div className="flex justify-center sm:justify-start gap-3 mt-4">
                    <a
                      href="https://linkedin.com/in/yourprofile"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-slate-700/50 hover:bg-blue-600/50 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all border border-slate-600/50 hover:border-blue-500/50"
                      aria-label="LinkedIn Profile"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a
                      href="mailto:support@sceneflowai.studio"
                      className="w-10 h-10 bg-slate-700/50 hover:bg-cyan-600/50 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all border border-slate-600/50 hover:border-cyan-500/50"
                      aria-label="Email Contact"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-8">
                <p className="text-gray-300 leading-relaxed">
                  Brian is a veteran technology leader with <span className="text-white font-medium">30+ years of experience</span> specializing 
                  in IT transformation and large-scale systems architecture. Most recently, he spent 6 years at 
                  <span className="text-orange-400 font-medium"> Amazon Web Services (AWS)</span> as a Services Business Development 
                  Leader and Practice Manager, where he led national consulting practices for State and Local Government, 
                  driving cloud adoption and digital transformation strategies for enterprise-level customers.
                </p>
                <p className="text-gray-300 leading-relaxed mt-4">
                  Prior to AWS, Brian served as a Principal Consultant for the City of Houston, where he designed and directed 
                  the implementation of the <span className="text-cyan-400 font-medium">world&apos;s largest municipal wireless broadband network</span>—a 
                  project recognized as the 2010 Community Broadband Wireless Network of the Year.
                </p>
                <p className="text-gray-300 leading-relaxed mt-4">
                  He holds a Master of Science in Organizational Dynamics from the University of Pennsylvania and a BS in IT from Drexel University.
                  With SceneFlow AI, Brian is leveraging his deep expertise in cloud-native architecture and AI-powered 
                  productivity to <span className="text-purple-400 font-medium">democratize professional video production</span>.
                </p>
              </div>

              {/* Highlights Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{item.title}</h4>
                      <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vision Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12 max-w-3xl mx-auto"
        >
          <blockquote className="text-xl sm:text-2xl text-gray-300 italic">
            &ldquo;SceneFlow AI is the commercial showcase for Google&apos;s generative AI video capabilities. 
            Our success directly validates Veo 3, Imagen 4, and Gemini 2.5 as production-ready creative tools.&rdquo;
          </blockquote>
          <p className="text-gray-500 mt-4">— Brian Anderson, Founder</p>
        </motion.div>
      </div>
    </section>
  );
}
