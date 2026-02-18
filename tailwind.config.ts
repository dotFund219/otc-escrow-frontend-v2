/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.55)",
      },
    },
  },
  plugins: [],
};
