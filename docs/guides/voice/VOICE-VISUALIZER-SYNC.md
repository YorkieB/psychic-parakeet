# Voice Visualizer Synchronization with Jarvis Speech

## Overview
The voice visualizer bars in the desktop app now animate in sync with Jarvis speaking, not just when listening to user input.

## Changes Made

### 1. Enhanced `audio-service.ts`
**File:** `jarvis-desktop/src/renderer/services/audio-service.ts`

**New Features:**
- Added speech event callbacks (`onSpeechStart`, `onSpeechEnd`)
- New method `playJarvisSpeech()` for playing Jarvis audio responses
- Added `getAnalyser()` method to access real-time audio frequency data
- Automatic event emission when audio plays/stops

**Key Methods:**
```typescript
playJarvisSpeech(audioData: ArrayBuffer | string)  // Play Jarvis speech with events
getAnalyser(): AnalyserNode | null                  // Get audio analyser for visualization
onSpeechStart(callback: () => void)                 // Register start callback
onSpeechEnd(callback: () => void)                   // Register end callback
```

### 2. Enhanced `useVoice.ts` Hook
**File:** `jarvis-desktop/src/renderer/hooks/useVoice.ts`

**New Features:**
- Added output audio visualization (separate from input)
- Integration with `audioService` for speech event detection
- Smooth animation of visualizer bars during Jarvis speech
- Gentle fade-out animation when speech ends
- Real-time frequency data from audio analyser

**New State:**
```typescript
outputAnalyserRef     // Analyser for output audio
outputAnimationRef    // Animation frame for output visualization
audioContextRef       // Audio context reference
```

### 3. Existing Components (Already Working)
- `VoiceVisualizer.tsx` - Main voice UI component
- `VoiceWaveform.tsx` - Canvas-based waveform display

## How It Works

### Audio Flow
```
Jarvis Response → audioService.playJarvisSpeech()
                    ↓
                onSpeechStart event
                    ↓
                useVoice hook updates isSpeaking=true
                    ↓
                getAnalyser() provides frequency data
                    ↓
                Animation loop updates amplitude state
                    ↓
                VoiceWaveform renders animated bars
                    ↓
                onSpeechEnd event
                    ↓
                Fade-out animation
```

### Visualization States
1. **Idle** - All bars at 0 height (flat line)
2. **Listening** - Bars animate with microphone input
3. **Speaking** - Bars animate with Jarvis audio output
4. **Fade-out** - Smooth transition back to idle

## Usage

### Playing Jarvis Speech with Visualization
```typescript
import { audioService } from './services/audio-service';

// Play audio with automatic visualization
const audioData = await fetch('/api/tts/speak').then(r => r.arrayBuffer());
audioService.playJarvisSpeech(audioData);

// Or with URL
audioService.playJarvisSpeech('https://example.com/jarvis-response.mp3');
```

### Manual Event Handling (Optional)
```typescript
audioService.onSpeechStart(() => {
  console.log('Jarvis started speaking');
});

audioService.onSpeechEnd(() => {
  console.log('Jarvis finished speaking');
});
```

## Visual Design

### Bar Colors (Gradient)
- **Start:** Blue (#3B82F6)
- **Middle:** Purple (#8B5CF6)
- **End:** Pink (#EC4899)

### Animation
- **Frame Rate:** 60 FPS (requestAnimationFrame)
- **Bar Count:** 40 bars
- **FFT Size:** 128 (frequency resolution)
- **Update Rate:** Real-time (~16ms)

## Technical Details

### Audio Analysis
- Uses Web Audio API `AnalyserNode`
- Frequency bin count: 64 (fftSize / 2)
- Data normalized to 0-1 range
- Mapped to 40 visual bars

### Performance
- Efficient canvas rendering
- Animation only when active
- Cleanup on unmount
- No memory leaks

## Integration Points

### Where to Call `playJarvisSpeech()`
1. **Text-to-Speech Response:**
   ```typescript
   // In conversation handler
   const response = await jarvisAPI.sendMessage(userMessage);
   if (response.audioData) {
     audioService.playJarvisSpeech(response.audioData);
   }
   ```

2. **Voice Command Response:**
   ```typescript
   // After processing voice input
   const audioResponse = await jarvisAPI.processVoiceCommand(transcript);
   audioService.playJarvisSpeech(audioResponse);
   ```

3. **Notification Speech:**
   ```typescript
   // For system notifications
   audioService.playJarvisSpeech('Hello, I am Jarvis');
   ```

## Next Steps

### Backend Integration Required
Update the backend to return audio data when Jarvis responds:

**Backend (Node.js):**
```typescript
// In src/agents/dialogue-agent.ts or tts service
app.post('/api/chat', async (req, res) => {
  const response = await generateResponse(req.body.message);
  const audioBuffer = await textToSpeech(response.text);
  
  res.json({
    text: response.text,
    audioData: audioBuffer.toString('base64'), // Send as base64
    timestamp: Date.now()
  });
});
```

**Frontend:**
```typescript
const response = await jarvisAPI.sendMessage(message);
if (response.audioData) {
  const audioBuffer = Buffer.from(response.audioData, 'base64');
  audioService.playJarvisSpeech(audioBuffer);
}
```

## Testing

### Manual Test
1. Start the desktop app
2. Send a message to Jarvis
3. Observe the visualizer bars animate when Jarvis responds
4. Bars should sync with the audio output
5. Smooth fade-out when speech ends

### Test Cases
- ✅ Bars animate during speech
- ✅ Bars stay idle when not speaking
- ✅ Smooth transitions between states
- ✅ No lag or stuttering
- ✅ Proper cleanup on unmount

## Troubleshooting

### Bars Not Animating
1. Check if audio is actually playing
2. Verify `playJarvisSpeech()` is being called
3. Check browser console for audio context errors
4. Ensure audio permissions are granted

### Performance Issues
1. Reduce FFT size (currently 128)
2. Decrease bar count (currently 40)
3. Lower animation frame rate
4. Optimize canvas rendering

## Files Modified
- ✅ `jarvis-desktop/src/renderer/services/audio-service.ts`
- ✅ `jarvis-desktop/src/renderer/hooks/useVoice.ts`

## Files Already Working
- ✅ `jarvis-desktop/src/renderer/components/voice/VoiceVisualizer.tsx`
- ✅ `jarvis-desktop/src/renderer/components/voice/VoiceWaveform.tsx`

---

**Status:** ✅ Ready to use
**Last Updated:** 2026-02-23
**Author:** GitHub Copilot
