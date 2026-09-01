import type { MetricType } from '@/types'

export const METRIC_LABELS: Record<Exclude<MetricType, 'none'>, string> = {
  distance_km: 'Distance (km)',
  duration_min: 'Duration (min)',
}

/** Formats a metric value for display, e.g. "5.2 km" / "45 min". Returns null if there's nothing to show. */
export function formatMetric(metricType: MetricType, value: number | null | undefined): string | null {
  if (metricType === 'none' || value === null || value === undefined) return null
  const trimmed = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return metricType === 'distance_km' ? `${trimmed} km` : `${trimmed} min`
}
