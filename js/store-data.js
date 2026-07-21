/* =========================================================
 * 매장 정보 + 기본(데모) 데이터
 * - STORE: 매장 고정 정보. 여기만 고치면 전체 사이트에 반영됩니다.
 * - DEMO_SITE_DATA: Firebase 연결 전이거나, 아직 관리자가 한 번도
 *   엑셀을 올리지 않았을 때 화면에 보여줄 임시 데이터입니다.
 *   실제 운영 중에는 관리자 페이지에서 엑셀을 올리면 이 값 대신
 *   Firebase에 저장된 실제 데이터가 표시됩니다.
 * ========================================================= */
"use strict";

const STORE = {
  siteName: "휴대폰싸게파는사람들",
  bizName: "공구폰(휴대폰싸게하는사람들)",
  phone: "010-4191-1918",
  phoneDigits: "01041911918",
  address: "광주광역시 광산구 장신로 134 1층 106호",
  kakaoUrl: "http://pf.kakao.com/_nQXxdn",
  prepaidUrl: "https://bbangbbangtel.github.io/Prepaid-mobile-landing",
  hours: "전화 문의 후 방문 추천 (영업시간 외에도 문자 남겨주시면 순차 연락드립니다)"
};

const CARRIERS = {
  SKT: { name: "SK텔레콤", short: "SKT", color: "#ea1917" },
  KT: { name: "KT", short: "KT", color: "#f04e23" },
  LG: { name: "LG U+", short: "LGU+", color: "#e6007e" }
};

