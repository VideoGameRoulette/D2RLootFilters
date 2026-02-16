import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      colors: {
        d2: {
          normal: "rgb(255, 255, 255)",
          grey: "rgb(105, 105, 105)",
          magic: "rgb(105, 105, 255)",
          rare: "rgb(255, 255, 100)",
          set: "rgb(0, 128, 0)",
          unique: "rgb(199, 179, 119)",
          crafted: "rgb(255, 168, 0)",
          quest: "rgb(255, 77, 77)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
