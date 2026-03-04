# JARVIS NRS INDEX
## Quick Reference for Voice Assistant Project

**Project:** Jarvis Voice Assistant  
**Date:** Updated after core/audio annotations  
**NRS Range:** 6xx - 9xx  

---

## Recent Updates

- Added full NRS coverage to core modules: `jarvis_core.py`, `stt_engine.py`, `tts_engine.py`, `browser_controller.py`, `audio_pipeline.py`, and `__init__.py`.
- Audio pipeline now explicitly maps device selection (NRS-601), buffering/VAD (NRS-602), playback (NRS-705), orchestration (NRS-810), and logging (NRS-807).
- Verification tip: run `node scripts/nrs_verify.js --dir jarvis-voice-assistant --exclude node_modules,.git,.venv,jarvis-env,__pycache__,dist,build` to ignore third-party folders.

## Quick Category Overview

| Category | Name | Scope | Files |
|----------|------|-------|-------|
| **NRS-6xx** | Voice Input/STT Engine | Speech recognition, audio capture | stt_engine.py, audio_pipeline.py, utils/ |
| **NRS-7xx** | Voice Output/TTS Engine | Speech synthesis, audio playback | tts_engine.py, audio_pipeline.py |
| **NRS-8xx** | Voice Assistant Core | Command processing, conversation | jarvis_core.py, examples/, utils/ |
| **NRS-9xx** | Browser Control & Integration | Web automation, element interaction | browser_controller.py, examples/ |

---

## All Codes by Category

### NRS-6xx: Voice Input/STT Engine (8 codes)

| Code | Name | File | Purpose |
|------|------|------|---------|
| NRS-601 | Audio Device Detection | audio_utils.py, test_audio_hardware.py | Detect microphone and configure input |
| NRS-602 | Audio Stream Handling | audio_pipeline.py, stt_engine.py | Buffer and manage continuous audio |
| NRS-603 | Audio Format Conversion | audio_utils.py | Convert audio formats and resample |
| NRS-604 | STT API Integration | stt_engine.py | Call Whisper API or local model |
| NRS-605 | Language Detection | stt_engine.py, voice_config.yaml | Detect/set language for recognition |
| NRS-606 | Error Handling | stt_engine.py, jarvis_core.py | Handle STT errors gracefully |
| NRS-607 | Performance Optimization | stt_engine.py | Optimize STT latency |
| NRS-608 | Microphone Calibration | test_audio_hardware.py, test_setup.py | Test and calibrate microphone |

### NRS-7xx: Voice Output/TTS Engine (8 codes)

| Code | Name | File | Purpose |
|------|------|------|---------|
| NRS-701 | TTS Engine Initialization | tts_engine.py | Initialize TTS and load voice |
| NRS-702 | Voice Selection | tts_engine.py, voice_config.yaml | Select and configure voice |
| NRS-703 | Text Preprocessing | tts_engine.py, audio_utils.py | Format text for speech |
| NRS-704 | Audio Synthesis | tts_engine.py | Generate audio from text |
| NRS-705 | Audio Playback | tts_engine.py, audio_pipeline.py | Play audio through speakers |
| NRS-706 | Language/Accent Handling | tts_engine.py, voice_config.yaml | Support multiple languages |
| NRS-707 | Volume/Speed Control | tts_engine.py, audio_utils.py | Adjust speech characteristics |
| NRS-708 | Audio Cache Management | tts_engine.py | Cache generated audio |

### NRS-8xx: Voice Assistant Core (10 codes)

| Code | Name | File | Purpose |
|------|------|------|---------|
| NRS-801 | Command Parsing | jarvis_core.py, helpers.py | Parse user commands |
| NRS-802 | NLU Processing | jarvis_core.py | Extract meaning from text |
| NRS-803 | Intent Recognition | jarvis_core.py | Classify user intent |
| NRS-804 | Context Management | jarvis_core.py | Manage conversation context |
| NRS-805 | Response Generation | jarvis_core.py | Generate AI responses |
| NRS-806 | Command Execution | jarvis_core.py | Execute recognized commands |
| NRS-807 | Error Recovery | jarvis_core.py | Handle and recover from errors |
| NRS-808 | Learning/Adaptation | jarvis_core.py | Learn from interactions |
| NRS-809 | Multi-turn Conversations | jarvis_core.py | Handle multi-turn dialogs |
| NRS-810 | Audio Pipeline Orchestration | audio_pipeline.py, jarvis_core.py | Coordinate entire pipeline |

