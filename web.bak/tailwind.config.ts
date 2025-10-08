import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
    content: [
        "./app/**/*.{ts,tsx,js,jsx,mdx}",
        "./components/**/*.{ts,tsx,js,jsx,mdx}",
        "./content/**/*.{md,mdx}",
        "./mdx-components.tsx",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
            },
            boxShadow: {
                glow: "0 25px 50px -12px rgba(56, 189, 248, 0.45)",
            },
            colors: {
                slate: {
                    950: "#020617",
                },
            },
        },
    },
    plugins: [typography],
} satisfies Config;
