# Module: Self-Healing

**Location**: `src/self-healing/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Self-Healing module implements automatic error detection, diagnosis, and recovery mechanisms. It monitors system health, identifies anomalies and failures, executes automated repairs, and learns from issues to prevent future occurrences. This enables the system to maintain high availability with minimal manual intervention.

## Architecture

- **Diagnostic Engine** — Identifies root causes of failures
- **Recovery System** — Executes automated recovery procedures
- **Health Monitor** — Continuous system health tracking
- **Anomaly Detector** — ML-based anomaly detection
- **Learning System** — Captures and learns from incidents
- **Remediation Executor** — Automated fix execution

## Key Exports

### Classes
- `DiagnosticEngine` — Root cause analysis
- `RecoverySystem` — Automated recovery procedures
- `HealthMonitor` — System health tracking
- `AnomalyDetector` — Anomaly detection
- `LearningSystem` — Incident learning
- `RemediationExecutor` — Fix execution

### Types
- `HealthStatus` — System health metrics
- `Anomaly` — Detected anomaly
- `DiagnosisResult` — Root cause analysis result
- `RecoveryAction` — Remediation action
- `Incident` — Incident record

### Functions
- `diagnose(symptoms)` — Diagnose issue from symptoms
- `recover(diagnosis)` — Execute recovery for diagnosed issue
- `checkHealth()` — Check overall system health
- `detectAnomalies()` — Find current anomalies

## Dependencies

### Internal
- [`database`] — Incident and learning storage
- [`config`] — Configuration
- [`services`] — Logging and utilities
- [`api`] — System endpoints for health checks

### External
- `ml-lib` — Machine learning for anomaly detection
- `winston` — Logging

## Usage Examples

### Check System Health

```typescript
import { HealthMonitor } from '../self-healing';

const monitor = new HealthMonitor();
const health = await monitor.checkHealth();

console.log(health.status); // 'healthy', 'degraded', 'critical'
console.log(health.components); // Status of each component
```

### Diagnose an Issue

```typescript
import { DiagnosticEngine } from '../self-healing';

const diagnostic = new DiagnosticEngine();
const result = await diagnostic.diagnose({
  symptoms: ['high CPU', 'slow response times'],
  affectedComponent: 'api-server'
});

console.log(result.diagnosis); // Root cause
console.log(result.recommendations); // Suggested fixes
```

### Execute Automated Recovery

```typescript
import { RecoverySystem } from '../self-healing';

const recovery = new RecoverySystem();
const success = await recovery.recover({
  diagnosis: 'memory leak in cache',
  severity: 'high',
  component: 'caching-service'
});
```

## Configuration

```typescript
{
  enabled: boolean;
  autoRecoveryEnabled: boolean;           // Auto-execute fixes
  healthCheckInterval: number;            // Health check frequency (ms)
  anomalyDetectionEnabled: boolean;
  anomalyThreshold: number;               // Sensitivity (0-1)
  learningEnabled: boolean;               // Learn from incidents
  maxRecoveryAttempts: number;            // Retry limit
  incidentRetentionDays: number;          // How long to keep records
}
```

## Testing

Run self-healing tests:
```bash
npm run test -- src/self-healing/
```

Test coverage includes:
- Diagnostic accuracy on known issues
- Recovery success rates
- Health monitoring correctness
- Anomaly detection precision/recall
- Learning system effectiveness
- Recovery attempt limits
- Incident logging

## Performance Considerations

- Health checks run in background (non-blocking)
- Diagnostic runs are expensive; results cached
- Anomaly detection uses sampling to reduce overhead
- Recovery actions prioritized by severity
- Incident storage uses log rotation to manage disk space

## Known Issues

- [ ] Diagnostic accuracy low for novel issues (< 60%)
- [ ] Recovery doesn't handle cascading failures well
- [ ] Learning system requires manual labeling for now
- [ ] No multi-system correlation in diagnostics yet

## Related Modules

- [`api`] — Health check endpoints
- [`database`] — Incident persistence
- [`services`] — Logging and utilities
- [`config`] — Configuration

## Contributing

When adding diagnostic or recovery procedures:
1. Document the issue type it handles
2. Validate recovery success through testing
3. Add incident logging for learning
4. Consider performance impact
5. Test failure scenarios

## Changelog

### 2026-03-22
- Initial module documentation
- Documented diagnostic, recovery, and learning systems
