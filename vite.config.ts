import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/spacetakeGS-web/" : "/",
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    chunkSizeWarningLimit: 6000,
  },
}));
