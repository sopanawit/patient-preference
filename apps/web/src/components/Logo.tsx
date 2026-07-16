/**
 * โลโก้ KOON — วาดเป็น SVG (คมชัดทุกขนาด, เปลี่ยนสีตามพื้นหลังได้)
 * - variant "onDark"  : สำหรับพื้นหลังสีเขียวเข้ม (ใบไม้เหลือง + ตัวอักษรครีม)
 * - variant "onLight" : สำหรับพื้นหลังอ่อน (ใบไม้ + ตัวอักษรเขียวเข้ม)
 *
 * หมายเหตุ: มาร์กใบไม้วาดตาม CI ของ KOON (ช่อใบเรียวพัดออกไปทางขวา-ล่าง)
 */
type LogoVariant = "onDark" | "onLight";

// ใบเรียวปลายแหลม (ฐานที่ 0,0 ปลายที่ 0,-100) — ลอยแยกเป็นช่อ
const BLADE = "M0,0 C5,-24 4.5,-62 1,-100 C-1.5,-62 -4,-24 0,0 Z";

// ช่อใบ: มุม (องศา ตามเข็มจากแนวตั้ง) + ความยาว (k) + ระยะฐานห่างจากจุดรวม (off)
const BLADES: { a: number; k: number; off: number }[] = [
  { a: -12, k: 0.5, off: 40 }, // ใบเล็กด้านบน (ลอยแยก)
  { a: 12, k: 0.7, off: 22 },
  { a: 37, k: 0.98, off: 15 },
  { a: 60, k: 1.22, off: 11 }, // ใบยาวชี้ขวา
  { a: 84, k: 1.28, off: 9 }, // ใบยาวสุด กวาดลงขวา
  { a: 106, k: 0.95, off: 13 }, // ใบล่าง
];

function LeafMark({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <svg viewBox="16 -25 96 96" className={className} aria-hidden="true">
      <g fill={color}>
        {BLADES.map((b, i) => (
          <path
            key={i}
            d={BLADE}
            transform={`translate(36 46) rotate(${b.a}) translate(0 ${-b.off}) scale(${0.34 * b.k} ${0.48 * b.k})`}
          />
        ))}
      </g>
    </svg>
  );
}

export function Logo({
  variant = "onLight",
  className = "",
  markClass = "h-8 w-8 shrink-0",
  wordmarkClass = "text-2xl",
  showWordmark = true,
}: {
  variant?: LogoVariant;
  className?: string;
  markClass?: string;
  wordmarkClass?: string;
  showWordmark?: boolean;
}) {
  const leafColor = variant === "onDark" ? "#f9f950" : "#033d3f";
  const textColor = variant === "onDark" ? "text-brand-50" : "text-brand-700";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LeafMark color={leafColor} className={markClass} />
      {showWordmark && (
        <span
          className={`font-serif font-semibold leading-none tracking-[0.18em] ${textColor} ${wordmarkClass}`}
        >
          KOON
        </span>
      )}
    </span>
  );
}
