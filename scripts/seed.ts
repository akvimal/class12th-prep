import { seedSynthetic } from '@/app-services/seed';
import { createDrizzleRepositories } from '@/persistence/drizzle';

async function main() {
  const result = await seedSynthetic(createDrizzleRepositories());

  if (result.created) {
    console.log('Synthetic seed loaded.');
    console.log('  counts     :', JSON.stringify(result.counts));
    console.log('  student    :', result.studentId);
    console.log('  academicYr :', result.academicYearId);
    console.log('  plan       :', result.planId);
    console.log('  curriculum :', result.curriculumVersionId);
  } else {
    console.log(
      `Synthetic seed already present (curriculum version ${result.curriculumVersionId}). ` +
        'Run `pnpm db:reset` first for a clean slate.',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
