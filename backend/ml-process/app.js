const { S3Client, GetObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const tf = require('@tensorflow/tfjs-node');
const nsfwjs = require('nsfwjs');
const sharp = require('sharp');

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function decodeS3Key(key) {
  return decodeURIComponent(key.replace(/\+/g, ' '));
}

function imagePk(imageId) {
  return `IMAGE#${imageId}`;
}

async function updateImage(tableName, imageId, status, updates) {
  const now = new Date().toISOString();
  const expressionParts = ['#status = :status', '#updatedAt = :updatedAt'];
  const names = { '#status': 'status', '#updatedAt': 'updatedAt' };
  const values = { ':status': status, ':updatedAt': now };

  let i = 0;
  for (const [k, v] of Object.entries(updates || {})) {
    i += 1;
    const nameKey = `#k${i}`;
    const valueKey = `:v${i}`;
    names[nameKey] = k;
    values[valueKey] = v;
    expressionParts.push(`${nameKey} = ${valueKey}`);
  }

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { PK: imagePk(imageId), SK: imagePk(imageId) },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

function detectMagic(bytes) {
  if (!bytes || bytes.length < 12) return 'unknown';

  // JPEG FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';

  // PNG signature
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const isPng = pngSig.every((b, i) => bytes[i] === b);
  if (isPng) return 'png';

  // WebP: RIFF....WEBP
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === 'RIFF' && webp === 'WEBP') return 'webp';

  return 'unknown';
}

let modelPromise;
async function getModel() {
  if (!modelPromise) {
    // Use smaller model by default.
    modelPromise = nsfwjs.load();
  }
  return modelPromise;
}

async function classify(buffer) {
  // Decode any of jpeg/png/webp into raw RGB using sharp (works for webp)
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imgTensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels], 'int32');
  try {
    const model = await getModel();
    const predictions = await model.classify(imgTensor);

    // Convert predictions to score map.
    const scores = {};
    for (const p of predictions) {
      scores[p.className] = p.probability;
    }

    // Simple policy: if Porn or Hentai >= 0.8, treat as NSFW.
    const porn = scores.Pornography ?? 0;
    const hentai = scores.Hentai ?? 0;
    const sexy = scores.Sexy ?? 0;

    const verdict = porn >= 0.8 || hentai >= 0.8 ? 'NSFW' : 'SAFE';
    return { verdict, scores: { Pornography: porn, Hentai: hentai, Sexy: sexy } };
  } finally {
    imgTensor.dispose();
  }
}

exports.handler = async (event) => {
  const bucket = process.env.UPLOADS_BUCKET;
  const imagesTable = process.env.IMAGES_TABLE;
  const usersTable = process.env.USERS_TABLE; // reserved for future (ban updates)

  if (!bucket || !imagesTable) {
    throw new Error('Missing env vars UPLOADS_BUCKET/IMAGES_TABLE');
  }

  for (const rec of event.Records || []) {
    const key = decodeS3Key(rec.s3.object.key);
    if (!key.startsWith('incoming/')) continue;

    const parts = key.split('/');
    const filePart = parts[parts.length - 1] || '';
    const imageId = (filePart.split('.')[0] || '').trim();

    await updateImage(imagesTable, imageId, 'PROCESSING', {
      incomingKey: key,
      GSI2PK: 'STATUS#PROCESSING',
    });

    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = head.ContentType || '';

    // Read first bytes (we rely on sharp for full decode, but still do a fast allowlist check)
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-63' }));
    const bufHead = await streamToBuffer(obj.Body);
    const detected = detectMagic(new Uint8Array(bufHead));

    if (detected === 'unknown') {
      const quarantineKey = key.replace(/^incoming\//, 'quarantine/');
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: quarantineKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await updateImage(imagesTable, imageId, 'REJECTED_INVALID_TYPE', {
        quarantineKey,
        nsfw: { verdict: 'UNKNOWN' },
        GSI2PK: 'STATUS#REJECTED_INVALID_TYPE',
      });
      continue;
    }

    // Fetch full image bytes for classification
    const fullObj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const fullBuf = await streamToBuffer(fullObj.Body);

    let nsfw;
    try {
      nsfw = await classify(fullBuf);
    } catch (e) {
      // If model fails, quarantine rather than letting it through.
      const quarantineKey = key.replace(/^incoming\//, 'quarantine/');
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: quarantineKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await updateImage(imagesTable, imageId, 'REJECTED_INVALID_TYPE', {
        quarantineKey,
        nsfw: { verdict: 'UNKNOWN' },
        GSI2PK: 'STATUS#REJECTED_INVALID_TYPE',
      });
      continue;
    }

    if (nsfw.verdict === 'NSFW') {
      const quarantineKey = key.replace(/^incoming\//, 'quarantine/');
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: quarantineKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await updateImage(imagesTable, imageId, 'REJECTED_NSFw', {
        quarantineKey,
        nsfw,
        GSI2PK: 'STATUS#REJECTED_NSFw',
      });
      continue;
    }

    const safeKey = key.replace(/^incoming\//, 'safe/');
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${key}`, Key: safeKey, ContentType: contentType, MetadataDirective: 'REPLACE' }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    await updateImage(imagesTable, imageId, 'READY_FOR_REVIEW', {
      safeKey,
      nsfw,
      GSI2PK: 'STATUS#READY_FOR_REVIEW',
    });
  }
};

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
