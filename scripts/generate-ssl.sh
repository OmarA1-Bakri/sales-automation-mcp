#!/bin/bash
# =============================================================================
# RTGS Sales Automation - SSL Certificate Generator
# =============================================================================
# Generates self-signed certificates for development/internal use
# For production, use Let's Encrypt or your organization's CA
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="$(dirname "$SCRIPT_DIR")/ssl"
DOMAIN="${1:-sales-api.internal.rtgs.global}"
DAYS=365

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

log_info "Generating SSL certificates for: $DOMAIN"

# Generate private key
openssl genrsa -out privkey.pem 2048

# Generate certificate signing request
openssl req -new -key privkey.pem -out csr.pem \
    -subj "/C=US/ST=California/L=San Francisco/O=RTGS Global/CN=$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -days $DAYS -in csr.pem -signkey privkey.pem -out fullchain.pem \
    -extfile <(printf "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1")

# Clean up CSR
rm -f csr.pem

# Set permissions
chmod 600 privkey.pem
chmod 644 fullchain.pem

log_info "SSL certificates generated successfully!"
echo ""
log_info "Files created:"
echo "  - $SSL_DIR/privkey.pem (private key)"
echo "  - $SSL_DIR/fullchain.pem (certificate)"
echo ""
log_warn "NOTE: This is a self-signed certificate."
log_warn "Users will need to trust this certificate or use --insecure with curl."
log_warn "For production, use a proper certificate authority."
echo ""
log_info "Certificate details:"
openssl x509 -in fullchain.pem -text -noout | grep -A2 "Subject:"
