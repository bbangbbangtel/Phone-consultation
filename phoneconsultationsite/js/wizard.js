/* =========================================================
 * 고객용 셀프 견적 마법사
 * ========================================================= */
import { subscribeSiteData } from "./firebase-init.js";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const won = n => Math.round(n).toLocaleString("ko-KR");

const STEPS = [
  { id: "carrier", label: "통신사" },
  { id: "model", label: "기종" },
  { id: "join", label: "가입유형" },
  { id: "plan", label: "요금제" },
  { id: "support", label: "지원방식" },
  { id: "addons", label: "부가서비스" }
];

const state = {
  data: null,
  stepIndex: 0,
  carrier: null,
  modelId: null,
  joinType: null,
  planId: null,
  support: null,
  addonIds: new Set(),
  months: null,
  modelCat: "전체"
};

/* ---------- 매장 정보 헤더 세팅 ---------- */
function initHeader() {
  $("#site-name").textContent = STORE.siteName;
  $("#biz-name").textContent = STORE.bizName;
  $("#btn-call").href = "tel:" + STORE.phoneDigits;
  $("#btn-kakao").href = STORE.kakaoUrl;
  if (STORE.prepaidUrl) {
    $("#prepaid-link").href = STORE.prepaidUrl;
    $("#prepaid-banner").hidden = false;
  }
}

/* ---------- 데이터 로드 ---------- */
function normalizeData(raw) {
  const base = raw && raw.policy && raw.models ? raw : DEMO_SITE_DATA;
  const policy = { ...DEMO_SITE_DATA.policy, ...(base.policy || {}) };
  return {
    policy,
    models: base.models && base.models.length ? base.models : DEMO_SITE_DATA.models,
    plans: base.plans && base.plans.length ? base.plans : DEMO_SITE_DATA.plans,
    addons: base.addons || []
  };
}

subscribeSiteData(raw => {
  state.data = normalizeData(raw);
  if (!state.months) state.months = state.data.policy.installmentMonths[0];
  renderStep();
});

/* ---------- 스텝 스킵 규칙 ----------
 * 정책상 하나만 허용되는 항목은 자동 선택하고 화면에 노출하지 않습니다. */
function resolveSkip(stepId) {
  const p = state.data.policy;
  if (stepId === "join") {
    if (p.allowMove && !p.allowChg) return "move";
    if (!p.allowMove && p.allowChg) return "chg";
  }
  if (stepId === "support") {
    if (p.allowSubsidy && !p.allowSelect) return "subsidy";
    if (!p.allowSubsidy && p.allowSelect) return "select";
  }
  if (stepId === "addons") {
    const list = addonsFor(state.carrier);
    if (list.length === 0) return "__skip__";
  }
  return null;
}

function addonsFor(carrier) {
  return state.data.addons.filter(a => a.carrier === carrier);
}
function modelsFor(carrier) {
  return state.data.models.filter(m => m.subsidy && m.subsidy[carrier] != null);
}
function plansFor(carrier) {
  return state.data.plans.filter(p => p.carrier === carrier);
}

function goNext() {
  let idx = state.stepIndex + 1;
  while (idx < STEPS.length) {
    const skip = resolveSkip(STEPS[idx].id);
    if (skip === "__skip__") { idx++; continue; }
    if (skip) { applySkipValue(STEPS[idx].id, skip); idx++; continue; }
    break;
  }
  state.stepIndex = idx;
  renderStep();
}

function goPrev() {
  let idx = state.stepIndex - 1;
  while (idx >= 0) {
    const skip = resolveSkip(STEPS[idx].id);
    if (skip) { idx--; continue; }
    break;
  }
  state.stepIndex = Math.max(0, idx);
  renderStep();
}

function applySkipValue(stepId, value) {
  if (stepId === "join") state.joinType = value;
  if (stepId === "support") state.support = value;
}

function restart() {
  state.stepIndex = 0;
  state.carrier = null; state.modelId = null; state.joinType = null;
  state.planId = null; state.support = null; state.addonIds = new Set();
  state.modelCat = "전체";
  renderStep();
}

