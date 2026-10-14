import { RELAY_KINDS } from "@idesk/shared/relay";
import { Segmented } from "../../components/segmented.tsx";
import { RELAY_KIND_LABEL } from "./labels.ts";

export function RelayFilters({
  recipient,
  onRecipient,
  kind,
  onKind,
  task,
  onTask,
}: {
  recipient: string;
  onRecipient: (value: string) => void;
  kind: string;
  onKind: (value: string) => void;
  task: string;
  onTask: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 whitespace-nowrap">
      <Segmented
        label="收件对象"
        value={recipient}
        onChange={onRecipient}
        options={[
          { value: "all", label: "全部" },
          { value: "agent", label: "指定" },
          { value: "capability", label: "能力" },
          { value: "broadcast", label: "全体" },
        ]}
      />
      <Segmented
        label="种类"
        value={kind}
        onChange={onKind}
        options={[
          { value: "all", label: "全部种类" },
          ...RELAY_KINDS.map((value) => ({ value, label: RELAY_KIND_LABEL[value] })),
        ]}
      />
      <Segmented
        label="关联任务"
        value={task}
        onChange={onTask}
        options={[
          { value: "all", label: "全部任务" },
          { value: "with", label: "有关联" },
          { value: "without", label: "无关联" },
        ]}
      />
    </div>
  );
}
