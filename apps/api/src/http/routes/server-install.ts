export function installScript(origin: string): string {
  const quotedOrigin = origin.replaceAll("'", "'\\''");
  return `#!/bin/sh
set -eu
umask 077

IDESK_URL=\${IDESK_URL:-'${quotedOrigin}'}
: "\${IDESK_PROBE_TOKEN:?Set IDESK_PROBE_TOKEN to the server token}"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 20 or newer is required' >&2
  exit 1
fi
node_major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$node_major" -lt 20 ]; then
  echo 'Node.js 20 or newer is required' >&2
  exit 1
fi

install -d -m 755 /opt/idesk-probe
install -d -m 700 /etc/idesk-probe
curl -fsSL "$IDESK_URL/api/probe/v1/probe.mjs" -o /opt/idesk-probe/probe.mjs
chmod 644 /opt/idesk-probe/probe.mjs
printf '%s\\n' "$IDESK_PROBE_TOKEN" > /etc/idesk-probe/token
chmod 600 /etc/idesk-probe/token

cat > /etc/systemd/system/idesk-probe.service <<EOF
[Unit]
Description=IDesk server probe
After=network-online.target
Wants=network-online.target

[Service]
DynamicUser=yes
LoadCredential=token:/etc/idesk-probe/token
ExecStart=/usr/bin/env node /opt/idesk-probe/probe.mjs --url "$IDESK_URL" --token-file \\\${CREDENTIALS_DIRECTORY}/token
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now idesk-probe
systemctl restart idesk-probe
`;
}
