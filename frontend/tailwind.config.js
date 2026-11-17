export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans:    ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink:     "#10231f",
        leaf:    "#0f766e",
        saffron: "#f59e0b",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
