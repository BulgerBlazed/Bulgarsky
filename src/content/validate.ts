/**
 * Schema + cross-reference validation for the whole course.
 * Pure function: used by the Vite plugin (build time), `npm run validate`, and tests.
 */
import type { z } from 'zod';
import { CourseSchema, LessonSchema, UnitSchema } from './schema.ts';
import type { Course, Exercise, Item, Lesson, Unit } from './schema.ts';

export interface RawContent {
  course: unknown;
  units: { dir: string; data: unknown }[];
  /** keyed by "<unit dir>/<lesson file name without .json>" */
  lessons: Record<string, unknown>;
}

export interface ParsedContent {
  course: Course;
  units: { dir: string; unit: Unit; lessons: Lesson[] }[];
}

function fmtZod(where: string, err: z.ZodError): string[] {
  return err.issues.map((i) => `${where}: ${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`);
}

export function parseContent(raw: RawContent): { parsed?: ParsedContent; errors: string[] } {
  const errors: string[] = [];
  const course = CourseSchema.safeParse(raw.course);
  if (!course.success) errors.push(...fmtZod('course.json', course.error));

  const units: ParsedContent['units'] = [];
  for (const { dir, data } of raw.units) {
    const u = UnitSchema.safeParse(data);
    if (!u.success) {
      errors.push(...fmtZod(`units/${dir}/unit.json`, u.error));
      continue;
    }
    const lessons: Lesson[] = [];
    for (const lessonId of u.data.lessons) {
      const key = `${dir}/${lessonId}`;
      if (!(key in raw.lessons)) {
        errors.push(`units/${dir}/unit.json: lesson "${lessonId}" has no file ${lessonId}.json`);
        continue;
      }
      const l = LessonSchema.safeParse(raw.lessons[key]);
      if (!l.success) errors.push(...fmtZod(`units/${key}.json`, l.error));
      else {
        if (l.data.id !== lessonId) errors.push(`units/${key}.json: id "${l.data.id}" must equal file name "${lessonId}"`);
        lessons.push(l.data);
      }
    }
    for (const key of Object.keys(raw.lessons)) {
      const [d, id] = key.split('/');
      if (d === dir && !u.data.lessons.includes(id)) errors.push(`units/${key}.json is not listed in unit.json "lessons"`);
    }
    units.push({ dir, unit: u.data, lessons });
  }
  if (errors.length || !course.success) return { errors };
  units.sort((a, b) => a.unit.number - b.unit.number);
  return { parsed: { course: course.data, units }, errors };
}

/** Item ids referenced by an exercise. */
export function exerciseItemIds(ex: Exercise): string[] {
  switch (ex.type) {
    case 'match':
      return ex.items;
    case 'fillBlank':
      return [];
    case 'mc':
    case 'listenPick':
    case 'letterSound':
      return [ex.item, ...(ex.options ?? [])];
    default:
      return [ex.item];
  }
}

export function crossCheck(content: ParsedContent): string[] {
  const errors: string[] = [];
  const items = new Map<string, { item: Item; unit: number }>();
  const tips = new Set<string>();
  const lessonIds = new Set<string>();

  for (const entry of content.course.units) {
    const found = content.units.find((u) => u.dir === entry.dir);
    if (entry.status === 'ready' && !found) errors.push(`course.json: unit dir "${entry.dir}" is marked ready but has no unit.json`);
    if (found && found.unit.number !== entry.number) {
      errors.push(`course.json: unit "${entry.dir}" number ${entry.number} ≠ unit.json number ${found.unit.number}`);
    }
  }
  for (const { dir, unit } of content.units) {
    if (!content.course.units.some((u) => u.dir === dir)) errors.push(`units/${dir} is not listed in course.json`);
    for (const it of unit.items) {
      if (items.has(it.id)) errors.push(`duplicate item id "${it.id}" (units/${dir})`);
      items.set(it.id, { item: it, unit: unit.number });
      if (it.accept.bg) {
        for (const a of it.accept.bg) if (/[́]/.test(a)) errors.push(`item "${it.id}": accept.bg "${a}" must not contain stress marks`);
      }
    }
    for (const t of unit.tips) {
      if (tips.has(t.id)) errors.push(`duplicate tip id "${t.id}"`);
      tips.add(t.id);
    }
  }

  for (const { dir, unit, lessons } of content.units) {
    const introduced = new Set<string>();
    let checkpointPool = 0;
    for (const lesson of lessons) {
      const where = `units/${dir}/${lesson.id}.json`;
      if (lessonIds.has(lesson.id)) errors.push(`${where}: duplicate lesson id`);
      lessonIds.add(lesson.id);
      for (const t of lesson.tips ?? []) if (!tips.has(t)) errors.push(`${where}: unknown tip "${t}"`);
      for (const id of lesson.newItems) {
        const ref = items.get(id);
        if (!ref) errors.push(`${where}: newItems references unknown item "${id}"`);
        else if (ref.unit !== unit.number) errors.push(`${where}: newItems "${id}" belongs to unit ${ref.unit}, not ${unit.number}`);
        introduced.add(id);
      }
      lesson.exercises.forEach((ex, i) => {
        const at = `${where}: exercises[${i}] (${ex.type})`;
        if (ex.type !== 'speak') checkpointPool++;
        for (const id of exerciseItemIds(ex)) {
          const ref = items.get(id);
          if (!ref) errors.push(`${at}: unknown item "${id}"`);
          else if (ref.unit > unit.number) errors.push(`${at}: item "${id}" is from a later unit (${ref.unit})`);
        }
        if ((ex.type === 'mc' || ex.type === 'listenPick' || ex.type === 'letterSound') && ex.options && !ex.options.includes(ex.item)) {
          errors.push(`${at}: options must include the answer "${ex.item}"`);
        }
        if (ex.type === 'letterSound') {
          const kinds = [ex.item, ...(ex.options ?? [])].map((id) => items.get(id)?.item.kind);
          if (kinds.some((k) => k && k !== 'letter')) errors.push(`${at}: letterSound may only use letter items`);
        }
        if (ex.type === 'fillBlank' && !ex.options.includes(ex.answer)) errors.push(`${at}: options must include answer "${ex.answer}"`);
        if (ex.type === 'wordBank') {
          const it = items.get(ex.item)?.item;
          if (it && it.bg.trim().split(/\s+/).length < 2) errors.push(`${at}: wordBank needs a multi-word item`);
        }
        if (ex.type === 'match' && new Set(ex.items).size !== ex.items.length) errors.push(`${at}: duplicate items`);
      });
    }
    for (const it of unit.items) {
      if (!introduced.has(it.id)) errors.push(`units/${dir}: item "${it.id}" is never introduced in any lesson's newItems`);
    }
    if (checkpointPool < unit.checkpoint.count) {
      errors.push(`units/${dir}: checkpoint needs ${unit.checkpoint.count} exercises but unit only has ${checkpointPool}`);
    }
  }
  return errors;
}

export function validateCourse(raw: RawContent): string[] {
  const { parsed, errors } = parseContent(raw);
  if (!parsed) return errors;
  return crossCheck(parsed);
}
