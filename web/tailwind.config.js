/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Ntina brand palette — carried over from the earlier Ntina.ai design
        terracotta: {
          DEFAULT: "#C4633A",
          light: "#E8885A",
          dark: "#9C4A28",
        },
        forest: {
          DEFAULT: "#2D5A27",
          light: "#4A8A42",
          dark: "#1A3A16",
        },
        gold: {
          DEFAULT: "#D4A017",
          light: "#F0C030",
          dark: "#A07810",
        },
        cream: "#FAF7F2",
      },
      fontSize: {
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
      },
    },
  },
  plugins: [],
}
