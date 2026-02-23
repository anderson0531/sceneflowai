# SceneFlow AI FFmpeg Video Renderer
# Deployed to GCP Cloud Run Jobs for cost-effective video rendering
# Cost: ~$0.002/min vs Shotstack $0.25/min (100x cheaper)

FROM python:3.11-slim

# Install FFmpeg, dependencies, and fonts for text overlays
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-liberation2 \
    fontconfig \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Google Fonts (Montserrat, Roboto, RobotoMono) for text overlays
# Using direct GitHub releases which are more reliable than fonts.google.com
# Lora will fall back to Liberation Serif which is similar
RUN mkdir -p /usr/share/fonts/google/montserrat \
             /usr/share/fonts/google/roboto \
             /usr/share/fonts/google/robotomono && \
    # Montserrat
    wget -q "https://github.com/JulietaUla/Montserrat/archive/refs/heads/master.zip" -O /tmp/montserrat.zip && \
    unzip -q /tmp/montserrat.zip -d /tmp && \
    find /tmp/Montserrat-master/fonts -name "*.ttf" -exec cp {} /usr/share/fonts/google/montserrat/ \; 2>/dev/null || true && \
    # Roboto
    wget -q "https://github.com/googlefonts/roboto/releases/download/v2.138/roboto-android.zip" -O /tmp/roboto.zip && \
    unzip -q /tmp/roboto.zip -d /tmp/roboto && \
    find /tmp/roboto -name "*.ttf" -exec cp {} /usr/share/fonts/google/roboto/ \; 2>/dev/null || true && \
    # Roboto Mono
    wget -q "https://github.com/googlefonts/RobotoMono/archive/refs/heads/main.zip" -O /tmp/robotomono.zip && \
    unzip -q /tmp/robotomono.zip -d /tmp && \
    find /tmp/RobotoMono-main -name "*.ttf" -exec cp {} /usr/share/fonts/google/robotomono/ \; 2>/dev/null || true && \
    # Cleanup and regenerate font cache
    rm -rf /tmp/*.zip /tmp/Montserrat-* /tmp/roboto /tmp/RobotoMono-* && \
    fc-cache -fv

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
