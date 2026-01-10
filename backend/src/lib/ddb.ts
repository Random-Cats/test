import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);

export type ImageStatus =
  | 'PENDING_UPLOAD'
  | 'PROCESSING'
  | 'REJECTED_INVALID_TYPE'
  | 'REJECTED_NSFw'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED_BY_ADMIN'
  | 'PUBLISHED';

export type ImageRecord = {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;

  imageId: string;
  ownerUserId: string;
  status: ImageStatus;

  originalFileName: string;
  contentType: string;

  incomingKey?: string;
  safeKey?: string;
  quarantineKey?: string;

  createdAt: string;
  updatedAt: string;

  nsfw?: {
    verdict: 'SAFE' | 'NSFW' | 'UNKNOWN';
    scores?: Record<string, number>;
  };

  admin?: {
    decision: 'APPROVE' | 'REJECT';
    reason?: string;
    reviewerUserId: string;
    reviewedAt: string;
  };

  github?: {
    commitSha: string;
    path: string;
    publishedAt: string;
  };
};

export function imagePk(imageId: string): string {
  return `IMAGE#${imageId}`;
}

export function userPk(userId: string): string {
  return `USER#${userId}`;
}

export async function putImage(tableName: string, record: ImageRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: tableName, Item: record }));
}

export async function getImage(tableName: string, imageId: string): Promise<ImageRecord | undefined> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { PK: imagePk(imageId), SK: imagePk(imageId) } }),
  );
  return res.Item as ImageRecord | undefined;
}

export async function listImagesByOwner(
  tableName: string,
  ownerUserId: string,
  limit = 50,
): Promise<ImageRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${ownerUserId}` },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as ImageRecord[];
}

export async function listImagesByStatus(
  tableName: string,
  status: ImageStatus,
  limit = 50,
): Promise<ImageRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `STATUS#${status}` },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as ImageRecord[];
}

export type UserRecord = {
  PK: string;
  SK: string;
  userId: string;
  bannedUntil?: number;
  banReason?: string;

  dailySubmitDate?: string; // YYYY-MM-DD
  dailySubmitCount?: number;

  minuteBucket?: string; // YYYY-MM-DDTHH:MM
  minuteSubmitCount?: number;

  nsfwFailCount?: number;
  nsfwFailStreak?: number;
};

export async function getUser(usersTable: string, userId: string): Promise<UserRecord | undefined> {
  const pk = userPk(userId);
  const res = await ddb.send(new GetCommand({ TableName: usersTable, Key: { PK: pk, SK: pk } }));
  return res.Item as UserRecord | undefined;
}

export async function upsertUser(usersTable: string, user: UserRecord): Promise<void> {
  await ddb.send(new PutCommand({ TableName: usersTable, Item: user }));
}

export async function updateImageStatus(
  tableName: string,
  imageId: string,
  status: ImageStatus,
  updates: Record<string, unknown> = {},
): Promise<void> {
  const now = new Date().toISOString();

  const expressionParts: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#status': 'status', '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':status': status, ':updatedAt': now };

  let i = 0;
  for (const [k, v] of Object.entries(updates)) {
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
