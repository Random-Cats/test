/**
 * DEPRECATED / NOT USED
 *
 * The deployed S3 processing Lambda is implemented as a container image in:
 *   backend/ml-process/app.js
 *
 * Reason: nsfwjs + tfjs-node + sharp include native dependencies that are most
 * reliable when built inside a Linux container.
 */

import type { S3Event } from 'aws-lambda';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../lib/s3';
import { requireEnv } from '../lib/env';
import { detectFileTypeFromMagicBytes, isAllowedDetectedType } from '../lib/validation';
import { updateImageStatus } from '../lib/ddb';
import { classifyNsfw } from '../lib/nsfw';
import { recordFailureAndMaybeBan, recordSuccessResetsStreak } from '../lib/abuse';

function decodeS3Key(key: string): string {
  return decodeURIComponent(key.replace(/\+/g, ' '));
}

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function handler(event: S3Event): Promise<void> {
  throw new Error('Deprecated handler: use backend/ml-process/app.js');

  const bucket = requireEnv('UPLOADS_BUCKET');
  const imagesTable = requireEnv('IMAGES_TABLE');
  const usersTable = requireEnv('USERS_TABLE');

  for (const rec of event.Records) {
    const key = decodeS3Key(rec.s3.object.key);
    if (!key.startsWith('incoming/')) continue;

    // Expect key format: incoming/<userId>/<imageId>.<ext>
    const parts = key.split('/');
    const filePart = parts[parts.length - 1] ?? '';
    const imageId = filePart.split('.')[0] ?? '';
    const ownerUserId = parts[1] ?? 'unknown';

    await updateImageStatus(imagesTable, imageId, 'PROCESSING', {
      incomingKey: key,
      GSI2PK: 'STATUS#PROCESSING',
    });

    // Validate declared metadata
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = head.ContentType ?? '';

    // Read first bytes to validate magic bytes
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-63' }));
    const buf = await streamToBuffer(obj.Body as any);
    const detected = detectFileTypeFromMagicBytes(new Uint8Array(buf));

    if (!isAllowedDetectedType(detected)) {
      const quarantineKey = key.replace(/^incoming\//, 'quarantine/');
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: quarantineKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await updateImageStatus(imagesTable, imageId, 'REJECTED_INVALID_TYPE', {
        quarantineKey,
        nsfw: { verdict: 'UNKNOWN' },
        GSI2PK: 'STATUS#REJECTED_INVALID_TYPE',
      });

      await recordFailureAndMaybeBan({ usersTable, userId: ownerUserId, kind: 'INVALID_TYPE' });
      continue;
    }

    // Fetch full bytes for model (v1: optional classifier)
    const fullObj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const fullBuf = await streamToBuffer(fullObj.Body as any);
    const result = await classifyNsfw(new Uint8Array(fullBuf));

    if (result.verdict === 'NSFW') {
      const quarantineKey = key.replace(/^incoming\//, 'quarantine/');
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: quarantineKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await updateImageStatus(imagesTable, imageId, 'REJECTED_NSFw', {
        quarantineKey,
        nsfw: result,
        GSI2PK: 'STATUS#REJECTED_NSFw',
      });

      await recordFailureAndMaybeBan({ usersTable, userId: ownerUserId, kind: 'NSFW' });
      continue;
    }

    // SAFE or UNKNOWN -> do not auto-approve UNKNOWN; still allow admin review.
    const safeKey = key.replace(/^incoming\//, 'safe/');
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: safeKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    await updateImageStatus(imagesTable, imageId, 'READY_FOR_REVIEW', {
      safeKey,
      nsfw: result,
      GSI2PK: 'STATUS#READY_FOR_REVIEW',
    });

    await recordSuccessResetsStreak({ usersTable, userId: ownerUserId });
  }
}
