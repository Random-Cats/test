import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAuthContext } from '../lib/auth';
import { badRequest, forbidden, json, notFound, unauthorized } from '../lib/http';
import { getImage } from '../lib/ddb';
import { requireEnv } from '../lib/env';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const auth = getAuthContext(event);
  if (!auth) return unauthorized();

  const imageId = event.pathParameters?.imageId;
  if (!imageId) return badRequest('imageId is required');

  const imagesTable = requireEnv('IMAGES_TABLE');
  const record = await getImage(imagesTable, imageId);
  if (!record) return notFound('Image not found');

  const isAdmin = auth.groups.includes('admin');
  if (!isAdmin && record.ownerUserId !== auth.userId) {
    return forbidden('Not allowed');
  }

  return json(200, record);
}
