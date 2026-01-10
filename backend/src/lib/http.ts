import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string, details?: unknown): APIGatewayProxyResultV2 {
  return json(400, { error: 'BadRequest', message, details });
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResultV2 {
  return json(401, { error: 'Unauthorized', message });
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResultV2 {
  return json(403, { error: 'Forbidden', message });
}

export function notFound(message = 'NotFound'): APIGatewayProxyResultV2 {
  return json(404, { error: 'NotFound', message });
}

export function serverError(message = 'ServerError'): APIGatewayProxyResultV2 {
  return json(500, { error: 'ServerError', message });
}
