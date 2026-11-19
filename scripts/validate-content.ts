import path from 'node:path';
import { loadContentFromDisk } from './loadContent';
import { validateCourse } from '../src/content/validate';

const raw = loadContentFromDisk(path.resolve(import.meta.dirname, '..', 'content'));
const errors = validateCourse(raw);
if (errors.length) {
  console.error(`✖ ${errors.length} content error(s):`);
  for (const e of errors) console.error('  •', e);
  process.exit(1);
}
console.log(`✔ content valid: ${raw.units.length} units, ${Object.keys(raw.lessons).length} lessons`);
