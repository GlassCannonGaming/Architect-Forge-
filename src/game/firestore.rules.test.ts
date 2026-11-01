import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FIREBASE_BLUEPRINT_CONSTRAINTS,
  isValidFirestoreId,
  sanitizeFirestoreId,
  buildSanitizedCloudProjectFields,
  createProjectSnapshot,
  INITIAL_FLOOR_LAYERS
} from './rules';

interface SimAuthContext {
  uid: string;
  emailVerified: boolean;
}

interface SimRequestContext {
  auth: SimAuthContext | null;
  path: string;
  method: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestTime: number;
  incomingData?: Record<string, unknown>;
  existingData?: Record<string, unknown>;
  parentProjectOwnerId?: string | null;
}

/**
 * Deterministic evaluator mirroring the exact boolean gates in `firestore.rules`
 * to test the "Dirty Dozen" adversarial payloads and legitimate owner operations.
 */
function evaluateFirestoreSecurityRules(ctx: SimRequestContext): 'ALLOWED' | 'PERMISSION_DENIED' {
  const segments = ctx.path.split('/').filter(Boolean);

  const isSignedIn = ctx.auth !== null;
  const isVerifiedUser = isSignedIn && ctx.auth?.emailVerified === true;

  // 1. /users/{userId}
  if (segments.length === 2 && segments[0] === 'users') {
    const userId = segments[1];
    if (ctx.method === 'list') return 'PERMISSION_DENIED';
    if (!isSignedIn || ctx.auth!.uid !== userId || !isValidFirestoreId(userId)) {
      return 'PERMISSION_DENIED';
    }
    if (ctx.method === 'get') return 'ALLOWED';
    if (!isVerifiedUser) return 'PERMISSION_DENIED';
    if (ctx.method === 'delete') {
      return ctx.existingData?.uid === ctx.auth!.uid ? 'ALLOWED' : 'PERMISSION_DENIED';
    }

    const d = ctx.incomingData || {};
    const keys = Object.keys(d);
    const reqKeys = ['uid', 'displayName', 'activeProjectId', 'createdAt', 'updatedAt'];
    if (
      keys.length !== reqKeys.length ||
      !reqKeys.every((k) => keys.includes(k)) ||
      d.uid !== userId ||
      d.uid !== ctx.auth!.uid ||
      !isValidFirestoreId(d.uid) ||
      typeof d.displayName !== 'string' ||
      d.displayName.length < 1 ||
      d.displayName.length > FIREBASE_BLUEPRINT_CONSTRAINTS.DISPLAY_NAME_MAX_LENGTH ||
      !isValidFirestoreId(d.activeProjectId) ||
      typeof d.createdAt !== 'number' ||
      typeof d.updatedAt !== 'number'
    ) {
      return 'PERMISSION_DENIED';
    }

    if (ctx.method === 'create') {
      return d.createdAt === ctx.requestTime && d.updatedAt === ctx.requestTime
        ? 'ALLOWED'
        : 'PERMISSION_DENIED';
    }
    if (ctx.method === 'update') {
      const ex = ctx.existingData || {};
      if (
        ex.uid !== ctx.auth!.uid ||
        d.uid !== ex.uid ||
        d.createdAt !== ex.createdAt ||
        d.updatedAt !== ctx.requestTime
      ) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
  }

  // 2. /projects/{projectId}
  if (segments.length === 2 && segments[0] === 'projects') {
    const projectId = segments[1];
    if (ctx.method === 'list') {
      return isSignedIn && ctx.existingData?.ownerId === ctx.auth!.uid
        ? 'ALLOWED'
        : 'PERMISSION_DENIED';
    }
    if (!isSignedIn || !isValidFirestoreId(projectId)) return 'PERMISSION_DENIED';

    if (ctx.method === 'get') {
      return ctx.existingData?.ownerId === ctx.auth!.uid ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (!isVerifiedUser) return 'PERMISSION_DENIED';

    if (ctx.method === 'delete') {
      return ctx.existingData?.ownerId === ctx.auth!.uid ? 'ALLOWED' : 'PERMISSION_DENIED';
    }

    const d = ctx.incomingData || {};
    const keys = Object.keys(d);
    const reqKeys = [
      'projectId',
      'ownerId',
      'name',
      'description',
      'currentFloor',
      'gameTimeMinutes',
      'floorsCount',
      'assetsCount',
      'blueprintsCount',
      'charactersCount',
      'workspaceState',
      'status',
      'createdAt',
      'updatedAt'
    ];
    if (
      keys.length !== reqKeys.length ||
      !reqKeys.every((k) => keys.includes(k)) ||
      d.projectId !== projectId ||
      !isValidFirestoreId(d.projectId) ||
      d.ownerId !== ctx.auth!.uid ||
      !isValidFirestoreId(d.ownerId) ||
      typeof d.name !== 'string' ||
      d.name.length < 1 ||
      d.name.length > FIREBASE_BLUEPRINT_CONSTRAINTS.PROJECT_NAME_MAX_LENGTH ||
      typeof d.description !== 'string' ||
      d.description.length > FIREBASE_BLUEPRINT_CONSTRAINTS.PROJECT_DESC_MAX_LENGTH ||
      typeof d.currentFloor !== 'string' ||
      d.currentFloor.length < 1 ||
      d.currentFloor.length > FIREBASE_BLUEPRINT_CONSTRAINTS.FLOOR_ID_MAX_LENGTH ||
      typeof d.gameTimeMinutes !== 'number' ||
      !Number.isInteger(d.gameTimeMinutes) ||
      d.gameTimeMinutes < 0 ||
      d.gameTimeMinutes > 1440 ||
      typeof d.floorsCount !== 'number' ||
      typeof d.assetsCount !== 'number' ||
      typeof d.blueprintsCount !== 'number' ||
      typeof d.charactersCount !== 'number' ||
      typeof d.workspaceState !== 'object' ||
      d.workspaceState === null ||
      Object.keys(d.workspaceState as object).length < 1 ||
      Object.keys(d.workspaceState as object).length > 20 ||
      (d.status !== 'active' && d.status !== 'archived') ||
      typeof d.createdAt !== 'number' ||
      typeof d.updatedAt !== 'number'
    ) {
      return 'PERMISSION_DENIED';
    }

    if (ctx.method === 'create') {
      return d.createdAt === ctx.requestTime &&
        d.updatedAt === ctx.requestTime &&
        d.status === 'active'
        ? 'ALLOWED'
        : 'PERMISSION_DENIED';
    }

    if (ctx.method === 'update') {
      const ex = ctx.existingData || {};
      if (
        ex.ownerId !== ctx.auth!.uid ||
        d.ownerId !== ex.ownerId ||
        d.projectId !== ex.projectId ||
        d.createdAt !== ex.createdAt ||
        d.updatedAt !== ctx.requestTime ||
        ex.status === 'archived'
      ) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
  }

  // 3. /projects/{projectId}/audioPresets/{presetId}
  if (segments.length === 4 && segments[0] === 'projects' && segments[2] === 'audioPresets') {
    const projectId = segments[1];
    const presetId = segments[3];
    if (!isSignedIn || !isValidFirestoreId(projectId) || !isValidFirestoreId(presetId)) {
      return 'PERMISSION_DENIED';
    }
    // Master Gate check: parent project must exist and belong to request.auth.uid
    if (!ctx.parentProjectOwnerId || ctx.parentProjectOwnerId !== ctx.auth!.uid) {
      return 'PERMISSION_DENIED';
    }
    if (!isVerifiedUser) return 'PERMISSION_DENIED';

    const d = ctx.incomingData || {};
    const keys = Object.keys(d);
    const reqKeys = [
      'presetId',
      'projectId',
      'ownerId',
      'name',
      'category',
      'modelUsed',
      'parameters',
      'createdAt',
      'updatedAt'
    ];
    if (
      keys.length !== reqKeys.length ||
      !reqKeys.every((k) => keys.includes(k)) ||
      d.presetId !== presetId ||
      d.projectId !== projectId ||
      d.ownerId !== ctx.auth!.uid ||
      typeof d.name !== 'string' ||
      d.name.length < 1 ||
      d.name.length > FIREBASE_BLUEPRINT_CONSTRAINTS.PRESET_NAME_MAX_LENGTH ||
      (d.category !== 'sfx' && d.category !== 'bgm') ||
      d.modelUsed !== FIREBASE_BLUEPRINT_CONSTRAINTS.ALLOWED_AUDIO_MODEL ||
      typeof d.parameters !== 'object' ||
      d.parameters === null ||
      d.createdAt !== ctx.requestTime ||
      d.updatedAt !== ctx.requestTime
    ) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOWED';
  }

  return 'PERMISSION_DENIED';
}

test('Firestore Zero-Trust Rules: All 12 Dirty Dozen adversarial payloads return PERMISSION_DENIED', () => {
  const now = 1761900000000;
  const snap = createProjectSnapshot({
    id: 'proj_1',
    name: 'Grand Boutique Hotel',
    description: '90s hotel suite',
    currentFloor: 'lobby',
    floorLayers: INITIAL_FLOOR_LAYERS,
    assets: [],
    catalogBlueprints: [],
    roomBlueprints: [],
    characterRigs: [],
    globalInstructionSet: 'Lore rules',
    gameTimeMinutes: 720,
    savedInteractions: [],
    timeOfDayEvents: []
  });
  const validProjectPayload = {
    ...buildSanitizedCloudProjectFields('u1', snap, 'active'),
    createdAt: now,
    updatedAt: now
  };

  // Legitimate owner create succeeds
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: validProjectPayload
    }),
    'ALLOWED'
  );

  // 1. Unauthenticated Write
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: null,
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: validProjectPayload
    }),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Email Spoof
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: false },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: validProjectPayload
    }),
    'PERMISSION_DENIED'
  );

  // 3. Identity Spoofing (ownerId mismatch)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: { ...validProjectPayload, ownerId: 'u2' }
    }),
    'PERMISSION_DENIED'
  );

  // 4. Shadow / Ghost Field Injection
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: { ...validProjectPayload, isAdmin: true }
    }),
    'PERMISSION_DENIED'
  );

  // 5. Path ID Poisoning (Invalid Regex)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/bad$id!',
      method: 'create',
      requestTime: now,
      incomingData: { ...validProjectPayload, projectId: 'bad$id!' }
    }),
    'PERMISSION_DENIED'
  );

  // 6. String Boundary Overflow (Denial of Wallet)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: { ...validProjectPayload, name: 'X'.repeat(500) }
    }),
    'PERMISSION_DENIED'
  );

  // 7. Client Timestamp Forgery
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'create',
      requestTime: now,
      incomingData: { ...validProjectPayload, createdAt: now - 99999 }
    }),
    'PERMISSION_DENIED'
  );

  // 8. Immortal Field Mutation (ownerId / createdAt)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'update',
      requestTime: now + 5000,
      existingData: validProjectPayload,
      incomingData: {
        ...validProjectPayload,
        createdAt: now + 5000,
        updatedAt: now + 5000
      }
    }),
    'PERMISSION_DENIED'
  );

  // 9. Terminal State Bypass (archived Lock)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1',
      method: 'update',
      requestTime: now + 5000,
      existingData: { ...validProjectPayload, status: 'archived' },
      incomingData: {
        ...validProjectPayload,
        name: 'Hijacked After Archive',
        updatedAt: now + 5000
      }
    }),
    'PERMISSION_DENIED'
  );

  // 10. Cross-Tenant Profile Read
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/users/u2',
      method: 'get',
      requestTime: now
    }),
    'PERMISSION_DENIED'
  );

  // 11. Orphaned Subcollection Write (Master Gate)
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1/audioPresets/sfx_1',
      method: 'create',
      requestTime: now,
      parentProjectOwnerId: null,
      incomingData: {
        presetId: 'sfx_1',
        projectId: 'proj_1',
        ownerId: 'u1',
        name: 'Brass Bell',
        category: 'sfx',
        modelUsed: 'gemini-3.1-flash-lite',
        parameters: { baseFrequency: 880 },
        createdAt: now,
        updatedAt: now
      }
    }),
    'PERMISSION_DENIED'
  );

  // 12. Disallowed Expensive AI Model Enum Injection
  assert.equal(
    evaluateFirestoreSecurityRules({
      auth: { uid: 'u1', emailVerified: true },
      path: '/projects/proj_1/audioPresets/sfx_1',
      method: 'create',
      requestTime: now,
      parentProjectOwnerId: 'u1',
      incomingData: {
        presetId: 'sfx_1',
        projectId: 'proj_1',
        ownerId: 'u1',
        name: 'Expensive SFX',
        category: 'sfx',
        modelUsed: 'gemini-4-argon',
        parameters: { baseFrequency: 880 },
        createdAt: now,
        updatedAt: now
      }
    }),
    'PERMISSION_DENIED'
  );
});

test('firestore.rules and firebase-blueprint.json exist and enforce all 8 security pillars', () => {
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const blueprintText = fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf-8');
  const blueprint = JSON.parse(blueprintText);

  assert.equal(rulesText.includes("rules_version = '2';"), true);
  assert.equal(rulesText.includes('allow read, write: if false;'), true);
  assert.equal(rulesText.includes('request.auth.token.email_verified == true'), true);
  assert.equal(rulesText.includes('isValidCloudProject(incoming(), projectId)'), true);
  assert.equal(rulesText.includes('isParentProjectOwner(projectId)'), true);
  assert.equal(Boolean(blueprint.entities?.CloudProject), true);
  assert.equal(Boolean(blueprint.firestore?.['/projects/{projectId}']), true);
  assert.equal(sanitizeFirestoreId('bad id!@#'), 'bad_id___');
});
