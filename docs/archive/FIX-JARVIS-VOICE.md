# Test Jarvis Voice Audio

## Quick Audio Test

Open the desktop app and press `F12` (DevTools), then run:

```javascript
// Test 1: Check if speechSynthesis is available
console.log('Speech Synthesis Available:', window.speechSynthesis);

// Test 2: List all available voices
window.speechSynthesis.getVoices().forEach(voice => {
  console.log(`Voice: ${voice.name} (${voice.lang})`);
});

// Test 3: Test basic TTS
const utterance = new SpeechSynthesisUtterance('Hello, I am Jarvis');
utterance.onstart = () => console.log('✅ Speech started');
utterance.onend = () => console.log('✅ Speech ended');
utterance.onerror = (e) => console.error('❌ Speech error:', e);
window.speechSynthesis.speak(utterance);

// Test 4: Check audio service
import { audioService } from './services/audio-service';
console.log('Audio Service:', audioService);

// Test 5: Play test beep
audioService.playVoiceBeep();
```

## Check These:

### 1. Windows Sound Settings
```powershell
# Check if audio device is working
Get-WmiObject Win32_SoundDevice | Select-Object Name, Status
```

### 2. Check Volume
- System volume > 50%
- App volume not muted in Volume Mixer
- Browser audio not blocked

### 3. Custom Voice File Location
Where is your Jarvis voice file? Check:
- `jarvis-desktop/public/sounds/`
- `local-tts/outputs/`
- `assets/voice/`

### 4. TTS Engine Status
```powershell
# Check if local TTS is running
cd local-tts
python -m pip list | findstr TTS
```

## Common Issues:

### Issue 1: Browser TTS Muted
**Solution:**
1. Click speaker icon in browser
2. Unmute site
3. Reload app

### Issue 2: No Voices Loaded
**Solution:**
```javascript
// Force reload voices
window.speechSynthesis.cancel();
const voices = window.speechSynthesis.getVoices();
if (voices.length === 0) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    console.log('Voices loaded:', window.speechSynthesis.getVoices());
  });
}
```

### Issue 3: Audio File Not Found
**Solution:**
Check console for errors like:
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

### Issue 4: Audio Context Suspended
**Solution:**
```javascript
// Resume audio context
const audioContext = new AudioContext();
if (audioContext.state === 'suspended') {
  audioContext.resume();
}
```

## Custom Voice Integration

If you have a custom Jarvis voice file, add it to the audio service:

```typescript
// In audio-service.ts
playCustomJarvisVoice(text: string) {
  // If using pre-recorded audio
  const sound = new Howl({
    src: ['/sounds/jarvis-voice.mp3'], // Your custom voice file
    volume: 1.0,
    onplay: () => this.notifySpeechStart(),
    onend: () => this.notifySpeechEnd()
  });
  sound.play();
  
  // OR if using TTS API
  fetch('/api/tts/speak', {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(r => r.arrayBuffer())
  .then(audioData => {
    this.playJarvisSpeech(audioData);
  });
}
```

## Test Files Needed

**1. Create test audio file:**
`jarvis-desktop/public/sounds/jarvis-test.mp3`

**2. Test it:**
```javascript
const audio = new Audio('/sounds/jarvis-test.mp3');
audio.volume = 1.0;
audio.play()
  .then(() => console.log('✅ Audio playing'))
  .catch(e => console.error('❌ Audio failed:', e));
```

---

## Quick Checklist:

- [ ] System volume > 50%
- [ ] App not muted in Volume Mixer
- [ ] DevTools shows no audio errors
- [ ] Browser TTS test works
- [ ] Custom voice file exists
- [ ] Audio service initialized
- [ ] KITT scanner shows (even if silent)

---

**Tell me:**
1. Where is your custom Jarvis voice file?
2. What format is it? (mp3, wav, model?)
3. Any errors in DevTools console?
4. Does the TEST KITT button work?

I'll help you get the voice working! 🔊
