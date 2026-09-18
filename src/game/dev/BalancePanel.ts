import { balanceFields } from "./balanceFields";
import {
  getValue,
  getDefault,
  getOverrides,
  setOverrides,
  resetOverrides,
  subscribe,
} from "./runtimeBalance";
import { startBalanceBridge } from "./runtimeBridge";
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
    /^special\.(grenade|missile|drone)\.cycleMs$/.test(id);
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
  sticky.append(toolbar, notice);
  const examples = element("p", "", "balance-hp-examples");
  const groupsRoot = element("section", "", "balance-groups");
  groupsRoot.setAttribute("aria-label", "밸런스 항목");
  const groups = new Map<string, HTMLDetailsElement>();
  const rows = balanceFields.map((field, index) => {
    let group = groups.get(field.group);
    if (!group) {
      group = element("details", "", "balance-group");
      group.open = groups.size === 0;
      group.append(element("summary", field.group));
      groups.set(field.group, group);
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
    identity.append(label, description, element("code", field.id));
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
    const query = search.value.trim().toLocaleLowerCase();
    for (const { field, row, group } of rows) {
      row.hidden =
        !`${field.group} ${field.label} ${field.description} ${field.id}`
          .toLocaleLowerCase()
          .includes(query);
      if (query && !row.hidden) group.open = true;
    }
    for (const group of groups.values())
      group.hidden = !rows.some(
        (row) => row.group === group && !row.row.hidden,
      );
    const visible = rows.filter(({ row }) => !row.hidden).length;
    count.textContent = `${visible} / ${rows.length}개 항목`;
    empty.hidden = visible > 0;
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
  root.append(header, sticky, examples, groupsRoot, storage);
  parent.append(root);
  refresh();
  attempt(() => refreshPresets());
  const unsubscribe = subscribe(refresh);
  const stopBridge = startBalanceBridge("panel", (state) => {
    status.textContent = state.connected ? "게임 연결됨" : "게임 연결 대기 중";
    status.dataset.connected = String(state.connected);
    gameState.textContent = state.connected
      ? `개발 배속 X${state.speed} · 캐릭터 Lv${state.level}${state.appliedOverrides === undefined ? "" : ` · 게임 적용 ${state.appliedOverrides}개`}`
      : "같은 브라우저의 게임 창을 열어 주세요.";
  });
  return () => {
    unsubscribe();
    stopBridge();
    root.remove();
  };
}
