import { daysBetween } from '@/domain/planning/dates';
import { dedupeKey, type DomainEventDraft } from '@/domain/events/events';
import { isSchoolAssessment } from '@/domain/assessment/assessment';
import type { DomainEventFilters, DomainEventRecord, Repositories } from '@/persistence/ports';
import { buildDailyCandidates } from './candidates';
import { getWeeklyRhythm } from './study-windows';

type EventRepos = Pick<
  Repositories,
  | 'events'
  | 'planning'
  | 'curriculum'
  | 'progress'
  | 'readiness'
  | 'assessment'
  | 'studyWindow'
  | 'session'
>;

/** Append a single event (idempotent per student + dedupe key). */
export async function emitEvent(
  repos: Pick<Repositories, 'events'>,
  draft: DomainEventDraft,
): Promise<{ record: DomainEventRecord; created: boolean }> {
  return repos.events.append({
    studentId: draft.studentId,
    eventType: draft.eventType,
    aggregateType: draft.aggregateType,
    aggregateId: draft.aggregateId,
    payload: draft.payload ?? {},
    dedupeKey: dedupeKey(draft),
  });
}

export async function listEvents(
  repos: Pick<Repositories, 'events' | 'planning'>,
  academicYearId: string,
  filters?: DomainEventFilters,
): Promise<DomainEventRecord[] | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;
  return repos.events.list(year.studentId, filters);
}

export interface EventGenerationResult {
  generated: number;
  createdTypes: string[];
}

/**
 * Generate the domain events the Phase 2 engines can raise, for `asOf`:
 *  - SCHOOL_TEST_APPROACHING / PREBOARD_APPROACHING for imminent tests,
 *  - REVISION_DUE / REVISION_OVERDUE for chapters whose spaced revision is due,
 *  - STUDY_BLOCK_MISSED when yesterday had a planned window and no session.
 * Idempotent — re-running for the same day creates nothing new.
 */
export async function detectDailyEvents(
  repos: EventRepos,
  academicYearId: string,
  asOf: string,
): Promise<EventGenerationResult | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;
  const studentId = year.studentId;

  const drafts: DomainEventDraft[] = [];

  // School tests approaching.
  const assessments = await repos.assessment.listAssessments(academicYearId, {
    from: asOf,
    status: 'ANNOUNCED',
  });
  for (const a of assessments) {
    if (!isSchoolAssessment(a.type)) continue;
    const d = daysBetween(asOf, a.examDate);
    const preboard = a.type === 'PREBOARD';
    if (preboard ? d <= 14 : d <= 7) {
      drafts.push({
        studentId,
        eventType: preboard ? 'PREBOARD_APPROACHING' : 'SCHOOL_TEST_APPROACHING',
        aggregateType: 'assessment',
        aggregateId: a.id,
        on: asOf,
        payload: { examDate: a.examDate, daysUntil: d, chapterCount: a.chapterIds.length },
      });
    }
  }

  // Revision due / overdue.
  const candidates = await buildDailyCandidates(repos, academicYearId, asOf);
  for (const c of candidates) {
    if (c.priority.revisionDue === 'NONE') continue;
    drafts.push({
      studentId,
      eventType: c.priority.revisionDue === 'OVERDUE' ? 'REVISION_OVERDUE' : 'REVISION_DUE',
      aggregateType: 'chapter',
      aggregateId: c.chapterKey,
      on: asOf,
      payload: { subjectKey: c.subjectKey, chapterName: c.chapterName },
    });
  }

  // Study block missed yesterday.
  const rhythm = await getWeeklyRhythm(repos, academicYearId, asOf, 2);
  const yesterday = rhythm?.days.find((day) => day.date < asOf);
  if (yesterday && yesterday.status === 'MISSED') {
    drafts.push({
      studentId,
      eventType: 'STUDY_BLOCK_MISSED',
      aggregateType: 'academicYear',
      aggregateId: academicYearId,
      on: yesterday.date,
      payload: { date: yesterday.date, plannedMinutes: yesterday.plannedMinutes },
    });
  }

  let generated = 0;
  const createdTypes = new Set<string>();
  for (const draft of drafts) {
    const { created } = await emitEvent(repos, draft);
    if (created) {
      generated += 1;
      createdTypes.add(draft.eventType);
    }
  }
  return { generated, createdTypes: [...createdTypes] };
}
