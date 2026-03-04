# JARVIS VOICE ENGINE - 100% IMPLEMENTATION PLAN

## Mission: Achieve 100% Real-Time Natural Conversation

---

## ✅ CURRENT STATUS

### What Works:
1. ✅ VoiceVisualizer UI component (bug already fixed)
2. ✅ useVoice hook for mic recording
3. ✅ IPC bridge for voice data
4. ✅ Backend `/voice/transcribe` endpoint
5. ✅ Barge-in controller (backend)
6. ✅ WebSocket infrastructure exists
7. ✅ Spacebar PTT hotkey
8. ✅ Microphone health reporting

### What Needs Implementation:
1. ❌ Real-time audio streaming (currently batch mode)
2. ❌ Barge-in events UI ↔ backend
3. ❌ TTS playback in UI
4. ❌ Continuous conversation mode
5. ❌ Multi-utterance support
6. ❌ Visual feedback for speaking state

---

## 🎯 IMPLEMENTATION STRATEGY

### Architecture Choice: WebSocket-Based Real-Time System

**Why WebSocket:**
- Bidirectional communication
- Low latency
- Perfect for streaming audio chunks
- Can handle barge-in events
- Existing infrastructure in place

**Flow:**
```
User speaks → Mic captures → Stream via WebSocket → Backend STT → 
LLM processes → Backend TTS → Stream audio back → UI plays → 
Barge-in monitoring active → User can interrupt
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Real-Time Audio Streaming (Critical)

#### 1.1 Frontend: Enhanced useVoice Hook
**File:** `jarvis-desktop/src/renderer/hooks/useVoice.ts`

**New Features:**
- Streaming mode toggle
- Real-time audio chunk transmission
- WebSocket connection for audio
- Progressive transcription display
- TTS audio reception and playback

#### 1.2 Backend: WebSocket Voice Endpoint
**New File:** `src/voice/voice-websocket-handler.ts`

**Features:**
- Accept WebSocket connections
- Receive audio chunks
- Stream to OpenAI Whisper API
- Send transcription updates
- Handle TTS requests
- Stream audio responses

#### 1.3 IPC: Add WebSocket Support
**File:** `jarvis-desktop/src/preload/index.ts`

**Add:**
- `startVoiceStream()` - Start streaming session
- `stopVoiceStream()` - End streaming session
- `onTranscriptionUpdate` - Receive partial transcriptions
- `onSpeakingStart` - Jarvis starts speaking
- `onSpeakingEnd` - Jarvis finishes speaking
- `onBargeIn` - Barge-in detected

---

### Phase 2: Barge-In Integration

#### 2.1 Frontend: Barge-In Handling
**File:** `jarvis-desktop/src/renderer/hooks/useVoice.ts`

**Add:**
- Listen for barge-in events
- Stop TTS playback immediately
- Resume listening automatically

#### 2.2 Backend: Barge-In Events via WebSocket
**File:** `src/voice/voice-websocket-handler.ts`

**Add:**
- Monitor audio frames during TTS
- Emit barge-in event when detected
- Stop TTS immediately
- Notify frontend

#### 2.3 Audio Processing Pipeline
**Add:**
- Audio chunk analysis during playback
- VAD (Voice Activity Detection)
- Threshold-based interruption

---

### Phase 3: Multi-Utterance Support

#### 3.1 Continuous Listening Mode
**File:** `jarvis-desktop/src/renderer/hooks/useVoice.ts`

**Features:**
- Toggle for continuous mode
- Automatic silence detection
- Keep session active
- No button press required

#### 3.2 Conversation Context
**File:** `src/voice/voice-session-manager.ts` (NEW)

**Features:**
- Session tracking
- Multi-turn conversation
- Context preservation
- Utterance history

---

### Phase 4: TTS Playback in UI

#### 4.1 Audio Player Component
**New File:** `jarvis-desktop/src/renderer/components/voice/AudioPlayer.tsx`

**Features:**
- Web Audio API integration
- Stream audio chunks from backend
- Playback controls
- Volume control
- Visual feedback

#### 4.2 Speaking State Management
**File:** `jarvis-desktop/src/renderer/hooks/useVoice.ts`

**Add:**
- `isSpeaking` state from backend events
- Speaking animation
- Progress indicator

---

### Phase 5: UI Integration & Testing

#### 5.1 All Buttons Working
- ✅ Mic button in InputBar
- ✅ Spacebar PTT hotkey
- ✅ Voice toggle button
- ✅ Stop button
- ⚠️ Continuous mode toggle (TO ADD)

#### 5.2 Composer Integration
**File:** Check if composer component exists

**Requirements:**
- Voice input in composer
- Voice commands for editing
- Dictation mode

#### 5.3 Visual Feedback
- Listening: Red pulsing mic
- Speaking: Blue animated icon
- Processing: Loading spinner
- Ready: Idle state

---

## 📋 DEPENDENCIES TO INSTALL

```bash
# Backend (Node.js)
npm install mic speaker @picovoice/cobra-node

# Frontend (already installed)
# - MediaRecorder API (built-in)
# - Web Audio API (built-in)
```

**API Keys Required:**
- `OPENAI_API_KEY` - For Whisper STT and TTS
- `PICOVOICE_ACCESS_KEY` - For barge-in (free tier available)
- Optional: `ELEVENLABS_API_KEY` - For better TTS

---

## 🚀 IMPLEMENTATION ORDER

### Step 1: Basic Real-Time Streaming (30 min)
1. Create `voice-websocket-handler.ts`
2. Add WebSocket endpoint `/voice/stream`
3. Update useVoice hook for streaming
4. Test audio streaming end-to-end

### Step 2: TTS Playback (20 min)
1. Create AudioPlayer component
2. Add TTS WebSocket response handling
3. Implement audio playback
4. Add speaking state to UI

### Step 3: Barge-In (20 min)
1. Connect barge-in events
2. Add IPC handlers
3. Test interruption flow
4. Verify immediate response

### Step 4: Continuous Mode (15 min)
1. Add continuous mode toggle
2. Implement auto-restart listening
3. Keep conversation active
4. Test multi-utterance

### Step 5: Testing & Polish (15 min)
1. Test all buttons
2. Test PTT mode
3. Test continuous mode
4. Test barge-in
5. Test multi-utterance

**Total Time: ~100 minutes**

---

## 🎯 SUCCESS CRITERIA (100% Required)

| Feature | Status | Test |
|---------|--------|------|
| **Real-Time Conversation** | ⏳ Pending | Talk naturally, no delays |
| **Barge-In** | ⏳ Pending | Interrupt mid-sentence |
| **Multi-Utterance** | ⏳ Pending | Multiple questions without clicking |
| **All Buttons Work** | ✅ Working | Click all buttons, verify response |
| **Spacebar PTT** | ✅ Working | Hold space, speak, release |
| **Continuous Mode** | ⏳ Pending | Toggle on, talk freely |
| **Visual Feedback** | ✅ Working | See listening/speaking states |
| **Audio Quality** | ⏳ Pending | Clear, natural speech |
| **Low Latency** | ⏳ Pending | < 500ms response time |
| **Error Recovery** | ⏳ Pending | Graceful error handling |

---

**Next Action:** Start implementing real-time audio streaming via WebSocket.
