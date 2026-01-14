/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary colors (ライトベージュ系)
        primary: {
          100: "#f5f2ed", // 明るいベージュ
          200: "#f0ebe3", // メインのライトベージュ
          300: "#e6dfd4", // 中間のベージュ
          400: "#ddd4c5", // 暗めのベージュ
          500: "#c8beaa", // 濃いベージュ
          DEFAULT: "#f0ebe3",
        },
        // Secondary colors (ダークブルー)
        secondary: {
          100: "#b3c0e0", // 明るいブルー
          200: "#8099cc",
          300: "#4d73b8",
          400: "#2655a3",
          500: "#003d8f",
          600: "#001964", // メインのダークブルー
          700: "#000c3e", // より濃いダークブルー
          800: "#000740", // 最も濃いダークブルー
          DEFAULT: "#001964",
        },
        // Background colors (背景)
        background: {
          DEFAULT: "#f0ebe3", // ベージュ背景
          surface: "#FFFFFF", // 白サーフェス（カード、入力エリア用）
          container: "#f5f2ed", // 薄いベージュコンテナ
        },
        // Surface colors (カード内の階層）
        surface: {
          DEFAULT: "#FFFFFF", // 白サーフェス（カード、入力エリア用）
          secondary: "#f5f2ed", // 薄いベージュ（カード内の要素背景）
        },
        // Text colors (階層的な命名)
        text: {
          primary: "#000000", // プライマリテキスト（見出し、強調）
          secondary: "#333333", // セカンダリテキスト（本文）
          tertiary: "#7d6e5a", // ターシャリテキスト（補足、非活性）
        },
        // System colors (セマンティックトークン)
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          DEFAULT: "#4CAF50",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          DEFAULT: "#FFA726",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          DEFAULT: "#E53935",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          DEFAULT: "#29B6F6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
        },
        // Neutral colors
        neutral: {
          100: "#f3f4f6",
          200: "#e5e7eb",
          400: "#9ca3af",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        // Border
        border: {
          DEFAULT: "#CCCCCC",
          light: "#E0E0E0",
        },
      },
      fontFamily: {
        sans: [
          "Noto Sans JP",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      spacing: {
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        12: "3rem",
        16: "4rem",
        20: "5rem",
        24: "6rem",
      },
      borderRadius: {
        none: "0",
        sm: "0.125rem", // 2px - 最小の丸み
        DEFAULT: "0.25rem", // 4px - デフォルト
        md: "0.375rem", // 6px - 適度な丸み（ボタン、カードなど）
        lg: "0.5rem", // 8px - やや丸い（モーダル、大きなカードなど）
        xl: "0.75rem",
        full: "9999px", // 完全な円（アバター、バッジなど）
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};
