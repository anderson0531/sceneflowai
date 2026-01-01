#!/usr/bin/env node
/**
 * FastSpring Compliance Check Script
 * 
 * Automated assessment tool for payment processor application readiness.
 * Run with: npm run compliance-check
 * 
 * Checks:
 * 1. Business address presence in Footer
 * 2. Required legal pages exist
 * 3. Marketing claim patterns
 * 4. Demo asset compliance
 * 5. Bot accessibility configuration
 * 6. AI Guardrails implementation (4 Pillars)
 * 7. Approval probability calculation
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const RISK = {
  LOW: `${colors.green}🟢 LOW${colors.reset}`,
  MEDIUM: `${colors.yellow}🟡 MEDIUM${colors.reset}`,
  HIGH: `${colors.red}🔴 HIGH${colors.reset}`
};

const STATUS = {
  PASS: `${colors.green}✅ PASS${colors.reset}`,
  WARN: `${colors.yellow}⚠️  WARN${colors.reset}`,
  FAIL: `${colors.red}❌ FAIL${colors.reset}`
};

// Configuration - Fixed paths
const SRC_DIR = path.join(__dirname, '..', 'src');
const APP_DIR = path.join(SRC_DIR, 'app');
const COMPONENTS_DIR = path.join(APP_DIR, 'components');
const LANDING_COMPONENTS_DIR = path.join(SRC_DIR, 'components', 'landing');
const LIB_DIR = path.join(SRC_DIR, 'lib');
const SERVICES_DIR = path.join(LIB_DIR, 'services');

// Track results
const results = {
  passed: 0,
  warnings: 0,
  failed: 0,
  checks: [],
  guardrails: { passed: 0, total: 0 }
};

function log(message) {
  console.log(message);
}

function logHeader(title) {
  log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

function logSection(title) {
  log(`\n${colors.bold}▸ ${title}${colors.reset}`);
  log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
}

function addResult(category, check, status, risk, notes) {
  results.checks.push({ category, check, status, risk, notes });
  if (status === STATUS.PASS) results.passed++;
  else if (status === STATUS.WARN) results.warnings++;
  else results.failed++;
  
  log(`  ${status} ${check}`);
  if (notes) log(`       ${colors.dim}${notes}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// ============================================================================
// CHECK 1: Business Address
// ============================================================================
function checkBusinessAddress() {
  logSection('Business Legitimacy');
  
  const footerPath = path.join(COMPONENTS_DIR, 'Footer.tsx');
  const content = readFile(footerPath);
  
  if (!content) {
    addResult('Business', 'Footer.tsx exists', STATUS.FAIL, RISK.HIGH, 'File not found');
    return;
  }
  
  // Check for placeholder text
  const hasPlaceholder = content.includes('[Virtual Office Address - Coming Soon]') ||
                         content.includes('Coming Soon') ||
                         content.includes('[Address]');
  
  // Check for actual address pattern (basic check for street address format)
  const addressPattern = /\d+\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Suite|Ste)/i;
  const hasRealAddress = addressPattern.test(content);
  
  if (hasPlaceholder) {
    addResult('Business', 'Physical business address', STATUS.FAIL, RISK.HIGH, 
      'Still showing placeholder "[Virtual Office Address - Coming Soon]"');
  } else if (hasRealAddress) {
    addResult('Business', 'Physical business address', STATUS.PASS, RISK.LOW, 
      'Valid address format detected');
  } else {
    addResult('Business', 'Physical business address', STATUS.WARN, RISK.MEDIUM, 
      'Address may not be in standard format');
  }
}

// ============================================================================
// CHECK 2: Required Legal Pages
// ============================================================================
function checkLegalPages() {
  logSection('Legal Pages');
  
  const legalDir = path.join(APP_DIR, '(legal)');
  
  const requiredPages = [
    { name: 'Privacy Policy', path: 'privacy/page.tsx' },
    { name: 'Terms of Service', path: 'terms/page.tsx' },
    { name: 'Refund Policy', path: 'refunds/page.tsx' },
    { name: 'Trust & Safety', path: 'trust-safety/page.tsx' },
    { name: 'Contact', path: 'contact/page.tsx' }
  ];
  
  for (const page of requiredPages) {
    const pagePath = path.join(legalDir, page.path);
    if (fileExists(pagePath)) {
      addResult('Legal', page.name, STATUS.PASS, RISK.LOW, null);
    } else {
      addResult('Legal', page.name, STATUS.FAIL, RISK.HIGH, `Missing: ${page.path}`);
    }
  }
}

// ============================================================================
// CHECK 3: Marketing Claims
// ============================================================================
function checkMarketingClaims() {
  logSection('Marketing Claims Compliance');
  
  // Patterns that indicate risky marketing claims
  const riskyPatterns = [
    { pattern: /\$\d{1,3},?\d{3}.*(?:month|year|income|earn|make|save)/gi, name: 'Dollar income claims', risk: RISK.HIGH },
    { pattern: /save\s+[3-9]\d%|save\s+\d{3}%/gi, name: 'High percentage savings (30%+)', risk: RISK.HIGH },
    { pattern: /faceless\s+channel/gi, name: '"Faceless channel" language', risk: RISK.HIGH },
    { pattern: /passive\s+income/gi, name: 'Passive income claims', risk: RISK.HIGH },
    { pattern: /get\s+rich/gi, name: 'Get rich claims', risk: RISK.HIGH },
    { pattern: /guaranteed|promise/gi, name: 'Guarantee language', risk: RISK.MEDIUM },
    { pattern: /\d+\+?\s*(creators|users|customers)\s+trust/gi, name: 'Unverified user counts', risk: RISK.MEDIUM },
    { pattern: /viral|millions\s+of\s+views/gi, name: 'Viral success claims', risk: RISK.MEDIUM }
  ];
  
  // Note: "Save 17%" for annual billing is acceptable industry practice
  
  // Files to scan
  const filesToScan = [
    'HeroSection.tsx',
    'Pricing.tsx',
    'FAQ.tsx',
    'ProductivityValueSection.tsx',
    'OneTakeSection.tsx',
    'SlotMachineSection.tsx',
    'FrameAnchoredSection.tsx',
    'TestimonialsSection.tsx',
    'FinancialFirewallSection.tsx'
  ];
  
  let issuesFound = 0;
  
  for (const file of filesToScan) {
    const filePath = path.join(COMPONENTS_DIR, file);
    const content = readFile(filePath);
    
    if (!content) continue;
    
    for (const { pattern, name, risk } of riskyPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issuesFound++;
        addResult('Marketing', `${name} in ${file}`, STATUS.FAIL, risk, 
          `Found: "${matches[0]}"`);
      }
    }
  }
  
  if (issuesFound === 0) {
    addResult('Marketing', 'No risky marketing claims detected', STATUS.PASS, RISK.LOW, null);
  }
}

// ============================================================================
// CHECK 4: Demo Assets
// ============================================================================
function checkDemoAssets() {
  logSection('Demo Asset Compliance');
  
  const videoComponents = [
    { file: 'HeroSection.tsx', dir: COMPONENTS_DIR, name: 'Hero Video' },
    { file: 'OneTakeSection.tsx', dir: LANDING_COMPONENTS_DIR, name: 'One Take Video' },
    { file: 'SlotMachineSection.tsx', dir: LANDING_COMPONENTS_DIR, name: 'Slot Machine Video' },
    { file: 'FrameAnchoredSection.tsx', dir: LANDING_COMPONENTS_DIR, name: 'Frame Anchored Video' },
    { file: 'FinancialFirewallSection.tsx', dir: LANDING_COMPONENTS_DIR, name: 'Financial Firewall Video' }
  ];
  
  for (const { file, dir, name } of videoComponents) {
    const filePath = path.join(dir, file);
    const content = readFile(filePath);
    
    if (!content) {
      addResult('Assets', name, STATUS.WARN, RISK.MEDIUM, `File not found: ${file}`);
      continue;
    }
    
    // Check for placeholder comments or hidden videos
    const hasPlaceholder = content.includes('TEMPORARILY HIDDEN') || 
                           content.includes('placeholder') ||
                           content.includes('Coming Soon');
    
    // Check for video elements
    const hasActiveVideo = /<video[^>]*src=/.test(content) && !content.includes('{/* <video');
    
    // Check for potentially problematic content references
    const hasAvatarRef = /avatar/i.test(content);
    const hasMovieRef = /(movie|film|hollywood)/i.test(content) && !content.includes('filmmakers');
    
    if (hasPlaceholder) {
      addResult('Assets', name, STATUS.WARN, RISK.MEDIUM, 'Using placeholder - needs compliant asset');
    } else if (hasAvatarRef || hasMovieRef) {
      addResult('Assets', name, STATUS.WARN, RISK.MEDIUM, 'May contain copyrighted references');
    } else if (hasActiveVideo) {
      addResult('Assets', name, STATUS.PASS, RISK.LOW, 'Video present - verify compliance');
    } else {
      addResult('Assets', name, STATUS.PASS, RISK.LOW, 'No video element found');
    }
  }
}

// ============================================================================
// CHECK 5: Pricing Transparency
// ============================================================================
function checkPricingTransparency() {
  logSection('Pricing Transparency');
  
  const pricingPath = path.join(COMPONENTS_DIR, 'Pricing.tsx');
  const content = readFile(pricingPath);
  
  if (!content) {
    addResult('Pricing', 'Pricing.tsx exists', STATUS.FAIL, RISK.HIGH, 'File not found');
    return;
  }
  
  // Check for clear pricing display - look for price patterns
  const hasPrices = /monthlyPrice|annualPrice|\$\d+/.test(content);
  const hasCredits = /credits?/i.test(content);
  const hasRefundMention = /refund|money.?back/i.test(content);
  
  if (hasPrices) {
    addResult('Pricing', 'Clear price display', STATUS.PASS, RISK.LOW, 'Pricing tiers defined');
  } else {
    addResult('Pricing', 'Clear price display', STATUS.FAIL, RISK.HIGH, 'No prices found');
  }
  
  if (hasCredits) {
    addResult('Pricing', 'Credit system explained', STATUS.PASS, RISK.LOW, null);
  } else {
    addResult('Pricing', 'Credit system explained', STATUS.WARN, RISK.MEDIUM, 'Credit system not clear');
  }
}

// ============================================================================
// CHECK 6: Bot Accessibility
// ============================================================================
function checkBotAccessibility() {
  logSection('Technical Compliance');
  
  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  const content = readFile(vercelPath);
  
  if (!content) {
    addResult('Technical', 'Vercel config', STATUS.PASS, RISK.LOW, 'No vercel.json - default settings');
    return;
  }
  
  // Check for bot protection settings
  const hasBotProtection = /bot|challenge|security/i.test(content);
  
  if (hasBotProtection) {
    addResult('Technical', 'Bot accessibility', STATUS.WARN, RISK.MEDIUM, 
      'Vercel config may block payment processor bots - review settings');
  } else {
    addResult('Technical', 'Bot accessibility', STATUS.PASS, RISK.LOW, 
      'No bot-blocking configuration detected');
  }
}

// ============================================================================
// CHECK 7: AI Guardrails (4 Pillars)
// ============================================================================
function checkAIGuardrails() {
  logSection('AI Guardrails (4 Pillars)');
  
  // Check for Trust & Safety page content
  const trustSafetyPath = path.join(APP_DIR, '(legal)', 'trust-safety', 'page.tsx');
  const trustSafetyContent = readFile(trustSafetyPath);
  
  // Pillar 1: Image Copyright Protection
  results.guardrails.total++;
  const hasCharacterBlocking = trustSafetyContent && 
    (trustSafetyContent.includes('Content Moderation') || trustSafetyContent.includes('Input Scanning'));
  if (hasCharacterBlocking) {
    results.guardrails.passed++;
    addResult('Guardrails', 'Pillar 1: Image Copyright Protection', STATUS.PASS, RISK.LOW, 
      'Content moderation documented');
  } else {
    addResult('Guardrails', 'Pillar 1: Image Copyright Protection', STATUS.WARN, RISK.MEDIUM, 
      'Documentation not found');
  }
  
  // Pillar 2: Video Copyright Protection  
  results.guardrails.total++;
  const hasWatermarking = trustSafetyContent && 
    (trustSafetyContent.includes('Watermark') || trustSafetyContent.includes('SynthID'));
  if (hasWatermarking) {
    results.guardrails.passed++;
    addResult('Guardrails', 'Pillar 2: Video Copyright (Watermarking)', STATUS.PASS, RISK.LOW, 
      'Forensic watermarking documented');
  } else {
    addResult('Guardrails', 'Pillar 2: Video Copyright (Watermarking)', STATUS.WARN, RISK.MEDIUM, 
      'Watermarking not documented');
  }
  
  // Pillar 3: NIL Protection
  results.guardrails.total++;
  const hasVoiceCaptcha = trustSafetyContent && 
    (trustSafetyContent.includes('Voice Captcha') || trustSafetyContent.includes('Voice Verification'));
  if (hasVoiceCaptcha) {
    results.guardrails.passed++;
    addResult('Guardrails', 'Pillar 3: NIL Protection (Voice Captcha)', STATUS.PASS, RISK.LOW, 
      'Biometric verification documented');
  } else {
    addResult('Guardrails', 'Pillar 3: NIL Protection (Voice Captcha)', STATUS.FAIL, RISK.HIGH, 
      'Voice verification not documented');
  }
  
  // Pillar 4: Community Guardrails
  results.guardrails.total++;
  const hasTieredAccess = trustSafetyContent && 
    (trustSafetyContent.includes('Tiered Access') || trustSafetyContent.includes('Trust Score'));
  if (hasTieredAccess) {
    results.guardrails.passed++;
    addResult('Guardrails', 'Pillar 4: Community (Tiered Access)', STATUS.PASS, RISK.LOW, 
      'Access controls documented');
  } else {
    addResult('Guardrails', 'Pillar 4: Community (Tiered Access)', STATUS.WARN, RISK.MEDIUM, 
      'Tiered access not documented');
  }
  
  // Additional guardrail checks
  const hasAuditLogging = trustSafetyContent && trustSafetyContent.includes('Audit');
  if (hasAuditLogging) {
    addResult('Guardrails', 'Audit Logging', STATUS.PASS, RISK.LOW, 'Traceability documented');
  }
  
  const hasAbuseReporting = trustSafetyContent && trustSafetyContent.includes('abuse@');
  if (hasAbuseReporting) {
    addResult('Guardrails', 'Abuse Reporting Contact', STATUS.PASS, RISK.LOW, 'abuse@ email documented');
  }
}

// ============================================================================
// PROBABILITY CALCULATION
// ============================================================================
function calculateApprovalProbability() {
  logSection('Approval Probability Analysis');
  
  // Weighted scoring based on FastSpring evaluation criteria
  const weights = {
    businessLegitimacy: 0.30,
    productClassification: 0.25,
    pricingTransparency: 0.20,
    marketingClaims: 0.15,
    technicalCompliance: 0.10
  };
  
  // Calculate scores based on results
  const legalPages = results.checks.filter(c => c.category === 'Legal');
  const legalScore = legalPages.filter(c => c.status === STATUS.PASS).length / Math.max(legalPages.length, 1);
  
  const businessChecks = results.checks.filter(c => c.category === 'Business');
  const businessScore = businessChecks.filter(c => c.status === STATUS.PASS).length / Math.max(businessChecks.length, 1);
  
  const marketingChecks = results.checks.filter(c => c.category === 'Marketing');
  const marketingScore = marketingChecks.length === 0 || marketingChecks.every(c => c.status === STATUS.PASS) ? 1 : 0.7;
  
  const pricingChecks = results.checks.filter(c => c.category === 'Pricing');
  const pricingScore = pricingChecks.filter(c => c.status === STATUS.PASS).length / Math.max(pricingChecks.length, 1);
  
  const technicalChecks = results.checks.filter(c => c.category === 'Technical');
  const technicalScore = technicalChecks.filter(c => c.status === STATUS.PASS).length / Math.max(technicalChecks.length, 1);
  
  const guardrailScore = results.guardrails.passed / Math.max(results.guardrails.total, 1);
  
  // Calculate weighted probability
  let baseProbability = (
    (businessScore * 0.95) * weights.businessLegitimacy +
    (guardrailScore * 0.85) * weights.productClassification +
    (pricingScore * 0.95) * weights.pricingTransparency +
    (marketingScore * 0.90) * weights.marketingClaims +
    (technicalScore * 0.95) * weights.technicalCompliance
  ) * 100;
  
  // Adjustments
  const adjustments = [];
  
  // Positive adjustments
  if (guardrailScore >= 0.75) {
    baseProbability += 5;
    adjustments.push({ factor: 'AI Guardrails Implemented', impact: '+5%' });
  }
  if (legalScore === 1) {
    baseProbability += 3;
    adjustments.push({ factor: 'Complete Legal Pages', impact: '+3%' });
  }
  
  // Negative adjustments (inherent risks)
  baseProbability -= 3; // AI content generation category risk
  adjustments.push({ factor: 'AI Content Generation Category', impact: '-3%' });
  
  if (results.failed > 0) {
    baseProbability -= 10;
    adjustments.push({ factor: 'Critical Issues Present', impact: '-10%' });
  }
  
  // Clamp to realistic range
  const finalProbability = Math.min(95, Math.max(40, baseProbability));
  const probabilityRange = `${Math.round(finalProbability - 7)}-${Math.round(finalProbability)}%`;
  
  // Display results
  log(`\n  ${colors.bold}Weighted Scores:${colors.reset}`);
  log(`    Business Legitimacy (30%):    ${Math.round(businessScore * 100)}%`);
  log(`    Product Classification (25%): ${Math.round(guardrailScore * 100)}%`);
  log(`    Pricing Transparency (20%):   ${Math.round(pricingScore * 100)}%`);
  log(`    Marketing Claims (15%):       ${Math.round(marketingScore * 100)}%`);
  log(`    Technical Compliance (10%):   ${Math.round(technicalScore * 100)}%`);
  
  log(`\n  ${colors.bold}Adjustments:${colors.reset}`);
  adjustments.forEach(adj => {
    const color = adj.impact.startsWith('+') ? colors.green : colors.yellow;
    log(`    ${color}${adj.impact}${colors.reset} ${adj.factor}`);
  });
  
  log(`\n  ${colors.bold}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log(`  ${colors.bold}${colors.magenta}  APPROVAL PROBABILITY: ${probabilityRange}${colors.reset}`);
  log(`  ${colors.bold}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  // Risk scenarios
  log(`\n  ${colors.bold}Risk Scenarios:${colors.reset}`);
  if (finalProbability >= 85) {
    log(`    ${colors.green}● Best Case (30%):${colors.reset} Approved in 1-2 business days`);
    log(`    ${colors.cyan}● Expected (55%):${colors.reset} Approved after clarification questions`);
    log(`    ${colors.yellow}● Worst Case (15%):${colors.reset} Additional documentation required`);
  } else if (finalProbability >= 70) {
    log(`    ${colors.green}● Best Case (20%):${colors.reset} Approved with minor questions`);
    log(`    ${colors.cyan}● Expected (50%):${colors.reset} Follow-up required`);
    log(`    ${colors.yellow}● Worst Case (30%):${colors.reset} May need resubmission`);
  } else {
    log(`    ${colors.yellow}● Best Case (15%):${colors.reset} Approved with conditions`);
    log(`    ${colors.yellow}● Expected (45%):${colors.reset} Significant follow-up needed`);
    log(`    ${colors.red}● Worst Case (40%):${colors.reset} Rejection likely`);
  }
  
  return { probability: finalProbability, range: probabilityRange };
}

// ============================================================================
// SUMMARY
// ============================================================================
function printSummary() {
  logHeader('COMPLIANCE SUMMARY');
  
  const total = results.passed + results.warnings + results.failed;
  const score = Math.round((results.passed / total) * 100);
  
  let overallRisk = RISK.LOW;
  let overallStatus = 'READY FOR APPLICATION';
  
  if (results.failed > 0) {
    overallRisk = RISK.HIGH;
    overallStatus = 'NOT READY - Critical issues found';
  } else if (results.warnings > 0) {
    overallRisk = RISK.MEDIUM;
    overallStatus = 'REVIEW RECOMMENDED - Warnings present';
  }
  
  log(`${colors.bold}Results:${colors.reset}`);
  log(`  ${STATUS.PASS} Passed:   ${results.passed}`);
  log(`  ${STATUS.WARN} Warnings: ${results.warnings}`);
  log(`  ${STATUS.FAIL} Failed:   ${results.failed}`);
  log('');
  log(`${colors.bold}Guardrails:${colors.reset} ${results.guardrails.passed}/${results.guardrails.total} pillars verified`);
  log(`${colors.bold}Compliance Score:${colors.reset} ${score}%`);
  log(`${colors.bold}Overall Risk:${colors.reset} ${overallRisk}`);
  log(`${colors.bold}Status:${colors.reset} ${overallStatus}`);
  
  // Critical issues summary
  const criticalIssues = results.checks.filter(c => c.status === STATUS.FAIL);
  if (criticalIssues.length > 0) {
    log(`\n${colors.red}${colors.bold}Critical Issues to Address:${colors.reset}`);
    criticalIssues.forEach((issue, i) => {
      log(`  ${i + 1}. ${issue.check}`);
      if (issue.notes) log(`     ${colors.dim}${issue.notes}${colors.reset}`);
    });
  }
  
  log(`\n${colors.dim}Run this check again after making changes: npm run compliance-check${colors.reset}\n`);
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  logHeader('FastSpring Compliance Assessment');
  log(`${colors.dim}Date: ${new Date().toISOString().split('T')[0]}${colors.reset}`);
  log(`${colors.dim}Project: SceneFlow AI${colors.reset}`);
  log(`${colors.dim}Version: 2.0 (with Guardrails & Probability)${colors.reset}`);
  
  checkBusinessAddress();
  checkLegalPages();
  checkMarketingClaims();
  checkDemoAssets();
  checkPricingTransparency();
  checkBotAccessibility();
  checkAIGuardrails();
  
  printSummary();
  
  // Calculate and display approval probability
  const { probability } = calculateApprovalProbability();
  
  // Exit with error code if critical issues found
  if (results.failed > 0) {
    process.exit(1);
  } else if (probability < 70) {
    process.exit(1);
  }
}

main();
