import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAuthContext, requireAdmin } from '../lib/auth';
import { badRequest, forbidden, json, notFound, unauthorized } from '../lib/http';
import { getImage, updateImageStatus } from '../lib/ddb';
import { parseJsonBody } from '../lib/jsonBody';
import { requireEnv } from '../lib/env';
import { isoNow } from '../lib/time';

type Body = { decision: 'APPROVE' | 'REJECT'; reason?: string };

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

  const imageId = event.pathParameters?.imageId;
  if (!imageId) return badRequest('imageId is required');

  let body: Body;
  try {
    body = parseJsonBody<Body>(event.body);
  } catch (e: any) {
    return badRequest(e.message);
  }

  if (body.decision !== 'APPROVE' && body.decision !== 'REJECT') {
    return badRequest('decision must be APPROVE or REJECT');
  }

  const imagesTable = requireEnv('IMAGES_TABLE');
  const img = await getImage(imagesTable, imageId);
  if (!img) return notFound('Image not found');

  if (img.status !== 'READY_FOR_REVIEW' && img.status !== 'APPROVED' && img.status !== 'REJECTED_BY_ADMIN') {
    return badRequest(`Image is not reviewable from status ${img.status}`);
  }

  const nextStatus = body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED_BY_ADMIN';

  await updateImageStatus(imagesTable, imageId, nextStatus, {
    admin: {
      decision: body.decision,
      reason: body.reason,
      reviewerUserId: auth.userId,
      reviewedAt: isoNow(),
    },
    // keep GSIs in sync for admin list
    GSI2PK: `STATUS#${nextStatus}`,
    GSI2SK: `CREATED#${img.createdAt}#IMAGE#${imageId}`,
  });

  return json(200, { imageId, status: nextStatus });
}
