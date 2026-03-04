# Jarvis API Testing Suite

Comprehensive testing suite for all 404 API endpoints.

## Test Files

### 1. `endpoint-tests.sh` (Bash)
- **Platform**: Linux/macOS/Git Bash
- **Usage**: `./tests/endpoint-tests.sh`
- **Requirements**: `curl`, `jq`
- **Tests**: All 404 endpoints

### 2. `endpoint-tests.ps1` (PowerShell)
- **Platform**: Windows PowerShell
- **Usage**: `.\tests\endpoint-tests.ps1`
- **Requirements**: PowerShell 5.1+
- **Tests**: All 404 endpoints

### 3. `test-runner.ts` (TypeScript)
- **Platform**: Node.js (cross-platform)
- **Usage**: `npm run test:endpoints` or `ts-node tests/test-runner.ts`
- **Requirements**: `node-fetch`, TypeScript
- **Features**: 
  - Detailed JSON report
  - Group summaries
  - Response time tracking
  - Error details

### 4. `automated-test-runner.ts` (TypeScript with Axios)
- **Platform**: Node.js (cross-platform)
- **Usage**: `npm run test:automated` or `ts-node tests/automated-test-runner.ts`
- **Requirements**: `axios`, `chalk`, TypeScript
- **Features**: 
  - Colored console output (chalk)
  - Detailed JSON report (`test-results.json`)
  - Group summaries
  - Response time tracking
  - Error details
  - Better error handling with axios

## Test Groups

1. **Health & Status** (10 tests)
2. **Authentication** (15 tests)
3. **Agent Management** (15 tests)
4. **System Management** (10 tests)
5. **Batch Operations** (5 tests)
6. **Security Agent** (25 tests)
7. **Health API** (35 tests)
8. **Analytics API** (20 tests)
9. **Webhook API** (10 tests)
10. **Individual Agent Endpoints** (259 tests - 7 per agent × 37 agents)

**Total: 404 endpoint tests**

## Prerequisites

### For Bash Script:
```bash
# Install jq (JSON processor)
# macOS:
brew install jq

# Ubuntu/Debian:
sudo apt-get install jq

# Make script executable:
chmod +x tests/endpoint-tests.sh
```

### For PowerShell Script:
```powershell
# No additional requirements
# Just run:
.\tests\endpoint-tests.ps1
```

### For TypeScript Runners:
```bash
# Install dependencies:
npm install node-fetch @types/node-fetch chalk

# Run test-runner.ts:
npm run test:endpoints
# or
npx ts-node tests/test-runner.ts

# Run automated-test-runner.ts (recommended):
npm run test:automated
# or
npx ts-node tests/automated-test-runner.ts
```

## Configuration

Edit the test scripts to change:
- `BASE_URL`: Main API server URL (default: `http://localhost:3000`)
- `SECURITY_URL`: Security agent URL (default: `http://localhost:3038`)
- `AGENT_NAME`: Agent to use for testing (default: `Dialogue`)

## Running Tests

### Quick Test (Bash):
```bash
./tests/endpoint-tests.sh
```

### Quick Test (PowerShell):
```powershell
.\tests\endpoint-tests.ps1
```

### Detailed Test (TypeScript):
```bash
# Using test-runner.ts:
npm run test:endpoints

# Using automated-test-runner.ts (with colored output):
npm run test:automated
```

## Expected Results

- **All tests passing**: Exit code 0
- **Some tests failing**: Exit code 1 with detailed failure report

## Test Reports

The TypeScript runners generate detailed JSON reports:

- **test-runner.ts**: `tests/test-report.json`
- **automated-test-runner.ts**: `test-results.json` (project root)

Both contain:
- Summary statistics
- Per-group results
- Individual test results with response times
- Error details for failed tests

## Notes

- Some admin-only endpoints are skipped in automated tests
- Agent restart endpoints are skipped to avoid disrupting services
- Tests require the system to be running on default ports
- Authentication tests create test users (cleanup may be needed)

## Troubleshooting

### Connection Refused
- Ensure all services are running:
  - Main API server (port 3000)
  - Security agent (port 3038)
  - All 37 agents (ports 3001-3037)

### Authentication Failures
- Tests create test users automatically
- If tests fail, you may need to clean up test users manually

### Timeout Errors
- Some endpoints may take longer to respond
- Increase timeout in test scripts if needed

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run API Tests
  run: |
    npm run build
    npm start &
    sleep 10
    ./tests/endpoint-tests.sh
```
