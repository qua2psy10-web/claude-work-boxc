import { DesignInput, DeadLoadResult, LiveLoadResult, ForceRow } from '../types';

/** 軸線高さ (m) - 側壁の軸線間距離 */
function getAxisHeight(input: DesignInput): number {
  const { H0, t1, t2 } = input.dimensions;
  return (H0 + t1 / 2 + t2 / 2) / 1000;
}

/** 軸線幅 (m) */
function getAxisWidth(input: DesignInput): number {
  const { B0, t3, t4 } = input.dimensions;
  return (B0 + t3 / 2 + t4 / 2) / 1000;
}

/** 外幅 B (m) */
function getOuterWidth(input: DesignInput): number {
  const { B0, t3, t4 } = input.dimensions;
  return (B0 + t3 + t4) / 1000;
}

/** 外高 H (m) */
function getOuterHeight(input: DesignInput): number {
  const { H0, t1, t2 } = input.dimensions;
  return (H0 + t1 + t2) / 1000;
}

/** 死荷重計算 */
export function calcDeadLoad(input: DesignInput): DeadLoadResult {
  const { dimensions, coverSoil, unitWeights, earthPressure, roadSurfaceLoad } = input;
  const { t1, t2, t3, t4, H0, haunch } = dimensions;
  const { gamma_c, gamma_a, gamma_s } = unitWeights;

  const axisHeight = getAxisHeight(input);  // 側壁軸線高
  const axisWidth = getAxisWidth(input);    // 頂版軸線幅 (内幅+側壁厚/2×2)
  const outerWidth = getOuterWidth(input);  // 外幅 B
  const outerHeight = getOuterHeight(input);

  // --- 躯体自重 ---
  // (1) 頂版
  const w_top = (t1 / 1000) * gamma_c;  // kN/m²

  // (2) 左側壁 (分布荷重として軸線高で割る)
  const wallHeight = axisHeight;  // 側壁軸線高さ
  const w_leftWall_rect = (t3 / 1000) * wallHeight * gamma_c;
  const haunchArea = 0.5 * (haunch / 1000) * (haunch / 1000 + haunch / 1000);
  const w_leftWall_haunch = haunchArea * gamma_c;
  const totalLeftWall = w_leftWall_rect + w_leftWall_haunch;

  // (3) 右側壁
  const w_rightWall_rect = (t4 / 1000) * wallHeight * gamma_c;
  const w_rightWall_haunch = haunchArea * gamma_c;
  const totalRightWall = w_rightWall_rect + w_rightWall_haunch;

  // --- 上載荷重 ---
  const surcharge_pavement = earthPressure.alpha * coverSoil.pavementThick * gamma_a;
  const surcharge_soil = earthPressure.alpha * (coverSoil.soilDepth - coverSoil.pavementThick) * gamma_s;
  // 土被り高から舗装厚を引いた分が盛土
  const soilOnly = coverSoil.soilDepth - coverSoil.pavementThick;
  const surcharge_soil2 = earthPressure.alpha * soilOnly * gamma_s;
  const totalSurcharge = surcharge_pavement + surcharge_soil2;

  // --- 頂版に作用する荷重 ---
  const w_topLoad = totalSurcharge + roadSurfaceLoad;

  // --- 土圧・水圧 ---
  const qd = roadSurfaceLoad;
  const Yo = coverSoil.pavementThick;
  const gamma_pave = gamma_a;
  const gamma_soil = gamma_s;

  // 土圧強度 pi = Ko × (qd + Yo×γa + Zo×γ)
  // 着目位置: 頂版天端、頂版軸線、底版軸線、底面
  const topSlabTop = coverSoil.soilDepth;   // 頂版天端での土砂深さ
  const topSlabAxis = coverSoil.soilDepth + t1 / 2 / 1000;
  const bottomSlabAxis = coverSoil.soilDepth + t1 / 1000 + H0 / 1000 + t2 / 2 / 1000;
  const bottom = coverSoil.soilDepth + outerHeight;

  function earthPressureIntensity(Ko: number, Zo: number): number {
    return Ko * (qd + Yo * gamma_pave + Zo * gamma_soil);
  }

  const ep_left = {
    p1: earthPressureIntensity(earthPressure.Ko_left, topSlabTop),
    p2: earthPressureIntensity(earthPressure.Ko_left, topSlabAxis),
    p3: earthPressureIntensity(earthPressure.Ko_left, bottomSlabAxis),
    p4: earthPressureIntensity(earthPressure.Ko_left, bottom),
  };
  const ep_right = {
    p1: earthPressureIntensity(earthPressure.Ko_right, topSlabTop),
    p2: earthPressureIntensity(earthPressure.Ko_right, topSlabAxis),
    p3: earthPressureIntensity(earthPressure.Ko_right, bottomSlabAxis),
    p4: earthPressureIntensity(earthPressure.Ko_right, bottom),
  };

  // --- 外力集計 ---
  // 基準: 底版左端下面を原点
  const B = outerWidth;
  const xCenter = B / 2;  // 対称軸

  // 各荷重のx, y位置と合力
  const forces: ForceRow[] = [];

  // 頂版自重
  const V_top = w_top * axisWidth;
  forces.push({ label: '頂版', V: V_top, H: 0, x: xCenter, y: 0, M: V_top * xCenter });

  // 左側壁自重
  forces.push({ label: '左側壁', V: totalLeftWall, H: 0, x: t3 / 1000 / 2, y: 0, M: totalLeftWall * (t3 / 1000 / 2) });

  // 右側壁自重
  const xRight = B - t4 / 1000 / 2;
  forces.push({ label: '右側壁', V: totalRightWall, H: 0, x: xRight, y: 0, M: totalRightWall * xRight });

  // 上載荷重 (頂版幅に作用)
  const V_surcharge = w_topLoad * outerWidth;
  forces.push({ label: '上載荷重', V: V_surcharge, H: 0, x: xCenter, y: 0, M: V_surcharge * xCenter });

  // 土圧 (左側壁) - 台形分布の合力
  const H_leftEP = 0.5 * (ep_left.p1 + ep_left.p4) * outerHeight;
  // 台形の重心位置 (底面からの高さ)
  const y_leftEP = outerHeight * (ep_left.p1 + 2 * ep_left.p4) / (3 * (ep_left.p1 + ep_left.p4));
  forces.push({ label: '左側壁土圧', V: 0, H: H_leftEP, x: 0, y: y_leftEP, M: H_leftEP * y_leftEP });

  // 土圧 (右側壁) - 逆向き
  const H_rightEP = -0.5 * (ep_right.p1 + ep_right.p4) * outerHeight;
  const y_rightEP = outerHeight * (ep_right.p1 + 2 * ep_right.p4) / (3 * (ep_right.p1 + ep_right.p4));
  forces.push({ label: '右側壁土圧', V: 0, H: H_rightEP, x: 0, y: y_rightEP, M: H_rightEP * y_rightEP });

  const totalV = forces.reduce((s, f) => s + f.V, 0);
  const totalM = forces.reduce((s, f) => s + f.M, 0);

  // --- 地盤反力 ---
  const X = totalM / totalV;
  const ecc = B / 2 - X;
  const Me = totalV * ecc;
  const qLeft = totalV / B + 6 * Me / (B * B);
  const qRight = totalV / B - 6 * Me / (B * B);

  return {
    selfWeight: {
      topSlab: w_top,
      leftWall: totalLeftWall / wallHeight,
      rightWall: totalRightWall / wallHeight,
    },
    surcharge: totalSurcharge,
    earthPressure: { left: ep_left, right: ep_right },
    forces,
    totalV,
    totalM,
    groundReaction: { qLeft, qRight },
    eccentricity: ecc,
  };
}

