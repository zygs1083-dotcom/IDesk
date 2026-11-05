export function installScript(origin: string): string {
  const quotedOrigin = origin.replaceAll("'", "'\\''");
  return `#!/bin/sh
set -eu
umask 077

IDESK_URL=\${IDESK_URL:-'${quotedOrigin}'}
: "\${IDESK_PROBE_TOKEN:?Set IDESK_PROBE_TOKEN to the server token}"
os_name=$(uname -s)
node_bin=$(command -v node || true)
# launchd 只有系统 PATH，找不到 Homebrew/nvm 的 node；macOS 用安装命令传入的绝对路径
if [ "$os_name" = Darwin ] && [ -n "\${IDESK_NODE:-}" ]; then
  node_bin=$IDESK_NODE
fi
if [ -z "$node_bin" ] || [ ! -x "$node_bin" ]; then
  echo 'Node.js 20 or newer is required' >&2
  exit 1
fi
node_major=$("$node_bin" -p 'process.versions.node.split(".")[0]')
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

if [ "$os_name" = Darwin ]; then
  plist=/Library/LaunchDaemons/com.idesk.probe.plist
  chown -R nobody /etc/idesk-probe
  touch /var/log/idesk-probe.log
  chown nobody /var/log/idesk-probe.log
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.idesk.probe</string>
  <key>ProgramArguments</key>
  <array>
    <string>$node_bin</string>
    <string>/opt/idesk-probe/probe.mjs</string>
    <string>--url</string>
    <string>$IDESK_URL</string>
    <string>--token-file</string>
    <string>/etc/idesk-probe/token</string>
  </array>
  <key>UserName</key><string>nobody</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardErrorPath</key><string>/var/log/idesk-probe.log</string>
</dict>
</plist>
EOF
  chown root:wheel "$plist"
  chmod 644 "$plist"
  launchctl bootout system/com.idesk.probe 2>/dev/null || true
  launchctl bootstrap system "$plist"
  exit 0
fi

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
