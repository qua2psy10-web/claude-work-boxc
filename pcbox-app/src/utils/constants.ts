import { DesignInput } from '../types';

/** PDFサンプルに基づくデフォルト入力値 */
export const defaultInput: DesignInput = {
  dimensions: {
    B0: 3000,   // 内幅 3000mm
    H0: 2500,   // 内高 2500mm
    t1: 250,    // 頂版厚 250mm
    t2: 250,    // 底版厚 250mm
    t3: 200,    // 左側壁厚 200mm
    t4: 200,    // 右側壁厚 200mm
    haunch: 300, // ハンチ 300mm
  },
  coverSoil: {
    soilDepth: 2.800,    // 土被り高 2.8m
    pavementThick: 0.200, // 舗装厚 0.2m
  },
  pcConcrete: {
    sigma_ck: 40.0,
    Ec: 3.10e4,
    psi: 2.80,
    eps_s: 20.00e-5,
    sigma_ca_general_dead: 15.00,
    sigma_ca_general_design: 15.00,
    sigma_ca_haunch_dead: 15.00,
    sigma_ca_haunch_design: 15.00,
    sigma_ca_nohaunch_dead: 11.25,
    sigma_ca_nohaunch_design: 11.25,
    sigma_ta_dead: 0.00,
    sigma_ta_design: 1.50,
    tau_a1: 0.550,
    tau_a2: 2.400,
  },
  rcConcrete: {
    sigma_ck: 40.0,
    Ec: 3.10e4,
    sigma_ca_general: 14.00,
    sigma_ca_haunch: 14.00,
    sigma_ca_nohaunch: 10.50,
    tau_a1: 0.550,
    tau_a2: 2.400,
    f_cd: 40.0,
  },
  rebar: {
    grade: 'SD345',
    sigma_sa: 180.00,
    sigma_sa_c: 200.00,
    sigma_sy: 345.0,
  },
  pcSteel_top: {
    name: 'C種1号 SBPR1080/1230 21mm',
    sigma_pu: 1230.0,
    sigma_py: 1080.0,
    sigma_pt: 861.0,
    Ap: 346.40,
    gamma: 3.00,
    Ep: 2.00e5,
    N: 10,
    e: 10,   // 偏心量 mm
    L: 2.000, // ブロック長 m
  },
  pcSteel_bottom: {
    name: 'C種1号 SBPR1080/1230 21mm',
    sigma_pu: 1230.0,
    sigma_py: 1080.0,
    sigma_pt: 861.0,
    Ap: 346.40,
    gamma: 3.00,
    Ep: 2.00e5,
    N: 10,
    e: 10,
    L: 2.000,
  },
  unitWeights: {
    gamma_c: 24.50,
    gamma_w: 10.00,
    gamma_a: 22.50,
    gamma_s: 18.00,
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
    top_upper: 3.5,
    top_lower: 3.5,
    bottom_upper: 3.5,
    bottom_lower: 3.5,
    left_outer: 3.5,
    left_inner: 3.5,
    right_outer: 3.5,
    right_inner: 3.5,
  },
  liveLoad: {
    P: 100.0,     // 輪荷重 100kN (T荷重 単軸 250kN → 片側100kN)
    i: 0.300,     // 衝撃係数
    beta: 0.900,  // 低減係数
    D0: 0.20,     // 接地幅 0.20m
    wl: 10.00,    // 側圧用荷重 10kN/m²
  },
  analysis: {
    considerBuoyancy: false,
    liveLoadPosition: '頂版天端',
    ignoreBottomSelfWeight: true,
  },
  roadSurfaceLoad: 0.000,
};
