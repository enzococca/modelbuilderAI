"""ChromaDB vector store for RAG."""

from __future__ import annotations

import re
from typing import Any

from config import settings


class VectorStore:
    """Wrapper around a ChromaDB persistent client with intelligent chunking and RAG.

    The ChromaDB client is created lazily on first use to avoid blocking
    the application startup (chromadb can be slow to initialize).
    """

    def __init__(self) -> None:
        self._client: Any = None

    def _ensure_client(self) -> Any:
        if self._client is None:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            self._client = chromadb.PersistentClient(
                path=settings.chroma_path,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    def get_or_create_collection(self, name: str = "documents"):
        return self._ensure_client().get_or_create_collection(name=name)

    def add_documents(
        self,
        texts: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
        collection_name: str = "documents",
    ) -> None:
        col = self.get_or_create_collection(collection_name)
        col.add(documents=texts, metadatas=metadatas, ids=ids)

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        collection_name: str = "documents",
        where: dict | None = None,
    ) -> dict:
        col = self.get_or_create_collection(collection_name)
        kwargs: dict[str, Any] = {"query_texts": [query_text], "n_results": n_results}
        if where:
            kwargs["where"] = where
        return col.query(**kwargs)

    def delete_collection(self, name: str) -> None:
        try:
            self._ensure_client().delete_collection(name)
        except ValueError:
            pass  # collection doesn't exist

    def delete_by_file_id(self, file_id: str, collection_name: str = "documents") -> None:
        """Remove all chunks belonging to a specific file."""
        col = self.get_or_create_collection(collection_name)
        try:
            col.delete(where={"file_id": file_id})
        except Exception:
            pass

    # ── RAG helpers ──────────────────────────────────────────

    def index_document(
        self,
        file_id: str,
        filename: str,
        text: str,
        project_id: str | None = None,
        chunk_size: int = 800,
        overlap: int = 200,
    ) -> int:
        """Chunk a document intelligently and index it. Returns chunk count."""
        chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        if not chunks:
            return 0

        ids = [f"{file_id}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "file_id": file_id,
                "filename": filename,
                "chunk_index": i,
                "project_id": project_id or "",
            }
            for i in range(len(chunks))
        ]
        self.add_documents(chunks, metadatas=metadatas, ids=ids)
        return len(chunks)

    def search_for_context(
        self,
        query: str,
        n_results: int = 5,
        project_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Search and return formatted context chunks with citations."""
        where = {"project_id": project_id} if project_id else None
        results = self.query(query, n_results=n_results, where=where)

        contexts: list[dict[str, Any]] = []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(documents, metadatas, distances):
            contexts.append({
                "content": doc,
                "filename": meta.get("filename", "unknown"),
                "chunk_index": meta.get("chunk_index", 0),
                "file_id": meta.get("file_id", ""),
                "relevance": round(1.0 - dist, 4) if dist < 1.0 else 0.0,
            })

        return contexts

    def build_rag_prompt(
        self,
        query: str,
        n_results: int = 5,
        project_id: str | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Build a RAG-enhanced prompt with context and return citations.

        Returns (enhanced_prompt, citations).
        """
        contexts = self.search_for_context(query, n_results=n_results, project_id=project_id)
        if not contexts:
            return query, []

        context_block = "\n\n".join(
            f"[Source: {c['filename']}, chunk {c['chunk_index'] + 1}]\n{c['content']}"
            for c in contexts
        )

        enhanced = (
            f"Use the following document excerpts to answer the question. "
            f"Cite sources using [Source: filename] format when referencing information.\n\n"
            f"--- Document Context ---\n{context_block}\n--- End Context ---\n\n"
            f"Question: {query}"
        )

        return enhanced, contexts


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks, preferring sentence boundaries."""
    if not text.strip():
        return []

    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            # Keep overlap by retaining recent sentences
            overlap_text = " ".join(current_chunk)
            while current_chunk and len(overlap_text) > overlap:
                current_chunk.pop(0)
                overlap_text = " ".join(current_chunk)
            current_len = len(overlap_text)
        current_chunk.append(sentence)
        current_len += sentence_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


vector_store = VectorStore()
