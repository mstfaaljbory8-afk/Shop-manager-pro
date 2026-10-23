# Security Specification & Test Harness

## 1. Data Invariants
1. **User Identity Boundary**: A user document at `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. **Store Owner Identity**: Any document in `/users/{userId}/stores/{storeId}` must belong to the user (`userId == request.auth.uid`), and `incoming().userId == request.auth.uid`.
3. **Immutability of Key Identity Fields**: During store data update, `userId` and `storeId` cannot be changed (`incoming().userId == existing().userId && incoming().storeId == existing().storeId`).
4. **Device Integrity**: A user can only register or update device documents under their own path `/users/{userId}/devices/{deviceId}`.
5. **Backup Integrity**: Backups in `/users/{userId}/backups/{backupId}` cannot be overwritten by other users, and `userId` must match `request.auth.uid`.
6. **Strict Size Limits**: All string fields have explicit length limits (`storeName <= 100`, `storeType <= 50`, `deviceId <= 128`, etc.) preventing Denial of Wallet.
7. **Default Deny**: Any path not explicitly matched is denied (`/{document=**} { allow read, write: if false; }`).
8. **Temporal Integrity**: `updatedAt` on store data mutations must match the server timestamp `request.time`.

## 2. The "Dirty Dozen" Payloads (Must be Rejected)
1. **Payload 1 (Ghost Field Injection)**:
   Attempt to write a store document with a ghost field:
   `{ userId: "user_123", storeId: "main", storeName: "Shop", storeType: "gen", deviceId: "d1", deviceName: "Web", version: 1, data: {}, isAdminOverride: true }`
   *Expected*: PERMISSION_DENIED (Key validation rejects unregistered fields).

2. **Payload 2 (Identity Spoofing in User Profile)**:
   User `user_A` writes to `/users/user_B`:
   `{ userId: "user_B", email: "victim@example.com" }`
   *Expected*: PERMISSION_DENIED (User cannot write to another user's path).

3. **Payload 3 (Identity Spoofing in Store Data)**:
   User `user_A` writes to `/users/user_A/stores/main` with `userId: "user_B"`:
   `{ userId: "user_B", storeId: "main", storeName: "Shop", storeType: "gen", deviceId: "d1", deviceName: "Web", version: 1, data: {} }`
   *Expected*: PERMISSION_DENIED (`incoming().userId` must equal `request.auth.uid`).

4. **Payload 4 (Resource Poisoning - Giant ID)**:
   Document ID with 10KB string of junk characters:
   `/users/user_A/stores/` + "a".repeat(10000)
   *Expected*: PERMISSION_DENIED (`isValidId` rejects length > 128 or non-alphanumeric).

5. **Payload 5 (Resource Poisoning - Oversized Store Name)**:
   Store document with 5MB string for `storeName`:
   `{ userId: "user_A", storeId: "main", storeName: "a".repeat(500000), ... }`
   *Expected*: PERMISSION_DENIED (`storeName.size() <= 100`).

6. **Payload 6 (Unauthenticated Read)**:
   Unauthenticated user queries `/users/user_A/stores/main`:
   *Expected*: PERMISSION_DENIED (`isSignedIn()` required).

7. **Payload 7 (Cross-User Read Snooping)**:
   User `user_B` attempts to read `/users/user_A/stores/main`:
   *Expected*: PERMISSION_DENIED (Must be owner `request.auth.uid == userId`).

8. **Payload 8 (Store Id Mutability Violation)**:
   Attempting to update store doc and mutate `storeId` to `"hijacked"`:
   *Expected*: PERMISSION_DENIED (`incoming().storeId == existing().storeId`).

9. **Payload 9 (Fake Client Timestamp)**:
   Attempting to write `updatedAt: "1999-01-01T00:00:00Z"` instead of `request.time`:
   *Expected*: PERMISSION_DENIED (`incoming().updatedAt == request.time`).

10. **Payload 10 (Negative Version Number)**:
    Attempting to set `version: -500`:
    *Expected*: PERMISSION_DENIED (`incoming().version >= 0`).

11. **Payload 11 (Empty Device ID in Device Collection)**:
    Writing to `/users/user_A/devices/dev1` with empty `deviceId: ""`:
    *Expected*: PERMISSION_DENIED (`deviceId.size() > 0`).

12. **Payload 12 (Unauthorized Deletion of Other User's Backup)**:
    User `user_B` issues delete request on `/users/user_A/backups/bk1`:
    *Expected*: PERMISSION_DENIED (Must be owner).
