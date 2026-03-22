# ✅ Knowledge Base Integration Complete

## What's Been Integrated

The knowledge base is now fully integrated with the health monitoring system:

### 1. **Health Event Handler** (`src/self-healing/spawner/health-event-handler.ts`)
   - Connects health events to diagnostic/repair engines
   - Handles errors, crashes, and performance issues
   - Configurable auto-diagnosis and auto-repair

### 2. **Agent Pool Manager Integration**
   - Health events automatically trigger knowledge base
   - Crashes, errors, and performance issues are diagnosed
   - Auto-repair can be enabled (default: disabled for safety)

### 3. **Main System Integration** (`src/index.ts`)
   - Knowledge base initializes automatically if LLM is available
   - Diagnostic and repair engines created
   - Health event handler connected to pool manager

## How It Works

```
Agent Health Check
    ↓
Health Event Detected (crash/error/warning)
    ↓
Health Event Handler
    ↓
Diagnostic Engine (RAG Pipeline)
    ↓
Search Stack v2 + Software Heritage
    ↓
Generate Fix with LLM
    ↓
Repair Engine (if enabled)
    ↓
Apply Fix (restart/code-fix/config-fix)
```

## Configuration

Environment variables:

```bash
# Enable/disable features
ENABLE_AUTO_DIAGNOSIS=true   # Default: true
ENABLE_AUTO_REPAIR=false     # Default: false (safety)
MIN_REPAIR_CONFIDENCE=0.7    # Default: 0.7

# Required for knowledge base
OPENAI_API_KEY=your_key
```

## Current Status

✅ **Auto-Diagnosis**: Enabled by default
- When agents crash or have errors, the knowledge base is queried
- Fix suggestions are generated using RAG
- Results are logged for review

⚠️ **Auto-Repair**: Disabled by default (safety)
- Can be enabled with `ENABLE_AUTO_REPAIR=true`
- Only applies fixes with confidence > 0.7
- Currently supports 'restart' strategy (code-fix needs implementation)

## Usage

### Automatic (Default)
The system automatically:
1. Detects health issues during health checks
2. Diagnoses issues using knowledge base
3. Logs diagnosis and fix suggestions
4. Optionally applies repairs (if enabled)

### Manual Diagnosis
You can also trigger diagnosis manually via the API:

```typescript
// In your code
const healthEvent: HealthEvent = {
  agentName: 'ConversationAgent',
  timestamp: new Date(),
  eventType: 'error',
  message: 'Memory leak detected',
  details: {
    stackTrace: '...',
  },
};

const diagnosis = await diagnostic.diagnose(healthEvent);
console.log(diagnosis.fixCode);
```

## Next Steps

1. **Enable Auto-Repair** (when ready):
   ```bash
   export ENABLE_AUTO_REPAIR=true
   ```

2. **Implement Code Fix Application**:
   - The repair engine has a framework
   - Code fix application needs to be implemented
   - Would involve parsing fix code and applying it to files

3. **Monitor Results**:
   - Check logs for diagnosis results
   - Review fix suggestions
   - Adjust confidence thresholds as needed

## Testing

The knowledge base is now active and will:
- Automatically diagnose agent issues
- Generate fix suggestions
- Log all results

To test, you can:
1. Simulate an agent error
2. Check logs for diagnosis
3. Review the generated fix suggestions

## Safety Features

- Auto-repair is **disabled by default**
- Only high-confidence fixes (>0.7) are applied
- All actions are logged
- Manual override available

The knowledge base is **fully integrated and ready to use**! 🎉
