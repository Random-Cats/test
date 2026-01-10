import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAuthContext, requireAdmin } from '../lib/auth';
import { badRequest, forbidden, json, serverError, unauthorized } from '../lib/http';
import { listImagesByStatus, updateImageStatus, type ImageRecord } from '../lib/ddb';
import { parseJsonBody } from '../lib/jsonBody';
import { requireEnv } from '../lib/env';
import { commitFilesToGitHub } from '../lib/github';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../lib/s3';
import { isoNow } from '../lib/time';

type Body = {
  limit?: number;
  deleteFromS3?: boolean;
};

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

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

  let body: Body = {};
  if (event.body) {
    try {
      body = parseJsonBody<Body>(event.body);
    } catch (e: any) {
      return badRequest(e.message);
    }
  }

  const limit = body.limit ?? 25;
  if (limit <= 0 || limit > 100) return badRequest('limit must be 1..100');

  const deleteDefault = (process.env.DELETE_FROM_S3_DEFAULT ?? 'true') === 'true';
  const deleteFromS3 = body.deleteFromS3 ?? deleteDefault;

  const imagesTable = requireEnv('IMAGES_TABLE');
  const bucket = requireEnv('UPLOADS_BUCKET');

  const owner = requireEnv('GITHUB_OWNER');
  const repo = requireEnv('GITHUB_REPO');
  const branch = process.env.GITHUB_BRANCH ?? 'main';
  const secretArn = requireEnv('GITHUB_TOKEN_SECRET_ARN');

  if (!owner || !repo || !secretArn) {
    return serverError('GitHub configuration missing (set env vars in SAM params)');
  }

  const approved = await listImagesByStatus(imagesTable, 'APPROVED', limit);
  if (approved.length === 0) {
    return json(200, { commitSha: null, published: 0 });
  }

  const secrets = new SecretsManagerClient({});
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!secret.SecretString) return serverError('GitHub secret missing SecretString');

  let token: string;
  try {
    const parsed = JSON.parse(secret.SecretString);
    token = parsed.token;
  } catch {
    return serverError('GitHub secret must be JSON: {"token":"..."}');
  }

  const files: Array<{ path: string; contentBase64: string; image: ImageRecord }> = [];

  for (const img of approved) {
    const key = img.safeKey ?? img.incomingKey;
    if (!key) continue;

    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bodyStream = obj.Body as any;
    const buf = await streamToBuffer(bodyStream);

    // Publish into Cat-Imgs/ with stable filename.
    const ext = img.originalFileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `Cat-Imgs/${img.imageId}.${ext}`;

    files.push({ path, contentBase64: buf.toString('base64'), image: img });
  }

  if (files.length === 0) {
    return json(200, { commitSha: null, published: 0 });
  }

  const commit = await commitFilesToGitHub({
    token,
    config: { owner, repo, branch },
    message: `Publish ${files.length} approved cat images`,
    files: files.map((f) => ({ path: f.path, contentBase64: f.contentBase64 })),
  });

  const publishedAt = isoNow();

  for (const f of files) {
    await updateImageStatus(imagesTable, f.image.imageId, 'PUBLISHED', {
      github: { commitSha: commit.commitSha, path: f.path, publishedAt },
      GSI2PK: 'STATUS#PUBLISHED',
      GSI2SK: `CREATED#${f.image.createdAt}#IMAGE#${f.image.imageId}`,
    });

    if (deleteFromS3) {
      const key = f.image.safeKey ?? f.image.incomingKey;
      if (key) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      }
    }
  }

  return json(200, { commitSha: commit.commitSha, published: files.length });
}
