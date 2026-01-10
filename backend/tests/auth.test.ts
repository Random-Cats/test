import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { getAuthContext } from '../src/lib/auth';

describe('auth', () => {
  test('extracts sub and groups from JWT claims', () => {
    const event = {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: 'user-123',
              'cognito:groups': ['admin'],
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

    const ctx = getAuthContext(event);
    expect(ctx).toEqual({ userId: 'user-123', groups: ['admin'] });
  });

  test('returns null when unauthenticated', () => {
    const event = { requestContext: {} } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
    expect(getAuthContext(event)).toBeNull();
  });
});
