import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Sarabun = ฟอนต์ไทยมีหัว อ่านง่าย ใช้เป็นฟอนต์หลักทั้งระบบ
        sans: ["Sarabun", "ui-sans-serif", "system-ui", "sans-serif"],
        // ใช้เฉพาะ wordmark ของโลโก้ KOON
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
      colors: {
        // CI โรงพยาบาล (KOON) — ดูภาพ palette
        brand: {
          50: "#f2f7f0", // Pearl — พื้นหลังอ่อน
          100: "#e3efe6",
          200: "#cfdbc8", // Greenish Grey — เส้นขอบ/มิวต์
          300: "#b9e4c9", // Mint — accent อ่อน
          400: "#8fb3a5",
          500: "#5f8479", // Medium Green — hover/รอง
          600: "#3a6560",
          700: "#033d3f", // Deep Green — สีหลัก
          800: "#032f31",
          900: "#02201f",
        },
        accent: "#f9f950", // Yellow — ไฮไลต์ (ใช้ในโลโก้/จุดเน้นเล็ก ๆ)
      },
    },
  },
  plugins: [],
} satisfies Config;
