"""Local Sentence-Transformers Embedding Engine using BAAI/bge-small-en-v1.5."""
import logging
import os
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    """Singleton embedding engine using local BAAI/bge-small-en-v1.5 model."""
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingEngine, cls).__new__(cls)
            logger.info("Initializing BAAI/bge-small-en-v1.5 embedding model...")
            try:
                # Try loading from local cache first
                cls._model = SentenceTransformer("BAAI/bge-small-en-v1.5", local_files_only=True)
            except Exception as e:
                logger.warning(f"Failed to load from local files only ({e}), attempting online load...")
                cls._model = SentenceTransformer("BAAI/bge-small-en-v1.5")
            logger.info("BAAI/bge-small-en-v1.5 initialized successfully.")
        return cls._instance

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate normalized 384-dim embeddings for a list of text strings."""
        if not texts:
            return []
        cleaned_texts = [t.strip() if (t and isinstance(t, str) and t.strip()) else " " for t in texts]
        embeddings = self._model.encode(cleaned_texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Generate normalized 384-dim embedding for a single search query."""
        cleaned = query.strip() if (query and isinstance(query, str) and query.strip()) else " "
        embedding = self._model.encode([cleaned], normalize_embeddings=True)[0]
        return embedding.tolist()