/** 活荷重計算 Case-1: T荷重 */
export function calcLiveLoad1(input: DesignInput): LiveLoadResult {
  const { liveLoad, coverSoil, dimensions } = input;
  const { P, i, beta, D0 } = liveLoad;
  const { t1 } = dimensions;

  const outerWidth = getOuterWidth(input);
  const B = outerWidth;

  // D: 路面から等分布活荷重載荷位置までの厚さ
  const D = coverSoil.soilDepth + t1 / 1000;

  // BOX縦方向単位長さ当りの活荷重
  const Pl_i = (2 * P * (1 + i)) / 2.75;

  // 換算等分布活荷重
  const Pvl = (Pl_i * beta) / (2 * D + D0);

  // 載荷荷重 - 頂版に作用する鉛直荷重
  const loadWidth = outerWidth;  // 載荷幅
  const V_live = Pvl * loadWidth;
  const xCenter = B / 2;

  const forces: ForceRow[] = [
    { label: '頂版 分布1', V: V_live, H: 0, x: xCenter, y: 0, M: V_live * xCenter },
  ];

  const totalV = V_live;
  const totalM = V_live * xCenter;

  // 地盤反力
  const X = totalM / totalV;
  const ecc = B / 2 - X;
  const Me = totalV * ecc;
  const qLeft = totalV / B + 6 * Me / (B * B);
  const qRight = totalV / B - 6 * Me / (B * B);

  return {
    Pl_i,
    Pvl,
    forces,
    totalV,
    totalM,
    groundReaction: { qLeft, qRight },
  };
}

/** 活荷重計算 Case-2: 側圧 */
export function calcLiveLoad2(input: DesignInput): LiveLoadResult {
  const { liveLoad, earthPressure, dimensions } = input;

  const outerHeight = getOuterHeight(input);
  const outerWidth = getOuterWidth(input);
  const B = outerWidth;

  // 側圧
  const p_left = earthPressure.Ko_left * liveLoad.wl;
  const p_right = earthPressure.Ko_right * liveLoad.wl;

  const H_left = p_left * outerHeight;
  const H_right = -p_right * outerHeight;
  const y_center = outerHeight / 2;  // 等分布なので中央

  // 壁の軸線高の中間
  const axisHeight = getAxisHeight(input);
  const yMid = axisHeight / 2 + (dimensions.t2 / 1000) / 2;

  const forces: ForceRow[] = [
    { label: '左側壁 分布', V: 0, H: H_left, x: 0, y: yMid, M: H_left * yMid },
    { label: '右側壁 分布', V: 0, H: H_right, x: 0, y: yMid, M: H_right * yMid },
  ];

  const totalV = 0;
  const totalM = 0;

  // 地盤反力 (活荷重case-2は側圧のみなので鉛直力なし)
  const Me_reaction = H_left * yMid + H_right * yMid;
  const qLeft = 6 * Me_reaction / (B * B);
  const qRight = -6 * Me_reaction / (B * B);

  return {
    Pl_i: 0,
    Pvl: 0,
    forces,
    totalV,
    totalM,
    groundReaction: { qLeft: 0, qRight: 0 },
  };
}
