/**
 * Runtime content access. JSON is bundled via import.meta.glob and was already
 * validated at build time, so here we only parse (cheap) and index it.
 */
import { parseContent } from './validate';
import type { RawContent } from './validate';
import type { Item, Lesson, Tip, Unit } from './schema';

const courseJson = import.meta.glob('/content/course.json', { eager: true, import: 'default' });
const unitJson = import.meta.glob('/content/units/*/unit.json', { eager: true, import: 'default' });
const lessonJson = import.meta.glob(['/content/units/*/*.json', '!/content/units/*/unit.json'], { eager: true, import: 'default' });

function build(): RawContent {
  const units = Object.entries(unitJson).map(([path, data]) => ({ dir: path.split('/')[3], data }));
  const lessons: Record<string, unknown> = {};
  for (const [path, data] of Object.entries(lessonJson)) {
    const [, , , dir, file] = path.split('/');
    lessons[`${dir}/${file.replace(/\.json$/, '')}`] = data;
  }
  return { course: Object.values(courseJson)[0], units, lessons };
}

const { parsed, errors } = parseContent(build());
if (!parsed) throw new Error('Content failed to parse:\n' + errors.join('\n'));

export const course = parsed.course;
export const units = parsed.units;

export interface LessonRef {
  lesson: Lesson;
  unit: Unit;
  index: number;
}

const itemMap = new Map<string, Item>();
const itemUnit = new Map<string, Unit>();
const tipMap = new Map<string, Tip>();
const lessonMap = new Map<string, LessonRef>();
const unitMap = new Map<string, Unit>();
/** item id → lesson that introduces it */
const itemLesson = new Map<string, string>();

for (const { unit, lessons } of units) {
  unitMap.set(unit.id, unit);
  for (const it of unit.items) {
    itemMap.set(it.id, it);
    itemUnit.set(it.id, unit);
  }
  for (const t of unit.tips) tipMap.set(t.id, t);
  lessons.forEach((lesson, index) => {
    lessonMap.set(lesson.id, { lesson, unit, index });
    for (const id of lesson.newItems) itemLesson.set(id, lesson.id);
  });
}

export const getItem = (id: string): Item => {
  const it = itemMap.get(id);
  if (!it) throw new Error(`Unknown item ${id}`);
  return it;
};
export const findItem = (id: string) => itemMap.get(id);
export const unitOfItem = (id: string) => itemUnit.get(id);
export const lessonOfItem = (id: string) => itemLesson.get(id);
export const getTip = (id: string) => tipMap.get(id);
export const getLesson = (id: string) => lessonMap.get(id);
export const getUnit = (id: string) => unitMap.get(id);
export const lessonsOf = (unitId: string) => units.find((u) => u.unit.id === unitId)?.lessons ?? [];
export const allItems = () => [...itemMap.values()];

/** Items introduced up to and including the given lesson (for distractors). */
export function itemsKnownBy(lessonId: string): Item[] {
  const ref = lessonMap.get(lessonId);
  if (!ref) return [];
  const out: Item[] = [];
  for (const { unit, lessons } of units) {
    if (unit.number > ref.unit.number) break;
    for (const l of lessons) {
      if (unit.number === ref.unit.number && lessons.indexOf(l) > ref.index) break;
      for (const id of l.newItems) out.push(getItem(id));
    }
  }
  return out;
}
