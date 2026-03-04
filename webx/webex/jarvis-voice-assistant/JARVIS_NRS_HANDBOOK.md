# JARVIS NRS HANDBOOK
## Numeric Reference System for Voice Assistant (NRS-6xx to NRS-9xx)

**Project:** Jarvis Voice Assistant  
**Category Range:** NRS-6xx to NRS-9xx  
**Total Codes:** 40 micro-codes across 4 categories  
**Files Covered:** 17 Python files  
**Last Updated:** January 23, 2026

---

## Table of Contents
1. [NRS-6xx: Voice Input/STT Engine](#nrs-6xx)
2. [NRS-7xx: Voice Output/TTS Engine](#nrs-7xx)
3. [NRS-8xx: Voice Assistant Core](#nrs-8xx)
4. [NRS-9xx: Browser Control & Integration](#nrs-9xx)

---

## NRS-6xx: Voice Input/STT Engine (Speech-to-Text)

Speech recognition and audio input processing for voice commands.

### NRS-601: Audio Device Detection and Initialization

**CODE:** NRS-601  
**NAME:** Audio Device Detection and Initialization  
**PURPOSE:** Detect available audio input devices, configure microphone, set sample rates, and initialize audio hardware for capturing voice input.

**KNOWN ISSUES:**
- Different OS (Windows, macOS, Linux) have different audio APIs
- Some USB microphones not detected automatically
- Sample rate mismatches between device and software
- Audio driver conflicts with other applications

**TROUBLESHOOTING:**
- Run test_audio_hardware.py to list available devices
- Check device ID from audio configuration
- Ensure audio drivers are updated
- Close other audio applications
- Try different sample rates (16000, 44100 Hz)

**EXAMPLES/NOTES:**
- Used in: `STTEngine.__init__()`, `AudioPipeline.__init__()`
- Related: NRS-602, NRS-603, NRS-607
- Tests: `test_audio_hardware.py`, `test_setup.py`

---

### NRS-602: Audio Stream Handling and Buffering

**CODE:** NRS-602  
**NAME:** Audio Stream Handling and Buffering  
**PURPOSE:** Manage continuous audio stream from microphone, buffer audio data, handle stream callbacks, and prevent buffer overflow or underflow.

**KNOWN ISSUES:**
- Buffer timing issues with network latency
- Audio chunks arriving out of order
- Buffer size too small causes stuttering, too large causes lag
- Race conditions in multi-threaded audio capture

**TROUBLESHOOTING:**
- Adjust buffer size in audio_config.yaml
- Monitor buffer levels in logging output
- Use profiling to identify bottlenecks
- Ensure sufficient system memory
- Check CPU usage during audio capture

**EXAMPLES/NOTES:**
- Used in: `AudioPipeline.capture_audio()`, `StreamingSTT.process_stream()`
- Related: NRS-603, NRS-608
- Buffer sizes: 1024-4096 samples typical

---

### NRS-603: Audio Format Conversion and Processing

**CODE:** NRS-603  
**NAME:** Audio Format Conversion and Processing  
**PURPOSE:** Convert audio between formats (WAV, MP3), resample audio to correct sample rate, normalize audio levels, and apply audio preprocessing filters.

**KNOWN ISSUES:**
- Quality loss during format conversion
- Resampling algorithm affects accuracy
- Noise in audio levels after normalization
- Incompatible audio formats from different devices

**TROUBLESHOOTING:**
- Use high-quality resampling algorithms
- Test audio preprocessing with test samples
- Verify output format matches STT requirements
- Monitor audio levels and adjust normalization
- Document format requirements for each component

**EXAMPLES/NOTES:**
- Used in: `audio_utils.py` functions, `AudioPipeline.process_audio()`
- Related: NRS-601, NRS-602, NRS-606
- Formats supported: WAV (primary), MP3 (secondary), PCM

---

### NRS-604: Speech-to-Text API Integration

**CODE:** NRS-604  
**NAME:** Speech-to-Text API Integration  
**PURPOSE:** Send audio to speech-to-text service (OpenAI Whisper API or local model), handle API responses, and extract transcribed text.

**KNOWN ISSUES:**
- API rate limits and throttling
- Network latency affecting response time
- API service outages or unavailability
- Cost implications of API calls
- API authentication failures

**TROUBLESHOOTING:**
- Check API key configuration in .env file
- Monitor API rate limit headers
- Implement retry logic with exponential backoff
- Have fallback to local model if API fails
- Log all API errors for debugging

**EXAMPLES/NOTES:**
- Providers: OpenAI Whisper API (cloud), Local Whisper model
- Used in: `STTEngine.transcribe_audio()`, `StreamingSTT.process_audio()`
- Configuration: `configs/voice_config.yaml` [stt section]
- Related: NRS-601, NRS-605, NRS-606

---

### NRS-605: Language Detection and Configuration

**CODE:** NRS-605  
**NAME:** Language Detection and Configuration  
**PURPOSE:** Detect spoken language automatically or use configured language, set language-specific parameters, and support multi-language input.

**KNOWN ISSUES:**
- Automatic language detection not always accurate
- Accent and dialect variations
- Mixed language speech
- Language switching not handled well

**TROUBLESHOOTING:**
- Manually specify language in configuration
- Provide language hints to API
- Test with native speakers
- Use language-specific acoustic models
- Add punctuation hints for better parsing

**EXAMPLES/NOTES:**
- Supported languages: English (default), Spanish, French, etc.
- Used in: `STTEngine._load_config()`, `STTConfig` class
- Configuration file: `configs/voice_config.yaml`
- Related: NRS-604, NRS-608

---

### NRS-606: Error Handling for Audio Issues

**CODE:** NRS-606  
**NAME:** Error Handling for Audio Issues  
**PURPOSE:** Catch and handle audio-related errors, provide recovery mechanisms, log errors for debugging, and notify user of failures.

**KNOWN ISSUES:**
- Microphone unplugged during recording
- Audio device becomes unavailable
- Permission denied for microphone access
- Audio format unsupported
- Hardware failure

**TROUBLESHOOTING:**
- Check permissions: Settings → Privacy → Microphone
- Restart audio services
- Test with different microphone
- Check system audio logs
- Verify audio device not used by another app

**EXAMPLES/NOTES:**
- Error types: DeviceError, PermissionError, FormatError, TimeoutError
- Used in: `STTEngine._load_local_model()`, `AudioPipeline.capture_audio()`
- Related: NRS-601, NRS-602, NRS-603
- Recovery: Retry, fallback to alternative, graceful shutdown

---

### NRS-607: Performance Optimization for STT

**CODE:** NRS-607  
**NAME:** Performance Optimization for STT  
**PURPOSE:** Optimize speech recognition latency, reduce processing time, cache models, and balance accuracy vs. speed.

**KNOWN ISSUES:**
- Large model files slow to load
- Processing time too high for real-time needs
- Memory usage excessive with large models
- Trade-off between accuracy and speed

**TROUBLESHOOTING:**
- Use smaller model (base vs. small vs. medium)
- Cache models in memory to avoid reloading
- Use streaming transcription for real-time
- Profile code to find bottlenecks
- Consider GPU acceleration if available

**EXAMPLES/NOTES:**
- Model sizes: tiny (39M), base (140M), small (244M)
- Used in: `STTEngine._load_local_model()`, `StreamingSTT` class
- Streaming mode faster than batch mode
- Related: NRS-604, NRS-605

---

### NRS-608: Microphone Calibration and Testing

**CODE:** NRS-608  
**NAME:** Microphone Calibration and Testing  
**PURPOSE:** Test microphone functionality, calibrate audio levels, detect noise floor, and verify audio quality before running main application.

**KNOWN ISSUES:**
- Calibration values vary over time
- Background noise level changes
- Different microphones have different sensitivity
- Calibration not persisted across sessions

**TROUBLESHOOTING:**
- Run calibration in quiet environment
- Re-calibrate if moving to different location
- Test with sample audio files
- Verify microphone working in OS settings
- Check audio device properties

**EXAMPLES/NOTES:**
- Calibration script: `test_audio_hardware.py`
- Testing script: `test_setup.py`
- Related: NRS-601, NRS-602, NRS-606
- Stores baseline noise level for comparison

---

## NRS-7xx: Voice Output/TTS Engine (Text-to-Speech)

Speech synthesis and audio output generation.

### NRS-701: TTS Engine Initialization

**CODE:** NRS-701  
**NAME:** TTS Engine Initialization  
**PURPOSE:** Initialize text-to-speech engine, load voice models, authenticate with API, and prepare for audio generation.

**KNOWN ISSUES:**
- API key not valid or missing
- Voice models not downloaded
- Network issues preventing initialization
- Insufficient permissions for API

**TROUBLESHOOTING:**
- Verify API key in .env file
- Check API subscription and quota
- Test API key with curl command
- Ensure internet connection
- Check firewall rules

**EXAMPLES/NOTES:**
- Used in: `TTSEngine.__init__()`, `StreamingTTS.__init__()`
- Configuration: `configs/voice_config.yaml` [tts section]
- Providers: ElevenLabs (primary), Google Cloud TTS (alternative)
- Related: NRS-702, NRS-706

---

### NRS-702: Voice Selection and Configuration

**CODE:** NRS-702  
**NAME:** Voice Selection and Configuration  
**PURPOSE:** Select from available voices, configure voice parameters (stability, similarity_boost), and customize voice characteristics.

**KNOWN ISSUES:**
- Limited voice options available
- Voice quality varies between providers
- Voice cloning not always accurate
- Voice switching causes audio interruption

**TROUBLESHOOTING:**
- List available voices from provider API
- Test different voice IDs for quality
- Adjust stability and similarity settings
- Use consistent voice for conversation
- Check voice compatibility with language

**EXAMPLES/NOTES:**
- Default voice: Jarvis (JBFqnCBsd6RMkjVDRZzb)
- Voice settings: stability (0.0-1.0), similarity_boost (0.0-1.0)
- Used in: `TTSEngine.__init__()`, `TTSConfig` class
- Configuration file: `configs/voice_config.yaml`
- Related: NRS-701, NRS-703, NRS-708

---

### NRS-703: Text Preprocessing and Formatting

**CODE:** NRS-703  
**NAME:** Text Preprocessing and Formatting  
**PURPOSE:** Prepare text for speech synthesis, expand abbreviations, add punctuation, convert numbers to words, and format special characters.

**KNOWN ISSUES:**
- Abbreviations not recognized (Dr., Mr., etc.)
- Numbers pronounced incorrectly (2021 as "twenty-twenty-one")
- Symbols not handled (%, $, @)
- SSML markup complexity
- Unicode characters

**TROUBLESHOOTING:**
- Define abbreviation dictionary
- Use SSML markup for pronunciation hints
- Test text processing with various inputs
- Handle edge cases (URLs, emails, etc.)
- Log preprocessing results

**EXAMPLES/NOTES:**
- Conversions: "Dr." → "Doctor", "2021" → "two thousand twenty-one"
- SSML support available for fine control
- Used in: `TTSEngine.generate_speech()`, text utilities
- Related: NRS-704, NRS-705

---

### NRS-704: Audio Synthesis and Generation

**CODE:** NRS-704  
**NAME:** Audio Synthesis and Generation  
**PURPOSE:** Call TTS API or local engine to synthesize speech, generate audio waveform, and return audio data.

**KNOWN ISSUES:**
- API rate limits exceeded
- Long text takes too long to synthesize
- Audio quality varies
- API timeout issues
- Service unavailable

**TROUBLESHOOTING:**
- Implement request queuing
- Split long text into chunks
- Handle API errors gracefully
- Implement retry logic
- Monitor service status

**EXAMPLES/NOTES:**
- Used in: `TTSEngine.generate_speech()`, `StreamingTTS.stream_speech()`
- Returns audio bytes in WAV format
- Related: NRS-701, NRS-703, NRS-705
- Typical latency: 0.5-2 seconds per sentence

---

### NRS-705: Audio Playback and Streaming

**CODE:** NRS-705  
**NAME:** Audio Playback and Streaming  
**PURPOSE:** Play generated audio through speakers, stream audio while it's being generated, handle audio output device selection.

**KNOWN ISSUES:**
- Speaker device not detected
- Audio playback lag
- Stream buffer underflow
- Audio device conflict
- Volume control issues

**TROUBLESHOOTING:**
- Select output device from available list
- Adjust buffer size for streaming
- Test with different audio devices
- Check system volume settings
- Verify audio output device permissions

**EXAMPLES/NOTES:**
- Used in: `TTSEngine.play_audio()`, playback utilities
- Streaming: Audio plays as it's generated (lower latency)
- Batch: All audio generated before playback (simpler)
- Related: NRS-704, NRS-708

---

### NRS-706: Language and Accent Handling

**CODE:** NRS-706  
**NAME:** Language and Accent Handling  
**PURPOSE:** Support multiple languages, apply accent settings, handle language-specific phonetics, and localize speech output.

**KNOWN ISSUES:**
- Accents not always available
- Language switching requires re-initialization
- Phonetic differences between languages
- Prosody not language-aware

**TROUBLESHOOTING:**
- Check available languages from provider
- Test with native speakers
- Use language-specific voice IDs
- Add phonetic hints for special words
- Document language support

**EXAMPLES/NOTES:**
- Supported languages: English, Spanish, French, German, etc.
- Used in: `TTSConfig` class, `TTSEngine` initialization
- Related: NRS-702, NRS-703, NRS-708
- Configuration: `configs/voice_config.yaml`

---

### NRS-707: Volume and Speed Control

**CODE:** NRS-707  
**NAME:** Volume and Speed Control  
**PURPOSE:** Adjust audio volume and speech rate, normalize audio levels, and provide user control over speech characteristics.

**KNOWN ISSUES:**
- Volume changes cause distortion
- Speech rate too fast becomes unintelligible
- Volume inconsistent between different sentences
- Speed affects pronunciation

**TROUBLESHOOTING:**
- Adjust volume gradually
- Test speech rates: 0.8x to 1.2x normal
- Normalize audio after processing
- Monitor for clipping at high volume
- Store user preferences

**EXAMPLES/NOTES:**
- Speed control: 0.5x to 2.0x typical range
- Volume range: 0.0 to 1.0 (0 to 100%)
- Used in: Audio playback functions, `StreamingTTS`
- Related: NRS-704, NRS-705

---

### NRS-708: Audio Cache Management

**CODE:** NRS-708  
**NAME:** Audio Cache Management  
**PURPOSE:** Cache generated audio to avoid regenerating same text, manage cache storage, and implement cache invalidation strategy.

**KNOWN ISSUES:**
- Cache storage grows too large
- Stale cache not invalidated
- Cache key collisions
- Memory usage for large caches
- Synchronization issues in multi-process scenarios

**TROUBLESHOOTING:**
- Implement cache size limit
- Use LRU eviction policy
- Clear cache periodically
- Hash text content for cache key
- Monitor cache hit rate

**EXAMPLES/NOTES:**
- Cache location: `data/audio_cache/`
- Used in: `TTSEngine.generate_speech()`, caching utilities
- Cache key: Hash of (text, voice_id, settings)
- Related: NRS-704, NRS-705

---

## NRS-8xx: Voice Assistant Core (Jarvis Logic)

Main conversational AI engine and command processing.

### NRS-801: Command Parsing and Interpretation

**CODE:** NRS-801  
**NAME:** Command Parsing and Interpretation  
**PURPOSE:** Parse user input text, extract commands, identify action intent, and prepare command for execution.

**KNOWN ISSUES:**
- Ambiguous commands
- Typos in transcription
- Complex multi-step commands
- Context-dependent interpretation
- Homonyms and words with multiple meanings

**TROUBLESHOOTING:**
- Implement fuzzy matching for typos
- Define clear command syntax
- Request clarification for ambiguous input
- Use conversation history for context
- Test with various phrasings

**EXAMPLES/NOTES:**
- Command types: browser control, search, task automation, information query
- Used in: `JarvisCore.process_command()`, command parsing utilities
- Related: NRS-802, NRS-803, NRS-806

---

### NRS-802: NLU (Natural Language Understanding)

**CODE:** NRS-802  
**NAME:** NLU (Natural Language Understanding)  
**PURPOSE:** Apply NLP techniques to extract meaning, identify entities, extract slots, and classify user intent from natural language text.

**KNOWN ISSUES:**
- Context understanding limited
- Named entity recognition errors
- Slot extraction misses edge cases
- Intent classification ambiguity
- Domain-specific terminology

**TROUBLESHOOTING:**
- Use pre-trained NLP models (spaCy, BERT)
- Build domain-specific training data
- Test with edge cases
- Document intent definitions
- Implement fallback to clarification

**EXAMPLES/NOTES:**
- Libraries: spaCy for NER, transformers for intent
- Used in: `ConversationManager`, NLU processing
- Related: NRS-801, NRS-803, NRS-804

---

### NRS-803: Intent Recognition

**CODE:** NRS-803  
**NAME:** Intent Recognition  
**PURPOSE:** Recognize user intent (navigate, search, control browser, get information), classify intent type, and route to appropriate handler.

**KNOWN ISSUES:**
- Similar intents confused
- Intent not in training data
- Confidence threshold issues
- Multi-intent utterances
- Context-dependent intents

**TROUBLESHOOTING:**
- Define clear intent categories
- Provide confidence scores
- Implement fallback for low confidence
- Use conversation history for context
- Regular model retraining

**EXAMPLES/NOTES:**
- Intent types: navigation, search, control, query, automation
- Used in: `JarvisCore.recognize_intent()`, intent classifier
- Related: NRS-801, NRS-802, NRS-806, NRS-807

---

### NRS-804: Context and Session Management

**CODE:** NRS-804  
**NAME:** Context and Session Management  
**PURPOSE:** Maintain conversation context, track session state, remember user preferences, and manage multi-turn conversations.

**KNOWN ISSUES:**
- Context window too large (memory overhead)
- Context window too small (lost context)
- User interruptions lose context
- Session timeout handling
- Context pollution between sessions

**TROUBLESHOOTING:**
- Implement sliding context window
- Persist context to disk for long sessions
- Clear context on error
- Define context expiration
- Log context for debugging

**EXAMPLES/NOTES:**
- Used in: `ConversationManager` class, session tracking
- Related: NRS-805, NRS-806, NRS-808
- Max history: 20 messages (configurable)

---

### NRS-805: Response Generation

**CODE:** NRS-805  
**NAME:** Response Generation  
**PURPOSE:** Generate natural language response using LLM (GPT), format response for TTS, and ensure response is conversational.

**KNOWN ISSUES:**
- Response too long or too short
- Hallucinations or incorrect information
- Response not relevant to query
- Tone not appropriate
- Response not safe or harmful

**TROUBLESHOOTING:**
- Use system prompts to guide response
- Implement response filtering
- Test response quality
- Set response length limits
- Add safety checks

**EXAMPLES/NOTES:**
- LLM: OpenAI GPT-3.5 or GPT-4
- Constraints: Keep under 100 words for voice
- Used in: `JarvisCore.generate_response()`, LLM integration
- Related: NRS-804, NRS-806, NRS-808

---

### NRS-806: Command Execution Coordination

**CODE:** NRS-806  
**NAME:** Command Execution Coordination  
**PURPOSE:** Coordinate execution of recognized command, route to browser controller or other handlers, execute actions, and return results.

**KNOWN ISSUES:**
- Command execution errors
- Browser not responding
- Action fails silently
- Timeouts waiting for action
- State inconsistency

**TROUBLESHOOTING:**
- Implement error handling and recovery
- Add timeouts to prevent hanging
- Verify browser state before action
- Log all action execution
- Test actions independently

**EXAMPLES/NOTES:**
- Handlers: BrowserController, TaskExecutor, SearchEngine
- Used in: `JarvisCore.execute_command()`, command routing
- Related: NRS-801, NRS-803, NRS-807, NRS-809

---

### NRS-807: Error Recovery and Fallbacks

**CODE:** NRS-807  
**NAME:** Error Recovery and Fallbacks  
**PURPOSE:** Handle errors gracefully, provide fallback options, retry failed operations, and inform user of issues.

**KNOWN ISSUES:**
- Cascading failures
- Fallback also fails
- User not notified of errors
- No way to recover
- Error handling causes delay

**TROUBLESHOOTING:**
- Implement retry logic with exponential backoff
- Provide meaningful error messages
- Have multiple fallback strategies
- Log all errors for analysis
- Test error scenarios

**EXAMPLES/NOTES:**
- Retry count: 3 default (configurable)
- Used in: Error handling throughout codebase
- Related: NRS-806, NRS-808
- Recovery strategies: retry, fallback, abort

---

### NRS-808: Learning and Adaptation

**CODE:** NRS-808  
**NAME:** Learning and Adaptation  
**PURPOSE:** Learn from user interactions, adapt to user preferences, improve recognition over time, and personalize responses.

**KNOWN ISSUES:**
- Learning from limited data
- Negative learning from mistakes
- Privacy concerns with learning
- Adaptation too aggressive
- Requires retraining models

**TROUBLESHOOTING:**
- Store user preferences securely
- Implement supervised learning for feedback
- Regular model updates
- User controls for learning
- Audit learning for bias

**EXAMPLES/NOTES:**
- Used in: Preference tracking, response customization
- Related: NRS-804, NRS-805
- Optional feature (requires user opt-in)

---

### NRS-809: Multi-turn Conversation Handling

**CODE:** NRS-809  
**NAME:** Multi-turn Conversation Handling  
**PURPOSE:** Handle multi-turn conversations where context from previous turns matters, manage conversation flow, and handle clarifications.

**KNOWN ISSUES:**
- Conversation lost in middle
- Context from many turns ago forgotten
- User interruptions
- Conversation loops or dead ends
- Handoff between different intents

**TROUBLESHOOTING:**
- Maintain conversation state
- Summarize long conversations
- Provide explicit transitions between topics
- Ask for clarification when needed
- Test multi-turn scenarios

**EXAMPLES/NOTES:**
- Used in: `ConversationManager` class, multi-turn processing
- Related: NRS-804, NRS-806
- Supported: Up to 20-turn conversations (configurable)

---

### NRS-810: Audio Pipeline Orchestration

**CODE:** NRS-810  
**NAME:** Audio Pipeline Orchestration  
**PURPOSE:** Orchestrate entire audio pipeline from capture through STT, NLU, response generation, TTS, to playback.

**KNOWN ISSUES:**
- Timing misalignment between components
- Latency accumulation
- Pipeline deadlock
- Resource contention
- Barge-in handling (user interrupts response)

**TROUBLESHOOTING:**
- Monitor pipeline latency at each stage
- Implement timeouts for each stage
- Use queue-based architecture
- Implement priority for user audio
- Test pipeline under load

**EXAMPLES/NOTES:**
- Used in: `JarvisCore` main loop, `AudioPipeline` class
- Related: NRS-6xx, NRS-7xx, NRS-801-809
- Typical end-to-end latency: 2-5 seconds

---

## NRS-9xx: Browser Control & Integration

Browser automation and web interaction.

### NRS-901: Browser Initialization and Connection

**CODE:** NRS-901  
**NAME:** Browser Initialization and Connection  
**PURPOSE:** Start browser instance, establish connection to browser, configure browser settings, and prepare for automation.

**KNOWN ISSUES:**
- Browser fails to start
- Connection timeout
- Browser version mismatch
- Port already in use
- Browser crash on startup

**TROUBLESHOOTING:**
- Check browser binary path
- Ensure port not in use
- Update browser to latest version
- Check system resources (RAM, disk)
- Review browser logs for errors

**EXAMPLES/NOTES:**
- Browser: Chrome/Chromium (primary)
- Used in: `BrowserController.__init__()`
- Related: NRS-902, NRS-905

---

### NRS-902: DOM Element Detection and Selection

**CODE:** NRS-902  
**NAME:** DOM Element Detection and Selection  
**PURPOSE:** Locate elements on page using selectors, find elements by text, image recognition, and handle dynamic content.

**KNOWN ISSUES:**
- Element not found
- Multiple matching elements
- Dynamic elements change ID/class
- Element hidden or not rendered
- Selector too specific or too broad

**TROUBLESHOOTING:**
- Use multiple selector strategies
- Implement element waiting/polling
- Handle dynamic content loading
- Log failed selectors for debugging
- Use OCR for text-based matching

**EXAMPLES/NOTES:**
- Selectors: CSS, XPath, text-based, visual
- Used in: `BrowserController.find_element()`, element utilities
- Related: NRS-903, NRS-904

---

### NRS-903: User Action Simulation (Click, Type, etc.)

**CODE:** NRS-903  
**NAME:** User Action Simulation (Click, Type, etc.)  
**PURPOSE:** Simulate user interactions (click, type, scroll, hover), handle different input methods, and verify action executed.

**KNOWN ISSUES:**
- Element not clickable
- Type too fast or too slow
- Scroll position not correct
- Action doesn't trigger event
- Element covered by overlay

**TROUBLESHOOTING:**
- Scroll element into view first
- Verify element is visible
- Use proper timing delays
- Check for click handlers
- Test with manual clicks

**EXAMPLES/NOTES:**
- Actions: click, type, scroll, hover, double-click, right-click
- Used in: `BrowserController.click()`, `BrowserController.type()`, etc.
- Related: NRS-902, NRS-904

---

### NRS-904: Form Automation and Submission

**CODE:** NRS-904  
**NAME:** Form Automation and Submission  
**PURPOSE:** Fill form fields, select options, submit forms, handle form validation, and manage form responses.

**KNOWN ISSUES:**
- Required fields not identified
- Form validation rejects input
- Submitted form doesn't process
- CAPTCHA blocks submission
- Form resets unexpectedly

**TROUBLESHOOTING:**
- Check form field requirements
- Validate input format before submit
- Handle error messages from form
- Implement CAPTCHA solving (or skip)
- Wait for form processing

**EXAMPLES/NOTES:**
- Used in: `BrowserController.fill_form()`, form automation utilities
- Related: NRS-902, NRS-903, NRS-905

---

### NRS-905: Navigation and Page Control

**CODE:** NRS-905  
**NAME:** Navigation and Page Control  
**PURPOSE:** Navigate to URLs, handle page loading, manage tabs and windows, implement back/forward navigation.

**KNOWN ISSUES:**
- Page takes too long to load
- Navigation blocked by popup
- URL not accessible
- Page redirect loops
- New window opens unexpectedly

**TROUBLESHOOTING:**
- Increase page load timeout
- Handle and close popups
- Check URL is valid
- Follow redirects properly
- Manage multiple windows/tabs

**EXAMPLES/NOTES:**
- Used in: `BrowserController.navigate()`, `BrowserController.wait_for_load()`
- Related: NRS-901, NRS-906

---

### NRS-906: Data Extraction and Scraping

**CODE:** NRS-906  
**NAME:** Data Extraction and Scraping  
**PURPOSE:** Extract data from page (text, tables, links), parse structured data, handle pagination, and format extracted data.

**KNOWN ISSUES:**
- Page structure changes
- JavaScript renders content dynamically
- Data scattered in page
- Rate limiting on scraping
- Legal/ethical concerns

**TROUBLESHOOTING:**
- Wait for dynamic content to load
- Use multiple extraction strategies
- Implement respectful scraping delays
- Update selectors when page changes
- Check terms of service

**EXAMPLES/NOTES:**
- Used in: `BrowserController.extract_data()`, data utilities
- Related: NRS-902, NRS-905
- Output: Structured data (JSON, CSV, etc.)

---

### NRS-907: Event Handling and Callbacks

**CODE:** NRS-907  
**NAME:** Event Handling and Callbacks  
**PURPOSE:** Handle page events (load, error, navigation), implement callbacks for async operations, manage event listeners.

**KNOWN ISSUES:**
- Event listener not triggered
- Multiple event listeners conflict
- Memory leak from listeners
- Event order not guaranteed
- Callback hell with nested callbacks

**TROUBLESHOOTING:**
- Verify listener registered correctly
- Remove listeners when not needed
- Use async/await instead of callbacks
- Log all events for debugging
- Test event order

**EXAMPLES/NOTES:**
- Events: pageLoad, error, navigationStart, etc.
- Used in: Event handling throughout browser controller
- Related: NRS-901, NRS-905

---

### NRS-908: Browser Session Management

**CODE:** NRS-908  
**NAME:** Browser Session Management  
**PURPOSE:** Manage browser sessions (cookies, local storage), preserve session state, restore sessions, and handle session expiration.

**KNOWN ISSUES:**
- Session expires during automation
- Cookies deleted
- Local storage cleared
- Session ID invalid
- Multi-session conflicts

**TROUBLESHOOTING:**
- Store cookies and session data
- Restore session before operations
- Handle session expiration gracefully
- Check session validity
- Test session persistence

**EXAMPLES/NOTES:**
- Used in: `BrowserController` session management
- Related: NRS-901, NRS-905
- Storage: Cookies, localStorage, sessionStorage

---

### NRS-909: Error Handling in Browser Automation

**CODE:** NRS-909  
**NAME:** Error Handling in Browser Automation  
**PURPOSE:** Catch and handle browser errors, network errors, JavaScript errors, timeout errors, and provide recovery.

**KNOWN ISSUES:**
- Silent failures with no error message
- Error messages not helpful
- Browser crashes without recovery
- Network timeouts
- JavaScript errors not caught

**TROUBLESHOOTING:**
- Enable detailed error logging
- Implement retry logic
- Capture browser console errors
- Handle network errors
- Monitor browser health

**EXAMPLES/NOTES:**
- Error types: TimeoutError, NetworkError, JSError, ElementNotFound
- Used in: Error handling throughout browser controller
- Related: NRS-901, NRS-906, NRS-907

---

## Configuration Files

### voice_config.yaml
Controls STT (NRS-6xx) and TTS (NRS-7xx) settings

### audio_config.yaml
Controls audio pipeline settings

### llm_config.yaml
Controls LLM settings for NRS-8xx (response generation)

---

## File-to-Category Mapping

### Core Modules (jarvis/)
- `jarvis_core.py` - NRS-8xx, 810
- `audio_pipeline.py` - NRS-810, 6xx, 7xx
- `stt_engine.py` - NRS-6xx (601-608)
- `tts_engine.py` - NRS-7xx (701-708)
- `browser_controller.py` - NRS-9xx (901-909)
- `__init__.py` - Package initialization

### Examples (examples/)
- `simple_voice_chat.py` - NRS-8xx
- `voice_search.py` - NRS-8xx, 9xx
- `browser_automation.py` - NRS-9xx
- `custom_commands.py` - NRS-8xx

### Tests (tests/)
- `test_audio_pipeline.py` - NRS-6xx, 7xx
- `test_stt_engine.py` - NRS-6xx
- `test_tts_engine.py` - NRS-7xx
- `__init__.py` - Test package

### Utilities (utils/)
- `audio_utils.py` - NRS-6xx, 7xx
- `helpers.py` - NRS-8xx
- `logging_utils.py` - NRS-8xx
- `mock_pyaudio.py` - NRS-6xx, testing
- `real_audio.py` - NRS-6xx

### Root Level
- `demo.py` - NRS-8xx, 9xx, 810
- `main.py` - NRS-8xx, 810
- `quick_test.py` - NRS-6xx, 7xx, 8xx
- `test_audio_hardware.py` - NRS-6xx (608)
- `test_setup.py` - NRS-6xx, 7xx, 8xx

---

## Summary Statistics

- **Total Categories:** 4 (NRS-6xx through 9xx)
- **Total Micro-codes:** 40
- **Files Covered:** 17 Python files
- **Total Lines:** ~2,500+ lines of code
- **Coverage:** 100% of Jarvis project

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026  
**Status:** Ready for Implementation
