# Voice Interface Setup Guide

## Prerequisites

1. **ElevenLabs API Key**
   - Sign up: https://elevenlabs.io/
   - Free tier: 10,000 characters/month
   - Paid: $5-22/month for more

2. **Picovoice Access Key** (for barge-in)
   - Sign up: https://console.picovoice.ai/
   - Free tier: 10,000 requests/month
   - Get access key from dashboard

3. **OpenAI API Key**
   - Already configured (Whisper STT)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

Add to `.env`:
```env
# Voice & TTS
ELEVENLABS_API_KEY=your_key_here
PICOVOICE_ACCESS_KEY=your_key_here
```

## Voice Cloning

### Step 1: Prepare Audio Samples

Record 1-5 minutes of your voice:

- Use clear audio (no background noise)
- Include varied emotions:
  - Neutral: "Hello, I'm Jarvis."
  - Happy: "That's fantastic news!"
  - Serious: "This requires attention."
  - Empathetic: "I understand your concern."
- Save as MP3, WAV, M4A, or FLAC

### Step 2: Run Cloning Script

```bash
# Create directory
mkdir voice-samples

# Add your audio files
cp your-recording.mp3 voice-samples/sample1.mp3

# Run cloning script
npx ts-node scripts/clone-voice.ts
```

### Step 3: Configure Voice ID

```bash
# Add to .env (from script output)
JARVIS_VOICE_ID=your_cloned_voice_id_here
```

## Usage

### Start Jarvis

```bash
npm start
```

### Enter Voice Mode

After system starts, voice mode function is available:

```typescript
// In Node.js REPL or your code
handleVoiceMode();
```

Or integrate with your CLI/UI.

### Voice Interaction Flow

1. **User speaks**: "What's my schedule today?"
2. **System**:
   - Transcribes speech (Whisper)
   - Analyzes emotion
   - Processes query
   - Responds with appropriate emotion
   - Speaks response in cloned voice

### Barge-In (Interrupt)

While Jarvis is speaking:
- Just start talking
- Jarvis stops immediately
- Processes your interruption
- Continues naturally

## Emotion Types

| Emotion | When Used | Example |
|---------|-----------|---------|
| **Neutral** | Facts, data | "Your balance is $1,250" |
| **Warm** | Greetings | "Good morning! How can I help?" |
| **Empathetic** | Problems | "I understand this is stressful" |
| **Excited** | Good news | "That's amazing! Congratulations!" |
| **Calm** | Anxiety | "Let's work through this together" |
| **Serious** | Important | "This requires immediate attention" |
| **Playful** | Casual | "Haha, that's a good one!" |
| **Urgent** | Emergency | "Calling emergency services now" |

## Troubleshooting

### No audio detected
- Check microphone permissions
- Test: `arecord -l` (Linux) or check System Preferences (Mac)

### Voice cloning failed
- Ensure 1+ minute of audio
- Check audio quality (clear, no noise)
- Verify ElevenLabs API key

### Barge-in not working
- Verify `PICOVOICE_ACCESS_KEY` in `.env`
- Check console for "Cobra VAD initialized"
- Adjust sensitivity if needed

### Poor emotion detection
- Provide more context in query
- Check LLM temperature (lower = more consistent)

## Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| **ElevenLabs** | 10K chars/mo | $5-22/mo |
| **Picovoice** | 10K requests/mo | Contact sales |
| **OpenAI Whisper** | Pay per use | ~$0.006/min |

**Estimated cost**: $0-10/month for personal use

## Advanced Configuration

### Adjust Emotion Intensity

Edit `src/agents/voice-agent.ts`:

```typescript
// Increase/decrease emotion intensity
stability: 0.3, // Lower = more emotional
style: 0.6,     // Higher = more stylized
```

### Barge-In Sensitivity

Edit `src/voice/barge-in-controller.ts`:

```typescript
// Adjust detection threshold
voiceDetectionThreshold: 0.7, // 0.0 - 1.0
requiredConsecutiveFrames: 3,  // ~300ms
```

## Notes

- Barge-in requires Picovoice Cobra (free tier available)
- Voice cloning requires ElevenLabs (free tier: 10K chars)
- All audio processing is local except API calls
- Supports 29 languages (ElevenLabs Multilingual v2)
- Average latency: <1s for TTS, <100ms for barge-in
