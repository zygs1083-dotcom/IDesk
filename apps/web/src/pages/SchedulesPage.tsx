import { PageHeader } from "../components/PageHeader.tsx";

export function SchedulesPage() {
  return (
    <>
      <PageHeader title="定时任务" subtitle="按 cron 定时发布任务或触发自动化（M4）" />
      <div className="flex-1 grid place-items-center text-ink-3 text-[13px]">M4 实现：cron · 发布任务模板 · 触发连接器工作流 · 执行历史</div>
    </>
  );
}
