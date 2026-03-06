# SceneFlow AI Headless Browser Video Renderer
# Deployed to GCP Cloud Run Jobs for deterministic 4K video rendering
# Uses Puppeteer + Chromium for frame-perfect watermark rendering
# 
# Key Features:
# - Frame-by-frame "Seek, Draw, Commit" rendering (no dropped frames)
# - Pre-installed fonts (Inter, system fonts) for consistent watermarks
# - Software GL rendering via SwiftShader for GPU-less environments
# - Guaranteed watermark rendering via synchronous GPU flush

FROM node:20-slim

# Install Chromium dependencies, system fonts, and Inter font
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium and its dependencies
    chromium \
    # Font rendering libraries
    fonts-liberation \
    fonts-liberation2 \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    fontconfig \
    # Inter font (primary watermark font)
    fonts-inter \
    # Required for canvas operations
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    # Networking and utilities
    ca-certificates \
    wget \
    curl \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    # Regenerate font cache
    && fc-cache -fv

# Set Puppeteer to use system Chromium (don't download its own)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    # Disable Chrome sandbox (required for Docker)
    CHROME_NO_SANDBOX=true \
    # Node.js memory optimization for 4K canvas operations
    NODE_OPTIONS="--max-old-space-size=4096"

# Set working directory
WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy render scripts
COPY . .

# Create temp directories for rendering
RUN mkdir -p /tmp/render /tmp/output

# Environment variables (set by Cloud Run Job)
ENV JOB_SPEC_PATH="" \
    GCS_BUCKET="" \
    CALLBACK_URL="" \
    RENDER_WIDTH="1920" \
    RENDER_HEIGHT="1080" \
    RENDER_FPS="30"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Run the render script
CMD ["node", "render.js"]
