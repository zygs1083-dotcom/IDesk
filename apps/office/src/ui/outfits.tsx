import { createContext, type ReactNode, useEffect, useState } from "react";
import { assignOutfits } from "../stage/outfits.ts";
import type { Agent } from "../stage/textures.ts";
import { loadCharacters, loadOutfitIndex } from "../world/characters.ts";

export const OutfitContext = createContext(new Map<string, string>());

export function Outfits({ agents, children }: { agents: Agent[]; children: ReactNode }) {
  const [outfits, setOutfits] = useState(new Map<string, string>());
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const assigned = assignOutfits(agents, await loadOutfitIndex());
      await loadCharacters(["receptionist", ...assigned.values()]);
      if (!disposed) setOutfits(new Map([...assigned, ["human", "receptionist"]]));
    })();
    return () => {
      disposed = true;
    };
  }, [agents]);
  return <OutfitContext value={outfits}>{children}</OutfitContext>;
}
