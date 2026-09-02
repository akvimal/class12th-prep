import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { getActiveProfile } from './profile';
import { initRealProfile, profileConfigSchema, type ProfileConfig } from './init';
import { getStudentOverview } from './overview';
import configExample from '../../config/student.example.json';

const config: ProfileConfig = profileConfigSchema.parse(configExample);

describe('initRealProfile', () => {
  it('creates a resolvable profile from the example config', async () => {
    const repos = createInMemoryRepositories();

    expect(await getActiveProfile(repos)).toBeNull();

    const { created, profile } = await initRealProfile(repos, config);
    expect(created).toBe(true);
    expect(profile.studentName).toBe(config.student.displayName);
    expect(profile.yearLabel).toBe(config.academicYear.yearLabel);

    const resolved = await getActiveProfile(repos);
    expect(resolved).toMatchObject({
      planId: profile.planId,
      academicYearId: profile.academicYearId,
    });
  });

  it('enrols the five subjects and imports the derived curriculum', async () => {
    const repos = createInMemoryRepositories();
    const { profile } = await initRealProfile(repos, config);

    const overview = await getStudentOverview(
      repos,
      profile.academicYearId,
      profile.planId,
      config.plan.startDate,
    );
    expect(overview?.subjects.map((s) => s.key)).toEqual(['PHY', 'CHE', 'MAT', 'CS', 'ENG']);
    const chapterCount = overview!.subjects.reduce((n, s) => n + s.chapters.length, 0);
    expect(chapterCount).toBe(72);
  });

  it('is idempotent — a second run changes nothing', async () => {
    const repos = createInMemoryRepositories();
    const first = await initRealProfile(repos, config);
    const second = await initRealProfile(repos, config);

    expect(second.created).toBe(false);
    expect(second.profile.studentId).toBe(first.profile.studentId);
    expect(await repos.planning.listStudents()).toHaveLength(1);
  });

  it('rejects a config naming a subject outside the curriculum', async () => {
    const repos = createInMemoryRepositories();
    await expect(
      initRealProfile(repos, { ...config, subjects: [{ key: 'BIO', targetMarks: 70 }] }),
    ).rejects.toThrow(/BIO/);
  });
});
