#!/bin/bash
# =============================================================================
# RTGS Sales Automation - Desktop App Build Script
# =============================================================================
# Builds production Electron app for specified platforms
# Usage: ./build-desktop.sh [mac|win|linux|all]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DESKTOP_DIR="$PROJECT_DIR/desktop-app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Parse arguments
PLATFORM="${1:-all}"

cd "$DESKTOP_DIR"

# =============================================================================
# Pre-flight Checks
# =============================================================================
log_step "Running pre-flight checks..."

if [ ! -f ".env.production" ]; then
    log_error ".env.production not found!"
    log_info "Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.production
        log_warn "Please update .env.production with production API URL before building."
    fi
fi

if [ ! -f "package.json" ]; then
    log_error "package.json not found! Are you in the desktop-app directory?"
    exit 1
fi

# Check for node_modules
if [ ! -d "node_modules" ]; then
    log_step "Installing dependencies..."
    npm install
fi

# =============================================================================
# Build
# =============================================================================
log_step "Building for platform: $PLATFORM"

case $PLATFORM in
    mac)
        log_info "Building for macOS..."
        npm run build:prod:mac
        ;;
    win)
        log_info "Building for Windows..."
        npm run build:prod:win
        ;;
    linux)
        log_info "Building for Linux..."
        npm run build:prod:linux
        ;;
    all)
        log_info "Building for all platforms..."
        npm run build:prod:all
        ;;
    *)
        log_error "Unknown platform: $PLATFORM"
        log_info "Usage: $0 [mac|win|linux|all]"
        exit 1
        ;;
esac

# =============================================================================
# Summary
# =============================================================================
echo ""
log_info "==========================================="
log_info "  Desktop App Build Complete!"
log_info "==========================================="
echo ""

if [ -d "dist-electron" ]; then
    log_info "Output files:"
    ls -la dist-electron/*.{dmg,exe,AppImage,zip} 2>/dev/null || true
    echo ""
fi

log_info "Distribution files are in: $DESKTOP_DIR/dist-electron/"
log_info ""
log_info "Next steps:"
log_info "  1. Test the built application"
log_info "  2. Distribute to users via your IT software portal"
log_info "  3. Users will configure API key on first launch"
