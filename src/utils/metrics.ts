/**
 * Prometheus metrics collector for system-wide metrics
 */

export class MetricsCollector {
  private requestCount = 0;
  private errorCount = 0;
  private requestDurations: number[] = [];
  private maxHistorySize = 1000;

  /**
   * Record a request with its duration
   */
  recordRequest(duration: number): void {
    this.requestCount++;
    this.requestDurations.push(duration);

    // Keep only last N durations
    if (this.requestDurations.length > this.maxHistorySize) {
      this.requestDurations = this.requestDurations.slice(-this.maxHistorySize);
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const avgDuration =
      this.requestDurations.length > 0
        ? this.requestDurations.reduce((a, b) => a + b, 0) / this.requestDurations.length
        : 0;

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageDuration: Math.round(avgDuration * 100) / 100,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      minDuration: this.requestDurations.length > 0 ? Math.min(...this.requestDurations) : 0,
      maxDuration: this.requestDurations.length > 0 ? Math.max(...this.requestDurations) : 0,
    };
  }

  /**
   * Convert metrics to Prometheus format
   */
  toPrometheus(): string {
    const metrics = this.getMetrics();
    let output = "";

    output += `# HELP jarvis_requests_total Total number of requests\n`;
    output += `# TYPE jarvis_requests_total counter\n`;
    output += `jarvis_requests_total ${metrics.requestCount}\n\n`;

    output += `# HELP jarvis_errors_total Total number of errors\n`;
    output += `# TYPE jarvis_errors_total counter\n`;
    output += `jarvis_errors_total ${metrics.errorCount}\n\n`;

    output += `# HELP jarvis_request_duration_avg Average request duration in milliseconds\n`;
    output += `# TYPE jarvis_request_duration_avg gauge\n`;
    output += `jarvis_request_duration_avg ${metrics.averageDuration}\n\n`;

    output += `# HELP jarvis_request_duration_min Minimum request duration in milliseconds\n`;
    output += `# TYPE jarvis_request_duration_min gauge\n`;
    output += `jarvis_request_duration_min ${metrics.minDuration}\n\n`;

    output += `# HELP jarvis_request_duration_max Maximum request duration in milliseconds\n`;
    output += `# TYPE jarvis_request_duration_max gauge\n`;
    output += `jarvis_request_duration_max ${metrics.maxDuration}\n\n`;

    output += `# HELP jarvis_error_rate Error rate (0-1)\n`;
    output += `# TYPE jarvis_error_rate gauge\n`;
    output += `jarvis_error_rate ${metrics.errorRate}\n\n`;

    return output;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.requestDurations = [];
  }
}

// Global metrics instance
export const globalMetrics = new MetricsCollector();
