import { useEffect, useRef, useState } from "react";
import { direct } from "./director.ts";
import { useRealtime } from "./lib/use-realtime.ts";
import { sceneSchema } from "./scene/scene.ts";
import { createEditor } from "./stage/editor.ts";
import { createStage } from "./stage/stage.ts";

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<ReturnType<typeof createEditor>>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  useRealtime();
  useEffect(() => {
    let disposed = false;
    let stage: Awaited<ReturnType<typeof createStage>>;
    const start = async () => {
      const response = await fetch("/office/scene.json");
      if (!response.ok) throw new Error("场景加载失败");
      const scene = sceneSchema.parse(await response.json());
      stage = await createStage(host.current!);
      if (disposed) {
        stage.app.destroy(true, { children: true });
        return;
      }
      editor.current = createEditor(stage, scene, setEditing);
      await direct(stage, scene);
    };
    void start().catch((reason: Error) => {
      if (!disposed) setError(reason.message);
    });
    return () => {
      disposed = true;
      editor.current?.destroy();
      editor.current = null;
      stage?.app.destroy(true, { children: true });
    };
  }, []);
  return (
    <main aria-label="像素办公室">
      <div ref={host} />
      {error && <p role="alert">{error}</p>}
      {editing && (
        <button type="button" onClick={() => void editor.current!.exportJson()}>
          导出 JSON
        </button>
      )}
    </main>
  );
}
