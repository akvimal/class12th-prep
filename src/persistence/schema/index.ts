/**
 * Drizzle schema barrel. Tables are added here as tasks land:
 *   TASK-002  families, students, academic_years, preparation_plans, plan_phases
 *   TASK-003  curriculum_versions, subjects, units, chapters, topics, academic_weights
 *   ...
 */
export * from './enums';
export * from './families';
export * from './students';
export * from './curriculum';
export * from './academic-weights';
export * from './academic-years';
export * from './subject-enrollments';
export * from './school-calendar-events';
export * from './preparation-plans';
export * from './chapter-progress';
export * from './study-sessions';
export * from './readiness-snapshots';
export * from './assessments';
