export function parseJsonBody<T>(body: string | undefined): T {
  if (!body) {
    throw new Error('Missing request body');
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}
