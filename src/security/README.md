# Security Module

## Overview

The security module implements a 5-layer security architecture protecting the Jarvis system from unauthorized access, injection attacks, data leaks, and privilege escalation. It provides authentication, authorization, input validation, and data protection.

## Architecture

### 5-Layer Security Model

```
Layer 1: Authentication (JWT, API Keys)
         ↓
Layer 2: Authorization (RBAC, Resource-level permissions)
         ↓
Layer 3: Input Validation (Type checking, Sanitization, Schema validation)
         ↓
Layer 4: Data Protection (Encryption, Secrets management)
         ↓
Layer 5: Audit Logging (Security events, Access logs)
```

## Key Components

- **Authentication** (`auth.ts`): JWT verification, API key validation, session management
- **Authorization** (`rbac.ts`): Role-Based Access Control with resource-level checks
- **Input Validation** (`validators.ts`): Type guards, schema validation, sanitization
- **Encryption** (`encryption.ts`): Data encryption/decryption for sensitive data
- **Secrets Manager** (`secrets.ts`): Secure environment variable management
- **Audit Logger** (`audit.ts`): Security event logging and tracking

## Usage

### Authentication

```typescript
import { verifyJWT, validateApiKey } from './auth';

// Verify JWT token
const user = await verifyJWT(token);

// Validate API key
const client = await validateApiKey(apiKey);
```

### Authorization

```typescript
import { authorize } from './rbac';

// Check if user can perform action
await authorize(userId, 'agents:execute', agentId);
```

### Input Validation

```typescript
import { validateRequest } from './validators';

// Validate request payload against schema
const validated = validateRequest(requestBody, agentExecuteSchema);
```

### Data Encryption

```typescript
import { encrypt, decrypt } from './encryption';

// Encrypt sensitive data
const encrypted = await encrypt(sensitiveData);

// Decrypt when needed
const decrypted = await decrypt(encrypted);
```

## Configuration

```env
# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
API_KEY_LENGTH=32

# Encryption
ENCRYPTION_KEY=your-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# Authorization
RBAC_ENFORCEMENT=true
DEFAULT_ROLE=user

# Audit
AUDIT_LOG_LEVEL=info
AUDIT_RETENTION_DAYS=90
```

## Related Standards

- `.github/docs/quality/SECURITY-STANDARDS.md` — Security best practices
- `.github/docs/error-handling/SECURITY-ERROR-HANDLING.md` — Secure error handling
- `.github/docs/logic/INPUT-VALIDATION-STANDARDS.md` — Input validation rules

## Common Patterns

### Protecting an Endpoint

```typescript
import { authenticate, authorize } from '../security';

app.post('/agents/:id/execute', authenticate, async (req, res) => {
  await authorize(req.user.id, 'agents:execute', req.params.id);
  // Execute agent...
});
```

### Sanitizing User Input

```typescript
import { sanitize } from '../security/validators';

const cleanInput = sanitize(userInput, 'text');
```

### Handling Secrets

```typescript
import { getSecret } from '../security/secrets';

const apiKey = await getSecret('OPENAI_API_KEY');
```

## Security Checklist

Before deploying:
- [ ] All endpoints behind authentication middleware
- [ ] All user input validated against schema
- [ ] All sensitive data encrypted at rest
- [ ] All secrets in environment variables (not code)
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] HTTPS enforced in production
