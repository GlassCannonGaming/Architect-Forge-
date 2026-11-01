# ArchitectForge Studio — Firestore Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Mandate**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening (`isValidId`)**: All single-document target operations (`get`, `create`, `update`, `delete`) validate path IDs (`userId`, `projectId`, `presetId`) against `^[a-zA-Z0-9_\-]+$` with `size() >= 1 && size() <= 128`.
4. **Strict Key Allowlisting & Anti-Update-Gap**:
   - `isValidUserProfile(data)`, `isValidCloudProject(data)`, and `isValidCloudAudioPreset(data)` validate `hasAll` and `hasOnly` keys, string length limits, integer bounds, map size bounds, and enum values on **both** `create` and `update`.
   - Every `allow update` block begins with the validation helper (`isValid[Entity](incoming())`) and partitions state changes into explicit action branches with `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Master Gate Relational Sync**:
   - Subcollection `/projects/{projectId}/audioPresets/{presetId}` verifies parent `/projects/$(projectId)` existence and ownership (`get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid`) so parent revocation immediately revokes sub-resource access.
6. **Terminal State Locking**:
   - Once a `CloudProject` reaches `status == 'archived'`, subsequent updates are blocked (`existing().status != 'archived'`).
7. **Temporal & Ownership Immutability**:
   - On `create`: `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
   - On `update`: `incoming().createdAt == existing().createdAt && incoming().ownerId == existing().ownerId && incoming().updatedAt == request.time`.
8. **Query Enforcer (`allow list`)**:
   - `allow list` on `/projects/{projectId}` strictly enforces `isSignedIn() && resource.data.ownerId == request.auth.uid` without `get()`/`exists()` inside `list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload / Context | Expected Outcome |
|---|---------------|-------------|-----------------------------|------------------|
| 1 | **Unauthenticated Write** | `/projects/proj_1` | `auth = null`, valid `CloudProject` payload | `PERMISSION_DENIED` |
| 2 | **Unverified Email Spoof** | `/projects/proj_1` | `auth.uid = 'u1'`, `email_verified = false` | `PERMISSION_DENIED` |
| 3 | **Identity Spoofing (`ownerId` Mismatch)** | `/projects/proj_1` | `auth.uid = 'u1'`, `payload.ownerId = 'u2'` | `PERMISSION_DENIED` |
| 4 | **Shadow / Ghost Field Injection** | `/projects/proj_1` | Valid `CloudProject` + `"isAdmin": true` | `PERMISSION_DENIED` |
| 5 | **Path ID Poisoning (Invalid Regex)** | `/projects/bad$id!` | `projectId = "bad$id!"` | `PERMISSION_DENIED` |
| 6 | **String Boundary Overflow (Denial of Wallet)** | `/projects/proj_1` | `name` with 500 characters (`maxLength: 120`) | `PERMISSION_DENIED` |
| 7 | **Client Timestamp Forgery** | `/projects/proj_1` | `createdAt` set to past/future timestamp != `request.time` | `PERMISSION_DENIED` |
| 8 | **Immortal Field Mutation (`ownerId` / `createdAt`)** | `/projects/proj_1` | Update changing `ownerId` or `createdAt` | `PERMISSION_DENIED` |
| 9 | **Terminal State Bypass (`archived` Lock)** | `/projects/proj_1` | Update on a document where `existing().status == 'archived'` | `PERMISSION_DENIED` |
| 10 | **Cross-Tenant PII / Profile Read** | `/users/u2` | `auth.uid = 'u1'` attempting `get` on `/users/u2` | `PERMISSION_DENIED` |
| 11 | **Orphaned Subcollection Write (Master Gate)** | `/projects/nonexistent/audioPresets/sfx_1` | Create preset when parent `/projects/nonexistent` does not exist or belongs to another user | `PERMISSION_DENIED` |
| 12 | **Disallowed AI Model Enum Injection** | `/projects/proj_1/audioPresets/sfx_1` | `modelUsed: "gemini-4-argon"` (violates cost-effective enum `["gemini-3.1-flash-lite"]`) | `PERMISSION_DENIED` |

---

## 3. Test Runner Reference
See `/src/game/firestore.rules.test.ts` for the automated test suite verifying the Dirty Dozen payloads and rule invariants.
