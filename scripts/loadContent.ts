import fs from 'node:fs';
import path from 'node:path';
import type { RawContent } from '../src/content/validate.ts';

/** Reads /content from disk into the same shape the app gets from import.meta.glob. */
export function loadContentFromDisk(contentDir: string): RawContent {
  const readJson = (file: string): unknown => {
    const text = fs.readFileSync(file, 'utf8');
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON in ${path.relative(contentDir, file)}: ${(e as Error).message}`);
    }
  };
  const course = readJson(path.join(contentDir, 'course.json'));
  const units: RawContent['units'] = [];
  const lessons: RawContent['lessons'] = {};
  const unitsDir = path.join(contentDir, 'units');
  for (const dir of fs.readdirSync(unitsDir)) {
    const full = path.join(unitsDir, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.json')) continue;
      const data = readJson(path.join(full, file));
      if (file === 'unit.json') units.push({ dir, data });
      else lessons[`${dir}/${file.replace(/\.json$/, '')}`] = data;
    }
  }
  return { course, units, lessons };
}
