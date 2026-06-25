// SmartCat Feeder - Dispensing Lock Tracker
// A tiny shared module that tracks when the dispensing lock was acquired,
// so that feed.service.ts can auto-expire stale locks without creating
// a circular dependency between mqtt.service and feed.service.

let lockAcquiredAt: number | null = null;
const LOCK_MAX_AGE_MS = 30_000; // 30 seconds — well beyond any servo duration

export function recordLockAcquired(): void {
  lockAcquiredAt = Date.now();
}

export function clearLockTimestamp(): void {
  lockAcquiredAt = null;
}

export function getLockAgeMs(): number | null {
  return lockAcquiredAt !== null ? Date.now() - lockAcquiredAt : null;
}

export function isLockStale(): boolean {
  const age = getLockAgeMs();
  return age !== null && age > LOCK_MAX_AGE_MS;
}
