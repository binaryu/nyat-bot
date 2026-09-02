import { describe, it, expect, beforeEach, vi } from 'vitest';

let isDmAllowed: (userId: number) => boolean;

describe('isDmAllowed', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('allows all users when DM_ALLOWLIST_ENABLED is false', async () => {
    vi.doMock('../../../src/env.js', () => ({
      env: () => ({
        DM_ALLOWLIST_ENABLED: false,
        DM_ALLOWLIST_UIDS: [12345],
        MASTER_UID: 99999,
        MASTER_UID_EXTRA: [],
      }),
    }));
    const mod = await import('../../../src/shared/master-identity.js');
    expect(mod.isDmAllowed(11111)).toBe(true);
    expect(mod.isDmAllowed(12345)).toBe(true);
  });

  it('allows MASTER_UID when DM_ALLOWLIST_ENABLED is true', async () => {
    vi.doMock('../../../src/env.js', () => ({
      env: () => ({
        DM_ALLOWLIST_ENABLED: true,
        DM_ALLOWLIST_UIDS: [],
        MASTER_UID: 99999,
        MASTER_UID_EXTRA: [],
      }),
    }));
    const mod = await import('../../../src/shared/master-identity.js');
    expect(mod.isDmAllowed(99999)).toBe(true);
    expect(mod.isDmAllowed(11111)).toBe(false);
  });

  it('allows MASTER_UID_EXTRA when DM_ALLOWLIST_ENABLED is true', async () => {
    vi.doMock('../../../src/env.js', () => ({
      env: () => ({
        DM_ALLOWLIST_ENABLED: true,
        DM_ALLOWLIST_UIDS: [],
        MASTER_UID: 99999,
        MASTER_UID_EXTRA: [88888, 77777],
      }),
    }));
    const mod = await import('../../../src/shared/master-identity.js');
    expect(mod.isDmAllowed(88888)).toBe(true);
    expect(mod.isDmAllowed(77777)).toBe(true);
    expect(mod.isDmAllowed(11111)).toBe(false);
  });

  it('allows UIDs in DM_ALLOWLIST_UIDS when DM_ALLOWLIST_ENABLED is true', async () => {
    vi.doMock('../../../src/env.js', () => ({
      env: () => ({
        DM_ALLOWLIST_ENABLED: true,
        DM_ALLOWLIST_UIDS: [12345, 67890],
        MASTER_UID: 99999,
        MASTER_UID_EXTRA: [],
      }),
    }));
    const mod = await import('../../../src/shared/master-identity.js');
    expect(mod.isDmAllowed(12345)).toBe(true);
    expect(mod.isDmAllowed(67890)).toBe(true);
    expect(mod.isDmAllowed(11111)).toBe(false);
  });
});
