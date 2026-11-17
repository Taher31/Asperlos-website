import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let bundle;
export function browserEditor() {
  bundle ??= build({
    entryPoints: [fileURLToPath(new URL('./editor.mjs', import.meta.url))],
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    write: false,
  }).then(({ outputFiles }) => outputFiles[0].contents).catch((error) => {
    bundle = undefined;
    throw error;
  });
  return bundle;
}
