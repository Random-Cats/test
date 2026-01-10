import { getUser, upsertUser, type UserRecord } from './ddb';
import { minuteBucket, yyyyMmDd } from './time';

export type AbuseConfig = {
  maxPerMinute: number;
  maxPerDay: number;
};

export class AbuseError extends Error {
  code: 'BANNED' | 'RATE_LIMIT';
  constructor(code: 'BANNED' | 'RATE_LIMIT', message: string) {
    super(message);
    this.code = code;
  }
}

export async function enforceSubmitLimits(params: {
  usersTable: string;
  userId: string;
  config: AbuseConfig;
}): Promise<void> {
  const { usersTable, userId, config } = params;
  const now = new Date();
  const day = yyyyMmDd(now);
  const minute = minuteBucket(now);

  const existing = (await getUser(usersTable, userId)) ?? {
    PK: `USER#${userId}`,
    SK: `USER#${userId}`,
    userId,
  };

  if (existing.bannedUntil && existing.bannedUntil > Date.now()) {
    throw new AbuseError('BANNED', 'User temporarily banned due to repeated failures/spam');
  }

  let dailyCount = existing.dailySubmitCount ?? 0;
  if (existing.dailySubmitDate !== day) {
    dailyCount = 0;
  }

  let minuteCount = existing.minuteSubmitCount ?? 0;
  if (existing.minuteBucket !== minute) {
    minuteCount = 0;
  }

  if (minuteCount + 1 > config.maxPerMinute) {
    throw new AbuseError('RATE_LIMIT', 'Too many submissions per minute');
  }
  if (dailyCount + 1 > config.maxPerDay) {
    throw new AbuseError('RATE_LIMIT', 'Too many submissions per day');
  }

  const updated: UserRecord = {
    ...existing,
    dailySubmitDate: day,
    dailySubmitCount: dailyCount + 1,
    minuteBucket: minute,
    minuteSubmitCount: minuteCount + 1,
  };

  await upsertUser(usersTable, updated);
}

export async function recordFailureAndMaybeBan(params: {
  usersTable: string;
  userId: string;
  kind: 'INVALID_TYPE' | 'NSFW';
}): Promise<void> {
  const { usersTable, userId, kind } = params;
  const existing = (await getUser(usersTable, userId)) ?? {
    PK: `USER#${userId}`,
    SK: `USER#${userId}`,
    userId,
  };

  const nsfwFailCount = (existing.nsfwFailCount ?? 0) + 1;
  const nsfwFailStreak = (existing.nsfwFailStreak ?? 0) + 1;

  // Simple heuristic: if you fail 5 times in a row, ban for 24h.
  // This is intentionally conservative and easy to reason about.
  const shouldBan = nsfwFailStreak >= 5;

  const updated: UserRecord = {
    ...existing,
    nsfwFailCount,
    nsfwFailStreak,
    bannedUntil: shouldBan ? Date.now() + 24 * 60 * 60 * 1000 : existing.bannedUntil,
    banReason: shouldBan ? `Auto-ban: repeated ${kind} failures` : existing.banReason,
  };

  await upsertUser(usersTable, updated);
}

export async function recordSuccessResetsStreak(params: { usersTable: string; userId: string }): Promise<void> {
  const { usersTable, userId } = params;
  const existing = await getUser(usersTable, userId);
  if (!existing) return;
  if ((existing.nsfwFailStreak ?? 0) === 0) return;
  await upsertUser(usersTable, { ...existing, nsfwFailStreak: 0 });
}
