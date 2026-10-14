const palette = ["var(--blue)", "var(--purple)", "var(--teal)", "var(--indigo)", "var(--orange)", "var(--green)"];

export function AgentAvatar({ name, size = 22, online }: { name: string; size?: number; online?: boolean }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = palette[h % palette.length];
  return (
    <span className="relative inline-grid place-items-center rounded-full text-white font-semibold shrink-0" style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }} title={name}>
      {name.slice(0, 1).toUpperCase()}
      {online !== undefined && (
        <span className="absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-surface" style={{ width: size * 0.42, height: size * 0.42, background: online ? "var(--green)" : "var(--gray)" }} />
      )}
    </span>
  );
}
