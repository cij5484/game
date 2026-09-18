import { balanceFields } from "./balanceFields";
import { quickSections, detailCategories, detailCategory } from "./panelLayout";
import {
  getValue,
  getDefault,
  getOverrides,
  setOverrides,
  resetOverrides,
  subscribe,
} from "./runtimeBalance";
import { startBalanceBridge } from "./runtimeBridge";
import { createTelemetryCard } from "./TelemetryCard";
import { metaStore } from "../meta/metaSave";
import { researchDefinitions } from "../data/meta";
import {
  getMasteryPoints,
  getUnlocks,
  operationRecords,
  type OperationId,
} from "../data/operations";
import "./dev-panel.css";

type Settings = { version: 1; overrides: Record<string, number | boolean> };
type Preset = { name: string; settings: Settings };
const presetKey = "horde-dev-balance-presets-v1";

function parseSettings(text: string): Settings {
  const data: unknown = JSON.parse(text);
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !("version" in data) ||
    data.version !== 1 ||
    !("overrides" in data) ||
    !data.overrides ||
    typeof data.overrides !== "object" ||
    Array.isArray(data.overrides)
  )
    throw Error(
      "설정 형식이 올바르지 않습니다. version: 1과 overrides 객체가 필요합니다.",
    );
  if (
    Object.values(data.overrides).some(
      (value) =>
        typeof value !== "boolean" &&
        (typeof value !== "number" || !Number.isFinite(value)),
    )
  )
    throw Error("설정값은 유효한 숫자 또는 켜기/끄기 값이어야 합니다.");
  return { version: 1, overrides: data.overrides as Settings["overrides"] };
}

function readPresets(): Preset[] {
  const data: unknown = JSON.parse(localStorage.getItem(presetKey) ?? "[]");
  if (!Array.isArray(data))
    throw Error("저장된 프리셋 목록을 읽을 수 없습니다.");
  return data.map((preset: unknown) => {
    if (
      !preset ||
      typeof preset !== "object" ||
      !("name" in preset) ||
      typeof preset.name !== "string" ||
      !("settings" in preset)
    )
      throw Error("저장된 프리셋 형식이 올바르지 않습니다.");
    return {
      name: preset.name,
      settings: parseSettings(JSON.stringify(preset.settings)),
    };
  });
}

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
const displayValue = (value: number | boolean) =>
  typeof value === "boolean" ? (value ? "켜짐" : "꺼짐") : String(value);

