/**
 * Post-deploy smoke test for RandomCatClicker backend.
 *
 * Usage (PowerShell):
 *   $env:API_URL="https://xxxx.execute-api.us-west-2.amazonaws.com"
 *   $env:USER_ID_TOKEN="..."
 *   $env:ADMIN_ID_TOKEN="..."   # optional
 *   node .\scripts\smoke-test.mjs
 */

const API_URL = process.env.API_URL;
const USER_ID_TOKEN = process.env.USER_ID_TOKEN;
const ADMIN_ID_TOKEN = process.env.ADMIN_ID_TOKEN;
const RUN_COMMIT = (process.env.RUN_COMMIT ?? 'false').toLowerCase() === 'true';

if (!API_URL) throw new Error('Missing env var API_URL');
if (!USER_ID_TOKEN) throw new Error('Missing env var USER_ID_TOKEN');

const oneByOnePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W9m0AAAAASUVORK5CYII=';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(path, opts = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(json)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function testMetrics() {
  console.log('== metrics/event ==');
  await apiFetch('/metrics/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'click' }),
  });
  console.log('ok');
}

async function testSubmitAndProcess() {
  console.log('== images/submit + upload + poll ==');

  const bytes = Buffer.from(oneByOnePngBase64, 'base64');
  const file = new Blob([bytes], { type: 'image/png' });

  const init = await apiFetch('/images/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${USER_ID_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      fileName: 'smoke-test.png',
      contentType: 'image/png',
      contentLength: bytes.length,
    }),
  });

  if (!init?.upload?.url || !init?.upload?.fields) {
    throw new Error(`Unexpected submit response: ${JSON.stringify(init)}`);
  }

  const form = new FormData();
  for (const [k, v] of Object.entries(init.upload.fields)) {
    form.append(k, v);
  }
  // IMPORTANT: field name must be 'file' for S3 POST.
  form.append('file', file, 'smoke-test.png');

  const uploadResp = await fetch(init.upload.url, { method: 'POST', body: form });
  if (!(uploadResp.status === 201 || uploadResp.status === 204)) {
    const t = await uploadResp.text();
    throw new Error(`S3 upload failed: ${uploadResp.status} ${t}`);
  }

  const imageId = init.imageId;

  const terminal = new Set(['READY_FOR_REVIEW', 'REJECTED_INVALID_TYPE', 'REJECTED_NSFw']);
  const started = Date.now();
  let last;
  while (Date.now() - started < 90_000) {
    last = await apiFetch(`/images/${imageId}`, {
      headers: { Authorization: `Bearer ${USER_ID_TOKEN}` },
    });

    if (terminal.has(last.status)) {
      console.log(`status: ${last.status}`);
      return { imageId, record: last };
    }

    await sleep(2000);
  }

  throw new Error(`Timed out waiting for processing. Last: ${JSON.stringify(last)}`);
}

async function testAdminFlow(imageId) {
  if (!ADMIN_ID_TOKEN) {
    console.log('== admin flow ==');
    console.log('Skipping (ADMIN_ID_TOKEN not set)');
    return;
  }

  console.log('== admin list + decision ==');

  const list = await apiFetch('/admin/images?status=READY_FOR_REVIEW', {
    headers: { Authorization: `Bearer ${ADMIN_ID_TOKEN}` },
  });

  const found = (list.items ?? []).find((x) => x.imageId === imageId);
  if (!found) {
    console.log('Image not in READY_FOR_REVIEW list (may be rejected). Skipping decision.');
    return;
  }

  await apiFetch(`/admin/images/${imageId}/decision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_ID_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ decision: 'APPROVE', reason: 'smoke test' }),
  });

  console.log('approved');

  if (RUN_COMMIT) {
    console.log('== admin commit ==');
    const commit = await apiFetch('/admin/commit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_ID_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ limit: 5, deleteFromS3: false }),
    });
    console.log(`commitSha: ${commit.commitSha}`);
  } else {
    console.log('Skipping commit (set RUN_COMMIT=true to enable)');
  }
}

async function main() {
  console.log(`API_URL=${API_URL}`);

  await testMetrics();
  const { imageId, record } = await testSubmitAndProcess();

  // Admin flow is only meaningful if the image made it to READY_FOR_REVIEW.
  if (record.status === 'READY_FOR_REVIEW') {
    await testAdminFlow(imageId);
  } else {
    console.log(`Not reviewable (status=${record.status}). Admin flow skipped.`);
  }

  console.log('Smoke test complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
