-- Enable extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure embeddings column type is vector(1536)
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(1536) USING embedding;

