/**
 * Seeding Script — Demo Accounts (Citizen, Authority, Admin)
 */

import { getFirestore, getAuth, COLLECTIONS } from '../../config/firebase.js';
import { DEPARTMENTS } from './seed-departments.js';
import { UserRole } from '@civicmind/shared';

export interface DemoAccount {
  user_id: string;
  role: UserRole;
  display_name: string;
  email: string;
  auth_provider_id: string;
  is_guest: boolean;
  password?: string;
  phone?: string;
  hero_points_balance?: number;
  preferred_language?: string;
  department_id?: string;
  jurisdiction_scope?: string[];
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  CITIZEN: {
    user_id: 'c0c0c0c0-c0c0-40c0-c0c0-c0c0c0c0c0c0',
    role: UserRole.Citizen,
    display_name: 'Jane Citizen',
    phone: '+919876543210',
    email: 'jane.citizen@example.com',
    auth_provider_id: 'c0c0c0c0-c0c0-40c0-c0c0-c0c0c0c0c0c0',
    hero_points_balance: 150,
    is_guest: false,
    preferred_language: 'en',
    password: 'password123', // For auth testing
  },
  AUTHORITY: {
    user_id: 'e0e0e0e0-e0e0-40e0-e0e0-e0e0e0e0e0e0',
    role: UserRole.Authority,
    display_name: 'Officer BESCOM',
    email: 'officer.bescom@civicmind.gov',
    auth_provider_id: 'e0e0e0e0-e0e0-40e0-e0e0-e0e0e0e0e0e0',
    department_id: DEPARTMENTS.BESCOM.department_id,
    jurisdiction_scope: ['ward-101-indiranagar', 'ward-102-koramangala'],
    is_guest: false,
    password: 'password123', // For auth testing
  },
  ADMIN: {
    user_id: 'a0a0a0a0-a0a0-40a0-a0a0-a0a0a0a0a0a0',
    role: UserRole.Admin,
    display_name: 'System Administrator',
    email: 'admin@civicmind.gov',
    auth_provider_id: 'a0a0a0a0-a0a0-40a0-a0a0-a0a0a0a0a0a0',
    is_guest: false,
    password: 'password123', // For auth testing
  },
};

export async function seedDemoAccounts() {
  const auth = getAuth();
  const db = getFirestore();

  console.log('[SEED] Seeding demo accounts...');

  for (const [key, account] of Object.entries(DEMO_ACCOUNTS)) {
    // 1. Create or Update user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUser(account.user_id);
      console.log(` - User ${key} (${account.email}) already exists in Firebase Auth.`);
    } catch {
      // Create user
      userRecord = await auth.createUser({
        uid: account.user_id,
        email: account.email,
        phoneNumber: account.phone || undefined,
        displayName: account.display_name,
        password: account.password,
        disabled: false,
      });
      console.log(` - Created user ${key} (${account.email}) in Firebase Auth.`);
    }

    // 2. Set Custom User Claims for role-based security rules
    const claims: Record<string, unknown> = {
      role: account.role,
      is_guest: account.is_guest,
    };
    if (account.role === UserRole.Authority) {
      claims['department_id'] = account.department_id;
      claims['jurisdiction_scope'] = account.jurisdiction_scope;
    }

    await auth.setCustomUserClaims(userRecord.uid, claims);
    console.log(`   - Set custom claims: ${JSON.stringify(claims)}`);

    // 3. Write User document to Firestore
    const firestoreDoc = {
      user_id: account.user_id,
      role: account.role,
      display_name: account.display_name,
      phone: account.phone || null,
      email: account.email,
      auth_provider_id: account.user_id,
      is_guest: account.is_guest,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(account.role === UserRole.Citizen ? { hero_points_balance: account.hero_points_balance, preferred_language: account.preferred_language } : {}),
      ...(account.role === UserRole.Authority ? { department_id: account.department_id, jurisdiction_scope: account.jurisdiction_scope } : {}),
    };

    await db.collection(COLLECTIONS.USERS).doc(account.user_id).set(firestoreDoc);
    console.log(`   - Wrote Firestore user document.`);
  }

  console.log('[SEED] Demo accounts seeded successfully.');
}

// Allow standalone execution
if (process.argv[1]?.endsWith('seed-demo-accounts.ts') || process.argv[1]?.endsWith('seed-demo-accounts.js')) {
  seedDemoAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
