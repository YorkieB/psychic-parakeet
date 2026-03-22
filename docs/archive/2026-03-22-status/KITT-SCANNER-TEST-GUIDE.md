# KITT Scanner Quick Test Guide

## How to Test the Knight Rider Scanner

### Method 1: Send a Message (Automatic with Browser TTS)
1. Open the desktop app
2. Type a message to Jarvis (e.g., "Hello Jarvis")
3. Press Enter or click Send
4. **The KITT scanner will activate** when Jarvis responds
5. Browser text-to-speech will read the response
6. Scanner syncs with the speech

### Method 2: Voice Input
1. Click "Start Voice" button
2. Speak your message
3. The scanner activates while listening (red bars)
4. When Jarvis responds, scanner continues during speech

### Method 3: Test with Console
Open DevTools (F12) and run:

```javascript
// Import the audio service
const { audioService } = window;

// Trigger scanner for 3 seconds
audioService.notifySpeechStart();
setTimeout(() => audioService.notifySpeechEnd(), 3000);
```

### Method 4: Use Browser TTS Directly
```javascript
const utterance = new SpeechSynthesisUtterance('Turbo boost activated, Michael!');
utterance.onstart = () => window.audioService?.notifySpeechStart();
utterance.onend = () => window.audioService?.notifySpeechEnd();
speechSynthesis.speak(utterance);
```

## What You Should See

### Before Message:
```
████████████████████████  (dim red flatline)
Status: IDLE
```

### After Sending Message:
```
░░░░░███░░░░░░░░░░░░░░░  (scanner sweeping left)
Status: PLAY
Icon: Pulsing red with rings
```

Then:
```
░░░░░░░░░░███░░░░░░░░░░  (scanner sweeping right)
Status: PLAY
Bars: Varying height with voice
```

### Scanner Features Active:
- ✅ Red sweeping motion
- ✅ Trailing glow effect
- ✅ Bar height varies with audio
- ✅ Smooth left-right bounce
- ✅ Glow and shadow effects
- ✅ Reflection at bottom

## Troubleshooting

### Scanner Not Moving
**Solution:** The scanner activates when:
1. Browser TTS speaks (automatic with messages)
2. Audio file plays via `audioService.playJarvisSpeech()`
3. Manually triggered via `notifySpeechStart()`

Check DevTools console for:
```
audioService.notifySpeechStart called
```

### No Audio/No Scanner
**Problem:** Browser TTS might be disabled

**Solution:** 
1. Check browser settings for speech synthesis
2. Test: `speechSynthesis.speak(new SpeechSynthesisUtterance('test'))`
3. If no voices available, scanner won't trigger automatically

**Workaround:**
```javascript
// Add this to test the scanner without audio
import { audioService } from './services/audio-service';

// In conversation-store.ts, after adding assistant message:
audioService.notifySpeechStart();
setTimeout(() => {
  audioService.notifySpeechEnd();
}, 3000); // 3 seconds of scanner animation
```

### Scanner Stuck Active
**Problem:** Speech end event not firing

**Solution:**
```javascript
// Force stop
window.audioService.notifySpeechEnd();
```

## Quick Test Commands

### Test 1: Simple Message
Type: `"Hello"`
Expected: Scanner activates for ~2 seconds while TTS speaks "Hello"

### Test 2: Long Message
Type: `"Tell me about the Knight Rider TV show from the 1980s"`
Expected: Scanner activates for ~10 seconds during the response

### Test 3: KITT Quotes
Type: `"Say something like KITT from Knight Rider"`
Expected: Scanner with KITT-style response

## Debug Mode

Enable debug logging in console:

```javascript
// Add to conversation-store.ts sendMessage function
console.log('[KITT] Response received:', response);
console.log('[KITT] Audio data:', response?.audioData);
console.log('[KITT] Using browser TTS:', !response?.audioData && replyText);
console.log('[KITT] Scanner should activate now');
```

## Expected Behavior Flow

```
User sends message
  ↓
Backend responds with text
  ↓
Browser TTS starts speaking
  ↓
utterance.onstart → audioService.notifySpeechStart()
  ↓
Scanner activates (red sweep)
  ↓
Bars animate left-right with audio amplitude
  ↓
utterance.onend → audioService.notifySpeechEnd()
  ↓
Scanner fades out
  ↓
Back to idle state
```

## Integration Status

✅ **Working:**
- KITT scanner visual effect
- Audio service event system
- Browser TTS integration
- Conversation store updated
- Desktop app built

⚠️ **Needs Backend:**
- Custom audio data from backend
- Professional TTS voices
- Realtime audio analysis

🔄 **Current Fallback:**
- Browser TTS (works immediately)
- Manual audio amplitude simulation
- Text-based triggering

## Next Steps for Full Integration

### 1. Backend TTS Integration
Add to your dialogue agent or TTS service:

```typescript
// backend: src/agents/dialogue-agent.ts
import textToSpeech from '@google-cloud/text-to-speech';

app.post('/api/chat', async (req, res) => {
  const response = await generateResponse(req.body.message);
  
  // Generate audio
  const [audioResponse] = await client.synthesizeSpeech({
    input: { text: response.text },
    voice: { languageCode: 'en-US', name: 'en-US-Neural2-J' },
    audioConfig: { audioEncoding: 'MP3' },
  });
  
  res.json({
    text: response.text,
    audioData: audioResponse.audioContent.toString('base64'),
    timestamp: Date.now()
  });
});
```

### 2. Desktop App Will Auto-Use It
The conversation store already checks for `response?.audioData`:
```typescript
if (response?.audioData) {
  const audioBuffer = Buffer.from(response.audioData, 'base64');
  audioService.playJarvisSpeech(audioBuffer);
}
```

### 3. Real-Time Audio Analysis
For better scanner sync, backend can send:
```json
{
  "text": "response text",
  "audioData": "base64...",
  "amplitudeData": [0.1, 0.5, 0.8, 0.6, ...],
  "duration": 3500
}
```

## Test Right Now!

1. **Open Desktop App**
2. **Send any message**
3. **Watch the scanner activate** when Jarvis responds
4. Scanner will sweep back and forth for the duration of the TTS speech

The KITT effect is live! 🚗💨

---

**Status:** ✅ Scanner Active with Browser TTS
**Next:** Add backend TTS for professional voices
**KITT:** Ready for duty, Michael!
