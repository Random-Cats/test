import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAuthContext, requireAdmin } from '../lib/auth';
import { badRequest, forbidden, json, unauthorized } from '../lib/http';
import { listImagesByStatus, type ImageStatus } from '../lib/ddb';
import { requireEnv } from '../lib/env';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const auth = getAuthContext(event);
  if (!auth) return unauthorized();

  try {
    requireAdmin(auth.groups);
  } catch {
    return forbidden('Admin required');
  }

  const status = (event.queryStringParameters?.status as ImageStatus | undefined) ?? 'READY_FOR_REVIEW';

  const allowed: ImageStatus[] = ['READY_FOR_REVIEW', 'APPROVED', 'REJECTED_BY_ADMIN', 'PUBLISHED'];
  if (!allowed.includes(status)) {
    return badRequest(`status must be one of: ${allowed.join(', ')}`);
  }

  const imagesTable = requireEnv('IMAGES_TABLE');
  const items = await listImagesByStatus(imagesTable, status, 50);
  return json(200, { items });
}
