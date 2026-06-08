/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(148, 163, 184, 0.2), 0 15px 40px -20px rgba(15, 23, 42, 0.8)",
      },
    },
  },
  plugins: [],
};
