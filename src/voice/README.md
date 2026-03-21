# Voice Module

## Overview

The voice module handles voice input/output for the Jarvis system, including speech recognition, text-to-speech synthesis, voice cloning, and voice visualization. It integrates with multiple speech APIs (Google Cloud Speech, Azure Speech, Anthropic Claude) and local TTS engines.

## Architecture

```
Voice Input Stream
        ↓
    Speech Recognition (STT)
        ↓
    Text Processing
        ↓
    LLM Processing
        ↓
    Text-to-Speech (TTS)
        ↓
Voice Output Stream
```

## Key Components

- **Speech Recognition** (`stt.ts`): Convert audio to text (STT)
- **Text-to-Speech** (`tts.ts`): Convert text to audio (TTS)
- **Voice Cloning** (`voice-cloning.ts`): Custom voice synthesis
- **Voice Visualization** (`visualizer.ts`): Real-time waveform/spectrogram
- **Audio Processing** (`audio-processor.ts`): Audio format conversion, normalization
- **Voice Quality** (`voice-quality.ts`): Analyze and improve voice output

## Usage

### Speech Recognition (STT)

```typescript
import { getSpeechRecognizer } from './stt';

const recognizer = getSpeechRecognizer();

const stream = recognizer.streamRecognize({
  language: 'en-US',
  interimResults: true
});

stream.on('result', (text, isFinal) => {
  if (isFinal) {
    console.log('Recognized:', text);
  }
});
```

### Text-to-Speech (TTS)

```typescript
import { getTextToSpeech } from './tts';

const tts = getTextToSpeech();

const audioStream = await tts.synthesize({
  text: 'Hello, how can I help you?',
  voice: 'en-US-Neural2-C',
  speed: 1.0,
  pitch: 0.0
});

audioStream.pipe(process.stdout);
```

### Voice Cloning

```typescript
import { voiceCloning } from './voice-cloning';

// Train on voice samples
await voiceCloning.train({
  voiceId: 'user-voice-1',
  samples: [audio1, audio2, audio3],
  speakerId: 'user123'
});

// Synthesize with cloned voice
const clonedAudio = await voiceCloning.synthesize({
  text: 'This sounds like me!',
  voiceId: 'user-voice-1'
});
```

### Voice Visualization

```typescript
import { getVoiceVisualizer } from './visualizer';

const visualizer = getVoiceVisualizer();

// Generate real-time waveform
const waveform = visualizer.getWaveform(audioBuffer);

// Generate spectrogram
const spectrogram = visualizer.getSpectrogram(audioBuffer);
```

## Configuration

```env
# Speech Recognition Provider
STT_PROVIDER=google  # google, azure, anthropic, local
STT_LANGUAGE=en-US

# Text-to-Speech Provider
TTS_PROVIDER=google  # google, azure, elevenlabs, local
TTS_VOICE=en-US-Neural2-C
TTS_SPEED=1.0
TTS_PITCH=0.0

# Voice Cloning
VOICE_CLONE_ENABLED=true
VOICE_CLONE_PROVIDER=elevenlabs

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GOOGLE_CLOUD_PROJECT=my-project

# Azure Speech
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=eastus

# ElevenLabs
ELEVENLABS_API_KEY=your-key

# Local/Offline
OFFLINE_TTS_MODEL=glow-tts  # glow-tts, tacotron2, etc.
OFFLINE_STT_MODEL=whisper   # whisper, etc.

# Audio Settings
SAMPLE_RATE=16000
AUDIO_CHANNELS=1
AUDIO_ENCODING=LINEAR16
```

## Supported Speech Services

### Google Cloud Speech
- Best accuracy
- ~$0.015-0.024 per 15 minutes audio
- Supports 120+ languages

### Azure Speech
- Good accuracy
- ~$1-4 per million chars (TTS)
- Enterprise support

### ElevenLabs
- Best voice quality
- ~$5-99/month
- Voice cloning support

### Local/Offline
- Free, privacy-first
- Lower quality
- No API calls

## Voice Visualization

### Waveform
Shows real-time audio amplitude:

```
████████░░░░░░░░░░░
```

### Spectrogram
Shows frequency content over time (visual representation of speech).

## Related Standards

- `.github/docs/quality/PERFORMANCE-STANDARDS.md` — Voice latency targets
- `.github/docs/error-handling/LOGGING-STANDARDS.md` — Voice error logging
- `.github/docs/architecture/COMPONENT-STANDARDS.md` — Component design

## Performance Targets

- **STT Latency** — <2s for audio chunk
- **TTS Latency** — <500ms for sentence
- **Voice Quality** — 16kHz minimum
- **Visualization** — 60 FPS for real-time display

## Integration Points

- **Agents** (`src/agents/`): Voice agents for conversation
- **Desktop App** (`jarvis-desktop/`): Voice UI integration
- **Middleware** (`src/middleware/`): Voice request middleware
- **Services** (`src/services/`): High-level voice services

## Best Practices

- [ ] Always normalize audio before processing
- [ ] Implement voice activity detection to reduce API costs
- [ ] Cache TTS results for repeated phrases
- [ ] Stream audio for low-latency interaction
- [ ] Handle voice cloning training asynchronously
- [ ] Monitor STT/TTS API costs
- [ ] Test voice cloning with diverse speakers
