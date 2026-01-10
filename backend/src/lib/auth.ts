import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export type AuthContext = {
  userId: string;
  groups: string[];
};

export function getAuthContext(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): AuthContext | null {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims) return null;

  // Cognito JWT subject
  const sub = typeof claims.sub === 'string' ? claims.sub : undefined;
  if (!sub) return null;

  const groupsClaim = claims['cognito:groups'];
  const groups = Array.isArray(groupsClaim)
    ? groupsClaim.filter((g): g is string => typeof g === 'string')
    : typeof groupsClaim === 'string'
      ? groupsClaim.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  return { userId: sub, groups };
}

export function requireAdmin(groups: string[]): void {
  if (!groups.includes('admin')) {
    const err = new Error('Admin group required');
    (err as any).code = 'NOT_ADMIN';
    throw err;
  }
}
