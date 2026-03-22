# Module: Security

**Location**: `src/security/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Security module provides authentication, authorization, encryption, and security enforcement across the entire system. It ensures that only authenticated users can access agents, enforces role-based access control (RBAC), encrypts sensitive data, and maintains audit logs of security events.

## Architecture

- **Authentication Engine** — Token validation, JWT handling, session management
- **Authorization Engine** — Role-based access control (RBAC), permission checking
- **Encryption Service** — Data encryption/decryption for sensitive fields
- **Audit Logger** — Security event tracking and compliance logging
- **Rate Limiter** — DDoS protection and API rate limiting
- **Secrets Manager** — Secure handling of API keys and credentials

## Key Exports

### Classes
- `AuthenticationEngine` — User authentication and token management
- `AuthorizationEngine` — Permission and role checking
- `EncryptionService` — Encrypt/decrypt sensitive data
- `AuditLogger` — Security event logging
- `RateLimiter` — Request throttling
- `SecretsManager` — Credential storage and retrieval

### Types
- `User` — User identity and metadata
- `Role` — Role definition with permissions
- `Permission` — Fine-grained permission
- `SecurityEvent` — Audit log entry

### Functions
- `authenticate(credentials)` — Verify user credentials
- `authorize(user, action, resource)` — Check if user can perform action
- `encrypt(data)` — Encrypt sensitive data
- `decrypt(data)` — Decrypt encrypted data
- `logSecurityEvent(event)` — Record security event

## Dependencies

### Internal
- [`database`] — User and role persistence
- [`config`] — Security configuration
- [`services`] — Logging and utilities

### External
- `jsonwebtoken` — JWT token handling
- `bcrypt` — Password hashing
- `crypto` — Encryption primitives
- `helmet` — HTTP security headers

## Usage Examples

### Authenticate User

```typescript
import { authenticate } from '../security';

const token = await authenticate({
  username: 'user@example.com',
  password: 'password'
});
// token = { access_token: '...', expires_in: 3600 }
```

### Check Authorization

```typescript
import { authorize } from '../security';

const hasPermission = await authorize(user, 'write', 'agent:dialogue');
if (!hasPermission) {
  throw new ForbiddenError('Insufficient permissions');
}
```

### Encrypt Sensitive Data

```typescript
import { encrypt, decrypt } from '../security';

const encrypted = encrypt('sensitive-api-key');
const decrypted = decrypt(encrypted);
```

## Configuration

Security module typically configured with:

```typescript
{
  jwtSecret: string;              // JWT signing secret
  jwtExpiry: number;              // Token expiry in seconds
  passwordHashRounds: number;     // Bcrypt rounds (default: 10)
  encryptionKey: string;          // Data encryption key
  rateLimitWindow: number;        // Rate limit window (ms)
  rateLimitMaxRequests: number;   // Max requests per window
  auditLogEnabled: boolean;       // Enable audit logging
}
```

## Testing

Run security tests:
```bash
npm run test -- src/security/
```

Test coverage includes:
- Authentication success and failure
- JWT token validation and expiry
- Authorization with various roles/permissions
- Encryption/decryption roundtrips
- Rate limiting and throttling
- Audit logging for security events
- Password hashing and verification

## Performance Considerations

- JWT validation cached to avoid repeated computations
- Rate limiter uses in-memory store for low latency
- Encryption keys kept in memory (never logged or persisted plaintext)
- Audit logs batched to reduce I/O overhead
- Permission checks use hierarchical caching

## Known Issues

- [ ] No multi-factor authentication (MFA) support yet
- [ ] Token revocation not implemented
- [ ] Audit log retention policies not enforced
- [ ] No distributed rate limiting across multiple instances

## Related Modules

- [`api`] — HTTP middleware for authentication
- [`database`] — User and role persistence
- [`services`] — Logging and utilities

## Contributing

When adding security features:
1. Follow OWASP best practices
2. Never log sensitive data (passwords, tokens, keys)
3. Add corresponding tests for new auth/authz logic
4. Document security events in audit logger
5. Update this README with new exports

## Changelog

### 2026-03-22
- Initial module documentation
- Documented authentication, authorization, and encryption patterns
