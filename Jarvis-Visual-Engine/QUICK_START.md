# Quick Start Guide - EMEET Pixy 4K

## ✅ Setup Complete!

Your EMEET Pixy 4K camera is already configured and working!

## 🔑 Add Your OpenAI API Key

Edit the `.env` file and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**That's it!** The system only needs OpenAI - Claude/Anthropic is optional and not required.

## 🚀 Start the Vision Engine

Once you've added your OpenAI API key:

```bash
python -m src.main
```

The system will:
1. ✅ Connect to your EMEET Pixy 4K (USB index 1, 4K resolution)
2. ✅ Start processing frames
3. ✅ Use GPT-4o Vision for AI analysis
4. ✅ Enable all intelligence features

## 📋 Current Configuration

- **Camera:** EMEET Pixy 4K (USB)
- **Resolution:** 3840x2160 (4K)
- **USB Index:** 1
- **Connection:** USB
- **Vision API:** GPT-4o (OpenAI only)

## 🎯 What You Get

- Real-time vision analysis
- Object detection and recognition
- Face recognition
- Scene understanding
- Motion detection
- Spatial memory tracking
- Predictive insights
- Proactive suggestions

## 🔧 Troubleshooting

### Camera Issues?
```bash
# Test camera connection
python test_camera_simple.py

# List all USB cameras
python -m src.utils.list_usb_cameras
```

### API Issues?
- Make sure your OpenAI API key is valid
- Check you have credits/quota available
- Verify the key is in `.env` file

## 📚 More Info

- **USB Setup:** See `USB_CAMERA_SETUP.md`
- **Full Documentation:** See project README files

---

**You're all set! Just add your OpenAI API key and start the system.** 🎥✨
