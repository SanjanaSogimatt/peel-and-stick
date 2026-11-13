import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", maker: "src/maker.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  banner: { js: '"use client";' },
});
