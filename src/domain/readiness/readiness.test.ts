import { describe, expect, it } from 'vitest';
import { readinessV1, type ReadinessConfig } from '@/config/readiness';
import { computeReadiness, type ReadinessInput } from './readiness';

const base: Omit<ReadinessInput, 'lastRevisedOn' | 'asOf'> = {
  conceptScore: 0,
  practiceScore: 0,
  testScore: 0,
  recallScore: 0,
  revisionScore: 0,
};

describe('computeReadiness — formula', () => {
  it('is the documented weighted sum', () => {
    const r = computeReadiness(
      {
        ...base,
        conceptScore: 60,
        practiceScore: 40,
        testScore: 30,
        recallScore: 50,
        revisionScore: 20,
        lastRevisedOn: null,
        asOf: '2026-09-02',
      },
      readinessV1,
    );
    // 60*.2 + 40*.25 + 30*.3 + 50*.15 + 20*.1 = 12 + 10 + 9 + 7.5 + 2 = 40.5
    expect(r.raw).toBe(40.5);
    expect(r.effective).toBe(40.5); // never revised -> factor 1
    expect(r.algorithmVersion).toBe('readiness-v1');
  });

  it('all components equal -> raw equals that value (weights sum to 1)', () => {
    const r = computeReadiness(
      {
        conceptScore: 45,
        practiceScore: 45,
        testScore: 45,
        recallScore: 45,
        revisionScore: 45,
        lastRevisedOn: null,
        asOf: '2026-09-02',
      },
      readinessV1,
    );
    expect(r.raw).toBe(45);
  });

  it('holds the 0 and 100 bounds', () => {
    expect(
      computeReadiness({ ...base, lastRevisedOn: null, asOf: '2026-09-02' }, readinessV1).effective,
    ).toBe(0);
    expect(
      computeReadiness(
        {
          conceptScore: 100,
          practiceScore: 100,
          testScore: 100,
          recallScore: 100,
          revisionScore: 100,
          lastRevisedOn: '2026-09-02',
          asOf: '2026-09-02',
        },
        readinessV1,
      ).effective,
    ).toBe(100);
  });

  it('never lets confidence in — it is not even a parameter', () => {
    // high "confidence" would live on ChapterProgress; the engine only sees components
    const weakTestEvidence = computeReadiness(
      { ...base, conceptScore: 90, testScore: 20, lastRevisedOn: null, asOf: '2026-09-02' },
      readinessV1,
    );
    // 90*.2 + 20*.3 = 18 + 6 = 24
    expect(weakTestEvidence.raw).toBe(24);
  });
});

describe('computeReadiness — recency decay', () => {
  const revised = (asOf: string, lastRevisedOn: string) =>
    computeReadiness(
      {
        conceptScore: 80,
        practiceScore: 80,
        testScore: 80,
        recallScore: 80,
        revisionScore: 80,
        lastRevisedOn,
        asOf,
      },
      readinessV1,
    );

  it('applies the documented bands at their boundaries', () => {
    expect(revised('2026-09-06', '2026-09-01').recencyFactor).toBe(1.0); // 5 days
    expect(revised('2026-09-08', '2026-09-01').recencyFactor).toBe(0.97); // 7 days
    expect(revised('2026-09-15', '2026-09-01').recencyFactor).toBe(0.97); // 14 days
    expect(revised('2026-09-16', '2026-09-01').recencyFactor).toBe(0.92); // 15 days
    expect(revised('2026-10-01', '2026-09-01').recencyFactor).toBe(0.92); // 30 days
    expect(revised('2026-10-02', '2026-09-01').recencyFactor).toBe(0.85); // 31 days
    expect(revised('2026-10-16', '2026-09-01').recencyFactor).toBe(0.85); // 45 days
    expect(revised('2026-10-17', '2026-09-01').recencyFactor).toBe(0.75); // 46 days
  });

  it('effective = raw * factor', () => {
    const r = revised('2026-10-17', '2026-09-01'); // raw 80, factor 0.75
    expect(r.raw).toBe(80);
    expect(r.effective).toBe(60);
  });

  it('treats a future revision date as 0 days elapsed', () => {
    expect(revised('2026-09-01', '2026-09-10').daysSinceRevision).toBe(0);
    expect(revised('2026-09-01', '2026-09-10').recencyFactor).toBe(1.0);
  });
});

describe('determinism', () => {
  it('same input, config and date -> identical result', () => {
    const input: ReadinessInput = {
      conceptScore: 61,
      practiceScore: 44,
      testScore: 53,
      recallScore: 37,
      revisionScore: 22,
      lastRevisedOn: '2026-08-15',
      asOf: '2026-09-02',
    };
    expect(computeReadiness(input, readinessV1)).toEqual(computeReadiness(input, readinessV1));
  });

  it('a different config version is reflected in the result', () => {
    const heavyTest: ReadinessConfig = {
      ...readinessV1,
      version: 'readiness-test',
      weights: {
        conceptScore: 0,
        practiceScore: 0,
        testScore: 1,
        recallScore: 0,
        revisionScore: 0,
      },
    };
    const r = computeReadiness(
      { ...base, testScore: 70, lastRevisedOn: null, asOf: '2026-09-02' },
      heavyTest,
    );
    expect(r.raw).toBe(70);
    expect(r.algorithmVersion).toBe('readiness-test');
  });
});
