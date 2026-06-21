import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router/")
          ) {
            return "react";
          }

          if (id.includes("/recharts/")) return "charts";
          if (id.includes("/framer-motion/")) return "motion";
          if (id.includes("/lucide-react/")) return "icons";
          if (id.includes("/jspdf/")) return "pdf-jspdf";
          if (id.includes("/html2canvas/")) return "pdf-canvas";

          if (id.includes("/@radix-ui/")) return "ui";

          return "vendor";
        },
      },
    },
  },
});
