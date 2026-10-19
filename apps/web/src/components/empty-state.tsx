import { cn } from "../lib/cn.ts";
import { Button } from "./button.tsx";

type Scene = "calendar" | "chair" | "plug" | "ledger" | "envelope" | "folder";
type Action = { label: string; onClick: () => void; disabled?: boolean };

function EmptyArt({ scene }: { scene: Scene }) {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="14" y="80" width="68" height="4" fill="#cbb083" />
      <rect x="22" y="84" width="52" height="2" fill="#dec9a0" />
      {scene === "calendar" && (
        <g>
          <rect x="23" y="19" width="50" height="58" fill="#3b271c" />
          <rect x="25" y="21" width="46" height="54" fill="#f4e3bb" />
          <rect x="25" y="21" width="46" height="14" fill="#45604a" />
          <rect x="32" y="15" width="5" height="14" fill="#bd824a" />
          <rect x="59" y="15" width="5" height="14" fill="#bd824a" />
          <path
            d="M32 44h8v7h-8zm12 0h8v7h-8zm12 0h8v7h-8zM32 55h8v7h-8zm12 0h8v7h-8zm12 0h8v7h-8z"
            fill="#c7ad80"
          />
          <rect x="44" y="55" width="8" height="7" fill="#bd824a" />
          <rect x="54" y="63" width="12" height="3" fill="#805033" />
        </g>
      )}
      {scene === "chair" && (
        <g>
          <rect x="17" y="17" width="39" height="43" fill="#3b271c" />
          <rect x="21" y="21" width="31" height="35" fill="#45604a" />
          <rect x="23" y="23" width="27" height="29" fill="#6d8a66" />
          <rect x="18" y="55" width="51" height="13" fill="#3b271c" />
          <rect x="22" y="56" width="43" height="9" fill="#805033" />
          <rect x="21" y="65" width="5" height="13" fill="#3b271c" />
          <rect x="61" y="65" width="5" height="13" fill="#3b271c" />
          <rect x="43" y="67" width="5" height="9" fill="#805033" />
          <rect x="32" y="76" width="27" height="4" fill="#3b271c" />
          <rect x="13" y="47" width="9" height="17" fill="#bd824a" />
        </g>
      )}
      {scene === "plug" && (
        <g>
          <rect x="32" y="32" width="31" height="34" fill="#3b271c" />
          <rect x="35" y="35" width="25" height="27" fill="#bd824a" />
          <rect x="38" y="19" width="5" height="16" fill="#805033" />
          <rect x="52" y="19" width="5" height="16" fill="#805033" />
          <rect x="42" y="62" width="12" height="8" fill="#805033" />
          <rect x="47" y="70" width="6" height="8" fill="#3b271c" />
          <rect x="51" y="75" width="19" height="5" fill="#3b271c" />
          <rect x="71" y="68" width="5" height="12" fill="#3b271c" />
          <rect x="19" y="40" width="8" height="4" fill="#6d8a66" />
          <rect x="18" y="51" width="9" height="4" fill="#6d8a66" />
        </g>
      )}
      {scene === "ledger" && (
        <g>
          <rect x="20" y="17" width="57" height="61" fill="#3b271c" />
          <rect x="25" y="20" width="49" height="55" fill="#f4e3bb" />
          <rect x="25" y="20" width="7" height="55" fill="#805033" />
          <rect x="37" y="29" width="29" height="4" fill="#45604a" />
          <rect x="37" y="41" width="31" height="2" fill="#c7ad80" />
          <rect x="37" y="50" width="31" height="2" fill="#c7ad80" />
          <rect x="37" y="59" width="31" height="2" fill="#c7ad80" />
          <rect x="18" y="27" width="9" height="4" fill="#bd824a" />
          <rect x="18" y="44" width="9" height="4" fill="#bd824a" />
          <rect x="18" y="61" width="9" height="4" fill="#bd824a" />
          <rect x="57" y="69" width="11" height="3" fill="#bd824a" />
        </g>
      )}
      {scene === "envelope" && (
        <g>
          <rect x="13" y="31" width="70" height="43" fill="#3b271c" />
          <rect x="16" y="34" width="64" height="37" fill="#f4e3bb" />
          <path d="M16 34h64L48 57z" fill="#d4b987" />
          <path d="M16 71V41l32 23 32-23v30z" fill="#ead5a8" />
          <path d="M16 71l23-19 9 7 9-7 23 19z" fill="#f4e3bb" />
          <rect x="44" y="53" width="8" height="7" fill="#45604a" />
          <rect x="46" y="55" width="4" height="3" fill="#6d8a66" />
        </g>
      )}
      {scene === "folder" && (
        <g>
          <path d="M13 28h24l7 8h39v37H13z" fill="#3b271c" />
          <path d="M16 31h20l7 8h37v31H16z" fill="#bd824a" />
          <rect x="22" y="40" width="51" height="25" fill="#f4e3bb" />
          <path d="M16 51h64l-6 22H13z" fill="#805033" />
          <path d="M19 54h57l-5 16H16z" fill="#bd824a" />
          <rect x="44" y="57" width="15" height="4" fill="#dba967" />
        </g>
      )}
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  scene,
  action,
  legacyPrimary = false,
  className,
}: {
  title: string;
  description: string;
  scene: Scene;
  action?: Action | undefined;
  legacyPrimary?: boolean;
  className?: string;
}) {
  return (
    <div
      data-ui="empty-state"
      className={cn("py-16 text-center text-secondary text-text-2", className)}
    >
      <div className="pixel-legacy">
        <p>{title}</p>
        {action && (
          <Button
            variant={legacyPrimary ? "primary" : "secondary"}
            className="mt-3"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      <div data-ui="pixel-empty-note" className="pixel-only">
        <EmptyArt scene={scene} />
        <strong>{title}</strong>
        <p>{description}</p>
        {action && (
          <Button variant="secondary" disabled={action.disabled} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
