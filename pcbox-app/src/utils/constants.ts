import { DesignInput } from '../types';

/** FORUM8 BOX123 参照PDFに基づくデフォルト入力値（RC構造） */
export const defaultInput: DesignInput = {
  dimensions: {
    B0: 4000,   // 内幅 4000mm
    H0: 3000,   // 内高 3000mm
    t1: 400,    // 頂版厚 400mm
    t2: 450,    // 底版厚 450mm
    t3: 350,    // 左側壁厚 350mm
    t4: 350,    // 右側壁厚 350mm
    haunch: 300, // ハンチ 300mm
    numCells: 1,
    midWallThicknesses: [],
  },
  coverSoil: {
    soilDepth: 2.000,     // 土被り高 2.0m
    pavementThick: 0.080, // 舗装厚 0.08m
  },
  rcConcrete: {
    sigma_ck: 24.0,
    Ec: 2.50e4,
    sigma_ca: 8.0,    // 許容曲げ圧縮応力度
    tau_a1: 0.23,     // 許容せん断応力度（コンクリートのみ）
    tau_a2: 0.90,     // 許容せん断応力度（斜引張鉄筋と共同）
    f_cd: 24.0,       // 設計圧縮強度
  },
  rebar: {
    grade: 'SD345',
    sigma_sa: 200.00,   // 許容引張応力度
    sigma_sa_c: 200.00, // 許容圧縮応力度
    sigma_sy: 345.0,    // 設計降伏強度
  },
  unitWeights: {
    gamma_c: 24.50,
    gamma_w: 10.00,
    gamma_a: 22.50,
    gamma_s: 19.00,
  },
  earthPressure: {
    alpha: 1.000,
    Ko_left: 0.500,
    Ko_right: 0.500,
  },
  waterLevel: {
    outer: 0.000,
    inner: 0.000,
  },
  cover: {
    top_upper: 7.0,    // 頂版上側かぶり (cm)
    top_lower: 7.0,    // 頂版下側かぶり (cm)
    bottom_upper: 7.0, // 底版上側かぶり (cm)
    bottom_lower: 7.0, // 底版下側かぶり (cm)
    left_outer: 7.0,   // 左側壁外側かぶり (cm)
    left_inner: 7.0,   // 左側壁内側かぶり (cm)
    right_outer: 7.0,  // 右側壁外側かぶり (cm)
    right_inner: 7.0,  // 右側壁内側かぶり (cm)
  },
  liveLoad: {
    P: 100.0,     // 輪荷重 100kN
    i: 0.300,     // 衝撃係数
    beta: 0.900,  // 低減係数
    D0: 0.200,    // 接地幅 0.20m
    wl: 10.00,    // 側圧用荷重 10kN/m²
  },
  analysis: {
    considerBuoyancy: false,
    liveLoadPosition: '頂版天端',
    ignoreBottomSelfWeight: true,
  },
  roadSurfaceLoad: 0.000,
  rebarLayout: {
    topSlab: {
      outer: { diameter: 22, count: 5 },   // D22 × 5本/m
      inner: { diameter: 16, count: 5 },   // D16 × 5本/m
    },
    bottomSlab: {
      outer: { diameter: 25, count: 5 },   // D25 × 5本/m
      inner: { diameter: 16, count: 5 },   // D16 × 5本/m
    },
    leftWall: {
      outer: { diameter: 19, count: 5 },   // D19 × 5本/m
      inner: { diameter: 16, count: 5 },   // D16 × 5本/m
    },
    rightWall: {
      outer: { diameter: 19, count: 5 },
      inner: { diameter: 16, count: 5 },
    },
    midWalls: [],
  },
};

/** 鉄筋径 → 1本あたりの断面積 (mm²) */
const REBAR_AREA: Record<number, number> = {
  10: 71.33,
  13: 126.7,
  16: 198.6,
  19: 286.5,
  22: 387.1,
  25: 506.7,
  29: 642.4,
  32: 794.2,
};

/** 鉄筋配置から断面積を計算 (mm²/m) */
export function calcRebarArea(diameter: number, count: number): number {
  const area = REBAR_AREA[diameter] || (Math.PI * diameter * diameter / 4);
  return area * count;
}

/** 利用可能な鉄筋径リスト */
export const REBAR_DIAMETERS = [10, 13, 16, 19, 22, 25, 29, 32];
