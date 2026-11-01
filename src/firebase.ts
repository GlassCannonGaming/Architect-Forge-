import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  ArchitectForgeProjectSnapshot,
  FIREBASE_BLUEPRINT_CONSTRAINTS,
  buildSanitizedCloudProjectFields,
  createProjectSnapshot,
  sanitizeFirestoreId,
  stripUndefinedDeep
} from './game/rules';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface CloudSyncedProjectRecord {
  projectId: string;
  ownerId: string;
  name: string;
  description: string;
  currentFloor: string;
  gameTimeMinutes: number;
  floorsCount: number;
  assetsCount: number;
  blueprintsCount: number;
  charactersCount: number;
  status: 'active' | 'archived';
  updatedAtIso: string;
  snapshot: ArchitectForgeProjectSnapshot;
}

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

/**
 * Creates or updates the signed-in architect's isolated UserProfile document in `/users/{userId}`.
 */
export async function syncUserProfileToCloud(user: User, activeProjectId: string): Promise<void> {
  const safeUid = sanitizeFirestoreId(user.uid, 'usr');
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);
  const safeDisplayName = (user.displayName || 'Studio Architect')
    .trim()
    .slice(0, FIREBASE_BLUEPRINT_CONSTRAINTS.DISPLAY_NAME_MAX_LENGTH) || 'Studio Architect';
  const safeActiveProj = sanitizeFirestoreId(activeProjectId || 'proj_starter_hotel', 'proj');

  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: safeUid,
        displayName: safeDisplayName,
        activeProjectId: safeActiveProj,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userRef, {
        displayName: safeDisplayName,
        activeProjectId: safeActiveProj,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves or updates a complete Studio Project snapshot in `/projects/{projectId}` using native Maps/Lists.
 */
export async function saveProjectToCloudFirestore(
  user: User,
  snapshot: ArchitectForgeProjectSnapshot
): Promise<string> {
  const sanitized = buildSanitizedCloudProjectFields(user.uid, snapshot, 'active');
  const path = `projects/${sanitized.projectId}`;
  const projRef = doc(db, 'projects', sanitized.projectId);

  try {
    const existingSnap = await getDoc(projRef);
    if (!existingSnap.exists()) {
      await setDoc(projRef, {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const existingData = existingSnap.data();
      if (existingData?.status === 'archived') {
        // Create a fresh active clone if the previous slot was locked as archived
        const freshId = sanitizeFirestoreId(`${sanitized.projectId}_${Date.now()}`, 'proj');
        const freshRef = doc(db, 'projects', freshId);
        await setDoc(freshRef, {
          ...sanitized,
          projectId: freshId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return freshId;
      }
      await updateDoc(projRef, {
        name: sanitized.name,
        description: sanitized.description,
        currentFloor: sanitized.currentFloor,
        gameTimeMinutes: sanitized.gameTimeMinutes,
        floorsCount: sanitized.floorsCount,
        assetsCount: sanitized.assetsCount,
        blueprintsCount: sanitized.blueprintsCount,
        charactersCount: sanitized.charactersCount,
        workspaceState: sanitized.workspaceState,
        updatedAt: serverTimestamp()
      });
    }
    return sanitized.projectId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes an owned project document from `/projects/{projectId}`.
 */
export async function deleteProjectFromCloudFirestore(projectId: string): Promise<void> {
  const safeId = sanitizeFirestoreId(projectId, 'proj');
  const path = `projects/${safeId}`;
  try {
    await deleteDoc(doc(db, 'projects', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a SOTA parametric audio preset to `/projects/{projectId}/audioPresets/{presetId}`.
 */
export async function saveAudioPresetToCloudFirestore(
  user: User,
  projectId: string,
  presetId: string,
  name: string,
  category: 'sfx' | 'bgm',
  parameters: Record<string, unknown>
): Promise<void> {
  const safeProjectId = sanitizeFirestoreId(projectId, 'proj');
  const safePresetId = sanitizeFirestoreId(presetId, 'sfx');
  const safeOwnerId = sanitizeFirestoreId(user.uid, 'usr');
  const safeName = (name || 'Custom Hotel Preset')
    .trim()
    .slice(0, FIREBASE_BLUEPRINT_CONSTRAINTS.PRESET_NAME_MAX_LENGTH) || 'Custom Hotel Preset';
  const path = `projects/${safeProjectId}/audioPresets/${safePresetId}`;
  const presetRef = doc(db, 'projects', safeProjectId, 'audioPresets', safePresetId);

  try {
    const existing = await getDoc(presetRef);
    const cleanParams = stripUndefinedDeep(parameters);
    if (!existing.exists()) {
      await setDoc(presetRef, {
        presetId: safePresetId,
        projectId: safeProjectId,
        ownerId: safeOwnerId,
        name: safeName,
        category,
        modelUsed: FIREBASE_BLUEPRINT_CONSTRAINTS.ALLOWED_AUDIO_MODEL,
        parameters: cleanParams,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(presetRef, {
        name: safeName,
        parameters: cleanParams,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes in real time to the authenticated user's `/projects` collection.
 */
export function subscribeToUserCloudProjects(
  userUid: string,
  onReceiveProjects: (records: CloudSyncedProjectRecord[]) => void,
  onReceiveError?: (errMessage: string) => void
): Unsubscribe {
  const safeOwnerId = sanitizeFirestoreId(userUid, 'usr');
  const path = 'projects';
  const q = query(collection(db, 'projects'), where('ownerId', '==', safeOwnerId));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const records: CloudSyncedProjectRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const ws = (d.workspaceState || {}) as Record<string, unknown>;
        const updatedAtIso =
          d.updatedAt && typeof d.updatedAt.toDate === 'function'
            ? d.updatedAt.toDate().toISOString()
            : new Date().toISOString();

        const reconstructed = createProjectSnapshot({
          id: String(d.projectId || docSnap.id),
          name: String(d.name || 'Cloud Project'),
          description: String(d.description || ''),
          currentFloor: (d.currentFloor as never) || 'lobby',
          floorLayers: Array.isArray(ws.floorLayers) ? (ws.floorLayers as never) : [],
          assets: Array.isArray(ws.assets) ? (ws.assets as never) : [],
          catalogBlueprints: [],
          roomBlueprints: Array.isArray(ws.roomBlueprints) ? (ws.roomBlueprints as never) : [],
          characterRigs: Array.isArray(ws.characterRigs) ? (ws.characterRigs as never) : [],
          customAppearance: (ws.customAppearance as never) || undefined,
          customStats: (ws.customStats as never) || undefined,
          customTraits: Array.isArray(ws.customTraits) ? (ws.customTraits as string[]) : undefined,
          globalInstructionSet:
            typeof ws.globalInstructionSet === 'string' ? ws.globalInstructionSet : '',
          gameTimeMinutes: Number(d.gameTimeMinutes) || 720,
          savedInteractions: [],
          timeOfDayEvents: [],
          settings: (ws.settings as never) || {
            surfaceSnapEnabled: true,
            showTPoseMannequin: false,
            showExteriorWalls: false,
            customGeneratedTexUrl: null
          }
        });

        records.push({
          projectId: String(d.projectId || docSnap.id),
          ownerId: String(d.ownerId || safeOwnerId),
          name: String(d.name || 'Cloud Project'),
          description: String(d.description || ''),
          currentFloor: String(d.currentFloor || 'lobby'),
          gameTimeMinutes: Number(d.gameTimeMinutes) || 720,
          floorsCount: Number(d.floorsCount) || reconstructed.floorLayers.length,
          assetsCount: Number(d.assetsCount) || reconstructed.assets.length,
          blueprintsCount: Number(d.blueprintsCount) || reconstructed.roomBlueprints.length,
          charactersCount: Number(d.charactersCount) || reconstructed.characterRigs.length,
          status: d.status === 'archived' ? 'archived' : 'active',
          updatedAtIso,
          snapshot: reconstructed
        });
      });

      onReceiveProjects(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formattedErr) {
        if (onReceiveError) {
          onReceiveError(
            formattedErr instanceof Error ? formattedErr.message : String(formattedErr)
          );
        }
      }
    }
  );
}
