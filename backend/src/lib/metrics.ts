type EmfMetric = {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: string[][];
      Metrics: Array<{ Name: string; Unit?: string }>;
    }>;
  };
} & Record<string, unknown>;

export function emitCountMetric(namespace: string, metricName: string, dimensions: Record<string, string>): void {
  const dimKeys = Object.keys(dimensions);
  const payload: EmfMetric = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: [dimKeys],
          Metrics: [{ Name: metricName, Unit: 'Count' }],
        },
      ],
    },
    ...dimensions,
    [metricName]: 1,
  };

  // EMF works by logging JSON. CloudWatch extracts metrics.
  console.log(JSON.stringify(payload));
}
