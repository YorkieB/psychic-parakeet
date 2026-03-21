# Lockdown Module

## Overview

The lockdown module implements security hardening and operational lockdown features for the Jarvis system. It provides API lockdown, maintenance mode, read-only mode, and emergency shutdown capabilities.

## Architecture

```
Lockdown Manager
├── API Lockdown (block external requests)
├── Maintenance Mode (limited operations)
├── Read-Only Mode (no writes)
└── Emergency Shutdown (graceful termination)
```

## Key Components

- **Lockdown Manager** (`manager.ts`): Central lockdown control
- **API Blocker** (`api-blocker.ts`): Block external API calls
- **Maintenance Mode** (`maintenance-mode.ts`): Run in limited mode
- **Read-Only Mode** (`read-only-mode.ts`): Prevent writes
- **Emergency Handler** (`emergency-handler.ts`): Emergency shutdown

## Usage

### Activate Lockdown

```typescript
import { getLockdownManager } from './lockdown';

const lockdown = getLockdownManager();

// Activate API lockdown (block external requests)
await lockdown.activateAPILockdown({
  duration: 3600,
  reason: 'Emergency maintenance',
  allowlist: ['127.0.0.1']  // Local requests allowed
});

// Activate maintenance mode
await lockdown.activateMaintenance({
  duration: 1800,
  reason: 'Database backup in progress'
});

// Activate read-only mode
await lockdown.activateReadOnly({
  reason: 'Database corruption detected'
});
```

### Check Lockdown Status

```typescript
const status = lockdown.getStatus();
console.log(status);
// {
//   isLocked: true,
//   mode: 'api-lockdown',
//   reason: 'Emergency maintenance',
//   expiresAt: '2026-03-21T12:30:00Z'
// }
```

### Deactivate Lockdown

```typescript
await lockdown.deactivateAll();
```

## Lockdown Modes

### API Lockdown
- Blocks all external API requests
- Local requests (127.0.0.1) still allowed for monitoring
- Agents continue internal operations
- Used for: Emergency, emergency rollback

### Maintenance Mode
- Limited operations only
- Accept requests but with degraded service
- Long operations blocked
- Used for: Database backup, system updates

### Read-Only Mode
- Prevent all write operations
- Allow read operations
- Track attempted writes for logs
- Used for: Data corruption, unexpected state

## Configuration

```env
# Lockdown
LOCKDOWN_ENABLED=true
LOCKDOWN_EMERGENCY_TIMEOUT=3600
LOCKDOWN_MAINTENANCE_TIMEOUT=1800

# Maintenance Mode
MAINTENANCE_MODE_ALLOWED_ENDPOINTS=/health,/status
MAINTENANCE_MODE_WHITELIST_USERS=

# Read-Only Mode
READ_ONLY_ALLOWED_OPERATIONS=select,get

# Emergency
EMERGENCY_CONTACT=admin@example.com
EMERGENCY_SLACK_WEBHOOK=https://hooks.slack.com/...
```

## HTTP Response During Lockdown

### API Lockdown Response
```json
{
  "error": {
    "code": "API_LOCKED",
    "message": "API is temporarily locked for emergency maintenance",
    "lockedUntil": "2026-03-21T12:30:00Z",
    "reason": "Emergency maintenance",
    "contactSupport": true
  }
}
```

HTTP Status: `503 Service Unavailable`

### Read-Only Response
```json
{
  "error": {
    "code": "READ_ONLY_MODE",
    "message": "System is in read-only mode",
    "operation": "POST",
    "path": "/api/agents",
    "reason": "Data corruption detected"
  }
}
```

HTTP Status: `409 Conflict`

## Related Standards

- `.github/docs/quality/SECURITY-STANDARDS.md` — Lockdown security
- `.github/docs/error-handling/ERROR-HANDLING-STANDARDS.md` — Error responses
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Lockdown logging

## Monitoring

### Lockdown Events Logged
- Lockdown activated/deactivated
- Lockdown violations (blocked requests)
- Duration exceeded
- Transition between modes

### Alerts
- Lockdown activated
- Lockdown expires soon
- Attempted violations during lockdown

## Emergency Procedures

### Activate Emergency Lockdown
```bash
curl -X POST http://localhost:3000/admin/lockdown/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "mode": "api-lockdown",
    "duration": 3600,
    "reason": "Security incident"
  }'
```

### Check Status
```bash
curl http://localhost:3000/admin/lockdown/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Deactivate
```bash
curl -X POST http://localhost:3000/admin/lockdown/deactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "reason": "Issue resolved" }'
```

## Integration Points

- **API** (`src/api/`): API routes check lockdown status
- **Middleware** (`src/middleware/`): Lockdown middleware blocks requests
- **Security** (`src/security/`): Security checks integration
- **Self-Healing** (`src/self-healing/`): Auto-activate on critical issues

## Best Practices

- [ ] Document all lockdown activations in logs
- [ ] Set reasonable default durations
- [ ] Allow monitoring endpoints during lockdown
- [ ] Notify admins of lockdown activation
- [ ] Test lockdown procedures regularly
- [ ] Have clear escalation procedures
- [ ] Monitor lockdown state
- [ ] Keep detailed audit trail
