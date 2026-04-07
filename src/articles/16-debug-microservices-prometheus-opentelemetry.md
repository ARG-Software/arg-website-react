---
seoTitle: Debug Microservices with Prometheus & OTel
slug: debug-microservices-prometheus-opentelemetry
tag: DevOps · Observability
title: How We Debug Slow Microservices in Minutes (Not Hours): A Prometheus + OpenTelemetry Guide
subtitle: From "checkout is broken" to root cause with metrics, traces, and logs — the observability setup that actually works in production.
date: February 2, 2026
readTime: 14 min read
mediumUrl: https://arg-software.medium.com/how-we-debug-slow-microservices-in-18-minutes-not-4-hours-a-prometheus-opentelemetry-guide-0d7b551d1722
excerpt: Monitoring tells you something broke. Observability tells you why. And that distinction is the difference between an 18-minute fix and a 4-hour war room.
---

![How we debug slow Microservices](/images/articles/how-we-debug-slow-microservices/how-we-debug-slow-microservices-header.webp)

It's 2:32 PM on a Tuesday. You're in the middle of a code review when Slack explodes.

"Checkout is broken." "Users can't pay." "The dashboard says everything is green???"

Sound familiar?

Here's the uncomfortable truth: monitoring tells you something broke. Observability tells you why. And that distinction? It's the difference between an 18-minute fix and a 4-hour war room.

## The Problem with "Green Dashboards"

Most teams monitor their systems like they're still running monoliths. But modern software is distributed, asynchronous, and constantly failing in small ways. Microservices call other microservices. Background jobs process events from queues. Third-party APIs timeout randomly.

Your dashboard shows HTTP 200? Great. But consider this response:

```json
{
  "status": 200,
  "body": {
    "success": false,
    "reason": "insufficient_funds"
  }
}
```

Server: Success. User: Can't buy anything.

If you're counting HTTP 200s as "successful checkouts," your reliability metrics are lying to you.

## The Observability Stack: What You'll Need

Before we dive into code, let's understand the tools we're using and what you need to run them.

![How we debug slow Microservices Statistics](/images/articles/how-we-debug-slow-microservices/how-we-debug-slow-microservices-stats.webp)

### Prometheus (Metrics)

Prometheus is a time-series database that scrapes metrics from your services every few seconds. It's the industry standard for cloud-native monitoring with a pull-based architecture, powerful query language (PromQL), and native alerting.

What you need to run it: Prometheus server (Docker, Kubernetes, or bare metal), the prom-client npm package in your Node.js app, a /metrics endpoint exposed on each service, and ~512MB RAM minimum for small deployments.

```bash
# Quick start with Docker
docker run -p 9090:9090 prom/prometheus
```

### OpenTelemetry (Traces)

OpenTelemetry is a vendor-neutral standard for collecting traces, metrics, and logs. Think of it as the "USB-C of observability" - one standard that works everywhere. It replaced OpenTracing and OpenCensus as the CNCF standard. Your instrumentation works with any backend (Jaeger, Zipkin, Datadog, etc.).

```bash
# Install OpenTelemetry for Node.js
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

### Jaeger or Grafana Tempo (Trace Backend)

A backend that stores traces and lets you visualize them as waterfall diagrams. Jaeger is great for getting started and easy to run locally. Grafana Tempo is better for production and integrates with Grafana dashboards.

```bash
# All-in-one Jaeger for development
docker run -p 16686:16686 -p 6831:6831/udp jaegertracing/all-in-one
```

Then open http://localhost:16686 to see your traces.

### Grafana (Visualization)

The dashboard layer that brings everything together - metrics from Prometheus, traces from Jaeger/Tempo, and logs from Loki. One place to see all three signals. Click from a spike in a metric to the slow traces to the error logs.

```bash
docker run -p 3000:3000 grafana/grafana
```

Default login: admin / admin.

### Minimum Viable Stack

If you're just getting started, here's the smallest setup that gives you real observability:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
```

