'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Clock, 
  GraduationCap,
  TrendingDown,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MousePointerClick,
  Sparkles,
  Brain,
  Calculator,
  FileText,
  Film,
  Users,
  Edit3,
  Volume2,
  Globe,
  Image,
  Video,
  Play,
  Share2,
  Download,
  Shield,
  Scissors,
  Layers,
  Upload,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import {
  COMPETITOR_TOOLS,
  AUTOMATION_FEATURES,
  SUBSCRIPTION_TIERS,
  calculateTimeSavings,
  calculateExpertiseValue,
  TOTAL_TOOL_LEARNING_HOURS,
} from '@/lib/credits/creditCosts';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'cost' | 'time' | 'expertise';
type ScenarioId = 'solo' | 'agency' | 'studio';

interface Scenario {
  id: ScenarioId;
  name: string;
  shortVideos: number;
  longVideos: number;
  avgScenes: number;
  avgDuration: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SCENARIOS: Scenario[] = [
  { id: 'solo', name: 'Solo Creator', shortVideos: 10, longVideos: 2, avgScenes: 10, avgDuration: 8 },
  { id: 'agency', name: 'Small Agency', shortVideos: 30, longVideos: 6, avgScenes: 15, avgDuration: 12 },
  { id: 'studio', name: 'Production Studio', shortVideos: 60, longVideos: 12, avgScenes: 20, avgDuration: 15 },
];

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Film, Users, Edit3, Volume2, Globe, Image, Video, Play, 
  Share2, Download, Shield, Scissors, Layers, Upload
};

// =============================================================================
// ANIMATED NUMBER COMPONENT
// =============================================================================

const AnimatedNumber = ({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 0.5 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  duration?: number;
}) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.span>
  );
};

// =============================================================================
// TAB BUTTON COMPONENT
// =============================================================================

const TabButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  label,
  color 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ElementType; 
  label: string;
  color: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
      active
        ? `bg-gradient-to-r ${color} text-white shadow-lg`
        : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// =============================================================================
// SCENARIO SELECTOR
// =============================================================================

