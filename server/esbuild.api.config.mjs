import { build } from "esbuild";

build({
  entryPoints: ["src/handler/client-side-app-handler.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/api/index.js",
  external: ["@aws-sdk/*"],
  mainFields: ["module", "main"],
  minify: true,
  sourcemap: true,
}).catch(() => process.exit(1));
