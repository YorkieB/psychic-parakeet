"""
Multimodal memory support for Jarvis.

This module provides MultimodalMemory class that extends Memory
to support multimedia attachments (images, audio, video).
"""

from pathlib import Path
from typing import Dict, Optional

from memory import Memory


class MultimodalMemory(Memory):
    """
    Memory with multimedia attachments.

    Extends Memory class to support attachments like images,
    audio files, and videos.

    Attributes:
        attachments: Dictionary of attachment metadata
    """

    def __init__(self, content: str, **kwargs) -> None:
        """
        Initialize multimodal memory.

        Args:
            content: Memory content text
            **kwargs: Additional arguments passed to Memory constructor
        """
        super().__init__(content, **kwargs)
        self.attachments: Dict[str, Dict] = {}

    def add_image(self, image_path: str, description: str = "") -> bool:
        """
        Add image attachment.

        Args:
            image_path: Path to image file
            description: Optional description of the image

        Returns:
            True if added successfully, False otherwise
        """
        try:
            path: Path = Path(image_path)
            if not path.exists():
                return False

            with open(path, "rb") as f:
                data: bytes = f.read()

            self.attachments[f"image_{len(self.attachments)}"] = {
                "type": "image",
                "filename": path.name,
                "size": len(data),
                "description": description,
            }
            return True
        except Exception as e:
            print(f"Error adding image: {e}")
            return False

    def add_audio(self, audio_path: str, transcription: str = "") -> bool:
        """
        Add audio attachment.

        Args:
            audio_path: Path to audio file
            transcription: Optional text transcription

        Returns:
            True if added successfully, False otherwise
        """
        try:
            path: Path = Path(audio_path)
            if not path.exists():
                return False

            with open(path, "rb") as f:
                data: bytes = f.read()

            self.attachments[f"audio_{len(self.attachments)}"] = {
                "type": "audio",
                "filename": path.name,
                "size": len(data),
                "transcription": transcription,
            }
            return True
        except Exception as e:
            print(f"Error adding audio: {e}")
            return False

    def add_video(self, video_path: str, frame_count: int = 5) -> bool:
        """
        Add video attachment.

        Args:
            video_path: Path to video file
            frame_count: Number of key frames (default: 5)

        Returns:
            True if added successfully, False otherwise
        """
        try:
            path: Path = Path(video_path)
            if not path.exists():
                return False

            with open(path, "rb") as f:
                data: bytes = f.read()

            self.attachments[f"video_{len(self.attachments)}"] = {
                "type": "video",
                "filename": path.name,
                "size": len(data),
                "frame_count": frame_count,
            }
            return True
        except Exception as e:
            print(f"Error adding video: {e}")
            return False
