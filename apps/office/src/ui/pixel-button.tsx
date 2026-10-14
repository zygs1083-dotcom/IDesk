import type { ComponentProps } from "react";

type Props =
  | ({ href: string } & ComponentProps<"a">)
  | ({ href?: never } & ComponentProps<"button">);
export function PixelButton(props: Props) {
  if (props.href !== undefined) return <a {...props} className="pixel-button" />;
  return <button type="button" {...props} className="pixel-button" />;
}