/* ---------- 가격 계산 ---------- */
function calcResult() {
  const { data, carrier, modelId, joinType, planId, support, addonIds, months } = state;
  const model = data.models.find(m => m.id === modelId);
  const plan = data.plans.find(p => p.id === planId);
  const policy = data.policy;

  let discount = 0;
  if (support === "subsidy") discount += (model.subsidy[carrier] || 0);
  discount += joinType === "move" ? (policy.moveExtra || 0) : (policy.chgExtra || 0);
  const addonTotal = data.addons
    .filter(a => addonIds.has(a.id))
    .reduce((sum, a) => sum + (a.storeSubsidy || 0), 0);
  discount += addonTotal;

  const principal = Math.max(0, model.price - discount);
  const r = policy.interestRate / 12, n = months;
  const monthlyDevice = principal === 0 ? 0
    : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const planFee = support === "select" ? plan.fee * (1 - policy.selectDiscountRate) : plan.fee;

  return { model, plan, discount, addonTotal, principal, monthlyDevice, planFee, monthlyTotal: monthlyDevice + planFee };
}

function quickTotal(support) {
  const saved = state.support;
  state.support = support;
  const r = calcResult();
  state.support = saved;
  return r.monthlyTotal;
}

/* ---------- 진행바 ---------- */
function renderProgress() {
  const onResult = state.stepIndex >= STEPS.length;
  if (onResult) { $("#progress-wrap").hidden = true; return; }
  $("#progress-wrap").hidden = false;
  $("#progress-track").innerHTML = STEPS.map((s, i) => {
    const cls = i < state.stepIndex ? "done" : i === state.stepIndex ? "current" : "";
    return `<div class="progress-seg ${cls}"></div>`;
  }).join("");
  $("#progress-label").innerHTML = `${state.stepIndex + 1} / ${STEPS.length} · <b>${STEPS[state.stepIndex].label}</b>`;
}

