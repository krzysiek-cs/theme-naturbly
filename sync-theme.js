import chokidar from "chokidar";
import { minimatch } from "minimatch";
import fs from "fs-extra";
import path from "path";
import assert from "assert";

export function syncThemePlugin(patterns, destPath, debug = false) {
  let config = null;

  async function sync(config, watch = false) {
    const rootDir = config.root;
    const destDir =
      destPath == null ? config.build.outDir : path.join(rootDir, destPath);

    function copyFile(srcPath, destPath) {
      const src = path.resolve(srcPath);
      const dest = path.join(destDir, destPath);
      assert(src.startsWith(rootDir));
      assert(dest.startsWith(destDir));

      fs.copySync(src, dest, { preserveTimestamps: true });
    }

    function removeFile(destPath) {
      const src = path.resolve(destPath);
      const dest = path.join(destDir, destPath);
      assert(src.startsWith(rootDir));
      assert(dest.startsWith(destDir));

      fs.removeSync(dest);
    }

    async function createWatcher(pattern) {
      const watcher = await new Promise((resolve) => {
        const root = pattern.split("/./")[0];
        const rootRe = new RegExp(
          minimatch.makeRe(`${root}/`).source.replace(/\$$/, "")
        );

        const watcher = chokidar.watch(pattern, {
          persistent: true,
        });

        watcher
          .on("add", (path) => {
            debug && config.logger.info(`File added: ${path}`);
            copyFile(path, path.replace(rootRe, ""));
          })
          .on("change", (path) => {
            debug && config.logger.info(`File updated: ${path}`);
            copyFile(path, path.replace(rootRe, ""));
          })
          .on("unlink", (path) => {
            debug && config.logger.info(`File removed: ${path}`);
            removeFile(path.replace(rootRe, ""));
          });

        watcher.on("ready", () => {
          resolve(watcher);
        });
      });

      return watcher;
    }

    for (const pattern of patterns) {
      await createWatcher(pattern).then((watcher) => watch || watcher.close());
    }
  }

  return {
    name: "sync-theme",

    configResolved(resolved) {
      config = resolved;
    },

    async generateBundle() {
      config.logger.info("Copying theme files");
      await sync(config, false);
    },

    async configureServer() {
      config.logger.info("Setting theme sync");
      await sync(config, true);
    },
  };
}
