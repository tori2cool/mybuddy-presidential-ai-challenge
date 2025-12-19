# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (psycopg/asyncpg may need build tools occasionally)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (for better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project
COPY . .

# Default command is overridden by docker-compose, but keep something sensible here
# IMPORTANT: use the same import path as docker-compose (and production)
# so routers registered in app.main are served.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]