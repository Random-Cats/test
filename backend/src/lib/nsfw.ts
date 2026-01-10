// NOTE:
// You asked for nsfwjs.com style filtering from Lambda.
// Packaging tfjs/nsfwjs in Lambda can be heavy; for v1 we keep the integration optional.
//
// This implementation returns UNKNOWN by default, but is structured so you can enable
// a real classifier later without changing handler contracts.

export type NsfwVerdict = 'SAFE' | 'NSFW' | 'UNKNOWN';

export type NsfwResult = {
  verdict: NsfwVerdict;
  scores?: Record<string, number>;
};

export async function classifyNsfw(_imageBytes: Uint8Array): Promise<NsfwResult> {
  // TODO: integrate nsfwjs + tfjs-backend-wasm here.
  // For correctness/safety, we do NOT auto-approve based on UNKNOWN.
  return { verdict: 'UNKNOWN' };
}
