/**
 * โลโก้ KOON — วาดเป็น SVG (คมชัดทุกขนาด, เปลี่ยนสีตามพื้นหลังได้)
 * - variant "onDark"  : สำหรับพื้นหลังสีเขียวเข้ม (ใบไม้เหลือง + ตัวอักษรครีม)
 * - variant "onLight" : สำหรับพื้นหลังอ่อน (ใบไม้ + ตัวอักษรเขียวเข้ม)
 */
type LogoVariant = "onDark" | "onLight";

function LeafMark({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  // ใบไม้ 5 ใบ เรียงพัดจากล่างขึ้นบน-ขวา (คล้ายรวงข้าว)
  const leaf = "M0,0 C5,-15 5,-33 0,-46 C-5,-33 -5,-15 0,0 Z";
  const blades = [
    { r: -8, s: 0.78 },
    { r: 8, s: 1.0 },
    { r: 24, s: 0.98 },
    { r: 42, s: 0.84 },
    { r: 60, s: 0.64 },
  ];
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g transform="translate(29 56)" fill={color}>
        {blades.map((b, i) => (
          <path key={i} d={leaf} transform={`rotate(${b.r}) scale(1 ${b.s})`} />
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
