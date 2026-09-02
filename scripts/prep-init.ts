import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { initRealProfile, profileConfigSchema } from '@/app-services/init';
import { createDrizzleRepositories } from '@/persistence/drizzle';

const custom = path.join(process.cwd(), 'config/student.json');
const configPath = existsSync(custom)
  ? custom
  : path.join(process.cwd(), 'config/student.example.json');

async function main() {
  const raw = JSON.parse(readFileSync(configPath, 'utf8'));
  const config = profileConfigSchema.parse(raw);

  console.log(`Loading profile from ${path.relative(process.cwd(), configPath)}`);
  const { created, profile } = await initRealProfile(createDrizzleRepositories(), config);

  if (created) {
    console.log('Profile created.');
  } else {
    console.log('A profile already exists — nothing changed.');
  }
  console.log('  student    :', profile.studentName, `(${profile.studentId})`);
  console.log('  academicYr :', profile.yearLabel, `(${profile.academicYearId})`);
  console.log('  plan       :', profile.planId);
  console.log('  curriculum :', profile.curriculumVersionId);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
