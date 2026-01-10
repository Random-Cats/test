import { AbuseError, enforceSubmitLimits } from '../src/lib/abuse';

jest.mock('../src/lib/ddb', () => {
  let user: any = undefined;
  return {
    getUser: async () => user,
    upsertUser: async (_table: string, u: any) => {
      user = u;
    },
  };
});

describe('abuse limits', () => {
  test('enforces per-minute limits', async () => {
    await enforceSubmitLimits({
      usersTable: 'Users',
      userId: 'u1',
      config: { maxPerMinute: 2, maxPerDay: 100 },
    });
    await enforceSubmitLimits({
      usersTable: 'Users',
      userId: 'u1',
      config: { maxPerMinute: 2, maxPerDay: 100 },
    });

    await expect(
      enforceSubmitLimits({ usersTable: 'Users', userId: 'u1', config: { maxPerMinute: 2, maxPerDay: 100 } }),
    ).rejects.toBeInstanceOf(AbuseError);
  });

  test('enforces bans', async () => {
    const { upsertUser } = require('../src/lib/ddb');
    await upsertUser('Users', { PK: 'USER#u2', SK: 'USER#u2', userId: 'u2', bannedUntil: Date.now() + 60_000 });

    await expect(
      enforceSubmitLimits({ usersTable: 'Users', userId: 'u2', config: { maxPerMinute: 10, maxPerDay: 10 } }),
    ).rejects.toMatchObject({ code: 'BANNED' });
  });
});
