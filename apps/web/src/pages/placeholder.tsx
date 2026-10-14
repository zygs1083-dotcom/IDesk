export function Placeholder({ title }: { title: string }) {
  return (
    <div className="px-6 py-5">
      <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{title}</h1>
    </div>
  );
}
