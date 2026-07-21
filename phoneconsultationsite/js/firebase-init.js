/* =========================================================
 * Firebase 연결 설정
 * -----------------------------------------------------------
 * README.md의 "Firebase 설정하기" 순서를 먼저 따라 하신 뒤,
 * 아래 firebaseConfig 값 6개를 본인 프로젝트 값으로 바꿔주세요.
 * (Firebase 콘솔 > 프로젝트 설정(톱니바퀴) > 일반 > 내 앱 > SDK 설정 및 구성)
 *
 * 이 값을 채우기 전까지는 이 사이트가 "로컬 임시 저장" 모드로 동작합니다.
 * (관리자 페이지에서 저장해도 이 브라우저에서만 보이고, 다른 손님에게는
 *  반영되지 않습니다. Firebase 연결 전까지 테스트 용도로만 사용하세요.)
 * ========================================================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";
const LOCAL_KEY = "phoneSiteData_v1";
const FIREBASE_SDK_VERSION = "10.14.1";

let _fbPromise = null;

function loadFirebase() {
  if (!FIREBASE_CONFIGURED) return Promise.resolve(null);
  if (_fbPromise) return _fbPromise;

  _fbPromise = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [{ initializeApp }, firestoreMod, authMod] = await Promise.all([
      import(/* webpackIgnore: true */ `${base}/firebase-app.js`),
      import(/* webpackIgnore: true */ `${base}/firebase-firestore.js`),
      import(/* webpackIgnore: true */ `${base}/firebase-auth.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    const db = firestoreMod.getFirestore(app);
    const auth = authMod.getAuth(app);
    try {
      await authMod.signInAnonymously(auth);
    } catch (e) {
      console.warn("[firebase] 익명 로그인 실패 — Firebase 콘솔에서 Authentication > Sign-in method > 익명 을 사용 설정했는지 확인하세요.", e);
    }
    return { app, db, firestoreMod };
  })();

  return _fbPromise;
}

/* 실시간 구독. callback(data|null) 형태로 호출됩니다.
 * 반환값은 구독 해제 함수입니다. */
async function subscribeSiteData(callback) {
  const fb = await loadFirebase();
  if (!fb) {
    const saved = localStorage.getItem(LOCAL_KEY);
    callback(saved ? JSON.parse(saved) : null);
    return () => {};
  }
  const ref = fb.firestoreMod.doc(fb.db, "config", "site");
  return fb.firestoreMod.onSnapshot(
    ref,
    snap => callback(snap.exists() ? snap.data() : null),
    err => {
      console.error("[firebase] 데이터 구독 오류", err);
      callback(null);
    }
  );
}

async function getSiteDataOnce() {
  const fb = await loadFirebase();
  if (!fb) {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : null;
  }
  const ref = fb.firestoreMod.doc(fb.db, "config", "site");
  const snap = await fb.firestoreMod.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function saveSiteData(data) {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  const fb = await loadFirebase();
  if (!fb) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
    return { ok: true, mode: "local" };
  }
  const ref = fb.firestoreMod.doc(fb.db, "config", "site");
  await fb.firestoreMod.setDoc(ref, payload);
  return { ok: true, mode: "firebase" };
}

export { FIREBASE_CONFIGURED, subscribeSiteData, getSiteDataOnce, saveSiteData };
