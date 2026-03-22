# Module: Voice

**Location**: `src/voice/`  
**Status**: Stable  
**Last Updated**: 2026-03-22

## Purpose

The Voice module provides voice input processing, speech-to-text conversion, text-to-speech output, voice command recognition, and audio streaming capabilities. It enables voice-based interaction with the system.

## Key Exports

- `VoiceEngine` — Main voice processing engine
- `SpeechToText` — Convert audio to text
- `TextToSpeech` — Convert text to audio
- `CommandRecognizer` — Parse voice commands
- `AudioStream` — Audio streaming handler

## Dependencies

- Internal: `config`, `services`
- External: `@google-cloud/speech-to-text`, `google-tts-api`

## Usage

```typescript
import { VoiceEngine } from './voice';

const engine = new VoiceEngine();
const text = await engine.speechToText(audioBuffer);
```

## Changelog

### 2026-03-22
- Initial documentation
