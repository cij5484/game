import {
  formatAiBalanceReport,
  formatBalanceReport,
  readLastBalanceReport,
  type BalanceReport,
} from "./BalanceTelemetry";
import type { GameStatus } from "./runtimeBridge";

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
const number = (value: number) => value.toFixed(1);
const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const ttk = (value: number | null) =>
  value === null ? "—" : `${number(value)}초`;

export function createTelemetryCard() {
  const root = element("section", "", "balance-telemetry");
  root.id = "balance-telemetry";
  root.setAttribute("aria-label", "실시간 밸런스");
  const status = element("p", "Run 측정 대기 중", "balance-telemetry-status");
  const metrics = element("dl", "", "balance-performance");
  const fields = [
    ["stage", "Stage"],
    ["level", "Level"],
    ["wall", "Wall"],
    ["enemies", "현재 Enemy"],
    ["dps", "최근 30초 Total DPS"],
    ["gauss", "Gauss DPS"],
    ["grenade", "Grenade DPS"],
    ["missile", "Missile DPS"],
    ["drone", "Drone DPS"],
    ["other", "Other DPS"],
    ["spawnPerMin", "Spawn/min"],
    ["kpm", "Kill/min"],
    ["nearWall75", "Near Wall 75%"],
    ["nearWall90", "Near Wall 90%"],
    ["average", "평균 Enemy"],
    ["wallDamage", "Wall Damage"],
    ["wallReach", "Wall 도달/min"],
    ["elite", "최근 Elite TTK"],
    ["eliteAverage", "Run Elite 평균 TTK"],
    ["boss", "Boss TTK"],
  ] as const;
  const values = new Map<string, HTMLElement>();
  for (const [key, label] of fields) {
    const row = element("div");
    const value = element("dd", "—");
    value.id = `balance-telemetry-${key}`;
    values.set(key, value);
    row.append(element("dt", label), value);
    metrics.append(row);
  }
  const build = element("details");
  const buildList = element("ul");
  build.id = "balance-telemetry-build";
  build.append(element("summary", "현재 Build"), buildList);
  const timeline = element("details");
  timeline.open = true;
  const events = element("ol", "", "balance-telemetry-events");
  events.id = "balance-telemetry-events";
  timeline.append(element("summary", "최근 Run 이벤트"), events);
  timeline.title =
    "개조 전후 DPS는 각 15 Stage seconds 기준이며 다른 성장·적 밀도 변화가 포함될 수 있는 관찰값입니다.";
  const actions = element("div", "", "balance-actions");
  const notice = element("p", "", "balance-notice");
  notice.setAttribute("role", "status");
  let report = readLastBalanceReport();
  const controls: [string, (value: BalanceReport) => string][] = [
    ["이번 Run 리포트 복사", formatBalanceReport],
    ["JSON 복사", (value) => JSON.stringify(value, null, 2)],
    ["AI 분석용 리포트 복사", formatAiBalanceReport],
  ];
  const buttons = controls.map(([label, format]) => {
    const button = element("button", String(label));
    button.type = "button";
    button.addEventListener("click", async () => {
      if (!report) return;
      try {
        await navigator.clipboard.writeText(format(report));
        notice.textContent = "Run 리포트를 복사했습니다.";
      } catch {
        notice.textContent =
          "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.";
      }
    });
    actions.append(button);
    return button;
  });
  root.append(
    element("h2", "실시간 밸런스"),
    status,
    metrics,
    build,
    timeline,
    actions,
    notice,
  );
  root.title =
    "Stage 진행 시간 기준입니다. 개발 배속 X1/X2/X4에서도 같은 단위로 비교합니다. 시작 30초 이전에는 경과 시간으로 계산합니다.";

  function render(current: BalanceReport | null, label: string) {
    report = current;
    status.textContent = label;
    for (const control of buttons) control.disabled = !report;
    if (!report) {
      for (const value of values.values()) value.textContent = "—";
      buildList.replaceChildren();
      events.replaceChildren(element("li", "아직 기록된 이벤트가 없습니다."));
      return;
    }
    const m = report.metrics;
    const optionalNumber = (value: number | undefined, digits = true) =>
      value === undefined ? "—" : digits ? number(value) : String(value);
    const display: Record<string, string> = {
      stage: time(m.stageMs),
      level: String(m.level),
      wall: `${number(m.wallPercent)}%`,
      enemies: String(m.enemies),
      dps: number(m.totalDps),
      gauss: number(m.sourceDps.Gauss),
      grenade: number(m.sourceDps.Grenade),
      missile: number(m.sourceDps.Missile),
      drone: number(m.sourceDps.Drone),
      other: number(m.sourceDps.Other),
      spawnPerMin: optionalNumber(m.spawnPerMin),
      kpm: number(m.kpm),
      nearWall75: optionalNumber(m.nearWall75, false),
      nearWall90: optionalNumber(m.nearWall90, false),
      average: number(m.avgEnemies),
      wallDamage: number(m.wallDamage),
      wallReach: number(m.wallReachPerMin),
      elite: ttk(m.lastEliteTtk),
      eliteAverage: ttk(report.eliteAverageTtk),
      boss: ttk(m.bossTtk),
    };
    for (const [key, value] of values) value.textContent = display[key]!;
    buildList.replaceChildren(
      ...report.build.map((line) => element("li", line)),
    );
    events.replaceChildren(
      ...report.events
        .slice(-8)
        .reverse()
        .map((event) => {
          const mod =
            event.type === "mod"
              ? report!.modEvents.find(
                  (item) =>
                    item.stageMs === event.stageMs &&
                    event.label.includes(item.name),
                )
              : undefined;
          const detail = mod
            ? ` · DPS ${number(mod.preDps)} → ${mod.postDps === null ? (report!.result === "in-progress" ? "15초 측정 중" : "측정 미완료") : `${number(mod.postDps)} (${mod.deltaPercent === null ? "변화율 —" : `${mod.deltaPercent >= 0 ? "+" : ""}${number(mod.deltaPercent)}%`})`}`
            : event.ttk === undefined
              ? ""
              : ` · TTK ${ttk(event.ttk)}`;
          return element(
            "li",
            `${time(event.stageMs)} ${event.label}${detail}`,
          );
        }),
    );
  }
  render(
    report,
    report ? `마지막 저장 Run · ${report.result}` : "Run 측정 대기 중",
  );
  return {
    root,
    update(state: GameStatus) {
      if (state.connected && state.telemetry)
        render(
          state.telemetry,
          state.telemetry.result === "in-progress"
            ? "현재 Run · Stage 시간 기준"
            : `Run 종료 · ${state.telemetry.result}`,
        );
      else
        render(
          (!state.connected ? report : null) ?? readLastBalanceReport(),
          state.connected
            ? "현재 Run 측정 대기 · 저장 리포트가 있으면 표시"
            : "연결 대기 · 마지막 수신/저장 기록",
        );
    },
  };
}
