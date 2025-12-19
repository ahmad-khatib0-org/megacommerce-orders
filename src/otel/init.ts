import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { register } from 'prom-client'

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317'

const traceExporter = new OTLPTraceExporter({ url: otelEndpoint })

const metricExporter = new OTLPMetricExporter({ url: otelEndpoint })

const resourceAttributes = {
  [SemanticResourceAttributes.SERVICE_NAME]: 'megacommerce-orders',
  [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.2',
  'deployment.environment': 'dev',
}

// Export for use in main application
export const otelTraceExporter = traceExporter
export const otelMetricExporter = metricExporter
export const otelResourceAttributes = resourceAttributes

console.log('OpenTelemetry exporters initialized')

// Prometheus metrics
export { register as prometheusRegister }