const ScenarioSelector = ({
  selected,
  onChange
}: {
  selected: ScenarioId;
  onChange: (id: ScenarioId) => void;
}) => (
  <div className="flex justify-center gap-2 sm:gap-4 mb-8">
    {SCENARIOS.map((scenario) => (
      <button
        key={scenario.id}
        onClick={() => onChange(scenario.id)}
        className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
          selected === scenario.id
            ? 'bg-cyan-500 text-white'
            : 'bg-slate-800/50 text-gray-400 hover:text-white border border-slate-700/50'
        }`}
      >
        {scenario.name}
      </button>
    ))}
  </div>
);

// =============================================================================
// COST COMPARISON TAB
// =============================================================================

const CostTab = ({ scenario }: { scenario: Scenario }) => {
  const calculations = useMemo(() => {
    const totalVideos = scenario.shortVideos + scenario.longVideos;
    const totalScenes = totalVideos * scenario.avgScenes;
    const totalMinutes = totalVideos * scenario.avgDuration;
    
    // Individual tools costs
    const veoClips = totalScenes * 7; // ~7 segments per scene
    const veoCost = veoClips * 0.35;
    const imagenCost = totalScenes * 8 * 0.04; // 8 frames per scene
    const elevenLabsCost = 99; // subscription
    const sunoCost = 24;
    const topazCost = 19.99;
    const descriptCost = 24;
    const adobeCost = 59.99;
    const storageCost = (totalMinutes * 0.5) * 0.023; // 0.5GB per minute
    
    const totalIndividualCost = veoCost + imagenCost + elevenLabsCost + sunoCost + 
                                topazCost + descriptCost + adobeCost + storageCost;
    
    // SceneFlow cost
    const creditsNeeded = totalScenes * 3000; // ~3000 credits per scene
    let sceneflowTier = SUBSCRIPTION_TIERS.STARTER;
    let tierName = 'Starter';
    
    if (creditsNeeded > 75000) {
      sceneflowTier = SUBSCRIPTION_TIERS.STUDIO;
      tierName = 'Studio';
    } else if (creditsNeeded > 15000) {
      sceneflowTier = SUBSCRIPTION_TIERS.PRO;
      tierName = 'Pro';
    } else if (creditsNeeded > 4500) {
      sceneflowTier = SUBSCRIPTION_TIERS.STARTER;
      tierName = 'Starter';
    }
    
    const sceneflowCost = sceneflowTier.price;
    const savings = totalIndividualCost - sceneflowCost;
    const savingsPercent = (savings / totalIndividualCost) * 100;
    
    return {
      totalVideos,
      totalScenes,
      veoCost,
      imagenCost,
      elevenLabsCost,
      sunoCost,
      topazCost,
      descriptCost,
      adobeCost,
      storageCost,
      totalIndividualCost,
      sceneflowCost,
      tierName,
      creditsNeeded,
      savings,
      savingsPercent,
    };
  }, [scenario]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="grid md:grid-cols-2 gap-6"
    >
      {/* Individual Tools */}
      <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="w-5 h-5 text-red-400" />
          <h4 className="text-lg font-bold text-white">Individual Tool Stack</h4>
        </div>
        
        <div className="space-y-2 mb-4">
          {[
            { name: 'Google Veo 2', cost: calculations.veoCost },
            { name: 'Imagen 4', cost: calculations.imagenCost },
            { name: 'ElevenLabs Pro', cost: calculations.elevenLabsCost },
            { name: 'Suno Pro', cost: calculations.sunoCost },
            { name: 'Topaz Video AI', cost: calculations.topazCost },
            { name: 'Descript Pro', cost: calculations.descriptCost },
            { name: 'Adobe CC', cost: calculations.adobeCost },
            { name: 'Cloud Storage', cost: calculations.storageCost },
          ].map((tool, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-400">{tool.name}</span>
              <span className="text-red-400">${tool.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-red-500/20">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Monthly Total</span>
            <span className="text-2xl font-bold text-red-500">
              ${calculations.totalIndividualCost.toFixed(0)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">8 platforms to manage</p>
        </div>
      </div>

      {/* SceneFlow AI */}
      <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 relative">
        <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full">
          SAVE {calculations.savingsPercent.toFixed(0)}%
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h4 className="text-lg font-bold text-white">SceneFlow AI</h4>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <div className="text-sm text-emerald-300">{calculations.tierName} Plan</div>
            <div className="text-2xl font-bold text-emerald-400">
              ${calculations.sceneflowCost}/mo
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>{calculations.creditsNeeded.toLocaleString()} credits/mo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>All tools included</span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-emerald-500/20">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">You Save</span>
            <span className="text-2xl font-bold text-emerald-400">
              ${calculations.savings.toFixed(0)}/mo
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">One platform, one login</p>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// TIME SAVINGS TAB
// =============================================================================

const TimeTab = ({ scenario }: { scenario: Scenario }) => {
  const timeSavings = useMemo(() => {
    return calculateTimeSavings(scenario.avgScenes);
  }, [scenario]);

  const features = Object.entries(AUTOMATION_FEATURES).slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <Clock className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-400">{timeSavings.manualHours}h</div>
          <div className="text-xs text-gray-500">Manual Workflow</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-cyan-400">{timeSavings.automatedMinutes}m</div>
          <div className="text-xs text-gray-500">With SceneFlow</div>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
          <TrendingDown className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-emerald-400">{timeSavings.hoursSaved}h</div>
          <div className="text-xs text-gray-500">Time Saved</div>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
          <DollarSign className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-emerald-400">${timeSavings.hoursSaved * 100}</div>
          <div className="text-xs text-gray-500">Value @ $100/hr</div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {features.map(([key, feature]) => {
          const IconComponent = ICON_MAP[feature.icon] || Zap;
          return (
            <div 
              key={key}
              className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{feature.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-red-400 line-through">{feature.manualTime}m</span>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-emerald-400 font-medium">{feature.automatedTime}m</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-400">
          <MousePointerClick className="w-4 h-4 inline mr-1" />
          16 one-click automations replace hours of manual work
        </p>
      </div>
    </motion.div>
  );
};

// =============================================================================
// EXPERTISE TAB
// =============================================================================

const ExpertiseTab = () => {
  const expertise = calculateExpertiseValue();
  
  const skillsRequired = [
    { name: 'Video AI Prompting', hours: 40, level: 'Expert' },
    { name: 'Image AI Prompting', hours: 30, level: 'Expert' },
    { name: 'Audio Engineering', hours: 20, level: 'Intermediate' },
    { name: 'Video Editing', hours: 100, level: 'Expert' },
    { name: 'Screenwriting', hours: 60, level: 'Intermediate' },
    { name: 'Color Grading', hours: 40, level: 'Intermediate' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* The Problem */}
      <div className="bg-amber-500/5 rounded-2xl p-6 border border-amber-500/20 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-bold text-white mb-2">The Expertise Gap Problem</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              "I have a 140 IQ and I find the tool stack challenging and unsustainable. 
              Each platform requires mastering unique prompting techniques, file formats, 
              and workflows. The cognitive load is exhausting."
            </p>
            <p className="text-amber-400 text-xs mt-2 font-medium">— SceneFlow AI User</p>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Manual Stack Learning */}
        <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-red-400" />
            <h4 className="text-lg font-bold text-white">Manual Tool Stack</h4>
          </div>
          
          <div className="space-y-2 mb-4">
            {skillsRequired.map((skill, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{skill.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{skill.level}</span>
                  <span className="text-red-400">{skill.hours}h</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-red-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Learning Investment</span>
              <span className="text-xl font-bold text-red-400">{expertise.learningHours}+ hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Value @ $100/hr</span>
              <span className="text-xl font-bold text-red-400">${expertise.learningCostAt100PerHour.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* SceneFlow AI */}
        <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-emerald-400" />
            <h4 className="text-lg font-bold text-white">SceneFlow AI Co-Pilot</h4>
          </div>
          
          <div className="space-y-3 mb-4">
            {[
              'AI generates optimized prompts for you',
              'Professional direction guidance built-in',
              'Director & Audience review feedback',
              'Automated workflow orchestration',
              'No tool-switching or context loss',
              'Guardrails prevent costly mistakes',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-emerald-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Learning Required</span>
              <span className="text-xl font-bold text-emerald-400">~2 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Expertise Level</span>
              <span className="text-xl font-bold text-emerald-400">Built-in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Message */}
      <div className="text-center mt-8 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20">
        <Sparkles className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
        <p className="text-white font-medium">
          SceneFlow AI bridges the expertise gap
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Professional-quality output without years of tool mastery
        </p>
      </div>
    </motion.div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProductivityValueSection() {
  const [activeTab, setActiveTab] = useState<TabId>('cost');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('solo');
  
  const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;

  return (
    <section id="value-calculator" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)
            `
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
            <Calculator className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-emerald-300 text-sm font-medium">Value Calculator</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
            Calculate Your{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Total Savings
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Beyond cost savings—see how SceneFlow AI saves time and eliminates the expertise gap
          </p>
        </motion.div>

        {/* Scenario Selector */}
        <ScenarioSelector selected={selectedScenario} onChange={setSelectedScenario} />

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-8">
          <TabButton
            active={activeTab === 'cost'}
            onClick={() => setActiveTab('cost')}
            icon={DollarSign}
            label="Cost Savings"
            color="from-emerald-500 to-emerald-600"
          />
          <TabButton
            active={activeTab === 'time'}
            onClick={() => setActiveTab('time')}
            icon={Clock}
            label="Time Savings"
            color="from-cyan-500 to-cyan-600"
          />
          <TabButton
            active={activeTab === 'expertise'}
            onClick={() => setActiveTab('expertise')}
            icon={GraduationCap}
            label="Expertise Value"
            color="from-purple-500 to-purple-600"
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'cost' && <CostTab key="cost" scenario={scenario} />}
          {activeTab === 'time' && <TimeTab key="time" scenario={scenario} />}
          {activeTab === 'expertise' && <ExpertiseTab key="expertise" />}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full hover:from-emerald-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            Start Saving Today
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Start with $5 trial • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