```yaml
# docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  jaeger:
    image: jaegertracing/all-in-one
    ports: ["16686:16686", "6831:6831/udp"]
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

Total resources: ~1.5GB RAM, runs on any laptop. For real workloads, you'll want to add Loki for logs, persistent storage for Prometheus, and possibly the OpenTelemetry Collector as a central pipeline.

Before instrumenting your code, make sure you have: Prometheus running and scraping your services, OpenTelemetry SDK initialized in your app, a trace backend (Jaeger or Tempo) receiving spans, Grafana connected to all data sources, and your services exposing a /metrics endpoint.

## Let's Build Something Real

Enough theory. Let's instrument an actual checkout flow using Prometheus and Node.js - the same patterns work in any language.

Here's our scenario: User clicks "Buy" → Checkout Service → Kafka → Payment Service → Stripe API. Three boundaries where things break. Three places we need visibility.

## Step 1: Metrics That Actually Matter

### Don't Measure Averages. Measure Pain.

Average latency is a vanity metric. If your average is 200ms but 5% of users wait 8 seconds, you have a problem - you just can't see it. Use histograms. Track percentiles.

```javascript
// metrics.js
const prometheus = require('prom-client');

// Create a histogram for HTTP request latency
const httpLatency = new prometheus.Histogram({
  name: 'checkout_http_duration_seconds',
  help: 'Checkout endpoint latency in seconds',
  labelNames: ['route', 'method', 'status_code', 'region'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

// Middleware to track every request
app.use((req, res, next) => {
  const end = httpLatency.startTimer();
  
  res.on('finish', () => {
    end({
      route: req.route?.path || 'unknown',
      method: req.method,
      status_code: res.statusCode,
      region: req.headers['x-region'] || 'unknown'
    });
  });
  
  next();
});
```

Now in Prometheus, you can query:

```promql
histogram_quantile(0.95, 
  rate(checkout_http_duration_seconds_bucket[5m])
) by (region)
```

This tells you: "95% of requests in the EU complete in under X seconds." When X jumps from 0.2 to 4.0, you'll know exactly who's hurting.

### Track Business Outcomes, Not Just HTTP Codes

Here's the metric that changed how we think about reliability:

```javascript
// Track actual checkout outcomes
const checkoutAttempts = new prometheus.Counter({
  name: 'checkout_attempts_total',
  help: 'Total checkout attempts',
  labelNames: ['region', 'feature_flag', 'payment_provider']
});

const checkoutSuccess = new prometheus.Counter({
  name: 'checkout_success_total', 
  help: 'Successful checkouts (payment authorized)',
  labelNames: ['region', 'feature_flag', 'payment_provider']
});

// In your checkout handler
app.post('/checkout', async (req, res) => {
  const region = req.headers['x-region'];
  const featureFlag = getFeatureFlag('checkout_v2', req.user);
  
  checkoutAttempts.inc({ region, feature_flag: featureFlag });
  
  try {
    const result = await processCheckout(req.body);
    
    // Don't just check HTTP status - check business outcome
    if (result.payment.authorized && result.order.created) {
      checkoutSuccess.inc({ region, feature_flag: featureFlag });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Checkout failed' });
  }
});
```

Your SLI (Service Level Indicator) becomes dead simple:

```promql
sum(rate(checkout_success_total[5m])) 
/ 
sum(rate(checkout_attempts_total[5m]))
```

If that number drops below 99.9%, you're burning your error budget.

## Step 2: Traces That Survive Async Boundaries

Metrics tell you that something is wrong. Traces tell you where. But here's the trap: traces die at async boundaries unless you explicitly pass context.

### The Kafka Problem

When your checkout service publishes to Kafka, and your payment service consumes it, the trace ID doesn't magically follow. You have to inject it.

Producer (Checkout Service):

```javascript
const { trace, context, propagation, SpanKind } = require('@opentelemetry/api');
const tracer = trace.getTracer('checkout-service');

async function publishPaymentRequest(order) {
  return tracer.startActiveSpan('kafka.publish.payment_requested', 
    { kind: SpanKind.PRODUCER },
    async (span) => {
      // Inject trace context into Kafka headers
      const headers = {};
      propagation.inject(context.active(), headers);
      
      await producer.send({
        topic: 'payment.requested',
        messages: [{
          headers,  // This is the magic
          value: JSON.stringify({
            orderId: order.id,
            amount: order.total,
            currency: order.currency
          })
        }]
      });
      
      span.setAttributes({
        'messaging.system': 'kafka',
        'messaging.destination': 'payment.requested',
        'order.id': order.id
      });
      
      span.end();
    }
  );
}
```

Consumer (Payment Service):

```javascript
consumer.run({
  eachMessage: async ({ message }) => {
    // Extract trace context from Kafka headers
    const parentContext = propagation.extract(
      context.active(), 
      message.headers
    );
    
    // Continue the trace
    await context.with(parentContext, async () => {
      await tracer.startActiveSpan('kafka.consume.payment_requested',
        { kind: SpanKind.CONSUMER },
        async (span) => {
          const payload = JSON.parse(message.value.toString());
          
          try {
            await processPayment(payload);
            span.setStatus({ code: SpanStatusCode.OK });
          } catch (err) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw err;
          } finally {
            span.end();
          }
        }
      );
    });
  }
});
```

Now, when you click on a trace in Jaeger or Grafana Tempo, you see the entire journey:

```
checkout.request (4,180ms)
└─ kafka.publish.payment_requested (5ms)
    └─ kafka.consume.payment_requested (4,165ms)
        └─ stripe.charge (4,150ms) ← HERE'S YOUR PROBLEM
```

Without context propagation, you'd see two disconnected traces and no idea they're related.

## Step 3: Logs That Help (Not Hurt)

During an incident, you don't need more logs. You need the right logs. Always include trace_id so you can correlate with traces. Always use JSON so you can query in your log aggregator. Never log PII — user IDs are fine, emails are not. Context over verbosity — "what" and "why", not "entering function X".

```javascript
const logger = require('pino')();

async function processPayment(order) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  
  try {
    const result = await stripe.charges.create({
      amount: order.amount,
      currency: order.currency
    });
    
    logger.info({
      event: 'payment_succeeded',
      trace_id: traceId,
      order_id: order.id,
      provider: 'stripe',
      amount: order.amount
    });
    
    return result;
    
  } catch (err) {
    logger.error({
      event: 'payment_failed',
      trace_id: traceId,
      order_id: order.id,
      provider: 'stripe',
      error_code: err.code,
      error_message: err.message
    });
    
    throw err;
  }
}
```

When things break, you search for trace_id: "abc123" and see everything that happened - across all services - in one view.

## The Incident That Proved All This

Let me tell you about a real Tuesday afternoon.

14:32 UTC - Alert fires:

```
CRITICAL: Error budget burn rate 14.4x normal
Projected exhaustion: 2 days
Service: checkout
```

**Step 1: Metrics Narrow the Scope (2 minutes).** Open Grafana. Query our histogram:

```promql
histogram_quantile(0.99, 
  rate(checkout_http_duration_seconds_bucket[5m])
) by (region, feature_flag)
```

![How we debug slow Microservices Results](/images/articles/how-we-debug-slow-microservices/how-we-debug-slow-microservices-results.webp)

Isolated: EU users on the new checkout flow.

**Step 2: Traces Reveal the Bottleneck (5 minutes).** Click into a slow EU trace:

```
checkout.request (4,180ms)
└─ kafka.publish (5ms)
    └─ kafka.consume (4,165ms)
        └─ stripe.charge (4,150ms)
            ├─ attempt 1: timeout (3,000ms)
            ├─ attempt 2: timeout (3,000ms)  
            └─ attempt 3: failed
```

Smoking gun: Stripe is timing out. Three retries at 3 seconds each = 9+ second checkout.

**Step 3: Logs Explain Why (3 minutes).** Filter logs by the trace ID:

```json
{
  "level": "error",
  "event": "stripe_timeout",
  "trace_id": "abc123...",
  "provider": "stripe-eu",
  "timeout_ms": 3000,
  "region": "eu"
}
```

Check Stripe's EU docs: "Requests may take up to 5 seconds." We configured a 3-second timeout. Every EU request times out, retries twice, and fails.

**The Fix (8 minutes).** Immediate (2 min): Disable checkout_v2 for EU via feature flag. Short-term (30 min): Update timeout to 5.5 seconds. Long-term (1 day): Add stripe_retry_total metric to catch retry storms early.

Total time: 18 minutes from alert to resolution. Without observability? We'd still be grepping logs, restarting services, and arguing about whether it's a "backend problem" or "Stripe's fault."

## The Prometheus Setup: Putting It All Together

```javascript
// metrics.js - Your complete metrics setup
const prometheus = require('prom-client');

// Collect default Node.js metrics (memory, CPU, etc.)
prometheus.collectDefaultMetrics();

// Business metrics
const checkoutAttempts = new prometheus.Counter({
  name: 'checkout_attempts_total',
  help: 'Total checkout attempts',
  labelNames: ['region', 'feature_flag', 'payment_provider']
});

const checkoutSuccess = new prometheus.Counter({
  name: 'checkout_success_total',
  help: 'Successful checkouts',
  labelNames: ['region', 'feature_flag', 'payment_provider']
});

// Latency histogram
const checkoutDuration = new prometheus.Histogram({
  name: 'checkout_duration_seconds',
  help: 'End-to-end checkout duration',
  labelNames: ['region', 'feature_flag', 'outcome'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

// Downstream dependency health
const paymentProviderDuration = new prometheus.Histogram({
  name: 'payment_provider_duration_seconds',
  help: 'Payment provider API latency',
  labelNames: ['provider', 'operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const paymentProviderRetries = new prometheus.Counter({
  name: 'payment_provider_retries_total',
  help: 'Payment provider retry count',
  labelNames: ['provider', 'reason']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

module.exports = {
  checkoutAttempts,
  checkoutSuccess,
  checkoutDuration,
  paymentProviderDuration,
  paymentProviderRetries
};
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'checkout-service'
    static_configs:
      - targets: ['checkout:3000']
        
  - job_name: 'payment-service'
    static_configs:
      - targets: ['payment:3000']
```

## Alert Rules (Burn Rate, Not Thresholds)

```yaml
groups:
  - name: checkout-slo
    rules:
      # Fast burn - will exhaust 30-day budget in 2 days
      - alert: CheckoutErrorBudgetFastBurn
        expr: |
          (
            1 - (sum(rate(checkout_success_total[1h])) / sum(rate(checkout_attempts_total[1h])))
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Checkout error budget burning fast"
          description: "At current rate, 30-day error budget exhausts in 2 days"
          runbook: "https://wiki.internal/runbooks/checkout-slo"
          
      # Slow burn - will exhaust budget in 10 days  
      - alert: CheckoutErrorBudgetSlowBurn
        expr: |
          (
            1 - (sum(rate(checkout_success_total[6h])) / sum(rate(checkout_attempts_total[6h])))
          ) > (6 * 0.001)
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Checkout error budget burning"
```

The magic number: 14.4x burn rate means you'll exhaust a 30-day budget in 2 days. That's worth waking someone up for. A 6x burn rate means 5 days - worth a warning, not a page.

![How we debug slow Microservices where to start](/images/articles/how-we-debug-slow-microservices/how-we-debug-slow-microservices-start.webp)

## The Mindset Shift

Observability isn't about tools. It's not about having more dashboards or fancier log aggregators.

Observability is the design of systems that can explain themselves.

When your checkout breaks at 2 PM on a Tuesday, you shouldn't need tribal knowledge, log archaeology, or "that one engineer who knows the payment system."

You should need 18 minutes and the right queries.

That's not tooling. That's an engineering discipline.
