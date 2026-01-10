# Metrics + Grafana dashboard

This backend emits metrics to **CloudWatch**, which Amazon Managed Grafana can chart.

## What we measure

- `pageview` events (optional; lightweight)
- `click` events
- `submit` events
- API and Lambda health (4xx/5xx, duration, errors)

## How metrics are emitted

- `POST /metrics/event` accepts `{ "event": "click" }`
- The Lambda logs a CloudWatch **Embedded Metric Format (EMF)** event
- CloudWatch automatically creates metrics from those logs

This avoids needing direct `PutMetricData` calls.

## Set up Amazon Managed Grafana (step-by-step)

1. In AWS Console, go to **Amazon Managed Grafana** and create a workspace.
2. Under **Authentication**, pick what you prefer (AWS SSO is simplest).
3. Under **Data sources**, enable **CloudWatch**.
4. Grant the workspace an IAM role with permissions:
   - `cloudwatch:ListMetrics`
   - `cloudwatch:GetMetricData`
   - `cloudwatch:GetMetricStatistics`
   - `logs:DescribeLogGroups`
   - `logs:GetLogEvents`

Example IAM policy (minimum-ish):

```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Effect": "Allow",
         "Action": [
            "cloudwatch:ListMetrics",
            "cloudwatch:GetMetricData",
            "cloudwatch:GetMetricStatistics",
            "logs:DescribeLogGroups",
            "logs:GetLogEvents"
         ],
         "Resource": "*"
      }
   ]
}
```

## Create a dashboard

In Grafana:

1. Create a dashboard.
2. Add a panel.
3. Data source: **CloudWatch**.
4. Namespace: `RandomCatClicker` (this repo uses this namespace).
5. MetricName examples:
   - `EventCount` with dimension `event=click`
   - `EventCount` with dimension `event=submit`

Recommended panels:
- Daily clicks: `SUM` over 1d
- Daily submissions: `SUM` over 1d
- Daily pageviews (optional): `SUM` over 1d
- API errors: API Gateway `4XXError`, `5XXError`
- Lambda errors/duration p95

## Suggested CloudWatch query settings

For EventCount panels:
- Namespace: `RandomCatClicker`
- Metric name: `EventCount`
- Dimension: `event=click` (or `submit`, `pageview`)
- Statistic: `Sum`
- Period: `1d` (or `1h` for more detail)

## Testing the metrics endpoint

Once deployed:

```bash
curl -X POST "$ApiUrl/metrics/event" \
  -H "content-type: application/json" \
  -d '{"event":"click"}'
```

Then check CloudWatch Metrics → Namespace `RandomCatClicker`.
