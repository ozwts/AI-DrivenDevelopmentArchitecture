import { reactRouter } from "@react-router/dev/vite";
import Terminal from "vite-plugin-terminal";
import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRouter(),
    Terminal({
      console: "terminal", // console.log をターミナルに転送
      output: ["terminal"], // ターミナルのみに出力（ブラウザコンソールには出さない）
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
