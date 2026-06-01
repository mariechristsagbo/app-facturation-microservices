#!/bin/sh
set -eu

CERT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CRT="$CERT_DIR/facturation.test.crt"
KEY="$CERT_DIR/facturation.test.key"
CONF="$CERT_DIR/.openssl.local.cnf"

cat > "$CONF" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = facturation.test

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = facturation.test
DNS.2 = app.facturation.test
DNS.3 = admin.facturation.test
DNS.4 = traefik.facturation.test
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY" \
  -out "$CRT" \
  -config "$CONF"

rm -f "$CONF"
echo "Certificat local genere: $CRT"
