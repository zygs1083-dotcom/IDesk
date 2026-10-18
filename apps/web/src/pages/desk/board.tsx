import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { labels } from "@idesk/shared/labels";
import { BOARD_COLUMNS, type TaskStatus } from "@idesk/shared/task-status";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { ColumnJump } from "../../components/column-jump.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { ActionDialog } from "./action-dialog.tsx";
import { Column } from "./column.tsx";
import { ColumnContent } from "./column-content.tsx";
import { countBlockers } from "./count-blockers.ts";
import { actionSamples, dropAction } from "./drop-action.ts";
import { dropAnimation } from "./drop-animation.ts";
import { TaskCard } from "./task-card.tsx";
import { useTaskAction } from "./use-task-action.ts";

export function Board({
  tasks,
  visible,
  handoffs,
  search,
  group,
  loading,
  onOpen,
  onPublish,
}: {
  tasks: Task[];
  visible: Task[];
  handoffs: TaskEvent[];
  search: string;
  group: "flat" | "host";
  loading: boolean;
  onOpen: (id: string) => void;
  onPublish: () => void;
}) {
  const { isAdmin } = useSession();
  const { lang, t } = useLang();
  const seen = useRef(new Set<string>());
  useEffect(() => {
    for (const task of tasks) seen.current.add(task.id);
  }, [tasks]);
  const { agents, agentName } = useAgents();
  const [dragged, setDragged] = useState<Task | null>(null);
  const [legal, setLegal] = useState<Partial<Record<TaskStatus, boolean>>>({});
  const [shake, setShake] = useState<string | null>(null);
  const [parameter, setParameter] = useState<{
    task: Task;
    action: "assign" | "handoff" | "recruit" | "complete";
  } | null>(null);
  const { mutation, error, setError } = useTaskAction(
    () => setParameter(null),
    (error, task) => {
      if ("status" in error && error.status === 409) {
        setParameter(null);
        setShake(task.id);
      }
    },
  );
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const blockers = new Map(tasks.map((task) => [task.id, countBlockers(task.blockedBy, tasks)]));
  const boardTasks = visible.filter((task) => BOARD_COLUMNS.includes(task.status));
  function handoffName(task: Task): string | undefined {
    const event = handoffs.find((event) => event.taskId === task.id);
    return event ? agentName(event.agentId) : undefined;
  }
  return (
    <>
      <ColumnJump
        options={BOARD_COLUMNS.map((status) => ({
          id: `task-column-${status}`,
          label: labels(lang).status[status],
        }))}
      />
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          const task = tasks.find((task) => task.id === active.id);
          if (!isAdmin || !task) return;
          setShake(null);
          setDragged(task);
          setLegal(
            Object.fromEntries(
              BOARD_COLUMNS.map((status) => [
                status,
                dropAction(task, status, new Date()) !== null,
              ]),
            ),
          );
        }}
        onDragCancel={() => {
          setDragged(null);
          setLegal({});
        }}
        onDragEnd={({ over }) => {
          setDragged(null);
          setLegal({});
          if (!isAdmin || !dragged || !over) return;
          const action = dropAction(dragged, over.id as TaskStatus, new Date());
          if (!action) {
            setShake(dragged.id);
            return;
          }
          setError(null);
          if (
            action === "assign" ||
            action === "handoff" ||
            action === "recruit" ||
            action === "complete"
          )
            setParameter({ task: dragged, action });
          else mutation.mutate({ task: dragged, action: actionSamples[action] });
        }}
      >
        <section
          data-ui="task-wall"
          className="relative flex min-h-0 flex-1 gap-3 overflow-x-auto pb-3"
          aria-label={t("desk.board")}
        >
          {BOARD_COLUMNS.map((status) => {
            const columnTasks = visible.filter((task) => task.status === status);
            return (
              <Column
                key={status}
                status={status}
                count={columnTasks.length}
                legal={legal[status] ?? true}
              >
                <ColumnContent
                  tasks={columnTasks}
                  blockers={blockers}
                  agents={agents}
                  group={group}
                  seen={seen.current}
                  agentName={agentName}
                  handoffName={handoffName}
                  onOpen={onOpen}
                  shake={shake}
                />
              </Column>
            );
          })}
          {!search && boardTasks.length === 0 && !loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto space-y-3 text-center">
                <p className="text-secondary text-text-2">{t("desk.empty")}</p>
                <Button disabled={!isAdmin} onClick={() => onPublish()}>
                  {t("desk.publishOne")}
                </Button>
              </div>
            </div>
          )}
          {search && boardTasks.length === 0 && !loading && (
            <p className="absolute inset-x-0 top-20 text-center text-secondary text-text-2">
              {t("desk.noMatches")}
            </p>
          )}
        </section>
        <DragOverlay dropAnimation={reduced ? null : dropAnimation}>
          {dragged && (
            <TaskCard
              task={dragged}
              blockers={blockers.get(dragged.id) as number}
              name={agentName(dragged.assigneeId ?? dragged.publisherId)}
              onOpen={() => {}}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
      <AnimatePresence>
        {isAdmin && parameter && (
          <ActionDialog
            key={`${parameter.task.id}-${parameter.action}`}
            action={parameter.action}
            agents={agents}
            pending={mutation.isPending}
            error={error}
            onDismissError={() => setError(null)}
            onClose={() => {
              setParameter(null);
              setError(null);
            }}
            onSubmit={(action) => mutation.mutate({ task: parameter.task, action })}
          />
        )}
      </AnimatePresence>
      {!parameter && <Toast message={error} onClose={() => setError(null)} />}
    </>
  );
}
