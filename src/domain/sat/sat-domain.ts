import type { SatPrepConfig } from '@/config/sat-prep';

/**
 * SAT content domains (docs: College Board "Knowledge and Skills" report) and
 * a priority ranking derived from real attempt-over-attempt score-band
 * evidence — never from self-reported confidence, per the same rule the board
 * readiness engine follows.
 */

export const SAT_SECTIONS = ['READING_WRITING', 'MATH'] as const;
export type SatSection = (typeof SAT_SECTIONS)[number];

export const SAT_DOMAINS = [
  'INFORMATION_AND_IDEAS',
  'CRAFT_AND_STRUCTURE',
  'EXPRESSION_OF_IDEAS',
  'STANDARD_ENGLISH_CONVENTIONS',
  'ALGEBRA',
  'ADVANCED_MATH',
  'PROBLEM_SOLVING_DATA_ANALYSIS',
  'GEOMETRY_TRIGONOMETRY',
] as const;
export type SatDomain = (typeof SAT_DOMAINS)[number];

export const SAT_DOMAIN_SECTION: Record<SatDomain, SatSection> = {
  INFORMATION_AND_IDEAS: 'READING_WRITING',
  CRAFT_AND_STRUCTURE: 'READING_WRITING',
  EXPRESSION_OF_IDEAS: 'READING_WRITING',
  STANDARD_ENGLISH_CONVENTIONS: 'READING_WRITING',
  ALGEBRA: 'MATH',
  ADVANCED_MATH: 'MATH',
  PROBLEM_SOLVING_DATA_ANALYSIS: 'MATH',
  GEOMETRY_TRIGONOMETRY: 'MATH',
};

export const SAT_DOMAIN_LABEL: Record<SatDomain, string> = {
  INFORMATION_AND_IDEAS: 'Information and Ideas',
  CRAFT_AND_STRUCTURE: 'Craft and Structure',
  EXPRESSION_OF_IDEAS: 'Expression of Ideas',
  STANDARD_ENGLISH_CONVENTIONS: 'Standard English Conventions',
  ALGEBRA: 'Algebra',
  ADVANCED_MATH: 'Advanced Math',
  PROBLEM_SOLVING_DATA_ANALYSIS: 'Problem-Solving and Data Analysis',
  GEOMETRY_TRIGONOMETRY: 'Geometry and Trigonometry',
};

/** What each domain actually tests (College Board "Knowledge and Skills"). */
export const SAT_DOMAIN_TOPICS: Record<SatDomain, string[]> = {
  INFORMATION_AND_IDEAS: [
    'Central ideas and summarizing',
    'Explicit and implicit textual details',
    'Inference from text',
    'Command of evidence — textual',
    'Command of evidence — quantitative (tables and graphs)',
  ],
  CRAFT_AND_STRUCTURE: [
    'Words in context (vocabulary)',
    'Text structure and author purpose',
    'Part-whole relationships within a passage',
    'Cross-text connections (paired passages)',
  ],
  EXPRESSION_OF_IDEAS: [
    'Rhetorical synthesis — combining given facts to meet a stated goal',
    'Logical transitions between ideas (contrast, cause, addition, etc.)',
  ],
  STANDARD_ENGLISH_CONVENTIONS: [
    'Sentence boundaries — fragments, run-ons, comma splices',
    'Punctuation with lists, appositives, and nonessential clauses',
    'Subject-verb and pronoun-antecedent agreement',
    'Verb tense and mood consistency',
    'Modifier placement',
    'Possessive and plural forms',
  ],
  ALGEBRA: [
    'Linear equations and inequalities in one variable',
    'Linear equations in two variables',
    'Systems of two linear equations',
    'Linear functions — slope and intercept in context',
  ],
  ADVANCED_MATH: [
    'Quadratic equations (factoring, completing the square, the formula)',
    'Exponential growth and decay',
    'Polynomial operations and factoring',
    'Function notation and transformations',
    'Radical and rational equations',
  ],
  PROBLEM_SOLVING_DATA_ANALYSIS: [
    'Ratios, rates, and proportional relationships',
    'Percentages and percent change',
    'Mean, median, mode, and spread',
    'Scatterplots and lines of best fit',
    'Two-way tables and probability',
    'Inference from sample statistics / margin of error',
  ],
  GEOMETRY_TRIGONOMETRY: [
    'Area and volume formulas',
    'Angle relationships (parallel lines, triangles, polygons)',
    'Similarity and congruence',
    'Right-triangle trigonometry (SOH-CAH-TOA)',
    'The unit circle and radians',
    'Circle equations, arc length, and sector area',
  ],
};

