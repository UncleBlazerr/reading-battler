import { defineConfig } from "vite";

// base is "./" so the build also works when served from a GitHub Pages
// subpath later (deferred for iteration 1, but costs nothing to set now).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
  },
});
