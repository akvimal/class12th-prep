/**
 * Academic-weight provenance rules (docs/ACADEMIC_DATA.md).
 *
 * The product must never present derived importance as official board data.
 * These rules are enforced here (before persistence) and again by CHECK
 * constraints on `academic_weights`.
 */

export const WEIGHT_SOURCE_TYPES = [
  'OFFICIAL',
  'DERIVED_SQP',
  'DERIVED_PYQ',
  'SCHOOL_TEACHER',
  'USER',
] as const;
export type WeightSourceType = (typeof WEIGHT_SOURCE_TYPES)[number];

export const WEIGHT_UNITS = ['PERCENT', 'MARKS', 'COUNT', 'RELATIVE'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export function isOfficial(sourceType: WeightSourceType): boolean {
  return sourceType === 'OFFICIAL';
}

export function isDerived(sourceType: WeightSourceType): boolean {
  return sourceType === 'DERIVED_SQP' || sourceType === 'DERIVED_PYQ';
}

export interface WeightProvenanceInput {
  sourceType: WeightSourceType;
  sourceReference?: string | null;
  confidence?: number | null;
}

export interface ProvenanceViolation {
  code: 'OFFICIAL_NEEDS_REFERENCE' | 'CONFIDENCE_OUT_OF_RANGE' | 'UNKNOWN_SOURCE_TYPE';
  message: string;
}

export function validateWeightProvenance(input: WeightProvenanceInput): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];

  if (!WEIGHT_SOURCE_TYPES.includes(input.sourceType)) {
    violations.push({
      code: 'UNKNOWN_SOURCE_TYPE',
      message: `unknown weight source type: "${input.sourceType}"`,
    });
    return violations;
  }

  if (isOfficial(input.sourceType) && !input.sourceReference?.trim()) {
    violations.push({
      code: 'OFFICIAL_NEEDS_REFERENCE',
      message: 'an OFFICIAL weight must cite a source reference',
    });
  }

  if (
    input.confidence != null &&
    (Number.isNaN(input.confidence) || input.confidence < 0 || input.confidence > 1)
  ) {
    violations.push({
      code: 'CONFIDENCE_OUT_OF_RANGE',
      message: `confidence must be between 0 and 1, got ${input.confidence}`,
    });
  }

  return violations;
}

export class WeightProvenanceError extends Error {
  readonly violations: ProvenanceViolation[];
  constructor(violations: ProvenanceViolation[]) {
    super(`invalid weight provenance: ${violations.map((v) => v.message).join('; ')}`);
    this.name = 'WeightProvenanceError';
    this.violations = violations;
  }
}

export function assertWeightProvenance(input: WeightProvenanceInput): void {
  const violations = validateWeightProvenance(input);
  if (violations.length > 0) throw new WeightProvenanceError(violations);
}
