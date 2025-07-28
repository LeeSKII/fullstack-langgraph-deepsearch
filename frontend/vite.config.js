import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 获取当前文件的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy API requests to the backend server
      "/llm": {
        target: "http://127.0.0.1:8000", // Default backend address
        changeOrigin: true,
        // Optionally rewrite path if needed (e.g., remove /api prefix if backend doesn't expect it)
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