/* subsidy 값이 null 이면 그 통신사에서는 판매하지 않는 기종으로 처리됩니다. */
const DEMO_SITE_DATA = {
  updatedAt: null,
  policy: {
    allowMove: true,
    allowChg: true,
    allowSubsidy: true,
    allowSelect: true,
    moveExtra: 150000,
    chgExtra: 70000,
    selectDiscountRate: 0.25,
    interestRate: 0.059,
    installmentMonths: [24, 30, 36]
  },
  models: [
    { id: "s26u", name: "갤럭시 S26 울트라", storage: "512G", price: 1798400, category: "프리미엄",
      subsidy: { SKT: 500000, KT: 480000, LG: 530000 } },
    { id: "s26p", name: "갤럭시 S26+", storage: "256G", price: 1354000, category: "프리미엄",
      subsidy: { SKT: 460000, KT: 440000, LG: 490000 } },
    { id: "s26", name: "갤럭시 S26", storage: "256G", price: 1155000, category: "프리미엄",
      subsidy: { SKT: 450000, KT: 430000, LG: 480000 } },
    { id: "fold7", name: "갤럭시 Z 폴드7", storage: "512G", price: 2238500, category: "프리미엄",
      subsidy: { SKT: 450000, KT: 430000, LG: 500000 } },
    { id: "flip7", name: "갤럭시 Z 플립7", storage: "256G", price: 1485000, category: "프리미엄",
      subsidy: { SKT: 480000, KT: 450000, LG: 520000 } },
    { id: "ip17pm", name: "아이폰17 프로맥스", storage: "512G", price: 2000000, category: "프리미엄",
      subsidy: { SKT: 300000, KT: 280000, LG: 330000 } },
    { id: "ip17p", name: "아이폰17 프로", storage: "256G", price: 1650000, category: "프리미엄",
      subsidy: { SKT: 300000, KT: 280000, LG: 330000 } },
    { id: "ip17", name: "아이폰17", storage: "256G", price: 1350000, category: "프리미엄",
      subsidy: { SKT: 280000, KT: 260000, LG: 300000 } },
    { id: "ip16e", name: "아이폰16e", storage: "128G", price: 899000, category: "가성비",
      subsidy: { SKT: 320000, KT: 300000, LG: 340000 } },
    { id: "s25fe", name: "갤럭시 S25 FE", storage: "128G", price: 799000, category: "가성비",
      subsidy: { SKT: 380000, KT: 360000, LG: 400000 } },
    { id: "a56", name: "갤럭시 A56", storage: "128G", price: 499400, category: "가성비",
      subsidy: { SKT: 350000, KT: 330000, LG: 380000 } },
    { id: "a36", name: "갤럭시 A36", storage: "128G", price: 399300, category: "가성비",
      subsidy: { SKT: 300000, KT: 300000, LG: 330000 } },
    { id: "a16", name: "갤럭시 A16", storage: "64G", price: 316800, category: "가성비",
      subsidy: { SKT: 280000, KT: 280000, LG: 300000 } },
    { id: "fold6", name: "갤럭시 Z 폴드6", storage: "512G", price: 1928200, category: "구모델특가",
      subsidy: { SKT: 550000, KT: 530000, LG: 580000 } },
    { id: "flip6", name: "갤럭시 Z 플립6", storage: "256G", price: 1319000, category: "구모델특가",
      subsidy: { SKT: 560000, KT: 540000, LG: 590000 } },
    { id: "quantum5", name: "갤럭시 퀀텀5", storage: "128G", price: 618200, category: "가성비",
      subsidy: { SKT: 400000, KT: null, LG: null } },
    { id: "buddy4", name: "갤럭시 버디4", storage: "128G", price: 396000, category: "가성비",
      subsidy: { SKT: null, KT: null, LG: 330000 } },
    { id: "wide7", name: "갤럭시 와이드7", storage: "128G", price: 356400, category: "효도폰",
      subsidy: { SKT: 300000, KT: 300000, LG: 320000 } },
    { id: "kids4", name: "키즈폰 무너 에디션", storage: "32G", price: 253000, category: "키즈폰",
      subsidy: { SKT: 200000, KT: 200000, LG: 220000 } },
    { id: "folder3", name: "갤럭시 폴더 시니어", storage: "32G", price: 297000, category: "효도폰",
      subsidy: { SKT: 250000, KT: 250000, LG: 260000 } }
  ],
  plans: [
    { id: "skt1", carrier: "SKT", name: "5GX 플래티넘", fee: 125000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "skt2", carrier: "SKT", name: "5GX 프라임", fee: 89000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "skt3", carrier: "SKT", name: "5GX 레귤러플러스", fee: 79000, dataDesc: "250GB + 5Mbps", featured: false },
    { id: "skt4", carrier: "SKT", name: "베이직플러스", fee: 49000, dataDesc: "11GB + 1Mbps", featured: false },
    { id: "kt1", carrier: "KT", name: "초이스 프리미엄", fee: 130000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "kt2", carrier: "KT", name: "초이스 베이직", fee: 90000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "kt3", carrier: "KT", name: "심플 110GB", fee: 69000, dataDesc: "110GB + 5Mbps", featured: false },
    { id: "kt4", carrier: "KT", name: "슬림플러스", fee: 49000, dataDesc: "10GB + 1Mbps", featured: false },
    { id: "lg1", carrier: "LG", name: "5G 시그니처", fee: 130000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "lg2", carrier: "LG", name: "5G 프리미어 에센셜", fee: 85000, dataDesc: "데이터 완전 무제한", featured: true },
    { id: "lg3", carrier: "LG", name: "5G 스탠다드", fee: 75000, dataDesc: "150GB + 5Mbps", featured: false },
    { id: "lg4", carrier: "LG", name: "5G 라이트+", fee: 55000, dataDesc: "12GB + 1Mbps", featured: false }
  ],
  addons: [
    { id: "skt-a1", carrier: "SKT", name: "T우주 패스", requiredMonths: 6, storeSubsidy: 30000 },
    { id: "skt-a2", carrier: "SKT", name: "ONE 멤버십 플러스", requiredMonths: 3, storeSubsidy: 15000 },
    { id: "kt-a1", carrier: "KT", name: "지니뮤직 이용권", requiredMonths: 6, storeSubsidy: 25000 },
    { id: "kt-a2", carrier: "KT", name: "밀리의서재", requiredMonths: 3, storeSubsidy: 15000 },
    { id: "lg-a1", carrier: "LG", name: "유독 결합", requiredMonths: 6, storeSubsidy: 30000 },
    { id: "lg-a2", carrier: "LG", name: "넷플릭스 결합", requiredMonths: 3, storeSubsidy: 20000 }
  ]
};

/* ES module 스크립트(js/wizard.js, js/admin.js)에서도 바로 쓸 수 있도록
 * window 전역에 명시적으로 붙여둡니다. */
window.STORE = STORE;
window.CARRIERS = CARRIERS;
window.DEMO_SITE_DATA = DEMO_SITE_DATA;
