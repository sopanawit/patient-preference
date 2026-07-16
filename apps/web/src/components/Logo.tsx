/**
 * โลโก้ KOON — วาดเป็น SVG (คมชัดทุกขนาด, เปลี่ยนสีตามพื้นหลังได้)
 * - variant "onDark"  : สำหรับพื้นหลังสีเขียวเข้ม (ใบไม้เหลือง + ตัวอักษรครีม)
 * - variant "onLight" : สำหรับพื้นหลังอ่อน (ใบไม้ + ตัวอักษรเขียวเข้ม)
 *
 * หมายเหตุ: มาร์กใบไม้วาดตาม CI ของ KOON (ช่อใบเรียวพัดออกไปทางขวา-ล่าง)
 */
type LogoVariant = "onDark" | "onLight";

// ใบเรียวปลายแหลม (ฐาน 0,0 ปลาย 0,-100) — แบบตรง / แบบโค้งกวาด
const STRAIGHT = "M0,0 C8,-24 7,-62 1.5,-100 C-5.5,-62 -7.5,-24 0,0 Z";
const CURVED = "M0,0 C11,-30 10,-70 3,-100 C-3,-66 -8,-26 0,0 Z";

// ช่อใบ: มุม (องศา ตามเข็มจากแนวตั้ง) + ความยาว (k) + ระยะฐานห่างจากจุดรวม (off) + โค้ง (c)
const BLADES: { a: number; k: number; off: number; c?: boolean }[] = [
  { a: 20, k: 0.5, off: 40 }, // ใบเล็กด้านบน (ลอยแยก)
  { a: 48, k: 0.72, off: 22 }, // บน-ขวา
  { a: 76, k: 0.95, off: 15 }, // เกือบแนวนอน ชี้ขวา
  { a: 104, k: 1.14, off: 11, c: true }, // ขวา-ล่าง
  { a: 150, k: 1.34, off: 8, c: true }, // ใบยาวสุด กวาดลง
  { a: 176, k: 1.02, off: 11, c: true }, // ใบล่าง
];

function LeafMark({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <svg viewBox="4.5 -26.4 142.7 142.7" className={className} aria-hidden="true">
      <g fill={color}>
        {BLADES.map((b, i) => (
          <path
            key={i}
            d={b.c ? CURVED : STRAIGHT}
            transform={`translate(44 42) rotate(${b.a}) translate(0 ${-b.off}) scale(${0.42 * b.k} ${0.5 * b.k})`}
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
