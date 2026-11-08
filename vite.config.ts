import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  root: "demo",
  base: "./",
  build: { outDir: "../demo-dist", emptyOutDir: true, rolldownOptions: { input: {
    main: resolve(import.meta.dirname, "demo/index.html"),
    embedded: resolve(import.meta.dirname, "demo/embedded.html")
  } } }
});
