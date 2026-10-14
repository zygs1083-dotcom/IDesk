import { AccessRow } from "./access-row.tsx";

export function AccessPage() {
  const origin = location.origin;
  return (
    <section className="space-y-4" aria-label="接入信息">
      <h2 className="text-section">接入信息</h2>
      <div className="rounded-panel border border-line bg-surface">
        <AccessRow title="REST 基址" value={`${origin}/api/v1`} />
        <AccessRow
          title="MCP 地址"
          value={`${origin}/mcp`}
          description="Streamable HTTP，Authorization: Bearer <key>"
        />
        <AccessRow
          title="CLI 登录"
          value={`idesk login --url ${origin} --key <新建智能体时拿到的 key>`}
        />
        <AccessRow
          title="Webhook 签名"
          value="X-IDesk-Signature: sha256=HMAC(sha256(key), body)"
          description="用智能体 key 的 sha256 十六进制作为 HMAC 密钥，对原始请求体计算"
        />
      </div>
    </section>
  );
}
