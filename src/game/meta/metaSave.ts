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
export type { RunSummary } from "../data/meta";

export const META_STORAGE_KEY = "horde-defense:meta:v1";
export interface MetaSave {
  version: 1;
  kind: "horde-meta";
  account: { gold: number; credits: number; rerollLevel: number };
  characters: { marine: { research: ResearchLevels } };
  progress: {
    completedRuns: number;
    stage1Cleared: boolean;
    stage1ClearCount: number;
  };
  activeRunId: string | null;
  lastSettlement: { id: string; reward: RunReward } | null;
}
export interface RunTicket {
  readonly id: string;
  readonly modifiers: Readonly<MetaModifiers>;
  readonly rerolls: number;
}
export interface RunSettlement {
  reward: RunReward;
  save: MetaSave;
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
function validateSave(value: unknown): MetaSave {
  const source = object(value);
  if (source.kind !== "horde-meta" || source.version !== 1)
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
  return {
    kind: "horde-meta",
    version: 1,
    account: {
      gold: integer(account.gold),
      credits: integer(account.credits),
      rerollLevel: integer(account.rerollLevel, rerollCosts.length),
    },
    characters: { marine: { research: levels } },
    progress: {
      completedRuns: integer(progress.completedRuns),
      stage1Cleared: progress.stage1Cleared === true,
      stage1ClearCount: integer(progress.stage1ClearCount),
    },
    activeRunId: runId(source.activeRunId),
    lastSettlement:
      receiptId && reward
        ? {
            id: receiptId,
            reward: {
              gold: integer(reward.gold),
              credits: integer(reward.credits),
            },
          }
        : null,
  };
}
const defaultSave = () => validateSave({ kind: "horde-meta", version: 1 });

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
    const modifiers = createMetaModifiers(save.characters.marine.research);
    this.persist(save);
    return Object.freeze({ id, modifiers, rerolls: save.account.rerollLevel });
  }
  settleRun(id: string, summary: RunSummary): RunSettlement {
    const save = this.read();
    if (save.lastSettlement?.id === id)
      return { reward: { ...save.lastSettlement.reward }, save };
    if (!id || save.activeRunId !== id)
      throw new Error("현재 Run이 아니거나 이미 종료된 Run입니다.");
    const reward = calculateRunReward(summary);
    save.account.gold += reward.gold;
    save.account.credits += reward.credits;
    save.progress.completedRuns++;
    if (summary.status === "cleared") {
      save.progress.stage1Cleared = true;
      save.progress.stage1ClearCount++;
    }
    save.activeRunId = null;
    save.lastSettlement = { id, reward };
    return { reward, save: this.persist(save) };
  }
  purchaseResearch(id: ResearchId): MetaSave {
    const save = this.read();
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
}
export const metaStore = new MetaStore();