export function mountBalancePanel(parent: HTMLElement): () => void {
  const root = element("main", "", "dev-balance-panel");
  const header = element("header", "", "balance-header");
  header.append(
    element("p", "개발 전용 · 정식 게임 기능 아님", "balance-eyebrow"),
    element("h1", "실시간 밸런스 패널"),
    element(
      "p",
      "값을 변경하면 연결된 게임에 반영됩니다. 코드 기본값과 GDD는 바뀌지 않습니다.",
    ),
  );
  const status = element("strong", "게임 연결 대기 중", "balance-connection");
  status.id = "balance-connection";
  status.setAttribute("role", "status");
  const gameState = element("span", "", "balance-game-state");
  gameState.id = "balance-game-state";
  const gameLink = element("a", "게임 새 창에서 열기");
  gameLink.href = "/";
  gameLink.target = "_blank";
  gameLink.rel = "noopener";
  gameLink.title = "같은 브라우저에서 게임을 열면 실시간으로 연결됩니다.";
  const connection = element("div", "", "balance-connection-row");
  connection.append(status, gameState, gameLink);
  header.append(connection);

  const performance = element("details", "", "balance-group balance-live");
  performance.open = true;
  performance.append(element("summary", "실시간 상태"));
  const metrics = element("dl", "", "balance-performance");
  const performanceValues = (
    [
      ["fps", "FPS"],
      ["enemies", "적 수"],
      ["specialUnits", "특수 유닛 수"],
      ["combatVfx", "전투 효과 수"],
      ["substeps", "Substeps"],
    ] as const
  ).map(([key, label]) => {
    const row = element("div");
    const value = element("dd", "연결 대기 중");
    value.id = `balance-performance-${key}`;
    row.append(element("dt", label), value);
    metrics.append(row);
    return { key, value };
  });
  performance.append(metrics);
  const liveDock = element("div");
  const telemetry = createTelemetryCard();

  const notice = element(
    "p",
    "숫자 입력 후 Enter 또는 다른 항목을 클릭하면 적용합니다.",
    "balance-notice",
  );
  notice.id = "balance-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  const report = (text: string, error = false) => {
    notice.textContent = text;
    notice.dataset.error = String(error);
  };
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (error) {
      report(
        `적용하지 못했습니다: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  };
  const button = (label: string, title: string, action: () => void) => {
    const control = element("button", label);
    control.type = "button";
    control.title = title;
    control.addEventListener("click", () => attempt(action));
    return control;
  };
  const drafts = new Map<string, number | boolean>();
  const cycleSeconds = (id: string) =>
    /^special\.(grenade|missile|drone)\.cycleMs$/.test(id) ||
    id === "special.missileBehavior.salvoIntervalMs" ||
    id === "special.missileLifetimeMs";
  const displayNumber = (id: string, value: number, defaults = false) =>
    cycleSeconds(id)
      ? Number(
          (
            value /
            Number(
              defaults
                ? getDefault("run.combatTempo")
                : getValue("run.combatTempo"),
            ) /
            1000
          ).toFixed(6),
        )
      : value;
  const showValue = (id: string, value: number | boolean, defaults = false) => {
    if (typeof value === "boolean") return displayValue(value);
    return `${displayNumber(id, value, defaults)}${/^marineRarity\.bands\.\d\.weights\.\d$/.test(id) ? ` (${Number((value / 10).toFixed(3))}%)` : ""}`;
  };
  const applyDrafts = () => {
    setOverrides({ ...getOverrides(), ...Object.fromEntries(drafts) });
    drafts.clear();
    refresh();
    report(
      "입력값을 반영했습니다. 각 항목의 적용 시점부터 게임에서 사용합니다.",
    );
  };
  const apply = button(
    "입력값 적용",
    "합계 조건이 있는 여러 값을 수정한 뒤 함께 적용합니다.",
    applyDrafts,
  );
  const reset = button(
    "모든 값 기본값으로",
    "입력 대기값과 모든 실행 중 변경값을 지우고 코드 기본값으로 돌아갑니다.",
    () => {
      drafts.clear();
      resetOverrides();
      refresh();
      report(
        "모든 값을 코드 기본값으로 되돌렸습니다. 저장한 프리셋은 유지됩니다.",
      );
    },
  );
  const toolbar = element("div", "", "balance-toolbar");
  const searchLabel = element("label", "항목 검색");
  searchLabel.htmlFor = "balance-search";
  const search = element("input");
  search.id = "balance-search";
  search.type = "search";
  search.placeholder = "체력, 수류탄, 보스…";
  search.title = "한국어 이름, 설명, 분류 또는 코드 항목명으로 찾습니다.";
  const count = element("small");
  toolbar.append(searchLabel, search, count, apply, reset);
  const sticky = element("div", "", "balance-sticky");
  const tabs = element("div", "", "balance-tabs");
  tabs.setAttribute("role", "tablist");
  let activeView: "quick" | "detail" = "quick";
  let activeQuick = "overview";
  let activeCategory = "전체 게임";
  const quickTab = button("간편 조정", "자주 바꾸는 대표값을 조절합니다.", () =>
    switchView("quick"),
  );
  const detailTab = button("상세 설정", "전체 항목을 기능별로 찾습니다.", () =>
    switchView("detail"),
  );
  quickTab.id = "balance-tab-quick";
  detailTab.id = "balance-tab-detail";
  for (const control of [quickTab, detailTab])
    control.setAttribute("role", "tab");
  tabs.append(quickTab, detailTab);
  sticky.append(tabs, toolbar, notice);
  const quickNav = element("nav", "", "balance-quick-nav");
  quickNav.setAttribute("aria-label", "간편 조정 섹션");
  const quickButtons = quickSections.map((section) => {
    const control = button(section.title, `${section.title} 대표 설정`, () => {
      activeQuick = section.id;
      renderLayout();
    });
    control.id = `balance-quick-${section.id}`;
    quickNav.append(control);
    return { id: section.id, control };
  });
  const quickContent = element("section", "", "balance-quick-grid");
  quickContent.id = "balance-quick-content";
  quickContent.setAttribute("role", "tabpanel");
  quickContent.setAttribute("aria-labelledby", quickTab.id);
  const workspace = element("div", "", "balance-workspace");
  const categoryNav = element("nav", "", "balance-category-nav");
  categoryNav.setAttribute("aria-label", "상세 설정 카테고리");
  const categoryPicker = element("div", "", "balance-category-picker");
  const categoryLabel = element("label", "설정 카테고리");
  categoryLabel.htmlFor = "balance-category";
  const categorySelect = element("select");
  categorySelect.id = categoryLabel.htmlFor;
  categoryPicker.append(categoryLabel, categorySelect);
  const examples = element("p", "", "balance-hp-examples");
  const groupsRoot = element("section", "", "balance-groups");
  groupsRoot.setAttribute("aria-label", "밸런스 항목");
  const groups = new Map<string, HTMLDetailsElement>();
  const rows = balanceFields.map((field, index) => {
    const category = detailCategory(field);
    let group = groups.get(category);
    if (!group) {
      group = element("details", "", "balance-group");
      group.open = true;
      group.dataset.category = category;
      group.append(element("summary", category));
      groups.set(category, group);
      groupsRoot.append(group);
    }
    const row = element("div", "", "balance-field");
    row.dataset.field = field.id;
    row.title = field.description;
    const label = element("label", field.label);
    label.htmlFor = `balance-${field.id}`;
    label.title = field.description;
    const description = element(
      "small",
      field.description,
      "balance-description",
    );
    description.id = `balance-description-${index}`;
    const identity = element("div", "", "balance-identity");
    const help = element("details", "", "balance-help");
    help.append(
      element("summary", "설명"),
      description,
      element("code", field.id),
    );
    identity.append(label, help);
    const input = element("input");
    input.id = label.htmlFor;
    input.title = `${field.description} ${field.apply}${cycleSeconds(field.id) ? " 현재 전투 속도에서 개발 배속 X1일 때의 실제 초입니다. 기본값 표시는 코드 기본 전투 속도로 환산합니다." : ""}`;
    input.setAttribute("aria-describedby", description.id);
    const isBoolean = typeof getDefault(field.id) === "boolean";
    input.type = isBoolean ? "checkbox" : "number";
    if (!isBoolean) {
      if (field.min !== undefined)
        input.min = String(displayNumber(field.id, field.min));
      if (field.max !== undefined)
        input.max = String(displayNumber(field.id, field.max));
      input.step = cycleSeconds(field.id)
        ? "0.01"
        : String(field.step ?? "any");
    }
    const control = element("div", "", "balance-control");
    control.append(input);
    const unit = cycleSeconds(field.id) ? "X1 초" : field.unit;
    if (unit) control.append(element("span", unit));
    const values = element("small", "", "balance-values");
    const changed = element("span", "", "balance-changed");
    const restore = button(
      "되돌리기",
      `${field.label} 항목을 기본값으로 되돌립니다.`,
      () => {
        drafts.set(field.id, getDefault(field.id));
        if (!isBoolean)
          input.value = String(
            displayNumber(field.id, Number(getDefault(field.id))),
          );
        refresh();
        applyDrafts();
      },
    );
    const meta = element("div", "", "balance-meta");
    meta.append(
      element("span", field.apply, "balance-timing"),
      values,
      changed,
      restore,
    );
    row.append(identity, control, meta);
    group.append(row);
    const commitInput = () => {
      const numeric = input.value.trim() ? Number(input.value) : NaN;
      drafts.set(
        field.id,
        isBoolean
          ? input.checked
          : numeric *
              (cycleSeconds(field.id)
                ? Number(getValue("run.combatTempo")) * 1000
                : 1),
      );
      refresh();
      attempt(applyDrafts);
    };
    input.addEventListener("change", commitInput);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") commitInput();
    });
    return {
      field,
      row,
      input,
      values,
      changed,
      restore,
      group,
      category,
      isBoolean,
      unit,
    };
  });
  const empty = element(
    "p",
    "검색 결과가 없습니다. 다른 이름이나 설명으로 검색해 보세요.",
  );
  empty.hidden = true;
  groupsRoot.append(empty);
  search.addEventListener("input", () => {
    if (search.value.trim()) activeView = "detail";
    renderLayout();
  });

  const storage = element("details", "", "balance-group balance-storage");
  storage.open = true;
  storage.append(element("summary", "프리셋 / 저장"));
  const storageBody = element("div", "", "balance-storage-body");
  const presetNameLabel = element("label", "프리셋 이름");
  presetNameLabel.htmlFor = "balance-preset-name";
  const presetName = element("input");
  presetName.id = presetNameLabel.htmlFor;
  presetName.type = "text";
  presetName.maxLength = 80;
  presetName.placeholder = "예: 수류탄 약화 테스트";
  presetName.title = "현재 적용된 값에 이름을 붙여 이 브라우저에 저장합니다.";
  const presetLabel = element("label", "저장한 프리셋");
  presetLabel.htmlFor = "balance-presets";
  const presets = element("select");
  presets.id = presetLabel.htmlFor;
  presets.title = "불러오거나 삭제할 프리셋을 선택합니다.";
  const refreshPresets = (selected = "") => {
    const items = readPresets();
    const placeholder = element("option", "프리셋 선택");
    placeholder.value = "";
    presets.replaceChildren(
      placeholder,
      ...items.map(({ name }) => {
        const option = element("option", name);
        option.value = name;
        return option;
      }),
    );
    presets.value = selected;
  };
  presets.addEventListener("change", () => {
    presetName.value = presets.value;
  });
  const currentSettings = (): Settings => ({
    version: 1,
    overrides: getOverrides(),
  });
  const save = button(
    "프리셋 저장",
    "적용된 현재값을 저장합니다. 같은 이름이 있으면 덮어씁니다. 입력 대기값은 먼저 적용하세요.",
    () => {
      if (drafts.size)
        throw Error("입력 대기값을 먼저 적용하거나 되돌려 주세요.");
      const name = presetName.value.trim();
      if (!name || name.length > 80)
        throw Error("프리셋 이름을 1~80자로 입력해 주세요.");
      const items = readPresets().filter((preset) => preset.name !== name);
      items.push({ name, settings: currentSettings() });
      localStorage.setItem(presetKey, JSON.stringify(items));
      refreshPresets(name);
      report(`‘${name}’ 프리셋을 저장했습니다.`);
    },
  );
  const load = button(
    "불러오기",
    "선택한 프리셋으로 모든 변경값을 교체합니다.",
    () => {
      const preset = readPresets().find((item) => item.name === presets.value);
      if (!preset) throw Error("불러올 프리셋을 선택해 주세요.");
      setOverrides(preset.settings.overrides);
      drafts.clear();
      refresh();
      report(`‘${preset.name}’ 프리셋을 불러왔습니다.`);
    },
  );
  const remove = button(
    "프리셋 삭제",
    "선택한 저장 프리셋만 삭제합니다. 게임의 현재값은 유지합니다.",
    () => {
      if (!presets.value) throw Error("삭제할 프리셋을 선택해 주세요.");
      localStorage.setItem(
        presetKey,
        JSON.stringify(
          readPresets().filter((preset) => preset.name !== presets.value),
        ),
      );
      refreshPresets();
      report("선택한 프리셋을 삭제했습니다.");
    },
  );
  const presetActions = element("div", "", "balance-actions");
  presetActions.append(save, load, remove);
  const jsonLabel = element("label", "설정 JSON");
  jsonLabel.htmlFor = "balance-json";
  const json = element("textarea");
  json.id = jsonLabel.htmlFor;
  json.rows = 8;
  json.spellcheck = false;
  json.title =
    "version: 1과 overrides를 포함한 JSON을 내보내거나 붙여 넣습니다. 불러오기는 현재 변경값 전체를 교체합니다.";
  json.placeholder = '{"version":1,"overrides":{}}';
  const exportJson = button(
    "JSON 내보내기",
    "게임에 적용된 현재값을 아래에 표시합니다. 입력 대기값은 포함하지 않습니다.",
    () => {
      json.value = JSON.stringify(currentSettings(), null, 2);
      report(
        "현재 적용값을 JSON으로 내보냈습니다. 복사하거나 파일로 저장할 수 있습니다.",
      );
    },
  );
  const importJson = button(
    "JSON 불러오기",
    "JSON을 검사한 후 모든 변경값을 교체합니다. 잘못된 설정은 적용하지 않습니다.",
    () => {
      setOverrides(parseSettings(json.value).overrides);
      drafts.clear();
      refresh();
      report("JSON 설정을 불러왔습니다.");
    },
  );
  const download = button(
    "JSON 파일 저장",
    "현재 적용된 값을 JSON 파일로 내려받습니다.",
    () => {
      const text = JSON.stringify(currentSettings(), null, 2);
      json.value = text;
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const link = element("a");
      link.href = url;
      link.download = "prototype-balance.json";
      root.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      report("현재 적용값을 JSON 파일로 저장했습니다.");
    },
  );
  const jsonActions = element("div", "", "balance-actions");
  jsonActions.append(exportJson, importJson, download);
  storageBody.append(
    presetNameLabel,
    presetName,
    presetLabel,
    presets,
    presetActions,
    element(
      "p",
      "프리셋은 이 브라우저에 저장됩니다. JSON은 다른 환경으로 옮기거나 기본값 확정 요청에 사용할 수 있습니다.",
    ),
    jsonLabel,
    json,
    jsonActions,
  );
  storage.append(storageBody);

  function refresh() {
    for (const {
      field,
      row,
      input,
      values,
      changed,
      restore,
      isBoolean,
      unit,
    } of rows) {
      const current = getValue(field.id);
      const defaultValue = getDefault(field.id);
      const draft = drafts.get(field.id);
      if (!drafts.has(field.id)) {
        if (isBoolean) input.checked = Boolean(current);
        else input.value = String(displayNumber(field.id, Number(current)));
      } else if (isBoolean) input.checked = Boolean(draft);
      const overridden = current !== defaultValue;
      row.dataset.changed = String(overridden || drafts.has(field.id));
      changed.textContent = drafts.has(field.id)
        ? "적용 대기"
        : overridden
          ? "변경됨"
          : "기본값";
      values.textContent = `현재값 ${showValue(field.id, current)} · 기본값 ${showValue(field.id, defaultValue, true)}${unit ? ` ${unit}` : ""}`;
      if (!isBoolean) {
        if (field.min !== undefined)
          input.min = String(displayNumber(field.id, field.min));
        if (field.max !== undefined)
          input.max = String(displayNumber(field.id, field.max));
      }
      restore.disabled = !overridden && !drafts.has(field.id);
    }
    apply.textContent = drafts.size
      ? `입력값 적용 (${drafts.size})`
      : "입력값 적용";
    apply.disabled = drafts.size === 0;
    count.textContent = `${rows.filter(({ row }) => !row.hidden).length} / ${rows.length}개 항목`;
    const linear = "enemyLevelScaling.linear",
      quadratic = "enemyLevelScaling.quadratic";
    examples.hidden =
      activeView !== "detail" ||
      activeCategory !== "적 / Horde" ||
      !!search.value.trim() ||
      !balanceFields.some((field) => field.id === linear) ||
      !balanceFields.some((field) => field.id === quadratic);
    if (!examples.hidden)
      examples.textContent =
        "적 레벨 체력 배율 · " +
        [1, 20, 40]
          .map((level) => {
            const x = level - 1;
            return `Lv${level} ×${(1 + Number(getValue(linear)) * x + Number(getValue(quadratic)) * x * x).toFixed(2)}`;
          })
          .join(" · ") +
        " · 다음 적 생성부터 적용";
  }
  const specialPanels = new Map<string, HTMLElement>([
    ["프리셋 / JSON", storage],
  ]);
  let stopMeta = () => {};
  if (import.meta.env.DEV) {
    const meta = element("details", "", "balance-group");
    meta.open = true;
    meta.append(element("summary", "메타 진행"));
    const body = element("div", "", "balance-storage-body");
    const unlock = element("details", "", "balance-group");
    unlock.open = true;
    unlock.append(element("summary", "해금 / 메타 저장"));
    const unlockBody = element("div", "", "balance-storage-body");
    const state = element("p");
    state.id = "balance-meta-state";
    const levels = element("p");
    levels.id = "balance-meta-research";
    const mastery = element("p");
    mastery.id = "balance-meta-mastery";
    const refreshMeta = () => {
      try {
        const save = metaStore.read();
        const unlocks = getUnlocks(save);
        const records = save.characters.marine.completedOperationRecords;
        mastery.textContent = `Marine 숙련 ${getMasteryPoints(records)} Point · 기록 ${records.length}/${operationRecords.length} · 특수 슬롯 ${unlocks.specialCapacity}/2 · 유물 ${unlocks.relicSystem ? "해금" : "잠김"} · 코어 ${unlocks.coreSystem ? "해금" : "잠김"} · 시너지 ${unlocks.synergySystem ? "해금" : "잠김"}`;
        state.textContent = `Gold ${save.account.gold} · Credits ${save.account.credits} · 새로고침 Lv${save.account.rerollLevel}/3`;
        levels.textContent = Object.values(researchDefinitions)
          .map(
            (definition) =>
              `${definition.title} Lv${save.characters.marine.research[definition.id] ?? 0}/${definition.maxLevel}`,
          )
          .join(" · ");
      } catch (error) {
        state.textContent = `메타 저장 확인 필요: ${error instanceof Error ? error.message : String(error)}`;
        levels.textContent =
          "메인 화면의 저장 관리에서 백업 가져오기 또는 초기화를 진행하세요.";
        mastery.textContent = "숙련 · 저장 확인 필요";
      }
    };
    body.append(
      element(
        "p",
        "Run 밖 영구 진행입니다. 밸런스 초기화·JSON과 별개이며 연구 효과는 다음 출격부터 적용됩니다.",
      ),
      state,
      levels,
      button(
        "Gold +1000",
        "영구 메타 저장에 개발용 Gold 1000을 더합니다.",
        () => {
          metaStore.grantDevCurrencies(1000, 0);
          refreshMeta();
        },
      ),
      button(
        "Credits +100",
        "영구 메타 저장에 개발용 Credits 100을 더합니다.",
        () => {
          metaStore.grantDevCurrencies(0, 100);
          refreshMeta();
        },
      ),
    );
    unlockBody.append(
      mastery,
      button(
        "신규 계정 상태로 초기화",
        "확인 후 영구 진행만 초기화합니다. 개발 밸런스 설정은 유지합니다.",
        () => {
          if (
            !window.confirm(
              "Gold·Credits·영구 연구·진행 기록을 모두 초기화할까요? 개발 밸런스 설정은 유지됩니다.",
            )
          )
            return;
          metaStore.reset();
          refreshMeta();
          report("영구 메타 저장을 초기화했습니다.");
        },
      ),
    );
    const recordLabel = element("label", "완료할 작전 기록");
    recordLabel.htmlFor = "balance-meta-record";
    const recordSelect = element("select");
    recordSelect.id = recordLabel.htmlFor;
    for (const record of operationRecords) {
      const option = element(
        "option",
        `${record.title} · 숙련 +${record.points}`,
      );
      option.value = record.id;
      recordSelect.append(option);
    }
    recordSelect.value = operationRecords[0]!.id;
    unlockBody.append(
      recordLabel,
      recordSelect,
      button(
        "선택 기록 완료",
        "선택 기록과 직접 보상을 영구 저장합니다. 중복 Point는 지급하지 않습니다.",
        () => {
          metaStore.completeRecord(recordSelect.value as OperationId);
          refreshMeta();
        },
      ),
      button(
        "모든 Prototype 콘텐츠 해금",
        "개발 테스트용으로 모든 Prototype 콘텐츠의 해금 상태를 저장합니다.",
        () => {
          metaStore.unlockAll();
          refreshMeta();
        },
      ),
      button(
        "점진 해금 상태 초기화",
        "Gold·Credits·구매 연구는 보존하고 기록·해금 진행을 초기화합니다.",
        () => {
          if (
            !window.confirm(
              "작전 기록과 점진 해금을 초기화할까요? Gold·Credits·구매 연구는 보존됩니다.",
            )
          )
            return;
          metaStore.resetProgression();
          refreshMeta();
        },
      ),
      element(
        "p",
        "특수 슬롯 테스트 · 계정 해금과 별도로 강제 지정합니다. 새 출격에서 확인하세요.",
      ),
      ...([0, 1, 2] as const).map((capacity) =>
        button(
          `특수 슬롯 ${capacity}`,
          `개발 테스트용 특수 슬롯 ${capacity}개로 설정합니다.`,
          () => {
            metaStore.setSpecialCapacity(capacity);
            refreshMeta();
          },
        ),
      ),
    );
    meta.append(body);
    unlock.append(unlockBody);
    specialPanels.set("Meta Progression", meta);
    specialPanels.set("Unlock / Save", unlock);
    refreshMeta();
    window.addEventListener("storage", refreshMeta);
    stopMeta = () => window.removeEventListener("storage", refreshMeta);
  }
  const categoryButtons = detailCategories
    .filter(
      (category) =>
        groups.has(category) ||
        specialPanels.has(category) ||
        category === "Performance / Debug",
    )
    .map((category) => {
      const control = button(category, `${category} 전체 설정`, () =>
        selectCategory(category),
      );
      control.dataset.category = category;
      categoryNav.append(control);
      const option = element("option", category);
      option.value = category;
      categorySelect.append(option);
      return { category, control };
    });
  categorySelect.addEventListener("change", () =>
    selectCategory(categorySelect.value),
  );
  for (const panel of specialPanels.values()) groupsRoot.append(panel);
  groupsRoot.setAttribute("role", "tabpanel");
  groupsRoot.setAttribute("aria-labelledby", detailTab.id);
  workspace.append(categoryNav, groupsRoot);
  root.append(
    header,
    liveDock,
    sticky,
    quickNav,
    categoryPicker,
    examples,
    quickContent,
    workspace,
  );

  function switchView(view: "quick" | "detail") {
    activeView = view;
    search.value = "";
    renderLayout();
  }
  function selectCategory(category: string) {
    activeView = "detail";
    activeCategory = category;
    search.value = "";
    renderLayout();
    refresh();
  }
  function renderLayout() {
    const query = search.value.trim().toLocaleLowerCase();
    const quick = activeView === "quick";
    root.dataset.view = activeView;
    quickTab.setAttribute("aria-selected", String(quick));
    detailTab.setAttribute("aria-selected", String(!quick));
    quickTab.setAttribute("aria-controls", quickContent.id);
    quickNav.hidden = !quick;
    quickContent.hidden = !quick;
    workspace.hidden = quick;
    categoryPicker.hidden = quick;
    categorySelect.value = activeCategory;
    for (const { category, control } of categoryButtons)
      control.setAttribute(
        "aria-current",
        String(!query && category === activeCategory),
      );
    for (const { id, control } of quickButtons)
      control.setAttribute("aria-current", String(id === activeQuick));
    // Move existing rows; Quick and Detail always edit the same input and draft.
    for (const { field, row, group, category } of rows) {
      group.append(row);
      row.hidden =
        quick ||
        (query
          ? !`${category} ${field.group} ${field.label} ${field.description} ${field.id}`
              .toLocaleLowerCase()
              .includes(query)
          : category !== activeCategory);
    }
    quickContent.replaceChildren();
    if (quick) {
      const section = quickSections.find(
        (section) => section.id === activeQuick,
      )!;
      for (const card of section.cards) {
        const fields = card.fields
          .map((id) => rows.find((row) => row.field.id === id))
          .filter((row) => row !== undefined);
        if (!fields.length) continue;
        const block = element("article", "", "balance-quick-card");
        block.dataset.quickCard = card.id;
        block.append(element("h2", card.title));
        for (const { row } of fields) {
          row.hidden = false;
          block.append(row);
        }
        quickContent.append(block);
      }
    }
    for (const [category, group] of groups) {
      group.hidden =
        quick ||
        !rows.some((row) => row.category === category && !row.row.hidden);
      if (query && !group.hidden) group.open = true;
    }
    for (const [category, panel] of specialPanels)
      panel.hidden = quick || !!query || category !== activeCategory;
    (quick ? liveDock : groupsRoot).append(telemetry.root, performance);
    telemetry.root.hidden =
      !quick && (!!query || activeCategory !== "Performance / Debug");
    performance.hidden =
      !quick && (!!query || activeCategory !== "Performance / Debug");
    const visible = rows.filter(({ row }) => !row.hidden).length;
    count.textContent = `${visible} / ${rows.length}개 항목`;
    empty.hidden = quick || !query || visible > 0;
    examples.hidden =
      quick ||
      !!query ||
      activeCategory !== "적 / Horde" ||
      !examples.textContent;
  }
  parent.append(root);
  refresh();
  renderLayout();
  attempt(() => refreshPresets());
  const unsubscribe = subscribe(refresh);
  const stopBridge = startBalanceBridge("panel", (state) => {
    telemetry.update(state);
    status.textContent = state.connected ? "게임 연결됨" : "게임 연결 대기 중";
    status.dataset.connected = String(state.connected);
    gameState.textContent = state.connected
      ? `개발 배속 X${state.speed} · 캐릭터 Lv${state.level}${state.appliedOverrides === undefined ? "" : ` · 게임 적용 ${state.appliedOverrides}개`}`
      : "같은 브라우저의 게임 창을 열어 주세요.";
    for (const { key, value } of performanceValues)
      value.textContent = !state.connected
        ? "연결 대기 중"
        : !state.performance
          ? "측정값 없음"
          : key === "fps"
            ? state.performance[key].toFixed(1)
            : String(state.performance[key]);
  });
  return () => {
    unsubscribe();
    stopBridge();
    stopMeta();
    root.remove();
  };
}
