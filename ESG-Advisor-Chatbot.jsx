import React, { useState, useRef, useEffect } from 'react';

export default function ESGChatbot() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', content: "Hey I'm ESG Chatbot. How can I help you?", isText: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Gate tracking
  const [currentGate, setCurrentGate] = useState(0); // 0 = Gate 0, 1 = Gate 1, etc.
  
  // Evaluation flow state
  const [view, setView] = useState('chat'); // 'chat', 'evaluate', 'evaluate-step2', 'adopt', 'reject', 'gate0-questionnaire', 'gate0-results', 'retest-define', 'retest-pending', 'retest-complete', 'retest-result', 'gate1-test', 'gate1-retest'
  const [evalData, setEvalData] = useState(null);
  const [evalAnswers, setEvalAnswers] = useState({});
  const [selectedRole, setSelectedRole] = useState(null); // For Value Capture Path: 'developer', 'contractor', 'consultant'
  
  // Store user's original question and scorecard data for Gate 1
  const [userQuestion, setUserQuestion] = useState(null);
  const [scorecardData, setScorecardData] = useState(null);
  
  // Gate 0 Questionnaire state
  const [gate0Context, setGate0Context] = useState({
    role: null, // 'developer', 'contractor', 'consultant'
    assetContext: null, // 'owner-occupied', 'tenanted'
    projectStage: null, // 'concept', 'design', 'tender', 'construction', 'operational'
    assetType: null // 'new-build', 'existing'
  });
  const [gate0Answers, setGate0Answers] = useState({});
  const [gate0Results, setGate0Results] = useState(null);
  
  // Gate 0 RE-TEST state
  const [reTestPlan, setReTestPlan] = useState({
    checkName: null,
    checkKey: null,
    validationMethods: [], // Changed to array for multi-select
    validationMethodOther: '',
    startDate: '',
    targetDate: '',
    budgetCap: '',
    passCriterion: ''
  });
  const [reTestStatus, setReTestStatus] = useState('defining'); // 'defining', 'pending', 'completing', 'done'
  const [reTestFailedQuestions, setReTestFailedQuestions] = useState([]); // Questions that were "No"
  const [reTestAnswers, setReTestAnswers] = useState({}); // Re-answers for failed questions
  const [reTestCompletion, setReTestCompletion] = useState({
    completed: null, // true/false
    outcome: null, // 'pass'/'fail'
    evidence: ''
  });
  
  // Gate 1 specific state
  const [gate1Results, setGate1Results] = useState(null);
  const [gate1RetestOptions, setGate1RetestOptions] = useState([]);
  const [hasRetested, setHasRetested] = useState(false);
  const [retestAnswers, setRetestAnswers] = useState({});
  
  // Gate 1 Wizard state
  const [gate1Step, setGate1Step] = useState(1); // 1-8 for wizard steps
  const [gate1Inputs, setGate1Inputs] = useState({
    // Section A: Setup
    setup: {
      role: null,
      projectType: null, // 'new-build', 'retrofit-major', 'retrofit-minor', 'ops-optimisation'
      assetContext: null,
      projectStage: null,
      proposedAction: '',
      scopeBoundary: ''
    },
    // Section B: Baseline Definition
    baseline: {
      baselineAction: '',
      baselinePeriod: null, // 'last-12-months', 'other', 'na'
      baselinePeriodOther: '',
      metricsAvailable: [], // ['bei', 'water', 'maintenance', 'downtime', 'rent', 'caprate', 'contract']
      normalisationPossible: null, // 'yes', 'no', 'na'
      normalisationMethod: ''
    },
    // Section C: Evidence Method
    evidence: {
      methods: [], // ['bim-lcc', 'green-mark', 'simulation', 'bms-regression', 'mini-test', 'commercial-proof']
      existingEvidence: [], // ['quotes', 'trends', 'model-outputs', 'lois', 'none']
      evidenceDetails: ''
    },
    // Section D: Delta vs Baseline
    delta: {
      energyKwh: '',
      waterM3: '',
      maintenanceCost: '',
      downtimeAvoided: '',
      scheduleWeeks: '',
      rentUplift: '',
      occupancyChange: '',
      capRateChange: '',
      hasDownsideCase: null, // 'yes', 'no', 'na'
      downsideRange: ''
    },
    // Section E: Money Conversion
    money: {
      spTariff: '0.25', // Default SP tariff
      carbonPrice: '25', // Default Singapore carbon tax
      rentBenchmark: '',
      ldRates: '',
      valueCapturedBy: [], // Changed to array for multi-select: ['owner', 'tenant', 'client', 'contractor', 'consultant']
      mechanism: [], // ['green-lease', 'service-charge', 'gainshare', 'fee-model', 'direct-savings', 'other']
      mechanismOther: ''
    },
    // Section F: Incremental Costs
    costs: {
      capex: '',
      oAndM: { applicable: null, amount: '0' },
      trainingIT: { applicable: null, amount: '0' },
      commissioningMV: { applicable: null, amount: '0' },
      adminReporting: { applicable: null, amount: '0' }
    },
    // Section G: Decision Rule
    decisionRule: {
      thresholdType: null, // 'npv-wacc', 'irr', 'payback', 'gainshare', 'fee-protection'
      wacc: '',
      paybackYears: '',
      irrTarget: '',
      gainshareTarget: '',
      feeProtectionTarget: '',
      nearMissBand: '5', // Default 5%
      reTestCap: '10', // Default 10%
      timeBoxRequired: null, // 'yes', 'no'
      analysisPeriod: '10' // Default 10 years
    }
  });
  
  // Gate 1 Calculations
  const [gate1Calculations, setGate1Calculations] = useState({
    annualEnergyBenefit: 0,
    annualCarbonBenefit: 0,
    annualWaterBenefit: 0,
    annualMaintenanceBenefit: 0,
    annualOtherBenefit: 0,
    totalAnnualBenefit: 0,
    totalAnnualCost: 0,
    netAnnualBenefit: 0,
    totalCapex: 0,
    npv: 0,
    irr: 0,
    paybackYears: 0,
    meetsThreshold: null,
    thresholdDelta: 0 // How far from threshold (positive = exceeds, negative = misses)
  });
  
  // Gate 1 RE-TEST state (similar to Gate 0)
  const [gate1ReTestPlan, setGate1ReTestPlan] = useState({
    criticalUnknown: '',
    validationMethod: null,
    validationMethodOther: '',
    whatToMeasure: '',
    startDate: '',
    targetDate: '',
    budgetCap: '',
    passCriterion: '',
    exitRule: '',
    itemsToReAnswer: []
  });
  const [gate1ReTestStatus, setGate1ReTestStatus] = useState('defining');
  const [gate1ReTestCompletion, setGate1ReTestCompletion] = useState({
    completed: null,
    outcome: null,
    evidence: '',
    updatedInputs: {}
  });
  
  // Gate 2 specific state - NEW COMPREHENSIVE STRUCTURE
  const [gate2Step, setGate2Step] = useState(0); // 0=carryover, 1=enabler1, 2=enabler2, 3=enabler3, 4=enabler4, 5=results, 6=enablement, 7=economics, 8=pilot
  const [gate2Carryover, setGate2Carryover] = useState({
    role: null,
    proposedAction: '',
    boundary: null, // 'whole-asset', 'building', 'floors', 'pilot'
    boundaryDescription: '',
    whoPays: '',
    whoBenefits: '',
    gate1Metric: null, // 'npv-wacc', 'irr', 'payback', 'gainshare', 'fee-protection'
    gate1Threshold: '',
    gate1Result: null, // 'above', 'borderline', 'below'
    gate1ResultAmount: ''
  });
  const [gate2EnablerAnswers, setGate2EnablerAnswers] = useState({
    // Enabler 1: Value-Capture (B1-B5)
    B1: null, B1_evidence: null, B1_blocker: '',
    B2: null, B2_evidence: null, B2_blocker: '',
    B3: null, B3_evidence: null, B3_blocker: '',
    B4: null, B4_evidence: null, B4_blocker: '',
    B5: null, B5_evidence: null, B5_blocker: '',
    // Enabler 2: Financing (B6-B10)
    B6: null, B6_evidence: null, B6_blocker: '',
    B7: null, B7_evidence: null, B7_blocker: '',
    B8: null, B8_evidence: null, B8_blocker: '',
    B9: null, B9_evidence: null, B9_blocker: '',
    B10: null, B10_evidence: null, B10_blocker: '',
    // Enabler 3: Data & Integrations (B11-B15)
    B11: null, B11_evidence: null, B11_blocker: '',
    B12: null, B12_evidence: null, B12_blocker: '',
    B13: null, B13_evidence: null, B13_blocker: '',
    B14: null, B14_evidence: null, B14_blocker: '',
    B15: null, B15_evidence: null, B15_blocker: '',
    // Enabler 4: Delivery Risk (B16-B20)
    B16: null, B16_evidence: null, B16_blocker: '',
    B17: null, B17_evidence: null, B17_blocker: '',
    B18: null, B18_evidence: null, B18_blocker: '',
    B19: null, B19_evidence: null, B19_blocker: '',
    B20: null, B20_evidence: null, B20_blocker: ''
  });
  const [gate2EnablerResults, setGate2EnablerResults] = useState({
    E1: null, // 'pass', 'fail'
    E2: null,
    E3: null,
    E4: null
  });
  const [gate2EnablementActions, setGate2EnablementActions] = useState([]); // Array of enablement action forms
  const [gate2EconomicsClarity, setGate2EconomicsClarity] = useState({
    whatChanged: '',
    updatedBenefits: '',
    updatedCosts: '',
    updatedNPV: '',
    updatedPayback: '',
    meetsThreshold: null, // 'yes', 'no'
    isBorderline: null, // 'yes', 'no'
    borderlineReason: ''
  });
  const [gate2PilotPlan, setGate2PilotPlan] = useState({
    uncertainty: '',
    boundary: '',
    duration: '',
    responsibleParties: '',
    passCriterion: '',
    mvMethod: '',
    costCap: '',
    exitRule: '',
    evidenceToUpload: '',
    result: null, // 'pass', 'fail'
    resultEvidence: ''
  });
  const [gate2Decision, setGate2Decision] = useState(null); // 'adopt', 'pilot', 'reject'

  // Gate 3 specific state - DELIVERY & M&V EXECUTION
  const [gate3Step, setGate3Step] = useState(0); // 0=carryover, 1=route, 2=phase1, 3=phase2, 4=phase3, 5=phase4, 6=phase5, 7=dashboard
  const [gate3Carryover, setGate3Carryover] = useState({
    role: null, // 'developer', 'fm-reit', 'contractor', 'consultant'
    proposedAction: '',
    boundary: null, // 'whole-asset', 'building', 'floors', 'pilot'
    boundaryDescription: '',
    mechanisms: [], // ['green-lease', 'espc', 'gainshare', 'sla-kpi', 'lender-reporting']
    allEnablersLocked: null, // 'yes', 'no'
    decisionCardSignedFundsReleased: null // 'yes', 'no'
  });
  const [gate3Route, setGate3Route] = useState({
    actionType: null, // 'energy-water', 'non-energy'
    ipmvpOption: null, // 'A', 'B', 'C', 'D', 'not-sure'
    recommendedOption: null, // Set by IPMVP guide
    kpiCategory: null, // 'schedule', 'defects', 'embodied-carbon', 'safety', 'other'
    kpiCategoryOther: ''
  });
  const [gate3Phase1, setGate3Phase1] = useState({
    // P1.1 - P1.7
    P1_1: null, P1_1_evidence: '', P1_1_naReason: '',
    P1_2: null, P1_2_evidence: '', P1_2_naReason: '',
    P1_3: null, P1_3_evidence: '', P1_3_naReason: '',
    P1_4: null, P1_4_evidence: '', P1_4_naReason: '',
    P1_5: null, P1_5_evidence: '', P1_5_naReason: '',
    P1_6: null, P1_6_evidence: '', P1_6_naReason: '',
    P1_7: null, P1_7_evidence: '', P1_7_naReason: ''
  });
  const [gate3Phase2, setGate3Phase2] = useState({
    // P2.1 - P2.4
    P2_1: null, P2_1_evidence: '', P2_1_naReason: '',
    P2_2: null, P2_2_evidence: '', P2_2_naReason: '',
    P2_3: null, P2_3_evidence: '', P2_3_naReason: '',
    P2_4: null, P2_4_evidence: '', P2_4_naReason: ''
  });
  const [gate3Phase3, setGate3Phase3] = useState({
    // P3.1 - P3.4
    P3_1: null, P3_1_evidence: '', P3_1_naReason: '',
    P3_2: null, P3_2_evidence: '', P3_2_naReason: '',
    P3_3: null, P3_3_evidence: '', P3_3_naReason: '',
    P3_4: null, P3_4_evidence: '', P3_4_naReason: ''
  });
  const [gate3Phase4, setGate3Phase4] = useState({
    // Data Governance
    P4_G1: null, P4_G1_evidence: '', P4_G1_naReason: '',
    P4_G2: null, P4_G2_evidence: '', P4_G2_naReason: '',
    P4_G3: null, P4_G3_evidence: '', P4_G3_naReason: '',
    // IPMVP specific fields
    ipmvpConfirmed: null,
    ipmvpEvidencePack: '',
    savingsCalculation: '',
    // KPI specific fields
    kpiConfirmed: null,
    kpiEvidencePack: ''
  });
  const [gate3Phase5, setGate3Phase5] = useState({
    // P5.1 Settlement Memo
    settlementMemoComplete: null,
    espcSettlement: '', // Pay fee / share upside / shortfall remedy
    gainshareSettlement: '', // Against target with adjustments
    greenLeaseSettlement: '', // Pass-through / service charge recovery
    slaKpiSettlement: '', // KPI-to-payment logic
    lenderReportSettlement: '', // KPI report + assurance
    // P5.2 Close-out
    decisionRecorded: null,
    evidenceArchived: null,
    outcomesCommunicated: null,
    closeOutNotes: ''
  });
  const [gate3ChangeControl, setGate3ChangeControl] = useState({
    hasChanges: null, // 'yes', 'no'
    changeDescription: '',
    materialImpact: null, // 'yes', 'no'
    impactType: null, // 'economics', 'measurement', 'both'
    backRoute: null // 'gate1', 'gate2', null
  });
  const [gate3PhaseStatus, setGate3PhaseStatus] = useState({
    phase1: 'not-started', // 'not-started', 'in-progress', 'complete', 'blocked'
    phase2: 'not-started',
    phase3: 'not-started',
    phase4: 'not-started',
    phase5: 'not-started'
  });
  const [gate3Decision, setGate3Decision] = useState(null); // 'complete', 'back-to-gate1', 'back-to-gate2', 'in-progress'
  
  // Gate summaries state - stores summaries for each completed gate
  const [gateSummaries, setGateSummaries] = useState({
    gate0: null,
    gate1: null,
    gate2: null,
    gate3: null
  });
  const [expandedSummary, setExpandedSummary] = useState(false);
  
  const endRef = useRef(null);

  // Reset scroll to top when navigating between steps/views
  const resetScroll = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================== GATE 0 QUESTIONNAIRE CONFIGURATION ====================
  
  // All 25 questions for Gate 0
  const gate0Questions = {
    check1: {
      name: 'Coercive Trigger',
      description: 'Is there a coercive trigger present?',
      questions: [
        {
          id: '1.1',
          label: 'Legal/regulatory requirement',
          question: 'Is there a legal/regulatory requirement that applies to this action for this project/asset within the required timeframe?',
          tooltip: '"Legal/regulatory" means enforced obligations from authorities (approval conditions, mandatory standards), not internal preferences.',
          tooltipTerm: 'legal/regulatory requirement',
          allowNA: false
        },
        {
          id: '1.2',
          label: 'Tender/client/contract requirement',
          question: 'Is the action explicitly required in a tender document, client brief, employer\'s requirements, or contract scope?',
          tooltip: '"Explicitly required" = written down in documents, not implied.',
          tooltipTerm: 'explicitly required',
          allowNA: false
        },
        {
          id: '1.3',
          label: 'Certification/standard target requirement',
          question: 'Is there a required certification/standard outcome (e.g., Green Mark level) that this action materially supports or is needed to achieve?',
          tooltip: 'A "required outcome" is a target tied to approval, leasing, financing, or organisational commitments—not just "nice to have."',
          tooltipTerm: 'required certification/standard outcome',
          allowNA: false
        },
        {
          id: '1.4',
          label: 'Board/corporate mandate with enforcement',
          question: 'Is there a board/corporate/portfolio sustainability mandate that is tracked and tied to approvals or performance reviews?',
          tooltip: '"With enforcement" means it affects budget approval, KPIs, or reporting accountability.',
          tooltipTerm: 'board/corporate/portfolio sustainability mandate',
          allowNA: false
        },
        {
          id: '1.5',
          label: 'Real consequence within 12–18 months',
          question: 'Would not doing the action cause a real negative consequence (penalty, approval risk, lost tender/tenant, financing issue) within 12–18 months?',
          tooltip: '"Real consequence" should be plausible and time-bound, not speculative.',
          tooltipTerm: 'real negative consequence',
          allowNA: false
        }
      ]
    },
    check2: {
      name: 'Strategic Fit',
      description: 'Does the action have strategic fit?',
      questions: [
        {
          id: '2.1',
          label: 'Aligns with a named environmental objective',
          question: 'Does the action directly support at least one named environmental objective (energy, carbon, water, waste, IAQ) stated by the company/project?',
          tooltip: '"Named objective" = written target in policy, ESG plan, project brief, or KPIs.',
          tooltipTerm: 'named environmental objective',
          allowNA: false
        },
        {
          id: '2.2',
          label: 'Fits asset strategy',
          question: 'Is the action aligned with the asset strategy (long-hold vs divest, premium positioning, operational excellence, cost leadership)?',
          tooltip: 'Asset strategy is how the building is intended to create value over time (hold/sell, rent profile, operating model).',
          tooltipTerm: 'asset strategy',
          allowNA: true,
          naCondition: (ctx) => (ctx.role === 'contractor' || ctx.role === 'consultant')
        },
        {
          id: '2.3',
          label: 'Evidence of stakeholder demand',
          question: 'Is there evidence of stakeholder demand (tenant request, client requirement, occupant complaints, investor pressure, competitor benchmarks)?',
          tooltip: 'Evidence can be emails, meeting minutes, survey results, leasing discussions, or written requirements.',
          tooltipTerm: 'evidence of stakeholder demand',
          allowNA: false
        },
        {
          id: '2.4',
          label: 'Identified internal sponsor with authority',
          question: 'Is there an identified internal sponsor who has authority to push approvals (budget owner, project director, asset owner)?',
          tooltip: 'Sponsor = accountable decision driver, not just someone who "supports the idea."',
          tooltipTerm: 'internal sponsor',
          allowNA: true,
          naCondition: (ctx) => (ctx.role === 'contractor' || ctx.role === 'consultant')
        },
        {
          id: '2.5',
          label: 'No conflict with higher-priority constraints',
          question: 'Has the team confirmed the action does not conflict with safety, operational downtime limits, or schedule-critical milestones?',
          tooltip: 'This checks whether the ESG action breaks core project constraints.',
          tooltipTerm: 'higher-priority constraints',
          allowNA: false
        }
      ]
    },
    check3: {
      name: 'Value Capture Path',
      description: 'Does a value capture path exist?',
      questions: [
        {
          id: '3.1',
          label: 'Recovery/benefit mechanism exists for your role',
          question: 'For your role, is there a defined mechanism to recover costs or benefit financially if the action performs as intended?',
          tooltip: 'Value capture = how the paying party gets paid back (savings, fees, uplift, pass-through, gainshare).',
          tooltipTerm: 'defined mechanism to recover costs',
          allowNA: false
        },
        {
          id: '3.2',
          label: 'Mechanism is contractable/documentable',
          question: 'Can that value capture mechanism be written into a contract/lease (clause, measurable payment basis, fee model)?',
          tooltip: '"Contractable" means it can be written, measured, and enforced.',
          tooltipTerm: 'contractable',
          allowNA: false
        },
        {
          id: '3.3',
          label: 'Paying party or payer mechanism identified',
          question: 'Is there at least one realistic paying party or payer mechanism (owner, tenant, grant, green loan, ESCO/performance contract)?',
          tooltip: 'Avoids "everyone benefits but no one pays."',
          tooltipTerm: 'paying party or payer mechanism',
          allowNA: false
        },
        {
          id: '3.4',
          label: 'Risk allocation acceptable',
          question: 'Is the risk allocation acceptable for your role (no unlimited liability, clear responsibilities, manageable LD exposure)?',
          tooltip: 'Risk allocation means who carries performance risk, defect risk, delay risk, and cost overrun risk.',
          tooltipTerm: 'risk allocation',
          allowNA: false
        },
        {
          id: '3.5',
          label: 'Split incentive addressed',
          question: 'Is the "who pays vs who benefits" mismatch addressed (green lease, service charge recovery, financing, rebates, performance contracting)?',
          tooltip: 'Split incentive is common in owner-tenant situations: owner pays but tenant benefits, or vice versa.',
          tooltipTerm: 'split incentive',
          allowNA: true,
          naCondition: (ctx) => ctx.assetContext === 'owner-occupied'
        }
      ]
    },
    check4: {
      name: 'Rough Economic Pass',
      description: 'Do the rough economics pass?',
      questions: [
        {
          id: '4.1',
          label: 'Rough cost numbers exist',
          question: 'Do you have rough cost numbers for this action (capex and/or opex impact)?',
          tooltip: 'Capex = upfront spend; opex = ongoing operating/maintenance cost.',
          tooltipTerm: 'rough cost numbers',
          allowNA: false
        },
        {
          id: '4.2',
          label: 'Rough benefit numbers exist',
          question: 'Do you have rough benefit numbers (savings, avoided penalties, revenue uplift, leasing/valuation impact)?',
          tooltip: 'Benefits should be defensible (benchmarks, past data, vendor ranges) not just "reputation."',
          tooltipTerm: 'rough benefit numbers',
          allowNA: false
        },
        {
          id: '4.3',
          label: 'Meets the organisation\'s decision rule',
          question: 'Based on your organisation\'s decision rule (payback threshold, hurdle rate/WACC, IRR target), does the action meet the minimum requirement?',
          tooltip: 'Decision rule is your internal investment rule (e.g., payback ≤ 3 years, IRR ≥ 10%, NPV ≥ 0).',
          tooltipTerm: 'organisation\'s decision rule',
          allowNA: true,
          naCondition: (ctx) => (ctx.projectStage === 'concept') || (ctx.role === 'contractor' || ctx.role === 'consultant')
        },
        {
          id: '4.4',
          label: 'Downside case still acceptable',
          question: 'If benefits are 20% lower than expected, would the action still be acceptable under the decision rule?',
          tooltip: 'This is a basic sensitivity test to reduce over-optimism.',
          tooltipTerm: 'downside case',
          allowNA: true,
          naCondition: (ctx, answers) => answers['4.3'] === 'na' || answers['4.2'] === 'no'
        },
        {
          id: '4.5',
          label: 'Funding path exists',
          question: 'Is there a realistic funding path (budget line, client approval likelihood, grant, green loan, ESCO/performance contract)?',
          tooltip: 'Funding path means "who will approve the money and how it gets released."',
          tooltipTerm: 'funding path',
          allowNA: true,
          naCondition: (ctx) => (ctx.projectStage === 'concept') || (ctx.role === 'consultant')
        }
      ]
    },
    check5: {
      name: 'Feasible to Implement',
      description: 'Is it feasible to implement and meter?',
      questions: [
        {
          id: '5.1',
          label: 'Implementable within site constraints',
          question: 'Can the action be implemented within site constraints (space, access, safety, downtime limits, approvals)?',
          tooltip: 'Practical feasibility: can it actually be installed and operated without breaking constraints?',
          tooltipTerm: 'site constraints',
          allowNA: false
        },
        {
          id: '5.2',
          label: 'Baseline exists or can be obtained',
          question: 'Is there a usable baseline (historical data, utility bills, equipment logs, pre-install measurements) for comparison?',
          tooltip: 'Baseline is "before" performance data—needed to prove improvement.',
          tooltipTerm: 'usable baseline',
          allowNA: true,
          naCondition: (ctx) => ctx.assetType === 'new-build' && ['concept', 'design', 'tender', 'construction'].includes(ctx.projectStage)
        },
        {
          id: '5.3',
          label: 'Data access permissions are achievable',
          question: 'Can required data access permissions be obtained (owner/tenant/FM approvals, cybersecurity approvals, system logins)?',
          tooltip: 'Many ESG initiatives fail because data is blocked, not because technology fails.',
          tooltipTerm: 'data access permissions',
          allowNA: true,
          naCondition: () => false // Rare - user must manually justify
        },
        {
          id: '5.4',
          label: 'Delivery capability plan exists',
          question: 'Is there a delivery capability plan (vendor availability, internal skills, maintenance capability, commissioning plan)?',
          tooltip: 'Commissioning = verifying systems work as intended after installation.',
          tooltipTerm: 'delivery capability plan',
          allowNA: false
        },
        {
          id: '5.5',
          label: 'Measurement approach defined',
          question: 'Is there a defined measurement approach (what is measured, how often, responsible party, meters/tools) to verify performance?',
          tooltip: 'This is the "proof plan" that makes outcomes credible.',
          tooltipTerm: 'measurement approach',
          allowNA: true,
          naCondition: () => false // Rare - user must manually justify
        }
      ]
    }
  };

  // ==================== GATE 1 CONFIGURATION ====================

  // Gate 1 Tooltips
  const gate1Tooltips = {
    'baseline': 'The Baseline Action is what would happen if the Proposed Action is NOT adopted. For new builds, this is typically the code-minimum design. For retrofits, it\'s the current state.',
    'normalisation': 'Adjusting baseline data to account for variables like occupancy levels, weather conditions, or operating hours to ensure fair comparison.',
    'bei': 'Building Energy Intensity - total energy consumption (kWh) divided by gross floor area (m²), typically measured annually.',
    'ettv': 'Envelope Thermal Transfer Value - measures heat gain through the building envelope in W/m². Lower is better.',
    'retv': 'Residential Envelope Transmittance Value - similar to ETTV but for residential buildings.',
    'wacc': 'Weighted Average Cost of Capital - the average rate a company pays to finance its assets, used as the discount rate for NPV calculations.',
    'npv': 'Net Present Value - the difference between the present value of cash inflows and outflows over time. Positive NPV means the investment adds value.',
    'irr': 'Internal Rate of Return - the discount rate that makes NPV equal to zero. Higher IRR indicates better returns.',
    'payback': 'Simple Payback Period - the time required to recover the initial investment from the net annual savings.',
    'ipmvp': 'International Performance Measurement and Verification Protocol - standardised methods for measuring energy savings.',
    'ipmvp-c': 'IPMVP Option C (Whole Facility) - uses utility billing data and regression analysis to measure savings at the whole-building level.',
    'gainshare': 'A contractual arrangement where the contractor shares in the savings achieved beyond a baseline, incentivising performance.',
    'ld': 'Liquidated Damages - pre-agreed compensation for specific breaches like delays, typically expressed as S$/day.',
    'caprate': 'Capitalisation Rate - the ratio of net operating income to property value, used to estimate investment returns. Lower cap rates indicate higher property values.',
    'greenium': 'Green Premium - the additional rent or value that green-certified buildings can command over conventional buildings.',
    'mv': 'Measurement and Verification - the process of quantifying savings from energy efficiency projects.',
    'bms': 'Building Management System - centralised control system for HVAC, lighting, and other building systems.',
    'lcc': 'Life Cycle Cost - total cost of ownership including acquisition, operation, maintenance, and disposal.',
    'sp-tariff': 'Singapore Power electricity tariff - the regulated electricity price charged to consumers in Singapore.',
    'carbon-tax': 'Singapore\'s carbon tax on greenhouse gas emissions, currently S$25/tCO₂ (increasing to S$45 by 2026-27).',
    'grid-emission': 'Singapore grid emission factor: 0.4085 kgCO₂/kWh - used to convert electricity savings to carbon savings.'
  };

  // Gate 1 Evidence Methods
  const gate1EvidenceMethods = [
    { value: 'bim-lcc', label: 'BIM + Life Cycle Costing', desc: 'Detailed modelling with cost analysis over building lifetime' },
    { value: 'green-mark', label: 'Green Mark Calculators', desc: 'BCA-provided tools for energy, water, and sustainability calculations' },
    { value: 'simulation', label: 'Quick Energy Simulation', desc: 'Energy modelling software (eQUEST, IES-VE, EnergyPlus, PVsyst)' },
    { value: 'bms-regression', label: 'BMS Regression (IPMVP Option C)', desc: 'Whole-facility analysis using utility data and weather normalisation' },
    { value: 'mini-test', label: 'Mini Metered Test (≤14 days)', desc: 'Short-term measurement of actual performance' },
    { value: 'commercial-proof', label: 'Commercial Proof (LOI/Memo)', desc: 'Letter of Intent, valuation memo, or tenant commitment' }
  ];

  // Gate 1 Validation Methods for Re-Test
  const gate1ValidationMethods = [
    { value: 'extended-metering', label: 'Extended metering/M&V', desc: 'Longer measurement period for more reliable data' },
    { value: 'refined-model', label: 'Refined energy model', desc: 'Updated simulation with better inputs' },
    { value: 'vendor-guarantee', label: 'Vendor performance guarantee', desc: 'Contractual commitment to performance levels' },
    { value: 'pilot-zone', label: 'Pilot zone implementation', desc: 'Test in limited area before full rollout' },
    { value: 'commercial-negotiation', label: 'Commercial negotiation', desc: 'Secure tenant/client commitment or LOI' },
    { value: 'cost-refinement', label: 'Cost refinement', desc: 'Get firmer quotes or tender pricing' },
    { value: 'other', label: 'Other', desc: 'Specify your own method' }
  ];

  // Singapore constants
  const SINGAPORE_GRID_EMISSION_FACTOR = 0.4085; // kgCO2/kWh
  const DEFAULT_WATER_TARIFF = 2.74; // S$/m³ (approximate Singapore water tariff)

  // Financial Calculation Functions
  const calculateNPV = (initialInvestment, annualCashFlow, discountRate, years) => {
    let npv = -initialInvestment;
    for (let t = 1; t <= years; t++) {
      npv += annualCashFlow / Math.pow(1 + discountRate / 100, t);
    }
    return npv;
  };

  const calculateIRR = (initialInvestment, annualCashFlow, years, maxIterations = 1000, tolerance = 0.0001) => {
    // Newton-Raphson method for IRR
    let rate = 0.1; // Initial guess 10%
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = -initialInvestment;
      let dnpv = 0; // Derivative of NPV
      
      for (let t = 1; t <= years; t++) {
        const discountFactor = Math.pow(1 + rate, t);
        npv += annualCashFlow / discountFactor;
        dnpv -= t * annualCashFlow / Math.pow(1 + rate, t + 1);
      }
      
      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Return as percentage
      }
      
      if (dnpv === 0) break;
      rate = rate - npv / dnpv;
      
      // Bounds check
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }
    
    return rate * 100;
  };

  const calculatePayback = (initialInvestment, annualCashFlow) => {
    if (annualCashFlow <= 0) return Infinity;
    return initialInvestment / annualCashFlow;
  };

  // Convert energy delta to money
  const calculateEnergyBenefit = (energyKwh, spTariff, carbonPrice) => {
    const energySavings = parseFloat(energyKwh) || 0;
    const tariff = parseFloat(spTariff) || 0.25;
    const carbon = parseFloat(carbonPrice) || 25;
    
    const electricityBenefit = energySavings * tariff;
    const carbonSavings = (energySavings * SINGAPORE_GRID_EMISSION_FACTOR) / 1000; // Convert kg to tonnes
    const carbonBenefit = carbonSavings * carbon;
    
    return {
      electricityBenefit,
      carbonSavings,
      carbonBenefit,
      totalBenefit: electricityBenefit + carbonBenefit
    };
  };

  // Run all Gate 1 calculations
  const runGate1Calculations = (inputs) => {
    const { delta, money, costs, decisionRule } = inputs;
    
    // Calculate energy benefits
    const energyCalc = calculateEnergyBenefit(delta.energyKwh, money.spTariff, money.carbonPrice);
    
    // Calculate water benefits
    const waterSavings = parseFloat(delta.waterM3) || 0;
    const waterBenefit = waterSavings * DEFAULT_WATER_TARIFF;
    
    // Calculate maintenance benefits
    const maintenanceBenefit = parseFloat(delta.maintenanceCost) || 0;
    
    // Calculate other benefits (rent uplift, etc.)
    let otherBenefit = 0;
    // Could add rent uplift, occupancy change, cap rate impact here
    
    // Total annual benefit
    const totalAnnualBenefit = energyCalc.totalBenefit + waterBenefit + maintenanceBenefit + otherBenefit;
    
    // Calculate total annual costs (O&M)
    let totalAnnualCost = 0;
    if (costs.oAndM.applicable === 'yes') {
      totalAnnualCost += parseFloat(costs.oAndM.amount) || 0;
    }
    
    // Net annual benefit
    const netAnnualBenefit = totalAnnualBenefit - totalAnnualCost;
    
    // Calculate total CAPEX
    let totalCapex = parseFloat(costs.capex) || 0;
    if (costs.trainingIT.applicable === 'yes') {
      totalCapex += parseFloat(costs.trainingIT.amount) || 0;
    }
    if (costs.commissioningMV.applicable === 'yes') {
      totalCapex += parseFloat(costs.commissioningMV.amount) || 0;
    }
    if (costs.adminReporting.applicable === 'yes') {
      totalCapex += parseFloat(costs.adminReporting.amount) || 0;
    }
    
    // Get analysis period
    const years = parseInt(decisionRule.analysisPeriod) || 10;
    const wacc = parseFloat(decisionRule.wacc) || 8;
    
    // Calculate financial metrics
    const npv = calculateNPV(totalCapex, netAnnualBenefit, wacc, years);
    const irr = totalCapex > 0 && netAnnualBenefit > 0 ? calculateIRR(totalCapex, netAnnualBenefit, years) : 0;
    const paybackYears = calculatePayback(totalCapex, netAnnualBenefit);
    
    // Determine if meets threshold
    let meetsThreshold = null;
    let thresholdDelta = 0;
    
    if (decisionRule.thresholdType === 'npv-wacc') {
      meetsThreshold = npv >= 0;
      thresholdDelta = npv;
    } else if (decisionRule.thresholdType === 'irr') {
      const targetIRR = parseFloat(decisionRule.irrTarget) || 0;
      meetsThreshold = irr >= targetIRR;
      thresholdDelta = irr - targetIRR;
    } else if (decisionRule.thresholdType === 'payback') {
      const targetPayback = parseFloat(decisionRule.paybackYears) || 5;
      meetsThreshold = paybackYears <= targetPayback;
      thresholdDelta = targetPayback - paybackYears;
    }
    
    return {
      annualEnergyBenefit: energyCalc.electricityBenefit,
      annualCarbonBenefit: energyCalc.carbonBenefit,
      carbonSavingsTonnes: energyCalc.carbonSavings,
      annualWaterBenefit: waterBenefit,
      annualMaintenanceBenefit: maintenanceBenefit,
      annualOtherBenefit: otherBenefit,
      totalAnnualBenefit,
      totalAnnualCost,
      netAnnualBenefit,
      totalCapex,
      npv,
      irr,
      paybackYears,
      meetsThreshold,
      thresholdDelta,
      analysisPeriod: years
    };
  };

  // Determine Gate 1 decision
  const determineGate1Decision = (calculations, inputs) => {
    const { decisionRule } = inputs;
    const nearMissBand = parseFloat(decisionRule.nearMissBand) || 5;
    
    // Check if we have enough data
    const hasBaseline = inputs.baseline.baselineAction.trim() !== '';
    const hasDelta = parseFloat(inputs.delta.energyKwh) > 0 || parseFloat(inputs.delta.waterM3) > 0 || parseFloat(inputs.delta.maintenanceCost) > 0;
    const hasCosts = parseFloat(inputs.costs.capex) > 0;
    const hasThreshold = decisionRule.thresholdType !== null;
    
    // Confidence level
    let confidence = 'high';
    const missingItems = [];
    
    if (!hasBaseline) { confidence = 'low'; missingItems.push('Baseline definition'); }
    if (!hasDelta) { confidence = 'low'; missingItems.push('Performance delta estimates'); }
    if (!hasCosts) { confidence = 'medium'; missingItems.push('Cost estimates'); }
    if (inputs.delta.hasDownsideCase !== 'yes') { 
      if (confidence === 'high') confidence = 'medium'; 
      missingItems.push('Downside/sensitivity analysis'); 
    }
    
    // Determine decision
    let decision = 'REJECT';
    let reasons = [];
    
    if (calculations.meetsThreshold === true) {
      decision = 'ADOPT';
      reasons.push('Meets financial threshold with defensible evidence');
      if (calculations.npv > 0) reasons.push(`Positive NPV of S$${calculations.npv.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      if (calculations.irr > 0) reasons.push(`IRR of ${calculations.irr.toFixed(1)}%`);
      if (calculations.paybackYears < Infinity) reasons.push(`Payback of ${calculations.paybackYears.toFixed(1)} years`);
    } else if (calculations.meetsThreshold === false) {
      // Check if near-miss
      const thresholdType = decisionRule.thresholdType;
      let isNearMiss = false;
      
      if (thresholdType === 'npv-wacc') {
        // For NPV, near-miss if within X% of first year benefit
        const firstYearBenefit = calculations.netAnnualBenefit;
        isNearMiss = Math.abs(calculations.npv) <= (firstYearBenefit * nearMissBand / 100);
      } else if (thresholdType === 'irr') {
        const targetIRR = parseFloat(decisionRule.irrTarget) || 0;
        isNearMiss = Math.abs(calculations.irr - targetIRR) <= nearMissBand;
      } else if (thresholdType === 'payback') {
        const targetPayback = parseFloat(decisionRule.paybackYears) || 5;
        const paybackDiff = calculations.paybackYears - targetPayback;
        isNearMiss = paybackDiff > 0 && paybackDiff <= (targetPayback * nearMissBand / 100);
      }
      
      if (isNearMiss && decisionRule.timeBoxRequired === 'yes') {
        decision = 'RE-TEST';
        reasons.push('Near-miss: within ' + nearMissBand + '% of threshold');
        reasons.push('May be resolvable with additional data/validation');
      } else {
        decision = 'REJECT';
        reasons.push('Misses financial threshold beyond near-miss band');
        if (calculations.npv < 0) reasons.push(`Negative NPV of S$${calculations.npv.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      }
    } else {
      // No threshold comparison possible
      decision = 'RE-TEST';
      confidence = 'low';
      reasons.push('Insufficient data to make definitive decision');
      reasons.push('Gather inputs to enable calculation');
    }
    
    // Override to RE-TEST if confidence is too low
    if (confidence === 'low' && decision === 'ADOPT') {
      decision = 'RE-TEST';
      reasons.unshift('Confidence too low for ADOPT - missing key inputs');
    }
    
    return {
      decision,
      confidence,
      reasons,
      missingItems
    };
  };

  // Knowledge base for generating explanations - sourced from Project Knowledge PDFs and web research
  const explanationKnowledge = {
    check1: {
      name: 'Coercive Trigger',
      failureReasons: {
        '1.1': {
          reason: 'No legal or regulatory requirement was identified for this initiative.',
          context: 'In Singapore, the BCA has implemented Mandatory Energy Performance Standards since 2008 for new buildings, and the Mandatory Energy Improvement (MEI) Regime since September 2025 requires energy-intensive buildings to undergo energy audits. Without a clear regulatory driver, initiatives may struggle to secure priority in budget allocation.',
          recommendation: 'Review if this initiative contributes to upcoming regulatory requirements like BCA Green Mark minimum standards or the Singapore Green Building Masterplan 80-80-80 targets for 2030.',
          source: 'BCA Singapore / NCCS'
        },
        '1.2': {
          reason: 'The initiative is not explicitly required in any tender, client brief, or contract.',
          context: 'Leading developers like CDL and Keppel REIT include sustainability requirements in their procurement and tender documents. ESR-REIT reports that green building certification targets are increasingly tied to investment criteria.',
          recommendation: 'Check if sustainability requirements can be incorporated into upcoming tenders or contract renewals. Review client ESG commitments that may create implicit requirements.',
          source: 'CDL Sustainability Report 2025'
        },
        '1.3': {
          reason: 'No certification or standard target was identified that this initiative supports.',
          context: 'Under BCA Green Mark 2021, buildings must achieve at least 50% improvement in energy performance compared to 2005 levels. Keppel REIT targets BCA Green Mark GoldPLUS minimum for all Singapore properties, with all current assets achieving Platinum certification.',
          recommendation: 'Identify if this initiative contributes points toward Green Mark, LEED, WELL, or other certifications the organization is pursuing.',
          source: 'Keppel REIT Sustainability Report 2024'
        },
        '1.4': {
          reason: 'No board or corporate mandate with enforcement mechanism was identified.',
          context: 'Leading organizations like AECOM incorporate sustainability-related KPIs in CEO and executive compensation. Frasers Property has board-level sustainability governance with quarterly ESG updates to the Board of Directors.',
          recommendation: 'Check if the organization has sustainability targets tied to performance reviews, budget approvals, or executive KPIs that this initiative could support.',
          source: 'AECOM Sustainability Report 2025'
        },
        '1.5': {
          reason: 'No real consequence within 12-18 months was identified for not implementing this initiative.',
          context: 'Without time-bound consequences, initiatives often lose priority to more urgent matters. Singapore\'s regulatory environment is tightening, with new MEI requirements and mandatory embodied carbon limits expected by 2025.',
          recommendation: 'Document any upcoming deadlines, lease renewals, certification recertifications, or regulatory changes that create a time-bound driver for this initiative.',
          source: 'Singapore Green Building Masterplan'
        }
      },
      passReasons: 'Strong regulatory alignment through BCA Green Mark requirements, corporate mandates, or certification targets provides a clear driver for this initiative.'
    },
    check2: {
      name: 'Strategic Fit',
      failureReasons: {
        '2.1': {
          reason: 'The initiative does not directly support a named environmental objective.',
          context: 'Leading companies have explicit ESG targets. CDL commits to net-zero carbon by 2030 for wholly-owned buildings. AECOM targets 60% reduction in Scope 1 and 2 emissions by 2030. Frasers Property\'s ESG Framework covers energy, carbon, water, waste, and IAQ objectives.',
          recommendation: 'Review the organization\'s sustainability policy, ESG plan, or project brief to identify named objectives this initiative could support.',
          source: 'Frasers Property ESG Report 2025'
        },
        '2.2': {
          reason: 'The initiative may not align with the asset strategy.',
          context: 'Asset strategy determines investment priorities. ESR-REIT\'s portfolio management strategy focuses on high-quality, resilient assets with decarbonization roadmaps aligned to Net Zero 2050.',
          recommendation: 'Clarify whether the asset is long-hold or divest, and whether the initiative timeline aligns with the investment horizon.',
          source: 'ESR-REIT Sustainability Report 2024'
        },
        '2.3': {
          reason: 'No evidence of stakeholder demand was identified.',
          context: 'Tenant and occupant activities account for approximately 50% of total building electricity consumption. CDL\'s Green Lease Partnership Programme and City Green Tenant Bonus Programme demonstrate tenant engagement creates adoption momentum.',
          recommendation: 'Gather evidence through tenant surveys, leasing discussions, investor communications, or competitor analysis to document stakeholder interest.',
          source: 'CDL Sustainability Report 2025'
        },
        '2.4': {
          reason: 'No internal sponsor with decision-making authority was identified.',
          context: 'Successful ESG initiatives require executive sponsorship. Keppel REIT has an ESG Committee that meets twice yearly to review sustainability risk management, reporting to the Board of Directors.',
          recommendation: 'Identify a budget owner, project director, or asset owner who can champion the initiative through the approval process.',
          source: 'Keppel REIT Sustainability Report 2024'
        },
        '2.5': {
          reason: 'Potential conflict with safety, downtime, or schedule constraints was not confirmed as addressed.',
          context: 'ESG initiatives must be balanced against operational requirements. Obayashi Corporation prioritizes safety goals alongside sustainability, using Total Recordable Incident Rate (TRIR) as a quantitative KPI.',
          recommendation: 'Confirm with operations and safety teams that the initiative can be implemented without compromising core project constraints.',
          source: 'Obayashi Corporate Report 2024'
        }
      },
      passReasons: 'Strong alignment with organizational ESG objectives, asset strategy, and stakeholder expectations supports strategic fit.'
    },
    check3: {
      name: 'Value Capture Path',
      failureReasons: {
        '3.1': {
          reason: 'No defined mechanism to recover costs or benefit financially was identified.',
          context: 'Value capture mechanisms include energy savings, green rental premiums, certification benefits, and reduced operating costs. Mitsubishi Estate\'s Green Lease Program returns a portion of energy savings to building owners, creating win-win outcomes.',
          recommendation: 'Define how the paying party will recover their investment through savings, fees, rental uplift, or other mechanisms.',
          source: 'Mitsubishi Estate Sustainability Report 2024'
        },
        '3.2': {
          reason: 'The value capture mechanism cannot be clearly documented or contracted.',
          context: 'For mechanisms to be enforceable, they must be written, measurable, and enforceable. Green lease clauses typically include energy budgets, pass-through provisions, and measurement protocols.',
          recommendation: 'Work with legal/contracts team to document the value capture mechanism in lease agreements, service contracts, or procurement terms.',
          source: 'Institute for Market Transformation (IMT)'
        },
        '3.3': {
          reason: 'No realistic paying party or payer mechanism was identified.',
          context: 'Common payer mechanisms include owner capital, tenant contributions, green loans, grants, and ESCO performance contracts. Keppel REIT achieved 82% sustainability-focused funding in 2024, up from a 50% target.',
          recommendation: 'Identify who will fund the initiative: owner budget, tenant agreement, grant program, green financing, or performance contract.',
          source: 'Keppel REIT Sustainability Report 2024'
        },
        '3.4': {
          reason: 'Risk allocation was not confirmed as acceptable for your role.',
          context: 'Risk allocation determines who carries performance risk, defect risk, delay risk, and cost overrun risk. Clear responsibilities prevent disputes and enable project execution.',
          recommendation: 'Review contract terms to ensure performance warranties, liability caps, and responsibility matrices are acceptable.',
          source: 'Industry Best Practice'
        },
        '3.5': {
          reason: 'The split incentive between owner and tenant has not been addressed.',
          context: 'The split incentive problem occurs when one party pays for improvements while another benefits from savings. Over 50% of property owners cite this as a barrier to energy efficiency investment. Green leases with cost recovery clauses can address this.',
          recommendation: 'Implement a green lease clause, service charge recovery mechanism, or performance contracting arrangement to align incentives.',
          source: 'Urban Land Institute / CBEI'
        }
      },
      passReasons: 'Clear value capture mechanism with identified payer, contractable terms, and aligned incentives supports financial viability.'
    },
    check4: {
      name: 'Rough Economic Pass',
      failureReasons: {
        '4.1': {
          reason: 'No rough cost numbers were available for this initiative.',
          context: 'Without cost estimates, it\'s impossible to evaluate financial viability. Costs should include capex (upfront investment) and opex (ongoing maintenance and operation).',
          recommendation: 'Obtain vendor quotes, benchmark data, or preliminary estimates to establish rough cost parameters.',
          source: 'Financial Best Practice'
        },
        '4.2': {
          reason: 'No rough benefit numbers were available.',
          context: 'Benefits should be defensible using benchmarks, past data, or vendor ranges. CDL reports cumulative energy initiatives since 2012 have yielded annual savings of over 14.5 million kWh, equivalent to more than S$3.5 million in cost savings.',
          recommendation: 'Quantify expected benefits including energy savings, avoided penalties, certification value, or rental premium uplift.',
          source: 'CDL Sustainability Report 2025'
        },
        '4.3': {
          reason: 'The initiative may not meet the organization\'s investment decision rule.',
          context: 'Organizations typically use payback period, IRR, or NPV thresholds to evaluate investments. Without meeting these hurdles, initiatives struggle for budget approval.',
          recommendation: 'Calculate payback period, IRR, or NPV and compare against organizational thresholds. Consider whole-life value including ESG benefits.',
          source: 'Financial Best Practice'
        },
        '4.4': {
          reason: 'The downside case (20% lower benefits) has not been tested.',
          context: 'Sensitivity analysis protects against over-optimism. If the initiative fails to deliver expected benefits, will it still be acceptable?',
          recommendation: 'Model a scenario with 20% lower benefits to test whether the initiative remains viable under conservative assumptions.',
          source: 'Financial Best Practice'
        },
        '4.5': {
          reason: 'No realistic funding path was identified.',
          context: 'Funding paths include operating budget, capital budget, green loans, grants, and ESCO contracts. Frasers Property raised 23 sustainable financing transactions totaling ~$4.2 billion, with ~61% of Group borrowing from green and sustainable financing.',
          recommendation: 'Identify the budget line, approval authority, or external financing mechanism that will fund this initiative.',
          source: 'Frasers Property ESG Report 2025'
        }
      },
      passReasons: 'Rough economics with defensible cost and benefit estimates meeting organizational decision rules supports financial feasibility.'
    },
    check5: {
      name: 'Feasible to Implement',
      failureReasons: {
        '5.1': {
          reason: 'Implementation within site constraints was not confirmed.',
          context: 'Practical feasibility includes space availability, access for installation, safety requirements, downtime limits, and approval processes.',
          recommendation: 'Conduct a site assessment to verify the initiative can be physically implemented without breaking constraints.',
          source: 'Implementation Best Practice'
        },
        '5.2': {
          reason: 'No usable baseline exists for comparison.',
          context: 'Baselines are essential for proving improvement. ESR-REIT uses KPI quantification approaches with baseline performance restated for comparability. Without baseline data, performance claims cannot be verified.',
          recommendation: 'Gather historical data from utility bills, equipment logs, or pre-installation measurements to establish the baseline.',
          source: 'ESR-REIT Sustainability Report 2024'
        },
        '5.3': {
          reason: 'Data access permissions may not be achievable.',
          context: 'Many ESG initiatives fail because data is blocked, not because technology fails. Permissions may be needed from owners, tenants, FM, or cybersecurity teams.',
          recommendation: 'Identify required data access and initiate approval processes early to prevent delays.',
          source: 'Implementation Best Practice'
        },
        '5.4': {
          reason: 'No delivery capability plan exists.',
          context: 'Delivery capability includes vendor availability, internal skills, maintenance capability, and commissioning plans. AECOM emphasizes identifying performance metrics and clear implementation plans for credible sustainability outcomes.',
          recommendation: 'Develop a delivery plan covering procurement, installation, commissioning, and ongoing maintenance.',
          source: 'AECOM Sustainability Report 2025'
        },
        '5.5': {
          reason: 'No measurement approach was defined to verify performance.',
          context: 'Measurement and verification is the "proof plan" that makes outcomes credible. This includes what is measured, how often, responsible party, and meters/tools used.',
          recommendation: 'Define the M&V protocol including metrics, measurement frequency, responsible parties, and reporting requirements.',
          source: 'Implementation Best Practice'
        }
      },
      passReasons: 'Confirmed site feasibility, baseline data, delivery capability, and measurement approach supports successful implementation.'
    }
  };

  // Generate explanations for the Gate 0 results
  const generateGate0Explanations = (results, answers) => {
    const explanations = {};
    const checkKeys = ['check1', 'check2', 'check3', 'check4', 'check5'];
    
    results.checks.forEach((check, index) => {
      const checkKey = checkKeys[index];
      const checkQuestions = gate0Questions[checkKey].questions;
      const knowledge = explanationKnowledge[checkKey];
      
      // Find questions answered "No"
      const noAnswers = checkQuestions.filter(q => answers[q.id] === 'no');
      
      if (check.passed) {
        // For passed checks that aren't 100%, explain what could be improved
        if (check.percentage < 100) {
          const gaps = noAnswers.map(q => ({
            id: q.id,
            label: q.label,
            ...knowledge.failureReasons[q.id]
          }));
          
          explanations[checkKey] = {
            type: 'improvement',
            summary: `This check passed at ${check.percentage}%, but some areas could strengthen the case.`,
            gaps,
            overallNote: knowledge.passReasons
          };
        } else {
          explanations[checkKey] = {
            type: 'full-pass',
            summary: `This check achieved 100%. ${knowledge.passReasons}`,
            gaps: [],
            overallNote: knowledge.passReasons
          };
        }
      } else {
        // For failed checks, explain why and what to do
        const gaps = noAnswers.map(q => ({
          id: q.id,
          label: q.label,
          ...knowledge.failureReasons[q.id]
        }));
        
        explanations[checkKey] = {
          type: 'failure',
          summary: `This check scored ${check.percentage}%, below the 80% threshold required to pass.`,
          gaps,
          overallNote: `To pass this check, address the gaps identified above. ${knowledge.passReasons}`
        };
      }
    });
    
    return explanations;
  };

  // Calculate Gate 0 scores from answers
  const calculateGate0Scores = (answers) => {
    const checks = ['check1', 'check2', 'check3', 'check4', 'check5'];
    const results = [];
    
    checks.forEach((checkKey, index) => {
      const check = gate0Questions[checkKey];
      let yesCount = 0;
      let applicableCount = 0;
      
      check.questions.forEach(q => {
        const answer = answers[q.id];
        if (answer === 'yes') {
          yesCount++;
          applicableCount++;
        } else if (answer === 'no') {
          applicableCount++;
        }
        // NA doesn't count toward applicable
      });
      
      const percentage = applicableCount > 0 ? (yesCount / applicableCount) * 100 : 0;
      const passed = percentage >= 80;
      
      results.push({
        checkNumber: index + 1,
        name: check.name,
        yesCount,
        applicableCount,
        totalQuestions: check.questions.length,
        naCount: check.questions.length - applicableCount,
        percentage: Math.round(percentage * 10) / 10,
        passed
      });
    });
    
    // Calculate totals
    const totalYes = results.reduce((sum, r) => sum + r.yesCount, 0);
    const totalApplicable = results.reduce((sum, r) => sum + r.applicableCount, 0);
    const totalPercentage = totalApplicable > 0 ? (totalYes / totalApplicable) * 100 : 0;
    const passedCount = results.filter(r => r.passed).length;
    
    // Determine decision
    let decision;
    if (passedCount === 5) {
      decision = { text: 'ADOPT', emoji: '🟩', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    } else if (passedCount === 4) {
      decision = { text: 'TEST', emoji: '🟧', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    } else {
      decision = { text: 'REJECT', emoji: '🟥', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    }
    
    // Find failing criterion for pilot test
    const failingCheck = results.find(r => !r.passed);
    
    return {
      checks: results,
      totalYes,
      totalApplicable,
      totalQuestions: 25,
      totalPercentage: Math.round(totalPercentage * 10) / 10,
      passedCount,
      decision,
      failingCheck
    };
  };

  // Check if NA is allowed for a question based on context
  const isNAAllowed = (question, context, answers) => {
    if (!question.allowNA) return false;
    if (!question.naCondition) return true;
    return question.naCondition(context, answers);
  };

  // OLD DECISION LOGIC (Gate 0) - kept for compatibility
  const getDecision = (scores) => {
    const lowScores = scores.filter(s => s.score <= 3).length;
    if (lowScores === 0) return { text: 'ADOPT', emoji: '🟩', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    if (lowScores === 1) return { text: 'TEST', emoji: '🟧', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    return { text: 'REJECTED', emoji: '🟥', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
  };

  // ==================== GATE SUMMARY SYSTEM ====================
  
  // Generate a tailored summary when completing a gate
  const generateGateSummary = (gateNumber, data) => {
    const { question, scorecard, evalPath, gate1Data, gate2Data } = data;
    
    // Extract initiative name from question
    const getInitiativeName = (q) => {
      if (!q) return 'This initiative';
      const lower = q.toLowerCase();
      if (lower.includes('solar') || lower.includes('pv')) return 'Solar PV Installation';
      if (lower.includes('ev') || lower.includes('charger')) return 'EV Charging Infrastructure';
      if (lower.includes('rainwater') || lower.includes('harvest')) return 'Rainwater Harvesting System';
      if (lower.includes('recycled') || lower.includes('concrete')) return 'Recycled Concrete Usage';
      return 'This Initiative';
    };
    
    const initiativeName = getInitiativeName(question);
    
    if (gateNumber === 0 && scorecard) {
      const scores = scorecard.scores;
      const decision = getDecision(scores);
      const topScores = scores.filter(s => s.score >= 4).sort((a, b) => b.score - a.score);
      const weakScores = scores.filter(s => s.score <= 3);
      const wasRetest = evalPath?.wasRetest || false;
      const resolvedCriterion = evalPath?.resolvedCriterion || null;
      
      // Generate short summary
      let shortSummary = '';
      if (!wasRetest) {
        shortSummary = `Your ${initiativeName.toLowerCase()} initiative passed Gate 0 with strong scores across all 5 criteria. `;
        if (topScores.length >= 2) {
          shortSummary += `Particularly strong performance on ${topScores[0].criterion} and ${topScores[1].criterion}. `;
        }
        shortSummary += `The rough economic assessment indicates favorable conditions for proceeding to detailed business case analysis.`;
      } else {
        shortSummary = `Your ${initiativeName.toLowerCase()} initiative initially triggered a RE-TEST due to a weaker score on ${resolvedCriterion}. `;
        shortSummary += `After evaluation, the concerns were addressed and the decision was upgraded to ADOPT. `;
        shortSummary += `This area may warrant continued attention during the business case test.`;
      }
      
      // Generate key findings
      const keyFindings = topScores.slice(0, 3).map(s => {
        const findingMap = {
          'Coercive Trigger': `Regulatory support: ${s.score === 5 ? 'Strong mandate from BCA Green Mark or company policy' : 'Moderate regulatory alignment identified'}`,
          'Strategic Fit': `Strategic alignment: ${s.score === 5 ? 'Directly supports net-zero and ESG commitments' : 'Aligns with sustainability objectives'}`,
          'Value Capture Path': `Value capture: ${s.score === 5 ? 'Clear monetization pathway defined' : 'Benefits can be quantified and captured'}`,
          'Rough Economic Pass': `Economics: ${s.score === 5 ? 'Strong payback within acceptable timeframe' : 'Favorable cost-benefit indicators'}`,
          'Feasible to Implement': `Feasibility: ${s.score === 5 ? 'Mature technology with proven contractors' : 'Implementation pathway is viable'}`
        };
        return findingMap[s.criterion] || `${s.criterion}: Score ${s.score}/5`;
      });
      
      // Areas resolved (if retest)
      const areasResolved = wasRetest && resolvedCriterion ? [
        `${resolvedCriterion}: Initially flagged, resolved through pilot test evaluation`
      ] : [];
      
      // Next step guidance
      const nextStepGuidance = `You're now in Gate 1: Business Case Test. When ready, click "Run Business Case Test" to validate the financial model with detailed baseline comparison, cost analysis, and financing pathway assessment.`;
      
      // Full details
      const fullDetails = {
        scores: scores.map(s => ({ criterion: s.criterion, score: s.score, status: s.score >= 4 ? 'PASS' : 'REVIEW' })),
        evidence: scorecard.evidence || [],
        assumptions: scorecard.assumptions || [],
        evaluationPath: wasRetest ? `RE-TEST triggered on ${resolvedCriterion}, resolved via evaluation` : 'Direct ADOPT - all criteria met'
      };
      
      return {
        gateNumber: 0,
        initiative: initiativeName,
        question: question,
        outcome: 'ADOPT',
        shortSummary,
        keyFindings,
        areasResolved,
        nextStepGuidance,
        fullDetails
      };
    }
    
    if (gateNumber === 1 && gate1Data) {
      const { results, wasRetest, retestData } = gate1Data;
      const strongSteps = results.steps.filter(s => s.status === 'strong' || s.status === 'improved');
      const reviewSteps = results.steps.filter(s => s.status === 'moderate' || s.status === 'weak');
      
      let shortSummary = '';
      if (!wasRetest) {
        shortSummary = `Your ${initiativeName.toLowerCase()} initiative passed the Gate 1 Business Case Test with strong performance. `;
        if (strongSteps.length >= 2) {
          shortSummary += `Solid results on ${strongSteps[0].name} and ${strongSteps[1].name}. `;
        }
        shortSummary += `The financial model validates the investment case against the baseline scenario.`;
      } else {
        const confirmedCount = retestData?.confirmedCount || 0;
        shortSummary = `Your initiative initially required additional data gathering. After confirming ${confirmedCount} of 5 data points, `;
        shortSummary += `the business case was strengthened sufficiently to achieve ADOPT status. `;
        shortSummary += `Key improvements were made in areas that initially showed uncertainty.`;
      }
      
      const keyFindings = strongSteps.slice(0, 3).map(s => {
        return `${s.name}: ${s.status === 'improved' ? 'Improved after data gathering' : 'Strong evidence supporting viability'}`;
      });
      
      const areasResolved = wasRetest ? reviewSteps.map(s => `${s.name}: Addressed through additional data confirmation`) : [];
      
      const nextStepGuidance = `You're now in Gate 2: Commercial & Contractual Lock-In. Confirm that all 4 enabler checkers are contractually secured before final adoption.`;
      
      const fullDetails = {
        steps: results.steps.map(s => ({ name: s.name, status: s.status, finding: s.finding })),
        evidence: results.steps.flatMap(s => s.evidence || []),
        totalScore: results.totalHiddenScore,
        evaluationPath: wasRetest ? `RE-TEST: ${retestData?.confirmedCount || 0}/5 data points confirmed` : 'Direct ADOPT'
      };
      
      return {
        gateNumber: 1,
        initiative: initiativeName,
        question: question,
        outcome: 'ADOPT',
        shortSummary,
        keyFindings,
        areasResolved,
        nextStepGuidance,
        fullDetails
      };
    }
    
    if (gateNumber === 2 && gate2Data) {
      const { enablerResults, economicResults, wasEnablement, enablementData } = gate2Data;
      const passedEnablers = Object.entries(enablerResults).filter(([k, v]) => v === true);
      
      let shortSummary = '';
      if (!wasEnablement) {
        shortSummary = `All 4 enabler checkers for your ${initiativeName.toLowerCase()} initiative were confirmed on first assessment. `;
        shortSummary += `The commercial and contractual framework is fully secured. `;
      } else {
        shortSummary = `Your initiative required an enablement period to close gaps in ${enablementData?.closedGaps?.join(', ') || 'certain areas'}. `;
        shortSummary += `After ${enablementData?.duration || 'the enablement period'}, all gaps were successfully closed. `;
      }
      shortSummary += `Economic clarity assessment confirms the investment remains viable with actual contract terms.`;
      
      const keyFindings = [
        `Value-Capture: Contractually defined and secured`,
        `Financing: Terms locked at ${economicResults?.interestRate || 'agreed'}% interest`,
        `Data Delivery: M&V requirements contractually specified`,
        `Risk Coverage: Performance guarantees and defects liability in place`
      ];
      
      const areasResolved = wasEnablement ? (enablementData?.closedGaps || []).map(g => `${g}: Gap closed during enablement period`) : [];
      
      const nextStepGuidance = `You're now in Gate 3: Implementation. The initiative is fully approved for execution with all commercial terms locked in.`;
      
      const fullDetails = {
        enablers: enablerResults,
        economics: economicResults,
        evaluationPath: wasEnablement ? `Enablement period: ${enablementData?.duration}` : 'All enablers confirmed immediately'
      };
      
      return {
        gateNumber: 2,
        initiative: initiativeName,
        question: question,
        outcome: 'FINAL ADOPT',
        shortSummary,
        keyFindings,
        areasResolved,
        nextStepGuidance,
        fullDetails
      };
    }
    
    return null;
  };

  // Summary Card Component - Reusable across all views
  const SummaryCard = ({ summary, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    
    if (!summary) return null;
    
    const gateColors = {
      0: { primary: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
      1: { primary: '#A78BFA', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
      2: { primary: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' }
    };
    
    const colors = gateColors[summary.gateNumber] || gateColors[0];
    
    return (
      <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
        {/* Collapsed Header */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>
                INITIATIVE SUMMARY
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
                "{summary.question}" - <span style={{ color: colors.primary }}>Passed Gate {summary.gateNumber}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
              {summary.outcome}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${colors.border}` }}>
            {/* Short Summary */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                {summary.shortSummary}
              </p>
            </div>
            
            {/* Key Findings */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                KEY FINDINGS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {summary.keyFindings.map((finding, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: colors.primary }}>•</span>
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Areas Resolved (if any) */}
            {summary.areasResolved && summary.areasResolved.length > 0 && (
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                  AREAS RESOLVED
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {summary.areasResolved.map((area, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#10B981' }}>
                      <span>✓</span>
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Full Details (Expandable) */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                GATE {summary.gateNumber} DETAILS
              </div>
              
              {summary.fullDetails.scores && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {summary.fullDetails.scores.map((s, i) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', background: s.status === 'PASS' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'PASS' ? '#10B981' : '#F59E0B' }}>
                      {s.criterion}: {s.score}/5
                    </span>
                  ))}
                </div>
              )}
              
              {summary.fullDetails.steps && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {summary.fullDetails.steps.map((s, i) => (
                    <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ color: s.status === 'strong' || s.status === 'improved' ? '#10B981' : '#F59E0B' }}>
                        {s.status === 'strong' || s.status === 'improved' ? '✓' : '○'}
                      </span>
                      {' '}{s.name}
                    </div>
                  ))}
                </div>
              )}
              
              {summary.fullDetails.evidence && summary.fullDetails.evidence.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Evidence Used:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {summary.fullDetails.evidence.slice(0, 5).map((e, i) => (
                      <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '9px', background: e.type === 'pdf' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: e.type === 'pdf' ? '#10B981' : '#3B82F6' }}>
                        {e.type === 'pdf' ? '📄' : '🌐'} {e.source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Evaluation Path:</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{summary.fullDetails.evaluationPath}</div>
              </div>
            </div>
            
            {/* Next Step Guidance */}
            <div style={{ padding: '14px 0 0' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                NEXT STEP
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: colors.primary, lineHeight: '1.5', fontWeight: '500' }}>
                {summary.nextStepGuidance}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Summary Chat Message Component - For displaying in chat
  const SummaryChatMessage = ({ summary }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!summary) return null;
    
    const gateColors = {
      0: { primary: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
      1: { primary: '#A78BFA', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
      2: { primary: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' }
    };
    
    const colors = gateColors[summary.gateNumber] || gateColors[0];
    
    return (
      <div style={{ background: colors.bg, border: `2px solid ${colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ width: '40px', height: '40px', background: `${colors.primary}30`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎉</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: colors.primary }}>Gate {summary.gateNumber} Complete</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{summary.initiative}</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
              {summary.outcome}
            </span>
          </div>
          
          {/* Short Summary */}
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
            {summary.shortSummary}
          </p>
        </div>
        
        {/* Key Findings */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
            KEY FINDINGS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.keyFindings.map((finding, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: colors.primary, fontWeight: '700' }}>•</span>
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Expandable Full Details */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.1)' }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
            {isExpanded ? '▲ Hide Full Details' : '▼ View Full Details'}
          </span>
        </div>
        
        {isExpanded && (
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.15)' }}>
            {/* Areas Resolved */}
            {summary.areasResolved && summary.areasResolved.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  AREAS RESOLVED
                </div>
                {summary.areasResolved.map((area, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#10B981', marginBottom: '4px' }}>
                    <span>✓</span>
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Scores/Steps */}
            {summary.fullDetails.scores && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  SCORES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {summary.fullDetails.scores.map((s, i) => (
                    <span key={i} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', background: s.status === 'PASS' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.status === 'PASS' ? '#10B981' : '#F59E0B' }}>
                      {s.criterion}: {s.score}/5
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {summary.fullDetails.steps && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  TEST STEPS
                </div>
                {summary.fullDetails.steps.map((s, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    <span style={{ color: s.status === 'strong' || s.status === 'improved' ? '#10B981' : '#F59E0B' }}>
                      {s.status === 'strong' || s.status === 'improved' ? '✓' : '○'}
                    </span>
                    {' '}{s.name}
                  </div>
                ))}
              </div>
            )}
            
            {/* Evidence */}
            {summary.fullDetails.evidence && summary.fullDetails.evidence.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  EVIDENCE USED
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {summary.fullDetails.evidence.slice(0, 6).map((e, i) => (
                    <span key={i} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '9px', background: e.type === 'pdf' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: e.type === 'pdf' ? '#10B981' : '#3B82F6' }}>
                      {e.type === 'pdf' ? '📄' : '🌐'} {e.source}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Evaluation Path */}
            <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Evaluation Path</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{summary.fullDetails.evaluationPath}</div>
            </div>
          </div>
        )}
        
        {/* Next Step */}
        <div style={{ padding: '16px', background: colors.bg, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>NEXT STEP</div>
              <div style={{ fontSize: '12px', color: colors.primary, fontWeight: '500' }}>{summary.nextStepGuidance}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Evaluation questions for each criterion (required: true means must be Yes to adopt)
  const evalQuestions = {
    'Coercive Trigger': [
      { id: 'q1', text: 'Is this a requirement to obtain BCA Green Mark awards?', required: true },
      { id: 'q2', text: 'Does the company/project management see this as a must-have?', required: true }
    ],
    'Strategic Fit': [
      { id: 'q1', text: 'Does the proposed action support the internal asset strategy of the project?', required: true },
      { id: 'q2', text: 'Does the proposed action enable the project/company to achieve its ESG targets?', required: true },
      { id: 'q3', text: 'Is the proposed action a demand from the tenant?', required: false }
    ],
    'Value Capture Path': {
      type: 'role-based',
      roleQuestion: 'What is your role?',
      roles: ['Developer / Owner / Facilities Manager', 'Contractor', 'Consultant'],
      followUp: {
        'Developer / Owner / Facilities Manager': {
          questions: [
            { id: 'dev_q1', text: 'Do you have at least 1 of these: Green-lease, Service Charge, Rebate path defined?', required: true }
          ],
          adoptCondition: (answers) => answers.dev_q1 === true
        },
        'Contractor': {
          questions: [
            { id: 'con_q1', text: 'Are you being paid for the proposed action under your contract scope?', required: true },
            { id: 'con_q2', text: 'Is there a financial benefit (Cost Savings) for the proposed action?', required: false },
            { id: 'con_q3', text: 'Is there legal LD-avoidance?', required: true }
          ],
          adoptCondition: (answers) => answers.con_q1 === true && answers.con_q3 === true
        },
        'Consultant': {
          questions: [
            { id: 'cons_q1', text: 'Does the cost of the proposed action fully cover the original contract scope of works, including any potential additional benefits?', required: true },
            { id: 'cons_q2', text: 'Does the proposed action avoid introducing any additional project risks or liabilities?', required: true }
          ],
          adoptCondition: (answers) => answers.cons_q1 === true && answers.cons_q2 === true
        }
      }
    },
    'Rough Economic Pass': {
      type: 'role-based',
      roleQuestion: 'What is your role?',
      roles: ['Developer / Owner', 'Facility Manager / REIT', 'Contractor', 'Consultant'],
      followUp: {
        'Developer / Owner': {
          questions: [
            { id: 'dev_q1', text: 'Is the plausible net present value more than 0 at Weighted Average Cost of Capital (WACC)?', required: true }
          ],
          adoptCondition: (answers) => answers.dev_q1 === true
        },
        'Facility Manager / REIT': {
          questions: [
            { id: 'fm_q1', text: 'Is the payback period less than 3-5 years?', required: true }
          ],
          adoptCondition: (answers) => answers.fm_q1 === true
        },
        'Contractor': {
          questions: [
            { id: 'con_q1', text: 'Is the gain share equal to or greater than the at-risk effort?', required: true }
          ],
          adoptCondition: (answers) => answers.con_q1 === true
        },
        'Consultant': {
          questions: [
            { id: 'cons_q1', text: 'Is the fee protection equal to or greater than the extra effort?', required: true }
          ],
          adoptCondition: (answers) => answers.cons_q1 === true
        }
      }
    },
    'Feasible to Implement & Meter': [
      { id: 'q1', text: 'Is there available basic baselines/data access/supply/skills/space for metering?', required: true }
    ]
  };

  // Helper function to generate answer text based on actual decision
  const generateAnswerText = (scores, baseAnswer, topic) => {
    const lowScores = scores.filter(s => s.score <= 3);
    const lowCount = lowScores.length;
    
    if (lowCount === 0) {
      // ADOPT - all criteria pass
      return `Yes, adopt ${topic}. All criteria meet threshold: ${scores.map(s => s.criterion.toLowerCase()).join(', ')} all score 4 or above.`;
    } else if (lowCount === 1) {
      // RE-TEST - exactly one weak criterion
      const weakCriterion = lowScores[0].criterion;
      return `You should pilot test ${topic} because while most criteria are strong, ${weakCriterion.toLowerCase()} needs validation before full adoption.`;
    } else {
      // REJECTED - multiple weak criteria
      const weakCriteria = lowScores.map(s => s.criterion.toLowerCase()).join(', ');
      return `${topic} is not recommended at this time because multiple criteria do not meet threshold: ${weakCriteria}. Consider addressing these gaps before proceeding.`;
    }
  };

  const getMockScorecard = (question) => {
    const q = question.toLowerCase();
    
    if (q.includes('recycled') || q.includes('concrete')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test recycled concrete because while it strongly aligns with ESG goals and BCA Green Mark, the economic case (5-15% cost premium) needs validation for your specific project before full adoption.',
        evidence: [
          { type: 'pdf', source: 'CDL_SUSTAINABILITY_REPORT_2025.pdf', page: 47, verified: true },
          { type: 'pdf', source: 'BCA Green Mark Guidelines', page: 24, verified: true },
          { type: 'web', source: 'World Green Building Council', url: 'https://worldgbc.org', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['BCA Green Mark awards points for recycled content', 'Rising regulatory pressure on embodied carbon', 'Major developers now specifying recycled aggregates'], evidence: 'BCA Green Mark 2021, Section 3.2' },
          { criterion: 'Strategic Fit', score: 5, reasons: ['Directly supports Scope 3 emission reduction targets', 'Aligns with circular economy commitments', 'Matches stakeholder expectations on sustainable materials'], evidence: 'CDL_SUSTAINABILITY_REPORT_2025.pdf, p.47' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Green Mark certification points translate to GFA bonus', 'Tenant demand for green buildings increasing', 'Green financing eligibility improved'], evidence: 'Industry benchmarks, SGBC data' },
          { criterion: 'Rough Economic Pass', score: 3, reasons: ['5-15% cost premium typical (assumption)', 'Offset by certification benefits', 'Payback via green financing rates'], evidence: 'Cost estimate based on Singapore market data' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Multiple local suppliers available (e.g., Pan United)', 'Standard testing protocols exist', 'Embodied carbon calculable via EPDs'], evidence: 'Singapore Concrete Institute, supplier data' }
        ],
        total: 20,
        assumptions: ['Standard commercial building in Singapore', 'Recycled aggregate content 30-50%', 'No unusual structural requirements'],
        whatWouldChange: ['Higher score if project requires Green Mark Platinum', 'Lower score if structural engineer raises concerns', 'Higher if client has net-zero commitment'],
        nextSteps: ['Get quotes from 3 certified suppliers (Pan United, Island Concrete, Alliance)', 'Confirm structural engineer approval for mix design', 'Calculate embodied carbon reduction using EPD data', 'Check Green Mark points allocation with BCA assessor', 'Document for sustainability report']
      };
    }
    
    if (q.includes('rainwater') || q.includes('harvest')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test rainwater harvesting because while it has strong strategic fit and value capture potential, the economics need validation for your specific building before full commitment.',
        evidence: [
          { type: 'pdf', source: 'CAPITALAND_ASCOTT_TRUST_SUSTAINABILITY_REPORT_2023.pdf', page: 38, verified: true },
          { type: 'web', source: 'PUB Singapore', url: 'https://pub.gov.sg', verified: true },
          { type: 'web', source: 'BCA Green Mark', url: 'https://www1.bca.gov.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['PUB actively promotes water conservation', 'Green Mark awards significant points', 'Aligns with national water security goals'], evidence: 'PUB ABC Waters Guidelines' },
          { criterion: 'Strategic Fit', score: 4, reasons: ['Supports water stewardship ESG targets', 'Aligns with Singapore water resilience goals', 'Demonstrates environmental leadership'], evidence: 'CAPITALAND_ASCOTT_TRUST_SUSTAINABILITY_REPORT_2023.pdf, p.38' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Direct water cost savings (potable water rates rising)', 'Green Mark certification benefits', 'Reduced drainage charges'], evidence: 'PUB tariff data, industry case studies' },
          { criterion: 'Rough Economic Pass', score: 3, reasons: ['CAPEX: $50-150k typical for commercial building (assumption)', 'OPEX savings: 20-40% non-potable water use', 'Payback: 5-8 years may vary by building'], evidence: 'Industry benchmarks, assumption marked' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Mature technology, local contractors available', 'Simple metering via flow meters', 'PUB has clear guidelines'], evidence: 'PUB technical guidelines, market availability' }
        ],
        total: 19,
        assumptions: ['Building has adequate roof/catchment area', 'Non-potable demand exists (irrigation, toilet flushing)', 'No heritage or structural constraints'],
        whatWouldChange: ['Higher score if building has large irrigation needs', 'Lower if limited catchment area or space for tanks', 'Higher if pursuing Green Mark Platinum'],
        nextSteps: ['Assess catchment area and calculate yield potential', 'Identify non-potable water demand (toilets, irrigation, cooling towers)', 'Get 3 quotes from system suppliers', 'Consult PUB on approvals required', 'Design metering and monitoring system', 'Calculate detailed ROI with current water tariffs']
      };
    }
    
    if (q.includes('ev') || q.includes('charger') || q.includes('electric vehicle')) {
      return {
        type: 'scorecard',
        answer: 'Yes, adopt EV charger installation. All criteria meet threshold: LTA mandates EV-ready provisions, strong strategic alignment with Green Plan 2030, clear revenue path, favorable economics with government grants, and straightforward implementation.',
        evidence: [
          { type: 'pdf', source: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf', page: 52, verified: true },
          { type: 'web', source: 'LTA Singapore', url: 'https://lta.gov.sg', verified: true },
          { type: 'web', source: 'BCA Green Mark 2021', url: 'https://www1.bca.gov.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 5, reasons: ['LTA mandates EV-ready provisions for new developments', 'BCA Green Mark requires EV charging points', 'Government targeting 60,000 charging points by 2030'], evidence: 'LTA EV Charging Regulations 2023' },
          { criterion: 'Strategic Fit', score: 4, reasons: ['Supports Scope 3 emission reduction (tenant travel)', 'Future-proofs asset for EV transition', 'Aligns with Singapore Green Plan 2030'], evidence: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf, p.52' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Charging fee revenue potential', 'Premium tenant attraction', 'Asset value protection'], evidence: 'Market research, tenant surveys' },
          { criterion: 'Rough Economic Pass', score: 4, reasons: ['CAPEX: $3-8k per AC charger, $30-80k per DC fast charger', 'Revenue via charging fees or tenant premium', 'Government co-funding available (up to 50%)'], evidence: 'LTA EV Common Charger Grant, supplier quotes' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Multiple certified installers available', 'Standard OCPP protocols for monitoring', 'Electricity metering straightforward'], evidence: 'SP Group guidelines, market availability' }
        ],
        total: 21,
        assumptions: ['Adequate electrical capacity or upgrade feasible', 'Carpark has suitable locations', 'Building owner controls carpark'],
        whatWouldChange: ['Lower score if major electrical upgrade needed', 'Higher if targeting premium tenants', 'Lower if strata approval complex'],
        nextSteps: ['Assess electrical capacity with SP Group', 'Determine optimal charger mix (AC/DC ratio)', 'Apply for LTA EV Common Charger Grant', 'Select charging network operator', 'Plan phased rollout based on demand', 'Set up monitoring and billing system']
      };
    }
    
    if (q.includes('solar') || q.includes('pv') || q.includes('photovoltaic')) {
      return {
        type: 'scorecard',
        answer: 'Yes, adopt solar PV installation. All criteria meet threshold: strong regulatory support via Solar Nova programme, direct Scope 2 emission reduction, clear cost savings at grid parity, favorable 6-10 year payback, and mature technology with easy metering.',
        evidence: [
          { type: 'pdf', source: 'MITSUBISHI_ESTATE_GROUP_SUSTAINABILITY_REPORT_2024.pdf', page: 63, verified: true },
          { type: 'web', source: 'EMA Singapore', url: 'https://ema.gov.sg', verified: true },
          { type: 'web', source: 'Solar Energy Research Institute', url: 'https://seris.nus.edu.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['BCA Green Mark awards significant points for renewables', 'Government Solar Nova programme driving adoption', 'Large consumers face carbon tax pressure'], evidence: 'EMA Solar policies, BCA Green Mark 2021' },
          { criterion: 'Strategic Fit', score: 5, reasons: ['Directly reduces Scope 2 emissions', 'Visible demonstration of sustainability commitment', 'Supports RE100/net-zero targets'], evidence: 'MITSUBISHI_ESTATE_GROUP_SUSTAINABILITY_REPORT_2024.pdf, p.63' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Electricity cost savings (grid parity achieved)', 'Excess can be sold back to grid', 'Green certification benefits'], evidence: 'EMA market data, industry case studies' },
          { criterion: 'Rough Economic Pass', score: 4, reasons: ['CAPEX: $1.20-1.50/Wp installed', 'LCOE now competitive with grid', 'Payback: 6-10 years typical'], evidence: 'SERIS data, market quotes' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Mature technology, many installers', 'Generation easily metered', 'Standard grid connection process'], evidence: 'SP Group guidelines, EMA licensing' }
        ],
        total: 21,
        assumptions: ['Adequate unshaded roof area available', 'Roof structure can support panels', 'No heritage restrictions'],
        whatWouldChange: ['Lower if significant shading issues', 'Higher if combined with battery storage', 'Lower if roof needs replacement soon'],
        nextSteps: ['Conduct solar feasibility study (shading analysis)', 'Assess roof structural capacity', 'Get 3 quotes from EMA-licensed installers', 'Evaluate PPA vs ownership model', 'Apply for relevant permits', 'Plan grid connection with SP Group', 'Set up generation monitoring system']
      };
    }
    
    // Green roof - Strategic Fit is the lowest criterion (RE-TEST)
    if (q.includes('green roof') || q.includes('rooftop garden')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test a green roof because while it has strong regulatory support and feasibility, the strategic alignment with your core ESG priorities needs validation before full commitment.',
        evidence: [
          { type: 'pdf', source: 'FRASERS_PROPERTY_ESG_REPORT_2025.pdf', page: 34, verified: true },
          { type: 'web', source: 'BCA Green Mark', url: 'https://www1.bca.gov.sg', verified: true },
          { type: 'web', source: 'NParks Singapore', url: 'https://nparks.gov.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['BCA Green Mark awards points for greenery', 'NParks LUSH programme incentivizes green roofs', 'URA may require greenery replacement'], evidence: 'BCA Green Mark 2021, NParks guidelines' },
          { criterion: 'Strategic Fit', score: 3, reasons: ['May not directly address core ESG materiality topics', 'Biodiversity not always a stated priority', 'Competes with solar PV for roof space'], evidence: 'Assumption - needs alignment check' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Green Mark certification points', 'Potential tenant amenity value', 'Urban heat island reduction'], evidence: 'Industry case studies' },
          { criterion: 'Rough Economic Pass', score: 4, reasons: ['CAPEX: $150-300 psm typical', 'Maintenance costs offset by energy savings', 'NParks grants available up to 50%'], evidence: 'NParks Skyrise Greenery Incentive Scheme' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Established technology and contractors', 'Thermal performance measurable', 'Biodiversity can be monitored'], evidence: 'NParks certified installers' }
        ],
        total: 19,
        assumptions: ['Roof structure can support additional load', 'Adequate waterproofing in place', 'Access for maintenance available'],
        whatWouldChange: ['Higher if biodiversity is a stated ESG priority', 'Lower if roof space needed for solar PV', 'Higher if tenant wellness is a focus'],
        nextSteps: ['Verify alignment with company ESG materiality matrix', 'Assess roof structural capacity for additional load', 'Get quotes from NParks-certified contractors', 'Apply for Skyrise Greenery Incentive Scheme', 'Design maintenance access plan']
      };
    }
    
    // Smart lighting - Value Capture Path is the lowest criterion (RE-TEST)
    if (q.includes('smart light') || q.includes('smart sensor') || q.includes('occupancy sensor')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test smart lighting/sensors because while it has strong regulatory support, strategic fit, and feasibility, the value capture mechanism needs clarification before full commitment.',
        evidence: [
          { type: 'pdf', source: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf', page: 41, verified: true },
          { type: 'web', source: 'BCA Green Mark', url: 'https://www1.bca.gov.sg', verified: true },
          { type: 'web', source: 'Energy Market Authority', url: 'https://ema.gov.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['BCA Green Mark awards points for smart building systems', 'Energy efficiency regulations tightening', 'Industry standard for Grade A offices'], evidence: 'BCA Green Mark 2021' },
          { criterion: 'Strategic Fit', score: 4, reasons: ['Directly reduces Scope 2 emissions', 'Supports smart building positioning', 'Aligns with digital transformation goals'], evidence: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf, p.41' },
          { criterion: 'Value Capture Path', score: 3, reasons: ['Energy savings accrue to tenant not landlord', 'Green lease mechanism may be needed', 'Value split unclear in gross lease'], evidence: 'Assumption - needs lease review' },
          { criterion: 'Rough Economic Pass', score: 4, reasons: ['CAPEX: $5-15 psm typical', '20-40% lighting energy reduction', 'Payback: 3-5 years with incentives'], evidence: 'Industry benchmarks, EMA data' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Mature technology, many suppliers', 'Easy sub-metering of lighting circuits', 'Can integrate with BMS'], evidence: 'Market availability' }
        ],
        total: 19,
        assumptions: ['Building has compatible electrical infrastructure', 'BMS integration possible', 'Tenant cooperation available'],
        whatWouldChange: ['Higher if green lease in place', 'Lower if tenant refuses participation', 'Higher if pursuing WELL certification'],
        nextSteps: ['Review lease structure for cost recovery mechanism', 'Identify value owner (landlord vs tenant)', 'Get quotes from 3 smart building suppliers', 'Design pilot zone for testing', 'Set up energy sub-metering']
      };
    }
    
    // Battery storage - Rough Economic Pass is the lowest criterion (RE-TEST)
    if (q.includes('battery') || q.includes('energy storage') || q.includes('bess')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test battery storage because while it has strong strategic alignment and regulatory support, the economics (high CAPEX, uncertain payback) need careful validation before full commitment.',
        evidence: [
          { type: 'pdf', source: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf', page: 58, verified: true },
          { type: 'web', source: 'EMA Singapore', url: 'https://ema.gov.sg', verified: true },
          { type: 'web', source: 'Energy Market Authority', url: 'https://ema.gov.sg', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['EMA promoting grid stability solutions', 'BCA Green Mark awards points for renewables integration', 'Peak demand management increasingly important'], evidence: 'EMA regulations, BCA Green Mark 2021' },
          { criterion: 'Strategic Fit', score: 4, reasons: ['Supports renewable energy integration', 'Enhances energy resilience', 'Aligns with net-zero commitments'], evidence: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf, p.58' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Peak shaving reduces demand charges', 'Backup power value for tenants', 'Potential grid services revenue'], evidence: 'Industry case studies' },
          { criterion: 'Rough Economic Pass', score: 3, reasons: ['CAPEX: $800-1,200/kWh still high', 'Payback: 8-12 years typical', 'Economics improving but uncertain'], evidence: 'Market data, assumption marked' },
          { criterion: 'Feasible to Implement & Meter', score: 4, reasons: ['Technology mature, suppliers available', 'Energy flows easily metered', 'Standard grid connection process'], evidence: 'SP Group guidelines' }
        ],
        total: 19,
        assumptions: ['Adequate space for battery installation', 'Compatible with existing electrical system', 'No fire safety restrictions'],
        whatWouldChange: ['Higher if combined with solar PV', 'Lower if electricity tariffs decrease', 'Higher if grid services market develops'],
        nextSteps: ['Conduct economic feasibility study with current tariffs', 'Assess space and fire safety requirements', 'Get quotes from 3 BESS suppliers', 'Evaluate financing options (lease vs purchase)', 'Model peak demand reduction potential']
      };
    }
    
    // Embodied carbon tracking - Feasible to Implement & Meter is the lowest criterion (RE-TEST)
    if (q.includes('embodied carbon') || q.includes('carbon tracking') || q.includes('scope 3 tracking')) {
      return {
        type: 'scorecard',
        answer: 'You should pilot test embodied carbon tracking because while it has strong regulatory drivers and strategic fit, the data collection and metering infrastructure needs validation before full implementation.',
        evidence: [
          { type: 'pdf', source: 'ARUP_SUSTAINABILITY_REPORT_2024.pdf', page: 28, verified: true },
          { type: 'web', source: 'BCA Green Mark', url: 'https://www1.bca.gov.sg', verified: true },
          { type: 'web', source: 'World Green Building Council', url: 'https://worldgbc.org', verified: true }
        ],
        scores: [
          { criterion: 'Coercive Trigger', score: 4, reasons: ['BCA Green Mark 2021 includes embodied carbon', 'ISSB standards driving disclosure requirements', 'Major clients requiring EPDs'], evidence: 'BCA Green Mark 2021, ISSB S2' },
          { criterion: 'Strategic Fit', score: 4, reasons: ['Critical for net-zero pathway', 'Addresses Scope 3 emissions', 'Industry leadership positioning'], evidence: 'ARUP_SUSTAINABILITY_REPORT_2024.pdf, p.28' },
          { criterion: 'Value Capture Path', score: 4, reasons: ['Green Mark certification points', 'Tender evaluation advantages', 'Green financing eligibility'], evidence: 'Industry trends' },
          { criterion: 'Rough Economic Pass', score: 4, reasons: ['Software costs moderate ($10-50k/year)', 'Staff training investment needed', 'Long-term compliance cost avoidance'], evidence: 'Market research' },
          { criterion: 'Feasible to Implement & Meter', score: 3, reasons: ['EPD data not always available from suppliers', 'Baseline data collection challenging', 'Skills gap in carbon accounting'], evidence: 'Implementation experience' }
        ],
        total: 19,
        assumptions: ['Suppliers willing to provide data', 'Staff can be trained', 'Software tools available'],
        whatWouldChange: ['Higher if suppliers have EPDs', 'Lower if data collection proves too difficult', 'Higher if dedicated sustainability team exists'],
        nextSteps: ['Assess current data availability from key suppliers', 'Identify carbon accounting software options', 'Evaluate staff training requirements', 'Start with pilot project for baseline', 'Engage suppliers on EPD availability']
      };
    }
    
    // Default - returns REJECTED (multiple criteria below threshold)
    return {
      type: 'scorecard',
      answer: 'This initiative is not recommended at this time because multiple criteria do not meet the threshold. More specific project details, regulatory requirements, and economic analysis are needed before proceeding.',
      evidence: [
        { type: 'web', source: 'BCA Green Mark Guidelines', url: 'https://www1.bca.gov.sg', verified: true },
        { type: 'web', source: 'Singapore Green Plan 2030', url: 'https://greenplan.gov.sg', verified: true }
      ],
      scores: [
        { criterion: 'Coercive Trigger', score: 2, reasons: ['No direct mandate identified', 'Industry trends unclear', 'No immediate regulatory pressure'], evidence: 'General market observation' },
        { criterion: 'Strategic Fit', score: 3, reasons: ['Potentially aligns with ESG goals', 'Would need to verify against specific company targets', 'Generally supports sustainability positioning'], evidence: 'Assumption - needs verification' },
        { criterion: 'Value Capture Path', score: 2, reasons: ['Benefits pathway unclear', 'Value owner not identified', 'No clear mechanism to capture returns'], evidence: 'Assumption - needs project-specific data' },
        { criterion: 'Rough Economic Pass', score: 2, reasons: ['Insufficient data for calculation', 'Economics uncertain', 'No payback analysis available'], evidence: 'Assumption - needs quotes' },
        { criterion: 'Feasible to Implement & Meter', score: 3, reasons: ['Implementation approach unclear', 'Metering methodology to be determined', 'Likely doable with proper planning'], evidence: 'General assessment' }
      ],
      total: 15,
      assumptions: ['Standard commercial building in Singapore', 'No unusual site constraints', 'Organization has typical ESG commitments'],
      whatWouldChange: ['Higher scores with specific project details', 'Higher if regulatory requirement confirmed', 'Lower if significant implementation barriers identified'],
      nextSteps: ['Provide more specific project details', 'Identify applicable regulations and standards', 'Conduct preliminary feasibility assessment', 'Get supplier quotes for cost estimates', 'Define success metrics and KPIs']
    };
  };

  // Gate 1: Business Case Test - generates mock results based on the initiative
  const runGate1Test = () => {
    const q = (userQuestion || '').toLowerCase();
    
    // Generate different results based on the initiative type
    let testResults;
    
    if (q.includes('solar') || q.includes('pv')) {
      testResults = {
        initiative: userQuestion,
        answer: 'Yes, adopt this initiative. Solar PV installation presents a compelling business case that passes all five evaluation criteria. The baseline is clearly defined through existing utility meters, performance projections are well-supported by SERIS data showing 1,200 kWh/kWp/year yield in Singapore, and the monetary value is quantifiable through direct energy savings of approximately $300/kWp annually plus carbon credits and Green Mark certification benefits. The cost structure is transparent and well-documented, while multiple financing pathways including PPAs, green loans, and EDB grants up to 50% significantly de-risk the investment. This initiative is ready to proceed to implementation planning.',
        steps: [
          {
            step: 1,
            name: 'Define the Baseline Action',
            status: 'strong',
            hiddenScore: 5,
            finding: 'The baseline for this initiative is well-established and clearly measurable. Currently, the building draws 100% of its electricity from the national grid at the prevailing SP Group tariff of approximately $0.25/kWh. Historical energy consumption data is readily available through existing utility meters, providing a robust reference point for measuring solar PV performance. The grid emission factor of 0.4085 kgCO2/kWh (as published by the Energy Market Authority) allows for accurate carbon savings calculations. This clear baseline enables precise measurement of both financial savings and environmental impact once solar PV is installed.',
            evidence: [
              { type: 'pdf', source: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf', page: 45 },
              { type: 'web', source: 'SP Group Tariffs 2024' }
            ],
            details: ['Baseline energy cost: $0.25/kWh', 'Annual consumption measurable via existing meters', 'Grid carbon factor: 0.4085 kgCO2/kWh']
          },
          {
            step: 2,
            name: 'Model / Measure Proposed vs Baseline',
            status: 'strong',
            hiddenScore: 4,
            finding: 'Solar PV performance in Singapore is highly predictable due to consistent irradiance levels throughout the year. Based on data from the Solar Energy Research Institute of Singapore (SERIS) and comparable installations documented in sustainability reports from leading REITs, a well-designed rooftop system can generate approximately 1,200 kWh per kWp installed annually. For a typical commercial building with adequate roof space, this translates to offsetting 20-40% of total electricity consumption. The performance ratio of 80-85% accounts for system losses including inverter efficiency, cable losses, and panel degradation, ensuring conservative and achievable projections.',
            evidence: [
              { type: 'pdf', source: 'MITSUBISHI_ESTATE_GROUP_SUSTAINABILITY_REPORT_2024.pdf', page: 63 },
              { type: 'web', source: 'SERIS Singapore' }
            ],
            details: ['Expected yield: 1,200 kWh/kWp/year', 'System size: Based on available roof area', 'Performance ratio: 80-85% typical']
          },
          {
            step: 3,
            name: 'Convert to Monetary Value',
            status: 'strong',
            hiddenScore: 4,
            finding: 'The monetary value of solar PV installation can be quantified through multiple revenue streams. Direct energy savings amount to approximately $300 per kWp installed annually at current electricity tariffs, providing a stable and predictable return. Beyond direct savings, the installation generates additional value through carbon credits in the voluntary market (currently valued at ~$25 per tonne of CO2 avoided), contribution towards BCA Green Mark certification which can unlock GFA bonuses worth significantly more, and eligibility for green financing at preferential rates. When combined, these value streams create a compelling financial case that extends well beyond simple energy cost reduction.',
            evidence: [
              { type: 'web', source: 'Energy Market Authority Singapore' },
              { type: 'pdf', source: 'CDL_SUSTAINABILITY_REPORT_2025.pdf', page: 52 }
            ],
            details: ['Energy savings: $300/kWp/year', 'Carbon value: ~$25/tonne (voluntary market)', 'Green Mark points: Certification value']
          },
          {
            step: 4,
            name: 'Account for All Costs',
            status: 'moderate',
            hiddenScore: 4,
            finding: 'The cost structure for solar PV in Singapore is well-documented and transparent. Capital expenditure ranges from $1.20 to $1.50 per Wp installed, depending on system size, panel quality, and installation complexity. This includes panels, inverters, mounting systems, cabling, and professional installation. Operational expenses are minimal at 1-2% of CAPEX annually, covering routine cleaning, monitoring, and minor maintenance. The main cost uncertainty relates to inverter replacement around year 10-12 and the need for a structural assessment of the roof (typically $5-10k) to confirm load-bearing capacity. These costs are manageable and well-understood within the industry.',
            evidence: [
              { type: 'web', source: 'Solar Industry Benchmarks 2024' },
              { type: 'pdf', source: 'ARUP_SUSTAINABILITY_REPORT_2024.pdf', page: 38 }
            ],
            details: ['CAPEX: $1.20-1.50/Wp installed', 'OPEX: 1-2% of CAPEX annually', 'Inverter replacement: Year 10-12', 'Roof structural assessment: $5-10k']
          },
          {
            step: 5,
            name: 'Apply Financing Pathway',
            status: 'strong',
            hiddenScore: 5,
            finding: 'Solar PV benefits from one of the most mature financing ecosystems among green building technologies in Singapore. Multiple pathways are available to reduce or eliminate upfront capital requirements. Power Purchase Agreements (PPAs) allow building owners to host solar systems at zero upfront cost while purchasing generated electricity at rates below grid tariff. For those preferring ownership, green loans from major banks offer 0.5-1% interest rate reductions compared to standard commercial loans. Additionally, the EDB Energy Efficiency Grant can cover up to 50% of qualifying costs, and accelerated depreciation provisions provide further tax advantages. This diverse financing landscape significantly de-risks the investment.',
            evidence: [
              { type: 'web', source: 'EDB Singapore Grants' },
              { type: 'web', source: 'DBS Green Financing' }
            ],
            details: ['Solar PPA: Zero upfront cost option', 'Green loans: 0.5-1% rate reduction', 'EDB Energy Efficiency Grant: Up to 50%', 'Accelerated depreciation available']
          }
        ],
        totalHiddenScore: 22,
        decision: 'ADOPT'
      };
    } else if (q.includes('ev') || q.includes('charger')) {
      testResults = {
        initiative: userQuestion,
        answer: 'Yes, adopt this initiative. EV charging infrastructure demonstrates a strong business case across all evaluation criteria. The baseline of zero charging points provides a clear starting point, while LTA regulations and Singapore\'s EV adoption roadmap establish strong demand drivers. Although direct revenue from charging fees only partially offsets costs, the combination of tenant retention value, regulatory compliance, and available government support makes this a sound investment. The LTA EV Common Charger Grant covering up to 50% of costs, combined with CPO partnership options that eliminate upfront capital requirements, creates an accessible pathway to implementation. This initiative is recommended for adoption.',
        steps: [
          {
            step: 1,
            name: 'Define the Baseline Action',
            status: 'strong',
            hiddenScore: 5,
            finding: 'The baseline for EV charging infrastructure is clearly defined by the current absence of charging facilities in the building. This represents a measurable starting point of zero charging points, zero EV-related tenant amenities, and zero revenue from charging services. The regulatory context is also well-established, with LTA mandating EV-ready provisions for new developments and setting clear targets for Singapore\'s EV adoption roadmap. Current tenant surveys indicate approximately 5% EV ownership among building occupants, with this figure projected to grow significantly as Singapore phases out internal combustion engine vehicles by 2030. This clear baseline allows for precise tracking of utilization rates, revenue generation, and tenant satisfaction improvements post-installation.',
            evidence: [
              { type: 'pdf', source: 'KEPPEL_REIT_SUSTAINABILITY_REPORT_2024.pdf', page: 52 },
              { type: 'web', source: 'LTA EV Regulations' }
            ],
            details: ['Baseline: Zero charging points', 'LTA mandate for new buildings', 'Current tenant EV ownership: ~5%']
          },
          {
            step: 2,
            name: 'Model / Measure Proposed vs Baseline',
            status: 'strong',
            hiddenScore: 4,
            finding: 'The proposed installation of AC chargers covering 10% of parking lots is aligned with industry best practices and regulatory guidance from SP Group. Based on utilization data from comparable commercial buildings documented in CDL\'s sustainability report, charger usage is projected at 4-6 hours per day during weekdays, with lower utilization on weekends. Each 7kW AC charger can deliver approximately 28-42 kWh per day at projected utilization rates, translating to measurable energy throughput that can be tracked via the charging management system. Additionally, tenant satisfaction metrics can be collected through surveys to quantify the amenity value, while Green Mark assessment provides a standardized framework for measuring sustainability improvements.',
            evidence: [
              { type: 'web', source: 'SP Group EV Guidelines' },
              { type: 'pdf', source: 'CDL_SUSTAINABILITY_REPORT_2025.pdf', page: 48 }
            ],
            details: ['Charger utilization: 4-6 hrs/day projected', 'Energy delivery: 7kW AC typical', 'Tenant satisfaction improvement measurable']
          },
          {
            step: 3,
            name: 'Convert to Monetary Value',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'Converting the value of EV charging infrastructure to monetary terms presents both opportunities and challenges. Direct revenue from charging fees is quantifiable, with current market rates ranging from $0.45 to $0.55 per kWh, generating approximately $5-8 per charger per day at projected utilization. However, this direct revenue stream typically only partially offsets operational costs rather than generating significant profit. The more substantial value lies in indirect benefits such as improved tenant retention, ability to attract premium tenants, and enhanced building competitiveness in the leasing market. These indirect values, while real, are more difficult to quantify precisely. Industry benchmarks from Frasers Property suggest that EV amenities contribute to overall tenant satisfaction scores, but isolating the specific rental premium attributable to charging infrastructure requires further market analysis.',
            evidence: [
              { type: 'web', source: 'Shell Recharge Singapore' },
              { type: 'pdf', source: 'FRASERS_PROPERTY_ESG_REPORT_2025.pdf', page: 41 }
            ],
            details: ['Charging fee: $0.45-0.55/kWh market rate', 'Revenue: $5-8/charger/day', 'Tenant premium: Difficult to quantify']
          },
          {
            step: 4,
            name: 'Account for All Costs',
            status: 'strong',
            hiddenScore: 4,
            finding: 'The cost structure for EV charger installation is well-documented and can be estimated with reasonable accuracy. Each AC charger unit costs approximately $2,000 to $3,000 depending on brand, features, and smart connectivity capabilities. Installation costs add another $3,000 to $5,000 per unit, covering electrical works, cabling, civil works for mounting, and commissioning. The main variable cost is electrical infrastructure upgrade, which depends on the building\'s existing electrical capacity and the number of chargers being installed. For buildings requiring main switchboard upgrades or transformer capacity increases, this can add significantly to project costs. Ongoing maintenance is relatively modest at $200-400 per charger annually, covering software updates, physical inspections, and minor repairs. These costs are transparent and can be validated through competitive quotations from established contractors.',
            evidence: [
              { type: 'web', source: 'SP Group Installation Guide' },
              { type: 'pdf', source: 'AECOM_SUSTAINABILITY_REPORT_2025.pdf', page: 55 }
            ],
            details: ['Charger cost: $2-3k per unit', 'Installation: $3-5k per unit', 'Electrical upgrade: Variable', 'Maintenance: $200-400/year']
          },
          {
            step: 5,
            name: 'Apply Financing Pathway',
            status: 'strong',
            hiddenScore: 5,
            finding: 'EV charging infrastructure benefits from strong government support and multiple financing pathways in Singapore. The LTA EV Common Charger Grant is a cornerstone program, providing up to 50% co-funding for charger hardware and installation costs in non-landed private residences and commercial buildings. This significantly reduces the capital outlay required from building owners. Beyond direct grants, SP Group and other charge point operators (CPOs) offer partnership models where they install and operate chargers at no upfront cost to the building owner, taking a share of charging revenue in return. This revenue-sharing approach eliminates capital risk entirely while still providing EV amenities to tenants. Green loans from major banks can also be accessed for the remaining costs, often at preferential interest rates. The combination of grants, partnerships, and green financing makes EV charging one of the most financially accessible sustainability investments.',
            evidence: [
              { type: 'web', source: 'LTA EV Common Charger Grant' },
              { type: 'web', source: 'Enterprise Singapore' }
            ],
            details: ['LTA Grant: Up to 50% of charger cost', 'SP Group partnership options', 'CPO revenue-share models available']
          }
        ],
        totalHiddenScore: 21,
        decision: 'ADOPT'
      };
    } else if (q.includes('rainwater') || q.includes('harvest')) {
      testResults = {
        initiative: userQuestion,
        answer: 'You should re-test this idea. While rainwater harvesting demonstrates a clear baseline and aligns with sustainability goals, the business case faces challenges in several key areas. The monetary value proposition is limited by Singapore\'s low water tariffs, making payback periods extend to 8-12 years. Additionally, performance modeling requires site-specific validation, and there are no dedicated government grants to improve the economics. By gathering more data on your specific building conditions and exploring alternative value capture mechanisms, the business case could potentially be strengthened to support adoption.',
        steps: [
          {
            step: 1,
            name: 'Define the Baseline Action',
            status: 'strong',
            hiddenScore: 4,
            finding: 'The baseline for rainwater harvesting is defined by the current use of potable water for non-potable applications such as landscape irrigation, toilet flushing, and cooling tower makeup. This represents a quantifiable and measurable starting point, with water consumption data available from PUB utility bills. At current tariffs of $2.74 per cubic meter (including water conservation tax and waterborne fee), the cost of using treated drinking water for these non-potable purposes can be calculated precisely. Singapore\'s average annual rainfall of approximately 2,400mm provides a reliable and predictable water source for harvesting. The proportion of building water use that is non-potable typically ranges from 30-40% in commercial buildings, establishing a clear target for rainwater substitution.',
            evidence: [
              { type: 'pdf', source: 'CAPITALAND_ASCOTT_TRUST_SUSTAINABILITY_REPORT_2023.pdf', page: 38 },
              { type: 'web', source: 'PUB Water Tariffs' }
            ],
            details: ['Baseline water cost: $2.74/m³', 'Non-potable demand: 30-40% of total', 'Singapore rainfall: 2,400mm/year']
          },
          {
            step: 2,
            name: 'Model / Measure Proposed vs Baseline',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'Modeling rainwater harvesting performance involves several variables that introduce uncertainty into projections. The theoretical yield from a rainwater catchment system is approximately 1,000 liters per square meter of roof area annually, based on Singapore\'s rainfall patterns. However, actual yield depends significantly on factors including effective roof catchment area (excluding skylights, equipment, and unusable surfaces), first flush diversion requirements to remove initial contaminated runoff, storage tank sizing which determines how much rainfall can be captured versus overflow, and seasonal variations in both rainfall and water demand. PUB\'s ABC Waters guidelines provide design parameters, but site-specific conditions can cause actual performance to vary by 20-30% from initial estimates. A detailed feasibility study with hydraulic modeling would be needed to refine these projections for the specific building.',
            evidence: [
              { type: 'web', source: 'PUB ABC Waters Guidelines' },
              { type: 'pdf', source: 'ARUP_SUSTAINABILITY_REPORT_2024.pdf', page: 42 }
            ],
            details: ['Yield: ~1,000L/m² roof/year', 'Storage sizing: Critical variable', 'First flush diversion needed']
          },
          {
            step: 3,
            name: 'Convert to Monetary Value',
            status: 'weak',
            hiddenScore: 2,
            finding: 'The monetary value proposition for rainwater harvesting in Singapore faces fundamental challenges due to the relatively low cost of potable water. At $2.74 per cubic meter, even substantial water savings translate to modest financial returns. For example, capturing and using 500 cubic meters of rainwater annually would save only approximately $1,370 per year in water costs. While this represents meaningful water conservation, it struggles to justify the capital investment on pure financial terms. Additional value can be captured through BCA Green Mark certification points (typically 2-3 points for rainwater harvesting systems), contribution to corporate sustainability reporting metrics, and demonstration of environmental stewardship to stakeholders. However, these indirect benefits are difficult to quantify in monetary terms and depend heavily on the organization\'s strategic priorities and stakeholder expectations.',
            evidence: [
              { type: 'web', source: 'PUB Tariff Structure' },
              { type: 'pdf', source: 'CDL_SUSTAINABILITY_REPORT_2025.pdf', page: 61 }
            ],
            details: ['Direct savings: $2.74/m³', 'Payback: 8-12 years typical', 'Green Mark: 2-3 points']
          },
          {
            step: 4,
            name: 'Account for All Costs',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'The cost structure for commercial rainwater harvesting systems involves significant capital expenditure with ongoing operational costs. Storage tanks and associated piping typically cost $50,000 to $100,000 depending on capacity and whether tanks are above-ground or underground (with underground installations being substantially more expensive). Treatment systems including filtration, UV disinfection, and pumping add another $20,000 to $50,000. Annual maintenance costs range from $3,000 to $5,000, covering filter replacement, system inspections, water quality testing, and pump maintenance. An often-overlooked cost is the opportunity cost of space dedicated to storage tanks, which could otherwise be used for revenue-generating purposes. The total installed cost for a commercial system typically ranges from $50,000 to $150,000, with payback periods extending to 8-12 years even under optimistic water savings assumptions.',
            evidence: [
              { type: 'web', source: 'Singapore Contractors Association' },
              { type: 'pdf', source: 'WSP_GLOBAL_SUSTAINABILITY_REPORT_2024.pdf', page: 28 }
            ],
            details: ['Tank and piping: $50-100k', 'Treatment system: $20-50k', 'Annual maintenance: $3-5k', 'Space opportunity cost']
          },
          {
            step: 5,
            name: 'Apply Financing Pathway',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'Unlike solar PV or EV charging infrastructure, rainwater harvesting does not benefit from dedicated government grant programs in Singapore. PUB\'s focus has been on promoting water-efficient fittings and NEWater adoption rather than individual building-level rainwater collection. While general green financing is available through banks offering sustainability-linked loans, there are no specific incentives that materially improve the economics of rainwater harvesting. The BCA Green Mark certification provides indirect incentives through GFA bonuses for certified buildings, but rainwater harvesting is only one of many features that contribute to certification. The absence of targeted financial support means that the business case must stand largely on its own merits, making it more challenging to justify compared to other sustainability investments with stronger financing ecosystems.',
            evidence: [
              { type: 'web', source: 'PUB Incentives' },
              { type: 'web', source: 'Enterprise Singapore' }
            ],
            details: ['No specific rainwater grants', 'Green loans available', 'BCA Green Mark incentives indirect']
          }
        ],
        totalHiddenScore: 15,
        decision: 'RE-TEST'
      };
    } else {
      // Default - moderate scores leading to REJECT
      testResults = {
        initiative: userQuestion,
        answer: 'This initiative is not recommended for adoption at this time. The business case assessment reveals significant gaps across multiple evaluation criteria that cannot be easily addressed. The baseline is insufficiently documented, performance projections lack validation, monetary value is difficult to quantify, cost estimates remain uncertain, and no compelling financing pathway has been identified. These combined weaknesses indicate that the initiative requires substantial additional work before it can be considered for investment. We recommend conducting a detailed feasibility study, obtaining formal quotations, and identifying specific financing mechanisms before re-submitting this initiative for evaluation.',
        steps: [
          {
            step: 1,
            name: 'Define the Baseline Action',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'The baseline for this initiative requires further clarification before a robust business case can be developed. While the general concept and intended outcomes are understood, the current state documentation is incomplete and lacks the specificity needed for accurate comparison. Key baseline metrics have not been standardized, making it difficult to establish a clear reference point against which to measure improvement. For example, if this involves energy or resource consumption, historical data should be compiled and validated. If it involves operational processes, current performance benchmarks need to be established. Without a well-defined baseline, any projections of improvement will carry significant uncertainty, and it will be challenging to demonstrate actual results post-implementation.',
            evidence: [
              { type: 'web', source: 'Industry Benchmarks' }
            ],
            details: ['Current state partially documented', 'Metrics need standardization', 'Reference point requires validation']
          },
          {
            step: 2,
            name: 'Model / Measure Proposed vs Baseline',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'Initial modeling suggests that the proposed action could deliver measurable improvements over the baseline, but these estimates carry considerable uncertainty due to the limited availability of comparable case studies and site-specific data. Industry benchmarks provide a general indication of potential performance, but actual results can vary significantly based on local conditions, implementation quality, and operational factors. The measurement methodology for tracking performance has not been fully defined, which raises questions about how success will be demonstrated and verified. A more detailed feasibility assessment with site-specific analysis would be required to develop confidence in the projected performance differential and establish appropriate monitoring protocols.',
            evidence: [
              { type: 'web', source: 'General Industry Data' }
            ],
            details: ['Estimates available', 'Site-specific validation needed', 'Measurement methodology to confirm']
          },
          {
            step: 3,
            name: 'Convert to Monetary Value',
            status: 'weak',
            hiddenScore: 2,
            finding: 'Converting the benefits of this initiative into monetary terms presents significant challenges that undermine the business case. While the general value drivers have been identified, quantifying them in dollar terms requires multiple assumptions that may not hold in practice. Direct cost savings or revenue generation is either modest or uncertain, making it difficult to calculate a reliable return on investment. Indirect benefits such as improved sustainability credentials, stakeholder satisfaction, or risk mitigation may be valuable but are inherently difficult to monetize. The variability in market rates and the absence of standardized valuation methodologies for this type of initiative mean that different assumptions could lead to substantially different financial projections. This uncertainty makes it challenging to secure budget approval or compare this initiative against competing investment opportunities.',
            evidence: [
              { type: 'web', source: 'Market Research' }
            ],
            details: ['Value drivers identified', 'Quantification uncertain', 'Market rates variable']
          },
          {
            step: 4,
            name: 'Account for All Costs',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'The major cost categories for this initiative have been identified at a high level, but detailed cost estimates are not yet available. Capital expenditure ranges have been estimated based on general market data, but formal quotations from qualified contractors or suppliers have not been obtained. Operational expenditure assumptions have been made based on industry norms, but these may not account for site-specific factors that could increase ongoing costs. There is also potential for hidden costs that have not been fully identified, such as integration with existing systems, staff training, or modifications to current operations. Before proceeding, a comprehensive cost analysis should be conducted, including competitive quotations and a thorough review of potential cost overruns or contingencies.',
            evidence: [
              { type: 'web', source: 'Supplier Estimates' }
            ],
            details: ['CAPEX range estimated', 'OPEX assumptions made', 'Hidden costs possible']
          },
          {
            step: 5,
            name: 'Apply Financing Pathway',
            status: 'moderate',
            hiddenScore: 3,
            finding: 'Standard commercial financing options are available for this initiative, but no specific government grants, incentives, or specialized financing programs have been identified that would materially improve the economics. Banks can provide conventional loans or green financing products, but the interest rate benefits of green loans (typically 0.25-0.5% reduction) are relatively modest and do not fundamentally change the business case. The eligibility for existing grant programs such as those from EDB, NEA, or BCA has not been confirmed, and the initiative may not align with current funding priorities. Without access to grants or concessional financing, the full capital cost must be borne by the organization, which places greater pressure on the underlying economics to justify the investment.',
            evidence: [
              { type: 'web', source: 'Financial Institutions' }
            ],
            details: ['Bank financing available', 'Green loan potential', 'Grant eligibility unclear']
          }
        ],
        totalHiddenScore: 14,
        decision: 'REJECT'
      };
    }
    
    // Generate RE-TEST options for weak steps if needed
    if (testResults.decision === 'RE-TEST') {
      const weakSteps = testResults.steps.filter(s => s.hiddenScore <= 3);
      const retestOptions = generateRetestOptions(weakSteps, q);
      setGate1RetestOptions(retestOptions);
    }
    
    setGate1Results(testResults);
    setView('gate1-test');
    resetScroll();
  };

  // Generate retest questions based on weak steps - AI-generated based on which areas are weak
  const generateRetestQuestions = (weakSteps, initiative) => {
    // Question bank for each test step - AI selects based on which steps are weak
    const questionBank = {
      'Define the Baseline Action': [
        {
          text: 'Does your organization have existing utility meters or monitoring systems that track current consumption patterns?',
          helpText: 'Existing metering infrastructure provides the foundation for accurate baseline measurement.'
        },
        {
          text: 'Can you access at least 12 months of historical data to establish a reliable baseline?',
          helpText: 'A full year of data accounts for seasonal variations and provides a robust reference point.'
        }
      ],
      'Model / Measure Proposed vs Baseline': [
        {
          text: 'Have you identified comparable installations or case studies that can validate your performance projections?',
          helpText: 'Real-world examples from similar buildings or contexts improve projection confidence.'
        },
        {
          text: 'Can you engage a specialist consultant or vendor to provide a site-specific feasibility assessment?',
          helpText: 'Professional assessment accounts for site-specific factors that affect performance.'
        }
      ],
      'Convert to Monetary Value': [
        {
          text: 'Have you identified all potential value streams including certifications, tenant premiums, carbon credits, or avoided costs?',
          helpText: 'Comprehensive value mapping often reveals benefits beyond direct cost savings.'
        },
        {
          text: 'Can you quantify the reputational or ESG reporting value this initiative would provide to your organization?',
          helpText: 'Strategic value to stakeholders can justify investments with longer financial paybacks.'
        }
      ],
      'Account for All Costs': [
        {
          text: 'Can you obtain formal quotations from at least 2-3 qualified contractors or suppliers?',
          helpText: 'Competitive quotes validate cost assumptions and may reveal pricing opportunities.'
        },
        {
          text: 'Have you accounted for all indirect costs including installation disruption, staff training, and ongoing maintenance?',
          helpText: 'Hidden costs often impact project economics more than initially expected.'
        }
      ],
      'Apply Financing Pathway': [
        {
          text: 'Have you explored available government grants such as EDB, NEA, BCA, or LTA incentive programs?',
          helpText: 'Grant funding can cover 30-50% of eligible costs for qualifying projects.'
        },
        {
          text: 'Can you access green financing products or partnership models that reduce upfront capital requirements?',
          helpText: 'Green loans, PPAs, and lease arrangements can eliminate capital barriers.'
        }
      ]
    };

    // Generate questions dynamically based on weak steps
    const questions = [];
    let questionId = 1;

    // First, add questions for each weak step (prioritize these)
    weakSteps.forEach(step => {
      const stepQuestions = questionBank[step.name];
      if (stepQuestions && stepQuestions.length > 0) {
        // Add first question from this weak step's bank
        questions.push({
          id: `q${questionId}`,
          text: stepQuestions[0].text,
          helpText: stepQuestions[0].helpText,
          relatedStep: step.name,
          isWeakArea: true
        });
        questionId++;
      }
    });

    // If we have fewer than 5 questions, add secondary questions from weak steps
    if (questions.length < 5) {
      weakSteps.forEach(step => {
        if (questions.length >= 5) return;
        const stepQuestions = questionBank[step.name];
        if (stepQuestions && stepQuestions.length > 1) {
          questions.push({
            id: `q${questionId}`,
            text: stepQuestions[1].text,
            helpText: stepQuestions[1].helpText,
            relatedStep: step.name,
            isWeakArea: true
          });
          questionId++;
        }
      });
    }

    // If still fewer than 5, add questions from strong areas that could further boost the case
    const allSteps = ['Define the Baseline Action', 'Model / Measure Proposed vs Baseline', 'Convert to Monetary Value', 'Account for All Costs', 'Apply Financing Pathway'];
    const strongSteps = allSteps.filter(s => !weakSteps.find(w => w.name === s));
    
    strongSteps.forEach(stepName => {
      if (questions.length >= 5) return;
      const stepQuestions = questionBank[stepName];
      if (stepQuestions && stepQuestions.length > 0) {
        questions.push({
          id: `q${questionId}`,
          text: stepQuestions[0].text,
          helpText: stepQuestions[0].helpText,
          relatedStep: stepName,
          isWeakArea: false
        });
        questionId++;
      }
    });

    return questions.slice(0, 5); // Ensure exactly 5 questions
  };

  // Handle retest question answers
  const handleRetestAnswer = (questionId, answer) => {
    const newAnswers = { ...retestAnswers, [questionId]: answer };
    setRetestAnswers(newAnswers);
    
    // Check if all questions answered
    if (Object.keys(newAnswers).length === 5) {
      // Count "Yes" answers - each Yes improves the score
      const yesCount = Object.values(newAnswers).filter(a => a === true).length;
      
      // Simulate re-evaluation with improved scores based on answers
      const newResults = { ...gate1Results };
      
      // Improve weak steps based on yes answers
      let improvementPoints = yesCount; // Each yes answer adds potential improvement
      newResults.steps = newResults.steps.map(step => {
        if (step.hiddenScore <= 3 && improvementPoints > 0) {
          const improvement = Math.min(2, improvementPoints);
          improvementPoints -= 1;
          return {
            ...step,
            hiddenScore: Math.min(5, step.hiddenScore + improvement),
            status: 'improved',
            finding: step.finding
          };
        }
        return step;
      });
      
      // Recalculate total
      newResults.totalHiddenScore = newResults.steps.reduce((sum, s) => sum + s.hiddenScore, 0);
      newResults.decision = newResults.totalHiddenScore >= 20 ? 'ADOPT' : 'REJECT';
      newResults.retestApplied = `${yesCount} of 5 data points confirmed`;
      
      // Update the answer based on new decision
      if (newResults.decision === 'ADOPT') {
        newResults.answer = 'Based on the additional data gathered, this initiative now meets the threshold for adoption. The confirmed availability of baseline data, feasibility validation, value capture mechanisms, cost quotations, and financing pathways has strengthened the business case sufficiently to proceed with implementation planning.';
      } else {
        newResults.answer = 'Despite gathering additional data, this initiative still does not meet the threshold for adoption. The gaps identified in the original assessment remain significant, and the additional information provided was insufficient to address the fundamental concerns. We recommend addressing the outstanding issues before re-submitting for evaluation.';
      }
      
      setTimeout(() => {
        setGate1Results(newResults);
        setHasRetested(true);
        setRetestAnswers({});
        setView('gate1-test');
        resetScroll();
      }, 500);
    }
  };

  // ==================== GATE 2: COMMERCIAL & CONTRACTUAL LOCK-IN ====================
  
  // Gate 2 Questions Configuration (20 questions across 4 enablers)
  const gate2Questions = {
    enabler1: {
      id: 'E1',
      name: 'Value-Capture Mechanism',
      icon: '💰',
      description: 'Contractual mechanism linking payer → benefits capture',
      questions: [
        { id: 'B1', text: 'Is there a contractual mechanism linking payer → benefits capture?', subtext: 'Green lease / ESPC guaranteed savings / target-cost gainshare / KPI-linked SLA', naAllowed: false },
        { id: 'B2', text: 'Does the contract contain the key mechanics?', subtext: 'Formulae, KPIs, acceptance tests, and payment logic (not "best efforts")', naAllowed: false },
        { id: 'B3', text: 'Is it already executed or in final draft ready for signature?', subtext: 'For the intended boundary', naAllowed: false },
        { id: 'B4', text: 'Is the split-incentive addressed?', subtext: 'Who pays vs who benefits via lease/service-charge/gainshare/rebate/ESPC logic', naAllowed: true, naReason: 'Owner-occupied (no split incentive)' },
        { id: 'B5', text: 'Are liability/LD/shortfall remedies defined?', subtext: 'Savings shortfall covered; KPI non-performance payment adjustment', naAllowed: true, naReason: 'No performance-linked payment (pure paid scope)' }
      ],
      playbook: [
        'Negotiate green lease schedule (data-sharing, sub-metering, setpoints, cost recovery)',
        'Draft ESPC with shortfall remedy',
        'Insert gainshare/painshare formula + acceptance tests',
        'Add SLA with BEI/comfort KPI tied to payment/bonuses'
      ]
    },
    enabler2: {
      id: 'E2',
      name: 'Financing Terms',
      icon: '🏦',
      description: 'Terms locked & usable by the paying entity',
      questions: [
        { id: 'B6', text: 'Is the financing route chosen?', subtext: 'Capex / green loan / green bond / SLL / PPA / grant / lease', naAllowed: false },
        { id: 'B7', text: 'Is there a term sheet confirming rate, tenor, fees, covenants, drawdown conditions?', subtext: 'Or equivalent internal funding approval', naAllowed: true, naReason: 'Standard capex with written budget approval; no external financing' },
        { id: 'B8', text: 'Have assurance/reporting/certification costs been included in cashflows?', subtext: 'Green Mark, external review - so Gate-1 economics aren\'t undermined', naAllowed: true, naReason: 'No assurance/reporting/certification obligations' },
        { id: 'B9', text: 'Is the financing instrument usable by the payer?', subtext: 'Entity eligibility, credit approval path, SPV constraints, PPA counterparty readiness', naAllowed: false },
        { id: 'B10', text: 'Do financing obligations NOT break operations?', subtext: 'Reporting burden, data requirements, restrictions remain feasible', naAllowed: false }
      ],
      playbook: [
        'Secure green loan/bond/SLL term sheet',
        'Pivot to PPA for PV if capex constrained',
        'Cost assurance/reporting into model',
        'Align drawdowns to procurement milestones'
      ]
    },
    enabler3: {
      id: 'E3',
      name: 'Data & Integrations',
      icon: '📊',
      description: 'Benefits are provable via contractual data deliverables',
      questions: [
        { id: 'B11', text: 'Are EIR requirements specified including exact AID/COBie fields for handover?', subtext: 'What data, format, timing', helperText: 'This asks whether the contract clearly states what asset/handover data must be delivered (exact fields, format, and deadlines), so operations teams can actually use the information after handover.\n\n• EIR: Employer\'s Information Requirements — the client\'s specification for what information must be delivered.\n• AID: Asset Information Delivery — the handover package of asset data needed for operations.\n• COBie: A standard spreadsheet-style format for handing over building assets information.', naAllowed: true, naReason: 'Action has no data requirement (rare; justify)' },
        { id: 'B12', text: 'Is the metering/M&V data plan contractual?', subtext: 'Meter list (type, accuracy class, location), calibration/commissioning tests, acceptance criteria', naAllowed: false },
        { id: 'B13', text: 'Are live integrations/access defined?', subtext: 'APIs to BMS/EMS and CMMS/ERP (protocols, cadence, formats) including access rights', naAllowed: true, naReason: 'No live integration required; manual readings acceptable per contract' },
        { id: 'B14', text: 'Are cybersecurity + data ownership/licensing + PDPA requirements defined?', subtext: 'IT/OT segregation, access control, permitted uses', naAllowed: true, naReason: 'No personal/tenant data involved; data strictly internal' },
        { id: 'B15', text: 'Are dates/milestones for deliverables + acceptance gates stated in contract appendices?', subtext: 'Not informal promises', naAllowed: false }
      ],
      playbook: [
        'Add EIR appendix with AID/COBie fields',
        'Create meter schedule (class/locations/commissioning)',
        'Write API spec to BMS/EMS and CMMS/ERP',
        'Add cybersecurity + data rights clauses',
        'Complete PDPA impact assessment'
      ]
    },
    enabler4: {
      id: 'E4',
      name: 'Delivery Risk',
      icon: '🛡️',
      description: 'Implementation risks are explicitly covered in reality',
      questions: [
        { id: 'B16', text: 'Are logistics/procurement risks covered?', subtext: 'Long-lead items, alternates, cranage/route surveys, laydown, interfaces', naAllowed: true, naReason: 'No logistics complexity; services-only change' },
        { id: 'B17', text: 'Are acceptance/commissioning requirements explicit?', subtext: 'FAT/SAT, seasonal/functional tests, spares, warranties, training, QA hours', naAllowed: true, naReason: 'N/A only if this action has no physical installation or system change that requires testing/commissioning.' },
        { id: 'B18', text: 'Is RACI clear for installation, metering, reporting, and ongoing responsibilities?', subtext: 'No gaps between parties', helperText: 'This checks whether everyone\'s roles are clearly assigned so nothing falls through the cracks (who installs, who maintains, who reports, who verifies).\n\n• RACI: An acronym standing for Responsible, Accountable, Consulted, and Informed.', naAllowed: false },
        { id: 'B19', text: 'Is the M&V protocol defined?', subtext: 'IPMVP option, baseline & normalisation method, dispute handling for calculations', naAllowed: true, naReason: 'No performance claim is monetised or reported' },
        { id: 'B20', text: 'Are schedules/clauses structured so nothing material is left to "best efforts"?', subtext: 'All commitments are binding', naAllowed: false }
      ],
      playbook: [
        'Constructability tests (mock-up, FAT, scan-to-BIM, route/cranage dry run)',
        'Insert commissioning templates in contract',
        'Add warranty/training/QA hours schedule',
        'Write IPMVP plan with baseline/normalisation method'
      ]
    }
  };

  // Evidence type options
  const evidenceTypes = [
    { value: 'signed', label: 'Signed Contract' },
    { value: 'final-draft', label: 'Final Draft' },
    { value: 'term-sheet', label: 'Term Sheet' },
    { value: 'appendix', label: 'Appendix/Spec' },
    { value: 'email', label: 'Email/Minutes' }
  ];

  // Closure method options for Enablement Action
  const closureMethods = [
    { value: 'clause', label: 'Clause insertion/redline' },
    { value: 'term-sheet', label: 'Term sheet' },
    { value: 'eir-appendix', label: 'Add EIR/AID/COBie appendix' },
    { value: 'meter-schedule', label: 'Meter schedule' },
    { value: 'api-spec', label: 'API spec' },
    { value: 'cybersecurity', label: 'Cybersecurity/PDPA sign-off' },
    { value: 'logistics', label: 'Constructability/logistics report' },
    { value: 'commissioning', label: 'Acceptance/commissioning templates' },
    { value: 'other', label: 'Other' }
  ];

  // Gate 2 Tooltips/Glossary
  const gate2Tooltips = {
    'green-lease': 'Lease clauses enabling cost recovery/data-sharing/savings allocation between owner and tenant',
    'service-charge': 'Passing allowable operating costs to tenants per lease rules',
    'espc': 'Vendor guarantees S$ savings; shortfalls compensated contractually',
    'gainshare': 'Shared savings/overruns against target cost baseline',
    'sla-kpi': 'Service payment varies with BEI/comfort KPIs',
    'term-sheet': 'Lender\'s proposed financing terms (rate/tenor/fees/conditions) prior to final docs',
    'sll': 'Loan pricing tied to sustainability KPI achievement; may require reporting/assurance',
    'ppa': 'Third-party owns PV and sells electricity; payer is off-taker under contract',
    'eir': 'Employer\'s information requirements specifying digital handover data',
    'aid-cobie': 'Structured asset/handover data fields and exchange format',
    'bms-ems': 'Building/Energy Management Systems; source of operational data',
    'cmms-erp': 'Maintenance/work order and enterprise systems; needed for O&M verification',
    'api': 'Defined data access interface (protocol, cadence, format)',
    'pdpa': 'Singapore personal data protection requirements; affects data access/usage',
    'ipmvp': 'M&V standard; Option C = whole-facility regression; baseline normalisation is critical',
    'fat-sat': 'Factory/site acceptance tests to prove equipment/system performs as specified',
    'raci': 'Responsibility matrix preventing interface gaps'
  };

  // Calculate enabler status
  const calculateEnablerStatus = (enablerKey) => {
    const enabler = gate2Questions[enablerKey];
    const questions = enabler.questions;
    
    let passed = 0;
    let failed = 0;
    let unanswered = 0;
    
    questions.forEach(q => {
      const answer = gate2EnablerAnswers[q.id];
      if (answer === 'yes' || answer === 'na') passed++;
      else if (answer === 'no') failed++;
      else unanswered++;
    });
    
    if (unanswered > 0) return 'incomplete';
    if (failed > 0) return 'fail';
    return 'pass';
  };

  // Get failed questions for an enabler
  const getFailedQuestions = (enablerKey) => {
    const enabler = gate2Questions[enablerKey];
    return enabler.questions.filter(q => gate2EnablerAnswers[q.id] === 'no');
  };

  // Check if all enablers pass
  const allEnablersPass = () => {
    return ['enabler1', 'enabler2', 'enabler3', 'enabler4'].every(
      key => calculateEnablerStatus(key) === 'pass'
    );
  };

  // Get all failed enablers
  const getFailedEnablers = () => {
    return ['enabler1', 'enabler2', 'enabler3', 'enabler4'].filter(
      key => calculateEnablerStatus(key) === 'fail'
    );
  };

  // Handle Gate 2 question answer
  const handleGate2QuestionAnswer = (questionId, answer) => {
    setGate2EnablerAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Handle Gate 2 evidence type
  const handleGate2Evidence = (questionId, evidence) => {
    setGate2EnablerAnswers(prev => ({
      ...prev,
      [`${questionId}_evidence`]: evidence
    }));
  };

  // Handle Gate 2 blocker text
  const handleGate2Blocker = (questionId, blocker) => {
    setGate2EnablerAnswers(prev => ({
      ...prev,
      [`${questionId}_blocker`]: blocker
    }));
  };

  // Add enablement action for a failed enabler
  const addEnablementAction = (enablerKey, questionId) => {
    const enabler = gate2Questions[enablerKey];
    const question = enabler.questions.find(q => q.id === questionId);
    
    setGate2EnablementActions(prev => [...prev, {
      id: `EA_${Date.now()}`,
      enablerKey,
      enablerName: enabler.name,
      questionId,
      questionText: question.text,
      gapStatement: gate2EnablerAnswers[`${questionId}_blocker`] || '',
      closureMethod: null,
      closureMethodOther: '',
      acceptanceCriteria: '',
      owner: '',
      raci: '',
      deadline: '',
      dependencies: '',
      documents: '',
      canClose: null
    }]);
  };

  // Update enablement action
  const updateEnablementAction = (actionId, field, value) => {
    setGate2EnablementActions(prev => prev.map(action => 
      action.id === actionId ? { ...action, [field]: value } : action
    ));
  };

  // Check if enablement actions are credible
  const enablementActionsCredible = () => {
    if (gate2EnablementActions.length === 0) return true;
    return gate2EnablementActions.every(action => action.canClose === 'yes');
  };

  // Proceed to next Gate 2 step
  const proceedGate2Step = () => {
    if (gate2Step < 4) {
      setGate2Step(gate2Step + 1);
    } else if (gate2Step === 4) {
      // After all enablers, check results
      if (allEnablersPass()) {
        setGate2Step(7); // Go to Economics Clarity
      } else {
        // Generate enablement actions for failed questions
        const failedEnablers = getFailedEnablers();
        failedEnablers.forEach(enablerKey => {
          const failedQs = getFailedQuestions(enablerKey);
          failedQs.forEach(q => {
            addEnablementAction(enablerKey, q.id);
          });
        });
        setGate2Step(5); // Go to Results/Summary first
      }
    }
  };

  // Calculate updated economics for Gate 2
  const calculateGate2Economics = () => {
    // Get Gate 1 calculations if available
    const g1 = gate1Results?.calculations || {};
    
    // Apply Gate 2 adjustments
    const additionalCosts = parseFloat(gate2EconomicsClarity.updatedCosts) || 0;
    const additionalBenefits = parseFloat(gate2EconomicsClarity.updatedBenefits) || 0;
    
    const originalNPV = g1.npv || 0;
    const updatedNPV = originalNPV + additionalBenefits - additionalCosts;
    const originalPayback = g1.paybackYears || 0;
    
    // Determine if borderline (within 10-15% of threshold)
    const thresholdDelta = Math.abs(updatedNPV) / (Math.abs(originalNPV) || 1);
    const isBorderline = thresholdDelta <= 0.15 && updatedNPV < 0;
    
    return {
      originalNPV,
      updatedNPV,
      originalPayback,
      meetsThreshold: updatedNPV >= 0,
      isBorderline,
      improvement: originalNPV !== 0 ? Math.round(((updatedNPV - originalNPV) / Math.abs(originalNPV)) * 100) : 0
    };
  };

  // Proceed to Gate 3
  const proceedToGate3 = () => {
    // Generate summary for Gate 2
    const summary = generateGateSummary(2, {
      question: userQuestion,
      scorecard: scorecardData,
      gate2Data: {
        enablerResults: gate2EnablerAnswers,
        economicsClarity: gate2EconomicsClarity,
        enablementActions: gate2EnablementActions,
        decision: gate2Decision
      }
    });
    
    if (summary) {
      setGateSummaries(prev => ({
        ...prev,
        gate2: summary
      }));
      
      // Add summary message to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: { type: 'summary', summary: summary },
        isText: false
      }]);
    }
    
    // Pre-fill Gate 3 carryover from Gate 2 data
    setGate3Carryover(prev => ({
      ...prev,
      role: gate2Carryover.role,
      proposedAction: gate2Carryover.proposedAction || userQuestion,
      boundary: gate2Carryover.boundary
    }));
    
    setCurrentGate(3);
    setView('gate3-wizard');
    resetScroll();
  };

  // ==================== GATE 3: DELIVERY & M&V EXECUTION ====================

  // Gate 3 Phase Questions Configuration
  const gate3PhaseConfig = {
    phase1: {
      name: 'Mobilise',
      icon: '🚀',
      startTrigger: 'Gate-2 Decision Card signed + funds released',
      finishTrigger: 'Baseline, data wiring, and change control are proven ready',
      questions: [
        { id: 'P1_1', text: 'RACI confirmed; internal Gantt / Kanban published', evidenceTypes: ['RACI matrix', 'Schedule screenshot/export', 'Meeting minutes'], naAllowed: false },
        { id: 'P1_2', text: 'Baseline locked for the named evidence method', helperText: 'IPMVP A/B/C/D or Non-energy KPI baseline requirements', evidenceTypes: ['Baseline plan', 'Baseline dataset link', 'Stipulation schedule', 'Model spec', 'KPI spec'], naAllowed: false },
        { id: 'P1_3', text: 'Data Interface Control Document (ICD) signed', helperText: 'API endpoints, payload schema, cadence, timestamps, latency SLA, retention', evidenceTypes: ['ICD document', 'API spec', 'Cybersecurity appendix'], naAllowed: true, naReason: 'No data integration required for this action' },
        { id: 'P1_4', text: 'Meter & tag register complete', helperText: 'Unique IDs, locations, accuracy classes, calibration certificates', evidenceTypes: ['Meter register', 'Calibration certificates', 'Commissioning checklist'], naAllowed: true, naReason: 'No metering required for this action' },
        { id: 'P1_5', text: 'Baseline Adjustment Protocol defined', helperText: 'Routine vs non-routine adjustments', evidenceTypes: ['Adjustment protocol document', 'Examples list'], naAllowed: true, naReason: 'No baseline adjustments anticipated' },
        { id: 'P1_6', text: 'Change Control Register live; Risk Register v1', helperText: 'Long-lead, permits, logistics, seasonality', evidenceTypes: ['Registers export', 'Risk log'], naAllowed: false },
        { id: 'P1_7', text: 'Training plan defined', helperText: 'Attendees, hours, assessment method', evidenceTypes: ['Training plan', 'Attendance tracker template'], naAllowed: true, naReason: 'No training required for this action' }
      ]
    },
    phase2: {
      name: 'Build / Implement',
      icon: '🔨',
      startTrigger: 'Mobilise deliverables accepted; permits/MOPs approved',
      finishTrigger: 'Scope installed; QA/QC records complete',
      questions: [
        { id: 'P2_1', text: 'Method of Procedure (MOP) executed; safety clearances', helperText: 'Shutdowns, tie-ins, permit-to-work, RAMS', evidenceTypes: ['MOP', 'Permit-to-work', 'RAMS', 'Approvals'], naAllowed: true, naReason: 'No physical installation required' },
        { id: 'P2_2', text: 'QA/QC checklists and hold-point sign-offs; NCRs closed', evidenceTypes: ['QA/QC checklist', 'NCR log', 'Closure evidence'], naAllowed: false },
        { id: 'P2_3', text: 'CDE evidence linked to AID/COBie asset IDs', helperText: 'Photos, inspections, test results', evidenceTypes: ['CDE links', 'Inspection reports', 'Photo logs', 'Tagging references'], naAllowed: true, naReason: 'No CDE/asset data requirements' },
        { id: 'P2_4', text: 'Productivity/quality measures recorded', helperText: 'If PPVC: scan-to-BIM tolerance, cycle-time, schedule variance, defects/1000m²', evidenceTypes: ['Scan report', 'Logs', 'KPI sheets'], naAllowed: true, naReason: 'Not a productivity/quality-focused action' }
      ]
    },
    phase3: {
      name: 'Commission & Accept',
      icon: '✅',
      startTrigger: 'Build evidence complete; commissioning resources ready',
      finishTrigger: 'Systems accepted; As-Commissioned Baseline recorded',
      questions: [
        { id: 'P3_1', text: 'FAT / SAT signed', helperText: 'Factory/Site Acceptance Tests', evidenceTypes: ['FAT/SAT forms', 'Sign-offs'], naAllowed: true, naReason: 'No equipment requiring FAT/SAT' },
        { id: 'P3_2', text: 'Functional Performance Tests (FPT) complete', helperText: 'Sequences, setpoint sweeps, alarms/interlocks', evidenceTypes: ['FPT scripts', 'Trend logs', 'Pass/fail sheets'], naAllowed: true, naReason: 'No functional tests required' },
        { id: 'P3_3', text: 'Seasonal tests planned', helperText: 'If seasonal behaviour matters', evidenceTypes: ['Seasonal test plan', 'Dates', 'Scope'], naAllowed: true, naReason: 'Seasonal variation not relevant' },
        { id: 'P3_4', text: 'Training completion; warranties activated; AID/COBie updated', evidenceTypes: ['Training records', 'Warranty letters', 'Updated AID/COBie extracts'], naAllowed: false }
      ]
    },
    phase4: {
      name: 'Performance Evidence',
      icon: '📊',
      startTrigger: 'Commissioning accepted; baseline frozen; meters/models/APIs live',
      finishTrigger: 'Observation period complete; final evidence report issued',
      dataGovernance: [
        { id: 'P4_G1', text: 'Data SLAs defined', helperText: 'Completeness + latency targets; gap-filling rules', evidenceTypes: ['Data SLA document', 'Gap-filling protocol'], naAllowed: false },
        { id: 'P4_G2', text: 'Audit trail established', helperText: 'Immutable logs; separation of duties (operator vs verifier)', evidenceTypes: ['Audit log samples', 'Access control matrix'], naAllowed: false },
        { id: 'P4_G3', text: 'Security & PDPA compliance confirmed', helperText: 'Role-based access, encryption, anonymisation where needed', evidenceTypes: ['Security checklist', 'PDPA assessment'], naAllowed: true, naReason: 'No personal data involved' }
      ]
    },
    phase5: {
      name: 'Settlement',
      icon: '💰',
      startTrigger: 'Final evidence report accepted by stakeholders (and assurer/lender if required)',
      finishTrigger: 'Contract math applied; decision recorded and communicated'
    }
  };

  // IPMVP Options Configuration
  const ipmvpOptions = {
    A: {
      name: 'Option A: Retrofit Isolation – Key Parameter Measurement',
      shortName: 'Option A',
      description: 'Measure key parameters; stipulate others with conservative sources',
      formula: 'Savings = (Measured ΔkW or Δflow) × (Stipulated hours) × (# units) × adjustment factors',
      evidencePack: ['Stipulation Schedule', 'Spot-measure logs', 'Photos', 'Calc sheet', 'Sensitivity notes'],
      caution: 'Higher uncertainty; only acceptable if parties accept stipulations'
    },
    B: {
      name: 'Option B: Retrofit Isolation – All Parameter Measurement',
      shortName: 'Option B',
      description: 'Measure all parameters within a defined boundary',
      formula: 'Savings = Baseline (pre/modelled) − Reporting (measured), with adjustment protocol',
      evidencePack: ['Meter IDs', 'Calibration', 'Raw trends', 'Adjustment log', 'Savings workbook']
    },
    C: {
      name: 'Option C: Whole Facility',
      shortName: 'Option C',
      description: 'Whole-facility metering with regression model and normalisation',
      formula: 'Savings = Predicted (baseline model with actual drivers) − Actual measured',
      qualityTargets: 'R² ≥ ~0.75, CV(RMSE) ≤ ~15–20%, |NMBE| ≤ ~5% (monthly)',
      evidencePack: ['Model spec', 'Drivers', 'Baseline window', 'Quality stats', 'Residual plots', 'Normalisation details']
    },
    D: {
      name: 'Option D: Calibrated Simulation',
      shortName: 'Option D',
      description: 'Use calibrated simulation model (eQuest/EnergyPlus/IES)',
      formula: 'Savings = Calibrated baseline − Reporting (or vs calibrated "as-designed" reference)',
      evidencePack: ['Model inputs/assumptions', 'Calibration plots', 'Error bands', 'Scenario comparison']
    }
  };

  // KPI Categories for Non-energy route
  const kpiCategories = [
    { value: 'schedule', label: 'Schedule', examples: 'PPVC cycle time, schedule variance' },
    { value: 'defects', label: 'Defects / Quality', examples: 'Defects/1000m², scan-to-BIM tolerance' },
    { value: 'embodied-carbon', label: 'Embodied Carbon', examples: 'EPD-based take-offs, calculation boundaries' },
    { value: 'safety', label: 'Safety / Risk', examples: 'Incident rates, near-miss tracking' },
    { value: 'other', label: 'Other', examples: 'Specify your KPI category' }
  ];

  // Gate 2 Mechanisms (for carry-over)
  const gate2Mechanisms = [
    { value: 'green-lease', label: 'Green Lease', desc: 'Service-charge or amortisation recovery; data-sharing; setpoint collaboration' },
    { value: 'espc', label: 'ESPC / Guaranteed Savings', desc: 'Vendor guarantee; shortfall remedy; upside sharing' },
    { value: 'gainshare', label: 'Gainshare / Painshare', desc: 'Target cost; verified adjustments' },
    { value: 'sla-kpi', label: 'SLA with KPI-linked Payment', desc: 'BEI/comfort KPIs tied to payment/bonuses' },
    { value: 'lender-reporting', label: 'Sustainability-linked Finance', desc: 'KPI report + assurance to lender' }
  ];

  // IPMVP Selection Guide Questions
  const ipmvpGuideQuestions = [
    { id: 'Q1', text: 'Is there a neat, meterable boundary?', yesOption: 'B', noOption: 'continue' },
    { id: 'Q2', text: 'Many small uniform changes with simple physics, and metering all drivers is too costly?', yesOption: 'A', noOption: 'continue' },
    { id: 'Q3', text: 'Does the action alter operations across multiple systems?', yesOption: 'C', noOption: 'continue' },
    { id: 'Q4', text: 'New build / deep retrofit and meters aren\'t yet available?', yesOption: 'D', noOption: 'C' }
  ];

  // Handle Gate 3 phase question answer
  const handleGate3PhaseAnswer = (phase, questionId, answer) => {
    const setters = {
      phase1: setGate3Phase1,
      phase2: setGate3Phase2,
      phase3: setGate3Phase3,
      phase4: setGate3Phase4,
      phase5: setGate3Phase5
    };
    
    setters[phase](prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Handle Gate 3 evidence input
  const handleGate3Evidence = (phase, questionId, evidence) => {
    const setters = {
      phase1: setGate3Phase1,
      phase2: setGate3Phase2,
      phase3: setGate3Phase3,
      phase4: setGate3Phase4,
      phase5: setGate3Phase5
    };
    
    setters[phase](prev => ({
      ...prev,
      [`${questionId}_evidence`]: evidence
    }));
  };

  // Handle Gate 3 N/A reason
  const handleGate3NaReason = (phase, questionId, reason) => {
    const setters = {
      phase1: setGate3Phase1,
      phase2: setGate3Phase2,
      phase3: setGate3Phase3,
      phase4: setGate3Phase4,
      phase5: setGate3Phase5
    };
    
    setters[phase](prev => ({
      ...prev,
      [`${questionId}_naReason`]: reason
    }));
  };

  // Calculate phase completion status
  const calculatePhaseStatus = (phase) => {
    const phaseData = {
      phase1: gate3Phase1,
      phase2: gate3Phase2,
      phase3: gate3Phase3,
      phase4: gate3Phase4,
      phase5: gate3Phase5
    }[phase];
    
    const config = gate3PhaseConfig[phase];
    if (!config) return 'not-started';
    
    const questions = config.questions || config.dataGovernance || [];
    
    let answered = 0;
    let total = questions.length;
    let hasNo = false;
    
    questions.forEach(q => {
      const answer = phaseData[q.id];
      if (answer !== null && answer !== undefined) {
        answered++;
        if (answer === 'no') hasNo = true;
      }
    });
    
    if (answered === 0) return 'not-started';
    if (hasNo) return 'blocked';
    if (answered === total) return 'complete';
    return 'in-progress';
  };

  // Check if can proceed to next phase
  const canProceedToNextPhase = (currentPhase) => {
    const status = calculatePhaseStatus(currentPhase);
    return status === 'complete';
  };

  // Check for material changes (back-route trigger)
  const checkBackRoute = () => {
    if (gate3ChangeControl.hasChanges === 'yes' && gate3ChangeControl.materialImpact === 'yes') {
      if (gate3ChangeControl.impactType === 'economics' || gate3ChangeControl.impactType === 'both') {
        return 'gate1';
      }
      if (gate3ChangeControl.impactType === 'measurement') {
        return 'gate2';
      }
    }
    return null;
  };

  const send = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: inputValue, isText: true }]);
    const userInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check if this is an ESG decision question
    if (userInput.toLowerCase().includes('should') || userInput.toLowerCase().includes('worth') || userInput.toLowerCase().includes('use')) {
      // Store user question for Gate 0
      setUserQuestion(userInput);
      
      // Send message that we'll start the questionnaire
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: { 
          type: 'gate0-intro', 
          message: `I'll help you evaluate "${userInput}" through our Gate 0 Strategic Screening process. This involves answering 25 questions across 5 criteria to determine if this initiative should proceed.`,
          question: userInput
        },
        isText: false
      }]);
      
      setIsTyping(false);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: { type: 'text', message: "I'm designed to help with ESG decision-making questions. Try asking something like 'Should we install solar panels?' or 'Is rainwater harvesting worth it?' and I'll guide you through our strategic screening process." },
        isText: false
      }]);
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ id: 1, type: 'bot', content: "Hey I'm ESG Chatbot. How can I help you?", isText: true }]);
    setView('chat');
    setEvalData(null);
    setEvalAnswers({});
    setSelectedRole(null);
    setCurrentGate(0);
    setUserQuestion(null);
    setScorecardData(null);
    // Gate 0 reset
    setGate0Context({
      role: null,
      assetContext: null,
      projectStage: null,
      assetType: null
    });
    setGate0Answers({});
    setGate0Results(null);
    // Gate 0 RE-TEST reset
    setReTestPlan({
      checkName: null,
      checkKey: null,
      validationMethods: [], // Changed to array for multi-select
      validationMethodOther: '',
      startDate: '',
      targetDate: '',
      budgetCap: '',
      passCriterion: ''
    });
    setReTestStatus('defining');
    setReTestFailedQuestions([]);
    setReTestAnswers({});
    setReTestCompletion({
      completed: null,
      outcome: null,
      evidence: ''
    });
    // Gate 1 reset
    setGate1Results(null);
    setGate1RetestOptions([]);
    setHasRetested(false);
    setRetestAnswers({});
    setGate1Step(1);
    setGate1Inputs({
      setup: {
        role: null,
        projectType: null,
        assetContext: null,
        projectStage: null,
        proposedAction: '',
        scopeBoundary: ''
      },
      baseline: {
        baselineAction: '',
        baselinePeriod: null,
        baselinePeriodOther: '',
        metricsAvailable: [],
        normalisationPossible: null,
        normalisationMethod: ''
      },
      evidence: {
        methods: [],
        existingEvidence: [],
        evidenceDetails: ''
      },
      delta: {
        energyKwh: '',
        waterM3: '',
        maintenanceCost: '',
        downtimeAvoided: '',
        scheduleWeeks: '',
        rentUplift: '',
        occupancyChange: '',
        capRateChange: '',
        hasDownsideCase: null,
        downsideRange: ''
      },
      money: {
        spTariff: '0.25',
        carbonPrice: '25',
        rentBenchmark: '',
        ldRates: '',
        valueCapturedBy: [], // Changed to array for multi-select
        mechanism: [],
        mechanismOther: ''
      },
      costs: {
        capex: '',
        oAndM: { applicable: null, amount: '0' },
        trainingIT: { applicable: null, amount: '0' },
        commissioningMV: { applicable: null, amount: '0' },
        adminReporting: { applicable: null, amount: '0' }
      },
      decisionRule: {
        thresholdType: null,
        wacc: '',
        paybackYears: '',
        irrTarget: '',
        gainshareTarget: '',
        feeProtectionTarget: '',
        nearMissBand: '5',
        reTestCap: '10',
        timeBoxRequired: null,
        analysisPeriod: '10'
      }
    });
    setGate1Calculations({
      annualEnergyBenefit: 0,
      annualCarbonBenefit: 0,
      annualWaterBenefit: 0,
      annualMaintenanceBenefit: 0,
      annualOtherBenefit: 0,
      totalAnnualBenefit: 0,
      totalAnnualCost: 0,
      netAnnualBenefit: 0,
      totalCapex: 0,
      npv: 0,
      irr: 0,
      paybackYears: 0,
      meetsThreshold: null,
      thresholdDelta: 0
    });
    setGate1ReTestPlan({
      criticalUnknown: '',
      validationMethod: null,
      validationMethodOther: '',
      whatToMeasure: '',
      startDate: '',
      targetDate: '',
      budgetCap: '',
      passCriterion: '',
      exitRule: '',
      itemsToReAnswer: []
    });
    setGate1ReTestStatus('defining');
    setGate1ReTestCompletion({
      completed: null,
      outcome: null,
      evidence: '',
      updatedInputs: {}
    });
    // Gate 2 reset
    setGate2Step(0);
    setGate2Carryover({
      role: null,
      proposedAction: '',
      boundary: null,
      boundaryDescription: '',
      whoPays: '',
      whoBenefits: '',
      gate1Metric: null,
      gate1Threshold: '',
      gate1Result: null,
      gate1ResultAmount: ''
    });
    setGate2EnablerAnswers({
      B1: null, B1_evidence: null, B1_blocker: '',
      B2: null, B2_evidence: null, B2_blocker: '',
      B3: null, B3_evidence: null, B3_blocker: '',
      B4: null, B4_evidence: null, B4_blocker: '',
      B5: null, B5_evidence: null, B5_blocker: '',
      B6: null, B6_evidence: null, B6_blocker: '',
      B7: null, B7_evidence: null, B7_blocker: '',
      B8: null, B8_evidence: null, B8_blocker: '',
      B9: null, B9_evidence: null, B9_blocker: '',
      B10: null, B10_evidence: null, B10_blocker: '',
      B11: null, B11_evidence: null, B11_blocker: '',
      B12: null, B12_evidence: null, B12_blocker: '',
      B13: null, B13_evidence: null, B13_blocker: '',
      B14: null, B14_evidence: null, B14_blocker: '',
      B15: null, B15_evidence: null, B15_blocker: '',
      B16: null, B16_evidence: null, B16_blocker: '',
      B17: null, B17_evidence: null, B17_blocker: '',
      B18: null, B18_evidence: null, B18_blocker: '',
      B19: null, B19_evidence: null, B19_blocker: '',
      B20: null, B20_evidence: null, B20_blocker: ''
    });
    setGate2EnablerResults({ E1: null, E2: null, E3: null, E4: null });
    setGate2EnablementActions([]);
    setGate2EconomicsClarity({
      whatChanged: '',
      updatedBenefits: '',
      updatedCosts: '',
      updatedNPV: '',
      updatedPayback: '',
      meetsThreshold: null,
      isBorderline: null,
      borderlineReason: ''
    });
    setGate2PilotPlan({
      uncertainty: '',
      boundary: '',
      duration: '',
      responsibleParties: '',
      passCriterion: '',
      mvMethod: '',
      costCap: '',
      exitRule: '',
      evidenceToUpload: '',
      result: null,
      resultEvidence: ''
    });
    setGate2Decision(null);
    // Gate 3 reset
    setGate3Step(0);
    setGate3Carryover({
      role: null,
      proposedAction: '',
      boundary: null,
      boundaryDescription: '',
      mechanisms: [],
      allEnablersLocked: null,
      decisionCardSignedFundsReleased: null
    });
    setGate3Route({
      actionType: null,
      ipmvpOption: null,
      recommendedOption: null,
      kpiCategory: null,
      kpiCategoryOther: ''
    });
    setGate3Phase1({
      P1_1: null, P1_1_evidence: '', P1_1_naReason: '',
      P1_2: null, P1_2_evidence: '', P1_2_naReason: '',
      P1_3: null, P1_3_evidence: '', P1_3_naReason: '',
      P1_4: null, P1_4_evidence: '', P1_4_naReason: '',
      P1_5: null, P1_5_evidence: '', P1_5_naReason: '',
      P1_6: null, P1_6_evidence: '', P1_6_naReason: '',
      P1_7: null, P1_7_evidence: '', P1_7_naReason: ''
    });
    setGate3Phase2({
      P2_1: null, P2_1_evidence: '', P2_1_naReason: '',
      P2_2: null, P2_2_evidence: '', P2_2_naReason: '',
      P2_3: null, P2_3_evidence: '', P2_3_naReason: '',
      P2_4: null, P2_4_evidence: '', P2_4_naReason: ''
    });
    setGate3Phase3({
      P3_1: null, P3_1_evidence: '', P3_1_naReason: '',
      P3_2: null, P3_2_evidence: '', P3_2_naReason: '',
      P3_3: null, P3_3_evidence: '', P3_3_naReason: '',
      P3_4: null, P3_4_evidence: '', P3_4_naReason: ''
    });
    setGate3Phase4({
      P4_G1: null, P4_G1_evidence: '', P4_G1_naReason: '',
      P4_G2: null, P4_G2_evidence: '', P4_G2_naReason: '',
      P4_G3: null, P4_G3_evidence: '', P4_G3_naReason: '',
      ipmvpConfirmed: null,
      ipmvpEvidencePack: '',
      savingsCalculation: '',
      kpiConfirmed: null,
      kpiEvidencePack: ''
    });
    setGate3Phase5({
      settlementMemoComplete: null,
      espcSettlement: '',
      gainshareSettlement: '',
      greenLeaseSettlement: '',
      slaKpiSettlement: '',
      lenderReportSettlement: '',
      decisionRecorded: null,
      evidenceArchived: null,
      outcomesCommunicated: null,
      closeOutNotes: ''
    });
    setGate3ChangeControl({
      hasChanges: null,
      changeDescription: '',
      materialImpact: null,
      impactType: null,
      backRoute: null
    });
    setGate3PhaseStatus({
      phase1: 'not-started',
      phase2: 'not-started',
      phase3: 'not-started',
      phase4: 'not-started',
      phase5: 'not-started'
    });
    setGate3Decision(null);
    // Gate summaries reset
    setGateSummaries({
      gate0: null,
      gate1: null,
      gate2: null,
      gate3: null
    });
    setExpandedSummary(false);
  };

  // Start evaluation flow
  const startEvaluation = (data) => {
    const lowestScore = Math.min(...data.scores.map(s => s.score));
    const lowestCriterion = data.scores.find(s => s.score === lowestScore);
    const criterionConfig = evalQuestions[lowestCriterion.criterion];
    
    setEvalData({
      ...data,
      lowestCriterion: lowestCriterion.criterion,
      criterionConfig: criterionConfig,
      // For non-role-based criteria, use questions array directly
      questions: Array.isArray(criterionConfig) ? criterionConfig : null
    });
    setEvalAnswers({});
    setSelectedRole(null);
    setView('evaluate');
  };

  // Handle role selection for Value Capture Path
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const followUp = evalData.criterionConfig.followUp[role];
    setEvalData(prev => ({
      ...prev,
      questions: followUp.questions,
      adoptCondition: followUp.adoptCondition
    }));
    setEvalAnswers({});
    setView('evaluate-step2');
  };

  // Handle evaluation answer
  const handleEvalAnswer = (questionId, answer) => {
    const newAnswers = { ...evalAnswers, [questionId]: answer };
    setEvalAnswers(newAnswers);
    
    // Check if all questions answered
    if (Object.keys(newAnswers).length === evalData.questions.length) {
      // Use custom adoptCondition if available (for role-based), otherwise check required questions
      let shouldAdopt;
      if (evalData.adoptCondition) {
        shouldAdopt = evalData.adoptCondition(newAnswers);
      } else {
        const requiredQuestions = evalData.questions.filter(q => q.required);
        shouldAdopt = requiredQuestions.every(q => newAnswers[q.id] === true);
      }
      setTimeout(() => {
        setView(shouldAdopt ? 'adopt' : 'reject');
      }, 500);
    }
  };

  const Scorecard = ({ data }) => {
    // Derive decision from the AI's answer text (not from scores)
    const getDecisionFromAnswer = () => {
      const answer = data.answer.toLowerCase();
      if (answer.includes('not recommended') || answer.includes('is not recommended') || answer.includes('reject')) {
        return { text: 'REJECTED', emoji: '🟥', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
      } else if (answer.includes('pilot test') || answer.includes('should pilot')) {
        return { text: 'TEST', emoji: '🟧', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
      } else if (answer.includes('yes, adopt') || answer.includes('yes, install') || answer.includes('yes,') || answer.startsWith('yes')) {
        return { text: 'ADOPT', emoji: '🟩', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
      }
      // Fallback to score-based decision if answer doesn't match patterns
      return getDecision(data.scores);
    };
    
    const decision = getDecisionFromAnswer();
    const isReTest = decision.text === 'TEST';
    const isAdopt = decision.text === 'ADOPT';
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: decision.bg, border: `1px solid ${decision.color}50`, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>A) ANSWER</div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: decision.color, lineHeight: '1.5' }}>{data.answer}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>B) EVIDENCE USED</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.evidence && data.evidence.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', background: e.type === 'pdf' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: e.type === 'pdf' ? '#10B981' : '#3B82F6', minWidth: '45px', textAlign: 'center' }}>
                  {e.type === 'pdf' ? '📄 PDF' : '🌐 WEB'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.8)', flex: 1 }}>{e.source}{e.page ? `, p.${e.page}` : ''}</span>
                <span style={{ fontSize: '10px', color: e.verified ? '#10B981' : '#F59E0B' }}>{e.verified ? '✓ verified' : '⚠ unverified'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>C) SCORECARD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.scores && data.scores.map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {/* Criterion + Score Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>{s.criterion}</span>
                  <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', background: s.score >= 4 ? 'rgba(16,185,129,0.2)' : s.score >= 3 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: s.score >= 4 ? '#10B981' : s.score >= 3 ? '#F59E0B' : '#EF4444' }}>{s.score}/5</span>
                </div>
                
                {/* Evidence Row */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(59,130,246,0.05)' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase' }}>Evidence</div>
                  <div style={{ fontSize: '11px', color: '#3B82F6', fontStyle: 'italic' }}>📄 {s.evidence}</div>
                </div>
                
                {/* Key Reasons Row */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>Key Reasons</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {s.reasons && s.reasons.map((r, j) => (
                      <div key={j} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: s.score >= 4 ? '#10B981' : s.score >= 3 ? '#F59E0B' : '#EF4444', fontWeight: '700' }}>•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderRadius: '12px', background: decision.bg, border: `2px solid ${decision.color}` }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>D) TOTAL</div>
            <div style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'monospace', color: decision.color }}>{data.total}/25</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isReTest && (
              <button
                onClick={() => startEvaluation(data)}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(245,158,11,0.2)',
                  border: '2px solid #F59E0B',
                  borderRadius: '10px',
                  color: '#F59E0B',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔍 EVALUATE
              </button>
            )}
            {isAdopt && (
              <button
                onClick={() => {
                  // Generate summary for Gate 0 direct adopt (no retest)
                  const summary = generateGateSummary(0, {
                    question: userQuestion,
                    scorecard: data,
                    evalPath: { wasRetest: false }
                  });
                  
                  if (summary) {
                    setGateSummaries(prev => ({
                      ...prev,
                      gate0: summary
                    }));
                    
                    // Add summary message to chat
                    setMessages(prev => [...prev, {
                      id: Date.now(),
                      type: 'bot',
                      content: { type: 'summary', summary: summary },
                      isText: false
                    }]);
                  }
                  
                  setCurrentGate(1);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(59,130,246,0.2)',
                  border: '2px solid #3B82F6',
                  borderRadius: '10px',
                  color: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📋 Proceed to Gate 1 →
              </button>
            )}
            <div style={{ padding: '14px 28px', borderRadius: '10px', fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '1px', background: decision.color, boxShadow: `0 4px 15px ${decision.color}40` }}>{decision.emoji} {decision.text}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {data.assumptions && data.assumptions.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>E) ASSUMPTIONS</div>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>{data.assumptions.map((a, i) => (<li key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', lineHeight: '1.4' }}>{a}</li>))}</ul>
            </div>
          )}
          {data.whatWouldChange && data.whatWouldChange.length > 0 && (
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>WHAT WOULD CHANGE SCORE</div>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>{data.whatWouldChange.map((w, i) => (<li key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', lineHeight: '1.4' }}>{w}</li>))}</ul>
            </div>
          )}
        </div>

        {data.nextSteps && data.nextSteps.length > 0 && (
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>F) NEXT STEPS CHECKLIST</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.nextSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  <span style={{ width: '20px', height: '20px', border: '2px solid #3B82F6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', color: '#3B82F6', fontWeight: '700' }}>{i + 1}</span>
                  <span style={{ lineHeight: '1.4' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const BotMsg = ({ msg }) => {
    if (msg.isText) {
      const text = typeof msg.content === 'string' ? msg.content : msg.content?.message || '';
      return <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{text}</p>;
    }
    if (msg.content && msg.content.type === 'scorecard') return <Scorecard data={msg.content} />;
    if (msg.content && msg.content.type === 'summary') return <SummaryChatMessage summary={msg.content.summary} />;
    if (msg.content && msg.content.type === 'gate0-intro') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, lineHeight: '1.6' }}>{msg.content.message}</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>First, I need some context about your project to determine which questions apply.</p>
          <button
            onClick={() => { setView('gate0-context'); resetScroll(); }}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              alignSelf: 'flex-start',
              boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
            }}
          >
            Start Strategic Screening →
          </button>
        </div>
      );
    }
    if (msg.content && msg.content.type === 'text') return <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.content.message}</p>;
    return <p style={{ margin: 0 }}>Unable to display response</p>;
  };

  const Sidebar = () => null; // Sidebar hidden from user view
  
  const SidebarFull = () => (
    <div style={{ width: '240px', background: 'rgba(15,23,42,0.95)', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🌱</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>ESG Advisor</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Decision Support</div>
        </div>
      </div>
      
      {/* Current Gate Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>CURRENTLY</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#A78BFA' }}>Gate {currentGate}</div>
        {userQuestion && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'left' }}>
            <div style={{ fontWeight: '600', marginBottom: '2px' }}>Evaluating:</div>
            <div style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userQuestion}</div>
          </div>
        )}
      </div>
      
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px' }}>🤖</span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6' }}>AI-POWERED SCORING</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>Uses Project Knowledge PDFs + Web Search</p>
      </div>

      {currentGate === 0 ? (
        /* Gate 0 Strategic Screening - 25 Questions */
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>5 CHECKS (5 QUESTIONS EACH)</div>
          {[
            { name: 'Coercive Trigger', desc: '≥80% Yes to pass' },
            { name: 'Strategic Fit', desc: '≥80% Yes to pass' },
            { name: 'Value Capture Path', desc: '≥80% Yes to pass' },
            { name: 'Rough Economic Pass', desc: '≥80% Yes to pass' },
            { name: 'Feasible to Implement', desc: '≥80% Yes to pass' }
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '22px', height: '22px', background: 'rgba(16,185,129,0.15)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#10B981', flexShrink: 0 }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ) : currentGate === 1 ? (
        /* Gate 1 Proposed Action Test Steps */
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>PROPOSED ACTION TEST STEPS</div>
          <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textAlign: 'center' }}>Steps to conduct & conclude Proposed Action test:</div>
            {[
              { name: 'Define the Baseline Action', desc: 'Establish reference point' },
              { name: 'Model / Measure', desc: 'Proposed vs Baseline Action' },
              { name: 'Convert to Monetary Value', desc: 'Performance into $ terms' },
              { name: 'Account for Costs', desc: 'All costs differing from Baseline' },
              { name: 'Apply Financing Pathway', desc: 'OPTIONAL' }
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <span style={{ width: '22px', height: '22px', background: 'rgba(139,92,246,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#A78BFA', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentGate === 2 ? (
        /* Gate 2 Commercial & Contractual Lock-In */
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>ENABLER CHECKERS</div>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textAlign: 'center' }}>All 4 must pass for adoption:</div>
            {[
              { name: 'Value-Capture Mechanism', desc: 'Contractually defined', icon: '💰' },
              { name: 'Financing Terms', desc: 'Locked & usable', icon: '🏦' },
              { name: 'Data Delivery', desc: 'Contractually specified', icon: '📊' },
              { name: 'Delivery Risk', desc: 'Contractually covered', icon: '🛡️' }
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <span style={{ width: '22px', height: '22px', background: 'rgba(59,130,246,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{c.name}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Gate 3+ Placeholder */
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>GATE {currentGate}</div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>🚀 Implementation Phase</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '4px' }}>Coming Soon</div>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>GATE {currentGate} DECISION RULES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentGate === 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}><span>🟩</span><span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>5/5 Pass (≥80%): ADOPT</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: '6px' }}><span>🟧</span><span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: '600' }}>4/5 Pass: TEST</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}><span>🟥</span><span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '600' }}>≤3/5 Pass: REJECT</span></div>
            </>
          ) : currentGate === 1 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}><span>🟩</span><span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>Score ≥20: ADOPT → Gate 2</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: '6px' }}><span>🟧</span><span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: '600' }}>Score 15-19: TEST</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}><span>🟥</span><span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '600' }}>Score ≤14: REJECT</span></div>
            </>
          ) : currentGate === 2 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}><span>🟩</span><span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>All 4 Pass → Gate 3</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: '6px' }}><span>🟧</span><span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: '600' }}>Any Fail → Enablement</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}><span>🟥</span><span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '600' }}>Cannot Close → REJECT</span></div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}><span>🚀</span><span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600' }}>Implementation</span></div>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>PROJECT KNOWLEDGE (110)</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
          {[
            'AECOM 2025',
            'Arup 2024', 
            'CapitaLand Ascott 2023',
            'CDL 2025',
            'ESR-REIT 2024',
            'Frasers Property 2025',
            'Keppel REIT 2024',
            'Mitsubishi Estate 2024',
            'Obayashi Corp 2024',
            'Penta-Ocean 2025',
            'Taisei Corp 2025 (P1)',
            'Taisei Corp 2025 (P2)',
            'WSP Global 2024'
          ].map((pdf, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.55)', padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '3px' }}><span>📄</span><span>{pdf}</span></div>
          ))}
        </div>
      </div>
    </div>
  );

  // EVALUATE PAGE - Step 1 (Role selection for Value Capture Path, or direct questions for others)
  if (view === 'evaluate' && evalData) {
    const isRoleBased = evalData.criterionConfig && evalData.criterionConfig.type === 'role-based';
    
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <button onClick={() => { setView('chat'); setEvalData(null); setEvalAnswers({}); setSelectedRole(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ← Back to chat
            </button>
            
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', background: 'rgba(245,158,11,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔍</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>Evaluation Mode</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Give this initiative a second chance</p>
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>LOWEST SCORING CRITERION</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#F59E0B' }}>{evalData.lowestCriterion}</div>
              </div>
              
              {isRoleBased ? (
                <>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                    {evalData.criterionConfig.roleQuestion}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {evalData.criterionConfig.roles.map((role, i) => (
                      <button
                        key={i}
                        onClick={() => handleRoleSelect(role)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '20px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '2px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
                          e.currentTarget.style.borderColor = '#F59E0B';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                      >
                        <div style={{ width: '24px', height: '24px', border: '2px solid #F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: '12px', height: '12px', background: 'transparent', borderRadius: '50%' }}></div>
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{role}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                    Answer the following questions to determine if this initiative can be upgraded:
                  </div>
                  
                  {evalData.questions && evalData.questions.map((q, i) => (
                    <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: evalAnswers[q.id] !== undefined ? `2px solid ${evalAnswers[q.id] ? '#10B981' : '#EF4444'}` : '2px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ width: '28px', height: '28px', background: evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(245,158,11,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? '#10B981' : '#EF4444') : '#F59E0B', flexShrink: 0 }}>
                          {evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? '✓' : '✗') : (i + 1)}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
                            {q.text}
                            {q.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                          </p>
                          {!q.required && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>(Optional)</span>}
                        </div>
                      </div>
                      
                      {evalAnswers[q.id] === undefined ? (
                        <div style={{ display: 'flex', gap: '12px', marginLeft: '40px' }}>
                          <button onClick={() => handleEvalAnswer(q.id, true)} style={{ flex: 1, padding: '14px 24px', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', borderRadius: '10px', color: '#10B981', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            ✓ Yes
                          </button>
                          <button onClick={() => handleEvalAnswer(q.id, false)} style={{ flex: 1, padding: '14px 24px', background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444', borderRadius: '10px', color: '#EF4444', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            ✗ No
                          </button>
                        </div>
                      ) : (
                        <div style={{ marginLeft: '40px', padding: '12px 16px', background: evalAnswers[q.id] ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: evalAnswers[q.id] ? '#10B981' : '#EF4444' }}>
                          {evalAnswers[q.id] ? '✓ Yes' : '✗ No'}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '16px' }}>
                    <span style={{ color: '#EF4444' }}>*</span> Required questions must be "Yes" to proceed to adoption
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EVALUATE PAGE - Step 2 (Follow-up questions after role selection)
  if (view === 'evaluate-step2' && evalData && selectedRole) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <button onClick={() => { setView('evaluate'); setEvalAnswers({}); setSelectedRole(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ← Back to role selection
            </button>
            
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', background: 'rgba(245,158,11,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔍</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>Evaluation Mode</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Questions for {selectedRole}</p>
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>YOUR ROLE</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#F59E0B' }}>{selectedRole}</div>
              </div>
              
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
                Tick which is applicable to you:
              </div>
              
              {evalData.questions && evalData.questions.map((q, i) => (
                <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: evalAnswers[q.id] !== undefined ? `2px solid ${evalAnswers[q.id] ? '#10B981' : '#EF4444'}` : '2px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ width: '28px', height: '28px', background: evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(245,158,11,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? '#10B981' : '#EF4444') : '#F59E0B', flexShrink: 0 }}>
                      {evalAnswers[q.id] !== undefined ? (evalAnswers[q.id] ? '✓' : '✗') : (i + 1)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
                        {q.text}
                        {q.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                      </p>
                      {!q.required && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>(Optional - no weight)</span>}
                    </div>
                  </div>
                  
                  {evalAnswers[q.id] === undefined ? (
                    <div style={{ display: 'flex', gap: '12px', marginLeft: '40px' }}>
                      <button onClick={() => handleEvalAnswer(q.id, true)} style={{ flex: 1, padding: '14px 24px', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', borderRadius: '10px', color: '#10B981', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        ✓ Yes
                      </button>
                      <button onClick={() => handleEvalAnswer(q.id, false)} style={{ flex: 1, padding: '14px 24px', background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444', borderRadius: '10px', color: '#EF4444', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        ✗ No
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginLeft: '40px', padding: '12px 16px', background: evalAnswers[q.id] ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: evalAnswers[q.id] ? '#10B981' : '#EF4444' }}>
                      {evalAnswers[q.id] ? '✓ Yes' : '✗ No'}
                    </div>
                  )}
                </div>
              ))}
              
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '16px' }}>
                <span style={{ color: '#EF4444' }}>*</span> Required questions must be "Yes" to proceed to adoption
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== GATE 1 WIZARD ====================
  if (view === 'gate1-wizard') {
    const wizardSteps = [
      { num: 1, title: 'Setup', subtitle: 'Role & Project Context' },
      { num: 2, title: 'Baseline', subtitle: 'Current State Definition' },
      { num: 3, title: 'Evidence', subtitle: 'Validation Methods' },
      { num: 4, title: 'Performance', subtitle: 'Delta vs Baseline' },
      { num: 5, title: 'Monetisation', subtitle: 'Value Conversion' },
      { num: 6, title: 'Costs', subtitle: 'Incremental Expenses' },
      { num: 7, title: 'Thresholds', subtitle: 'Decision Rules' },
      { num: 8, title: 'Review', subtitle: 'Final Assessment' }
    ];

    const canProceed = () => {
      const { setup, baseline, evidence, delta, money, costs, decisionRule } = gate1Inputs;
      
      switch (gate1Step) {
        case 1:
          return setup.role && setup.projectType && setup.assetContext && setup.projectStage && setup.proposedAction.trim();
        case 2:
          return baseline.baselineAction.trim() && baseline.baselinePeriod && baseline.normalisationPossible;
        case 3:
          return evidence.methods.length > 0;
        case 4:
          return (delta.energyKwh || delta.waterM3 || delta.maintenanceCost || delta.downtimeAvoided || delta.scheduleWeeks || delta.rentUplift || delta.occupancyChange || delta.capRateChange);
        case 5:
          return money.valueCapturedBy.length > 0 && money.mechanism.length > 0;
        case 6:
          return costs.capex;
        case 7:
          return decisionRule.thresholdType;
        default:
          return true;
      }
    };

    const handleInputChange = (section, field, value) => {
      setGate1Inputs(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    };

    const handleNestedInputChange = (section, field, subfield, value) => {
      setGate1Inputs(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: {
            ...prev[section][field],
            [subfield]: value
          }
        }
      }));
    };

    const handleArrayToggle = (section, field, value) => {
      setGate1Inputs(prev => {
        const currentArray = prev[section][field] || [];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(v => v !== value)
          : [...currentArray, value];
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: newArray
          }
        };
      });
    };

    const calculateGate1Results = () => {
      const { setup, baseline, evidence, delta, money, costs, decisionRule } = gate1Inputs;
      
      // Parse numeric inputs
      const energyKwh = parseFloat(delta.energyKwh) || 0;
      const waterM3 = parseFloat(delta.waterM3) || 0;
      const maintenanceCost = parseFloat(delta.maintenanceCost) || 0;
      const downtimeAvoided = parseFloat(delta.downtimeAvoided) || 0;
      const scheduleWeeks = parseFloat(delta.scheduleWeeks) || 0;
      const rentUplift = parseFloat(delta.rentUplift) || 0;
      
      const spTariff = parseFloat(money.spTariff) || 0.25;
      const carbonPrice = parseFloat(money.carbonPrice) || 25;
      const waterTariff = 2.74; // PUB Singapore
      const carbonFactor = 0.4085; // kgCO2/kWh Singapore grid
      
      const capex = parseFloat(costs.capex) || 0;
      const oAndM = costs.oAndM.applicable === 'yes' ? (parseFloat(costs.oAndM.amount) || 0) : 0;
      const trainingIT = costs.trainingIT.applicable === 'yes' ? (parseFloat(costs.trainingIT.amount) || 0) : 0;
      const commissioningMV = costs.commissioningMV.applicable === 'yes' ? (parseFloat(costs.commissioningMV.amount) || 0) : 0;
      const adminReporting = costs.adminReporting.applicable === 'yes' ? (parseFloat(costs.adminReporting.amount) || 0) : 0;
      
      // Calculate annual benefits
      const annualEnergyBenefit = energyKwh * spTariff;
      const annualCarbonBenefit = (energyKwh * carbonFactor / 1000) * carbonPrice;
      const annualWaterBenefit = waterM3 * waterTariff;
      const annualMaintenanceBenefit = maintenanceCost;
      const annualOtherBenefit = downtimeAvoided + rentUplift;
      const totalAnnualBenefit = annualEnergyBenefit + annualCarbonBenefit + annualWaterBenefit + annualMaintenanceBenefit + annualOtherBenefit;
      
      // Calculate annual costs
      const totalAnnualCost = oAndM + (trainingIT / 5) + (commissioningMV / 5) + (adminReporting / 5);
      const netAnnualBenefit = totalAnnualBenefit - totalAnnualCost;
      
      // Calculate one-time costs
      const totalCapex = capex + trainingIT + commissioningMV + adminReporting;
      
      // Calculate financial metrics
      const analysisPeriod = parseInt(decisionRule.analysisPeriod) || 10;
      const wacc = parseFloat(decisionRule.wacc) || 8;
      
      // Simple payback
      const paybackYears = netAnnualBenefit > 0 ? totalCapex / netAnnualBenefit : 999;
      
      // NPV calculation
      let npv = -totalCapex;
      for (let year = 1; year <= analysisPeriod; year++) {
        npv += netAnnualBenefit / Math.pow(1 + wacc / 100, year);
      }
      
      // IRR calculation (Newton-Raphson approximation)
      let irr = 0;
      if (netAnnualBenefit > 0 && totalCapex > 0) {
        let guess = 0.1;
        for (let i = 0; i < 50; i++) {
          let npvGuess = -totalCapex;
          let derivGuess = 0;
          for (let year = 1; year <= analysisPeriod; year++) {
            npvGuess += netAnnualBenefit / Math.pow(1 + guess, year);
            derivGuess -= year * netAnnualBenefit / Math.pow(1 + guess, year + 1);
          }
          if (Math.abs(derivGuess) < 0.0001) break;
          guess = guess - npvGuess / derivGuess;
          if (guess < -0.99) guess = -0.99;
          if (guess > 10) guess = 10;
        }
        irr = guess * 100;
      }
      
      // Determine if meets threshold
      let meetsThreshold = false;
      let thresholdDelta = 0;
      let thresholdMetric = '';
      
      if (decisionRule.thresholdType === 'npv-wacc') {
        meetsThreshold = npv >= 0;
        thresholdDelta = npv;
        thresholdMetric = `NPV = S$${npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      } else if (decisionRule.thresholdType === 'irr') {
        const irrTarget = parseFloat(decisionRule.irrTarget) || 10;
        meetsThreshold = irr >= irrTarget;
        thresholdDelta = irr - irrTarget;
        thresholdMetric = `IRR = ${irr.toFixed(1)}% vs target ${irrTarget}%`;
      } else if (decisionRule.thresholdType === 'payback') {
        const paybackTarget = parseFloat(decisionRule.paybackYears) || 5;
        meetsThreshold = paybackYears <= paybackTarget;
        thresholdDelta = paybackTarget - paybackYears;
        thresholdMetric = `Payback = ${paybackYears.toFixed(1)} years vs target ${paybackTarget} years`;
      }
      
      // Check for near-miss (within allowed band)
      const nearMissBand = parseFloat(decisionRule.nearMissBand) || 5;
      const isNearMiss = !meetsThreshold && Math.abs(thresholdDelta) <= (Math.abs(thresholdDelta) * nearMissBand / 100);
      
      // Evaluate each step for scorecard
      const evaluateStep = (stepNum) => {
        let score = 3; // Default moderate
        let status = 'moderate';
        let finding = '';
        let evidenceList = [];
        let details = [];
        
        switch (stepNum) {
          case 1: // Baseline
            if (baseline.baselineAction && baseline.baselinePeriod === 'last-12-months' && baseline.normalisationPossible === 'yes') {
              score = 5; status = 'strong';
              finding = `The baseline is well-defined with ${baseline.baselinePeriod === 'last-12-months' ? '12 months of historical data' : 'a specified reference period'}. ${baseline.metricsAvailable.length > 3 ? 'Multiple baseline metrics are available including ' + baseline.metricsAvailable.slice(0, 3).join(', ') + ', providing a robust foundation for comparison.' : 'Key metrics are available for baseline comparison.'} ${baseline.normalisationPossible === 'yes' ? 'The baseline can be normalised for occupancy and weather variations, ensuring accurate performance comparison.' : ''}`;
            } else if (baseline.baselineAction && baseline.baselinePeriod) {
              score = 3; status = 'moderate';
              finding = `The baseline action has been defined but requires additional validation. ${baseline.baselinePeriod === 'na' ? 'No historical baseline period is available, which limits the ability to compare performance accurately.' : 'The baseline period and normalisation approach need to be confirmed.'} Consider documenting the current state more comprehensively before proceeding.`;
            } else {
              score = 2; status = 'weak';
              finding = 'The baseline definition is incomplete. Without a clear understanding of the current state and historical performance data, it will be difficult to measure the impact of the proposed action accurately.';
            }
            evidenceList = baseline.metricsAvailable.length > 0 
              ? [{ type: 'web', source: 'Building records & utility data' }]
              : [];
            details = baseline.metricsAvailable.map(m => {
              const labels = { bei: 'BEI/kWh available', water: 'Water m³ tracked', maintenance: 'Maintenance costs logged', downtime: 'Downtime/fault logs', rent: 'Rent/voids data', caprate: 'Cap-rate inputs', contract: 'Contract/lease terms' };
              return labels[m] || m;
            });
            break;
            
          case 2: // Model/Measure
            if (evidence.methods.length >= 2 && (evidence.existingEvidence.includes('model-outputs') || evidence.existingEvidence.includes('quotes'))) {
              score = 5; status = 'strong';
              finding = `The proposed action has been modelled using ${evidence.methods.length} validation methods: ${evidence.methods.map(m => {
                const labels = { 'bim-lcc': 'BIM+LCC analysis', 'green-mark': 'Green Mark calculators', 'simulation': 'energy simulation', 'bms-regression': 'BMS regression (IPMVP Option C)', 'mini-test': 'mini metered test', 'commercial-proof': 'commercial proof (LOI/memo)' };
                return labels[m] || m;
              }).join(', ')}. ${evidence.existingEvidence.length > 0 ? 'Existing evidence supports the projections.' : ''} This multi-method approach provides confidence in the performance differential.`;
            } else if (evidence.methods.length >= 1) {
              score = 3; status = 'moderate';
              finding = `Performance modelling is based on ${evidence.methods.length} method(s). While this provides initial validation, additional evidence or a secondary validation method would strengthen the business case. ${evidence.evidenceDetails || 'Consider obtaining vendor quotes or conducting a mini pilot test.'}`;
            } else {
              score = 2; status = 'weak';
              finding = 'No formal modelling or measurement method has been selected. The performance differential between the proposed action and baseline cannot be validated without appropriate evidence.';
            }
            evidenceList = evidence.methods.map(m => {
              const labels = { 'bim-lcc': 'BIM+LCC Model', 'green-mark': 'BCA Green Mark', 'simulation': 'Energy Simulation', 'bms-regression': 'IPMVP Option C', 'mini-test': 'Metered Test', 'commercial-proof': 'LOI/Memo' };
              return { type: 'web', source: labels[m] || m };
            });
            details = evidence.existingEvidence.map(e => {
              const labels = { quotes: 'Vendor quotes available', trends: 'Historical trends analysed', 'model-outputs': 'Model outputs generated', lois: 'LOIs obtained', none: 'No existing evidence' };
              return labels[e] || e;
            });
            break;
            
          case 3: // Monetary conversion
            if (totalAnnualBenefit > 0 && money.mechanism.length > 0 && money.valueCapturedBy.length > 0) {
              const benefitRatio = totalAnnualBenefit / (totalCapex || 1);
              if (benefitRatio > 0.15) {
                score = 5; status = 'strong';
                finding = `The monetary value is clearly quantified at S$${totalAnnualBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })} per year in total benefits. Value capture is achieved through ${money.mechanism.map(m => {
                  const labels = { 'green-lease': 'green lease provisions', 'service-charge': 'service charge recovery', 'gainshare': 'gainshare arrangements', 'fee-model': 'fee model adjustments', 'direct-savings': 'direct operational savings', 'other': money.mechanismOther };
                  return labels[m] || m;
                }).join(', ')} with ${money.valueCapturedBy.join(', ')} as the beneficiar${money.valueCapturedBy.length > 1 ? 'ies' : 'y'}. This represents a strong return profile.`;
              } else {
                score = 3; status = 'moderate';
                finding = `Annual benefits of S$${totalAnnualBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })} have been identified, but the return ratio relative to investment is modest. The value capture mechanism through ${money.mechanism[0]} is defined, though additional value streams may be needed to strengthen the business case.`;
              }
            } else {
              score = 2; status = 'weak';
              finding = 'The monetary value conversion is incomplete or shows limited financial benefit. Without clear quantification of benefits and a defined value capture mechanism, the business case lacks financial justification.';
            }
            evidenceList = [{ type: 'web', source: `SP Group Tariffs (S$${spTariff}/kWh)` }];
            if (carbonPrice > 0) evidenceList.push({ type: 'web', source: `Carbon Tax (S$${carbonPrice}/tCO2)` });
            details = [
              `Energy savings: S$${annualEnergyBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`,
              `Carbon value: S$${annualCarbonBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`,
              `Water savings: S$${annualWaterBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`,
              `Other benefits: S$${(annualMaintenanceBenefit + annualOtherBenefit).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`
            ].filter(d => !d.includes('S$0'));
            break;
            
          case 4: // Costs
            if (capex > 0 && (costs.oAndM.applicable || costs.commissioningMV.applicable)) {
              const costCompleteness = [costs.oAndM.applicable, costs.trainingIT.applicable, costs.commissioningMV.applicable, costs.adminReporting.applicable].filter(a => a !== null).length;
              if (costCompleteness >= 3) {
                score = 4; status = 'strong';
                finding = `Total costs are comprehensively documented. CAPEX of S$${capex.toLocaleString(undefined, { maximumFractionDigits: 0 })} covers the initial investment, with annual operating costs of S$${totalAnnualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} including maintenance, training, and ongoing M&V. All major cost categories have been considered, providing a complete picture of the total cost of ownership.`;
              } else {
                score = 3; status = 'moderate';
                finding = `CAPEX of S$${capex.toLocaleString(undefined, { maximumFractionDigits: 0 })} has been identified, but not all cost categories have been fully specified. Consider validating O&M costs, commissioning requirements, and ongoing admin/reporting expenses to ensure no cost overruns.`;
              }
            } else {
              score = 2; status = 'weak';
              finding = 'Cost documentation is incomplete. Without a clear understanding of both capital and operating expenses, the financial analysis may underestimate the true investment required.';
            }
            evidenceList = [{ type: 'web', source: 'Cost estimates/quotes' }];
            details = [
              `CAPEX: S$${capex.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `Annual O&M: S$${oAndM.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `Training/IT: S$${trainingIT.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `M&V/Commissioning: S$${commissioningMV.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            ];
            break;
            
          case 5: // Financing
            // This is optional and can only boost score
            const hasFinancing = money.mechanism.includes('green-lease') || money.mechanism.includes('gainshare');
            if (hasFinancing) {
              score = 5; status = 'strong';
              finding = 'Financing pathways have been identified that can improve project economics. Green financing mechanisms, grants, or performance-based contracts can reduce upfront capital requirements or shift risk to third parties, making the investment more attractive.';
            } else {
              score = 3; status = 'moderate';
              finding = 'Standard financing is assumed. While this is acceptable, exploring green loans, government grants, or performance-based contracts could potentially improve the business case through reduced interest rates or co-funding.';
            }
            evidenceList = [{ type: 'web', source: 'Financing options' }];
            details = ['Standard financing available', 'Green loan potential to explore', 'Grant eligibility to confirm'];
            break;
            
          default:
            break;
        }
        
        return { step: stepNum, name: getStepName(stepNum), status, hiddenScore: score, finding, evidence: evidenceList, details };
      };
      
      const getStepName = (num) => {
        const names = {
          1: 'Define the Baseline Action',
          2: 'Model / Measure Proposed vs Baseline',
          3: 'Convert to Monetary Value',
          4: 'Account for All Costs',
          5: 'Apply Financing Pathway'
        };
        return names[num] || '';
      };
      
      // Generate step results
      const steps = [1, 2, 3, 4, 5].map(evaluateStep);
      const totalHiddenScore = steps.reduce((sum, s) => sum + s.hiddenScore, 0);
      
      // Determine decision
      let decision = 'REJECT';
      let answer = '';
      
      if (meetsThreshold && totalHiddenScore >= 18) {
        decision = 'ADOPT';
        answer = `Yes, adopt this initiative. The ${setup.proposedAction} presents a compelling business case that meets the ${decisionRule.thresholdType === 'npv-wacc' ? 'NPV' : decisionRule.thresholdType === 'irr' ? 'IRR' : 'payback'} threshold (${thresholdMetric}). The baseline is clearly defined, performance projections are validated through ${evidence.methods.length} method(s), and value capture is achievable through ${money.mechanism[0]}. Total CAPEX of S$${totalCapex.toLocaleString(undefined, { maximumFractionDigits: 0 })} is justified by net annual benefits of S$${netAnnualBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}. This initiative is ready to proceed to Gate 2 for commercial lock-in.`;
      } else if (isNearMiss || (totalHiddenScore >= 14 && totalHiddenScore < 18)) {
        decision = 'RE-TEST';
        const weakSteps = steps.filter(s => s.hiddenScore <= 3);
        answer = `Re-test recommended. The initiative shows promise but has ${weakSteps.length} area(s) requiring additional validation: ${weakSteps.map(s => s.name.toLowerCase()).join(', ')}. The current analysis ${meetsThreshold ? 'meets' : 'narrowly misses'} the threshold (${thresholdMetric}) but carries uncertainty that can be resolved through targeted investigation within 2-4 quarters.`;
      } else {
        decision = 'REJECT';
        const weakSteps = steps.filter(s => s.hiddenScore <= 3);
        answer = `This initiative does not pass the Gate 1 business case test. The analysis shows ${thresholdMetric}, which ${meetsThreshold ? 'meets' : 'does not meet'} the required threshold. Key concerns include: ${weakSteps.map(s => s.name.toLowerCase()).join(', ')}. The current evidence does not support proceeding with this investment. Consider revisiting the fundamental assumptions or exploring alternative approaches.`;
      }
      
      // Store calculations
      setGate1Calculations({
        annualEnergyBenefit,
        annualCarbonBenefit,
        annualWaterBenefit,
        annualMaintenanceBenefit,
        annualOtherBenefit,
        totalAnnualBenefit,
        totalAnnualCost,
        netAnnualBenefit,
        totalCapex,
        npv,
        irr,
        paybackYears,
        meetsThreshold,
        thresholdDelta,
        thresholdMetric
      });
      
      // Set results
      setGate1Results({
        initiative: userQuestion || setup.proposedAction,
        answer,
        steps,
        totalHiddenScore,
        decision,
        inputs: gate1Inputs,
        calculations: {
          totalAnnualBenefit,
          totalAnnualCost,
          netAnnualBenefit,
          totalCapex,
          npv,
          irr,
          paybackYears,
          thresholdMetric
        }
      });
      
      // Move to results view
      setView('gate1-test');
    };

    const renderWizardStep = () => {
      const { setup, baseline, evidence, delta, money, costs, decisionRule } = gate1Inputs;
      
      const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' };
      const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' };
      const subLabelStyle = { display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' };
      const selectButtonStyle = (selected) => ({
        padding: '12px 16px',
        background: selected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
        border: selected ? '2px solid #A78BFA' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        color: selected ? '#A78BFA' : 'rgba(255,255,255,0.7)',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease'
      });
      const checkboxStyle = (checked) => ({
        padding: '10px 14px',
        background: checked ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
        border: checked ? '1px solid #A78BFA' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: checked ? '#A78BFA' : 'rgba(255,255,255,0.6)',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer'
      });

      switch (gate1Step) {
        case 1: // Setup
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>A1. What is your role?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'developer', label: 'Developer / Owner-Operator', desc: 'NPV/IRR focused' },
                    { value: 'fm-reit', label: 'FM / REIT', desc: 'Payback focused' },
                    { value: 'contractor', label: 'Contractor', desc: 'Gainshare/LD focused' },
                    { value: 'consultant', label: 'Consultant / Designer', desc: 'Fee protection focused' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('setup', 'role', opt.value)} style={selectButtonStyle(setup.role === opt.value)}>
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A2. Project type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'new-build', label: 'New Build' },
                    { value: 'retrofit-major', label: 'Retrofit (Major)' },
                    { value: 'retrofit-minor', label: 'Retrofit (Minor)' },
                    { value: 'ops-optimisation', label: 'Ops Optimisation' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('setup', 'projectType', opt.value)} style={selectButtonStyle(setup.projectType === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A3. Asset context</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'tenanted', label: 'Tenanted' },
                    { value: 'owner-occupied', label: 'Owner-Occupied' },
                    { value: 'mixed', label: 'Mixed' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('setup', 'assetContext', opt.value)} style={selectButtonStyle(setup.assetContext === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A4. Project stage</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {[
                    { value: 'concept', label: 'Concept' },
                    { value: 'design', label: 'Design' },
                    { value: 'tender', label: 'Tender' },
                    { value: 'construction', label: 'Construction' },
                    { value: 'operations', label: 'Operations' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('setup', 'projectStage', opt.value)} style={selectButtonStyle(setup.projectStage === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A5. Proposed Action <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={subLabelStyle}>Describe the sustainability initiative you want to evaluate (1-2 sentences)</span>
                <textarea
                  value={setup.proposedAction}
                  onChange={(e) => handleInputChange('setup', 'proposedAction', e.target.value)}
                  placeholder="e.g., Install 200kWp rooftop solar PV system on Building A to reduce grid electricity consumption"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Scope boundary</label>
                <span style={subLabelStyle}>What systems or zones does this affect?</span>
                <input
                  type="text"
                  value={setup.scopeBoundary}
                  onChange={(e) => handleInputChange('setup', 'scopeBoundary', e.target.value)}
                  placeholder="e.g., Rooftop, common area electricity, Building A only"
                  style={inputStyle}
                />
              </div>
            </div>
          );

        case 2: // Baseline
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>B1. Baseline Action <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={subLabelStyle}>What is the default / typical action (baseline action) if the proposed action is not implemented?</span>
                <textarea
                  value={baseline.baselineAction}
                  onChange={(e) => handleInputChange('baseline', 'baselineAction', e.target.value)}
                  placeholder="e.g., Continue purchasing 100% grid electricity at SP Group tariff rates; no on-site renewable generation"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>B2. Baseline period</label>
                <span style={subLabelStyle}>Baseline period is the time window used to represent "normal performance before any changes," so the Proposed Action can be compared fairly against what is happening today.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {[
                    { value: 'last-12-months', label: 'Last 12 months (existing building / already operating)', desc: 'Use the most recent 12 months of data to represent normal operations, so the baseline includes seasonal changes and typical occupancy patterns.' },
                    { value: 'other', label: 'Other period (existing building / already operating)', desc: 'Use a different time window if the last 12 months are not representative (e.g., renovation works, unusual shutdowns, abnormal occupancy, missing data), and specify the stable period instead.' },
                    { value: 'na', label: 'N/A (new building / no history)', desc: 'Select N/A if the building has no operating history yet—there is no "before" data, so the baseline must be based on design assumptions or benchmark values instead.' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('baseline', 'baselinePeriod', opt.value)} style={{ ...selectButtonStyle(baseline.baselinePeriod === opt.value), textAlign: 'left', padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', lineHeight: '1.4' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {baseline.baselinePeriod === 'other' && (
                  <input
                    type="text"
                    value={baseline.baselinePeriodOther}
                    onChange={(e) => handleInputChange('baseline', 'baselinePeriodOther', e.target.value)}
                    placeholder="Specify baseline period (e.g., Jan-Dec 2023)"
                    style={{ ...inputStyle, marginTop: '12px' }}
                  />
                )}
              </div>

              <div>
                <label style={labelStyle}>B3. Baseline metrics available</label>
                <span style={subLabelStyle}>Select all that apply</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { value: 'bei', label: 'BEI / kWh' },
                    { value: 'water', label: 'Water m³' },
                    { value: 'maintenance', label: 'Maintenance Cost' },
                    { value: 'downtime', label: 'Downtime / Fault Logs' },
                    { value: 'rent', label: 'Rent / Voids' },
                    { value: 'caprate', label: 'Cap-rate / Valuation' },
                    { value: 'contract', label: 'Contract / Lease Terms' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleArrayToggle('baseline', 'metricsAvailable', opt.value)} style={checkboxStyle(baseline.metricsAvailable.includes(opt.value))}>
                      {baseline.metricsAvailable.includes(opt.value) ? '✓ ' : ''}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>B4. Can baseline be normalised for occupancy/weather?</label>
                <span style={subLabelStyle}>Can your baseline data be adjusted so changes in occupancy or weather don't distort the comparison with the Proposed Action.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {[
                    { value: 'yes', label: 'Yes', desc: 'I can adjust the baseline (e.g., using occupancy and weather data).' },
                    { value: 'no', label: 'No', desc: 'I cannot adjust for occupancy/weather.' },
                    { value: 'na', label: 'N/A', desc: 'Select if occupancy/weather adjustment isn\'t relevant because the Proposed Action doesn\'t affect operational performance or there is no usable data to normalise.' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('baseline', 'normalisationPossible', opt.value)} style={{ ...selectButtonStyle(baseline.normalisationPossible === opt.value), textAlign: 'left', padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', lineHeight: '1.4' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {baseline.normalisationPossible === 'yes' && (
                  <input
                    type="text"
                    value={baseline.normalisationMethod}
                    onChange={(e) => handleInputChange('baseline', 'normalisationMethod', e.target.value)}
                    placeholder="How? (e.g., CDD/HDD adjustment, occupancy sensors, BMS data)"
                    style={{ ...inputStyle, marginTop: '12px' }}
                  />
                )}
              </div>
            </div>
          );

        case 3: // Evidence
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>C1. Evidence methods <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={subLabelStyle}>Select up to 2 methods to validate performance</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'bim-lcc', label: 'A. BIM + Life Cycle Cost', desc: 'Digital model with LCC analysis' },
                    { value: 'green-mark', label: 'B. Green Mark Calculators', desc: 'BCA official tools' },
                    { value: 'simulation', label: 'C. Energy Simulation', desc: 'IES-VE, DesignBuilder, etc.' },
                    { value: 'bms-regression', label: 'D. BMS Regression (IPMVP C)', desc: 'Statistical analysis of BMS data' },
                    { value: 'mini-test', label: 'E. Mini Metered Test ≤14 days', desc: 'Short-term measurement' },
                    { value: 'commercial-proof', label: 'F. Commercial Proof', desc: 'LOI, tenant memo, market data' }
                  ].map(opt => (
                    <button 
                      key={opt.value} 
                      onClick={() => handleArrayToggle('evidence', 'methods', opt.value)} 
                      style={{
                        ...selectButtonStyle(evidence.methods.includes(opt.value)),
                        opacity: evidence.methods.length >= 2 && !evidence.methods.includes(opt.value) ? 0.5 : 1
                      }}
                      disabled={evidence.methods.length >= 2 && !evidence.methods.includes(opt.value)}
                    >
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>C2. What evidence do you already have?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { value: 'quotes', label: 'Vendor Quotes' },
                    { value: 'trends', label: 'Historical Trends' },
                    { value: 'model-outputs', label: 'Model Outputs' },
                    { value: 'lois', label: 'LOIs / Commitments' },
                    { value: 'none', label: 'None Yet' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleArrayToggle('evidence', 'existingEvidence', opt.value)} style={checkboxStyle(evidence.existingEvidence.includes(opt.value))}>
                      {evidence.existingEvidence.includes(opt.value) ? '✓ ' : ''}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Evidence details</label>
                <textarea
                  value={evidence.evidenceDetails}
                  onChange={(e) => handleInputChange('evidence', 'evidenceDetails', e.target.value)}
                  placeholder={evidence.existingEvidence.includes('none') ? "No evidence yet - this field is disabled" : "Describe the evidence you have (e.g., quote from SolarGy for S$1.35/Wp, IES-VE model showing 15% energy reduction)"}
                  disabled={evidence.existingEvidence.includes('none')}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', opacity: evidence.existingEvidence.includes('none') ? 0.5 : 1, cursor: evidence.existingEvidence.includes('none') ? 'not-allowed' : 'text' }}
                />
              </div>
            </div>
          );

        case 4: // Delta
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  Enter the estimated annual improvements from the proposed action vs baseline. Type "NA" if not applicable.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Energy savings (kWh/year)</label>
                  <input
                    type="number"
                    value={delta.energyKwh}
                    onChange={(e) => handleInputChange('delta', 'energyKwh', e.target.value)}
                    placeholder="e.g., 240000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Water savings (m³/year)</label>
                  <input
                    type="number"
                    value={delta.waterM3}
                    onChange={(e) => handleInputChange('delta', 'waterM3', e.target.value)}
                    placeholder="e.g., 500"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Maintenance cost reduction (S$/year)</label>
                  <input
                    type="number"
                    value={delta.maintenanceCost}
                    onChange={(e) => handleInputChange('delta', 'maintenanceCost', e.target.value)}
                    placeholder="e.g., 5000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Downtime avoided (S$/year)</label>
                  <input
                    type="number"
                    value={delta.downtimeAvoided}
                    onChange={(e) => handleInputChange('delta', 'downtimeAvoided', e.target.value)}
                    placeholder="e.g., 10000"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Schedule weeks saved</label>
                  <input
                    type="number"
                    value={delta.scheduleWeeks}
                    onChange={(e) => handleInputChange('delta', 'scheduleWeeks', e.target.value)}
                    placeholder="e.g., 2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Rent uplift (S$/year)</label>
                  <input
                    type="number"
                    value={delta.rentUplift}
                    onChange={(e) => handleInputChange('delta', 'rentUplift', e.target.value)}
                    placeholder="e.g., 20000"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>D2. Do you have a downside case or confidence interval?</label>
                <span style={subLabelStyle}>
                  This asks whether you've checked a "worst-case" result or a statistical uncertainty range, so your business case isn't based only on a best-case estimate.
                  <br /><br />
                  <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Downside case:</strong> A conservative scenario, like 20% lower savings or 20% higher cost.
                  <br />
                  <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Confidence interval:</strong> A range that shows uncertainty (e.g., savings likely between X and Y).
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {[
                    { value: 'yes', label: 'Yes', desc: 'I have either a downside scenario (e.g., lower savings / higher costs) or a confidence interval from data analysis.' },
                    { value: 'no', label: 'No', desc: 'I only have a single estimate or none at all available.' },
                    { value: 'na', label: 'N/A', desc: 'This isn\'t applicable because the result is not based on variable performance data (e.g., purely fixed CAPEX pricing with no savings claim), or the method used does not produce statistical intervals.' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('delta', 'hasDownsideCase', opt.value)} style={{ ...selectButtonStyle(delta.hasDownsideCase === opt.value), textAlign: 'left', padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', lineHeight: '1.4' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {delta.hasDownsideCase === 'yes' && (
                  <input
                    type="text"
                    value={delta.downsideRange}
                    onChange={(e) => handleInputChange('delta', 'downsideRange', e.target.value)}
                    placeholder="e.g., ±15% on energy savings, ±20% on CAPEX"
                    style={{ ...inputStyle, marginTop: '12px' }}
                  />
                )}
              </div>
            </div>
          );

        case 5: // Money
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>SP Group tariff (S$/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={money.spTariff}
                    onChange={(e) => handleInputChange('money', 'spTariff', e.target.value)}
                    placeholder="0.25"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Carbon price (S$/tCO2)</label>
                  <input
                    type="number"
                    value={money.carbonPrice}
                    onChange={(e) => handleInputChange('money', 'carbonPrice', e.target.value)}
                    placeholder="25"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Rent benchmark (S$/sqft/month)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={money.rentBenchmark}
                    onChange={(e) => handleInputChange('money', 'rentBenchmark', e.target.value)}
                    placeholder="e.g., 8.50"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LD rates (S$/day)</label>
                  <input
                    type="number"
                    value={money.ldRates}
                    onChange={(e) => handleInputChange('money', 'ldRates', e.target.value)}
                    placeholder="e.g., 5000"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>E2. Who captures the value? <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={subLabelStyle}>Select all that apply</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {[
                    { value: 'owner', label: 'Owner' },
                    { value: 'tenant', label: 'Tenant' },
                    { value: 'client', label: 'Client' },
                    { value: 'contractor', label: 'Contractor' },
                    { value: 'consultant', label: 'Consultant' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleArrayToggle('money', 'valueCapturedBy', opt.value)} style={checkboxStyle(money.valueCapturedBy.includes(opt.value))}>
                      {money.valueCapturedBy.includes(opt.value) ? '✓ ' : ''}{opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Value capture mechanism <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { value: 'green-lease', label: 'Green Lease' },
                    { value: 'service-charge', label: 'Service Charge' },
                    { value: 'gainshare', label: 'Gainshare' },
                    { value: 'fee-model', label: 'Fee Model' },
                    { value: 'direct-savings', label: 'Direct Savings' },
                    { value: 'other', label: 'Other' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleArrayToggle('money', 'mechanism', opt.value)} style={checkboxStyle(money.mechanism.includes(opt.value))}>
                      {money.mechanism.includes(opt.value) ? '✓ ' : ''}{opt.label}
                    </button>
                  ))}
                </div>
                {money.mechanism.includes('other') && (
                  <input
                    type="text"
                    value={money.mechanismOther}
                    onChange={(e) => handleInputChange('money', 'mechanismOther', e.target.value)}
                    placeholder="Describe the mechanism"
                    style={{ ...inputStyle, marginTop: '12px' }}
                  />
                )}
              </div>
            </div>
          );

        case 6: // Costs
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>F1. Incremental CAPEX (S$) <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={subLabelStyle}>Total upfront capital cost above baseline</span>
                <input
                  type="number"
                  value={costs.capex}
                  onChange={(e) => handleInputChange('costs', 'capex', e.target.value)}
                  placeholder="e.g., 300000"
                  style={inputStyle}
                />
              </div>

              {[
                { key: 'oAndM', label: 'F2. Incremental O&M (S$/year)', placeholder: 'e.g., 5000 or -5000 for savings', helperText: 'Any ongoing yearly operating/maintenance cost change compared to the baseline (can be extra cost or extra savings).' },
                { key: 'trainingIT', label: 'F3. Training / IT / Integration (S$)', placeholder: 'e.g., 10000', helperText: 'One-off costs to enable people/systems to use the action (training, software, sensors, integration, and cybersecurity work).' },
                { key: 'commissioningMV', label: 'F4. Commissioning + M&V (S$)', placeholder: 'e.g., 15000', helperText: 'Costs to test/verify the system works and to measure performance so savings/benefits are provable.' },
                { key: 'adminReporting', label: 'F5. Admin / Reporting / Certification (S$)', placeholder: 'e.g., 5000', helperText: 'Extra time and fees for documentation, reporting, assurance, or certifications tied to the action.' }
              ].map(item => (
                <div key={item.key}>
                  <label style={labelStyle}>{item.label}</label>
                  <span style={subLabelStyle}>{item.helperText}</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                        { value: 'na', label: 'N/A' }
                      ].map(opt => (
                        <button 
                          key={opt.value} 
                          onClick={() => {
                            handleNestedInputChange('costs', item.key, 'applicable', opt.value);
                            if (opt.value === 'no') {
                              handleNestedInputChange('costs', item.key, 'amount', '0');
                            } else if (opt.value === 'na') {
                              handleNestedInputChange('costs', item.key, 'amount', '');
                            }
                          }} 
                          style={{
                            ...selectButtonStyle(costs[item.key].applicable === opt.value),
                            padding: '8px 16px'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={costs[item.key].amount}
                      onChange={(e) => handleNestedInputChange('costs', item.key, 'amount', e.target.value)}
                      placeholder={costs[item.key].applicable === 'na' ? 'N/A' : item.placeholder}
                      disabled={costs[item.key].applicable === 'na'}
                      style={{ 
                        ...inputStyle, 
                        flex: 1, 
                        opacity: costs[item.key].applicable === 'na' ? 0.5 : 1,
                        cursor: costs[item.key].applicable === 'na' ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Use negative for savings (e.g., -5000)</div>
                </div>
              ))}
            </div>
          );

        case 7: // Decision Rule
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>G1. Decision threshold type <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'npv-wacc', label: 'NPV @ WACC', desc: 'Net Present Value ≥ 0' },
                    { value: 'irr', label: 'IRR', desc: 'Internal Rate of Return ≥ target' },
                    { value: 'payback', label: 'Payback Period', desc: 'Years to recover investment' },
                    { value: 'gainshare', label: 'Gainshare vs At-Risk', desc: 'For contractors' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('decisionRule', 'thresholdType', opt.value)} style={selectButtonStyle(decisionRule.thresholdType === opt.value)}>
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {decisionRule.thresholdType === 'npv-wacc' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>WACC (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={decisionRule.wacc}
                      onChange={(e) => handleInputChange('decisionRule', 'wacc', e.target.value)}
                      placeholder="e.g., 8"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Analysis period (years)</label>
                    <input
                      type="number"
                      value={decisionRule.analysisPeriod}
                      onChange={(e) => handleInputChange('decisionRule', 'analysisPeriod', e.target.value)}
                      placeholder="e.g., 10"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {decisionRule.thresholdType === 'irr' && (
                <div>
                  <label style={labelStyle}>Target IRR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={decisionRule.irrTarget}
                    onChange={(e) => handleInputChange('decisionRule', 'irrTarget', e.target.value)}
                    placeholder="e.g., 12"
                    style={inputStyle}
                  />
                </div>
              )}

              {decisionRule.thresholdType === 'payback' && (
                <div>
                  <label style={labelStyle}>Maximum payback period (years)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={decisionRule.paybackYears}
                    onChange={(e) => handleInputChange('decisionRule', 'paybackYears', e.target.value)}
                    placeholder="e.g., 5"
                    style={inputStyle}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>G3. Near-miss band (%)</label>
                  <span style={subLabelStyle}>This is the maximum percentage you're willing to miss the financial threshold by and still consider a Re-Test instead of rejecting. For example: If the threshold is Payback ≤ 5 years and the near-miss band is 5%, then a result up to 5.25 years can still be treated as "near miss" (eligible for Re-Test).</span>
                  <input
                    type="number"
                    value={decisionRule.nearMissBand}
                    onChange={(e) => handleInputChange('decisionRule', 'nearMissBand', e.target.value)}
                    placeholder="e.g., 5"
                    style={{ ...inputStyle, marginTop: '8px' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>G4. RE-TEST cost cap (%)</label>
                  <span style={subLabelStyle}>This is the maximum you're willing to spend on a Re-Test, expressed as a % of the projected first-year benefit. For example: If the projected first-year benefit is S$100,000 and the cost cap is 10%, then the Re-Test budget should be ≤ S$10,000.</span>
                  <input
                    type="number"
                    value={decisionRule.reTestCap}
                    onChange={(e) => handleInputChange('decisionRule', 'reTestCap', e.target.value)}
                    placeholder="e.g., 10"
                    style={{ ...inputStyle, marginTop: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>G5. Time-box requirement</label>
                <span style={subLabelStyle}>Must be resolvable within 2-4 quarters?</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' }
                  ].map(opt => (
                    <button key={opt.value} onClick={() => handleInputChange('decisionRule', 'timeBoxRequired', opt.value)} style={selectButtonStyle(decisionRule.timeBoxRequired === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );

        case 8: // Review
          const { setup: s, baseline: b, evidence: ev, delta: d, money: m, costs: c, decisionRule: dr } = gate1Inputs;
          
          // Calculate preview values
          const energyKwh = parseFloat(d.energyKwh) || 0;
          const waterM3 = parseFloat(d.waterM3) || 0;
          const spTariff = parseFloat(m.spTariff) || 0.25;
          const carbonPrice = parseFloat(m.carbonPrice) || 25;
          const capex = parseFloat(c.capex) || 0;
          const oAndM = c.oAndM.applicable === 'yes' ? (parseFloat(c.oAndM.amount) || 0) : 0;
          
          const annualEnergyBenefit = energyKwh * spTariff;
          const annualCarbonBenefit = (energyKwh * 0.4085 / 1000) * carbonPrice;
          const annualWaterBenefit = waterM3 * 2.74;
          const totalAnnualBenefit = annualEnergyBenefit + annualCarbonBenefit + annualWaterBenefit + (parseFloat(d.maintenanceCost) || 0) + (parseFloat(d.downtimeAvoided) || 0) + (parseFloat(d.rentUplift) || 0);
          const netAnnualBenefit = totalAnnualBenefit - oAndM;
          const simplePayback = netAnnualBenefit > 0 ? capex / netAnnualBenefit : 0;
          
          const SummaryRow = ({ label, value, highlight }) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{label}</span>
              <span style={{ color: highlight ? '#A78BFA' : 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: highlight ? '600' : '400' }}>{value}</span>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>PROPOSED ACTION</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#A78BFA' }}>"{s.proposedAction || userQuestion}"</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>SETUP</div>
                  <SummaryRow label="Role" value={s.role?.replace('-', ' / ') || 'Not specified'} />
                  <SummaryRow label="Project Type" value={s.projectType?.replace(/-/g, ' ') || 'Not specified'} />
                  <SummaryRow label="Asset Context" value={s.assetContext?.replace(/-/g, ' ') || 'Not specified'} />
                  <SummaryRow label="Stage" value={s.projectStage || 'Not specified'} />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>BASELINE</div>
                  <SummaryRow label="Period" value={b.baselinePeriod === 'last-12-months' ? 'Last 12 months' : b.baselinePeriod === 'other' ? b.baselinePeriodOther : 'N/A'} />
                  <SummaryRow label="Metrics" value={`${b.metricsAvailable.length} available`} />
                  <SummaryRow label="Normalisation" value={b.normalisationPossible === 'yes' ? 'Yes' : b.normalisationPossible === 'no' ? 'No' : 'N/A'} />
                </div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>FINANCIAL PREVIEW</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>S${totalAnnualBenefit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Annual Benefit</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>S${capex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Total CAPEX</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#A78BFA' }}>{simplePayback > 0 ? simplePayback.toFixed(1) : '-'} yrs</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Simple Payback</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>DECISION CRITERIA</div>
                <SummaryRow label="Threshold Type" value={dr.thresholdType?.replace(/-/g, ' ').toUpperCase() || 'Not specified'} highlight />
                {dr.thresholdType === 'npv-wacc' && <SummaryRow label="WACC" value={`${dr.wacc || 8}%`} />}
                {dr.thresholdType === 'irr' && <SummaryRow label="Target IRR" value={`${dr.irrTarget || 10}%`} />}
                {dr.thresholdType === 'payback' && <SummaryRow label="Max Payback" value={`${dr.paybackYears || 5} years`} />}
                <SummaryRow label="Near-Miss Band" value={`±${dr.nearMissBand || 5}%`} />
              </div>

              <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                  ⚠️ Please review all inputs before proceeding. The system will calculate NPV, IRR, and payback based on your inputs and determine the Gate 1 decision (Adopt / Re-Test / Reject).
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#A78BFA' }}>Gate 1: Business Case Test</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step {gate1Step} of 8: {wizardSteps[gate1Step - 1]?.title}</p>
            </div>
            <button onClick={() => { setView('chat'); setGate1Step(1); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          {/* Progress Steps */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              {wizardSteps.map((step, i) => (
                <div 
                  key={step.num}
                  onClick={() => { if (step.num < gate1Step) { setGate1Step(step.num); resetScroll(); } }}
                  style={{ 
                    flex: 1, 
                    padding: '10px 8px', 
                    background: gate1Step === step.num ? 'rgba(139,92,246,0.2)' : gate1Step > step.num ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: gate1Step === step.num ? '1px solid #A78BFA' : '1px solid transparent',
                    cursor: step.num < gate1Step ? 'pointer' : 'default',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: gate1Step === step.num ? '#A78BFA' : gate1Step > step.num ? '#10B981' : 'rgba(255,255,255,0.4)' }}>
                    {gate1Step > step.num ? '✓' : step.num}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{step.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Previous Gate Summary */}
            {gateSummaries.gate0 && (
              <SummaryCard summary={gateSummaries.gate0} />
            )}

            {/* Step Content */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                {wizardSteps[gate1Step - 1]?.title}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                {wizardSteps[gate1Step - 1]?.subtitle}
              </div>
              
              {renderWizardStep()}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="wizard-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => { if (gate1Step > 1) { setGate1Step(gate1Step - 1); resetScroll(); } }}
              disabled={gate1Step === 1}
              style={{
                padding: '12px 24px',
                background: gate1Step === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: gate1Step === 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: gate1Step === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>

            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Step {gate1Step} of 8
            </div>

            {gate1Step < 8 ? (
              <button
                onClick={() => { if (canProceed()) { setGate1Step(gate1Step + 1); resetScroll(); } }}
                disabled={!canProceed()}
                style={{
                  padding: '12px 24px',
                  background: canProceed() ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)' : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  borderRadius: '8px',
                  color: canProceed() ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  boxShadow: canProceed() ? '0 4px 15px rgba(139,92,246,0.3)' : 'none'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => { calculateGate1Results(); resetScroll(); }}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🧪 Run Business Case Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GATE 1 TEST RESULTS PAGE
  if (view === 'gate1-test' && gate1Results) {
    const getStatusColor = (status) => {
      if (status === 'strong' || status === 'improved') return { color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
      if (status === 'moderate') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
      return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    };

    const getDecisionStyle = () => {
      if (gate1Results.decision === 'ADOPT') return { color: '#10B981', bg: 'rgba(16,185,129,0.15)', emoji: '🟩' };
      if (gate1Results.decision === 'RE-TEST') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', emoji: '🟧' };
      return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', emoji: '🟥' };
    };

    const decisionStyle = getDecisionStyle();

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#A78BFA' }}>Gate 1: Business Case Test</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Proposed Action Test Results</p>
            </div>
            <button onClick={() => { setView('chat'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Previous Gate Summary Card */}
            {gateSummaries.gate0 && (
              <SummaryCard summary={gateSummaries.gate0} />
            )}
            
            {/* Initiative Being Tested */}
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>INITIATIVE BEING TESTED</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#A78BFA' }}>"{gate1Results.initiative}"</div>
              {gate1Results.retestApplied && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', fontSize: '12px', color: '#10B981' }}>
                  ✓ Additional Data Gathered: {gate1Results.retestApplied}
                </div>
              )}
            </div>

            {/* Answer Summary */}
            {gate1Results.answer && (
              <div style={{ background: decisionStyle.bg, border: `1px solid ${decisionStyle.color}50`, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>ASSESSMENT SUMMARY</div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: decisionStyle.color, lineHeight: '1.6' }}>{gate1Results.answer}</p>
              </div>
            )}

            {/* Test Steps Scorecard */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>PROPOSED ACTION TEST SCORECARD</div>
              
              {gate1Results.steps.map((step, i) => {
                const statusStyle = getStatusColor(step.status);
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '16px', marginBottom: '12px', borderLeft: `4px solid ${statusStyle.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '28px', height: '28px', background: statusStyle.bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: statusStyle.color }}>{step.step}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{step.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            {step.status === 'improved' ? '✓ IMPROVED' : step.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: statusStyle.bg, color: statusStyle.color }}>
                        {step.status === 'strong' || step.status === 'improved' ? 'PASS' : step.status === 'moderate' ? 'REVIEW' : 'WEAK'}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', marginBottom: '12px', paddingLeft: '40px' }}>
                      {step.finding}
                    </div>
                    
                    <div style={{ paddingLeft: '40px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        {step.evidence.map((e, j) => (
                          <span key={j} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: e.type === 'pdf' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: e.type === 'pdf' ? '#10B981' : '#3B82F6' }}>
                            {e.type === 'pdf' ? '📄' : '🌐'} {e.source}{e.page ? `, p.${e.page}` : ''}
                          </span>
                        ))}
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {step.details.map((d, k) => (
                          <span key={k} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                            • {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary - Only show if calculations exist */}
            {gate1Results.calculations && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>FINANCIAL ANALYSIS</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                      S${(gate1Results.calculations.totalAnnualBenefit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Annual Benefit</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>
                      S${(gate1Results.calculations.totalCapex || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Total CAPEX</div>
                  </div>
                  <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#A78BFA' }}>
                      {gate1Results.calculations.paybackYears > 0 && gate1Results.calculations.paybackYears < 100 
                        ? `${gate1Results.calculations.paybackYears.toFixed(1)} yrs` 
                        : 'N/A'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Payback Period</div>
                  </div>
                  <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3B82F6' }}>
                      {gate1Results.calculations.npv >= 0 ? '+' : ''}S${(gate1Results.calculations.npv || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>NPV</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>BENEFIT BREAKDOWN</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'Energy savings', value: gate1Results.calculations.totalAnnualBenefit * 0.6 },
                        { label: 'Carbon value', value: gate1Results.calculations.totalAnnualBenefit * 0.1 },
                        { label: 'Other benefits', value: gate1Results.calculations.totalAnnualBenefit * 0.3 }
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>S${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>THRESHOLD RESULT</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: gate1Results.calculations.npv >= 0 ? '#10B981' : '#EF4444', marginBottom: '4px' }}>
                      {gate1Results.calculations.thresholdMetric || `NPV = S$${(gate1Results.calculations.npv || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {gate1Results.calculations.npv >= 0 
                        ? '✓ Meets investment threshold' 
                        : '✗ Below investment threshold'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Section */}
            <div style={{ background: decisionStyle.bg, border: `2px solid ${decisionStyle.color}`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>GATE 1 DECISION</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: decisionStyle.color }}>{decisionStyle.emoji} {gate1Results.decision}</div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {gate1Results.decision === 'ADOPT' && (
                    <button
                      onClick={() => {
                        // Generate summary for Gate 1
                        const summary = generateGateSummary(1, {
                          question: userQuestion,
                          scorecard: scorecardData,
                          gate1Data: {
                            results: gate1Results,
                            wasRetest: hasRetested,
                            retestData: hasRetested ? {
                              confirmedCount: Object.values(retestAnswers).filter(a => a === true).length
                            } : null
                          }
                        });
                        
                        if (summary) {
                          setGateSummaries(prev => ({
                            ...prev,
                            gate1: summary
                          }));
                          
                          // Add summary message to chat
                          setMessages(prev => [...prev, {
                            id: Date.now(),
                            type: 'bot',
                            content: { type: 'summary', summary: summary },
                            isText: false
                          }]);
                        }
                        
                        setCurrentGate(2);
                        setView('chat');
                        resetScroll();
                      }}
                      style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}
                    >
                      Proceed to Gate 2 →
                    </button>
                  )}
                  
                  {gate1Results.decision === 'RE-TEST' && !hasRetested && (
                    <button
                      onClick={() => { setView('gate1-retest'); resetScroll(); }}
                      style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,158,11,0.4)' }}
                    >
                      🔄 Gather More Data
                    </button>
                  )}
                  
                  {gate1Results.decision === 'REJECT' && (
                    <button
                      onClick={() => { setView('chat'); clearChat(); resetScroll(); }}
                      style={{ padding: '14px 32px', background: 'rgba(239,68,68,0.2)', border: '2px solid #EF4444', borderRadius: '10px', color: '#EF4444', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Start New Evaluation
                    </button>
                  )}
                </div>
              </div>
              
              {gate1Results.decision === 'REJECT' && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>REJECTION SUMMARY:</div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                    This initiative did not pass the Gate 1 business case test due to weaknesses in {gate1Results.steps.filter(s => s.hiddenScore <= 3).length} of the 5 evaluation criteria. 
                    The key areas of concern are: {gate1Results.steps.filter(s => s.hiddenScore <= 3).map(s => s.name.toLowerCase()).join(', ')}. 
                    The analysis indicates that without addressing these fundamental gaps—particularly around establishing clear baselines, validating performance projections, and strengthening the financial justification—the initiative carries too much risk and uncertainty to proceed. 
                    We recommend revisiting the business case with more detailed feasibility studies, obtaining formal quotations, and exploring alternative financing mechanisms before re-submitting for evaluation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GATE 1 RE-TEST QUESTIONS PAGE
  if (view === 'gate1-retest' && gate1Results) {
    const questions = generateRetestQuestions(gate1Results.steps.filter(s => s.hiddenScore <= 3), gate1Results.initiative);
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#F59E0B' }}>Gather More Data</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Answer these questions to strengthen the business case</p>
            </div>
            <button onClick={() => { setView('gate1-test'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Results</button>
          </div>
          
          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Previous Gate Summary Card */}
            {gateSummaries.gate0 && (
              <SummaryCard summary={gateSummaries.gate0} />
            )}
            
            {/* Initiative Context */}
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>INITIATIVE BEING RE-TESTED</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#F59E0B', marginBottom: '12px' }}>"{gate1Results.initiative}"</div>
              
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', marginTop: '16px' }}>AREAS REQUIRING MORE DATA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {gate1Results.steps.filter(s => s.hiddenScore <= 3).map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Instructions */}
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                <strong style={{ color: '#3B82F6' }}>How this works:</strong> The following questions help us understand what additional data or capabilities your organization has that could strengthen this business case. Answering "Yes" to more questions increases the likelihood of the initiative being upgraded to ADOPT status. This is a one-time re-test opportunity.
              </p>
            </div>
            
            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, i) => (
                <div key={q.id} style={{ background: q.isWeakArea ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: retestAnswers[q.id] !== undefined ? `2px solid ${retestAnswers[q.id] ? '#10B981' : '#EF4444'}` : q.isWeakArea ? '2px solid rgba(239,68,68,0.3)' : '2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ width: '28px', height: '28px', background: retestAnswers[q.id] !== undefined ? (retestAnswers[q.id] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : q.isWeakArea ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: retestAnswers[q.id] !== undefined ? (retestAnswers[q.id] ? '#10B981' : '#EF4444') : q.isWeakArea ? '#EF4444' : '#F59E0B', flexShrink: 0 }}>
                      {retestAnswers[q.id] !== undefined ? (retestAnswers[q.id] ? '✓' : '✗') : (i + 1)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>{q.text}</p>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>{q.helpText}</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>📊 {q.relatedStep}</span>
                        {q.isWeakArea && (
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: '600' }}>⚠️ Weak Area - Critical</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {retestAnswers[q.id] === undefined ? (
                    <div style={{ display: 'flex', gap: '12px', marginLeft: '40px' }}>
                      <button onClick={() => handleRetestAnswer(q.id, true)} style={{ flex: 1, padding: '12px 20px', background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981', borderRadius: '10px', color: '#10B981', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        ✓ Yes
                      </button>
                      <button onClick={() => handleRetestAnswer(q.id, false)} style={{ flex: 1, padding: '12px 20px', background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444', borderRadius: '10px', color: '#EF4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        ✗ No
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginLeft: '40px', padding: '10px 16px', background: retestAnswers[q.id] ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: retestAnswers[q.id] ? '#10B981' : '#EF4444' }}>
                      {retestAnswers[q.id] ? '✓ Yes - Data available' : '✗ No - Data not available'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Progress indicator */}
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Questions Answered: {Object.keys(retestAnswers).length} of 5
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ width: '40px', height: '6px', borderRadius: '3px', background: Object.keys(retestAnswers).length >= n ? (Object.values(retestAnswers)[n-1] ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                More "Yes" answers = Higher chance of upgrading to ADOPT
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== GATE 2 WIZARD ====================
  if (view === 'gate2-wizard') {
    const wizardSteps = [
      { num: 0, title: 'Carry-over', subtitle: 'Confirm Gate 1 Details' },
      { num: 1, title: 'Value-Capture', subtitle: 'Enabler 1 (B1-B5)' },
      { num: 2, title: 'Financing', subtitle: 'Enabler 2 (B6-B10)' },
      { num: 3, title: 'Data & Integrations', subtitle: 'Enabler 3 (B11-B15)' },
      { num: 4, title: 'Delivery Risk', subtitle: 'Enabler 4 (B16-B20)' },
      { num: 5, title: 'Results', subtitle: 'Enabler Summary' },
      { num: 6, title: 'Enablement', subtitle: 'Close Gaps' },
      { num: 7, title: 'Economics', subtitle: 'Step 3 Clarity' }
    ];

    const currentStepInfo = wizardSteps.find(s => s.num === gate2Step) || wizardSteps[0];
    
    const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' };
    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' };
    const selectButtonStyle = (selected) => ({
      padding: '12px 16px',
      background: selected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)',
      border: selected ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: selected ? '#3B82F6' : 'rgba(255,255,255,0.7)',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'left'
    });

    const renderQuestionCard = (question) => {
      const answer = gate2EnablerAnswers[question.id];
      const evidence = gate2EnablerAnswers[`${question.id}_evidence`];
      const blocker = gate2EnablerAnswers[`${question.id}_blocker`];
      
      return (
        <div key={question.id} style={{ 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '16px',
          border: answer === 'yes' || answer === 'na' ? '2px solid rgba(16,185,129,0.5)' : answer === 'no' ? '2px solid rgba(239,68,68,0.5)' : '2px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{ 
              width: '32px', height: '32px', 
              background: answer === 'yes' || answer === 'na' ? 'rgba(16,185,129,0.2)' : answer === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', 
              borderRadius: '8px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '11px', fontWeight: '700', 
              color: answer === 'yes' || answer === 'na' ? '#10B981' : answer === 'no' ? '#EF4444' : '#3B82F6',
              flexShrink: 0 
            }}>
              {question.id}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>{question.text}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{question.subtext}</div>
              {question.helperText && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  {question.helperText}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: answer ? '12px' : '0' }}>
            <button 
              onClick={() => handleGate2QuestionAnswer(question.id, 'yes')} 
              style={{ flex: 1, padding: '10px', background: answer === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              ✓ Yes
            </button>
            <button 
              onClick={() => handleGate2QuestionAnswer(question.id, 'no')} 
              style={{ flex: 1, padding: '10px', background: answer === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              ✗ No
            </button>
            {question.naAllowed && (
              <button 
                onClick={() => handleGate2QuestionAnswer(question.id, 'na')} 
                style={{ flex: 1, padding: '10px', background: answer === 'na' ? 'rgba(156,163,175,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'na' ? '2px solid #9CA3AF' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'na' ? '#9CA3AF' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                N/A
              </button>
            )}
          </div>
          
          {answer === 'yes' && (
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Evidence type:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {evidenceTypes.map(e => (
                  <button key={e.value} onClick={() => handleGate2Evidence(question.id, e.value)} style={{ padding: '6px 12px', background: evidence === e.value ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)', border: evidence === e.value ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: evidence === e.value ? '#10B981' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {answer === 'no' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Describe the blocker:</div>
              <input type="text" value={blocker || ''} onChange={(e) => handleGate2Blocker(question.id, e.target.value)} placeholder="e.g., Tenant has not agreed to green lease terms" style={{ ...inputStyle, background: 'rgba(0,0,0,0.2)' }} />
            </div>
          )}
          
          {answer === 'na' && question.naReason && (
            <div style={{ background: 'rgba(156,163,175,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}><strong>NA Reason:</strong> {question.naReason}</div>
            </div>
          )}
        </div>
      );
    };

    const renderWizardContent = () => {
      switch (gate2Step) {
        case 0:
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Confirm the details carried over from Gate 1. This ensures Gate 2 evaluation uses the correct context.
                </div>
              </div>

              <div>
                <label style={labelStyle}>A1. Your Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ value: 'developer', label: 'Developer / Owner-Operator' }, { value: 'fm-reit', label: 'FM / REIT' }, { value: 'contractor', label: 'Contractor' }, { value: 'consultant', label: 'Consultant / Designer' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate2Carryover(prev => ({ ...prev, role: opt.value }))} style={selectButtonStyle(gate2Carryover.role === opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A2. Proposed Action</label>
                <textarea value={gate2Carryover.proposedAction || userQuestion || ''} onChange={(e) => setGate2Carryover(prev => ({ ...prev, proposedAction: e.target.value }))} placeholder="e.g., Install 200kWp rooftop solar PV system" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
              </div>

              <div>
                <label style={labelStyle}>Intended Boundary</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ value: 'whole-asset', label: 'Whole Asset' }, { value: 'building', label: 'Specific Building' }, { value: 'floors', label: 'Specific Floors/Zones' }, { value: 'pilot', label: 'Pilot Boundary' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate2Carryover(prev => ({ ...prev, boundary: opt.value }))} style={selectButtonStyle(gate2Carryover.boundary === opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>A3. Who Pays?</label>
                  <input type="text" value={gate2Carryover.whoPays} onChange={(e) => setGate2Carryover(prev => ({ ...prev, whoPays: e.target.value }))} placeholder="e.g., Building Owner" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Who Benefits?</label>
                  <input type="text" value={gate2Carryover.whoBenefits} onChange={(e) => setGate2Carryover(prev => ({ ...prev, whoBenefits: e.target.value }))} placeholder="e.g., Owner + Tenants" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>A4. Gate-1 Decision Metric</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[{ value: 'npv-wacc', label: 'NPV @ WACC' }, { value: 'irr', label: 'IRR' }, { value: 'payback', label: 'Payback' }, { value: 'gainshare', label: 'Gainshare' }, { value: 'fee-protection', label: 'Fee Protection' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate2Carryover(prev => ({ ...prev, gate1Metric: opt.value }))} style={selectButtonStyle(gate2Carryover.gate1Metric === opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A5. Gate-1 Result</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[{ value: 'above', label: '✓ Above Threshold', color: '#10B981' }, { value: 'borderline', label: '~ Borderline', color: '#F59E0B' }, { value: 'below', label: '✗ Below Threshold', color: '#EF4444' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate2Carryover(prev => ({ ...prev, gate1Result: opt.value }))} style={{ ...selectButtonStyle(gate2Carryover.gate1Result === opt.value), borderColor: gate2Carryover.gate1Result === opt.value ? opt.color : 'rgba(255,255,255,0.15)', color: gate2Carryover.gate1Result === opt.value ? opt.color : 'rgba(255,255,255,0.7)' }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
          );

        case 1: case 2: case 3: case 4:
          const enablerKey = `enabler${gate2Step}`;
          const enabler = gate2Questions[enablerKey];
          
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '16px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px' }}>
                <span style={{ fontSize: '32px' }}>{enabler.icon}</span>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#3B82F6' }}>{enabler.name}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{enabler.description}</div>
                </div>
              </div>
              {enabler.questions.map(q => renderQuestionCard(q))}
              <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>📋 ENABLEMENT PLAYBOOK</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {enabler.playbook.map((item, i) => (<div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>→ {item}</div>))}
                </div>
              </div>
            </div>
          );

        case 5:
          const e1Status = calculateEnablerStatus('enabler1');
          const e2Status = calculateEnablerStatus('enabler2');
          const e3Status = calculateEnablerStatus('enabler3');
          const e4Status = calculateEnablerStatus('enabler4');
          const allPass = e1Status === 'pass' && e2Status === 'pass' && e3Status === 'pass' && e4Status === 'pass';
          const getStatusStyle = (status) => {
            if (status === 'pass') return { color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '✓' };
            if (status === 'fail') return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: '✗' };
            return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '?' };
          };

          return (
            <div>
              <div style={{ padding: '20px', background: allPass ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', border: `2px solid ${allPass ? '#10B981' : '#F59E0B'}`, borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>{allPass ? '✅' : '⚠️'}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: allPass ? '#10B981' : '#F59E0B' }}>{allPass ? 'All Enablers Locked!' : 'Enablement Actions Required'}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>{allPass ? 'Proceed to Step 3: Economics Clarity' : 'Some enablers have gaps that need to be closed'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[{ key: 'enabler1', name: 'Value-Capture', status: e1Status }, { key: 'enabler2', name: 'Financing', status: e2Status }, { key: 'enabler3', name: 'Data & Integrations', status: e3Status }, { key: 'enabler4', name: 'Delivery Risk', status: e4Status }].map((e) => {
                  const style = getStatusStyle(e.status);
                  const failedQs = getFailedQuestions(e.key);
                  return (
                    <div key={e.key} style={{ background: style.bg, borderRadius: '12px', padding: '16px', border: `1px solid ${style.color}50` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{gate2Questions[e.key].icon} {e.name}</div>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: style.bg, color: style.color }}>{style.icon} {e.status.toUpperCase()}</span>
                      </div>
                      {failedQs.length > 0 && (<div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}><div style={{ fontWeight: '600', marginBottom: '4px' }}>Failed:</div>{failedQs.map(q => (<div key={q.id} style={{ marginLeft: '8px' }}>• {q.id}</div>))}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          );

        case 6:
          return (
            <div>
              <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#F59E0B', marginBottom: '8px' }}>⚠️ Enablement Actions Required</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Complete the form below for each gap. These are NOT performance tests - they close commercial/contractual gaps.</div>
              </div>

              {gate2EnablementActions.map((action, idx) => (
                <div key={action.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '2px solid rgba(245,158,11,0.3)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', marginBottom: '4px' }}>ENABLEMENT ACTION {idx + 1}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>{action.enablerName} - {action.questionId}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>D2. Gap Statement</label>
                      <input type="text" value={action.gapStatement} onChange={(e) => updateEnablementAction(action.id, 'gapStatement', e.target.value)} placeholder="Describe the gap in 1 sentence" style={inputStyle} />
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>D3. Closure Method</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {closureMethods.map(m => (
                          <button key={m.value} onClick={() => updateEnablementAction(action.id, 'closureMethod', m.value)} style={{ padding: '8px 14px', background: action.closureMethod === m.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: action.closureMethod === m.value ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: action.closureMethod === m.value ? '#3B82F6' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>{m.label}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>D4. Acceptance Criteria</label>
                      <input type="text" value={action.acceptanceCriteria} onChange={(e) => updateEnablementAction(action.id, 'acceptanceCriteria', e.target.value)} placeholder="e.g., Signed addendum with clause ID" style={inputStyle} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>D5. Owner</label>
                        <input type="text" value={action.owner} onChange={(e) => updateEnablementAction(action.id, 'owner', e.target.value)} placeholder="Named person/role" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>D6. Deadline</label>
                        <input type="text" value={action.deadline} onChange={(e) => updateEnablementAction(action.id, 'deadline', e.target.value)} placeholder="e.g., 30 days" style={inputStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>D8. Can this be closed in time? *</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => updateEnablementAction(action.id, 'canClose', 'yes')} style={{ flex: 1, padding: '12px', background: action.canClose === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: action.canClose === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: action.canClose === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes - Credible</button>
                        <button onClick={() => updateEnablementAction(action.id, 'canClose', 'no')} style={{ flex: 1, padding: '12px', background: action.canClose === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: action.canClose === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: action.canClose === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>✗ No - Not Credible</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!enablementActionsCredible() && (
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#EF4444' }}>⚠️ Cannot Proceed</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>One or more enablement actions are not credible. The initiative will be REJECTED at Gate 2.</div>
                </div>
              )}
            </div>
          );

        case 7:
          const economics = calculateGate2Economics();
          return (
            <div>
              <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>✅ All 4 Enablers Locked</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Now update the Gate-1 economics with Gate-2 contract/financing terms.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>E1. What changed due to Gate 2 lock-in?</label>
                  <textarea value={gate2EconomicsClarity.whatChanged} onChange={(e) => setGate2EconomicsClarity(prev => ({ ...prev, whatChanged: e.target.value }))} placeholder="e.g., Green lease recovery adds $10k/yr, financing at 3.5% vs 5% assumed" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>E2. Updated Benefits (S$/yr)</label>
                    <input type="number" value={gate2EconomicsClarity.updatedBenefits} onChange={(e) => setGate2EconomicsClarity(prev => ({ ...prev, updatedBenefits: e.target.value }))} placeholder="Additional annual benefits" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Additional Costs (S$/yr)</label>
                    <input type="number" value={gate2EconomicsClarity.updatedCosts} onChange={(e) => setGate2EconomicsClarity(prev => ({ ...prev, updatedCosts: e.target.value }))} placeholder="Additional annual costs" style={inputStyle} />
                  </div>
                </div>

                {gate1Results?.calculations && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>GATE 1 → GATE 2 COMPARISON</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Gate 1 NPV</div><div style={{ fontSize: '20px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>S${(economics.originalNPV || 0).toLocaleString()}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Gate 2 Updated NPV</div><div style={{ fontSize: '20px', fontWeight: '700', color: economics.updatedNPV >= 0 ? '#10B981' : '#EF4444' }}>S${(economics.updatedNPV || 0).toLocaleString()}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Change</div><div style={{ fontSize: '20px', fontWeight: '700', color: economics.improvement >= 0 ? '#10B981' : '#EF4444' }}>{economics.improvement >= 0 ? '+' : ''}{economics.improvement}%</div></div>
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>E3. Does updated case meet threshold?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setGate2EconomicsClarity(prev => ({ ...prev, meetsThreshold: 'yes' }))} style={{ flex: 1, padding: '14px', background: gate2EconomicsClarity.meetsThreshold === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate2EconomicsClarity.meetsThreshold === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate2EconomicsClarity.meetsThreshold === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes - Above Threshold</button>
                    <button onClick={() => setGate2EconomicsClarity(prev => ({ ...prev, meetsThreshold: 'no' }))} style={{ flex: 1, padding: '14px', background: gate2EconomicsClarity.meetsThreshold === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate2EconomicsClarity.meetsThreshold === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate2EconomicsClarity.meetsThreshold === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>✗ No - Below Threshold</button>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    const canProceedGate2 = () => {
      switch (gate2Step) {
        case 0: return gate2Carryover.role && gate2Carryover.proposedAction && gate2Carryover.boundary && gate2Carryover.whoPays && gate2Carryover.gate1Metric;
        case 1: case 2: case 3: case 4:
          const enablerKey = `enabler${gate2Step}`;
          return gate2Questions[enablerKey].questions.every(q => gate2EnablerAnswers[q.id] !== null && gate2EnablerAnswers[q.id] !== undefined);
        case 5: return true;
        case 6: return gate2EnablementActions.every(a => a.canClose !== null);
        case 7: return gate2EconomicsClarity.meetsThreshold !== null;
        default: return true;
      }
    };

    const handleGate2Next = () => {
      if (gate2Step === 4) {
        if (allEnablersPass()) {
          setGate2Step(7);
        } else {
          const failed = getFailedEnablers();
          const actions = [];
          failed.forEach(enablerKey => {
            const failedQs = getFailedQuestions(enablerKey);
            failedQs.forEach(q => {
              actions.push({ id: `EA_${Date.now()}_${q.id}`, enablerKey, enablerName: gate2Questions[enablerKey].name, questionId: q.id, questionText: q.text, gapStatement: gate2EnablerAnswers[`${q.id}_blocker`] || '', closureMethod: null, acceptanceCriteria: '', owner: '', deadline: '', canClose: null });
            });
          });
          setGate2EnablementActions(actions);
          setGate2Step(5);
        }
      } else if (gate2Step === 5) {
        if (gate2EnablementActions.length > 0) { setGate2Step(6); } else { setGate2Step(7); }
      } else if (gate2Step === 6) {
        if (enablementActionsCredible()) { setGate2Step(7); } else { setGate2Decision('reject'); }
      } else if (gate2Step === 7) {
        if (gate2EconomicsClarity.meetsThreshold === 'yes') { setGate2Decision('adopt'); proceedToGate3(); } else { setGate2Decision('reject'); }
      } else {
        setGate2Step(gate2Step + 1);
      }
    };

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#3B82F6' }}>Gate 2: Commercial & Contractual Lock-In</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>{currentStepInfo.title} - {currentStepInfo.subtitle}</p>
            </div>
            <button onClick={() => { setView('chat'); setGate2Step(0); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
              {wizardSteps.map((step) => (
                <div key={step.num} onClick={() => { if (step.num < gate2Step) { setGate2Step(step.num); resetScroll(); } }} style={{ padding: '8px 12px', background: gate2Step === step.num ? 'rgba(59,130,246,0.2)' : gate2Step > step.num ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '6px', border: gate2Step === step.num ? '1px solid #3B82F6' : '1px solid transparent', textAlign: 'center', minWidth: '80px', cursor: step.num < gate2Step ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: gate2Step === step.num ? '#3B82F6' : gate2Step > step.num ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{gate2Step > step.num ? '✓' : step.num}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{step.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {gateSummaries.gate0 && <SummaryCard summary={gateSummaries.gate0} />}
            {gateSummaries.gate1 && <SummaryCard summary={gateSummaries.gate1} />}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '24px' }}>{renderWizardContent()}</div>
            
            {gate2Decision === 'reject' && (
              <div style={{ marginTop: '24px', padding: '24px', background: 'rgba(239,68,68,0.15)', border: '2px solid #EF4444', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🟥</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#EF4444' }}>REJECTED</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{gate2Step === 6 ? 'Enablement actions are not credible.' : 'Economics below threshold.'}</div>
                <button onClick={clearChat} style={{ marginTop: '20px', padding: '14px 32px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Start New Evaluation</button>
              </div>
            )}
          </div>

          {gate2Decision !== 'reject' && gate2Decision !== 'adopt' && (
            <div className="wizard-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { if (gate2Step > 0) { setGate2Step(gate2Step - 1); resetScroll(); } }} disabled={gate2Step === 0} style={{ padding: '12px 24px', background: gate2Step === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate2Step === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: gate2Step === 0 ? 'not-allowed' : 'pointer' }}>← Previous</button>
              <button onClick={() => { handleGate2Next(); resetScroll(); }} disabled={!canProceedGate2()} style={{ padding: '12px 24px', background: canProceedGate2() ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '8px', color: canProceedGate2() ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: '600', cursor: canProceedGate2() ? 'pointer' : 'not-allowed', boxShadow: canProceedGate2() ? '0 4px 15px rgba(59,130,246,0.3)' : 'none' }}>{gate2Step === 7 && gate2EconomicsClarity.meetsThreshold === 'yes' ? 'Proceed to Gate 3 →' : 'Next →'}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== GATE 3 WIZARD ====================
  if (view === 'gate3-wizard') {
    const wizardSteps = [
      { num: 0, title: 'Carry-over', subtitle: 'Confirm Gate 2' },
      { num: 1, title: 'Route', subtitle: 'IPMVP or KPI' },
      { num: 2, title: 'Phase 1', subtitle: 'Mobilise' },
      { num: 3, title: 'Phase 2', subtitle: 'Build' },
      { num: 4, title: 'Phase 3', subtitle: 'Commission' },
      { num: 5, title: 'Phase 4', subtitle: 'Evidence' },
      { num: 6, title: 'Phase 5', subtitle: 'Settlement' },
      { num: 7, title: 'Dashboard', subtitle: 'Summary' }
    ];

    const currentStepInfo = wizardSteps.find(s => s.num === gate3Step) || wizardSteps[0];
    
    const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px' };
    const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' };
    const subLabelStyle = { display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', lineHeight: '1.5' };
    const selectButtonStyle = (selected) => ({
      padding: '12px 16px',
      background: selected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
      border: selected ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: selected ? '#8B5CF6' : 'rgba(255,255,255,0.7)',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'left'
    });

    // Render phase question card
    const renderPhaseQuestionCard = (question, phase) => {
      const phaseData = { phase1: gate3Phase1, phase2: gate3Phase2, phase3: gate3Phase3, phase4: gate3Phase4, phase5: gate3Phase5 }[phase];
      const answer = phaseData[question.id];
      const evidence = phaseData[`${question.id}_evidence`];
      const naReason = phaseData[`${question.id}_naReason`];
      
      return (
        <div key={question.id} style={{ 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '16px',
          border: answer === 'yes' ? '2px solid rgba(16,185,129,0.5)' : answer === 'no' ? '2px solid rgba(239,68,68,0.5)' : answer === 'na' ? '2px solid rgba(156,163,175,0.5)' : '2px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{ 
              width: '36px', height: '36px', 
              background: answer === 'yes' ? 'rgba(16,185,129,0.2)' : answer === 'no' ? 'rgba(239,68,68,0.2)' : answer === 'na' ? 'rgba(156,163,175,0.2)' : 'rgba(139,92,246,0.2)', 
              borderRadius: '8px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '10px', fontWeight: '700', 
              color: answer === 'yes' ? '#10B981' : answer === 'no' ? '#EF4444' : answer === 'na' ? '#9CA3AF' : '#8B5CF6',
              flexShrink: 0 
            }}>
              {question.id.replace('_', '.')}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>{question.text}</div>
              {question.helperText && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{question.helperText}</div>}
              {question.evidenceTypes && (
                <div style={{ fontSize: '10px', color: 'rgba(139,92,246,0.8)', marginTop: '4px' }}>
                  <strong>Evidence:</strong> {question.evidenceTypes.join(', ')}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: answer ? '12px' : '0' }}>
            <button 
              onClick={() => handleGate3PhaseAnswer(phase, question.id, 'yes')} 
              style={{ flex: 1, padding: '10px', background: answer === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              ✓ Yes
            </button>
            <button 
              onClick={() => handleGate3PhaseAnswer(phase, question.id, 'no')} 
              style={{ flex: 1, padding: '10px', background: answer === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              ✗ No
            </button>
            {question.naAllowed && (
              <button 
                onClick={() => handleGate3PhaseAnswer(phase, question.id, 'na')} 
                style={{ flex: 1, padding: '10px', background: answer === 'na' ? 'rgba(156,163,175,0.2)' : 'rgba(255,255,255,0.05)', border: answer === 'na' ? '2px solid #9CA3AF' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: answer === 'na' ? '#9CA3AF' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                N/A
              </button>
            )}
          </div>
          
          {answer === 'yes' && (
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Evidence (required):</div>
              <input 
                type="text" 
                value={evidence || ''} 
                onChange={(e) => handleGate3Evidence(phase, question.id, e.target.value)} 
                placeholder="Describe evidence or provide document reference..."
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.2)' }} 
              />
            </div>
          )}
          
          {answer === 'na' && (
            <div style={{ background: 'rgba(156,163,175,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Justification for N/A (required):</div>
              {question.naReason && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontStyle: 'italic' }}>Suggested: {question.naReason}</div>}
              <input 
                type="text" 
                value={naReason || ''} 
                onChange={(e) => handleGate3NaReason(phase, question.id, e.target.value)} 
                placeholder="Explain why this is not applicable..."
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.2)' }} 
              />
            </div>
          )}
          
          {answer === 'no' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#EF4444' }}>⚠️ This item is blocking phase completion</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Address this issue before proceeding to the next phase.</div>
            </div>
          )}
        </div>
      );
    };

    // Render phase status badge
    const getPhaseStatusBadge = (phase) => {
      const status = calculatePhaseStatus(phase);
      const styles = {
        'not-started': { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', text: 'Not Started' },
        'in-progress': { bg: 'rgba(59,130,246,0.2)', color: '#3B82F6', text: 'In Progress' },
        'complete': { bg: 'rgba(16,185,129,0.2)', color: '#10B981', text: 'Complete' },
        'blocked': { bg: 'rgba(239,68,68,0.2)', color: '#EF4444', text: 'Blocked' }
      };
      const s = styles[status];
      return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', background: s.bg, color: s.color }}>{s.text}</span>;
    };

    const renderWizardContent = () => {
      switch (gate3Step) {
        case 0: // Carry-over from Gate 2
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Confirm details from Gate 2 before starting delivery. Gate 3 can only proceed if all enablers are locked and funds are released.
                </div>
              </div>

              <div>
                <label style={labelStyle}>A1. Your Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ value: 'developer', label: 'Developer / Owner-Operator' }, { value: 'fm-reit', label: 'FM / REIT' }, { value: 'contractor', label: 'Contractor' }, { value: 'consultant', label: 'Consultant / Designer' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate3Carryover(prev => ({ ...prev, role: opt.value }))} style={selectButtonStyle(gate3Carryover.role === opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A2. Proposed Action + Boundary</label>
                <textarea value={gate3Carryover.proposedAction || userQuestion || ''} onChange={(e) => setGate3Carryover(prev => ({ ...prev, proposedAction: e.target.value }))} placeholder="e.g., Install 200kWp rooftop solar PV system" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  {[{ value: 'whole-asset', label: 'Whole Asset' }, { value: 'building', label: 'Specific Building' }, { value: 'floors', label: 'Floors/Zones' }, { value: 'pilot', label: 'Pilot Boundary' }].map(opt => (
                    <button key={opt.value} onClick={() => setGate3Carryover(prev => ({ ...prev, boundary: opt.value }))} style={selectButtonStyle(gate3Carryover.boundary === opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>A3. Gate 2 Mechanism(s) Selected</label>
                <span style={subLabelStyle}>Select all that apply from Gate 2</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {gate2Mechanisms.map(m => {
                    const isSelected = gate3Carryover.mechanisms.includes(m.value);
                    return (
                      <button key={m.value} onClick={() => setGate3Carryover(prev => ({ ...prev, mechanisms: isSelected ? prev.mechanisms.filter(x => x !== m.value) : [...prev.mechanisms, m.value] }))} style={{ ...selectButtonStyle(isSelected), padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600' }}>{isSelected ? '✓ ' : ''}{m.label}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', marginBottom: '12px' }}>⚠️ ENTRY REQUIREMENTS (Both must be Yes)</div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>A4. Are all 4 Gate 2 enablers locked for this boundary?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setGate3Carryover(prev => ({ ...prev, allEnablersLocked: 'yes' }))} style={{ flex: 1, padding: '12px', background: gate3Carryover.allEnablersLocked === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Carryover.allEnablersLocked === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Carryover.allEnablersLocked === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                    <button onClick={() => setGate3Carryover(prev => ({ ...prev, allEnablersLocked: 'no' }))} style={{ flex: 1, padding: '12px', background: gate3Carryover.allEnablersLocked === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Carryover.allEnablersLocked === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Carryover.allEnablersLocked === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>A5. Gate-2 Decision Card signed AND funds released?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setGate3Carryover(prev => ({ ...prev, decisionCardSignedFundsReleased: 'yes' }))} style={{ flex: 1, padding: '12px', background: gate3Carryover.decisionCardSignedFundsReleased === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Carryover.decisionCardSignedFundsReleased === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Carryover.decisionCardSignedFundsReleased === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                    <button onClick={() => setGate3Carryover(prev => ({ ...prev, decisionCardSignedFundsReleased: 'no' }))} style={{ flex: 1, padding: '12px', background: gate3Carryover.decisionCardSignedFundsReleased === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Carryover.decisionCardSignedFundsReleased === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Carryover.decisionCardSignedFundsReleased === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                  </div>
                </div>

                {(gate3Carryover.allEnablersLocked === 'no' || gate3Carryover.decisionCardSignedFundsReleased === 'no') && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#EF4444' }}>❌ Cannot Proceed</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Return to Gate 2 to complete enabler lock-in and/or obtain Decision Card signature and funds release.</div>
                  </div>
                )}
              </div>
            </div>
          );

        case 1: // Route Selection
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                  Select the verification route for your action. Energy/Water actions use IPMVP protocols. Non-energy actions use KPI verification.
                </div>
              </div>

              <div>
                <label style={labelStyle}>B1. Action Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button onClick={() => setGate3Route(prev => ({ ...prev, actionType: 'energy-water' }))} style={{ ...selectButtonStyle(gate3Route.actionType === 'energy-water'), padding: '20px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡💧</div>
                    <div style={{ fontWeight: '700' }}>Energy / Water</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Use IPMVP Option A/B/C/D</div>
                  </button>
                  <button onClick={() => setGate3Route(prev => ({ ...prev, actionType: 'non-energy' }))} style={{ ...selectButtonStyle(gate3Route.actionType === 'non-energy'), padding: '20px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontWeight: '700' }}>Non-Energy</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>KPI-verified outcomes</div>
                  </button>
                </div>
              </div>

              {gate3Route.actionType === 'energy-water' && (
                <div>
                  <label style={labelStyle}>B2. IPMVP Option</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(ipmvpOptions).map(([key, opt]) => (
                      <button key={key} onClick={() => setGate3Route(prev => ({ ...prev, ipmvpOption: key }))} style={{ ...selectButtonStyle(gate3Route.ipmvpOption === key), padding: '16px' }}>
                        <div style={{ fontWeight: '700' }}>{opt.shortName}: {opt.description}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', fontFamily: 'monospace' }}>{opt.formula}</div>
                        {opt.caution && <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '4px' }}>⚠️ {opt.caution}</div>}
                      </button>
                    ))}
                    <button onClick={() => setGate3Route(prev => ({ ...prev, ipmvpOption: 'not-sure' }))} style={{ ...selectButtonStyle(gate3Route.ipmvpOption === 'not-sure'), padding: '16px', borderStyle: 'dashed' }}>
                      <div style={{ fontWeight: '700' }}>🤔 Not Sure - Help Me Choose</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Use the IPMVP selection guide</div>
                    </button>
                  </div>
                </div>
              )}

              {gate3Route.actionType === 'energy-water' && gate3Route.ipmvpOption === 'not-sure' && (
                <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#3B82F6', marginBottom: '12px' }}>📋 IPMVP SELECTION GUIDE</div>
                  {ipmvpGuideQuestions.map((q, idx) => (
                    <div key={q.id} style={{ marginBottom: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}><strong>{q.id}:</strong> {q.text}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setGate3Route(prev => ({ ...prev, ipmvpOption: q.yesOption, recommendedOption: q.yesOption }))} style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.2)', border: '1px solid #10B981', borderRadius: '6px', color: '#10B981', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Yes → Option {q.yesOption}</button>
                        {q.noOption !== 'continue' && (
                          <button onClick={() => setGate3Route(prev => ({ ...prev, ipmvpOption: q.noOption, recommendedOption: q.noOption }))} style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.2)', border: '1px solid #F59E0B', borderRadius: '6px', color: '#F59E0B', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>No → Option {q.noOption}</button>
                        )}
                        {q.noOption === 'continue' && <span style={{ padding: '8px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>No → Continue to next question</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {gate3Route.actionType === 'non-energy' && (
                <div>
                  <label style={labelStyle}>B3. KPI Category</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {kpiCategories.map(cat => (
                      <button key={cat.value} onClick={() => setGate3Route(prev => ({ ...prev, kpiCategory: cat.value }))} style={{ ...selectButtonStyle(gate3Route.kpiCategory === cat.value), padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600' }}>{cat.label}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Examples: {cat.examples}</div>
                      </button>
                    ))}
                  </div>
                  {gate3Route.kpiCategory === 'other' && (
                    <input type="text" value={gate3Route.kpiCategoryOther} onChange={(e) => setGate3Route(prev => ({ ...prev, kpiCategoryOther: e.target.value }))} placeholder="Specify your KPI category..." style={{ ...inputStyle, marginTop: '12px' }} />
                  )}
                </div>
              )}
            </div>
          );

        case 2: // Phase 1: Mobilise
        case 3: // Phase 2: Build
        case 4: // Phase 3: Commission
          const phaseKey = gate3Step === 2 ? 'phase1' : gate3Step === 3 ? 'phase2' : 'phase3';
          const phaseConfig = gate3PhaseConfig[phaseKey];
          
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{phaseConfig.icon}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8B5CF6' }}>Phase {gate3Step - 1}: {phaseConfig.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Finish: {phaseConfig.finishTrigger}</div>
                  </div>
                </div>
                {getPhaseStatusBadge(phaseKey)}
              </div>
              
              <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}><strong>Start Trigger:</strong> {phaseConfig.startTrigger}</div>
              </div>

              {phaseConfig.questions.map(q => renderPhaseQuestionCard(q, phaseKey))}
            </div>
          );

        case 5: // Phase 4: Performance Evidence
          const p4Config = gate3PhaseConfig.phase4;
          
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{p4Config.icon}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8B5CF6' }}>Phase 4: {p4Config.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Finish: {p4Config.finishTrigger}</div>
                  </div>
                </div>
                {getPhaseStatusBadge('phase4')}
              </div>

              {/* Data Governance */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>📊 Data Governance (All Routes)</div>
                {p4Config.dataGovernance.map(q => renderPhaseQuestionCard(q, 'phase4'))}
              </div>

              {/* Route-specific content */}
              {gate3Route.actionType === 'energy-water' && gate3Route.ipmvpOption && gate3Route.ipmvpOption !== 'not-sure' && (
                <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#10B981', marginBottom: '12px' }}>⚡ {ipmvpOptions[gate3Route.ipmvpOption].name}</div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Formula:</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>{ipmvpOptions[gate3Route.ipmvpOption].formula}</div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>IPMVP requirements confirmed?</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setGate3Phase4(prev => ({ ...prev, ipmvpConfirmed: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase4.ipmvpConfirmed === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase4.ipmvpConfirmed === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase4.ipmvpConfirmed === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                      <button onClick={() => setGate3Phase4(prev => ({ ...prev, ipmvpConfirmed: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase4.ipmvpConfirmed === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase4.ipmvpConfirmed === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase4.ipmvpConfirmed === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Evidence Pack</label>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Required: {ipmvpOptions[gate3Route.ipmvpOption].evidencePack.join(', ')}</div>
                    <textarea value={gate3Phase4.ipmvpEvidencePack} onChange={(e) => setGate3Phase4(prev => ({ ...prev, ipmvpEvidencePack: e.target.value }))} placeholder="List evidence files/references..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Savings Calculation Summary</label>
                    <textarea value={gate3Phase4.savingsCalculation} onChange={(e) => setGate3Phase4(prev => ({ ...prev, savingsCalculation: e.target.value }))} placeholder="Enter savings calculation result and notes..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {gate3Route.actionType === 'non-energy' && (
                <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#3B82F6', marginBottom: '12px' }}>📋 KPI Verification: {kpiCategories.find(c => c.value === gate3Route.kpiCategory)?.label || gate3Route.kpiCategoryOther}</div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>KPI definitions, acceptance tests, and calculation rules confirmed?</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setGate3Phase4(prev => ({ ...prev, kpiConfirmed: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase4.kpiConfirmed === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase4.kpiConfirmed === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase4.kpiConfirmed === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                      <button onClick={() => setGate3Phase4(prev => ({ ...prev, kpiConfirmed: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase4.kpiConfirmed === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase4.kpiConfirmed === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase4.kpiConfirmed === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>KPI Evidence Pack</label>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Include: acceptance test records, KPI tables, CDE extracts, calculations</div>
                    <textarea value={gate3Phase4.kpiEvidencePack} onChange={(e) => setGate3Phase4(prev => ({ ...prev, kpiEvidencePack: e.target.value }))} placeholder="List evidence files/references..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                  </div>
                </div>
              )}
            </div>
          );

        case 6: // Phase 5: Settlement
          const p5Config = gate3PhaseConfig.phase5;
          
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '16px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{p5Config.icon}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8B5CF6' }}>Phase 5: {p5Config.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Finish: {p5Config.finishTrigger}</div>
                  </div>
                </div>
                {getPhaseStatusBadge('phase5')}
              </div>

              <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}><strong>Start Trigger:</strong> {p5Config.startTrigger}</div>
              </div>

              {/* P5.1 Settlement Memo */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>P5.1 Settlement Memo</div>
                
                {gate3Carryover.mechanisms.includes('espc') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>ESPC / Guaranteed Savings Settlement</label>
                    <span style={{ ...subLabelStyle, fontSize: '10px' }}>Pay fee, share upside, or apply shortfall remedy</span>
                    <textarea value={gate3Phase5.espcSettlement} onChange={(e) => setGate3Phase5(prev => ({ ...prev, espcSettlement: e.target.value }))} placeholder="Document the settlement calculation and outcome..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                )}

                {gate3Carryover.mechanisms.includes('gainshare') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Gainshare / Painshare Settlement</label>
                    <span style={{ ...subLabelStyle, fontSize: '10px' }}>Calculate against target with documented adjustments</span>
                    <textarea value={gate3Phase5.gainshareSettlement} onChange={(e) => setGate3Phase5(prev => ({ ...prev, gainshareSettlement: e.target.value }))} placeholder="Document the settlement calculation and outcome..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                )}

                {gate3Carryover.mechanisms.includes('green-lease') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Green Lease Settlement</label>
                    <span style={{ ...subLabelStyle, fontSize: '10px' }}>Pass-through/service charge recovery based on verified meters/modelled savings per clause</span>
                    <textarea value={gate3Phase5.greenLeaseSettlement} onChange={(e) => setGate3Phase5(prev => ({ ...prev, greenLeaseSettlement: e.target.value }))} placeholder="Document the settlement calculation and outcome..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                )}

                {gate3Carryover.mechanisms.includes('sla-kpi') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>SLA KPI-linked Payment Settlement</label>
                    <span style={{ ...subLabelStyle, fontSize: '10px' }}>Apply KPI-to-payment logic</span>
                    <textarea value={gate3Phase5.slaKpiSettlement} onChange={(e) => setGate3Phase5(prev => ({ ...prev, slaKpiSettlement: e.target.value }))} placeholder="Document the settlement calculation and outcome..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                )}

                {gate3Carryover.mechanisms.includes('lender-reporting') && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Sustainability-linked Finance Reporting</label>
                    <span style={{ ...subLabelStyle, fontSize: '10px' }}>Deliver KPI report + assurance package to lender</span>
                    <textarea value={gate3Phase5.lenderReportSettlement} onChange={(e) => setGate3Phase5(prev => ({ ...prev, lenderReportSettlement: e.target.value }))} placeholder="Document the KPI report and assurance package..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                )}

                <div>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>Settlement Memo Complete?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setGate3Phase5(prev => ({ ...prev, settlementMemoComplete: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.settlementMemoComplete === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.settlementMemoComplete === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.settlementMemoComplete === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                    <button onClick={() => setGate3Phase5(prev => ({ ...prev, settlementMemoComplete: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.settlementMemoComplete === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.settlementMemoComplete === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.settlementMemoComplete === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                  </div>
                </div>
              </div>

              {/* P5.2 Close-out */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>P5.2 Close-out</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Decision recorded?</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, decisionRecorded: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.decisionRecorded === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.decisionRecorded === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.decisionRecorded === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, decisionRecorded: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.decisionRecorded === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.decisionRecorded === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.decisionRecorded === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Evidence pack archived?</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, evidenceArchived: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.evidenceArchived === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.evidenceArchived === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.evidenceArchived === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, evidenceArchived: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.evidenceArchived === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.evidenceArchived === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.evidenceArchived === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Outcomes communicated to stakeholders?</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, outcomesCommunicated: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.outcomesCommunicated === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.outcomesCommunicated === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.outcomesCommunicated === 'yes' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Yes</button>
                      <button onClick={() => setGate3Phase5(prev => ({ ...prev, outcomesCommunicated: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3Phase5.outcomesCommunicated === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3Phase5.outcomesCommunicated === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Phase5.outcomesCommunicated === 'no' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✗ No</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>Close-out Notes</label>
                    <textarea value={gate3Phase5.closeOutNotes} onChange={(e) => setGate3Phase5(prev => ({ ...prev, closeOutNotes: e.target.value }))} placeholder="Any additional notes or lessons learned..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            </div>
          );

        case 7: // Dashboard
          const allPhasesComplete = ['phase1', 'phase2', 'phase3', 'phase4', 'phase5'].every(p => calculatePhaseStatus(p) === 'complete' || calculatePhaseStatus(p) === 'in-progress');
          const backRoute = checkBackRoute();
          
          return (
            <div>
              <div style={{ padding: '20px', background: gate3Decision === 'complete' ? 'rgba(16,185,129,0.15)' : backRoute ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)', border: `2px solid ${gate3Decision === 'complete' ? '#10B981' : backRoute ? '#EF4444' : '#8B5CF6'}`, borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>{gate3Decision === 'complete' ? '✅' : backRoute ? '⚠️' : '📊'}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: gate3Decision === 'complete' ? '#10B981' : backRoute ? '#EF4444' : '#8B5CF6' }}>
                  {gate3Decision === 'complete' ? 'Gate 3 Complete!' : backRoute ? `Back-Route to Gate ${backRoute === 'gate1' ? '1' : '2'}` : 'Phase Status Dashboard'}
                </div>
                {backRoute && (
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                    Material change detected: {gate3ChangeControl.changeDescription}
                  </div>
                )}
              </div>

              {/* Phase Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {['phase1', 'phase2', 'phase3', 'phase4', 'phase5'].map((phase, idx) => {
                  const status = calculatePhaseStatus(phase);
                  const config = gate3PhaseConfig[phase];
                  const statusColors = {
                    'not-started': { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', icon: '○' },
                    'in-progress': { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', icon: '◐' },
                    'complete': { bg: 'rgba(16,185,129,0.15)', border: '#10B981', icon: '✓' },
                    'blocked': { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', icon: '✗' }
                  };
                  const s = statusColors[status];
                  return (
                    <div key={phase} style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{config?.icon || '📋'}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>Phase {idx + 1}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{config?.name}</div>
                      <span style={{ fontSize: '16px' }}>{s.icon}</span>
                    </div>
                  );
                })}
              </div>

              {/* Verification Method Summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>📋 Verification Method</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  {gate3Route.actionType === 'energy-water' ? (
                    <>
                      <strong>Route:</strong> Energy/Water (IPMVP)<br />
                      <strong>Option:</strong> {gate3Route.ipmvpOption ? ipmvpOptions[gate3Route.ipmvpOption]?.shortName : 'Not selected'}<br />
                      {gate3Route.ipmvpOption && ipmvpOptions[gate3Route.ipmvpOption] && (
                        <><strong>Formula:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{ipmvpOptions[gate3Route.ipmvpOption].formula}</span></>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>Route:</strong> Non-Energy (KPI Verification)<br />
                      <strong>Category:</strong> {kpiCategories.find(c => c.value === gate3Route.kpiCategory)?.label || gate3Route.kpiCategoryOther}
                    </>
                  )}
                </div>
              </div>

              {/* Change Control */}
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#F59E0B', marginBottom: '12px' }}>⚠️ Change Control Check</div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...labelStyle, fontSize: '12px' }}>Have there been any scope, cost, schedule, or term changes?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, hasChanges: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3ChangeControl.hasChanges === 'yes' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', border: gate3ChangeControl.hasChanges === 'yes' ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3ChangeControl.hasChanges === 'yes' ? '#F59E0B' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, hasChanges: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3ChangeControl.hasChanges === 'no' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3ChangeControl.hasChanges === 'no' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3ChangeControl.hasChanges === 'no' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>No</button>
                  </div>
                </div>

                {gate3ChangeControl.hasChanges === 'yes' && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Describe the change</label>
                      <input type="text" value={gate3ChangeControl.changeDescription} onChange={(e) => setGate3ChangeControl(prev => ({ ...prev, changeDescription: e.target.value }))} placeholder="e.g., CAPEX increased by 15% due to supply chain delays" style={inputStyle} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ ...labelStyle, fontSize: '12px' }}>Does this cause material impact? (&gt;10-15% swing in benefits/CAPEX or threshold crossing risk)</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, materialImpact: 'yes' }))} style={{ flex: 1, padding: '10px', background: gate3ChangeControl.materialImpact === 'yes' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: gate3ChangeControl.materialImpact === 'yes' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3ChangeControl.materialImpact === 'yes' ? '#EF4444' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Yes - Material</button>
                        <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, materialImpact: 'no' }))} style={{ flex: 1, padding: '10px', background: gate3ChangeControl.materialImpact === 'no' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: gate3ChangeControl.materialImpact === 'no' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3ChangeControl.materialImpact === 'no' ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>No - Minor</button>
                      </div>
                    </div>

                    {gate3ChangeControl.materialImpact === 'yes' && (
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Impact type (determines back-route)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, impactType: 'economics', backRoute: 'gate1' }))} style={{ ...selectButtonStyle(gate3ChangeControl.impactType === 'economics'), padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>Economics Impact → Back to Gate 1</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Money case must be re-run</div>
                          </button>
                          <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, impactType: 'measurement', backRoute: 'gate2' }))} style={{ ...selectButtonStyle(gate3ChangeControl.impactType === 'measurement'), padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>Measurement/Enabler Impact → Back to Gate 2</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Enabler needs amendment for revised boundary</div>
                          </button>
                          <button onClick={() => setGate3ChangeControl(prev => ({ ...prev, impactType: 'both', backRoute: 'gate1' }))} style={{ ...selectButtonStyle(gate3ChangeControl.impactType === 'both'), padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>Both → Back to Gate 1</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Re-run Gate 1 then Gate 2</div>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* View Final Summary Button */}
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button 
                  onClick={() => { setView('final-summary'); resetScroll(); }}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  📋 View Final Summary
                </button>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    const canProceedGate3 = () => {
      switch (gate3Step) {
        case 0: 
          return gate3Carryover.role && gate3Carryover.proposedAction && gate3Carryover.boundary && gate3Carryover.mechanisms.length > 0 && gate3Carryover.allEnablersLocked === 'yes' && gate3Carryover.decisionCardSignedFundsReleased === 'yes';
        case 1:
          if (gate3Route.actionType === 'energy-water') {
            return gate3Route.ipmvpOption && gate3Route.ipmvpOption !== 'not-sure';
          }
          return gate3Route.actionType === 'non-energy' && gate3Route.kpiCategory && (gate3Route.kpiCategory !== 'other' || gate3Route.kpiCategoryOther);
        case 2: return calculatePhaseStatus('phase1') === 'complete';
        case 3: return calculatePhaseStatus('phase2') === 'complete';
        case 4: return calculatePhaseStatus('phase3') === 'complete';
        case 5: return gate3Phase4.P4_G1 === 'yes' && gate3Phase4.P4_G2 === 'yes' && (gate3Route.actionType === 'energy-water' ? gate3Phase4.ipmvpConfirmed === 'yes' : gate3Phase4.kpiConfirmed === 'yes');
        case 6: return gate3Phase5.settlementMemoComplete === 'yes' && gate3Phase5.decisionRecorded === 'yes' && gate3Phase5.evidenceArchived === 'yes' && gate3Phase5.outcomesCommunicated === 'yes';
        default: return true;
      }
    };

    const handleGate3Next = () => {
      if (gate3Step === 6 && canProceedGate3()) {
        setGate3Decision('complete');
        setGate3Step(7);
        resetScroll();
      } else if (gate3Step < 7) {
        setGate3Step(gate3Step + 1);
        resetScroll();
      }
    };

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#8B5CF6' }}>Gate 3: Delivery & M&V Execution</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>{currentStepInfo.title} - {currentStepInfo.subtitle}</p>
            </div>
            <button onClick={() => { setView('chat'); setGate3Step(0); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
              {wizardSteps.map((step) => (
                <div key={step.num} onClick={() => { if (step.num < gate3Step) { setGate3Step(step.num); resetScroll(); } }} style={{ padding: '8px 12px', background: gate3Step === step.num ? 'rgba(139,92,246,0.2)' : gate3Step > step.num ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '6px', border: gate3Step === step.num ? '1px solid #8B5CF6' : '1px solid transparent', textAlign: 'center', minWidth: '80px', cursor: step.num < gate3Step ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: gate3Step === step.num ? '#8B5CF6' : gate3Step > step.num ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{gate3Step > step.num ? '✓' : step.num}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{step.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {gateSummaries.gate0 && <SummaryCard summary={gateSummaries.gate0} />}
            {gateSummaries.gate1 && <SummaryCard summary={gateSummaries.gate1} />}
            {gateSummaries.gate2 && <SummaryCard summary={gateSummaries.gate2} />}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '24px' }}>{renderWizardContent()}</div>
          </div>

          {gate3Step < 7 && (
            <div className="wizard-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { if (gate3Step > 0) { setGate3Step(gate3Step - 1); resetScroll(); } }} disabled={gate3Step === 0} style={{ padding: '12px 24px', background: gate3Step === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: gate3Step === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600', cursor: gate3Step === 0 ? 'not-allowed' : 'pointer' }}>← Previous</button>
              <button onClick={handleGate3Next} disabled={!canProceedGate3()} style={{ padding: '12px 24px', background: canProceedGate3() ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '8px', color: canProceedGate3() ? 'white' : 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: '600', cursor: canProceedGate3() ? 'pointer' : 'not-allowed', boxShadow: canProceedGate3() ? '0 4px 15px rgba(139,92,246,0.3)' : 'none' }}>{gate3Step === 6 ? 'Complete Gate 3 →' : 'Next →'}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== FINAL SUMMARY PAGE ====================
  if (view === 'final-summary') {
    // ==================== NARRATIVE GENERATION FUNCTIONS ====================
    
    // Determine overall status
    const determineStatus = () => {
      const hasGate2EnablersLocked = gate3Carryover?.allEnablersLocked === 'yes';
      const hasDecisionCard = gate3Carryover?.decisionCardSignedFundsReleased === 'yes';
      const hasMaterialChange = gate3ChangeControl?.hasChanges === 'yes' && gate3ChangeControl?.materialImpact === 'yes';
      const isGate3Complete = gate3Decision === 'complete';
      
      let phase4Complete = false;
      let phase5Complete = false;
      try {
        phase4Complete = calculatePhaseStatus('phase4') === 'complete';
        phase5Complete = calculatePhaseStatus('phase5') === 'complete';
      } catch (e) {}
      
      if (hasMaterialChange) {
        return { status: 'PAUSED', label: 'Revalidation Required', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: '⏸️' };
      }
      if (!hasGate2EnablersLocked || !hasDecisionCard) {
        return { status: 'PENDING', label: 'Missing Critical Inputs', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '⏳' };
      }
      if (isGate3Complete && phase5Complete) {
        return { status: 'COMPLETED', label: 'Verified & Settled', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '✅' };
      }
      if (gate3ChangeControl?.hasChanges === 'no' || gate3ChangeControl?.materialImpact === 'no') {
        return { status: 'OK TO PROCEED', label: 'No Revalidation Required', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '✅' };
      }
      return { status: 'IN PROGRESS', label: 'Execution Ongoing', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: '🔄' };
    };
    
    const statusInfo = determineStatus();
    
    // Count completed phases
    const getCompletedPhasesCount = () => {
      let count = 0;
      try {
        ['phase1', 'phase2', 'phase3', 'phase4', 'phase5'].forEach(phase => {
          if (calculatePhaseStatus(phase) === 'complete') count++;
        });
      } catch(e) {}
      return count;
    };
    
    // Generate Executive Summary narrative
    const generateExecutiveSummary = () => {
      const initiative = userQuestion || gate3Carryover?.proposedAction || 'This initiative';
      const gate0Decision = gate0Results?.decision?.text || 'pending';
      const gate1Decision = gate1Results?.decision || 'pending';
      const gate2Status = gate3Carryover?.allEnablersLocked === 'yes' ? 'secured' : 'pending';
      const completedPhases = getCompletedPhasesCount();
      
      let summary = `"${initiative}" has been evaluated through the ESG Strategic Screening Process. `;
      
      if (gate0Decision === 'ADOPT') {
        summary += `The initiative demonstrated strong strategic alignment during Gate 0, passing all five screening criteria with scores of 80% or higher. `;
      } else if (gate0Decision === 'RE-TEST') {
        summary += `The initiative showed potential during Gate 0 screening, with 4 of 5 criteria passing. Additional validation was conducted to address the flagged area. `;
      } else if (gate0Results) {
        summary += `Gate 0 screening identified areas requiring attention before proceeding. `;
      } else {
        summary += `Gate 0 screening has not yet been completed. `;
      }
      
      if (gate1Decision === 'ADOPT') {
        const npv = gate1Results?.calculations?.npv;
        const payback = gate1Results?.calculations?.simplePayback;
        summary += `The business case analysis in Gate 1 confirmed financial viability`;
        if (npv) summary += ` with an NPV of S$${npv.toLocaleString()}`;
        if (payback) summary += ` and payback period of ${payback} years`;
        summary += `. `;
      } else if (gate1Decision === 'RE-TEST') {
        summary += `Gate 1 analysis indicated the business case requires strengthening in certain areas. `;
      } else if (gate1Results) {
        summary += `The business case did not meet the required thresholds during Gate 1 evaluation. `;
      }
      
      if (gate2Status === 'secured') {
        summary += `All commercial and contractual enablers have been locked in through Gate 2. `;
      } else {
        summary += `Gate 2 enabler lock-in is pending completion. `;
      }
      
      if (completedPhases > 0) {
        summary += `Gate 3 execution is underway with ${completedPhases} of 5 phases completed. `;
      }
      
      // Add outcome statement
      if (statusInfo.status === 'COMPLETED') {
        summary += `\n\nThe initiative has been fully verified and settled. All gates have been successfully completed.`;
      } else if (statusInfo.status === 'OK TO PROCEED') {
        summary += `\n\nThe initiative is approved for continued execution with no material changes requiring revalidation.`;
      } else if (statusInfo.status === 'PAUSED') {
        summary += `\n\nExecution has been paused pending revalidation due to material changes identified in the change control process.`;
      } else if (statusInfo.status === 'IN PROGRESS') {
        summary += `\n\nThe initiative is progressing through the delivery and M&V execution phase.`;
      } else {
        summary += `\n\nCritical inputs are pending before the initiative can proceed further.`;
      }
      
      return summary;
    };
    
    // Generate Gate 0 narrative
    const generateGate0Narrative = () => {
      if (!gate0Results) return { status: 'Not Completed', narrative: 'Gate 0 Strategic Screening has not yet been completed. This gate evaluates the initiative against five key criteria: Policy & Regulatory Alignment, Technology & Site Fit, Operational Feasibility, Industry Best Practice, and Co-benefits.', details: [] };
      
      const decision = gate0Results.decision?.text || 'N/A';
      const passedCount = gate0Results.passedCount || 0;
      const totalPercentage = gate0Results.totalPercentage || 0;
      const checks = gate0Results.checks || [];
      
      let narrative = `The initiative was evaluated against five strategic criteria during Gate 0 screening. `;
      
      const passedChecks = checks.filter(c => c.passed).map(c => c.name);
      const failedChecks = checks.filter(c => !c.passed).map(c => c.name);
      
      if (decision === 'ADOPT') {
        narrative += `All five criteria achieved scores of 80% or higher, confirming strong strategic fit with an overall score of ${totalPercentage.toFixed(1)}%. `;
        narrative += `The initiative demonstrated particular strength in ${passedChecks.slice(0, 2).join(' and ')}.`;
      } else if (decision === 'RE-TEST') {
        narrative += `Four of five criteria passed the 80% threshold, with "${failedChecks[0]}" requiring additional validation. `;
        narrative += `The overall score of ${totalPercentage.toFixed(1)}% indicated conditional approval pending successful re-testing.`;
      } else {
        narrative += `Only ${passedCount} of 5 criteria met the required threshold. `;
        if (failedChecks.length > 0) {
          narrative += `Areas requiring attention include: ${failedChecks.join(', ')}.`;
        }
      }
      
      const details = checks.map(c => ({
        name: c.name,
        score: c.percentage,
        passed: c.passed,
        yesCount: c.yesCount,
        totalQuestions: c.applicableCount
      }));
      
      return { status: decision, narrative, details };
    };
    
    // Generate Gate 1 narrative
    const generateGate1Narrative = () => {
      if (!gate1Results) return { status: 'Not Completed', narrative: 'Gate 1 Business Case Test has not yet been completed. This gate evaluates the financial viability of the initiative including NPV, payback period, and other key metrics.', financials: null };
      
      const decision = gate1Results.decision || 'N/A';
      const calc = gate1Results.calculations || {};
      const baseline = gate1Inputs?.baseline || {};
      const decisionRule = gate1Inputs?.decisionRule || {};
      
      let narrative = `The business case was evaluated using `;
      
      if (baseline.baselinePeriod === 'last-12-months') {
        narrative += `a 12-month baseline period `;
      } else if (baseline.baselinePeriod) {
        narrative += `a ${baseline.baselinePeriod} baseline period `;
      } else {
        narrative += `available baseline data `;
      }
      
      if (baseline.normalisationPossible === 'yes') {
        narrative += `with weather normalisation applied. `;
      } else {
        narrative += `without normalisation adjustments. `;
      }
      
      if (decisionRule.thresholdType === 'npv') {
        narrative += `The primary decision metric was Net Present Value (NPV). `;
      } else if (decisionRule.thresholdType === 'payback') {
        narrative += `The primary decision metric was Simple Payback Period. `;
      } else if (decisionRule.thresholdType === 'irr') {
        narrative += `The primary decision metric was Internal Rate of Return (IRR). `;
      }
      
      if (decision === 'ADOPT') {
        narrative += `\n\nThe analysis confirmed that the initiative meets or exceeds all financial thresholds. `;
        if (calc.npv) narrative += `The calculated NPV of S$${calc.npv.toLocaleString()} demonstrates positive value creation over the analysis period. `;
        if (calc.simplePayback) narrative += `The payback period of ${calc.simplePayback} years falls within acceptable parameters. `;
        if (calc.energySavings) narrative += `Projected annual energy savings of ${calc.energySavings.toLocaleString()} kWh will deliver both cost and carbon benefits.`;
      } else if (decision === 'RE-TEST') {
        narrative += `\n\nThe initial analysis indicated marginal results against one or more thresholds. Additional data was gathered to strengthen the business case. `;
        if (gate1Results.retestApplied) {
          narrative += `Following re-testing with ${gate1Results.retestApplied}, the business case was validated.`;
        }
      } else {
        narrative += `\n\nThe analysis indicated that the initiative does not meet the required financial thresholds at this time.`;
      }
      
      const financials = {
        capex: calc.capex,
        annualSavings: calc.annualSavings,
        npv: calc.npv,
        simplePayback: calc.simplePayback,
        irr: calc.irr,
        energySavings: calc.energySavings,
        carbonReduction: calc.carbonReduction
      };
      
      return { status: decision, narrative, financials };
    };
    
    // Generate Gate 2 narrative
    const generateGate2Narrative = () => {
      const enablersLocked = gate3Carryover?.allEnablersLocked === 'yes';
      const decisionCard = gate3Carryover?.decisionCardSignedFundsReleased === 'yes';
      const mechanisms = gate3Carryover?.mechanisms || [];
      
      if (!gate2Decision && !enablersLocked) {
        return { status: 'Not Completed', narrative: 'Gate 2 Commercial & Contractual Lock-In has not yet been completed. This gate ensures all four enablers are secured: Value-Capture Mechanism, Data & Metering Rights, Delivery Risk Coverage, and Reporting & Compliance.', enablers: [] };
      }
      
      let narrative = `Gate 2 evaluated the commercial and contractual framework required for successful implementation. `;
      
      const enablerStatus = [];
      try {
        ['enabler1', 'enabler2', 'enabler3', 'enabler4'].forEach(e => {
          const status = calculateEnablerStatus(e);
          const name = gate2Questions?.[e]?.name || e;
          enablerStatus.push({ name, status: status === 'pass' ? 'Secured' : status === 'partial' ? 'Partial' : 'Not Secured' });
        });
      } catch(e) {
        enablerStatus.push({ name: 'Enabler status', status: 'Unable to calculate' });
      }
      
      const securedCount = enablerStatus.filter(e => e.status === 'Secured').length;
      
      if (enablersLocked && decisionCard) {
        narrative += `All four commercial enablers have been successfully locked in, and the Decision Card has been signed with funds released. `;
        if (mechanisms.length > 0) {
          const mechNames = mechanisms.map(m => {
            if (m === 'espc') return 'Energy Savings Performance Contract';
            if (m === 'gainshare') return 'Gain-Share Agreement';
            if (m === 'green-lease') return 'Green Lease Clause';
            if (m === 'sla-kpi') return 'SLA/KPI Framework';
            if (m === 'lender-reporting') return 'Lender ESG Reporting';
            return m;
          });
          narrative += `\n\nThe following value-capture mechanisms are in place: ${mechNames.join(', ')}.`;
        }
      } else if (securedCount > 0) {
        narrative += `${securedCount} of 4 enablers have been secured. `;
        const pending = enablerStatus.filter(e => e.status !== 'Secured').map(e => e.name);
        if (pending.length > 0) {
          narrative += `Pending enablers: ${pending.join(', ')}.`;
        }
        if (!decisionCard) {
          narrative += ` The Decision Card is awaiting signature and funds release.`;
        }
      } else {
        narrative += `Enabler lock-in is pending. All four enablers must be secured before proceeding to Gate 3 execution.`;
      }
      
      return { status: enablersLocked ? 'All Locked' : 'Pending', narrative, enablers: enablerStatus, mechanisms };
    };
    
    // Generate Gate 3 narrative
    const generateGate3Narrative = () => {
      const route = gate3Route?.actionType;
      const ipmvpOption = gate3Route?.ipmvpOption;
      const completedPhases = getCompletedPhasesCount();
      
      if (!route) {
        return { status: 'Not Started', narrative: 'Gate 3 Delivery & M&V Execution has not yet been initiated. This gate covers five phases: Mobilise, Design & Procure, Construct & Commission, Measure & Verify, and Settle.', phases: [], mvRoute: null };
      }
      
      let narrative = `Gate 3 follows the `;
      if (route === 'energy-water') {
        narrative += `IPMVP (International Performance Measurement and Verification Protocol) pathway using Option ${ipmvpOption || 'C'}. `;
        if (ipmvpOption === 'A') {
          narrative += `This option uses retrofit isolation with key parameter measurement, suitable for projects where individual system performance can be isolated and measured.`;
        } else if (ipmvpOption === 'B') {
          narrative += `This option uses retrofit isolation with all parameter measurement, providing comprehensive measurement of the retrofitted system.`;
        } else if (ipmvpOption === 'C') {
          narrative += `This whole-facility approach uses utility meter data with regression-based baseline adjustment, suitable for projects affecting overall building energy consumption.`;
        } else if (ipmvpOption === 'D') {
          narrative += `This calibrated simulation approach uses energy modelling to determine savings, suitable for complex projects or new construction.`;
        }
      } else {
        narrative += `KPI Verification pathway for non-energy/water sustainability metrics. `;
        narrative += `Performance will be tracked against defined KPIs with appropriate verification protocols.`;
      }
      
      const phases = [];
      const phaseNames = ['Mobilise', 'Design & Procure', 'Construct & Commission', 'Measure & Verify', 'Settle'];
      try {
        ['phase1', 'phase2', 'phase3', 'phase4', 'phase5'].forEach((phase, idx) => {
          const status = calculatePhaseStatus(phase);
          phases.push({ 
            name: phaseNames[idx], 
            status: status === 'complete' ? 'Complete' : status === 'partial' ? 'In Progress' : 'Not Started',
            phase: `Phase ${idx + 1}`
          });
        });
      } catch(e) {}
      
      narrative += `\n\n${completedPhases} of 5 phases have been completed. `;
      
      if (completedPhases === 5) {
        narrative += `All delivery and M&V phases are complete. The initiative is ready for final settlement.`;
      } else if (completedPhases > 0) {
        const nextPhase = phases.find(p => p.status !== 'Complete');
        if (nextPhase) {
          narrative += `Currently progressing through ${nextPhase.phase}: ${nextPhase.name}.`;
        }
      } else {
        narrative += `Execution is pending initiation.`;
      }
      
      return { status: `${completedPhases}/5 Complete`, narrative, phases, mvRoute: route === 'energy-water' ? `IPMVP Option ${ipmvpOption || 'C'}` : 'KPI Verification' };
    };
    
    // Generate Risk & Change Control narrative
    const generateChangeControlNarrative = () => {
      const hasChanges = gate3ChangeControl?.hasChanges === 'yes';
      const isMaterial = gate3ChangeControl?.materialImpact === 'yes';
      const impactType = gate3ChangeControl?.impactType;
      const description = gate3ChangeControl?.changeDescription;
      
      if (!hasChanges) {
        return { 
          status: 'No Changes', 
          narrative: 'No scope changes, cost variations, or measurement boundary modifications have been recorded since the business case was approved. The original Gate 1 and Gate 2 validations remain in effect.',
          risks: [],
          mitigations: []
        };
      }
      
      let narrative = `A change has been recorded in the change control register. `;
      if (description) {
        narrative += `Description: "${description}". `;
      }
      
      const risks = [];
      const mitigations = [];
      
      if (isMaterial) {
        narrative += `\n\nThis change has been assessed as MATERIAL, requiring revalidation of prior gate decisions. `;
        
        if (impactType === 'economics' || impactType === 'both') {
          narrative += `The change affects the financial business case (Gate 1). `;
          risks.push('NPV and payback calculations may no longer be valid');
          risks.push('Financing terms may need renegotiation');
          mitigations.push('Re-run Gate 1 analysis with updated cost and savings projections');
          mitigations.push('Obtain revised approval from finance stakeholders');
        }
        if (impactType === 'measurement' || impactType === 'both') {
          narrative += `The change affects measurement boundaries or enabler coverage (Gate 2). `;
          risks.push('M&V baseline may need adjustment');
          risks.push('Data access or metering rights may be affected');
          mitigations.push('Re-run Gate 2 enabler lock-in assessment');
          mitigations.push('Update M&V plan documentation');
        }
      } else {
        narrative += `This change has been assessed as minor and does not require revalidation of the business case.`;
      }
      
      return { status: isMaterial ? 'Material Change' : 'Minor Change', narrative, risks, mitigations };
    };
    
    // Generate M&V Route narrative
    const generateMVNarrative = () => {
      const route = gate3Route?.actionType;
      const ipmvpOption = gate3Route?.ipmvpOption;
      const baseline = gate1Inputs?.baseline || {};
      
      if (route !== 'energy-water') {
        return {
          status: 'KPI Route',
          narrative: 'This initiative follows the KPI Verification pathway for non-energy/water sustainability metrics. Performance tracking will be conducted against defined key performance indicators with appropriate verification and reporting protocols.',
          details: { route: 'KPI Verification', baselinePeriod: 'N/A', normalisation: 'N/A', reportingFrequency: 'As defined in KPI framework' }
        };
      }
      
      let narrative = `This initiative follows the IPMVP (International Performance Measurement and Verification Protocol) framework, specifically Option ${ipmvpOption || 'C'}. `;
      
      if (ipmvpOption === 'A') {
        narrative += `\n\nOption A (Retrofit Isolation: Key Parameter Measurement) involves measuring the key performance parameter(s) that define the savings from the retrofit measure. Other parameters are estimated based on engineering calculations or manufacturer data. This approach is suitable when the retrofit is isolated from other building systems and key parameters can be easily measured.`;
      } else if (ipmvpOption === 'B') {
        narrative += `\n\nOption B (Retrofit Isolation: All Parameter Measurement) involves measuring all parameters needed to determine energy savings. This provides the highest accuracy for isolated retrofit measures but requires more extensive metering infrastructure.`;
      } else if (ipmvpOption === 'C') {
        narrative += `\n\nOption C (Whole Facility) uses utility meter data to determine savings by comparing pre- and post-retrofit consumption. Regression analysis adjusts for independent variables such as weather, occupancy, and production levels. This approach is suitable for projects that affect overall facility consumption or when isolating individual measures is impractical.`;
      } else if (ipmvpOption === 'D') {
        narrative += `\n\nOption D (Calibrated Simulation) uses computer simulation models calibrated with actual performance data to determine savings. This approach is suitable for new construction, complex retrofits, or situations where baseline data is unavailable.`;
      }
      
      let baselinePeriod = 'Not specified';
      if (baseline.baselinePeriod === 'last-12-months') {
        baselinePeriod = '12 months (prior year)';
      } else if (baseline.baselinePeriod === 'last-24-months') {
        baselinePeriod = '24 months (2-year average)';
      } else if (baseline.baselinePeriod) {
        baselinePeriod = baseline.baselinePeriod;
      }
      
      const normalisation = baseline.normalisationPossible === 'yes' ? 'Applied (weather/occupancy adjustment)' : 'Not applied';
      
      narrative += `\n\nBaseline Period: ${baselinePeriod}. Normalisation: ${normalisation}.`;
      
      return {
        status: `IPMVP Option ${ipmvpOption || 'C'}`,
        narrative,
        details: { 
          route: `IPMVP Option ${ipmvpOption || 'C'}`, 
          baselinePeriod, 
          normalisation,
          reportingFrequency: 'Monthly data collection, quarterly verification reports'
        }
      };
    };
    
    // Generate Recommended Actions
    const generateRecommendedActions = () => {
      const immediate = [];
      const medium = [];
      const settlement = [];
      
      if (statusInfo.status === 'COMPLETED') {
        immediate.push('Export and archive the Settlement Memo');
        immediate.push('Communicate final outcomes to all stakeholders');
        immediate.push('Update ESG reporting dashboard with verified results');
        medium.push('Document lessons learned for future initiatives');
        medium.push('Archive all project documentation');
        settlement.push('Initiative complete - no further settlement actions required');
      } else if (statusInfo.status === 'PAUSED') {
        if (gate3ChangeControl?.impactType === 'economics' || gate3ChangeControl?.impactType === 'both') {
          immediate.push('Re-run Gate 1 Business Case Test with updated parameters');
          immediate.push('Obtain revised financial approval');
        }
        if (gate3ChangeControl?.impactType === 'measurement' || gate3ChangeControl?.impactType === 'both') {
          immediate.push('Re-run Gate 2 Enabler Lock-In assessment');
          immediate.push('Update M&V plan documentation');
        }
        immediate.push('Document change control decision and rationale');
        medium.push('Resume Gate 3 execution upon revalidation');
        settlement.push('Settlement pending revalidation completion');
      } else if (statusInfo.status === 'IN PROGRESS' || statusInfo.status === 'OK TO PROCEED') {
        const completedPhases = getCompletedPhasesCount();
        if (completedPhases < 3) {
          immediate.push('Continue construction and commissioning activities');
          immediate.push('Complete functional performance testing');
        } else if (completedPhases < 4) {
          immediate.push('Complete baseline data collection and validation');
          immediate.push('Begin performance monitoring period');
        } else if (completedPhases < 5) {
          immediate.push('Complete 12-month performance verification');
          immediate.push('Prepare settlement calculations');
        }
        medium.push('Monitor change control register for any scope variations');
        medium.push('Prepare quarterly progress reports');
        settlement.push('Complete all M&V documentation');
        settlement.push('Execute settlement calculations per contract terms');
        settlement.push('Obtain stakeholder sign-off on verified savings');
      } else {
        immediate.push('Complete Gate 2 Enabler Lock-In');
        immediate.push('Obtain Decision Card signature and funds release');
        medium.push('Prepare Gate 3 execution mobilisation');
        settlement.push('Settlement pending Gate 2 completion');
      }
      
      return { immediate, medium, settlement };
    };
    
    // Generate Data Completeness
    const getDataCompleteness = () => {
      const complete = [];
      const missing = [];
      
      if (gate0Results) {
        complete.push({ gate: 'Gate 0', item: 'Strategic Screening Questionnaire', source: '25 questions evaluated' });
      } else {
        missing.push({ gate: 'Gate 0', item: 'Strategic Screening', reason: 'Not yet completed' });
      }
      
      if (gate1Results) {
        complete.push({ gate: 'Gate 1', item: 'Business Case Analysis', source: 'Financial model with NPV/Payback' });
      } else {
        missing.push({ gate: 'Gate 1', item: 'Business Case Test', reason: 'Not yet completed' });
      }
      
      if (gate2Decision || gate3Carryover?.allEnablersLocked === 'yes') {
        complete.push({ gate: 'Gate 2', item: 'Enabler Lock-In', source: 'Commercial framework secured' });
      } else {
        missing.push({ gate: 'Gate 2', item: 'Enabler Lock-In', reason: 'Pending completion' });
      }
      
      if (gate3Route?.actionType) {
        complete.push({ gate: 'Gate 3', item: 'M&V Route Selection', source: gate3Route.actionType === 'energy-water' ? `IPMVP Option ${gate3Route.ipmvpOption || 'C'}` : 'KPI Verification' });
      } else {
        missing.push({ gate: 'Gate 3', item: 'M&V Route Selection', reason: 'Not yet selected' });
      }
      
      return { complete, missing, overallComplete: missing.length === 0 };
    };
    
    // Generate all narratives
    const executiveSummary = generateExecutiveSummary();
    const gate0Narrative = generateGate0Narrative();
    const gate1Narrative = generateGate1Narrative();
    const gate2Narrative = generateGate2Narrative();
    const gate3Narrative = generateGate3Narrative();
    const changeControlNarrative = generateChangeControlNarrative();
    const mvNarrative = generateMVNarrative();
    const recommendedActions = generateRecommendedActions();
    const dataCompleteness = getDataCompleteness();
    
    // PDF Export Function
    const exportToPDF = () => {
      const initiative = userQuestion || gate3Carryover?.proposedAction || 'ESG Initiative';
      const currentDate = new Date().toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ESG Initiative Report - ${initiative}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @page { margin: 0.5in; }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.6; }
            .header { background: linear-gradient(135deg, #059669, #10B981); color: white; padding: 40px; }
            .header h1 { font-size: 28px; margin-bottom: 8px; }
            .header .subtitle { font-size: 14px; opacity: 0.9; }
            .header .status-badge { display: inline-block; background: white; color: #059669; padding: 8px 20px; border-radius: 20px; font-weight: 700; margin-top: 16px; }
            .content { padding: 40px; max-width: 800px; margin: 0 auto; }
            .section { margin-bottom: 32px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: 700; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 16px; }
            .section-content { font-size: 14px; color: #333; }
            .section-content p { margin-bottom: 12px; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th { background: #059669; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .status-pass { color: #059669; font-weight: 600; }
            .status-fail { color: #dc2626; font-weight: 600; }
            .status-pending { color: #d97706; font-weight: 600; }
            .highlight-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 16px 0; }
            .warning-box { background: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin: 16px 0; }
            .footer { text-align: center; padding: 20px; font-size: 11px; color: #666; border-top: 1px solid #e0e0e0; margin-top: 40px; }
            .footer img { height: 24px; margin-bottom: 8px; }
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .metric-box { background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: 700; color: #059669; }
            .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
            ul { margin: 12px 0 12px 24px; }
            li { margin-bottom: 8px; }
            .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #059669; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
            .print-btn:hover { background: #047857; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="width: 48px; height: 48px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🌱</div>
              <div>
                <div style="font-size: 20px; font-weight: 700;">ESG Advisor</div>
                <div style="font-size: 12px; opacity: 0.8;">Strategic Screening Report</div>
              </div>
            </div>
            <h1>${initiative}</h1>
            <div class="subtitle">Generated on ${currentDate}</div>
            <div class="status-badge">${statusInfo.icon} ${statusInfo.status}</div>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">1. Executive Summary</div>
              <div class="section-content">
                <p>${executiveSummary.replace(/\n\n/g, '</p><p>')}</p>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">2. Gate Journey Overview</div>
              <div class="section-content">
                <h4 style="color: #059669; margin-bottom: 8px;">Gate 0: Strategic Screening — ${gate0Narrative.status}</h4>
                <p>${gate0Narrative.narrative}</p>
                ${gate0Narrative.details.length > 0 ? `
                <table>
                  <tr><th>Criterion</th><th>Score</th><th>Status</th></tr>
                  ${gate0Narrative.details.map(d => `<tr><td>${d.name}</td><td>${d.score?.toFixed(1) || 'N/A'}%</td><td class="${d.passed ? 'status-pass' : 'status-fail'}">${d.passed ? '✓ Pass' : '✗ Fail'}</td></tr>`).join('')}
                </table>
                ` : ''}
                
                <h4 style="color: #059669; margin: 24px 0 8px 0;">Gate 1: Business Case Test — ${gate1Narrative.status}</h4>
                <p>${gate1Narrative.narrative.replace(/\n\n/g, '</p><p>')}</p>
                ${gate1Narrative.financials && Object.values(gate1Narrative.financials).some(v => v) ? `
                <table>
                  <tr><th>Metric</th><th>Value</th></tr>
                  ${gate1Narrative.financials.capex ? `<tr><td>Capital Cost</td><td>S$${gate1Narrative.financials.capex.toLocaleString()}</td></tr>` : ''}
                  ${gate1Narrative.financials.annualSavings ? `<tr><td>Annual Savings</td><td>S$${gate1Narrative.financials.annualSavings.toLocaleString()}</td></tr>` : ''}
                  ${gate1Narrative.financials.npv ? `<tr><td>NPV</td><td>S$${gate1Narrative.financials.npv.toLocaleString()}</td></tr>` : ''}
                  ${gate1Narrative.financials.simplePayback ? `<tr><td>Payback Period</td><td>${gate1Narrative.financials.simplePayback} years</td></tr>` : ''}
                  ${gate1Narrative.financials.irr ? `<tr><td>IRR</td><td>${gate1Narrative.financials.irr}%</td></tr>` : ''}
                  ${gate1Narrative.financials.energySavings ? `<tr><td>Energy Savings</td><td>${gate1Narrative.financials.energySavings.toLocaleString()} kWh/year</td></tr>` : ''}
                  ${gate1Narrative.financials.carbonReduction ? `<tr><td>Carbon Reduction</td><td>${gate1Narrative.financials.carbonReduction} tCO2e/year</td></tr>` : ''}
                </table>
                ` : ''}
                
                <h4 style="color: #059669; margin: 24px 0 8px 0;">Gate 2: Commercial Lock-In — ${gate2Narrative.status}</h4>
                <p>${gate2Narrative.narrative.replace(/\n\n/g, '</p><p>')}</p>
                ${gate2Narrative.enablers.length > 0 ? `
                <table>
                  <tr><th>Enabler</th><th>Status</th></tr>
                  ${gate2Narrative.enablers.map(e => `<tr><td>${e.name}</td><td class="${e.status === 'Secured' ? 'status-pass' : 'status-pending'}">${e.status}</td></tr>`).join('')}
                </table>
                ` : ''}
                
                <h4 style="color: #059669; margin: 24px 0 8px 0;">Gate 3: Delivery & M&V — ${gate3Narrative.status}</h4>
                <p>${gate3Narrative.narrative.replace(/\n\n/g, '</p><p>')}</p>
                ${gate3Narrative.phases.length > 0 ? `
                <table>
                  <tr><th>Phase</th><th>Name</th><th>Status</th></tr>
                  ${gate3Narrative.phases.map(p => `<tr><td>${p.phase}</td><td>${p.name}</td><td class="${p.status === 'Complete' ? 'status-pass' : p.status === 'In Progress' ? 'status-pending' : ''}">${p.status}</td></tr>`).join('')}
                </table>
                ` : ''}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">3. M&V Route & Compliance</div>
              <div class="section-content">
                <div class="highlight-box">
                  <strong>Verification Approach:</strong> ${mvNarrative.status}
                </div>
                <p>${mvNarrative.narrative.replace(/\n\n/g, '</p><p>')}</p>
                <table>
                  <tr><th>Parameter</th><th>Value</th></tr>
                  <tr><td>M&V Route</td><td>${mvNarrative.details.route}</td></tr>
                  <tr><td>Baseline Period</td><td>${mvNarrative.details.baselinePeriod}</td></tr>
                  <tr><td>Normalisation</td><td>${mvNarrative.details.normalisation}</td></tr>
                  <tr><td>Reporting Frequency</td><td>${mvNarrative.details.reportingFrequency}</td></tr>
                </table>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">4. Risk & Change Control</div>
              <div class="section-content">
                ${changeControlNarrative.status === 'Material Change' ? '<div class="warning-box"><strong>⚠️ Material Change Recorded</strong></div>' : ''}
                <p>${changeControlNarrative.narrative.replace(/\n\n/g, '</p><p>')}</p>
                ${changeControlNarrative.risks.length > 0 ? `
                <h4 style="margin: 16px 0 8px 0;">Key Risks:</h4>
                <ul>${changeControlNarrative.risks.map(r => `<li>${r}</li>`).join('')}</ul>
                ` : ''}
                ${changeControlNarrative.mitigations.length > 0 ? `
                <h4 style="margin: 16px 0 8px 0;">Mitigation Actions:</h4>
                <ul>${changeControlNarrative.mitigations.map(m => `<li>${m}</li>`).join('')}</ul>
                ` : ''}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">5. Recommended Next Steps</div>
              <div class="section-content">
                <h4 style="margin-bottom: 8px;">Immediate Actions (Next 30 Days)</h4>
                <ul>${recommendedActions.immediate.map(a => `<li>${a}</li>`).join('')}</ul>
                
                <h4 style="margin: 16px 0 8px 0;">Medium-Term Actions (Next 90 Days)</h4>
                <ul>${recommendedActions.medium.map(a => `<li>${a}</li>`).join('')}</ul>
                
                <h4 style="margin: 16px 0 8px 0;">Settlement Requirements</h4>
                <ul>${recommendedActions.settlement.map(a => `<li>${a}</li>`).join('')}</ul>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">6. Data Sources & Completeness</div>
              <div class="section-content">
                ${dataCompleteness.overallComplete ? 
                  '<div class="highlight-box">✓ This report is based on complete inputs from all gates.</div>' : 
                  '<div class="warning-box">⚠️ Some inputs are pending. Report completeness will improve as gates are finished.</div>'
                }
                <table>
                  <tr><th>Gate</th><th>Data Item</th><th>Status</th></tr>
                  ${dataCompleteness.complete.map(c => `<tr><td>${c.gate}</td><td>${c.item}</td><td class="status-pass">✓ ${c.source}</td></tr>`).join('')}
                  ${dataCompleteness.missing.map(m => `<tr><td>${m.gate}</td><td>${m.item}</td><td class="status-pending">⏳ ${m.reason}</td></tr>`).join('')}
                </table>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 18px;">🌱</span>
              <span style="font-weight: 600; color: #059669;">ESG Advisor Bot</span>
            </div>
            <div>Generated on ${currentDate} | Strategic Screening Decision Support System</div>
            <div style="margin-top: 4px; font-size: 10px;">This report is for decision support purposes. Please consult with qualified professionals for final investment decisions.</div>
          </div>
          
          <script>
            // Auto-trigger print dialog when page loads
            window.onload = function() {
              // Small delay to ensure styles are loaded
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `;
      
      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ESG_Report_${initiative.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#10B981' }}>Final Summary Report</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Complete Initiative Assessment & Recommendations</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setView('gate3-wizard'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Dashboard</button>
            </div>
          </div>

          {/* Main Content */}
          <div id="summary-print-content" className="wizard-content" style={{ flex: 1, padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            
            {/* SECTION 1: Executive Summary Header */}
            <div style={{ background: statusInfo.bg, border: `2px solid ${statusInfo.color}`, borderRadius: '16px', padding: '28px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>INITIATIVE</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', lineHeight: '1.3' }}>{userQuestion || gate3Carryover?.proposedAction || 'Untitled Initiative'}</div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '24px' }}>
                  <div style={{ padding: '10px 20px', background: statusInfo.color, borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {statusInfo.icon} {statusInfo.status}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>{statusInfo.label}</div>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>EXECUTIVE SUMMARY</div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.7', margin: 0, textAlign: 'justify' }}>
                  {executiveSummary}
                </p>
              </div>
            </div>

            {/* SECTION 2: Gate Journey Overview */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🚀</span> Gate Journey Overview
              </div>
              
              {/* Gate 0 */}
              <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#10B981' }}>Gate 0: Strategic Screening</div>
                  <div style={{ padding: '4px 12px', background: gate0Narrative.status === 'ADOPT' ? 'rgba(16,185,129,0.2)' : gate0Narrative.status === 'RE-TEST' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: gate0Narrative.status === 'ADOPT' ? '#10B981' : gate0Narrative.status === 'RE-TEST' ? '#F59E0B' : '#EF4444' }}>
                    {gate0Narrative.status}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 16px 0', textAlign: 'justify' }}>
                  {gate0Narrative.narrative}
                </p>
                {gate0Narrative.details.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {gate0Narrative.details.map((d, idx) => (
                      <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: d.passed ? '#10B981' : '#EF4444' }}>{d.score?.toFixed(0) || 0}%</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.2' }}>{d.name?.split(' ').slice(0, 2).join(' ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Gate 1 */}
              <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(59,130,246,0.08)', borderRadius: '12px', borderLeft: '4px solid #3B82F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#3B82F6' }}>Gate 1: Business Case Test</div>
                  <div style={{ padding: '4px 12px', background: gate1Narrative.status === 'ADOPT' ? 'rgba(16,185,129,0.2)' : gate1Narrative.status === 'RE-TEST' ? 'rgba(245,158,11,0.2)' : gate1Narrative.status === 'Not Completed' ? 'rgba(100,100,100,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: gate1Narrative.status === 'ADOPT' ? '#10B981' : gate1Narrative.status === 'RE-TEST' ? '#F59E0B' : gate1Narrative.status === 'Not Completed' ? '#888' : '#EF4444' }}>
                    {gate1Narrative.status}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 16px 0', textAlign: 'justify' }}>
                  {gate1Narrative.narrative}
                </p>
                {gate1Narrative.financials && Object.values(gate1Narrative.financials).some(v => v) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {gate1Narrative.financials.npv && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>S${(gate1Narrative.financials.npv/1000).toFixed(0)}k</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>NPV</div>
                      </div>
                    )}
                    {gate1Narrative.financials.simplePayback && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#3B82F6' }}>{gate1Narrative.financials.simplePayback}y</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Payback</div>
                      </div>
                    )}
                    {gate1Narrative.financials.energySavings && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#F59E0B' }}>{(gate1Narrative.financials.energySavings/1000).toFixed(0)}k</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>kWh/yr</div>
                      </div>
                    )}
                    {gate1Narrative.financials.carbonReduction && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#8B5CF6' }}>{gate1Narrative.financials.carbonReduction}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>tCO2e/yr</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Gate 2 */}
              <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(139,92,246,0.08)', borderRadius: '12px', borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#8B5CF6' }}>Gate 2: Commercial & Contractual Lock-In</div>
                  <div style={{ padding: '4px 12px', background: gate2Narrative.status === 'All Locked' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: gate2Narrative.status === 'All Locked' ? '#10B981' : '#F59E0B' }}>
                    {gate2Narrative.status}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 16px 0', textAlign: 'justify' }}>
                  {gate2Narrative.narrative}
                </p>
                {gate2Narrative.enablers.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {gate2Narrative.enablers.map((e, idx) => (
                      <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '4px' }}>{e.status === 'Secured' ? '✓' : '○'}</div>
                        <div style={{ fontSize: '9px', color: e.status === 'Secured' ? '#10B981' : 'rgba(255,255,255,0.5)', lineHeight: '1.2' }}>{e.name?.split(' ').slice(0, 2).join(' ') || 'Enabler'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Gate 3 */}
              <div style={{ padding: '20px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#F59E0B' }}>Gate 3: Delivery & M&V Execution</div>
                  <div style={{ padding: '4px 12px', background: 'rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#F59E0B' }}>
                    {gate3Narrative.status}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 16px 0', textAlign: 'justify' }}>
                  {gate3Narrative.narrative}
                </p>
                {gate3Narrative.phases.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {gate3Narrative.phases.map((p, idx) => (
                      <div key={idx} style={{ flex: 1, padding: '10px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '4px', color: p.status === 'Complete' ? '#10B981' : p.status === 'In Progress' ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}>
                          {p.status === 'Complete' ? '✓' : p.status === 'In Progress' ? '◐' : '○'}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.2' }}>{p.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: M&V Route & Compliance */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📊</span> M&V Route & Compliance
              </div>
              
              <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>Verification Approach: {mvNarrative.status}</span>
              </div>
              
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 20px 0', textAlign: 'justify' }}>
                {mvNarrative.narrative}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>M&V ROUTE</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{mvNarrative.details.route}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>BASELINE PERIOD</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{mvNarrative.details.baselinePeriod}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>NORMALISATION</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{mvNarrative.details.normalisation}</div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>REPORTING</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{mvNarrative.details.reportingFrequency}</div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Risk & Change Control */}
            <div style={{ background: changeControlNarrative.status === 'Material Change' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: changeControlNarrative.status === 'Material Change' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span> Risk & Change Control
              </div>
              
              {changeControlNarrative.status === 'Material Change' && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#EF4444' }}>⚠️ Material Change Recorded - Revalidation Required</span>
                </div>
              )}
              
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', margin: '0 0 20px 0', textAlign: 'justify' }}>
                {changeControlNarrative.narrative}
              </p>
              
              {changeControlNarrative.risks.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', marginBottom: '10px' }}>Key Risks Identified:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {changeControlNarrative.risks.map((r, idx) => (
                      <div key={idx} style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                        • {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {changeControlNarrative.mitigations.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', marginBottom: '10px' }}>Mitigation Actions:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {changeControlNarrative.mitigations.map((m, idx) => (
                      <div key={idx} style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                        ✓ {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: Recommended Next Steps */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📋</span> Recommended Next Steps
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {/* Immediate Actions */}
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: '12px', borderTop: '3px solid #EF4444' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#EF4444', marginBottom: '12px' }}>IMMEDIATE (30 Days)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendedActions.immediate.map((a, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid rgba(239,68,68,0.3)' }}>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Medium-Term Actions */}
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', borderTop: '3px solid #F59E0B' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#F59E0B', marginBottom: '12px' }}>MEDIUM-TERM (90 Days)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendedActions.medium.map((a, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid rgba(245,158,11,0.3)' }}>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Settlement Requirements */}
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', borderTop: '3px solid #10B981' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#10B981', marginBottom: '12px' }}>SETTLEMENT</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recommendedActions.settlement.map((a, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', paddingLeft: '12px', borderLeft: '2px solid rgba(16,185,129,0.3)' }}>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: Data Sources & Completeness */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📈</span> Data Sources & Completeness
              </div>
              
              {dataCompleteness.overallComplete ? (
                <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#10B981' }}>✓ This report is based on complete inputs from all four gates.</span>
                </div>
              ) : (
                <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#F59E0B' }}>⏳ Some gate inputs are pending. Report completeness will improve as gates are finished.</span>
                </div>
              )}
              
              <div style={{ display: 'grid', gap: '10px' }}>
                {dataCompleteness.complete.map((c, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>{c.gate}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{c.item}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>✓ {c.source}</div>
                  </div>
                ))}
                {dataCompleteness.missing.map((m, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '16px', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#F59E0B' }}>{m.gate}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{m.item}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>⏳ {m.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', paddingBottom: '32px' }}>
              <button 
                onClick={exportToPDF}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📄 Download PDF Report
              </button>
              <button 
                onClick={clearChat}
                style={{
                  padding: '16px 32px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 Start New Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ==================== GATE 0 VIEWS ====================

  // GATE 0 CONTEXT PAGE - Collect user context before questionnaire
  if (view === 'gate0-context') {
    const isContextComplete = gate0Context.role && gate0Context.assetContext && gate0Context.projectStage && gate0Context.assetType;
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#10B981' }}>Gate 0: Strategic Screening</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step 1: Project Context</p>
            </div>
            <button onClick={() => { setView('chat'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Initiative Context */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>INITIATIVE BEING EVALUATED</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10B981' }}>"{userQuestion}"</div>
            </div>

            {/* Instructions */}
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                <strong style={{ color: '#3B82F6' }}>Why we need this:</strong> Your answers below determine which of the 25 screening questions apply to your situation. Some questions may not be applicable based on your role or project stage.
              </p>
            </div>

            {/* Context Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Role */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>What is your role?</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'developer', label: 'Developer / Owner / FM' },
                    { value: 'contractor', label: 'Contractor' },
                    { value: 'consultant', label: 'Consultant' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGate0Context(prev => ({ ...prev, role: opt.value }))}
                      style={{
                        padding: '12px 20px',
                        background: gate0Context.role === opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: gate0Context.role === opt.value ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: gate0Context.role === opt.value ? '#10B981' : 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Context */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>What is the asset context?</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'owner-occupied', label: 'Owner-Occupied' },
                    { value: 'tenanted', label: 'Tenanted' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGate0Context(prev => ({ ...prev, assetContext: opt.value }))}
                      style={{
                        padding: '12px 20px',
                        background: gate0Context.assetContext === opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: gate0Context.assetContext === opt.value ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: gate0Context.assetContext === opt.value ? '#10B981' : 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Stage */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>What is the project stage?</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'concept', label: 'Concept / Feasibility' },
                    { value: 'design', label: 'Design' },
                    { value: 'tender', label: 'Tender / Procurement' },
                    { value: 'construction', label: 'Construction' },
                    { value: 'operational', label: 'Operational' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGate0Context(prev => ({ ...prev, projectStage: opt.value }))}
                      style={{
                        padding: '12px 20px',
                        background: gate0Context.projectStage === opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: gate0Context.projectStage === opt.value ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: gate0Context.projectStage === opt.value ? '#10B981' : 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Type */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>What is the asset type?</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'new-build', label: 'New Build' },
                    { value: 'existing', label: 'Existing Building' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGate0Context(prev => ({ ...prev, assetType: opt.value }))}
                      style={{
                        padding: '12px 20px',
                        background: gate0Context.assetType === opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: gate0Context.assetType === opt.value ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: gate0Context.assetType === opt.value ? '#10B981' : 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={() => { setView('gate0-questionnaire'); resetScroll(); }}
                disabled={!isContextComplete}
                style={{
                  padding: '16px 48px',
                  background: isContextComplete ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: isContextComplete ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isContextComplete ? 'pointer' : 'not-allowed',
                  boxShadow: isContextComplete ? '0 4px 20px rgba(16,185,129,0.4)' : 'none'
                }}
              >
                Continue to Questions →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GATE 0 QUESTIONNAIRE PAGE
  if (view === 'gate0-questionnaire') {
    const checks = ['check1', 'check2', 'check3', 'check4', 'check5'];
    const totalAnswered = Object.keys(gate0Answers).length;
    const allAnswered = totalAnswered === 25;
    
    // Handle answer selection
    const handleAnswer = (questionId, answer) => {
      setGate0Answers(prev => {
        const newAnswers = { ...prev, [questionId]: answer };
        
        // Auto-NA for 4.4 if conditions met
        if (questionId === '4.3' && answer === 'na') {
          newAnswers['4.4'] = 'na';
        }
        if (questionId === '4.2' && answer === 'no') {
          newAnswers['4.4'] = 'na';
        }
        
        return newAnswers;
      });
    };
    
    // Submit and calculate results
    const handleSubmit = () => {
      const results = calculateGate0Scores(gate0Answers);
      setGate0Results(results);
      setView('gate0-results');
      resetScroll();
    };
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#10B981' }}>Gate 0: Strategic Screening</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step 2: Answer 25 Questions</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Progress: {totalAnswered}/25</span>
              <button onClick={() => { setView('gate0-context'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back</button>
            </div>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Initiative Context */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>EVALUATING</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10B981' }}>"{userQuestion}"</div>
            </div>

            {/* Questions by Check */}
            {checks.map((checkKey, checkIndex) => {
              const check = gate0Questions[checkKey];
              const checkAnswers = check.questions.filter(q => gate0Answers[q.id]).length;
              
              return (
                <div key={checkKey} style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  {/* Check Header */}
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>CHECK {checkIndex + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginLeft: '12px' }}>{check.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{checkAnswers}/5 answered</span>
                  </div>
                  
                  {/* Questions */}
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {check.questions.map((q, qIndex) => {
                      const answer = gate0Answers[q.id];
                      const naAllowed = isNAAllowed(q, gate0Context, gate0Answers);
                      const isAutoNA = q.id === '4.4' && (gate0Answers['4.3'] === 'na' || gate0Answers['4.2'] === 'no');
                      
                      return (
                        <div key={q.id} style={{ padding: '16px', background: answer ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', border: answer ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', minWidth: '32px' }}>{q.id}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{q.label}</div>
                              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>{q.question}</div>
                              {q.tooltip && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '11px', color: '#3B82F6', lineHeight: '1.4' }}>
                                  💡 {q.tooltip}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Answer Buttons */}
                          <div style={{ display: 'flex', gap: '10px', marginLeft: '44px' }}>
                            <button
                              onClick={() => handleAnswer(q.id, 'yes')}
                              disabled={isAutoNA}
                              style={{
                                padding: '10px 24px',
                                background: answer === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                                border: answer === 'yes' ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: answer === 'yes' ? '#10B981' : 'rgba(255,255,255,0.6)',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: isAutoNA ? 'not-allowed' : 'pointer',
                                opacity: isAutoNA ? 0.4 : 1
                              }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleAnswer(q.id, 'no')}
                              disabled={isAutoNA}
                              style={{
                                padding: '10px 24px',
                                background: answer === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                                border: answer === 'no' ? '2px solid #EF4444' : '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: answer === 'no' ? '#EF4444' : 'rgba(255,255,255,0.6)',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: isAutoNA ? 'not-allowed' : 'pointer',
                                opacity: isAutoNA ? 0.4 : 1
                              }}
                            >
                              No
                            </button>
                            {(naAllowed || isAutoNA) && (
                              <button
                                onClick={() => handleAnswer(q.id, 'na')}
                                style={{
                                  padding: '10px 24px',
                                  background: answer === 'na' ? 'rgba(107,114,128,0.2)' : 'rgba(255,255,255,0.05)',
                                  border: answer === 'na' ? '2px solid #6B7280' : '2px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  color: answer === 'na' ? '#9CA3AF' : 'rgba(255,255,255,0.6)',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                N/A
                              </button>
                            )}
                          </div>
                          {isAutoNA && (
                            <div style={{ marginLeft: '44px', marginTop: '8px', fontSize: '11px', color: '#6B7280' }}>
                              Auto N/A: Based on previous answers
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Submit Button */}
            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                {allAnswered ? '✅ All questions answered!' : `${25 - totalAnswered} questions remaining`}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                style={{
                  padding: '16px 48px',
                  background: allAnswered ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: allAnswered ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                  boxShadow: allAnswered ? '0 4px 20px rgba(16,185,129,0.4)' : 'none'
                }}
              >
                Calculate Results →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GATE 0 RESULTS PAGE
  if (view === 'gate0-results' && gate0Results) {
    const { checks, totalYes, totalApplicable, totalQuestions, totalPercentage, passedCount, decision, failingCheck } = gate0Results;
    
    // Generate explanations based on answers
    const explanations = generateGate0Explanations(gate0Results, gate0Answers);
    const checkKeys = ['check1', 'check2', 'check3', 'check4', 'check5'];
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#10B981' }}>Gate 0: Results</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Strategic Screening Complete</p>
            </div>
            <button onClick={() => { setView('chat'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Chat</button>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Initiative */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>INITIATIVE EVALUATED</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10B981' }}>"{userQuestion}"</div>
            </div>

            {/* Decision Box - Moved to top */}
            <div style={{ background: decision.bg, border: `2px solid ${decision.color}`, borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>DECISION</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: decision.color, marginBottom: '12px' }}>{decision.emoji} {decision.text}</div>
              
              {decision.text === 'ADOPT' && (
                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  All 5 criteria passed (≥80%). This initiative passes Gate 0 and can proceed to Gate 1: Business Case Test.
                </p>
              )}
              {decision.text === 'TEST' && failingCheck && (
                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  4/5 criteria passed. "{failingCheck.name}" requires further evaluation before proceeding.
                </p>
              )}
              {decision.text === 'REJECT' && (
                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  Only {passedCount}/5 criteria passed. This initiative does not meet the threshold for strategic fit.
                </p>
              )}
            </div>

            {/* Coverage Summary */}
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#3B82F6', fontWeight: '600' }}>
                Coverage: {totalApplicable}/{totalQuestions} questions applicable ({totalQuestions - totalApplicable} N/A)
              </div>
            </div>

            {/* Results Table */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 80px', gap: '8px', padding: '14px 20px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                <span>Check</span>
                <span style={{ textAlign: 'center' }}>Yes</span>
                <span style={{ textAlign: 'center' }}>Applicable</span>
                <span style={{ textAlign: 'center' }}>Score</span>
                <span style={{ textAlign: 'center' }}>Status</span>
              </div>
              
              {/* Rows */}
              {checks.map((check, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 80px', gap: '8px', padding: '14px 20px', borderBottom: i < checks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{check.checkNumber}. {check.name}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{check.yesCount}</span>
                  <span style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{check.applicableCount}</span>
                  <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', fontFamily: 'monospace', color: check.passed ? '#10B981' : '#EF4444' }}>{check.percentage}%</span>
                  <span style={{ textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', background: check.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: check.passed ? '#10B981' : '#EF4444' }}>
                      {check.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </span>
                </div>
              ))}
              
              {/* Total Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 80px', gap: '8px', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', alignItems: 'center', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>TOTAL</span>
                <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{totalYes}</span>
                <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{totalApplicable}</span>
                <span style={{ textAlign: 'center', fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: decision.color }}>{totalPercentage}%</span>
                <span style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700', color: decision.color }}>{passedCount}/5</span>
              </div>
            </div>

            {/* AI-Generated Analysis Section */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#A78BFA' }}>AI-Generated Analysis</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Based on Project Knowledge and industry best practices</div>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '20px' }}>
                {/* Show relevant explanations based on decision */}
                {checks.map((check, i) => {
                  const checkKey = checkKeys[i];
                  const explanation = explanations[checkKey];
                  
                  // For ADOPT: Show checks that aren't 100%
                  // For RE-TEST: Show the failing check prominently
                  // For REJECT: Show all failing checks
                  const shouldShow = 
                    (decision.text === 'ADOPT' && explanation.type === 'improvement') ||
                    (decision.text === 'TEST' && !check.passed) ||
                    (decision.text === 'REJECT' && !check.passed);
                  
                  if (!shouldShow) return null;
                  
                  return (
                    <div key={checkKey} style={{ marginBottom: i < checks.length - 1 ? '20px' : 0, padding: '16px', background: check.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderRadius: '10px', border: `1px solid ${check.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{check.passed ? '⚠️' : '❌'}</span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: check.passed ? '#F59E0B' : '#EF4444' }}>
                            {check.name}: {check.percentage}%
                          </span>
                        </div>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', background: check.passed ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: check.passed ? '#F59E0B' : '#EF4444' }}>
                          {check.passed ? 'ROOM FOR IMPROVEMENT' : 'FAILED'}
                        </span>
                      </div>
                      
                      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                        {explanation.summary}
                      </p>
                      
                      {explanation.gaps && explanation.gaps.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase' }}>
                            {check.passed ? 'Areas to Strengthen' : 'Reasons for Failure'}
                          </div>
                          {explanation.gaps.map((gap, j) => (
                            <div key={j} style={{ marginBottom: j < explanation.gaps.length - 1 ? '12px' : 0, padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>
                                {gap.id}. {gap.label}
                              </div>
                              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                                {gap.reason}
                              </p>
                              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                                {gap.context}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '10px', padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px' }}>
                                <span style={{ fontSize: '12px' }}>💡</span>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#3B82F6', marginBottom: '2px' }}>Recommendation</div>
                                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{gap.recommendation}</div>
                                </div>
                              </div>
                              <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                📄 Source: {gap.source}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* For ADOPT - show what's good */}
                {decision.text === 'ADOPT' && checks.filter(c => c.percentage === 100).length > 0 && (
                  <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '16px' }}>✅</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#10B981' }}>Strong Performance Areas</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {checks.filter(c => c.percentage === 100).map((check, i) => (
                        <span key={i} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.2)', borderRadius: '6px', fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                          {check.name}: 100%
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>
                      These criteria achieved full scores, indicating strong alignment with requirements and best practices.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {decision.text === 'ADOPT' && (
                <button
                  onClick={() => {
                    // Generate summary and proceed to Gate 1
                    const summary = generateGateSummary(0, {
                      question: userQuestion,
                      scorecard: { scores: checks.map(c => ({ criterion: c.name, score: c.passed ? 4 : 3 })) },
                      evalPath: { wasRetest: false }
                    });
                    
                    if (summary) {
                      setGateSummaries(prev => ({ ...prev, gate0: summary }));
                      setMessages(prev => [...prev, {
                        id: Date.now(),
                        type: 'bot',
                        content: { type: 'summary', summary: summary },
                        isText: false
                      }]);
                    }
                    
                    setCurrentGate(1);
                    setView('chat');
                    resetScroll();
                  }}
                  style={{
                    padding: '16px 48px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(16,185,129,0.4)'
                  }}
                >
                  Proceed to Gate 1 →
                </button>
              )}
              
              {decision.text === 'TEST' && failingCheck && (
                <button
                  onClick={() => {
                    // Find the checkKey for the failing check
                    const checkKeys = ['check1', 'check2', 'check3', 'check4', 'check5'];
                    const failingIndex = checks.findIndex(c => !c.passed);
                    const checkKey = checkKeys[failingIndex];
                    
                    // Find questions that were answered "No" for this check
                    const failedQs = gate0Questions[checkKey].questions.filter(
                      q => gate0Answers[q.id] === 'no'
                    );
                    
                    // Set up RE-TEST plan
                    setReTestPlan(prev => ({
                      ...prev,
                      checkName: failingCheck.name,
                      checkKey: checkKey
                    }));
                    setReTestFailedQuestions(failedQs);
                    setReTestStatus('defining');
                    setView('retest-define');
                    resetScroll();
                  }}
                  style={{
                    padding: '16px 48px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(245,158,11,0.4)'
                  }}
                >
                  📋 Start Test Plan
                </button>
              )}
              
              {decision.text === 'REJECT' && (
                <button
                  onClick={clearChat}
                  style={{
                    padding: '16px 48px',
                    background: 'rgba(239,68,68,0.2)',
                    border: '2px solid #EF4444',
                    borderRadius: '12px',
                    color: '#EF4444',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Start New Evaluation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RE-TEST WORKFLOW PAGES ====================

  // Validation method options for RE-TEST
  const validationMethods = [
    { value: 'document', label: 'Document verification', desc: 'Policy, tender clause, mandate evidence' },
    { value: 'commercial', label: 'Commercial validation', desc: 'Counterparty willingness / draft clause' },
    { value: 'business-case', label: 'Desktop business case', desc: 'Numbers + sensitivity analysis' },
    { value: 'site-feasibility', label: 'Site feasibility review', desc: 'Space, access, downtime assessment' },
    { value: 'metering', label: 'Metering/data readiness check', desc: 'Baseline + access + M&V plan' },
    { value: 'vendor', label: 'Vendor quotation / technical proposal', desc: 'Formal quotes and specs' },
    { value: 'other', label: 'Other', desc: 'Specify your own method' }
  ];

  // Pass criterion examples by check
  const passCriterionExamples = {
    check1: '"Written mandate confirmed in tender/board memo"',
    check2: '"Sponsor confirms alignment + approves as portfolio priority"',
    check3: '"Counterparty agrees to include clause X in draft contract"',
    check4: '"Payback ≤ 3 years" or "NPV ≥ 0 at WACC"',
    check5: '"Site has space + access; shutdown window approved"'
  };

  // STEP A: Define the Re-Test
  if (view === 'retest-define') {
    const isFormComplete = reTestPlan.validationMethods.length > 0 && reTestPlan.startDate && reTestPlan.targetDate && reTestPlan.passCriterion;
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#F59E0B' }}>Follow-Up Action Plan</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step A: Define the Test</p>
            </div>
            <button onClick={() => { setView('gate0-results'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back to Results</button>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Status Banner */}
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: '#F59E0B', marginBottom: '8px' }}>TEST REQUIRED (1 CHECK FAILED)</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                <strong>Objective:</strong> Convert "{reTestPlan.checkName}" check into a clear Pass/Fail with additional evidence.
              </div>
            </div>

            {/* Which Check Failed */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>A1. CHECK BEING TESTED</div>
              <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#EF4444' }}>{reTestPlan.checkName}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                  {reTestFailedQuestions.length} question(s) answered "No":
                </div>
                <div style={{ marginTop: '8px' }}>
                  {reTestFailedQuestions.map((q, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', padding: '4px 0', borderBottom: i < reTestFailedQuestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      • {q.id}: {q.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Method - Multi-select */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>A2. VALIDATION METHOD *</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>How will you validate this check? (Select all that apply)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {validationMethods.map(method => {
                  const isSelected = reTestPlan.validationMethods.includes(method.value);
                  return (
                  <button
                    key={method.value}
                    onClick={() => setReTestPlan(prev => ({
                      ...prev,
                      validationMethods: isSelected
                        ? prev.validationMethods.filter(m => m !== method.value)
                        : [...prev.validationMethods, method.value]
                    }))}
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.8)' }}>{method.label}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{method.desc}</div>
                    </div>
                    {isSelected && <span style={{ color: '#F59E0B', fontSize: '16px' }}>✓</span>}
                  </button>
                  );
                })}
              </div>
              {reTestPlan.validationMethods.includes('other') && (
                <input
                  type="text"
                  placeholder="Describe your validation method..."
                  value={reTestPlan.validationMethodOther}
                  onChange={(e) => setReTestPlan(prev => ({ ...prev, validationMethodOther: e.target.value }))}
                  style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                />
              )}
            </div>

            {/* Time-box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>A3. TIME-BOX *</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>Start Date</label>
                  <input
                    type="date"
                    value={reTestPlan.startDate}
                    onChange={(e) => setReTestPlan(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>Target Decision Date</label>
                  <input
                    type="date"
                    value={reTestPlan.targetDate}
                    onChange={(e) => setReTestPlan(prev => ({ ...prev, targetDate: e.target.value }))}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            {/* Budget Cap */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>A4. BUDGET CAP (OPTIONAL)</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Rough budget for the validation effort</div>
              <input
                type="text"
                placeholder="e.g., <$5k, $5-20k, >$20k, or specific amount"
                value={reTestPlan.budgetCap}
                onChange={(e) => setReTestPlan(prev => ({ ...prev, budgetCap: e.target.value }))}
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
              />
            </div>

            {/* Pass Criterion */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>A5. PASS CRITERION * (CRITICAL)</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Define the threshold that determines Pass vs Fail for this check.</div>
              <div style={{ padding: '10px 12px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: '#3B82F6' }}>
                  💡 Example for {reTestPlan.checkName}: {passCriterionExamples[reTestPlan.checkKey] || '"Specific measurable outcome"'}
                </div>
              </div>
              <textarea
                placeholder="Enter your pass criterion..."
                value={reTestPlan.passCriterion}
                onChange={(e) => setReTestPlan(prev => ({ ...prev, passCriterion: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  setReTestStatus('pending');
                  setView('retest-pending');
                  resetScroll();
                }}
                disabled={!isFormComplete}
                style={{
                  padding: '16px 48px',
                  background: isFormComplete ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: isFormComplete ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isFormComplete ? 'pointer' : 'not-allowed',
                  boxShadow: isFormComplete ? '0 4px 20px rgba(245,158,11,0.4)' : 'none'
                }}
              >
                Submit Test Plan →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP B: Re-Test Pending (User conducts offline)
  if (view === 'retest-pending') {
    const methodLabels = reTestPlan.validationMethods
      .map(m => validationMethods.find(vm => vm.value === m)?.label || (m === 'other' ? reTestPlan.validationMethodOther : m))
      .join(', ');
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#F59E0B' }}>Test In Progress</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step B: Conduct Test (Offline)</p>
            </div>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Pending Status Card */}
            <div style={{ maxWidth: '600px', width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B', margin: '0 0 8px 0' }}>Test Pending</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Complete your validation offline and return when ready to input results.</p>
              </div>

              {/* Plan Summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>YOUR TEST PLAN</div>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'start' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Check:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444' }}>{reTestPlan.checkName}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'start' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Method(s):</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{methodLabels}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'start' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Time-box:</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{reTestPlan.startDate} → {reTestPlan.targetDate}</span>
                  </div>
                  {reTestPlan.budgetCap && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'start' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Budget:</span>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{reTestPlan.budgetCap}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'start' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Pass Criterion:</span>
                    <span style={{ fontSize: '13px', color: '#10B981', fontWeight: '500' }}>"{reTestPlan.passCriterion}"</span>
                  </div>
                </div>
              </div>

              {/* Questions to Resolve */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>QUESTIONS TO RESOLVE</div>
                {reTestFailedQuestions.map((q, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', marginBottom: i < reTestFailedQuestions.length - 1 ? '8px' : 0, border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#EF4444', marginBottom: '4px' }}>{q.id}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{q.question}</div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setReTestStatus('defining');
                    setView('retest-define');
                    resetScroll();
                  }}
                  style={{
                    padding: '14px 28px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ← Edit Plan
                </button>
                <button
                  onClick={() => {
                    setReTestStatus('completing');
                    setView('retest-complete');
                    resetScroll();
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
                  }}
                >
                  ✓ I've Completed the Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP C: Re-Test Completion Input
  if (view === 'retest-complete') {
    const allQuestionsAnswered = reTestFailedQuestions.every(q => reTestAnswers[q.id]);
    const canSubmit = reTestCompletion.completed === true && reTestCompletion.outcome && allQuestionsAnswered;
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#F59E0B' }}>Test Results</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Step C: Input Test Results</p>
            </div>
            <button onClick={() => { setView('retest-pending'); resetScroll(); }} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← Back</button>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px' }}>
            {/* Pass Criterion Reminder */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#10B981', marginBottom: '6px' }}>YOUR PASS CRITERION</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>"{reTestPlan.passCriterion}"</div>
            </div>

            {/* C1: Did you complete the Re-Test? */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>C1. DID YOU COMPLETE THE TEST? *</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setReTestCompletion(prev => ({ ...prev, completed: true }))}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: reTestCompletion.completed === true ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.02)',
                    border: reTestCompletion.completed === true ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: reTestCompletion.completed === true ? '#10B981' : 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setReTestCompletion(prev => ({ ...prev, completed: false, outcome: null }))}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: reTestCompletion.completed === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.02)',
                    border: reTestCompletion.completed === false ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: reTestCompletion.completed === false ? '#EF4444' : 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  No
                </button>
              </div>
              {reTestCompletion.completed === false && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#F59E0B' }}>
                    ⚠️ Test not completed. Status will remain "Pending". Return when you've completed the validation.
                  </p>
                </div>
              )}
            </div>

            {/* Only show if completed = true */}
            {reTestCompletion.completed === true && (
              <>
                {/* C2: Outcome */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>C2. OUTCOME AGAINST YOUR PASS CRITERION *</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setReTestCompletion(prev => ({ ...prev, outcome: 'pass' }))}
                      style={{
                        flex: 1,
                        padding: '20px',
                        background: reTestCompletion.outcome === 'pass' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.02)',
                        border: reTestCompletion.outcome === 'pass' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: reTestCompletion.outcome === 'pass' ? '#10B981' : 'rgba(255,255,255,0.6)',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>✅</span>
                      PASS
                    </button>
                    <button
                      onClick={() => setReTestCompletion(prev => ({ ...prev, outcome: 'fail' }))}
                      style={{
                        flex: 1,
                        padding: '20px',
                        background: reTestCompletion.outcome === 'fail' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.02)',
                        border: reTestCompletion.outcome === 'fail' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: reTestCompletion.outcome === 'fail' ? '#EF4444' : 'rgba(255,255,255,0.6)',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>❌</span>
                      FAIL
                    </button>
                  </div>
                </div>

                {/* C3: Evidence */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>C3. EVIDENCE (OPTIONAL)</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Brief summary and/or link to supporting documentation</div>
                  <textarea
                    placeholder="e.g., Email confirmation from sponsor dated 15 Jan, board memo reference BM-2025-012, draft contract clause v2.1..."
                    value={reTestCompletion.evidence}
                    onChange={(e) => setReTestCompletion(prev => ({ ...prev, evidence: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>

                {/* C4: Re-answer failed questions */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>C4. RE-ANSWER FAILED QUESTIONS *</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>Based on your Test evidence, update your answers to the questions that previously failed.</div>
                  
                  {reTestFailedQuestions.map((q, i) => (
                    <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: i < reTestFailedQuestions.length - 1 ? '12px' : 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', marginBottom: '6px' }}>{q.id}: {q.label}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '12px', lineHeight: '1.5' }}>{q.question}</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => setReTestAnswers(prev => ({ ...prev, [q.id]: 'yes' }))}
                          style={{
                            padding: '10px 24px',
                            background: reTestAnswers[q.id] === 'yes' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                            border: reTestAnswers[q.id] === 'yes' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: reTestAnswers[q.id] === 'yes' ? '#10B981' : 'rgba(255,255,255,0.6)',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setReTestAnswers(prev => ({ ...prev, [q.id]: 'no' }))}
                          style={{
                            padding: '10px 24px',
                            background: reTestAnswers[q.id] === 'no' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                            border: reTestAnswers[q.id] === 'no' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: reTestAnswers[q.id] === 'no' ? '#EF4444' : 'rgba(255,255,255,0.6)',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Submit Button */}
            <div style={{ textAlign: 'center' }}>
              {reTestCompletion.completed === false ? (
                <button
                  onClick={() => { setView('retest-pending'); resetScroll(); }}
                  style={{
                    padding: '16px 48px',
                    background: 'rgba(245,158,11,0.2)',
                    border: '2px solid #F59E0B',
                    borderRadius: '12px',
                    color: '#F59E0B',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Return to Pending
                </button>
              ) : (
                <button
                  onClick={() => {
                    setReTestStatus('done');
                    setView('retest-result');
                    resetScroll();
                  }}
                  disabled={!canSubmit}
                  style={{
                    padding: '16px 48px',
                    background: canSubmit ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '12px',
                    color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    boxShadow: canSubmit ? '0 4px 20px rgba(245,158,11,0.4)' : 'none'
                  }}
                >
                  Submit Test Results →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RE-TEST RESULT PAGE
  if (view === 'retest-result') {
    const isPassed = reTestCompletion.outcome === 'pass';
    
    // Calculate how many of the re-answered questions are now "Yes"
    const yesCount = reTestFailedQuestions.filter(q => reTestAnswers[q.id] === 'yes').length;
    const totalReAnswered = reTestFailedQuestions.length;
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div className="wizard-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: isPassed ? '#10B981' : '#EF4444' }}>Test {isPassed ? 'Passed' : 'Failed'}</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Final Decision</p>
            </div>
          </div>

          <div className="wizard-content" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: '600px', width: '100%' }}>
              {/* Result Banner */}
              <div style={{ 
                background: isPassed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', 
                border: `2px solid ${isPassed ? '#10B981' : '#EF4444'}`, 
                borderRadius: '16px', 
                padding: '32px', 
                textAlign: 'center', 
                marginBottom: '24px' 
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{isPassed ? '🎉' : '😔'}</div>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: isPassed ? '#10B981' : '#EF4444', margin: '0 0 12px 0' }}>
                  {isPassed ? 'TEST PASSED!' : 'TEST FAILED'}
                </h2>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.6' }}>
                  {isPassed 
                    ? `"${reTestPlan.checkName}" check has been validated. Your initiative is now approved to proceed to Gate 1: Business Case Test.`
                    : `"${reTestPlan.checkName}" check did not meet your pass criterion. This initiative cannot proceed to Gate 1 at this time.`
                  }
                </p>
              </div>

              {/* Summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>TEST SUMMARY</div>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Check Tested:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{reTestPlan.checkName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Pass Criterion:</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>"{reTestPlan.passCriterion}"</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Outcome:</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: isPassed ? '#10B981' : '#EF4444' }}>{isPassed ? 'PASS' : 'FAIL'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Questions Resolved:</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{yesCount}/{totalReAnswered} now "Yes"</span>
                  </div>
                  {reTestCompletion.evidence && (
                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#3B82F6', marginBottom: '4px' }}>Evidence:</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{reTestCompletion.evidence}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* What happens next */}
              <div style={{ background: isPassed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '12px', padding: '20px', border: `1px solid ${isPassed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, marginBottom: '32px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: isPassed ? '#10B981' : '#EF4444', marginBottom: '8px' }}>
                  {isPassed ? 'NEXT STEPS' : 'RECOMMENDATION'}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.6' }}>
                  {isPassed 
                    ? 'Your initiative has passed Gate 0 Strategic Screening. Proceed to Gate 1 to build the business case and compare against baseline.'
                    : 'Consider revisiting this initiative when the underlying conditions change. Review the failed questions and address the gaps before re-evaluating.'
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                {isPassed ? (
                  <button
                    onClick={() => {
                      // Update gate0Answers with the re-test answers
                      const updatedAnswers = { ...gate0Answers };
                      Object.keys(reTestAnswers).forEach(key => {
                        updatedAnswers[key] = reTestAnswers[key];
                      });
                      setGate0Answers(updatedAnswers);
                      
                      // Recalculate and update results
                      const newResults = calculateGate0Scores(updatedAnswers);
                      setGate0Results(newResults);
                      
                      // Generate summary for Gate 0
                      const summary = generateGateSummary(0, {
                        question: userQuestion,
                        scorecard: { scores: newResults.checks.map(c => ({ criterion: c.name, score: c.passed ? 4 : 3 })) },
                        evalPath: { wasRetest: true, retestCriterion: reTestPlan.checkName }
                      });
                      
                      if (summary) {
                        setGateSummaries(prev => ({ ...prev, gate0: summary }));
                        setMessages(prev => [...prev, {
                          id: Date.now(),
                          type: 'bot',
                          content: { type: 'summary', summary: summary },
                          isText: false
                        }]);
                      }
                      
                      // Move to Gate 1
                      setCurrentGate(1);
                      setView('chat');
                      resetScroll();
                    }}
                    style={{
                      padding: '16px 48px',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(16,185,129,0.4)'
                    }}
                  >
                    Proceed to Gate 1 →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        // Reset re-test state and go back to results
                        setReTestPlan({
                          checkName: null,
                          checkKey: null,
                          validationMethod: null,
                          validationMethodOther: '',
                          startDate: '',
                          targetDate: '',
                          budgetCap: '',
                          passCriterion: ''
                        });
                        setReTestStatus('defining');
                        setReTestFailedQuestions([]);
                        setReTestAnswers({});
                        setReTestCompletion({ completed: null, outcome: null, evidence: '' });
                        setView('gate0-results');
                        resetScroll();
                      }}
                      style={{
                        padding: '14px 28px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ← Back to Results
                    </button>
                    <button
                      onClick={clearChat}
                      style={{
                        padding: '14px 32px',
                        background: 'rgba(239,68,68,0.2)',
                        border: '2px solid #EF4444',
                        borderRadius: '10px',
                        color: '#EF4444',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Start New Evaluation
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADOPT PAGE
  if (view === 'adopt') {
    const handleProceedToNextGate = () => {
      // Generate summary for the current gate before moving to next
      const summary = generateGateSummary(currentGate, {
        question: userQuestion,
        scorecard: scorecardData,
        evalPath: {
          wasRetest: true,
          resolvedCriterion: evalData?.lowestCriterion || 'evaluated criterion'
        }
      });
      
      // Store the summary
      if (summary) {
        setGateSummaries(prev => ({
          ...prev,
          [`gate${currentGate}`]: summary
        }));
        
        // Add summary message to chat
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: { type: 'summary', summary: summary },
          isText: false
        }]);
      }
      
      setCurrentGate(prev => prev + 1);
      setView('chat');
      setEvalData(null);
      setEvalAnswers({});
      setSelectedRole(null);
      setExpandedSummary(false);
    };
    
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ width: '100px', height: '100px', background: 'rgba(16,185,129,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', margin: '0 auto 32px' }}>🎉</div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#10B981', margin: '0 0 16px' }}>Gate {currentGate} Passed!</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: '0 0 32px' }}>
              Based on your evaluation responses, this initiative has been upgraded from <span style={{ color: '#F59E0B', fontWeight: '700' }}>{currentGate === 0 ? 'TEST' : 'TEST'}</span> to <span style={{ color: '#10B981', fontWeight: '700' }}>ADOPT</span>.
            </p>
            
            {userQuestion && (
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>INITIATIVE BEING EVALUATED</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>"{userQuestion}"</div>
              </div>
            )}
            
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>EVALUATION SUMMARY</div>
              {Object.entries(evalAnswers).filter(([_, v]) => v).map(([id, _], i) => {
                const question = evalData?.questions?.find(q => q.id === id);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#10B981', fontSize: '18px' }}>✓</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{question?.text || 'Requirement confirmed'}</span>
                  </div>
                );
              })}
            </div>
            
            <button onClick={handleProceedToNextGate} style={{ padding: '16px 48px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
              Proceed to Gate {currentGate + 1} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REJECT PAGE
  if (view === 'reject') {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ width: '100px', height: '100px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', margin: '0 auto 32px' }}>❌</div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#EF4444', margin: '0 0 16px' }}>Initiative Not Approved</h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: '0 0 32px' }}>
              Based on your evaluation responses, this initiative cannot be upgraded from <span style={{ color: '#F59E0B', fontWeight: '700' }}>TEST</span> status. Consider addressing the gaps before re-evaluating.
            </p>
            
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>WHAT'S MISSING</div>
              {Object.entries(evalAnswers).filter(([_, v]) => !v).length > 0 ? (
                Object.entries(evalAnswers).filter(([_, v]) => !v).map(([id, _], i) => {
                  const question = evalData?.questions?.find(q => q.id === id);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ color: '#EF4444', fontSize: '18px' }}>✗</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{question?.text || 'Requirement not met'}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>One or more requirements were not met</div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => { setView('evaluate'); setEvalAnswers({}); }} style={{ padding: '16px 32px', background: 'rgba(245,158,11,0.2)', border: '2px solid #F59E0B', borderRadius: '12px', color: '#F59E0B', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                Try Again
              </button>
              <button onClick={() => { setView('chat'); setEvalData(null); setEvalAnswers({}); }} style={{ padding: '16px 32px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                Return to Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN CHAT VIEW
  return (
    <div style={{ display: 'flex', minHeight: '100vh', height: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E293B)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E2E8F0' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#fff' }}>ESG Decision Scoring</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>AI-powered sustainability investment analysis</p>
          </div>
          <button onClick={clearChat} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>🗑️ Clear Chat</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
              {msg.type === 'user' ? (
                <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '12px 18px', borderRadius: '18px 18px 4px 18px', maxWidth: '70%', fontSize: '14px' }}><p style={{ margin: 0 }}>{msg.content}</p></div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', maxWidth: '90%' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(16,185,129,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🌱</div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 20px', borderRadius: '4px 18px 18px 18px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '14px', lineHeight: '1.5' }}><BotMsg msg={msg} /></div>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(16,185,129,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🌱</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 20px', borderRadius: '4px 18px 18px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Analyzing with Project Knowledge + Web Search</span>
                  <span style={{ display: 'inline-flex', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }}></span>
                    <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }}></span>
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Bottom section - always at the very bottom */}
        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          {/* Gate 1: Run Business Case Test button */}
          {currentGate === 1 && userQuestion && (
            <div style={{ padding: '16px 24px', background: 'rgba(139,92,246,0.1)', borderTop: '1px solid rgba(139,92,246,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>GATE 1: READY TO TEST</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>"{userQuestion}"</div>
                </div>
                <button
                  onClick={() => {
                    // Pre-fill the proposed action from userQuestion
                    setGate1Inputs(prev => ({
                      ...prev,
                      setup: {
                        ...prev.setup,
                        proposedAction: userQuestion
                      }
                    }));
                    setView('gate1-wizard');
                  }}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🧪 Run Business Case Test
                </button>
              </div>
            </div>
          )}
          
          {/* Gate 2: Commercial Lock-In button */}
          {currentGate === 2 && userQuestion && (
            <div style={{ padding: '16px 24px', background: 'rgba(59,130,246,0.1)', borderTop: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>GATE 2: READY FOR LOCK-IN</div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>"{userQuestion}"</div>
                </div>
                <button
                  onClick={() => {
                    // Pre-fill carryover from Gate 1 data if available
                    setGate2Carryover(prev => ({
                      ...prev,
                      proposedAction: userQuestion || '',
                      role: gate1Inputs?.setup?.role || null,
                      gate1Metric: gate1Inputs?.decisionRule?.thresholdType || null,
                      gate1Result: gate1Results?.decision === 'ADOPT' ? 'above' : 'borderline'
                    }));
                    setView('gate2-wizard');
                  }}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔒 Start Commercial Lock-In
                </button>
              </div>
            </div>
          )}
          
          {messages.length === 1 && currentGate === 0 && (
            <div style={{ padding: '0 24px 12px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>Try asking:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {["Should we use recycled concrete?", "Is rainwater harvesting worth it?", "Should we install EV chargers?", "Should we install solar PV?"].map((q, i) => (
                  <button key={i} onClick={() => setInputValue(q)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '10px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '16px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={currentGate === 1 ? "Ask follow-up questions about your initiative..." : currentGate === 2 ? "Ask questions about commercial terms..." : "Ask any ESG decision question... (e.g., Should we install solar panels?)"} disabled={isTyping} style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 14px', fontSize: '14px', color: '#E2E8F0', outline: 'none', opacity: isTyping ? 0.5 : 1 }} />
              <button onClick={send} disabled={!inputValue.trim() || isTyping} style={{ width: '48px', height: '48px', background: inputValue.trim() && !isTyping ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', color: 'white', cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>➤</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
        input::placeholder { color: rgba(255,255,255,0.4); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 3px; }
        html, body, #root { 
          min-height: 100vh;
          margin: 0; 
          padding: 0; 
          background: linear-gradient(135deg, #0F172A, #1E293B); 
        }
        body {
          overscroll-behavior-y: none;
        }
        .wizard-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(15,23,42,0.98);
          backdrop-filter: blur(10px);
        }
        .wizard-footer {
          position: sticky;
          bottom: 0;
          z-index: 100;
          background: rgba(15,23,42,0.98);
          backdrop-filter: blur(10px);
          margin-top: auto;
        }
        .wizard-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
