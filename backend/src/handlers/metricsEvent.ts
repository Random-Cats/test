import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { badRequest, json } from '../lib/http';
import { parseJsonBody } from '../lib/jsonBody';
import { emitCountMetric } from '../lib/metrics';

type Body = { event: 'pageview' | 'click' | 'submit' };

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  let body: Body;
  try {
    body = parseJsonBody<Body>(event.body);
  } catch (e: any) {
    return badRequest(e.message);
  }

  if (!body.event || !['pageview', 'click', 'submit'].includes(body.event)) {
    return badRequest('event must be one of: pageview, click, submit');
  }

  const ns = process.env.METRICS_NAMESPACE ?? 'RandomCatClicker';
  emitCountMetric(ns, 'EventCount', { event: body.event });

  return json(200, { ok: true });
}
