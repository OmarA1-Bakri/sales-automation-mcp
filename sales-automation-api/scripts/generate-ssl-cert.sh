#!/bin/bash
# Generate self-signed SSL certificate for development

CERT_DIR="/home/omar/claude - sales_auto_skill/mcp-server/ssl"
mkdir -p "$CERT_DIR"

echo "Generating self-signed SSL certificate..."

openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=SalesAutomation/CN=localhost"

chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo "✓ SSL certificate generated:"
echo "  Key: $CERT_DIR/privkey.pem"
echo "  Cert: $CERT_DIR/fullchain.pem"
echo ""
echo "Add to .env:"
echo "SSL_KEY_PATH=$CERT_DIR/privkey.pem"
echo "SSL_CERT_PATH=$CERT_DIR/fullchain.pem"
echo "ENABLE_HTTPS=true"
