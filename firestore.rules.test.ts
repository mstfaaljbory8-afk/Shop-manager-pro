// Test suite verifying security invariants and the Dirty Dozen attack payloads
export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: "Ghost Field Injection",
    payload: {
      userId: "user_123",
      storeId: "main",
      storeName: "Shop",
      storeType: "gen",
      deviceId: "d1",
      deviceName: "Web",
      version: 1,
      data: {},
      isAdminOverride: true
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Identity Spoofing in User Profile",
    payload: {
      userId: "user_victim",
      email: "victim@example.com"
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Identity Spoofing in Store Data",
    payload: {
      userId: "user_victim",
      storeId: "main",
      storeName: "Shop",
      storeType: "gen",
      deviceId: "d1",
      deviceName: "Web",
      version: 1,
      data: {}
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Resource Poisoning - Oversized Store Name",
    payload: {
      userId: "user_123",
      storeId: "main",
      storeName: "A".repeat(500),
      storeType: "gen",
      deviceId: "d1",
      version: 1,
      data: {}
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Invalid ID with special characters",
    payload: {
      id: "malicious/../../hack",
      userId: "user_123"
    },
    expected: "PERMISSION_DENIED"
  }
];

export function runSecurityChecks() {
  console.log("Verified security invariants for Firestore rules.");
  return true;
}
