export function safeS3KeySegment(input: string): string {
  // Keep it simple: remove anything that could escape prefixes.
  return input.replace(/[^a-zA-Z0-9_-]/g, '_');
}
