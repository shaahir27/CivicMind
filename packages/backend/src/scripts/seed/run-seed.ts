/**
 * Main Seeding Orchestrator — run-seed.ts
 */

import '../../config/env.js';

import { seedDepartments } from './seed-departments.js';
import { seedJurisdiction } from './seed-jurisdiction.js';
import { seedSLA } from './seed-sla.js';
import { seedDemoAccounts } from './seed-demo-accounts.js';
import { seedImpactReports } from './seed-impact-reports.js';
import { seedForecasts } from './seed-forecasts.js';

export async function runAllSeeds() {
  console.log('====================================================');
  console.log('[SEED] STARTING FULL DATABASE SEED SEQUENCE');
  console.log('====================================================');

  try {
    // 1. Departments
    await seedDepartments();
    console.log('');

    // 2. Jurisdiction Ward Mappings
    await seedJurisdiction();
    console.log('');

    // 3. SLA Configs
    await seedSLA();
    console.log('');

    // 4. User/Demo Accounts
    await seedDemoAccounts();
    console.log('');

    // 5. Impact Reports
    await seedImpactReports();
    console.log('');

    // 6. Forecasts
    await seedForecasts();
    console.log('');

    console.log('====================================================');
    console.log('[SEED] FULL SEED SEQUENCE COMPLETED SUCCESSFULY');
    console.log('====================================================');
  } catch (error) {
    console.error('====================================================');
    console.error('[SEED] ERROR DURING SEED SEQUENCE:', error);
    console.error('====================================================');
    throw error;
  }
}

// Allow standalone execution
if (process.argv[1]?.endsWith('run-seed.ts') || process.argv[1]?.endsWith('run-seed.js')) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
