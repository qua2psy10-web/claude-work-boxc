/** 構造寸法 */
export interface Dimensions {
  B0: number;   // 内幅 (mm) — 各セルの内幅
  H0: number;   // 内高 (mm)
  t1: number;   // 頂版厚 (mm)
  t2: number;   // 底版厚 (mm)
  t3: number;   // 左側壁厚 (mm)
  t4: number;   // 右側壁厚 (mm)
  haunch: number; // ハンチ寸法 (mm)
  numCells: number;  // 連数 (1, 2, 3)
  midWallThicknesses: number[];  // 中壁厚 (mm)、length = numCells - 1
}

/** 土被り・舗装 */
export interface CoverSoil {
  soilDepth: number;   // 土被り高 (m)
  pavementThick: number; // 舗装厚 (m)
}

/** RCコンクリート材料 */
export interface RCConcrete {
  sigma_ck: number;   // 設計基準強度 (N/mm²)
  Ec: number;         // ヤング係数 (N/mm²)
  sigma_ca: number;   // 許容曲げ圧縮応力度
  tau_a1: number;     // 許容せん断応力度（コンクリートのみ）
  tau_a2: number;     // 許容せん断応力度（斜引張鉄筋と共同）
  f_cd: number;       // 設計圧縮強度
}

/** 鉄筋 */
export interface Rebar {
  grade: string;     // SD345 etc.
  sigma_sa: number;  // 許容引張応力度
  sigma_sa_c: number;// 許容圧縮応力度
  sigma_sy: number;  // 設計降伏強度
}

/** 鉄筋配置（1m幅あたり） */
export interface RebarArrangement {
  diameter: number;  // 鉄筋径 (mm): 13, 16, 19, 22, 25
  count: number;     // 本数 (本/m)
}

/** 部材の鉄筋配置 */
export interface MemberRebar {
  outer: RebarArrangement;  // 外側（引張側）鉄筋
  inner: RebarArrangement;  // 内側（圧縮側）鉄筋
}

/** 単位重量 */
export interface UnitWeights {
  gamma_c: number;  // 躯体 (kN/m³)
  gamma_w: number;  // 水 (kN/m³)
  gamma_a: number;  // 舗装 (kN/m³)
  gamma_s: number;  // 土砂 (kN/m³)
}

/** 土圧係数 */
export interface EarthPressure {
  alpha: number;  // 鉛直土圧係数
  Ko_left: number;  // 水平土圧係数（左）
  Ko_right: number; // 水平土圧係数（右）
}

/** 水位 */
export interface WaterLevel {
  outer: number;  // 外水位 (m) 底版下面から
  inner: number;  // 内水位 (m) 底版上面から
}

/** 鉄筋かぶり */
export interface Cover {
  top_upper: number;    // 頂版上側 (cm)
  top_lower: number;    // 頂版下側 (cm)
  bottom_upper: number; // 底版上側 (cm)
  bottom_lower: number; // 底版下側 (cm)
  left_outer: number;   // 左側壁外側 (cm)
  left_inner: number;   // 左側壁内側 (cm)
  right_outer: number;  // 右側壁外側 (cm)
  right_inner: number;  // 右側壁内側 (cm)
}

/** 活荷重条件 */
export interface LiveLoadCondition {
  P: number;       // 輪荷重 (kN)
  i: number;       // 衝撃係数
  beta: number;    // 低減係数
  D0: number;      // 接地幅 (m)
  wl: number;      // 側圧用等分布荷重 (kN/m²)
}

/** 断面力計算条件 */
export interface AnalysisCondition {
  considerBuoyancy: boolean;   // 浮力考慮
  liveLoadPosition: string;    // 活荷重分布作用位置
  ignoreBottomSelfWeight: boolean; // 底版自重無視
}

/** 設計条件全体 */
export interface DesignInput {
  dimensions: Dimensions;
  coverSoil: CoverSoil;
  rcConcrete: RCConcrete;
  rebar: Rebar;
  unitWeights: UnitWeights;
  earthPressure: EarthPressure;
  waterLevel: WaterLevel;
  cover: Cover;
  liveLoad: LiveLoadCondition;
  analysis: AnalysisCondition;
  roadSurfaceLoad: number; // 路面上載荷重 (kN/m²)
  rebarLayout: {
    topSlab: MemberRebar;     // 頂版
    bottomSlab: MemberRebar;  // 底版
    leftWall: MemberRebar;    // 左側壁
    rightWall: MemberRebar;   // 右側壁
    midWalls: MemberRebar[];  // 中壁 (length = numCells - 1)
  };
}

