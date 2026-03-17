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

/** プレストレストコンクリート材料 */
export interface PCConcrete {
  sigma_ck: number;   // 設計基準強度 (N/mm²)
  Ec: number;         // ヤング係数 (N/mm²)
  psi: number;        // クリープ係数
  eps_s: number;      // 乾燥収縮度
  sigma_ca_general_dead: number;   // 許容曲げ圧縮応力度 一般部 死荷重時
  sigma_ca_general_design: number; // 許容曲げ圧縮応力度 一般部 設計荷重時
  sigma_ca_haunch_dead: number;    // 隅角部ハンチ有 死荷重時
  sigma_ca_haunch_design: number;  // 隅角部ハンチ有 設計荷重時
  sigma_ca_nohaunch_dead: number;  // 隅角部ハンチ無 死荷重時
  sigma_ca_nohaunch_design: number;// 隅角部ハンチ無 設計荷重時
  sigma_ta_dead: number;  // 許容曲げ引張応力度 死荷重時
  sigma_ta_design: number;// 許容曲げ引張応力度 設計荷重時
  tau_a1: number;    // 許容せん断応力度（コンクリートのみ）
  tau_a2: number;    // 許容せん断応力度（斜引張鉄筋と共同）
}

/** RC コンクリート材料 */
export interface RCConcrete {
  sigma_ck: number;
  Ec: number;
  sigma_ca_general: number;
  sigma_ca_haunch: number;
  sigma_ca_nohaunch: number;
  tau_a1: number;
  tau_a2: number;
  f_cd: number; // 設計圧縮強度
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

/** PC鋼棒 */
export interface PCSteel {
  name: string;
  sigma_pu: number;  // 引張応力度
  sigma_py: number;  // 降伏点強度
  sigma_pt: number;  // プレストレッシング直後の引張応力度
  Ap: number;        // 断面積 (mm²)
  gamma: number;     // リラクセーション率 (%)
  Ep: number;        // ヤング係数 (N/mm²)
  N: number;         // 本数
  e: number;         // 偏心量 (mm)
  L: number;         // ブロック長 (m)
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
  pcConcrete: PCConcrete;
  rcConcrete: RCConcrete;
  rebar: Rebar;
  pcSteel_top: PCSteel;
  pcSteel_bottom: PCSteel;
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
    left: { p1: number; p2: number; p3: number; p4: number };  // 各着目位置の土圧
    right: { p1: number; p2: number; p3: number; p4: number };
  };
  waterPressure: {
    outer: {
      pw_topAxis: number;  // 頂版軸線位置の外水圧 (kN/m²)
      pw_botAxis: number;  // 底版軸線位置の外水圧 (kN/m²)
      uplift: number;      // 底版揚圧力 (kN/m²)
    };
    inner: {
      pw_topAxis: number;  // 頂版軸線位置の内水圧 (kN/m²)
      pw_botAxis: number;  // 底版軸線位置の内水圧 (kN/m²)
      weight: number;      // 内水重量 (kN/m²)
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
  Pl_i: number;    // BOX縦方向単位長さ当りの活荷重
  Pvl: number;     // 換算等分布活荷重
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
  topSlabs: MemberForces[];     // 頂版 (length = numCells)
  bottomSlabs: MemberForces[];  // 底版 (length = numCells)
  walls: MemberForces[];        // 壁 (length = numCells + 1: 左壁, 中壁..., 右壁)
}

/** 旧互換: 1連用アクセサ */
export function cfTopSlab(cf: CaseForces): MemberForces { return cf.topSlabs[0]; }
export function cfBottomSlab(cf: CaseForces): MemberForces { return cf.bottomSlabs[0]; }
export function cfLeftWall(cf: CaseForces): MemberForces { return cf.walls[0]; }
export function cfRightWall(cf: CaseForces): MemberForces { return cf.walls[cf.walls.length - 1]; }

/** 有効プレストレス結果 */
export interface PrestressResult {
  Pt: number;           // 初期引張力
  delta_sigma_pr: number; // リラクセーション減少量
  delta_sigma_ppsi: number; // クリープ・乾燥収縮減少量
  sigma_pe: number;     // 有効引張応力度
  Pe: number;           // 有効引張力
  Ap_per_m: number;     // 単位幅当りPC鋼棒断面積
}

/** 応力度照査結果（1照査点） */
export interface StressCheckPoint {
  M: number;
  N: number;
  Pe: number;
  b: number;
  h: number;
  Ac: number;
  Zc: number;
  e: number;
  sigma_c: number;   // 圧縮応力度
  sigma_t: number;   // 引張応力度
  sigma_ca: number;  // 許容圧縮応力度
  sigma_ta: number;  // 許容引張応力度
  ok_c: boolean;
  ok_t: boolean;
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

/** RC部材応力度照査結果 */
export interface RCStressCheckPoint {
  M: number;
  N: number;
  b: number;
  h: number;
  d: number;
  sigma_c: number;
  sigma_s: number;
  sigma_ca: number;
  sigma_sa: number;
  x: number;   // 中立軸
  ok_c: boolean;
  ok_s: boolean;
}

/** 引張鉄筋量照査結果 */
export interface RebarCheckResult {
  M: number;
  N: number;
  Pe: number;
  T: number;
  e_pc: number;
  Ac: number;
  Zc: number;
  sigma_c: number;
  sigma_t: number;
  x: number;
  As1: number;
  As2: number;
  As: number;
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
    stress: CaseForces[];          // 応力度照査用 3ケース
    rebar: CaseForces[];           // 引張鉄筋量照査用 3ケース
    safety1: CaseForces[];         // 破壊安全度照査用-1 3ケース
    safety2: CaseForces[];         // 破壊安全度照査用-2 3ケース
    safety3: CaseForces[];         // 破壊安全度照査用-3 3ケース
  };
  prestress: {
    top: PrestressResult;
    bottom: PrestressResult;
  };
  stressCheck?: {
    pc_dead: Record<string, StressCheckPoint[]>;
    pc_design: Record<string, StressCheckPoint[]>;
    pc_shear_dead: ShearCheckPoint[];
    pc_shear_design: ShearCheckPoint[];
    rc: Record<string, RCStressCheckPoint[]>;
    rc_shear: ShearCheckPoint[];
  };
  rebarCheck?: Record<string, RebarCheckResult>;
  safetyCheck?: {
    pc: Record<string, SafetyCheckResult[]>;
    rc: Record<string, SafetyCheckResult[]>;
  };
}
