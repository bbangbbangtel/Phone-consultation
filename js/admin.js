/* =========================================================
 * 관리자 페이지 로직
 * - 비밀번호 확인 (SHA-256 해시 비교)
 * - 엑셀 업로드 → 파싱 → 미리보기 → Firebase 저장
 * ========================================================= */
import { saveSiteData, getSiteDataOnce } from "./firebase-init.js";

const $ = (sel, el = document) => el.querySelector(sel);
const won = n => Math.round(n).toLocaleString("ko-KR");

/* -----------------------------------------------------------
 * 관리자 비밀번호
 * 기본 비밀번호는 "gonggu2026" 입니다. 반드시 바꿔서 사용하세요.
 * 바꾸는 방법: 새 비밀번호의 SHA-256 해시값을 구해서 아래 상수에 넣으면 됩니다.
 * 브라우저 콘솔(F12)에서 아래 코드를 실행하면 해시값이 나옵니다.
 *
 *   const pw = "새비밀번호";
 *   const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
 *   console.log([...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""));
 * --------------------------------------------------------- */
const ADMIN_PASSWORD_HASH = "c1d3b696e07fd6bb5856d680adbdb373e85097bdf64cc5bae3a4387e8e540607";
const SESSION_KEY = "adminGateOk_v1";

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function tryLogin(pw) {
  const hash = await sha256(pw);
  if (hash === ADMIN_PASSWORD_HASH) {
    sessionStorage.setItem(SESSION_KEY, "1");
    showAdmin();
    return true;
  }
  return false;
}

function showAdmin() {
  $("#gate-box").hidden = true;
  $("#admin-wrap").hidden = false;
  loadCurrent();
}

function initGate() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") { showAdmin(); return; }
  $("#gate-submit").addEventListener("click", submit);
  $("#gate-input").addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  async function submit() {
    const ok = await tryLogin($("#gate-input").value);
    if (!ok) $("#gate-error").textContent = "비밀번호가 올바르지 않습니다.";
  }
  $("#btn-logout").addEventListener("click", e => {
    e.preventDefault();
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

/* ---------- 현재 적용된 데이터 표시 ---------- */
async function loadCurrent() {
  try {
    const data = await getSiteDataOnce();
    if (data && data.updatedAt) {
      const d = new Date(data.updatedAt);
      $("#admin-updated").textContent = `마지막 적용: ${d.toLocaleString("ko-KR")} · 기종 ${data.models?.length || 0}개 · 요금제 ${data.plans?.length || 0}개`;
    } else {
      $("#admin-updated").textContent = "아직 적용된 데이터가 없습니다. (현재는 임시 데모 데이터로 보여지고 있어요)";
    }
  } catch (e) {
    $("#admin-updated").textContent = "현재 데이터를 불러오지 못했습니다.";
  }
}

/* ---------- 엑셀 업로드 ---------- */
let parsedData = null;

function initUpload() {
  const drop = $("#drop-zone");
  const input = $("#file-input");
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", () => {
    if (input.files[0]) handleFile(input.files[0]);
  });
}

