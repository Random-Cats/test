import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAuthContext } from '../lib/auth';
import { json, unauthorized } from '../lib/http';
import { listImagesByOwner } from '../lib/ddb';
import { requireEnv } from '../lib/env';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const auth = getAuthContext(event);
  if (!auth) return unauthorized();

  const imagesTable = requireEnv('IMAGES_TABLE');
  const items = await listImagesByOwner(imagesTable, auth.userId, 50);

  return json(200, { items });
}
