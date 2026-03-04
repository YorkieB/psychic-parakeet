# Jarvis v4.0 - Coding Standards

Complete coding standards and best practices guide.

## 📋 Table of Contents

1. [Code Style](#code-style)
2. [TypeScript Guidelines](#typescript-guidelines)
3. [File Organization](#file-organization)
4. [Naming Conventions](#naming-conventions)
5. [Error Handling](#error-handling)
6. [Security](#security)
7. [Testing](#testing)
8. [Git Commit Messages](#git-commit-messages)

## 🎨 Code Style

### General Rules

- **Indentation:** 2 spaces (no tabs)
- **Line Length:** Maximum 100 characters
- **Semicolons:** Always use semicolons
- **Quotes:** Single quotes for strings
- **Trailing Commas:** Use ES5 trailing commas
- **Arrow Functions:** Prefer arrow functions over function expressions

### Formatting

All code is automatically formatted with Prettier. Run:

```bash
npm run fix:prettier
```

### Example

```typescript
// ✅ Good
const getUserById = async (userId: string): Promise<User> => {
  try {
    const user = await database.findUser(userId);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw new Error('User not found');
  }
};

// ❌ Bad
function getUserById(userId) {
    var user = database.findUser(userId)
    return user
}
```

## 📘 TypeScript Guidelines

### Type Safety

- **Always use types:** Never use `any` without a good reason
- **Strict mode:** All strict TypeScript options are enabled
- **Interfaces:** Prefix interfaces with `I`
- **Type aliases:** Use PascalCase

```typescript
// ✅ Good
interface IUser {
  id: string;
  name: string;
  email: string;
}

type UserId = string;

const createUser = (data: IUser): Promise<IUser> => {
  // implementation
};

// ❌ Bad
const createUser = (data: any): any => {
  // implementation
};
```

### Null Safety

```typescript
// ✅ Good
const getUserName = (user: IUser | null): string => {
  return user?.name ?? 'Anonymous';
};

// ❌ Bad
const getUserName = (user) => {
  return user.name;
};
```

## 📁 File Organization

### Directory Structure

```
src/
├── agents/          # Individual agent implementations
├── api/             # API routes and controllers
├── middleware/      # Express middleware
├── orchestrator/    # Agent orchestration logic
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

### File Naming

- **Classes:** PascalCase (e.g., `UserService.ts`)
- **Utils:** kebab-case (e.g., `string-utils.ts`)
- **Types:** kebab-case (e.g., `user-types.ts`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `HTTP_STATUS_CODES.ts`)

### Import Order

1. Node built-ins
2. External libraries
3. Internal modules
4. Types
5. Relative imports

```typescript
// ✅ Good
import fs from 'fs';
import path from 'path';

import express from 'express';
import axios from 'axios';

import { logger } from '../utils/logger';
import { database } from '../utils/database';

import type { IUser } from '../types/user-types';

import { config } from './config';
```

## 🏷️ Naming Conventions

### Variables

```typescript
// ✅ Good
const userId = '123';
const userProfile = await fetchUserProfile(userId);
const isActive = true;
const hasPermission = checkPermission(user);

// ❌ Bad
const uid = '123';
const up = await fetchUserProfile(uid);
const active = true;
const perm = checkPermission(user);
```

### Functions

```typescript
// ✅ Good
const calculateTotal = (items: Item[]): number => { /* ... */ };
const fetchUserData = async (id: string): Promise<User> => { /* ... */ };
const isValidEmail = (email: string): boolean => { /* ... */ };

// ❌ Bad
const calc = (items) => { /* ... */ };
const getData = async (id) => { /* ... */ };
const validEmail = (email) => { /* ... */ };
```

### Classes

```typescript
// ✅ Good
class UserService {
  private database: Database;
  
  async getUserById(id: string): Promise<IUser> {
    return this.database.findUser(id);
  }
}

// ❌ Bad
class userservice {
  db;
  
  getUser(id) {
    return this.db.findUser(id);
  }
}
```

### Constants

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;
const API_BASE_URL = 'https://api.example.com';

// ❌ Bad
const maxRetries = 3;
const timeout = 5000;
const apiUrl = 'https://api.example.com';
```

## ⚠️ Error Handling

### Always Use Try-Catch

```typescript
// ✅ Good
const processPayment = async (amount: number): Promise<void> => {
  try {
    await paymentGateway.charge(amount);
    logger.info('Payment processed successfully');
  } catch (error) {
    logger.error('Payment processing failed:', error);
    throw new PaymentError('Failed to process payment');
  }
};

// ❌ Bad
const processPayment = async (amount) => {
  await paymentGateway.charge(amount);
  logger.info('Payment processed');
};
```

### Custom Errors

```typescript
// ✅ Good
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

throw new ValidationError('Invalid email format');

// ❌ Bad
throw 'Invalid email';
```

## 🔒 Security

### Input Validation

```typescript
// ✅ Good
const createUser = (email: string, password: string): IUser => {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email');
  }
  
  if (password.length < 8) {
    throw new ValidationError('Password too short');
  }
  
  // Create user
};

// ❌ Bad
const createUser = (email, password) => {
  // Create user without validation
};
```

### No Hardcoded Secrets

```typescript
// ✅ Good
const apiKey = process.env.API_KEY;

// ❌ Bad
const apiKey = 'sk_live_1234567890abcdef';
```

## 🧪 Testing

### Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: userId, name: 'John' };
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toEqual(expectedUser);
    });
    
    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      
      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow();
    });
  });
});
```

## 📝 Git Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes

### Examples

```bash
# ✅ Good
feat(auth): add JWT token refresh endpoint
fix(api): resolve race condition in agent registry
docs(readme): update installation instructions

# ❌ Bad
Updated stuff
Fixed bug
changes
```

## ✅ Pre-commit Checklist

Before committing code:

- [ ] Run `npm run lint` - No errors
- [ ] Run `npm run type-check` - No type errors
- [ ] Run `npm run test:quick` - All tests pass
- [ ] Code is formatted with Prettier
- [ ] No `console.log` statements (use logger)
- [ ] No commented-out code
- [ ] All imports are used
- [ ] Commit message follows conventions

## 🚀 Quick Commands

```bash
# Fix all auto-fixable issues
npm run fix

# Run all quality checks
npm run quality

# Analyze code metrics
npm run analyze

# Full test suite
npm test
```

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
