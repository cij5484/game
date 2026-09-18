import {
  getResearchCost,
  getResearchEffect,
  researchDefinitions,
  rerollCosts,
} from "../data/meta";
import { metaStore } from "../meta/metaSave";
import {
  operationRecords,
  getMasteryPoints,
  getOperationProgress,
  getUnlocks,
  allUnlocks,
  unlockLabels,
  unlockRequirements,
  type OperationRecord,
} from "../data/operations";
import "./metaHub.css";

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
) => {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
};
const formatEffect = (value: number, unit: string, reduction = false) =>
  `${reduction ? "−" : "+"}${Number((value * (unit === "multiplier" ? 1 : 100)).toFixed(2))}${unit === "multiplier" ? "배" : unit === "percentage-points" ? "%p" : "%"}`;
const formatProgress = (record: OperationRecord, value: number) =>
  record.metric === "elapsedMs"
    ? `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, "0")}`
    : String(value);

export function mountMetaHub(
  parent: HTMLElement,
  onLaunch: () => void | Promise<void>,
  initialError = "",
): () => void {
  const root = element("main", "", "meta-hub");
  const header = element("header");
  const wallet = element("p", "", "meta-wallet");
  wallet.id = "meta-wallet";
  const progress = element("p", "", "meta-secondary");
  const notice = element("p", initialError, "meta-notice");
  notice.id = "meta-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.dataset.error = String(!!initialError);
  let busy = false,
    disposed = false;
  const report = (message: string, error = false) => {
    notice.textContent = message;
    notice.dataset.error = String(error);
  };
  const button = (label: string, action: () => void | Promise<void>) => {
    const control = element("button", label);
    control.type = "button";
    control.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      refresh();
      try {
        await action();
      } catch (error) {
        report(error instanceof Error ? error.message : String(error), true);
      } finally {
        busy = false;
        if (!disposed) refresh();
      }
    });
    return control;
  };
  const launch = button("출격", onLaunch);
  launch.id = "meta-launch";
  launch.className = "meta-launch";
  header.append(
    element("p", "STAGE 1 · META PROTOTYPE", "meta-eyebrow"),
    element("h1", "Marine"),
    wallet,
    progress,
    launch,
  );

  const records = element("details", "", "meta-section");
  const mastery = element("p", "", "meta-wallet");
  mastery.id = "meta-mastery";
  records.append(
    element("summary", "작전 기록"),
    mastery,
    element(
      "p",
      "조건을 달성하면 기록·숙련 Point·해금 보상이 자동 저장됩니다.",
    ),
  );
  const recordGroups = new Map<string, HTMLDetailsElement>();
  const recordRows = operationRecords.map((record) => {
    let group = recordGroups.get(record.category);
    if (!group) {
      group = element("details", "", "meta-record-group");
      group.append(element("summary", record.category));
      recordGroups.set(record.category, group);
      records.append(group);
    }
    const row = element("article", "", "meta-research-row");
    const state = element("p");
    state.id = `meta-record-${record.id}`;
    row.append(
      element("h3", record.title),
      element("p", record.description, "meta-secondary"),
      state,
      element(
        "p",
        `숙련 +${record.points}${record.rewards.length ? ` · 직접 해금: ${record.rewards.join(" · ")}` : ""}`,
        "meta-secondary",
      ),
    );
    group.append(row);
    return { record, state };
  });
  const unlockOverview = element("details", "", "meta-section");
  unlockOverview.append(element("summary", "무장 / 해금 현황"));
  const capacity = element("p");
  capacity.id = "meta-special-capacity";
  unlockOverview.append(capacity);
  const unlockGroups = new Map<string, HTMLElement>();
  const groupNames: Record<string, string> = {
    mod: "기본무기 개조",
    weapon: "특수무기",
    slot: "특수 슬롯",
    relic: "유물",
    system: "시스템",
    tree: "특수무기 Main Tree",
    overclock: "특수무기 Overclock",
    research: "영구 연구",
  };
  const unlockRows = Object.entries(unlockLabels(allUnlocks())).map(
    ([key, title]) => {
      const category = key.split("/")[0]!;
      let group = unlockGroups.get(category);
      if (!group) {
        group = element("section", "", "meta-research-group");
        group.append(element("h2", groupNames[category] ?? "콘텐츠"));
        unlockGroups.set(category, group);
        unlockOverview.append(group);
      }
      const row = element("p");
      row.id = `meta-unlock-${key.replaceAll("/", "-")}`;
      group.append(row);
      return { key, title, row };
    },
  );

  const research = element("details", "", "meta-section");
  research.open = true;
  research.append(
    element("summary", "영구 연구"),
    element("p", "구매한 연구와 새로고침 횟수는 다음 출격부터 적용됩니다."),
  );
  const groups = new Map<string, HTMLElement>();
  const rows = Object.values(researchDefinitions).map((definition) => {
    let group = groups.get(definition.category);
    if (!group) {
      group = element("section", "", "meta-research-group");
      group.append(element("h2", definition.category));
      groups.set(definition.category, group);
      research.append(group);
    }
    const row = element("article", "", "meta-research-row");
    const current = element("p");
    current.id = `meta-current-${definition.id}`;
    const next = element("p", "", "meta-secondary");
    next.id = `meta-next-${definition.id}`;
    const buy = button("연구", () => {
      metaStore.purchaseResearch(definition.id);
      report(
        `${definition.title} 연구를 저장했습니다. 다음 출격부터 적용됩니다.`,
      );
    });
    buy.id = `meta-buy-${definition.id}`;
    const title = element("h3", definition.title);
    row.append(title, current, next, buy);
    group.append(row);
    return { definition, current, next, buy };
  });
  const reroll = element("section", "", "meta-research-group");
  const rerollState = element("p");
  rerollState.id = "meta-reroll";
  const rerollBuy = button("새로고침 연구", () => {
    metaStore.purchaseReroll();
    report("새로고침 연구를 저장했습니다. 다음 출격부터 횟수가 늘어납니다.");
  });
  rerollBuy.id = "meta-buy-reroll";
  reroll.append(
    element("h2", "Credits · 새로고침"),
    element(
      "p",
      "일반 레벨업 카드만 다시 뽑습니다. 기본 0회, I / II / III 연구로 Run마다 1 / 2 / 3회를 사용할 수 있습니다.",
    ),
    rerollState,
    rerollBuy,
  );
  research.append(reroll);

  const storage = element("details", "", "meta-section");
  storage.append(
    element("summary", "저장 관리"),
    element(
      "p",
      "이 브라우저의 영구 진행입니다. 개발 밸런스 JSON과 다른 저장 파일입니다.",
    ),
  );
  const jsonLabel = element("label", "메타 저장 JSON");
  jsonLabel.htmlFor = "meta-save-json";
  const json = element("textarea");
  json.id = jsonLabel.htmlFor;
  json.rows = 8;
  json.spellcheck = false;
  const exportButton = button("저장 내보내기", () => {
    json.value = metaStore.exportSave();
    report("메타 저장 JSON을 준비했습니다. 복사하여 안전한 곳에 보관하세요.");
  });
  exportButton.id = "meta-export";
  const importButton = button("저장 가져오기", () => {
    if (
      !window.confirm(
        "현재 Gold·Credits·연구·진행 기록을 입력한 메타 저장으로 덮어쓸까요?",
      )
    )
      return;
    metaStore.importSave(json.value);
    report("검증된 메타 저장을 가져왔습니다.");
  });
  importButton.id = "meta-import";
  const reset = button("메타 저장 초기화", () => {
    if (
      !window.confirm(
        "Gold·Credits·모든 영구 연구와 진행 기록을 지울까요? 이 작업은 되돌릴 수 없습니다.",
      )
    )
      return;
    metaStore.reset();
    report("메타 저장을 초기화했습니다. 개발 밸런스 설정은 유지됩니다.");
  });
  reset.id = "meta-reset";
  const actions = element("div", "", "meta-actions");
  actions.append(exportButton, importButton, reset);
  storage.append(jsonLabel, json, actions);

  function refresh() {
    if (disposed) return;
    let save: ReturnType<typeof metaStore.read> | undefined;
    try {
      save = metaStore.read();
    } catch (error) {
      report(
        `메타 저장을 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)} 저장 관리에서 백업을 가져오거나 초기화할 수 있습니다.`,
        true,
      );
    }
    wallet.textContent = save
      ? `Gold ${save.account.gold.toLocaleString()} · Credits ${save.account.credits.toLocaleString()}`
      : "Gold / Credits · 저장 확인 필요";
    progress.textContent = save
      ? `완료한 Run ${save.progress.completedRuns}회 · Stage 1 클리어 ${save.progress.stage1ClearCount}회`
      : "저장 관리에서 오류를 해결한 뒤 출격하세요.";
    launch.disabled = busy || !save;
    const unlocks = save ? getUnlocks(save) : undefined;
    const available = unlocks ? unlockLabels(unlocks) : {};
    const completed = save?.characters.marine.completedOperationRecords ?? [];
    mastery.textContent = save
      ? `Marine 숙련 ${getMasteryPoints(completed)} Point · 완료 ${completed.length} / ${operationRecords.length}`
      : "숙련 · 저장 확인 필요";
    for (const { record, state } of recordRows) {
      state.textContent = !save
        ? "저장 확인 필요"
        : completed.includes(record.id)
          ? "✓ 완료"
          : `미완료 · 진행 ${formatProgress(record, getOperationProgress(record, save))} / ${formatProgress(record, record.target)}`;
    }
    capacity.textContent = unlocks
      ? `특수 슬롯 ${unlocks.specialCapacity} / 2 · 무장 확장 코어는 해당 Run에서 +1 (최대 3)`
      : "특수 슬롯 · 저장 확인 필요";
    for (const { key, title, row } of unlockRows) {
      row.textContent = !save
        ? `${title} · 저장 확인 필요`
        : key in available
          ? `✓ ${title}`
          : `🔒 ${title} · ${unlockRequirements[key] ?? "관련 작전 기록 완료"}`;
    }
    for (const { definition, current, next, buy } of rows) {
      const level = save?.characters.marine.research[definition.id] ?? 0;
      const cost = getResearchCost(definition.id, level);
      const effect = formatEffect(
        getResearchEffect(definition.id, level),
        definition.effectUnit,
        definition.id === "special-cycle" || definition.id === "wall-defense",
      );
      current.textContent = save
        ? `Lv${level} / ${definition.maxLevel} · 누적 효과 ${effect}`
        : "저장 확인 필요";
      const unlocked = unlocks?.research.includes(definition.id) ?? false;
      next.textContent = !save
        ? ""
        : !unlocked
          ? `🔒 ${unlockRequirements[`research/${definition.id}`] ?? "관련 작전 기록 완료"}`
          : cost === null
            ? "MAX · 연구 완료"
            : `다음 Lv${level + 1}${definition.breakthroughLevels.includes(level + 1) ? " 돌파" : ""} → ${formatEffect(getResearchEffect(definition.id, level + 1), definition.effectUnit, definition.id === "special-cycle" || definition.id === "wall-defense")} · ${cost.toLocaleString()} Gold`;
      buy.textContent = !unlocked ? "잠김" : cost === null ? "MAX" : "연구";
      buy.disabled =
        busy || !save || !unlocked || cost === null || save.account.gold < cost;
    }
    const level = save?.account.rerollLevel ?? 0;
    const cost = rerollCosts[level];
    rerollState.textContent = !save
      ? "저장 확인 필요"
      : `현재 ${level} / 3 · Run당 ${level}회${cost === undefined ? " · MAX" : ` · 다음 ${level + 1}회: ${cost} Credits`}`;
    rerollBuy.disabled =
      busy || !save || cost === undefined || save.account.credits < cost;
    for (const control of [exportButton, importButton, reset])
      control.disabled = busy;
  }
  root.append(header, notice, records, unlockOverview, research, storage);
  parent.append(root);
  refresh();
  window.addEventListener("storage", refresh);
  window.addEventListener("focus", refresh);
  return () => {
    disposed = true;
    window.removeEventListener("storage", refresh);
    window.removeEventListener("focus", refresh);
    root.remove();
  };
}
