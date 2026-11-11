// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

function flattenCssLayers(css: string) {
  let output = css;
  while (true) {
    const start = output.indexOf("@layer");
    if (start === -1) return output;

    const open = output.indexOf("{", start);
    const semicolon = output.indexOf(";", start);
    if (semicolon !== -1 && (open === -1 || semicolon < open)) {
      output = output.slice(0, start) + output.slice(semicolon + 1);
      continue;
    }
    if (open === -1) return output;

    let depth = 1;
    let quote = "";
    let comment = false;
    let end = open + 1;
    for (; end < output.length && depth > 0; end++) {
      const char = output[end]!;
      const next = output[end + 1];
      if (comment) {
        if (char === "*" && next === "/") { comment = false; end++; }
      } else if (quote) {
        if (char === "\\") end++;
        else if (char === quote) quote = "";
      } else if (char === "\\") {
        end++;
      } else if (char === "/" && next === "*") {
        comment = true;
        end++;
      } else if (char === "\"" || char === "'") {
        quote = char;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      }
    }
    if (depth !== 0) return output;
    output = output.slice(0, start) + output.slice(open + 1, end - 1) + output.slice(end);
  }
}

const flattenLegacyCssLayers: import("vite").Plugin = {
  name: "flatten-css-layers-for-legacy-mobile",
  apply: "build",
  generateBundle(_options, bundle) {
    for (const asset of Object.values(bundle)) {
      if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue;
      const css = typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source);
      asset.source = flattenCssLayers(css);
    }
  },
};

export default defineConfig({
  vite: {
    plugins: [flattenLegacyCssLayers],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
