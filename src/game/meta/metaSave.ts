import {
  calculateRunReward,
  createMetaModifiers,
  getResearchCost,
  researchDefinitions,
  rerollCosts,
  type MetaModifiers,
  type ResearchId,
  type ResearchLevels,
  type RunReward,
  type RunSummary,
} from "../data/meta";
import {
  operationRecords,
  getMasteryPoints,
  getOperationProgress,
  getUnlocks,
  unlockLabels,
  type OperationEvidence,
  type OperationId,
  type OperationSaveSource,
  type UnlockState,
} from "../data/operations";
import type { SpecialWeaponId } from "../data/specialWeapons";
export type { RunSummary } from "../data/meta";

export const META_STORAGE_KEY = "horde-defense:meta:v1";
export interface MetaSave {
  version: 2;
  kind: "horde-meta";
  account: { gold: number; credits: number; rerollLevel: number };
  characters: OperationSaveSource["characters"];
  progress: {
    completedRuns: number;
    stage1Cleared: boolean;
    stage1ClearCount: number;
  };
  activeRunId: string | null;
  activeRunProgress: {
    evidence: OperationEvidence;
    completed: OperationId[];
    unlocked: string[];
  } | null;
  lastSettlement: {
    id: string;
    reward: RunReward;
    operations: OperationSummary;
  } | null;
}
export interface RunTicket {
  readonly id: string;
  readonly modifiers: Readonly<MetaModifiers>;
  readonly rerolls: number;
  readonly unlocks: UnlockState;
}
export interface OperationSummary {
  completed: OperationId[];
  points: number;
  unlocked: string[];
}
export interface OperationProgressResult extends OperationSummary {
  save: MetaSave;
  unlocks: UnlockState;
}
export interface RunSettlement {
  reward: RunReward;
  save: MetaSave;
  operations: OperationSummary;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

function object(value: unknown, fallback = false): Record<string, unknown> {
  if (value === undefined && fallback) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Meta Save 형식이 올바르지 않습니다.");
  return value as Record<string, unknown>;
}
function integer(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined) return 0;
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  )
    throw new Error("Meta Save 숫자 범위가 올바르지 않습니다.");
  return value;
}
function runId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^[\w-]{1,100}$/.test(value))
    throw new Error("Run ID가 올바르지 않습니다.");
  return value;
}
const scalarFields = [
  "elapsedMs",
  "characterLevel",
  "eliteKills",
  "primaryKills",
  "primaryEliteKills",
  "gaussActionHits",
  "criticalHits",
  "burstLevel",
  "basicModCount",
  "specialWeaponCount",
  "relicCount",
  "synergyCount",
  "coreCount",
  "missileRetargets",
] as const;
const booleanFields = ["bossEncountered", "highRarityChoice"] as const;
const weaponIds: SpecialWeaponId[] = ["grenade", "missile", "drone"];
function ids(value: unknown): OperationId[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((id) => !operationRecords.some((record) => record.id === id))
  )
    throw new Error("작전 기록 ID가 올바르지 않습니다.");
  return [...new Set(value)] as OperationId[];
}
function texts(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((text) => typeof text !== "string" || text.length > 200)
  )
    throw new Error("해금 기록이 올바르지 않습니다.");
  return [...new Set(value)] as string[];
}
function evidence(value: unknown): OperationEvidence {
  const source = object(value, true),
    result: OperationEvidence = {};
  for (const key of Object.keys(source))
    if (
      ![...scalarFields, ...booleanFields, "specialLevels", "overclocks"].some(
        (allowed) => allowed === key,
      )
    )
      throw new Error("알 수 없는 작전 진행값입니다.");
  for (const key of scalarFields)
    if (source[key] !== undefined) {
      const value = source[key];
      if (
        key === "elapsedMs" &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
      )
        result[key] = integer(Math.floor(value));
      else result[key] = integer(value);
    }
  for (const key of booleanFields)
    if (source[key] !== undefined) {
      if (typeof source[key] !== "boolean")
        throw new Error("작전 진행값이 올바르지 않습니다.");
      result[key] = source[key] as boolean;
    }
  if (source.specialLevels !== undefined) {
    result.specialLevels = {};
    for (const [id, level] of Object.entries(object(source.specialLevels))) {
      if (!weaponIds.includes(id as SpecialWeaponId))
        throw new Error("알 수 없는 특수무기입니다.");
      result.specialLevels[id as SpecialWeaponId] = integer(level);
    }
  }
  if (source.overclocks !== undefined) {
    if (
      !Array.isArray(source.overclocks) ||
      source.overclocks.some((id) => !weaponIds.includes(id))
    )
      throw new Error("오버클록 진행값이 올바르지 않습니다.");
    result.overclocks = [...new Set(source.overclocks)] as SpecialWeaponId[];
  }
  return result;
}
function operationSummary(value: unknown): OperationSummary {
  const source = object(value, true),
    completed = ids(source.completed);
  return {
    completed,
    points: getMasteryPoints(completed),
    unlocked: texts(source.unlocked),
  };
}
function validateSave(value: unknown): MetaSave {
  const source = object(value);
  if (
    source.kind !== "horde-meta" ||
    (source.version !== 1 && source.version !== 2)
  )
    throw new Error("지원하지 않는 Meta Save 종류 또는 버전입니다.");
  const account = object(source.account, true),
    characters = object(source.characters, true);
  const marine = object(characters.marine, true),
    research = object(marine.research, true);
  const progress = object(source.progress, true),
    levels: ResearchLevels = {};
  for (const [id, level] of Object.entries(research)) {
    if (!Object.hasOwn(researchDefinitions, id))
      throw new Error("알 수 없는 연구가 저장되어 있습니다.");
    levels[id as ResearchId] = integer(
      level,
      researchDefinitions[id as ResearchId].maxLevel,
    );
  }
  if (
    progress.stage1Cleared !== undefined &&
    typeof progress.stage1Cleared !== "boolean"
  )
    throw new Error("클리어 기록이 올바르지 않습니다.");
  const receipt =
    source.lastSettlement == null ? null : object(source.lastSettlement);
  const reward = receipt ? object(receipt.reward) : null;
  const receiptId = receipt ? runId(receipt.id) : null;
  if (receipt && !receiptId)
    throw new Error("보상 지급 기록이 올바르지 않습니다.");
  const completed =
    source.version === 1 ? [] : ids(marine.completedOperationRecords);
  // M11 historical facts can prove only these two records, not unrecorded combat actions.
  if (source.version === 1 && integer(progress.completedRuns) > 0)
    completed.push("first-operation");
  if (
    source.version === 1 &&
    (progress.stage1Cleared === true || integer(progress.stage1ClearCount) > 0)
  )
    completed.push("first-victory");
  if (marine.unlockAll !== undefined && typeof marine.unlockAll !== "boolean")
    throw new Error("개발 해금 상태가 올바르지 않습니다.");
  const activeId = runId(source.activeRunId);
  const active = activeId ? object(source.activeRunProgress ?? {}, true) : null;
  return {
    kind: "horde-meta",
    version: 2,
    account: {
      gold: integer(account.gold),
      credits: integer(account.credits),
      rerollLevel: integer(account.rerollLevel, rerollCosts.length),
    },
    characters: {
      marine: {
        research: levels,
        completedOperationRecords: completed,
        operationProgress:
          source.version === 1 ? {} : evidence(marine.operationProgress),
        ...(marine.unlockAll === undefined
          ? {}
          : { unlockAll: marine.unlockAll as boolean }),
        ...(marine.specialCapacityOverride === undefined
          ? {}
          : {
              specialCapacityOverride: integer(
                marine.specialCapacityOverride,
                2,
              ) as 0 | 1 | 2,
            }),
      },
    },
    progress: {
      completedRuns: integer(progress.completedRuns),
      stage1Cleared: progress.stage1Cleared === true,
      stage1ClearCount: integer(progress.stage1ClearCount),
    },
    activeRunId: activeId,
    activeRunProgress: active
      ? {
          evidence: evidence(active.evidence),
          completed: ids(active.completed),
          unlocked: texts(active.unlocked),
        }
      : null,
    lastSettlement:
      receiptId && reward
        ? {
            id: receiptId,
            reward: {
              gold: integer(reward.gold),
              credits: integer(reward.credits),
            },
            operations: operationSummary(receipt?.operations),
          }
        : null,
  };
}
const defaultSave = () => validateSave({ kind: "horde-meta", version: 2 });

