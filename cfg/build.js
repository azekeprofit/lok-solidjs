const { build } = require("esbuild");
const { solidPlugin } = require("esbuild-plugin-solid");

build({
  entryPoints: ["src/app.tsx"],
  bundle: true,
  outfile: "dist/bundle.js",
  minify: true,
  sourcemap: true,
  loader: {
    ".svg": "dataurl",
  },
  logLevel: "info",
  plugins: [solidPlugin()]
}).catch(() => process.exit(1));