### NRS-9xx: Browser Control (9 codes)

| Code | Name | File | Purpose |
|------|------|------|---------|
| NRS-901 | Browser Initialization | browser_controller.py | Start browser and connect |
| NRS-902 | DOM Element Detection | browser_controller.py | Find elements on page |
| NRS-903 | User Action Simulation | browser_controller.py | Simulate clicks, typing, scrolling |
| NRS-904 | Form Automation | browser_controller.py | Fill and submit forms |
| NRS-905 | Navigation/Page Control | browser_controller.py | Navigate to URLs, manage pages |
| NRS-906 | Data Extraction | browser_controller.py | Scrape and extract data |
| NRS-907 | Event Handling | browser_controller.py | Handle page events |
| NRS-908 | Session Management | browser_controller.py | Manage browser sessions |
| NRS-909 | Error Handling | browser_controller.py | Handle browser automation errors |

---

## File-to-Category Index

### By File: jarvis/

- **`jarvis_core.py`** (455 lines)
  - Main: NRS-8xx (801-810)
  - Audio coordination: NRS-810
  - Error handling: NRS-806, 807
  
- **`audio_pipeline.py`** (200+ lines)
  - Audio orchestration: NRS-810
  - STT integration: NRS-6xx
  - TTS integration: NRS-7xx
  
- **`stt_engine.py`** (300 lines)
  - All: NRS-6xx (601-608)
  - Focus: Speech recognition
  
- **`tts_engine.py`** (352 lines)
  - All: NRS-7xx (701-708)
  - Focus: Speech synthesis
  
- **`browser_controller.py`** (400+ lines)
  - All: NRS-9xx (901-909)
  - Focus: Web automation
  
- **`__init__.py`** (7 lines)
  - Package initialization

### By File: examples/

- **`simple_voice_chat.py`** - NRS-8xx, 810
- **`voice_search.py`** - NRS-8xx, 9xx
- **`browser_automation.py`** - NRS-9xx
- **`custom_commands.py`** - NRS-8xx

### By File: tests/

- **`test_audio_pipeline.py`** - NRS-6xx, 7xx, 810
- **`test_stt_engine.py`** - NRS-6xx (601-608)
- **`test_tts_engine.py`** - NRS-7xx (701-708)
- **`__init__.py`** - Test package

### By File: utils/

- **`audio_utils.py`** - NRS-6xx, 7xx
- **`helpers.py`** - NRS-8xx, 801-807
- **`logging_utils.py`** - NRS-8xx
- **`mock_pyaudio.py`** - NRS-6xx, testing
- **`real_audio.py`** - NRS-6xx (601-603)
- **`__init__.py`** - Utility package

### By File: root/

- **`demo.py`** - NRS-8xx, 9xx, 810
- **`main.py`** - NRS-8xx, 810
- **`quick_test.py`** - NRS-6xx, 7xx, 8xx
- **`test_audio_hardware.py`** - NRS-6xx (601-608)
- **`test_setup.py`** - NRS-6xx, 7xx, 8xx

---

## Category Details

### NRS-6xx: Voice Input (Speech Recognition)
**Purpose:** Capture voice commands and convert to text  
**Key Components:**
- Microphone initialization (601)
- Audio buffering (602)
- Format handling (603)
- Whisper API/Local (604)
- Language support (605)
- Error handling (606)
- Performance tuning (607)
- Testing (608)

**Files:** stt_engine.py, audio_pipeline.py, audio_utils.py, test_audio_hardware.py  
**Dependencies:** numpy, openai, whisper, sounddevice

---