/** Evidence is absolute within a Run; only missile retargets accumulate across Runs. */
function mergeEvidence(save: MetaSave, incoming: OperationEvidence): void {
  const active = save.activeRunProgress!,
    best = save.characters.marine.operationProgress,
    completed = save.characters.marine.completedOperationRecords;
  const pending = operationRecords.filter(
    (record) => !completed.includes(record.id),
  );
  for (const key of scalarFields) {
    if (incoming[key] === undefined) continue;
    const cap = Math.max(
      0,
      ...pending
        .filter((record) => record.metric === key)
        .map((record) => record.target),
    );
    if (!cap) continue;
    const previous =
        (key === "missileRetargets" ? active.evidence[key] : best[key]) ?? 0,
      next = Math.max(previous, Math.min(cap, incoming[key]!));
    if (next <= previous) continue;
    if (key === "missileRetargets") active.evidence[key] = next;
    best[key] =
      key === "missileRetargets"
        ? Math.min(cap, (best[key] ?? 0) + next - previous)
        : Math.max(best[key] ?? 0, next);
  }
  for (const key of booleanFields)
    if (incoming[key] && pending.some((record) => record.metric === key)) {
      best[key] = true;
    }
  for (const weapon of weaponIds) {
    const cap = Math.max(
      0,
      ...pending
        .filter(
          (record) =>
            record.metric === "specialLevels" &&
            (!record.weapon || record.weapon === weapon),
        )
        .map((record) => record.target),
    );
    const level = incoming.specialLevels?.[weapon];
    if (cap && level !== undefined) {
      const next = Math.min(cap, level);
      if (next > (best.specialLevels?.[weapon] ?? 0)) {
        best.specialLevels ??= {};
        best.specialLevels[weapon] = next;
      }
    }
    if (
      incoming.overclocks?.includes(weapon) &&
      pending.some(
        (record) => record.metric === "overclocks" && record.weapon === weapon,
      )
    ) {
      best.overclocks ??= [];
      if (!best.overclocks.includes(weapon)) best.overclocks.push(weapon);
    }
  }
}
function completeEligible(
  save: MetaSave,
  naturalEnd = false,
): OperationSummary {
  const before = unlockLabels(getUnlocks(save)),
    marine = save.characters.marine;
  const completed = operationRecords
    .filter(
      (record) =>
        (naturalEnd ||
          (record.metric !== "completedRuns" &&
            record.metric !== "stage1ClearCount")) &&
        !marine.completedOperationRecords.includes(record.id) &&
        getOperationProgress(record, save) >= record.target,
    )
    .map((record) => record.id);
  marine.completedOperationRecords = [
    ...marine.completedOperationRecords,
    ...completed,
  ];
  const unlocked = Object.entries(unlockLabels(getUnlocks(save)))
    .filter(([id]) => !(id in before))
    .map(([, label]) => label);
  if (save.activeRunProgress) {
    save.activeRunProgress.completed.push(...completed);
    save.activeRunProgress.unlocked = [
      ...new Set([...save.activeRunProgress.unlocked, ...unlocked]),
    ];
  }
  return { completed, points: getMasteryPoints(completed), unlocked };
}

