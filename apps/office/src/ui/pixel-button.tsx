import type { ComponentProps } from "react";

type Props =
  | ({ href: string } & ComponentProps<"a">)
  | ({ href?: never } & ComponentProps<"button">);
export function PixelButton(props: Props) {
  const className = `pixel-button ${props.className ?? ""}`;
  if (props.href !== undefined) return <a {...props} className={className} />;
  return <button type="button" {...props} className={className} />;
}
