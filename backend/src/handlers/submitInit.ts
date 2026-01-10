import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { nanoid } from 'nanoid';
import { getAuthContext } from '../lib/auth';
import { badRequest, forbidden, json, unauthorized } from '../lib/http';
import { parseJsonBody } from '../lib/jsonBody';
import { assertAllowedImageType } from '../lib/validation';
import { createImageUploadPresignedPost } from '../lib/s3Upload';
import { intEnv, requireEnv } from '../lib/env';
import { enforceSubmitLimits, AbuseError } from '../lib/abuse';
import { isoNow } from '../lib/time';
import { putImage, type ImageRecord } from '../lib/ddb';

type SubmitInitBody = {
  fileName: string;
  contentType: string;
  contentLength: number;
};

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const auth = getAuthContext(event);
  if (!auth) return unauthorized();

  const uploadsBucket = requireEnv('UPLOADS_BUCKET');
  const imagesTable = requireEnv('IMAGES_TABLE');
  const usersTable = requireEnv('USERS_TABLE');

  const maxBytes = intEnv('MAX_UPLOAD_BYTES', 8_000_000);
  const maxPerMinute = intEnv('MAX_SUBMITS_PER_MINUTE', 10);
  const maxPerDay = intEnv('MAX_SUBMITS_PER_DAY', 50);

  let body: SubmitInitBody;
  try {
    body = parseJsonBody<SubmitInitBody>(event.body);
  } catch (e: any) {
    return badRequest(e.message);
  }

  if (!body.fileName || !body.contentType || !Number.isFinite(body.contentLength)) {
    return badRequest('fileName, contentType, contentLength are required');
  }

  if (body.contentLength <= 0 || body.contentLength > maxBytes) {
    return badRequest(`contentLength must be between 1 and ${maxBytes}`);
  }

  try {
    await enforceSubmitLimits({
      usersTable,
      userId: auth.userId,
      config: { maxPerMinute, maxPerDay },
    });
  } catch (e: any) {
    if (e instanceof AbuseError) {
      return forbidden(e.message);
    }
    return forbidden('Submission blocked');
  }

  try {
    assertAllowedImageType(body.fileName, body.contentType);
  } catch (e: any) {
    return badRequest(e.message);
  }

  const imageId = nanoid();
  const now = isoNow();

  const ext = body.fileName.split('.').pop()!.toLowerCase();
  const incomingKey = `incoming/${auth.userId}/${imageId}.${ext}`;

  const upload = await createImageUploadPresignedPost({
    bucket: uploadsBucket,
    key: incomingKey,
    contentType: body.contentType,
    maxBytes,
  });

  const record: ImageRecord = {
    PK: `IMAGE#${imageId}`,
    SK: `IMAGE#${imageId}`,
    GSI1PK: `USER#${auth.userId}`,
    GSI1SK: `CREATED#${now}#IMAGE#${imageId}`,
    GSI2PK: `STATUS#PENDING_UPLOAD`,
    GSI2SK: `CREATED#${now}#IMAGE#${imageId}`,

    imageId,
    ownerUserId: auth.userId,
    status: 'PENDING_UPLOAD',
    originalFileName: body.fileName,
    contentType: body.contentType,
    incomingKey,

    createdAt: now,
    updatedAt: now,
  };

  await putImage(imagesTable, record);

  return json(200, {
    imageId,
    status: record.status,
    upload,
  });
}
