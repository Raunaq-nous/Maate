FROM python:3.12-slim-bookworm

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Bake BAAI/bge-small-en-v1.5 model into image during build
ENV HF_HOME=/app/models_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/models_cache
RUN python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

COPY app/ ./app/

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