/** One active Run per browser account. Starting another abandons the earlier Run without a reward. */
// ponytail: synchronous localStorage assumes one active game tab; use transactional storage if concurrent tabs become supported.
export class MetaStore {
  private readonly suppliedStorage: StorageAccess | undefined;
  constructor(storage?: StorageAccess) {
    this.suppliedStorage = storage;
  }
  private get storage(): StorageAccess {
    return this.suppliedStorage ?? globalThis.localStorage;
  }
  read(): MetaSave {
    const text = this.storage.getItem(META_STORAGE_KEY);
    // Never replace a corrupt or unsupported save until explicit reset/import.
    return text === null ? defaultSave() : validateSave(JSON.parse(text));
  }
  private persist(save: MetaSave): MetaSave {
    const validated = validateSave(save);
    this.storage.setItem(META_STORAGE_KEY, JSON.stringify(validated));
    return validated;
  }
  beginRun(): RunTicket {
    const save = this.read();
    // getRandomValues also works on HTTP LAN playtests, where randomUUID is unavailable.
    const id = [...crypto.getRandomValues(new Uint32Array(4))]
      .map((part) => part.toString(16).padStart(8, "0"))
      .join("");
    save.activeRunId = id;
    save.activeRunProgress = { evidence: {}, completed: [], unlocked: [] };
    const modifiers = createMetaModifiers(save.characters.marine.research);
    this.persist(save);
    return Object.freeze({
      id,
      modifiers,
      rerolls: save.account.rerollLevel,
      unlocks: getUnlocks(save),
    });
  }
  recordProgress(
    id: string,
    incoming: OperationEvidence,
  ): OperationProgressResult {
    const save = this.read();
    if (!id || save.activeRunId !== id || !save.activeRunProgress)
      throw new Error("현재 Run의 작전 진행만 저장할 수 있습니다.");
    const before = JSON.stringify(save);
    mergeEvidence(save, evidence(incoming));
    const result = completeEligible(save);
    const saved = JSON.stringify(save) === before ? save : this.persist(save);
    return { ...result, save: saved, unlocks: getUnlocks(saved) };
  }
  settleRun(
    id: string,
    summary: RunSummary,
    incoming?: OperationEvidence,
  ): RunSettlement {
    const save = this.read();
    if (save.lastSettlement?.id === id)
      return {
        reward: { ...save.lastSettlement.reward },
        operations: save.lastSettlement.operations,
        save,
      };
    if (!id || save.activeRunId !== id)
      throw new Error("현재 Run이 아니거나 이미 종료된 Run입니다.");
    const reward = calculateRunReward(summary);
    mergeEvidence(
      save,
      evidence({
        ...incoming,
        elapsedMs: Math.max(incoming?.elapsedMs ?? 0, summary.elapsedMs),
        eliteKills: Math.max(incoming?.eliteKills ?? 0, summary.eliteKills),
      }),
    );
    save.account.gold += reward.gold;
    save.account.credits += reward.credits;
    save.progress.completedRuns++;
    if (summary.status === "cleared") {
      save.progress.stage1Cleared = true;
      save.progress.stage1ClearCount++;
    }
    completeEligible(save, true);
    const operations = {
      completed: [...save.activeRunProgress!.completed],
      points: getMasteryPoints(save.activeRunProgress!.completed),
      unlocked: [...save.activeRunProgress!.unlocked],
    };
    save.activeRunId = null;
    save.activeRunProgress = null;
    save.lastSettlement = { id, reward, operations };
    return { reward, operations, save: this.persist(save) };
  }
  purchaseResearch(id: ResearchId): MetaSave {
    const save = this.read();
    if (!getUnlocks(save).research.includes(id))
      throw new Error("아직 해금되지 않은 연구입니다.");
    const level = save.characters.marine.research[id] ?? 0;
    const cost = getResearchCost(id, level);
    if (cost === null) throw new Error("이미 MAX 연구입니다.");
    if (save.account.gold < cost) throw new Error("Gold가 부족합니다.");
    save.account.gold -= cost;
    save.characters.marine.research[id] = level + 1;
    return this.persist(save);
  }
  purchaseReroll(): MetaSave {
    const save = this.read();
    const cost = rerollCosts[save.account.rerollLevel];
    if (cost === undefined) throw new Error("새로고침은 이미 MAX입니다.");
    if (save.account.credits < cost) throw new Error("Credits가 부족합니다.");
    save.account.credits -= cost;
    save.account.rerollLevel++;
    return this.persist(save);
  }
  exportSave(): string {
    return JSON.stringify(this.read(), null, 2);
  }
  importSave(text: string): MetaSave {
    const save = validateSave(JSON.parse(text));
    save.activeRunId = null;
    save.activeRunProgress = null;
    save.lastSettlement = null;
    return this.persist(save);
  }
  reset(): MetaSave {
    return this.persist(defaultSave());
  }
  grantDevCurrencies(gold: number, credits: number): MetaSave {
    if (!import.meta.env.DEV)
      throw new Error("개발 빌드에서만 사용할 수 있습니다.");
    const save = this.read();
    save.account.gold += integer(gold);
    save.account.credits += integer(credits);
    return this.persist(save);
  }
  private requireDevelopment() {
    if (!import.meta.env.DEV)
      throw new Error("개발 빌드에서만 사용할 수 있습니다.");
  }
  completeRecord(id: OperationId): MetaSave {
    this.requireDevelopment();
    const save = this.read();
    ids([id]);
    const marine = save.characters.marine;
    if (!marine.completedOperationRecords.includes(id))
      marine.completedOperationRecords = [
        ...marine.completedOperationRecords,
        id,
      ];
    return this.persist(save);
  }
  unlockAll(): MetaSave {
    this.requireDevelopment();
    const save = this.read();
    save.characters.marine.unlockAll = true;
    delete save.characters.marine.specialCapacityOverride;
    return this.persist(save);
  }
  resetProgression(): MetaSave {
    this.requireDevelopment();
    const save = this.read();
    save.characters.marine = {
      research: save.characters.marine.research,
      completedOperationRecords: [],
      operationProgress: {},
    };
    save.progress = {
      completedRuns: 0,
      stage1Cleared: false,
      stage1ClearCount: 0,
    };
    save.activeRunId = null;
    save.activeRunProgress = null;
    save.lastSettlement = null;
    return this.persist(save);
  }
  setSpecialCapacity(capacity: 0 | 1 | 2): MetaSave {
    this.requireDevelopment();
    integer(capacity, 2);
    const save = this.read();
    save.characters.marine.specialCapacityOverride = capacity;
    return this.persist(save);
  }
}
export const metaStore = new MetaStore();
