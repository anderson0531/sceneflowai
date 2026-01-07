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
  shortLabel,
  color 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ElementType; 
  label: string;
  shortLabel: string;
  color: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-300 ${
      active
        ? `bg-gradient-to-r ${color} text-white shadow-lg`
        : 'bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="sm:hidden text-xs">{shortLabel}</span>
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
    const veoCost = veoClips * 0.75; // Veo 3.1 Fast (720p) at ~$0.75 per 8s clip
    const imagenCost = totalScenes * 8 * 0.04; // 8 frames per scene
    const geminiCost = totalVideos * 0.50; // Gemini 3.0 Pro for script generation per project
    const elevenLabsCost = 99; // subscription
    const sunoCost = 24;
    const topazMinutes = Math.max(60, totalMinutes); // At least 60 minutes of upscaling
    const topazCost = 19.99 + (topazMinutes * 0.20); // Subscription + usage at ~$0.20/min
    const descriptCost = 24;
    const adobeCost = 59.99;
    const storageCost = (totalMinutes * 0.5) * 0.023; // 0.5GB per minute
    
    const totalIndividualCost = veoCost + imagenCost + geminiCost + elevenLabsCost + sunoCost + 
                                topazCost + descriptCost + adobeCost + storageCost;
    
    // SceneFlow cost - based on scenario type
    const creditsNeeded = totalScenes * 3000; // ~3000 credits per scene
    let sceneflowTier = SUBSCRIPTION_TIERS.PRO;
    let tierName = 'Pro';
    
    // Fixed tier mapping for consistent comparison
    if (scenario.id === 'studio') {
      sceneflowTier = SUBSCRIPTION_TIERS.STUDIO;
      tierName = 'Studio';
    } else if (scenario.id === 'agency') {
      sceneflowTier = SUBSCRIPTION_TIERS.PRO;
      tierName = 'Pro';
    } else {
      // Solo Creator uses Pro plan for meaningful content production
      sceneflowTier = SUBSCRIPTION_TIERS.PRO;
      tierName = 'Pro';
    }
    
    const sceneflowCost = sceneflowTier.price;
    const savings = totalIndividualCost - sceneflowCost;
    const savingsPercent = (savings / totalIndividualCost) * 100;
    
    return {
      totalVideos,
      totalScenes,
      veoCost,
      imagenCost,
      geminiCost,
      elevenLabsCost,
      sunoCost,
      topazCost,
      topazMinutes,
      descriptCost,
      adobeCost,
      storageCost,
      totalIndividualCost,
      sceneflowCost,
      tierName,
      tierCredits: sceneflowTier.credits,
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
            { name: 'Veo 3.1 Fast (720p)', cost: calculations.veoCost },
            { name: 'Imagen 4', cost: calculations.imagenCost },
            { name: 'Gemini 3.0 Pro', cost: calculations.geminiCost },
            { name: 'ElevenLabs Pro', cost: calculations.elevenLabsCost },
            { name: 'Suno Pro', cost: calculations.sunoCost },
            { name: `Topaz AI (${calculations.topazMinutes}min)`, cost: calculations.topazCost },
            { name: 'Descript Pro', cost: calculations.descriptCost },
            { name: 'Adobe CC', cost: calculations.adobeCost },
            { name: 'Cloud Storage', cost: calculations.storageCost },
          ].map((tool, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-400">{tool.name}</span>
              <span className="text-red-400">${tool.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-red-500/20">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Monthly Total</span>
            <span className="text-2xl font-bold text-red-500">
              ${Math.round(calculations.totalIndividualCost).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">9 platforms to manage</p>
        </div>
      </div>

      {/* SceneFlow AI */}
      <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 relative">
        <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-full">
          ALL-IN-ONE
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
              <span>{calculations.tierCredits.toLocaleString()} credits/mo</span>
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
              ${Math.round(calculations.savings).toLocaleString()}/mo
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">One platform, one login</p>
          <p className="text-xs text-gray-600 mt-1 italic">*Estimates based on published pricing</p>
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
// UI Optimized: Reduced padding, added gradient border, tightened spacing (v2.1)

export default function ProductivityValueSection() {
  const [activeTab, setActiveTab] = useState<TabId>('cost');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('solo');
  
  const scenario = SCENARIOS.find(s => s.id === selectedScenario)!;

  return (
    <section id="value-calculator" className="py-12 sm:py-16 lg:py-20 bg-slate-950 relative overflow-hidden border-t border-emerald-500/10">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, transparent 20%),
              radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.12) 0%, transparent 50%)
            `
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
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

        {/* At-a-Glance Value Summary */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Cost Savings Card */}
          <div 
            className="relative bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 pt-7 lg:p-6 lg:pt-8 border border-emerald-500/30 cursor-pointer hover:border-emerald-400/50 transition-all"
            onClick={() => setActiveTab('cost')}
          >
            <div className="absolute -top-3 right-4 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="text-emerald-300 text-sm font-medium mb-1">Potential Savings</div>
            <div className="text-4xl font-bold text-white mb-1">
              Significant
              <span className="text-lg text-emerald-400">*</span>
            </div>
            <div className="text-gray-400 text-sm">vs individual tool stack</div>
          </div>

          {/* Time Savings Card */}
          <div 
            className="relative bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-2xl p-5 pt-7 lg:p-6 lg:pt-8 border border-cyan-500/30 cursor-pointer hover:border-cyan-400/50 transition-all"
            onClick={() => setActiveTab('time')}
          >
            <div className="absolute -top-3 right-4 w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="text-cyan-300 text-sm font-medium mb-1">Reclaim</div>
            <div className="text-4xl font-bold text-white mb-1">
              Hours
              <span className="text-lg text-cyan-400">*</span>
            </div>
            <div className="text-gray-400 text-sm">with one-click automation</div>
          </div>

          {/* Expertise Value Card */}
          <div 
            className="relative bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl p-5 pt-7 lg:p-6 lg:pt-8 border border-purple-500/30 cursor-pointer hover:border-purple-400/50 transition-all"
            onClick={() => setActiveTab('expertise')}
          >
            <div className="absolute -top-3 right-4 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="text-purple-300 text-sm font-medium mb-1">Skip</div>
            <div className="text-4xl font-bold text-white mb-1">
              The
              <span className="text-lg text-purple-400"> learning curve</span>
            </div>
            <div className="text-gray-400 text-sm">with integrated AI tools</div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 sm:gap-3 lg:gap-4 mb-6">
          <TabButton
            active={activeTab === 'cost'}
            onClick={() => setActiveTab('cost')}
            icon={DollarSign}
            label="Cost Savings"
            shortLabel="Cost"
            color="from-emerald-500 to-emerald-600"
          />
          <TabButton
            active={activeTab === 'time'}
            onClick={() => setActiveTab('time')}
            icon={Clock}
            label="Time Savings"
            shortLabel="Time"
            color="from-cyan-500 to-cyan-600"
          />
          <TabButton
            active={activeTab === 'expertise'}
            onClick={() => setActiveTab('expertise')}
            icon={GraduationCap}
            label="Expertise Value"
            shortLabel="Skills"
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
          className="text-center mt-8 sm:mt-10"
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
            Start with Explorer • $9
          </p>
        </motion.div>
      </div>
    </section>
  );
}