/** Concrete, actionable tips per domain — not generic "practice more" advice. */
export const SAT_DOMAIN_TIPS: Record<SatDomain, string[]> = {
  INFORMATION_AND_IDEAS: [
    'Read the question stem before the passage so you know what to look for.',
    'The right answer is directly supported by the text — underline the exact line(s) that prove it, rather than reasoning beyond what is written.',
    'On quantitative-evidence questions, check each answer choice against the table/graph values directly instead of estimating.',
  ],
  CRAFT_AND_STRUCTURE: [
    'For vocabulary-in-context, cover the blank and predict your own word before looking at the choices.',
    'For purpose questions, identify what the author is doing (arguing, explaining, describing), not just what they are saying.',
    'For paired passages, note where the two authors agree and disagree before reading the answer choices.',
  ],
  EXPRESSION_OF_IDEAS: [
    'On synthesis questions, identify the stated goal first, then pick the choice that uses only the facts relevant to that goal.',
    'For transitions, read the sentence before and after to find the actual logical relationship — do not just pick a word that "sounds right".',
  ],
  STANDARD_ENGLISH_CONVENTIONS: [
    'There are really only about a dozen tested rules — drill each one in isolation before mixing them in timed sets.',
    'If a sentence sounds like two complete sentences jammed together, it needs a period, semicolon, or comma + conjunction.',
    'Before checking subject-verb agreement, find the true subject and mentally strip out any prepositional phrase sitting between it and the verb.',
  ],
  ALGEBRA: [
    'For systems of equations, decide whether elimination or substitution is faster before starting.',
    'On "how many solutions" questions, compare slopes and intercepts directly instead of fully solving.',
    'Re-read what the question actually asks for (x, y, or an expression) — solving for the wrong variable is a common trap.',
  ],
  ADVANCED_MATH: [
    'Pick a quadratic method by the equation’s form: factor when it factors cleanly, otherwise use the formula — do not default to one method.',
    'For exponential word problems, decide growth vs. decay from context and set up the model before touching numbers.',
    'Use the calculator to graph and check answer choices when solving algebraically gets messy.',
  ],
  PROBLEM_SOLVING_DATA_ANALYSIS: [
    'On percent problems, identify the correct base ("percent of what?") before calculating.',
    'On two-way table probability questions, write out exactly which row/column you are restricting to before dividing.',
    'On scatterplot questions, read the trend or prediction directly off the graph — do not compute unless asked.',
  ],
  GEOMETRY_TRIGONOMETRY: [
    'Keep a one-page formula sheet (area, volume, trig identities) and drill it until recall is automatic — this domain rewards speed of recall over reasoning.',
    'For circle-equation questions, complete the square first to reach (x-h)²+(y-k)²=r² form.',
    'Sketch a quick diagram for any word problem describing a figure — most errors come from misreading the setup, not the math itself.',
  ],
};

export interface SatDomainBand {
  domain: SatDomain;
  performanceLow: number;
  performanceHigh: number;
}

export interface SatAttemptInput {
  attemptNumber: number;
  domainScores: SatDomainBand[];
}

export type SatDomainTrend = 'IMPROVED' | 'FLAT' | 'REGRESSED' | 'NEW';

/** What a trend most likely means for how to spend prep time on that domain. */
export const SAT_TREND_NOTE: Record<SatDomainTrend, string> = {
  REGRESSED:
    'Scored higher on a previous attempt — this is more likely rust or careless errors than a fresh knowledge gap. Prioritize a quick rule/formula refresh and timed accuracy drills over relearning content.',
  FLAT: 'Unchanged across attempts despite prep. Before drilling more content, test whether this is a real skill gap or a pacing problem — redo a set of these questions untimed; if accuracy jumps, the issue is speed, not knowledge.',
  IMPROVED: 'Trending up — light maintenance is enough here; do not over-invest time.',
  NEW: 'No prior attempt to compare against yet.',
};

export interface SatDomainPriority {
  domain: SatDomain;
  section: SatSection;
  latestBand: { low: number; high: number };
  previousBand: { low: number; high: number } | null;
  trend: SatDomainTrend;
  /** Higher = more urgent focus. */
  priorityScore: number;
}

const MAX_BAND = 800;

function midpoint(band: { performanceLow: number; performanceHigh: number }): number {
  return (band.performanceLow + band.performanceHigh) / 2;
}

function classifyTrend(
  latestMid: number,
  previousMid: number | null,
  config: SatPrepConfig,
): SatDomainTrend {
  if (previousMid === null) return 'NEW';
  const delta = latestMid - previousMid;
  if (delta >= config.improvedDeltaThreshold) return 'IMPROVED';
  if (delta <= -config.regressedDeltaThreshold) return 'REGRESSED';
  return 'FLAT';
}

/**
 * Ranks every domain seen in the latest attempt by how urgently it needs
 * focus: `priorityScore = (800 − latest band high) × trendWeight[trend]`, so a
 * domain that is flat or regressing outranks one with an equal gap that is
 * already trending up. `attempts` must be ordered ascending by attemptNumber.
 */
export function rankDomainPriorities(
  attempts: SatAttemptInput[],
  config: SatPrepConfig,
): SatDomainPriority[] {
  if (attempts.length === 0) return [];
  const latest = attempts[attempts.length - 1]!;
  const previous = attempts.length > 1 ? attempts[attempts.length - 2]! : null;

  const previousByDomain = new Map(previous?.domainScores.map((s) => [s.domain, s]) ?? []);

  const priorities = latest.domainScores.map((latestScore): SatDomainPriority => {
    const previousScore = previousByDomain.get(latestScore.domain) ?? null;
    const latestMid = midpoint(latestScore);
    const previousMid = previousScore ? midpoint(previousScore) : null;
    const trend = classifyTrend(latestMid, previousMid, config);
    const section = SAT_DOMAIN_SECTION[latestScore.domain];
    const gapToCeiling = MAX_BAND - latestScore.performanceHigh;
    return {
      domain: latestScore.domain,
      section,
      latestBand: { low: latestScore.performanceLow, high: latestScore.performanceHigh },
      previousBand: previousScore
        ? { low: previousScore.performanceLow, high: previousScore.performanceHigh }
        : null,
      trend,
      priorityScore: gapToCeiling * config.trendWeight[trend] * config.sectionWeight[section],
    };
  });

  return priorities.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return SAT_DOMAINS.indexOf(a.domain) - SAT_DOMAINS.indexOf(b.domain);
  });
}