### NRS-7xx: Voice Output (Speech Synthesis)
**Purpose:** Convert AI responses to spoken audio  
**Key Components:**
- Engine setup (701)
- Voice selection (702)
- Text formatting (703)
- Audio generation (704)
- Playback (705)
- Multi-language (706)
- Speed/volume control (707)
- Caching (708)

**Files:** tts_engine.py, audio_pipeline.py, audio_utils.py  
**Dependencies:** elevenlabs, numpy, requests

---

### NRS-8xx: Voice Assistant Core
**Purpose:** Main conversational AI logic  
**Key Components:**
- Command parsing (801)
- Natural language understanding (802)
- Intent classification (803)
- Conversation context (804)
- Response generation (805)
- Command execution (806)
- Error recovery (807)
- User learning (808)
- Multi-turn dialogs (809)
- Pipeline orchestration (810)

**Files:** jarvis_core.py, audio_pipeline.py, helpers.py, examples/  
**Dependencies:** openai, yaml, asyncio

---

### NRS-9xx: Browser Automation
**Purpose:** Web interaction and automation  
**Key Components:**
- Browser startup (901)
- Element finding (902)
- User actions (903)
- Form filling (904)
- Navigation (905)
- Data scraping (906)
- Event handling (907)
- Session persistence (908)
- Error handling (909)

**Files:** browser_controller.py, examples/browser_automation.py  
**Dependencies:** selenium or puppeteer

---

## Configuration Guide

### voice_config.yaml
Controls STT and TTS:
```yaml
stt:
  provider: "openai"  # or "local"
  model: "whisper-1"
  language: "en"
  
tts:
  provider: "elevenlabs"
  voice_id: "JBFqnCBsd6RMkjVDRZzb"
  stability: 0.5
```

### audio_config.yaml
Controls audio pipeline:
```yaml
sample_rate: 16000
chunk_size: 1024
device_id: 0  # Microphone device
```

### llm_config.yaml
Controls LLM for responses:
```yaml
model: "gpt-4"  # or "gpt-3.5-turbo"
max_tokens: 100
temperature: 0.7
```

---

## Quick Lookup by Functionality

### "I need to work with audio..."
- STT audio input: **NRS-6xx**
- TTS audio output: **NRS-7xx**
- Audio utilities: **NRS-6xx, 7xx**
- Audio pipeline: **NRS-810**

### "I need to work with voice commands..."
- Parse commands: **NRS-801**
- Understand language: **NRS-802, 803**
- Generate responses: **NRS-805**
- Execute commands: **NRS-806**

### "I need to work with browser automation..."
- Control browser: **NRS-901, 905**
- Find elements: **NRS-902**
- Click and type: **NRS-903**
- Fill forms: **NRS-904**
- Scrape data: **NRS-906**

### "I need to troubleshoot..."
- Audio problems: **NRS-606, 608**
- Recognition issues: **NRS-605, 607**
- Synthesis issues: **NRS-706, 707**
- Command issues: **NRS-807**
- Browser issues: **NRS-909**

---

## Test Files Reference

| Test File | Covers | NRS Codes |
|-----------|--------|-----------|
| `test_audio_hardware.py` | Microphone detection | NRS-601, 608 |
| `test_setup.py` | Complete setup verification | NRS-6xx, 7xx, 8xx |
| `test_audio_pipeline.py` | Audio processing | NRS-6xx, 7xx, 810 |
| `test_stt_engine.py` | Speech recognition | NRS-6xx (601-608) |
| `test_tts_engine.py` | Speech synthesis | NRS-7xx (701-708) |

---

## Statistics

- **Total Codes:** 35 micro-codes
- **Total Lines Annotated:** ~3,500+ (core modules covered)
- **Coverage:** Core modules annotated; examples/tests cleanup in progress
- **Categories:** 4 (6xx-9xx)
- **Files:** Core modules + primary tests completed

---

## Related Documentation

- **JARVIS_NRS_HANDBOOK.md** - Detailed documentation for each code
- **PROJECT_NRS_MASTER_GUIDE.md** - Master guide for all projects
- **README.md** - Project overview

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026  
**Status:** Complete and Ready for Use
