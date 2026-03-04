"""
Multimodal support extension for Jarvis.

This module provides MultimodalJarvis class that supports
memories with multimedia attachments.
"""

from typing import List, Optional

from memory import Memory
from multimodal_memory import MultimodalMemory
from persistent_jarvis import PersistentJarvis


class MultimodalJarvis(PersistentJarvis):
    """
    Jarvis with multimedia support.

    Extends PersistentJarvis to support memories with attachments
    like images, audio, and video.

    Attributes:
        Inherits all from PersistentJarvis
    """

    def __init__(
        self, storage_dir: str = "./jarvis_data", auto_load: bool = True, auto_save: bool = True
    ) -> None:
        """
        Initialize MultimodalJarvis.

        Args:
            storage_dir: Directory for storage (default: "./jarvis_data")
            auto_load: Whether to load on initialization (default: True)
            auto_save: Whether to enable auto-save (default: True)
        """
        super().__init__(storage_dir=storage_dir, auto_load=auto_load, auto_save=auto_save)

    def ingest_multimodal(
        self,
        text: str,
        emotion: Optional[str] = None,
        context: Optional[str] = None,
        importance_score: Optional[float] = None,
    ) -> MultimodalMemory:
        """
        Ingest as multimodal memory.

        Args:
            text: Memory content text
            emotion: Source emotion
            context: Source context

        Returns:
            MultimodalMemory object
        """
        memory: MultimodalMemory = MultimodalMemory(
            content=text,
            source_emotion=emotion if emotion else "neutral",
            source_context=context if context else "general",
            importance_score=importance_score if importance_score is not None else 0.5,
        )
        self.stm.add(memory)
        return memory

    def query_by_modality(
        self, query: str, modality: str = "all", top_k: int = 5
    ) -> List[Memory]:
        """
        Query memories by media type.

        Args:
            query: Query text
            modality: Media type to filter by ("text", "image", "audio", "video", "all")
            top_k: Maximum number of results

        Returns:
            List of Memory objects matching the modality filter
        """
        results: List[Memory] = self.query(query, top_k=top_k * 2)

        if modality == "all":
            return results[:top_k]

        # Filter by modality
        filtered: List[Memory] = []
        for result in results:
            if hasattr(result, "attachments") and result.attachments:
                for att in result.attachments.values():
                    if att.get("type") == modality:
                        filtered.append(result)
                        break

        return filtered[:top_k]
