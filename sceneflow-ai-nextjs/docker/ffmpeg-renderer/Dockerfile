# SceneFlow AI FFmpeg Video Renderer
# Deployed to GCP Cloud Run Jobs for cost-effective video rendering
# Cost: ~$0.002/min vs Shotstack $0.25/min (100x cheaper)

FROM python:3.11-slim

# Install FFmpeg and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy render script
COPY render.py .
COPY ffmpeg_utils.py .

# Create temp directories
RUN mkdir -p /tmp/assets /tmp/output

# Environment variables (set by Cloud Run Job)
ENV JOB_SPEC_PATH=""
ENV GCS_BUCKET=""
ENV CALLBACK_URL=""

# Run the render script
CMD ["python", "render.py"]
