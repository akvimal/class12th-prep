import { describe, expect, it } from 'vitest';
import {
  assertWeightProvenance,
  isDerived,
  isOfficial,
  validateWeightProvenance,
  WeightProvenanceError,
  WEIGHT_SOURCE_TYPES,
} from './provenance';

describe('validateWeightProvenance', () => {
  it('accepts an OFFICIAL weight that cites a source', () => {
    expect(
      validateWeightProvenance({ sourceType: 'OFFICIAL', sourceReference: 'CBSE circular 2026' }),
    ).toEqual([]);
  });

  it('rejects an OFFICIAL weight with no source reference', () => {
    const v = validateWeightProvenance({ sourceType: 'OFFICIAL' });
    expect(v).toHaveLength(1);
    expect(v[0]?.code).toBe('OFFICIAL_NEEDS_REFERENCE');
  });

  it('rejects an OFFICIAL weight with a blank source reference', () => {
    expect(
      validateWeightProvenance({ sourceType: 'OFFICIAL', sourceReference: '   ' })[0]?.code,
    ).toBe('OFFICIAL_NEEDS_REFERENCE');
  });

  it('accepts every documented source type for derived / teacher / user weights', () => {
    for (const sourceType of WEIGHT_SOURCE_TYPES) {
      const input =
        sourceType === 'OFFICIAL'
          ? { sourceType, sourceReference: 'ref' }
          : { sourceType, confidence: 0.5 };
      expect(validateWeightProvenance(input)).toEqual([]);
    }
  });

  it('flags a confidence outside 0..1', () => {
    expect(validateWeightProvenance({ sourceType: 'DERIVED_PYQ', confidence: 1.4 })[0]?.code).toBe(
      'CONFIDENCE_OUT_OF_RANGE',
    );
  });

  it('flags an unknown source type', () => {
    // @ts-expect-error deliberately invalid
    expect(validateWeightProvenance({ sourceType: 'GUESS' })[0]?.code).toBe('UNKNOWN_SOURCE_TYPE');
  });
});

describe('classification helpers', () => {
  it('separates official from derived', () => {
    expect(isOfficial('OFFICIAL')).toBe(true);
    expect(isDerived('OFFICIAL')).toBe(false);
    expect(isDerived('DERIVED_SQP')).toBe(true);
    expect(isDerived('DERIVED_PYQ')).toBe(true);
    expect(isDerived('SCHOOL_TEACHER')).toBe(false);
  });
});

describe('assertWeightProvenance', () => {
  it('throws WeightProvenanceError with violations', () => {
    expect(() => assertWeightProvenance({ sourceType: 'OFFICIAL' })).toThrow(WeightProvenanceError);
  });
});