/** 外力集計行 */
export interface ForceRow {
  label: string;
  V: number;   // 鉛直力 (kN/m)
  H: number;   // 水平力 (kN/m)
  x: number;   // 作用点x (m)
  y: number;   // 作用点y (m)
  M: number;   // モーメント (kN·m/m)
}

/** 死荷重計算結果 */
export interface DeadLoadResult {
  selfWeight: {
    topSlab: number;    // 頂版自重 (kN/m²)
    leftWall: number;   // 左側壁自重 (kN/m)
    rightWall: number;  // 右側壁自重 (kN/m)
    bottomSlab: number; // 底版自重 (kN/m²)
    midWalls: number[]; // 中壁自重 (kN/m) per wall
  };
  surcharge: number;      // 上載荷重 (kN/m²)
  earthPressure: {
    left: { p1: number; p2: number; p3: number; p4: number };
    right: { p1: number; p2: number; p3: number; p4: number };
  };
  waterPressure: {
    outer: {
      pw_topAxis: number;
      pw_botAxis: number;
      uplift: number;
    };
    inner: {
      pw_topAxis: number;
      pw_botAxis: number;
      weight: number;
    };
  };
  forces: ForceRow[];
  totalV: number;
  totalM: number;
  groundReaction: { qLeft: number; qRight: number };
  eccentricity: number;
}

/** 活荷重計算結果 */
export interface LiveLoadResult {
  Pl_i: number;
  Pvl: number;
  forces: ForceRow[];
  totalV: number;
  totalM: number;
  groundReaction: { qLeft: number; qRight: number };
}

/** 部材断面力（照査点ごと） */
export interface MemberForces {
  leftEnd: { M: number; N: number; S: number };
  haunchLeft: { M: number; N: number; S: number };
  d2Left: { M: number; N: number; S: number };
  midspan: { M: number; N: number; S: number };
  d2Right: { M: number; N: number; S: number };
  haunchRight: { M: number; N: number; S: number };
  rightEnd: { M: number; N: number; S: number };
}

/** ケースごとの全部材断面力（多連対応） */
export interface CaseForces {
  topSlabs: MemberForces[];
  bottomSlabs: MemberForces[];
  walls: MemberForces[];
}

/** 旧互換: 1連用アクセサ */
export function cfTopSlab(cf: CaseForces): MemberForces { return cf.topSlabs[0]; }
export function cfBottomSlab(cf: CaseForces): MemberForces { return cf.bottomSlabs[0]; }
export function cfLeftWall(cf: CaseForces): MemberForces { return cf.walls[0]; }
export function cfRightWall(cf: CaseForces): MemberForces { return cf.walls[cf.walls.length - 1]; }

/** RC応力度照査結果（1照査点） */
export interface RCStressCheckPoint {
  M: number;
  N: number;
  b: number;
  h: number;
  d: number;
  As: number;     // 引張鉄筋量 mm²
  sigma_c: number;
  sigma_s: number;
  sigma_ca: number;
  sigma_sa: number;
  x: number;   // 中立軸 cm
  ok_c: boolean;
  ok_s: boolean;
  caseNo: number;
}

/** せん断応力度照査結果 */
export interface ShearCheckPoint {
  S: number;
  d: number;
  tau: number;
  tau_ca: number;
  k: number;
  ok: boolean;
  location: string;
  caseNo: number;
  L: number;
}

/** 破壊安全度照査結果 */
export interface SafetyCheckResult {
  Md: number;     // 設計曲げモーメント
  Nd: number;     // 設計軸力
  Mu: number;     // 曲げ耐力
  ratio: number;  // Mu/Md
  ok: boolean;
  caseLabel: string;
}

/** 全計算結果 */
export interface CalcResults {
  deadLoad: DeadLoadResult;
  liveLoad1: LiveLoadResult;
  liveLoad2: LiveLoadResult;
  sectionForces: {
    stress: CaseForces[];
    safety1: CaseForces[];
    safety2: CaseForces[];
    safety3: CaseForces[];
  };
  stressCheck?: {
    bending: Record<string, RCStressCheckPoint[]>;
    shear: ShearCheckPoint[];
  };
  rebarCheck?: unknown;   // RebarCheckResult[] from rebarCheck.ts
  safetyCheck?: Record<string, SafetyCheckResult[]>;
}
