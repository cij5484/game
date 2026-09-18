import { balanceFields } from "./balanceFields";
import {
  configureFields,
  getDefault,
  getOverrides,
  setOverrides,
  subscribe,
  type Overrides,
} from "./runtimeBalance";
export const balanceStorageKey = "game.prototype.balance.v1";
const channelName = "game.prototype.balance.v1";
export interface GameStatus {
  connected: boolean;
  speed: number;
  level: number;
  appliedOverrides?: number;
  performance?: {
    fps: number;
    enemies: number;
    specialUnits: number;
    combatVfx: number;
    substeps: number;
  };
}
function readPerformance(value: unknown): GameStatus["performance"] {
  if (!value || typeof value !== "object") return;
  const data = value as Record<string, unknown>;
  if (
    typeof data.fps !== "number" ||
    !Number.isFinite(data.fps) ||
    data.fps < 0 ||
    ["enemies", "specialUnits", "combatVfx", "substeps"].some(
      (key) =>
        typeof data[key] !== "number" ||
        !Number.isSafeInteger(data[key]) ||
        data[key] < 0,
    )
  )
    return;
  return {
    fps: data.fps,
    enemies: data.enemies as number,
    specialUnits: data.specialUnits as number,
    combatVfx: data.combatVfx as number,
    substeps: data.substeps as number,
  };
}
export function validateBalanceGroups(values: Overrides): void {
  const n = (id: string) => Number(values[id] ?? getDefault(id));
  for (let i = 0; i < 4; i++) {
    if (
      !balanceFields.some((f) => f.id === `marineRarity.bands.${i}.weights.0`)
    )
      continue;
    if (
      Math.abs(
        [0, 1, 2, 3].reduce(
          (sum, j) => sum + n(`marineRarity.bands.${i}.weights.${j}`),
          0,
        ) - 1000,
      ) > 1e-6
    )
      throw Error(`희귀도 ${i + 1}구간의 합계는 1000‰(100%)여야 합니다.`);
  }
  for (let i = 0; i < 11; i++) {
    const prefix = `horde.stages.${i}.enemyWeights`;
    if (!balanceFields.some((f) => f.id === prefix + ".grunt")) continue;
    if (
      ["grunt", "runner", "shield"].reduce(
        (sum, k) => sum + n(prefix + "." + k),
        0,
      ) <= 0
    )
      throw Error("각 생성 구간의 적 비율 중 하나 이상은 0보다 커야 합니다.");
  }
  for (let i = 0; i < 5; i++) {
    if (!balanceFields.some((f) => f.id === `elite.windows.${i}.0`)) continue;
    if (n(`elite.windows.${i}.0`) > n(`elite.windows.${i}.1`))
      throw Error("정예 등장 시작 시간은 종료 시간보다 늦을 수 없습니다.");
  }
  if (
    n("marineMods.burstAdditionalRoundDamageFactor") >
    n("marineMods.burstAdditionalRoundDamageMax")
  )
    throw Error("점사 추가탄 기본 피해율은 상한보다 클 수 없습니다.");
  if (n("boss.warningMs") > n("boss.spawnMs"))
    throw Error("Boss 전 공급 완화는 Boss 등장보다 먼저 시작해야 합니다.");
}
export function initializeBalance(): void {
  configureFields(balanceFields, validateBalanceGroups);
  try {
    const raw = localStorage.getItem(balanceStorageKey);
    if (raw) loadPayload(JSON.parse(raw));
  } catch (error) {
    console.warn("저장된 개발 설정을 적용하지 않았습니다.", String(error));
  }
}
export function loadPayload(value: unknown): void {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { version?: unknown }).version !== 1
  )
    throw Error("지원하지 않는 밸런스 설정 버전입니다.");
  setOverrides((value as { overrides?: unknown }).overrides);
}
export function startBalanceBridge(
  role: "game" | "panel",
  onStatus?: (status: GameStatus) => void,
  readStatus: () => Omit<
    GameStatus,
    "connected" | "appliedOverrides"
  > = () => ({
    speed: 1,
    level: 1,
  }),
): () => void {
  if (!import.meta.env.DEV) return () => {};
  const channel = new BroadcastChannel(channelName);
  let receiving = false,
    lastSeen = 0,
    status: GameStatus = { connected: false, speed: 1, level: 1 };
  const publishStatus = () =>
    channel.postMessage({
      type: "status",
      ...readStatus(),
      appliedOverrides: Object.keys(getOverrides()).length,
    });
  const receive = (payload: unknown) => {
    try {
      receiving = true;
      loadPayload(payload);
    } catch (error) {
      console.warn("잘못된 개발 설정 메시지를 무시했습니다.", String(error));
    } finally {
      receiving = false;
    }
  };
  const unsubscribe = subscribe(() => {
    const payload = { version: 1, overrides: getOverrides() };
    try {
      if (Object.keys(payload.overrides).length)
        localStorage.setItem(balanceStorageKey, JSON.stringify(payload));
      else localStorage.removeItem(balanceStorageKey);
    } catch {
      console.warn("개발 설정을 브라우저에 저장하지 못했습니다.");
    }
    if (!receiving) channel.postMessage({ type: "balance", payload });
    if (role === "game") publishStatus();
  });
  channel.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (!data || typeof data !== "object") return;
    const message = data as Record<string, unknown>;
    if (message.type === "balance") receive(message.payload);
    if (message.type === "ping" && role === "game") publishStatus();
    if (
      message.type === "status" &&
      role === "panel" &&
      [1, 2, 4].includes(Number(message.speed)) &&
      typeof message.level === "number"
    ) {
      lastSeen = Date.now();
      status = {
        connected: true,
        speed: Number(message.speed),
        level: message.level,
        appliedOverrides: Number(message.appliedOverrides) || 0,
      };
      const performance = readPerformance(message.performance);
      if (performance) status.performance = performance;
      onStatus?.(status);
    }
  };
  const tick = () => {
    if (role === "game") publishStatus();
    else {
      channel.postMessage({ type: "ping" });
      if (Date.now() - lastSeen > 5000)
        onStatus?.({ ...status, connected: false });
    }
  };
  const timer = window.setInterval(tick, 1000);
  tick();
  return () => {
    window.clearInterval(timer);
    unsubscribe();
    channel.close();
  };
}
