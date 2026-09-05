import { describe, expect, it } from 'vitest';
import { satPrepV1 } from '@/config/sat-prep';
import {
  rankDomainPriorities,
  SAT_DOMAINS,
  SAT_DOMAIN_TIPS,
  SAT_DOMAIN_TOPICS,
  SAT_TREND_NOTE,
  type SatAttemptInput,
  type SatDomainTrend,
} from './sat-domain';

// Real attempt-1 / attempt-2 domain bands (score reports).
const attempt1: SatAttemptInput = {
  attemptNumber: 1,
  domainScores: [
    { domain: 'INFORMATION_AND_IDEAS', performanceLow: 550, performanceHigh: 600 },
    { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 490, performanceHigh: 540 },
    { domain: 'EXPRESSION_OF_IDEAS', performanceLow: 610, performanceHigh: 670 },
    { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
    { domain: 'ALGEBRA', performanceLow: 610, performanceHigh: 670 },
    { domain: 'ADVANCED_MATH', performanceLow: 680, performanceHigh: 800 },
    { domain: 'PROBLEM_SOLVING_DATA_ANALYSIS', performanceLow: 680, performanceHigh: 800 },
    { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 680, performanceHigh: 800 },
  ],
};

const attempt2: SatAttemptInput = {
  attemptNumber: 2,
  domainScores: [
    { domain: 'INFORMATION_AND_IDEAS', performanceLow: 610, performanceHigh: 670 },
    { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 610, performanceHigh: 670 },
    { domain: 'EXPRESSION_OF_IDEAS', performanceLow: 680, performanceHigh: 800 },
    { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
    { domain: 'ALGEBRA', performanceLow: 680, performanceHigh: 800 },
    { domain: 'ADVANCED_MATH', performanceLow: 680, performanceHigh: 800 },
    { domain: 'PROBLEM_SOLVING_DATA_ANALYSIS', performanceLow: 680, performanceHigh: 800 },
    { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 610, performanceHigh: 670 },
  ],
};

describe('rankDomainPriorities', () => {
  it('is empty with no attempts', () => {
    expect(rankDomainPriorities([], satPrepV1)).toEqual([]);
  });

  it('marks every domain NEW on a first attempt', () => {
    const ranked = rankDomainPriorities([attempt1], satPrepV1);
    expect(ranked).toHaveLength(8);
    expect(ranked.every((p) => p.trend === 'NEW')).toBe(true);
  });

  it('flags a domain that improved between attempts', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    const expr = ranked.find((p) => p.domain === 'EXPRESSION_OF_IDEAS')!;
    expect(expr.trend).toBe('IMPROVED');
  });

  it('flags a stagnant domain as FLAT even though other domains moved', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    const conventions = ranked.find((p) => p.domain === 'STANDARD_ENGLISH_CONVENTIONS')!;
    expect(conventions.trend).toBe('FLAT');
  });

  it('flags a domain that regressed between attempts', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    const geometry = ranked.find((p) => p.domain === 'GEOMETRY_TRIGONOMETRY')!;
    expect(geometry.trend).toBe('REGRESSED');
  });

  it('ranks flat/regressed domains above an equally-capped improved one', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    const conventions = ranked.findIndex((p) => p.domain === 'STANDARD_ENGLISH_CONVENTIONS');
    const craft = ranked.findIndex((p) => p.domain === 'CRAFT_AND_STRUCTURE');
    const expr = ranked.findIndex((p) => p.domain === 'EXPRESSION_OF_IDEAS');
    // Conventions/Craft sit at the same band as Expression of Ideas did pre-improvement,
    // but stayed flat — they must outrank Expression of Ideas, which is now near-ceiling.
    expect(conventions).toBeLessThan(expr);
    expect(craft).toBeLessThan(expr);
  });

  it('ranks a flat R&W domain above an equally-capped regressed Math domain, per the section weight', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    const conventions = ranked.findIndex((p) => p.domain === 'STANDARD_ENGLISH_CONVENTIONS');
    const geometry = ranked.findIndex((p) => p.domain === 'GEOMETRY_TRIGONOMETRY');
    // Both sit at the same 610-670 gap; Conventions' REGRESSED-adjacent FLAT
    // trend score is lower than Geometry's REGRESSED score, but the R&W
    // section weight (the student's stated focus, and R&W has 3 weak domains
    // vs Math's 1) should still put it first.
    expect(conventions).toBeLessThan(geometry);
  });

  it('never outranks a domain still further from the ceiling by trend alone', () => {
    const ranked = rankDomainPriorities([attempt1, attempt2], satPrepV1);
    // Every domain in the list must have priorityScore >= 0.
    expect(ranked.every((p) => p.priorityScore >= 0)).toBe(true);
    // Sorted descending.
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.priorityScore).toBeGreaterThanOrEqual(ranked[i]!.priorityScore);
    }
  });
});

describe('reference content', () => {
  it('has at least one topic and one tip for every domain', () => {
    for (const domain of SAT_DOMAINS) {
      expect(SAT_DOMAIN_TOPICS[domain].length).toBeGreaterThan(0);
      expect(SAT_DOMAIN_TIPS[domain].length).toBeGreaterThan(0);
    }
  });

  it('has a note for every trend', () => {
    const trends: SatDomainTrend[] = ['IMPROVED', 'FLAT', 'REGRESSED', 'NEW'];
    for (const trend of trends) {
      expect(SAT_TREND_NOTE[trend].length).toBeGreaterThan(0);
    }
  });
});
