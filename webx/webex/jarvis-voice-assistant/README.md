# Jarvis Voice Assistant

A sophisticated real-time voice assistant with browser automation capabilities, featuring advanced voice activity detection, barge-in support, and conversational AI.

## 🎯 Features

- **Real-time Voice Conversation**: Natural voice interaction with barge-in support
- **Browser Automation**: Voice-controlled web browsing and automation
- **Advanced Audio Processing**: Voice Activity Detection (VAD) and noise reduction
- **Multiple TTS Voices**: ElevenLabs integration with various voice styles
- **Flexible STT**: OpenAI Whisper support (API and local models)
- **Modular Architecture**: Easy to extend and customize
- **Comprehensive Configuration**: YAML-based configuration system

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Audio input/output device (microphone and speakers)
- OpenAI API key
- ElevenLabs API key
- Chrome browser (for browser automation)

### Installation

1. **Clone and setup**:
```bash
git clone <repository>
cd jarvis-voice-assistant

# Create virtual environment
python -m venv jarvis-env
source jarvis-env/bin/activate  # On Windows: jarvis-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

3. **Run Jarvis**:
```bash
python main.py
```

## 📋 Examples

### Simple Voice Chat
```bash
python examples/simple_voice_chat.py
```

### Browser Automation
```bash
python examples/browser_automation.py
```

### Voice Search
```bash
python examples/voice_search.py
```

### Custom Commands
```bash
python examples/custom_commands.py
```

## 🗣️ Voice Commands

### Basic Commands
- "Hello Jarvis" - Wake up Jarvis
- "What time is it?" - Get current time
- "Stop" or "Goodbye" - End conversation

### Browser Commands
- "Navigate to Google" - Open Google
- "Search for Python tutorials" - Search on current page
- "Click on the first result" - Click elements
- "Scroll down" - Page navigation
- "Go back" - Browser back button
- "Take a screenshot" - Capture screen

### Advanced Commands
- "Open my favorite sites" - Open predefined websites
- "Start work session" - Focus mode
- "Check my schedule" - View calendar (customizable)

## ⚙️ Configuration

### Audio Configuration (`configs/audio_config.yaml`)
```yaml
audio:
  sample_rate: 16000
  channels: 1
  format: int16
  chunk_size: 1024
  input_device: 1   # Realtek mic (works on this setup)
  output_device: 5  # Realtek headphones
  
voice_detection:
  energy_threshold: 0.02
  silence_duration: 1.0
  max_recording_time: 30.0
```

### Voice Configuration (`configs/voice_config.yaml`)
```yaml
elevenlabs:
  api_key: ${ELEVENLABS_API_KEY}
  
voices:
  jarvis:
    voice_id: "pNInz6obpgDQGcFmaJgB"  # Adam
    stability: 0.5
    similarity_boost: 0.75
    style: 0.0
    
  professional:
    voice_id: "EXAVITQu4vr4xnSDxMaL"  # Bella
    stability: 0.3
    similarity_boost: 0.8
    style: 0.2
```

### LLM Configuration (`configs/llm_config.yaml`)
```yaml
openai:
  api_key: ${OPENAI_API_KEY}
  model: "gpt-4o"
  max_tokens: 150
  temperature: 0.7
  
conversation:
  system_prompt: "You are Jarvis, a helpful voice assistant..."
  max_history: 10
  context_window: 4000
```

## 🏗️ Architecture

### Core Components

1. **Audio Pipeline** (`jarvis/audio_pipeline.py`)
   - Real-time audio capture and playback
   - Voice Activity Detection (VAD)
   - Barge-in interruption support

2. **STT Engine** (`jarvis/stt_engine.py`)
   - OpenAI Whisper integration
   - Local and API-based transcription
   - Streaming support

3. **TTS Engine** (`jarvis/tts_engine.py`)
   - ElevenLabs voice synthesis
   - Multiple voice profiles
   - Streaming audio generation

4. **Jarvis Core** (`jarvis/jarvis_core.py`)
   - Conversation management
   - Context handling
   - Command processing

5. **Browser Controller** (`jarvis/browser_controller.py`)
   - Selenium-based automation
   - Voice command mapping
   - Web interaction

### Directory Structure
```
jarvis-voice-assistant/
├── jarvis/                    # Core package
│   ├── __init__.py
│   ├── audio_pipeline.py      # Audio I/O and VAD
│   ├── stt_engine.py         # Speech-to-text
│   ├── tts_engine.py         # Text-to-speech
│   ├── jarvis_core.py        # Main conversation engine
│   └── browser_controller.py  # Browser automation
├── configs/                   # Configuration files
│   ├── audio_config.yaml
│   ├── voice_config.yaml
│   └── llm_config.yaml
├── examples/                  # Usage examples
│   ├── simple_voice_chat.py
│   ├── browser_automation.py
│   ├── voice_search.py
│   └── custom_commands.py
├── utils/                     # Utility functions
│   ├── helpers.py
│   ├── logging_utils.py
│   └── audio_utils.py
├── tests/                     # Test suite
├── data/                      # Data directory
│   ├── temp/                 # Temporary files
│   └── logs/                 # Log files
├── main.py                   # Main entry point
├── requirements.txt          # Dependencies
└── README.md                # This file
```

## 🔧 Development

### Running Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific test
python tests/test_audio_pipeline.py

# Run with coverage
python -m pytest tests/ --cov=jarvis
```

### Extending Jarvis

1. **Custom Voice Commands**: Edit `examples/custom_commands.py`
2. **New TTS Provider**: Extend `TTSEngine` class
3. **Additional Browser Actions**: Add methods to `BrowserController`
4. **Custom Audio Processing**: Modify `AudioPipeline`

### Adding New Voices

1. Get voice ID from ElevenLabs
2. Add to `configs/voice_config.yaml`:
```yaml
voices:
  my_voice:
    voice_id: "your_voice_id_here"
    stability: 0.5
    similarity_boost: 0.8
```

3. Use in code:
```python
jarvis.load_voice_profile("my_voice")
```

## 🐛 Troubleshooting

### Audio Issues
- **No microphone detected**: Check `audio_config.yaml` device settings
- **Poor voice detection**: Adjust `energy_threshold` in config
- **Audio clipping**: Reduce input volume or adjust `chunk_size`

### API Issues
- **OpenAI errors**: Verify API key and quota
- **ElevenLabs errors**: Check voice IDs and character limits
- **Rate limiting**: Add delays or implement retry logic

### Browser Issues
- **Chrome not found**: Install Chrome or update WebDriver
- **Element not found**: Website structure may have changed
- **Slow automation**: Increase wait timeouts

### Common Fixes
```bash
# Audio permission issues (Linux)
sudo usermod -a -G audio $USER

# Chrome driver issues
pip install --upgrade chromedriver-autoinstaller

# Dependencies
pip install --upgrade -r requirements.txt
```

## 📈 Performance Optimization

### Audio Settings
- Lower `chunk_size` for responsiveness
- Higher `sample_rate` for quality
- Adjust `energy_threshold` for environment

### API Optimization
- Use local Whisper for offline STT
- Cache TTS responses
- Optimize conversation context

### Memory Management
- Regular cleanup of temp files
- Audio buffer size limits
- Model loading optimization

## 🔒 Security

- **API Keys**: Store in `.env`, never commit
- **Audio Privacy**: Local processing when possible
- **Browser Security**: Isolated browser sessions
- **Logging**: Sanitize sensitive information

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: Wiki section

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT models
- ElevenLabs for high-quality TTS
- Selenium team for browser automation
- PyAudio for audio processing

---

**Built with ❤️ for voice-controlled automation**