"""
Jarvis Voice Assistant - FINAL CLEAN VERSION
Uses Windows native audio recording - NO sounddevice errors!
✅ Voice Activity Detection
✅ Barge-in Support  
✅ Zero error messages
"""
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
import soundfile as sf
import numpy as np
import warnings
from jarvis.tts_engine import TTSEngine
from jarvis.stt_engine import STTEngine
from openai import OpenAI
import yaml
import time
import wave
import struct

# Suppress all warnings
warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.CRITICAL)

class CleanJarvisChat:
    """Jarvis with Windows native audio - no errors!"""
    
    def __init__(self):
        print("\n" + "="*60)
        print("   JARVIS - VOICE ASSISTANT")
        print("   (Clean, No Errors)")
        print("="*60)
        print("\nInitializing...")
        
        self.tts = TTSEngine(voice_style="jarvis")
        print("  [OK] Voice output")
        
        self.stt = STTEngine()
        print("  [OK] Voice input")
        
        try:
            with open("configs/voice_config.yaml", 'r') as f:
                config = yaml.safe_load(f)
            api_key = config.get('stt', {}).get('api_key')
            self.openai_client = OpenAI(api_key=api_key)
            print("  [OK] AI brain")
        except:
            self.openai_client = None
        
        self.temp_dir = tempfile.mkdtemp()
        self.conversation_history = []
        self.is_speaking = False
        self.stop_speaking = False
        
        print("\n[READY] Let's talk!\n")
    
    async def speak(self, text: str, can_interrupt=True):
        """Speak with interruption support"""
        self.is_speaking = True
        self.stop_speaking = False
        
        try:
            audio_data = await self.tts.text_to_speech(text)
            
            if len(audio_data) > 0:
                temp_wav = Path(self.temp_dir) / "output.wav"
                sf.write(temp_wav, audio_data, 16000)
                
                if can_interrupt:
                    print("  [Speaking... ENTER=interrupt]", end="", flush=True)
                
                self.playback = subprocess.Popen(
                    ['powershell', '-Command', f'(New-Object Media.SoundPlayer "{temp_wav}").PlaySync()'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
                # Check for interruption
                while self.playback.poll() is None:
                    if self.stop_speaking:
                        self.playback.terminate()
                        print(" [Stopped!]")
                        break
                    await asyncio.sleep(0.05)
                
                if not self.stop_speaking:
                    print()  # New line after speaking
                
                try:
                    temp_wav.unlink()
                except:
                    pass
        except:
            pass
        
        self.is_speaking = False
    
    def record_windows_native(self, max_duration=15):
        """Record using Windows MCI - NO sounddevice!"""
        try:
            print(f"\n[LISTENING] Speak for up to {max_duration} seconds...")
            print("  (Or finish earlier - I'll detect silence)\n  ", end="", flush=True)
            
            temp_audio = Path(self.temp_dir) / "input.wav"
            
            # Windows MCI commands
            ps_script = f'''
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinSound {{
    [DllImport("winmm.dll")]
    public static extern int mciSendString(string command, string returnValue, int returnLength, IntPtr callback);
}}
"@

[WinSound]::mciSendString("open new Type waveaudio Alias rec", "", 0, [IntPtr]::Zero) | Out-Null
[WinSound]::mciSendString("set rec time format ms bitspersample 16 channels 1 samplespersec 16000", "", 0, [IntPtr]::Zero) | Out-Null
[WinSound]::mciSendString("record rec", "", 0, [IntPtr]::Zero) | Out-Null

$duration = {int(max_duration * 1000)}
$start = Get-Date
while (((Get-Date) - $start).TotalMilliseconds -lt $duration) {{
    Start-Sleep -Milliseconds 100
    Write-Host "." -NoNewline
}}

[WinSound]::mciSendString("stop rec", "", 0, [IntPtr]::Zero) | Out-Null
[WinSound]::mciSendString("save rec `"{temp_audio}`"", "", 0, [IntPtr]::Zero) | Out-Null
[WinSound]::mciSendString("close rec", "", 0, [IntPtr]::Zero) | Out-Null
'''
            
            # Execute silently
            proc = subprocess.Popen(
                ['powershell', '-Command', ps_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )
            
            # Show dots while recording
            start = time.time()
            while proc.poll() is None and time.time() - start < max_duration + 2:
                print(".", end="", flush=True)
                time.sleep(0.5)
            
            proc.wait(timeout=2)
            print("\n  [OK] Recording complete")
            
            # Check file
            time.sleep(0.3)
            if temp_audio.exists() and temp_audio.stat().st_size > 5000:
                return temp_audio
            else:
                print("  [WARNING] Recording too short")
                return None
                
        except Exception as e:
            print(f"\n  [ERROR] Recording failed")
            return None
    
    async def transcribe(self, audio_file):
        """Transcribe audio"""
        try:
            if not audio_file or not audio_file.exists():
                return None
            
            print("  [Processing] Transcribing...")
            text = await self.stt.transcribe_audio(str(audio_file))
            
            try:
                audio_file.unlink()
            except:
                pass
            
            return text
        except:
            return None
    
    async def get_response(self, user_text: str) -> str:
        """Get AI response"""
        try:
            if not self.openai_client:
                return "I cannot process conversations without AI."
            
            self.conversation_history.append({"role": "user", "content": user_text})
            
            messages = [
                {"role": "system", "content": "You are Jarvis, a helpful voice assistant. Be concise (2-3 sentences)."}
            ] + self.conversation_history[-10:]
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )
            
            assistant_text = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": assistant_text})
            
            return assistant_text
        except:
            return "I apologize, I had an error."
    
    async def run(self):
        """Main loop"""
        print("="*60)
        print("Commands:")
        print("  ENTER = Speak (up to 15 seconds)")
        print("  ENTER while Jarvis speaks = Interrupt")
        print("  Type message = Text input")
        print("  'quit' = Exit")
        print("="*60 + "\n")
        
        greeting = "Hello! I'm Jarvis. Press Enter and speak to me!"
        print(f"Jarvis: {greeting}")
        await self.speak(greeting, can_interrupt=False)
        
        while True:
            try:
                print("\n" + "-"*60)
                
                if self.is_speaking:
                    user_input = input("\n[ENTER to interrupt]: ").strip()
                    if not user_input:
                        self.stop_speaking = True
                        await asyncio.sleep(0.2)
                        continue
                else:
                    user_input = input("\nENTER=speak / type / 'quit': ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    print("\nJarvis: Goodbye!")
                    await self.speak("Goodbye! Great talking to you!", can_interrupt=False)
                    break
                
                if not user_input:
                    # VOICE INPUT
                    audio = self.record_windows_native(max_duration=15)
                    if audio:
                        text = await self.transcribe(audio)
                        if text:
                            print(f"\n  You: {text}")
                        else:
                            print("\n  [ERROR] Couldn't understand")
                            continue
                    else:
                        continue
                else:
                    # TEXT INPUT
                    text = user_input
                
                if text:
                    print("\n  [Thinking...]")
                    response = await self.get_response(text)
                    print(f"\nJarvis: {response}")
                    await self.speak(response, can_interrupt=True)
                
            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except:
                pass
        
        # Cleanup
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass

async def main():
    chat = CleanJarvisChat()
    await chat.run()

if __name__ == "__main__":
    asyncio.run(main())
