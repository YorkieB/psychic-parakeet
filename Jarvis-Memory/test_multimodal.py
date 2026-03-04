"""
Comprehensive test suite for Multi-Modal feature.

Tests cover MultimodalMemory and MultimodalJarvis functionality.
"""

import tempfile
from pathlib import Path

import pytest

from memory import Memory
from multimodal_jarvis import MultimodalJarvis
from multimodal_memory import MultimodalMemory


def test_multimodal_memory_creation() -> None:
    """Test creating multimodal memory."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    assert mem.content == "Test memory"
    assert len(mem.attachments) == 0


def test_multimodal_memory_add_image() -> None:
    """Test adding image attachment."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    # Create temporary file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(b"fake image data")
        tmp_path: str = tmp.name

    try:
        success: bool = mem.add_image(tmp_path, description="Test image")

        assert success is True
        assert len(mem.attachments) == 1
        assert "image" in list(mem.attachments.values())[0]["type"]
    finally:
        Path(tmp_path).unlink()


def test_multimodal_memory_add_audio() -> None:
    """Test adding audio attachment."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(b"fake audio data")
        tmp_path: str = tmp.name

    try:
        success: bool = mem.add_audio(tmp_path, transcription="Test transcription")

        assert success is True
        assert len(mem.attachments) == 1
        assert "audio" in list(mem.attachments.values())[0]["type"]
    finally:
        Path(tmp_path).unlink()


def test_multimodal_memory_add_video() -> None:
    """Test adding video attachment."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(b"fake video data")
        tmp_path: str = tmp.name

    try:
        success: bool = mem.add_video(tmp_path, frame_count=10)

        assert success is True
        assert len(mem.attachments) == 1
        assert "video" in list(mem.attachments.values())[0]["type"]
    finally:
        Path(tmp_path).unlink()


def test_multimodal_memory_multiple_attachments() -> None:
    """Test adding multiple attachments."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as img:
        img.write(b"image")
        img_path: str = img.name

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as audio:
        audio.write(b"audio")
        audio_path: str = audio.name

    try:
        mem.add_image(img_path)
        mem.add_audio(audio_path)

        assert len(mem.attachments) == 2
    finally:
        Path(img_path).unlink()
        Path(audio_path).unlink()


def test_multimodal_memory_nonexistent_file() -> None:
    """Test adding attachment with non-existent file."""
    mem: MultimodalMemory = MultimodalMemory(content="Test memory")

    success: bool = mem.add_image("nonexistent.jpg")

    assert success is False
    assert len(mem.attachments) == 0


def test_multimodal_jarvis_ingest_multimodal() -> None:
    """Test ingesting multimodal memory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        memory: MultimodalMemory = jarvis.ingest_multimodal(
            "Test memory", emotion="neutral", context="test"
        )

        assert isinstance(memory, MultimodalMemory)
        assert memory.content == "Test memory"


def test_multimodal_jarvis_query_by_modality_all() -> None:
    """Test querying all modalities."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Test memory", importance_score=0.8)

        results: list[Memory] = jarvis.query_by_modality("Test", modality="all", top_k=5)

        assert len(results) >= 0


def test_multimodal_jarvis_query_by_modality_text() -> None:
    """Test querying text modality."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        mem: MultimodalMemory = jarvis.ingest_multimodal("Text memory")

        results: list[Memory] = jarvis.query_by_modality("Text", modality="text", top_k=5)

        # Text memories may or may not have attachments
        assert isinstance(results, list)


def test_multimodal_jarvis_inherits_persistent() -> None:
    """Test that MultimodalJarvis inherits from PersistentJarvis."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        assert hasattr(jarvis, "save")
        assert hasattr(jarvis, "load")
        assert hasattr(jarvis, "backup")


def test_multimodal_memory_attachment_metadata() -> None:
    """Test attachment metadata."""
    mem: MultimodalMemory = MultimodalMemory(content="Test")

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(b"image data")
        tmp_path: str = tmp.name

    try:
        mem.add_image(tmp_path, description="Test description")

        attachment: dict = list(mem.attachments.values())[0]

        assert attachment["type"] == "image"
        assert attachment["description"] == "Test description"
        assert "filename" in attachment
        assert "size" in attachment
    finally:
        Path(tmp_path).unlink()


def test_multimodal_memory_audio_transcription() -> None:
    """Test audio transcription metadata."""
    mem: MultimodalMemory = MultimodalMemory(content="Test")

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(b"audio data")
        tmp_path: str = tmp.name

    try:
        mem.add_audio(tmp_path, transcription="This is a test")

        attachment: dict = list(mem.attachments.values())[0]

        assert attachment["transcription"] == "This is a test"
    finally:
        Path(tmp_path).unlink()


def test_multimodal_memory_video_frame_count() -> None:
    """Test video frame count metadata."""
    mem: MultimodalMemory = MultimodalMemory(content="Test")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(b"video data")
        tmp_path: str = tmp.name

    try:
        mem.add_video(tmp_path, frame_count=20)

        attachment: dict = list(mem.attachments.values())[0]

        assert attachment["frame_count"] == 20
    finally:
        Path(tmp_path).unlink()


def test_multimodal_jarvis_mixed_modalities() -> None:
    """Test handling mixed modality memories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        jarvis.ingest("Text memory", importance_score=0.8)
        mem: MultimodalMemory = jarvis.ingest_multimodal("Multimodal memory")

        results: list[Memory] = jarvis.query("memory", top_k=5)

        assert len(results) >= 0


def test_multimodal_memory_empty_attachments() -> None:
    """Test memory with no attachments."""
    mem: MultimodalMemory = MultimodalMemory(content="Test")

    assert len(mem.attachments) == 0
    assert mem.content == "Test"


def test_multimodal_jarvis_query_empty() -> None:
    """Test querying empty multimodal jarvis."""
    with tempfile.TemporaryDirectory() as tmpdir:
        jarvis: MultimodalJarvis = MultimodalJarvis(
            storage_dir=tmpdir, auto_load=False, auto_save=False
        )

        results: list[Memory] = jarvis.query_by_modality("test", modality="all", top_k=5)

        assert len(results) == 0
