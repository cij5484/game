/** Defaults remain in data files. Stable objects let existing systems read live tuning. */
type Live<T> = T extends number
  ? number
  : T extends boolean
    ? boolean
    : T extends object
      ? { -readonly [K in keyof T]: Live<T[K]> }
      : T;
export interface BalanceField {
  id: string;
  label: string;
  group: string;
  description: string;
  apply: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}
export type Overrides = Record<string, number | boolean>;
const objects = new Map<string, { value: object; defaults: object }>();
let fields = new Map<string, BalanceField>();
let overrides: Overrides = {};
let validateGroups: (values: Overrides) => void = () => {};
const listeners = new Set<() => void>();
// Clone each branch independently: some original data deliberately shares quality tables.
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, clone(v)]),
    ) as T;
  return value;
}
export function runtimeObject<T extends object>(
  id: string,
  defaults: T,
): Live<T> {
  if (!import.meta.env.DEV) return defaults as Live<T>;
  const value = clone(defaults);
  objects.set(id, { value, defaults: clone(defaults) });
  return value as Live<T>;
}
function location(
  id: string,
  defaults = false,
): [Record<string, unknown>, string] {
  const [root, ...path] = id.split(".");
  const entry = objects.get(root!);
  if (
    !entry ||
    !path.length ||
    path.some((k) => ["__proto__", "constructor", "prototype"].includes(k))
  )
    throw Error("알 수 없는 설정입니다: " + id);
  let object: unknown = defaults ? entry.defaults : entry.value;
  for (const key of path.slice(0, -1)) {
    if (!object || typeof object !== "object" || !Object.hasOwn(object, key))
      throw Error("알 수 없는 설정입니다: " + id);
    object = (object as Record<string, unknown>)[key];
  }
  const key = path.at(-1)!;
  if (!object || typeof object !== "object" || !Object.hasOwn(object, key))
    throw Error("알 수 없는 설정입니다: " + id);
  return [object as Record<string, unknown>, key];
}
export function getValue(id: string): number | boolean {
  const [o, k] = location(id);
  return o[k] as number | boolean;
}
export function getDefault(id: string): number | boolean {
  const [o, k] = location(id, true);
  return o[k] as number | boolean;
}
export function configureFields(
  next: readonly BalanceField[],
  validator: (values: Overrides) => void = () => {},
): void {
  fields = new Map(next.map((f) => [f.id, f]));
  validateGroups = validator;
}
export function getOverrides(): Overrides {
  return { ...overrides };
}
export function setOverrides(input: unknown): void {
  if (!import.meta.env.DEV) throw Error("개발 환경에서만 변경할 수 있습니다.");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("설정은 항목과 값으로 구성된 객체여야 합니다.");
  // M12 legacy presets used one value at every ownership count. Preserve that intent.
  let entries = Object.entries(input);
  const legacy = entries.find(([id]) => id === "marineGrowth.newModWeight");
  if (legacy && fields.has("marineGrowth.newModWeight0")) {
    entries = entries.filter(([id]) => id !== legacy[0]);
    for (let count = 0; count < 4; count++) {
      const id = `marineGrowth.newModWeight${count}`;
      if (!entries.some(([key]) => key === id)) entries.push([id, legacy[1]]);
    }
  }
  const next: Overrides = {};
  for (const [id, value] of entries) {
    const field = fields.get(id);
    if (!field) throw Error("알 수 없는 설정: " + id);
    const base = getDefault(id);
    if (
      typeof value !== typeof base ||
      (typeof value !== "number" && typeof value !== "boolean")
    )
      throw Error(field.label + ": 값의 종류가 올바르지 않습니다.");
    if (
      typeof value === "number" &&
      (!Number.isFinite(value) ||
        value < (field.min ?? -Infinity) ||
        value > (field.max ?? Infinity) ||
        (field.step === 1 && !Number.isInteger(value)))
    )
      throw Error(field.label + ": 허용 범위의 숫자를 입력하세요.");
    if (value !== base) next[id] = value;
  }
  const merged: Overrides = {};
  for (const id of fields.keys()) merged[id] = next[id] ?? getDefault(id);
  validateGroups(merged);
  for (const id of new Set([...Object.keys(overrides), ...Object.keys(next)])) {
    const [o, k] = location(id);
    o[k] = next[id] ?? getDefault(id);
  }
  overrides = next;
  for (const listener of listeners) listener();
}
export function updateOverride(id: string, value: number | boolean): void {
  setOverrides({ ...overrides, [id]: value });
}
export function resetOverrides(): void {
  setOverrides({});
}
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
