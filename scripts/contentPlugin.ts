/**
 * Vite plugin: validates every JSON file under /content at the start of
 * `vite dev` and `vite build`. Any schema or cross-reference error fails the build.
 */
import type { Plugin } from 'vite';
import path from 'node:path';
import { loadContentFromDisk } from './loadContent.ts';
import { validateCourse } from '../src/content/validate.ts';

export function contentValidation(root: string): Plugin {
  const contentDir = path.resolve(root, 'content');
  const run = () => {
    const raw = loadContentFromDisk(contentDir);
    const errors = validateCourse(raw);
    if (errors.length) {
      const msg = `\n✖ Content validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}):\n` +
        errors.map((e) => `  • ${e}`).join('\n');
      throw new Error(msg);
    }
    return raw;
  };
  return {
    name: 'zdravei-content-validation',
    buildStart() {
      const raw = run();
      this.info?.(`content OK: ${raw.units.length} unit file(s), ${Object.keys(raw.lessons).length} lesson file(s)`);
    },
    handleHotUpdate(ctx) {
      if (ctx.file.startsWith(contentDir.replace(/\\/g, '/')) || ctx.file.startsWith(contentDir)) {
        try {
          run();
        } catch (e) {
          ctx.server.config.logger.error(String((e as Error).message));
        }
      }
    },
  };
}