/* ---------- 스텝별 렌더 ---------- */
function renderStep() {
  if (!state.data) return;
  renderProgress();
  const main = $("#wizard-main");
  const stepId = state.stepIndex < STEPS.length ? STEPS[state.stepIndex].id : "result";
  const renderers = {
    carrier: renderCarrierStep,
    model: renderModelStep,
    join: renderJoinStep,
    plan: renderPlanStep,
    support: renderSupportStep,
    addons: renderAddonsStep,
    result: renderResultStep
  };
  main.innerHTML = `<div class="step-card" id="step-card"></div>`;
  renderers[stepId]($("#step-card"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function stepNav(container, { back, nextDisabled, onNext, nextLabel = "다음" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "step-actions";
  if (back) {
    const b = document.createElement("button");
    b.className = "btn ghost"; b.textContent = "이전";
    b.addEventListener("click", goPrev);
    wrap.appendChild(b);
  }
  if (onNext) {
    const n = document.createElement("button");
    n.className = "btn primary"; n.textContent = nextLabel;
    n.disabled = !!nextDisabled;
    n.addEventListener("click", onNext);
    wrap.appendChild(n);
  }
  container.appendChild(wrap);
}

function renderCarrierStep(container) {
  container.innerHTML = `
    <h2 class="step-title">통신사를 선택해 주세요</h2>
    <p class="step-sub">가입하실 통신사를 먼저 골라주시면 그에 맞는 기종·요금제를 보여드려요.</p>
    <div class="option-grid cols-3" id="carrier-opts"></div>`;
  const grid = $("#carrier-opts", container);
  grid.innerHTML = Object.keys(CARRIERS).map(c => `
    <button class="opt-card ${state.carrier === c ? "selected" : ""}" data-c="${c}">
      <div class="opt-icon">📶</div>
      <div class="opt-name">${CARRIERS[c].name}</div>
    </button>`).join("");
  $$(".opt-card", grid).forEach(btn => btn.addEventListener("click", () => {
    if (state.carrier !== btn.dataset.c) { state.modelId = null; state.planId = null; state.addonIds = new Set(); }
    state.carrier = btn.dataset.c;
    goNext();
  }));
  stepNav(container, { back: false });
}

function renderModelStep(container) {
  const models = modelsFor(state.carrier);
  const cats = ["전체", ...new Set(models.map(m => m.category).filter(Boolean))];
  const filtered = state.modelCat === "전체" ? models : models.filter(m => m.category === state.modelCat);

  container.innerHTML = `
    <h2 class="step-title">기종을 선택해 주세요</h2>
    <p class="step-sub"><span class="carrier-tag">${CARRIERS[state.carrier].name}</span> 기준 판매 중인 기종입니다.</p>
    <div class="cat-tabs" id="cat-tabs">
      ${cats.map(c => `<button class="cat-tab ${c === state.modelCat ? "active" : ""}" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <div class="option-list" id="model-list"></div>`;

  if (filtered.length === 0) {
    $("#model-list", container).innerHTML = `<p class="addon-empty">이 통신사로 판매 중인 기종이 없습니다.</p>`;
  } else {
    $("#model-list", container).innerHTML = filtered.map(m => `
      <button class="opt-row ${state.modelId === m.id ? "selected" : ""}" data-id="${m.id}">
        <div class="row-check">✓</div>
        <div class="row-main">
          <div class="row-name">${m.name}<small>${m.storage}</small></div>
          <div class="row-sub">출고가 ${won(m.price)}원</div>
        </div>
      </button>`).join("");
  }

  $$(".cat-tab", container).forEach(t => t.addEventListener("click", () => {
    state.modelCat = t.dataset.cat;
    renderStep();
  }));
  $$(".opt-row", container).forEach(row => row.addEventListener("click", () => {
    state.modelId = row.dataset.id;
    goNext();
  }));
  stepNav(container, { back: true });
}

function renderJoinStep(container) {
  const p = state.data.policy;
  const opts = [
    p.allowMove && { v: "move", icon: "🔁", name: "번호이동", desc: "쓰던 번호 그대로, 통신사만 변경" },
    p.allowChg && { v: "chg", icon: "🔄", name: "기기변경", desc: "통신사 유지, 기기만 변경" }
  ].filter(Boolean);

  container.innerHTML = `
    <h2 class="step-title">가입 유형을 선택해 주세요</h2>
    <p class="step-sub">번호이동/기기변경에 따라 지원금이 달라집니다.</p>
    <div class="option-grid cols-2" id="join-opts"></div>`;
  $("#join-opts", container).innerHTML = opts.map(o => `
    <button class="opt-card ${state.joinType === o.v ? "selected" : ""}" data-v="${o.v}">
      <div class="opt-icon">${o.icon}</div>
      <div class="opt-name">${o.name}</div>
      <div class="opt-desc">${o.desc}</div>
    </button>`).join("");
  $$(".opt-card", container).forEach(btn => btn.addEventListener("click", () => {
    state.joinType = btn.dataset.v;
    goNext();
  }));
  stepNav(container, { back: true });
}

function renderPlanStep(container) {
  const plans = plansFor(state.carrier);
  const featured = plans.filter(p => p.featured);
  const showAll = container.dataset.showAll === "1";
  const list = showAll ? plans : (featured.length ? featured : plans);

  container.innerHTML = `
    <h2 class="step-title">요금제를 선택해 주세요</h2>
    <p class="step-sub">대표 요금제를 우선 보여드려요. 더 많은 요금제도 볼 수 있어요.</p>
    <div class="option-list" id="plan-list"></div>
    ${!showAll && featured.length < plans.length ? `<button class="btn ghost" id="show-all-plans" style="margin-top:12px">요금제 더보기</button>` : ""}`;

  $("#plan-list", container).innerHTML = list.map(p => `
    <button class="opt-row ${state.planId === p.id ? "selected" : ""}" data-id="${p.id}">
      <div class="row-check">✓</div>
      <div class="row-main">
        <div class="row-name">${p.name}</div>
        <div class="row-sub">${p.dataDesc || ""}</div>
      </div>
      <div class="row-price">월 ${won(p.fee)}원</div>
    </button>`).join("");

  $$(".opt-row", container).forEach(row => row.addEventListener("click", () => {
    state.planId = row.dataset.id;
    goNext();
  }));
  const showAllBtn = $("#show-all-plans", container);
  if (showAllBtn) showAllBtn.addEventListener("click", () => {
    container.dataset.showAll = "1";
    renderPlanStep(container);
  });
  stepNav(container, { back: true });
}

function renderSupportStep(container) {
  const p = state.data.policy;
  const canCompare = state.planId && p.allowSubsidy && p.allowSelect;
  let cheaper = null;
  if (canCompare) {
    const subsidyTotal = quickTotal("subsidy");
    const selectTotal = quickTotal("select");
    cheaper = subsidyTotal <= selectTotal ? "subsidy" : "select";
  }
  const opts = [
    p.allowSubsidy && { v: "subsidy", icon: "🏷️", name: "공시지원금", desc: "기기값을 할인받는 방식" },
    p.allowSelect && { v: "select", icon: "📄", name: "선택약정", desc: `요금 ${Math.round(p.selectDiscountRate * 100)}% 할인받는 방식` }
  ].filter(Boolean);

  container.innerHTML = `
    <h2 class="step-title">지원 방식을 선택해 주세요</h2>
    <p class="step-sub">둘 중 하나만 선택할 수 있어요.</p>
    <div class="option-grid cols-2" id="support-opts"></div>`;
  $("#support-opts", container).innerHTML = opts.map(o => `
    <button class="opt-card ${state.support === o.v ? "selected" : ""}" data-v="${o.v}">
      ${cheaper === o.v ? `<span class="opt-badge">추천</span>` : ""}
      <div class="opt-icon">${o.icon}</div>
      <div class="opt-name">${o.name}</div>
      <div class="opt-desc">${o.desc}</div>
    </button>`).join("");
  $$(".opt-card", container).forEach(btn => btn.addEventListener("click", () => {
    state.support = btn.dataset.v;
    goNext();
  }));
  stepNav(container, { back: true });
}

function renderAddonsStep(container) {
  const list = addonsFor(state.carrier);
  container.innerHTML = `
    <h2 class="step-title">부가서비스를 선택해 주세요</h2>
    <p class="step-sub">가입하시면 매장 추가 지원금이 더해져 더 저렴해져요. (선택 안 해도 됩니다)</p>
    <div class="option-list" id="addon-list"></div>`;

  if (list.length === 0) {
    $("#addon-list", container).innerHTML = `<p class="addon-empty">선택 가능한 부가서비스가 없습니다.</p>`;
  } else {
    $("#addon-list", container).innerHTML = list.map(a => `
      <button class="addon-row ${state.addonIds.has(a.id) ? "checked" : ""}" data-id="${a.id}">
        <div class="row-check square">✓</div>
        <div class="row-main">
          <div class="row-name">${a.name}</div>
          <div class="row-sub">${a.requiredMonths}개월 이상 유지 시</div>
        </div>
        <div class="row-price">+${won(a.storeSubsidy)}원 할인</div>
      </button>`).join("");
  }

  $$(".addon-row", container).forEach(row => row.addEventListener("click", () => {
    const id = row.dataset.id;
    if (state.addonIds.has(id)) state.addonIds.delete(id); else state.addonIds.add(id);
    row.classList.toggle("checked");
    const priceEl = row.querySelector(".row-check");
    priceEl.textContent = "✓";
  }));
  stepNav(container, { back: true, onNext: goNext, nextLabel: "다음" });
}

function renderResultStep(container) {
  const r = calcResult();
  const months = state.data.policy.installmentMonths;

  container.innerHTML = `
    <div class="result-hero">
      <div class="r-label">월 예상 납부액</div>
      <div class="r-amount">${won(r.monthlyTotal)}<small> 원</small></div>
    </div>
    <div class="result-summary">
      <div>
        <div class="sum-name">${r.model.name} ${r.model.storage}</div>
        <div class="sum-sub">${CARRIERS[state.carrier].name} · ${r.plan.name} · ${state.joinType === "move" ? "번호이동" : "기기변경"} · ${state.support === "subsidy" ? "공시지원금" : "선택약정"}</div>
      </div>
    </div>
    <div class="months-seg" id="months-seg">
      ${months.map(m => `<button data-m="${m}" class="${state.months === m ? "on" : ""}">${m}개월</button>`).join("")}
    </div>
    <div class="result-lines">
      <div class="r-line"><span>출고가</span><span>${won(r.model.price)}원</span></div>
      <div class="r-line"><span>총 할인 (지원금+매장혜택${r.addonTotal ? "+부가서비스" : ""})</span><span>- ${won(r.discount)}원</span></div>
      <div class="r-line"><span>할부원금</span><span>${won(r.principal)}원</span></div>
      <div class="r-line"><span>월 기기 할부금</span><span>${won(r.monthlyDevice)}원</span></div>
      <div class="r-line"><span>월 요금제</span><span>${won(r.planFee)}원</span></div>
      <div class="r-line strong"><span>월 총 납부액</span><span>${won(r.monthlyTotal)}원</span></div>
    </div>
    <p class="result-note">※ 부가세 포함 예상 금액이며, 실제 조건은 상담 시 확정됩니다.</p>
    <div class="result-cta">
      <a class="call" href="tel:${STORE.phoneDigits}">📞 이 조건으로 전화상담</a>
      <a class="kakao" href="${STORE.kakaoUrl}" target="_blank" rel="noopener">💬 카카오톡으로 상담하기</a>
      <button class="restart" id="btn-restart">처음부터 다시 하기</button>
    </div>`;

  $$("#months-seg button", container).forEach(b => b.addEventListener("click", () => {
    state.months = +b.dataset.m;
    renderResultStep(container);
  }));
  $("#btn-restart", container).addEventListener("click", restart);
}

initHeader();
