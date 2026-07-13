interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
}

/** การ์ดชั่วคราวสำหรับหน้าจอที่ยังไม่ได้ implement (ใช้ระหว่าง scaffold) */
export function PlaceholderPage({ title, phase, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
            {phase}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
        <p className="mt-6 text-xs text-slate-400">
          หน้าจอนี้ยังเป็นโครง (scaffold) — จะพัฒนาต่อในเฟสที่ระบุ
        </p>
      </div>
    </div>
  );
}
