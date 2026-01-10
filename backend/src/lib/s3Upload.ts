import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { s3 } from './s3';

export async function createImageUploadPresignedPost(params: {
  bucket: string;
  key: string;
  contentType: string;
  maxBytes: number;
  expiresSeconds?: number;
}): Promise<{ url: string; fields: Record<string, string> }> {
  const { bucket, key, contentType, maxBytes, expiresSeconds = 60 } = params;

  const post = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Expires: expiresSeconds,
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: {
      'Content-Type': contentType,
    },
  });

  return { url: post.url, fields: post.fields };
}
