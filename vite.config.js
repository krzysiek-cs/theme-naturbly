// vite.config.js
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import shopify from "vite-plugin-shopify";
import { syncThemePlugin } from "./sync-theme";

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      shopify({
        themeRoot: "./dist",
        sourceCodeDir: "./src",
        entrypointsDir: "./noop",
        additionalEntrypoints: ["./src/modules/*/index.{ts,js,vue,ce.ts}"],
        snippetFile: "juo-tag.liquid",
        versionNumbers: true,
        ...(env.VITE_SHOPIFY_TUNNEL
          ? {
              tunnel: env.VITE_SHOPIFY_TUNNEL ?? false,
            }
          : {}),
      }),
      vue(),
      syncThemePlugin(
        [".theme", "overrides", "src/modules/*/theme/./**/*"],
        "dist"
      ),
    ],

    css: {
      devSourcemap: true,
    },

    build: {
      emptyOutDir: false,

      rollupOptions: {
        output: {
          entryFileNames: (info) => {
            if (info.facadeModuleId.includes("src/modules/")) {
              const m = info.facadeModuleId.match(/src\/modules\/([^/]+)\//);
              return `juo-${m[1]}.js`;
            }

            return "juo-[name].js";
          },
          assetFileNames: "juo-[name][extname]",
        },
      },
    },
  };
});
