import {
  highrollBalance,
  prototypeCores,
  prototypeRelics,
  type PrototypeCoreId,
  type PrototypeRelicDefinition,
  type PrototypeRelicId,
} from "../data/highroll";

export class PrototypeRelics {
  readonly owned = new Set<PrototypeRelicId>();
  pendingRewards = 0;
  pendingReplacement: PrototypeRelicId | null = null;
  private elites = 0;
  private choices: PrototypeRelicDefinition[] | null = null;
  private readonly random: () => number;
  constructor(random = Math.random) {
    this.random = random;
  }

  get pending() {
    return this.pendingRewards > 0;
  }

  onElite(): boolean {
    if (this.elites++ > 0 && this.random() >= highrollBalance.relicDropChance)
      return false;
    this.pendingRewards++;
    return true;
  }

  offer(): PrototypeRelicDefinition[] {
    if (!this.pending || this.pendingReplacement) return [];
    if (!this.choices) {
      const pool = Object.values(prototypeRelics).filter(
        (r) => !this.owned.has(r.id),
      );
      this.choices = [];
      while (pool.length && this.choices.length < 3) {
        this.choices.push(
          pool.splice(
            Math.min(pool.length - 1, Math.floor(this.random() * pool.length)),
            1,
          )[0]!,
        );
      }
    }
    return [...this.choices];
  }

  choose(id: PrototypeRelicId): boolean {
    if (!this.offer().some((r) => r.id === id) || this.owned.has(id))
      return false;
    if (this.owned.size >= highrollBalance.relicCapacity)
      this.pendingReplacement = id;
    else {
      this.owned.add(id);
      this.finishReward();
    }
    return true;
  }

  replace(id: PrototypeRelicId): boolean {
    if (!this.pendingReplacement || !this.owned.has(id)) return false;
    this.owned.delete(id);
    this.owned.add(this.pendingReplacement);
    this.finishReward();
    return true;
  }

  skip(): boolean {
    if (!this.pending) return false;
    this.finishReward();
    return true;
  }

  private finishReward() {
    this.pendingRewards--;
    this.pendingReplacement = null;
    this.choices = null;
  }
}

export class PrototypeCores {
  readonly owned = new Set<PrototypeCoreId>();

  tryDrop(validIds: readonly PrototypeCoreId[], random = Math.random) {
    if (this.owned.size >= highrollBalance.maxCores) return null;
    const pool = [...new Set(validIds)].filter((id) =>
      Object.hasOwn(prototypeCores, id),
    );
    if (!pool.length || random() >= highrollBalance.coreDropChance) return null;
    const id =
      pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
    this.owned.add(id);
    return prototypeCores[id];
  }
}