function handleFile(file) {
  $("#drop-label").textContent = `📄 ${file.name}`;
  $("#parse-msg").innerHTML = "";
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const data = parseWorkbook(wb);
      parsedData = data;
      $("#parse-msg").innerHTML = `<div class="admin-msg ok">파일을 확인했습니다. 아래 내용을 검토한 뒤 적용해주세요.</div>`;
      renderPreview(data);
    } catch (err) {
      parsedData = null;
      $("#preview-card").hidden = true;
      $("#parse-msg").innerHTML = `<div class="admin-msg err">⚠️ ${err.message}</div>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ---------- 엑셀 파싱 ---------- */
function normCarrier(v) {
  const s = String(v || "").toUpperCase().replace(/\s/g, "");
  if (s.includes("SK")) return "SKT";
  if (s.includes("KT")) return "KT";
  if (s.includes("LG")) return "LG";
  return null;
}
function yn(v, def = true) {
  if (v === undefined || v === null || v === "") return def;
  const s = String(v).trim().toUpperCase();
  return s === "Y" || s === "YES" || s === "TRUE" || s === "1" || s === "예";
}
function num(v, def = 0) {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(String(v).replace(/,/g, "").trim());
  return isNaN(n) ? def : n;
}
function slugify(s) {
  return String(s).toLowerCase().replace(/[^\w가-힣]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseWorkbook(wb) {
  const sheetPolicy = wb.Sheets["정책"];
  const sheetModels = wb.Sheets["기종"];
  const sheetPlans = wb.Sheets["요금제"];
  const sheetAddons = wb.Sheets["부가서비스"];

  if (!sheetPolicy || !sheetModels || !sheetPlans) {
    throw new Error("엑셀 파일에 '정책', '기종', '요금제' 시트가 모두 있어야 합니다. 서식 파일을 다시 받아서 사용해주세요.");
  }

  const policyRows = XLSX.utils.sheet_to_json(sheetPolicy, { header: 1 });
  const policyMap = {};
  policyRows.slice(1).forEach(row => {
    if (!row || !row[0]) return;
    policyMap[String(row[0]).trim()] = row[1];
  });
  const policy = {
    allowMove: yn(policyMap["번호이동 가능(Y/N)"]),
    allowChg: yn(policyMap["기기변경 가능(Y/N)"]),
    allowSubsidy: yn(policyMap["공시지원금 가능(Y/N)"]),
    allowSelect: yn(policyMap["선택약정 가능(Y/N)"]),
    moveExtra: num(policyMap["번호이동 추가지원금(원)"]),
    chgExtra: num(policyMap["기기변경 추가지원금(원)"]),
    selectDiscountRate: num(policyMap["선택약정 할인율(%)"], 25) / 100,
    interestRate: num(policyMap["할부 연이자율(%)"], 5.9) / 100,
    installmentMonths: String(policyMap["할부개월(콤마구분)"] || "24,30,36")
      .split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
  };
  if (!policy.allowMove && !policy.allowChg) { policy.allowMove = true; policy.allowChg = true; }
  if (!policy.allowSubsidy && !policy.allowSelect) { policy.allowSubsidy = true; policy.allowSelect = true; }
  if (policy.installmentMonths.length === 0) policy.installmentMonths = [24, 30, 36];

  const modelRows = XLSX.utils.sheet_to_json(sheetModels, { defval: "" });
  const models = [];
  modelRows.forEach((row, i) => {
    const name = String(row["기종명"] || "").trim();
    if (!name) return;
    if (!yn(row["오늘판매(Y/N)"])) return;
    const storage = String(row["용량"] || "").trim();
    const subsidy = {
      SKT: row["SKT공시"] === "" ? null : num(row["SKT공시"]),
      KT: row["KT공시"] === "" ? null : num(row["KT공시"]),
      LG: row["LGU+공시"] === "" ? null : num(row["LGU+공시"])
    };
    models.push({
      id: slugify(name + "-" + storage) || ("model-" + i),
      name, storage, price: num(row["출고가"]),
      category: String(row["카테고리"] || "").trim() || "기타",
      subsidy
    });
  });

  const planRows = XLSX.utils.sheet_to_json(sheetPlans, { defval: "" });
  const plans = [];
  planRows.forEach((row, i) => {
    const carrier = normCarrier(row["통신사"]);
    const name = String(row["요금제명"] || "").trim();
    if (!carrier || !name) return;
    plans.push({
      id: slugify(carrier + "-" + name) || ("plan-" + i),
      carrier, name, fee: num(row["월정액"]),
      dataDesc: String(row["데이터설명"] || "").trim(),
      featured: yn(row["대표요금제(Y/N)"], false)
    });
  });

  const addons = [];
  if (sheetAddons) {
    const addonRows = XLSX.utils.sheet_to_json(sheetAddons, { defval: "" });
    addonRows.forEach((row, i) => {
      const carrier = normCarrier(row["통신사"]);
      const name = String(row["서비스명"] || "").trim();
      if (!carrier || !name) return;
      addons.push({
        id: slugify(carrier + "-" + name) || ("addon-" + i),
        carrier, name,
        requiredMonths: num(row["유지개월"]),
        storeSubsidy: num(row["매장지원금"])
      });
    });
  }

  if (models.length === 0) throw new Error("'기종' 시트에 오늘 판매하는 기종이 없습니다. 오늘판매(Y/N) 열을 확인해주세요.");
  if (plans.length === 0) throw new Error("'요금제' 시트에 유효한 요금제가 없습니다.");

  return { policy, models, plans, addons };
}

/* ---------- 미리보기 ---------- */
function renderPreview(data) {
  $("#preview-card").hidden = false;
  const carrierName = { SKT: "SKT", KT: "KT", LG: "LGU+" };

  const policyRows = [
    ["번호이동", data.policy.allowMove ? "가능" : "불가"],
    ["기기변경", data.policy.allowChg ? "가능" : "불가"],
    ["공시지원금", data.policy.allowSubsidy ? "가능" : "불가"],
    ["선택약정", data.policy.allowSelect ? "가능" : "불가"],
    ["번호이동 추가지원금", won(data.policy.moveExtra) + "원"],
    ["기기변경 추가지원금", won(data.policy.chgExtra) + "원"],
    ["선택약정 할인율", Math.round(data.policy.selectDiscountRate * 100) + "%"],
    ["할부 연이자율", (data.policy.interestRate * 100).toFixed(1) + "%"],
    ["할부개월", data.policy.installmentMonths.join(", ") + "개월"]
  ];

  $("#preview-body").innerHTML = `
    <h4 style="font-size:13.5px;margin-bottom:6px">정책</h4>
    <div class="preview-scroll"><table class="preview-table">
      ${policyRows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}
    </table></div>

    <h4 style="font-size:13.5px;margin:16px 0 6px">기종 (${data.models.length}개)</h4>
    <div class="preview-scroll"><table class="preview-table">
      <tr><th>기종명</th><th>용량</th><th>출고가</th><th>카테고리</th><th>SKT</th><th>KT</th><th>LGU+</th></tr>
      ${data.models.map(m => `<tr>
        <td>${m.name}</td><td>${m.storage}</td><td>${won(m.price)}</td><td>${m.category}</td>
        <td>${m.subsidy.SKT != null ? won(m.subsidy.SKT) : "-"}</td>
        <td>${m.subsidy.KT != null ? won(m.subsidy.KT) : "-"}</td>
        <td>${m.subsidy.LG != null ? won(m.subsidy.LG) : "-"}</td>
      </tr>`).join("")}
    </table></div>

    <h4 style="font-size:13.5px;margin:16px 0 6px">요금제 (${data.plans.length}개)</h4>
    <div class="preview-scroll"><table class="preview-table">
      <tr><th>통신사</th><th>요금제명</th><th>월정액</th><th>대표</th></tr>
      ${data.plans.map(p => `<tr><td>${carrierName[p.carrier]}</td><td>${p.name}</td><td>${won(p.fee)}</td><td>${p.featured ? "★" : ""}</td></tr>`).join("")}
    </table></div>

    <h4 style="font-size:13.5px;margin:16px 0 6px">부가서비스 (${data.addons.length}개)</h4>
    <div class="preview-scroll"><table class="preview-table">
      <tr><th>통신사</th><th>서비스명</th><th>유지개월</th><th>매장지원금</th></tr>
      ${data.addons.map(a => `<tr><td>${carrierName[a.carrier]}</td><td>${a.name}</td><td>${a.requiredMonths}</td><td>${won(a.storeSubsidy)}</td></tr>`).join("") || `<tr><td colspan="4">없음</td></tr>`}
    </table></div>`;
}

function initApply() {
  $("#btn-apply").addEventListener("click", async () => {
    if (!parsedData) return;
    const btn = $("#btn-apply");
    btn.disabled = true; btn.textContent = "적용 중…";
    try {
      const result = await saveSiteData(parsedData);
      $("#apply-msg").innerHTML = result.mode === "firebase"
        ? `<div class="admin-msg ok">✅ 적용되었습니다. 잠시 후 모든 고객 화면에 반영됩니다.</div>`
        : `<div class="admin-msg ok">✅ 이 브라우저에 저장되었습니다. (Firebase 미연결 — README를 참고해 연결하면 모든 손님에게 반영됩니다)</div>`;
      loadCurrent();
    } catch (e) {
      console.error(e);
      $("#apply-msg").innerHTML = `<div class="admin-msg err">⚠️ 적용에 실패했습니다: ${e.message}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "이 내용으로 사이트에 적용하기";
    }
  });
}

initGate();
initUpload();
initApply();
