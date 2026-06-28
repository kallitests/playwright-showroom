# =============================================================================
# Dockerfile — Playwright Showroom
# =============================================================================
# We use the official Playwright image which comes with:
#   - Node.js pre-installed
#   - All browser binaries (Chromium, Firefox, WebKit) pre-installed
#   - All OS-level dependencies already satisfied
#
# This means we don't need to run `npx playwright install` manually —
# everything is ready to run tests out of the box.
# =============================================================================

# Use the official Playwright image pinned to a specific version for
# reproducibility — "latest" can break CI when a new version ships
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# ---------------------------------------------------------------------------
# Set the working directory inside the container
# All subsequent commands run relative to this path
# ---------------------------------------------------------------------------
WORKDIR /app

# ---------------------------------------------------------------------------
# Copy dependency files FIRST (before the rest of the source code).
# Docker caches each layer. If package.json hasn't changed, Docker reuses
# the cached npm install layer — much faster rebuilds.
# ---------------------------------------------------------------------------
COPY package.json package-lock.json* ./

# ---------------------------------------------------------------------------
# Install Node dependencies
# --ci is the production-safe equivalent of npm install:
#   - Installs exact versions from package-lock.json
#   - Fails if lock file is out of sync
#   - Never updates the lock file
# ---------------------------------------------------------------------------
RUN npm ci

# ---------------------------------------------------------------------------
# Copy the rest of the source code into the container
# This layer is rebuilt only when source files change
# ---------------------------------------------------------------------------
COPY . .

# ---------------------------------------------------------------------------
# Default command: run the full test suite against Chromium
# This can be overridden in docker-compose.yml or at runtime:
#   docker run playwright-showroom npx playwright test tests/smoke/
# ---------------------------------------------------------------------------
CMD ["npx", "playwright", "test", "--project=chromium"]
