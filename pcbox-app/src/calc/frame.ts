import { DesignInput, DeadLoadResult, LiveLoadResult, MemberForces, CaseForces } from '../types';

/**
 * 4節点ラーメン骨組解析（剛性法）
 *
 * 節点: 1(左上), 2(右上), 3(左下), 4(右下)
 * 部材: 1(頂版: 1→2), 2(左側壁: 1→3), 3(右側壁: 2→4), 4(底版: 3→4)
 * 支点: 節点3=固定(水平固定,鉛直固定,回転自由), 節点4=ローラー(水平自由,鉛直固定,回転自由)
 *
 * 全体座標系: X=右, Y=上
 */

interface Node {
  x: number;
  y: number;
}

interface Member {
  start: number;
  end: number;
  E: number;
  A: number;
  I: number;
  L: number;
  cos: number;
  sin: number;
}

interface FrameResult {
  displacements: number[];
  memberEndForces: number[][]; // [member][6] = [N_i, S_i, M_i, N_j, S_j, M_j]
}

/** ボックスカルバートの骨組モデルパラメータを取得 */
function getFrameModel(input: DesignInput) {
  const { dimensions } = input;
  const { B0, H0, t1, t2, t3, t4 } = dimensions;

  // 軸線寸法 (m)
  const spanX = (B0 + t3 / 2 + t4 / 2) / 1000; // 頂版・底版のスパン
  const spanY = (H0 + t1 / 2 + t2 / 2) / 1000; // 側壁の高さ

  // 節点座標 (軸線位置)
  const nodes: Node[] = [
    { x: 0, y: spanY },      // 1: 左上
    { x: spanX, y: spanY },  // 2: 右上
    { x: 0, y: 0 },          // 3: 左下
    { x: spanX, y: 0 },      // 4: 右下
  ];

  const Ec = input.pcConcrete.Ec * 1000; // N/mm² → kN/m² (×1000)

  // 部材断面定数 (1m幅あたり)
  const b = 1.0; // 1m幅
  const members: Member[] = [
    // 部材1: 頂版 (1→2)
    {
      start: 0, end: 1,
      E: Ec,
      A: b * (t1 / 1000),
      I: b * Math.pow(t1 / 1000, 3) / 12,
      L: spanX,
      cos: 1, sin: 0,
    },
    // 部材2: 左側壁 (1→3)
    {
      start: 0, end: 2,
      E: Ec,
      A: b * (t3 / 1000),
      I: b * Math.pow(t3 / 1000, 3) / 12,
      L: spanY,
      cos: 0, sin: -1,
    },
    // 部材3: 右側壁 (2→4)
    {
      start: 1, end: 3,
      E: Ec,
      A: b * (t4 / 1000),
      I: b * Math.pow(t4 / 1000, 3) / 12,
      L: spanY,
      cos: 0, sin: -1,
    },
    // 部材4: 底版 (3→4)
    {
      start: 2, end: 3,
      E: Ec,
      A: b * (t2 / 1000),
      I: b * Math.pow(t2 / 1000, 3) / 12,
      L: spanX,
      cos: 1, sin: 0,
    },
  ];

  return { nodes, members, spanX, spanY };
}

/** 部材剛性マトリックス（局所座標系、6×6） */
function memberStiffness(m: Member): number[][] {
  const { E, A, I, L } = m;
  const EA_L = E * A / L;
  const EI_L = E * I / L;
  const EI_L2 = EI_L / L;
  const EI_L3 = EI_L2 / L;

  // [N_i, S_i, M_i, N_j, S_j, M_j]
  const k: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));

  k[0][0] = EA_L;  k[0][3] = -EA_L;
  k[3][0] = -EA_L; k[3][3] = EA_L;

  k[1][1] = 12 * EI_L3;  k[1][2] = 6 * EI_L2;  k[1][4] = -12 * EI_L3; k[1][5] = 6 * EI_L2;
  k[2][1] = 6 * EI_L2;   k[2][2] = 4 * EI_L;   k[2][4] = -6 * EI_L2;  k[2][5] = 2 * EI_L;
  k[4][1] = -12 * EI_L3; k[4][2] = -6 * EI_L2; k[4][4] = 12 * EI_L3;  k[4][5] = -6 * EI_L2;
  k[5][1] = 6 * EI_L2;   k[5][2] = 2 * EI_L;   k[5][4] = -6 * EI_L2;  k[5][5] = 4 * EI_L;

  return k;
}

/** 座標変換マトリックス (6×6) */
function transformMatrix(m: Member): number[][] {
  const c = m.cos;
  const s = m.sin;
  const T: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));

  T[0][0] = c;  T[0][1] = s;
  T[1][0] = -s; T[1][1] = c;
  T[2][2] = 1;
  T[3][3] = c;  T[3][4] = s;
  T[4][3] = -s; T[4][4] = c;
  T[5][5] = 1;

  return T;
}

/** マトリックス乗算 */
function matMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < inner; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

/** マトリックス転置 */
function matTranspose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

/** ガウス消去法で連立方程式を解く */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // ピボット選択
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    if (Math.abs(aug[i][i]) > 1e-12) {
      x[i] /= aug[i][i];
    }
  }
  return x;
}

/**
 * 荷重ベクトルタイプ
 * 各荷重は固定端反力として算出し、等価節点荷重に変換
 */
interface LoadCase {
  /** 節点荷重 [node_idx][3] = [Fx, Fy, Mz] */
  nodeLoads: number[][];
  /** 部材固定端反力 [member_idx][6] = [N_i, S_i, M_i, N_j, S_j, M_j] */
  fixedEndForces: number[][];
}

/** 等分布荷重の固定端反力（部材局所座標系、全長に作用） */
function fixedEndUDL(w: number, L: number): number[] {
  // wは部材に垂直方向の等分布荷重（正＝i→j方向から見て左向き）
  return [0, w * L / 2, w * L * L / 12, 0, w * L / 2, -w * L * L / 12];
}

/** 台形分布荷重の固定端反力（部材局所座標系） */
function fixedEndTrapezoid(w1: number, w2: number, L: number): number[] {
  // w1: i端の荷重強度、w2: j端の荷重強度
  const R_i = L * (7 * w1 + 3 * w2) / 20;
  const R_j = L * (3 * w1 + 7 * w2) / 20;
  const M_i = L * L * (3 * w1 + 2 * w2) / 60;
  const M_j = -L * L * (2 * w1 + 3 * w2) / 60;
  return [0, R_i, M_i, 0, R_j, M_j];
}

/** 死荷重の荷重ケースを構築 */
function buildDeadLoadCase(input: DesignInput, deadLoad: DeadLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { spanX, spanY } = model;
  const nNodes = 4;
  const nMembers = 4;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  // (1) 頂版等分布荷重（自重 + 上載荷重）- 部材1（頂版）に垂直下向き
  const w_top = deadLoad.selfWeight.topSlab + deadLoad.surcharge + input.roadSurfaceLoad;
  const fef_top = fixedEndUDL(w_top, spanX);
  for (let i = 0; i < 6; i++) fixedEndForces[0][i] += fef_top[i];

  // (2) 側壁自重 - 部材2,3の軸方向荷重（等分布）
  const w_leftWall = deadLoad.selfWeight.leftWall;  // kN/m²（軸線高当り）
  const fef_leftWall = fixedEndUDL(0, spanY); // 軸方向なので別処理
  // 軸方向等分布荷重の固定端反力
  fixedEndForces[1][0] += w_leftWall * spanY / 2;  // N_i (下向き=圧縮)
  fixedEndForces[1][3] += w_leftWall * spanY / 2;  // N_j

  const w_rightWall = deadLoad.selfWeight.rightWall;
  fixedEndForces[2][0] += w_rightWall * spanY / 2;
  fixedEndForces[2][3] += w_rightWall * spanY / 2;

  // (3) 土圧（左側壁）- 部材2に垂直方向等分布/台形荷重
  // 部材2は1→3（上→下）、局所座標で垂直方向は右側（内向き）が正
  const ep = deadLoad.earthPressure;
  const p_left_top = ep.left.p2;    // 頂版軸線位置
  const p_left_bottom = ep.left.p3; // 底版軸線位置
  const fef_ep_left = fixedEndTrapezoid(p_left_top, p_left_bottom, spanY);
  for (let i = 0; i < 6; i++) fixedEndForces[1][i] += fef_ep_left[i];

  // (4) 土圧（右側壁）- 部材3に垂直方向（外向き＝負）
  const p_right_top = ep.right.p2;
  const p_right_bottom = ep.right.p3;
  const fef_ep_right = fixedEndTrapezoid(-p_right_top, -p_right_bottom, spanY);
  for (let i = 0; i < 6; i++) fixedEndForces[2][i] += fef_ep_right[i];

  // (5) 地盤反力 - 部材4（底版）に上向き等分布
  const qL = deadLoad.groundReaction.qLeft;
  const qR = deadLoad.groundReaction.qRight;
  const fef_reaction = fixedEndTrapezoid(qL, qR, spanX);
  for (let i = 0; i < 6; i++) fixedEndForces[3][i] += fef_reaction[i];

  return { nodeLoads, fixedEndForces };
}

/** 活荷重Case-1の荷重ケースを構築 */
function buildLiveLoad1Case(input: DesignInput, liveLoad: LiveLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { spanX } = model;
  const nNodes = 4;
  const nMembers = 4;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  // 頂版に等分布活荷重
  const w = liveLoad.Pvl;
  const fef = fixedEndUDL(w, spanX);
  for (let i = 0; i < 6; i++) fixedEndForces[0][i] += fef[i];

  // 地盤反力
  const qL = liveLoad.groundReaction.qLeft;
  const qR = liveLoad.groundReaction.qRight;
  const fef_reaction = fixedEndTrapezoid(qL, qR, spanX);
  for (let i = 0; i < 6; i++) fixedEndForces[3][i] += fef_reaction[i];

  return { nodeLoads, fixedEndForces };
}

/** 活荷重Case-2の荷重ケースを構築 */
function buildLiveLoad2Case(input: DesignInput, _liveLoad: LiveLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { spanY } = model;
  const nNodes = 4;
  const nMembers = 4;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  // 側圧
  const p = input.earthPressure.Ko_left * input.liveLoad.wl;

  // 左側壁に等分布水平荷重（内向き正）
  const fef_left = fixedEndUDL(p, spanY);
  for (let i = 0; i < 6; i++) fixedEndForces[1][i] += fef_left[i];

  // 右側壁に等分布水平荷重（内向き＝負）
  const fef_right = fixedEndUDL(-p, spanY);
  for (let i = 0; i < 6; i++) fixedEndForces[2][i] += fef_right[i];

  return { nodeLoads, fixedEndForces };
}

/** フレーム解析実行 */
function solveFrame(input: DesignInput, loadCase: LoadCase): FrameResult {
  const model = getFrameModel(input);
  const { members } = model;
  const nNodes = 4;
  const nDOF = nNodes * 3; // 各節点3自由度 (u, v, θ)

  // 全体剛性マトリックス
  const K: number[][] = Array.from({ length: nDOF }, () => new Array(nDOF).fill(0));

  // 等価節点荷重ベクトル
  const F: number[] = new Array(nDOF).fill(0);

  // 各部材の組み立て
  for (let mi = 0; mi < members.length; mi++) {
    const m = members[mi];
    const kLocal = memberStiffness(m);
    const T = transformMatrix(m);
    const Tt = matTranspose(T);

    // K_global = T^T × k_local × T
    const kGlobal = matMul(matMul(Tt, kLocal), T);

    // 自由度マッピング
    const dof = [
      m.start * 3, m.start * 3 + 1, m.start * 3 + 2,
      m.end * 3, m.end * 3 + 1, m.end * 3 + 2,
    ];

    // 組み立て
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[dof[i]][dof[j]] += kGlobal[i][j];
      }
    }

    // 固定端反力を等価節点荷重に変換（符号反転してグローバルに変換）
    const fef = loadCase.fixedEndForces[mi];
    const fefGlobal = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        fefGlobal[i] += Tt[i][j] * (-fef[j]);
      }
    }
    for (let i = 0; i < 6; i++) {
      F[dof[i]] += fefGlobal[i];
    }
  }

  // 節点荷重を加算
  for (let ni = 0; ni < nNodes; ni++) {
    F[ni * 3] += loadCase.nodeLoads[ni][0];
    F[ni * 3 + 1] += loadCase.nodeLoads[ni][1];
    F[ni * 3 + 2] += loadCase.nodeLoads[ni][2];
  }

  // 境界条件の適用
  // 節点3(idx=2): 水平固定, 鉛直固定, 回転自由 → DOF 6,7 を拘束
  // 節点4(idx=3): 水平自由, 鉛直固定, 回転自由 → DOF 10 を拘束
  const fixedDOFs = [6, 7, 10]; // 0-indexed

  // 拘束DOFの処理（大数法）
  const bigNumber = 1e20;
  for (const dof of fixedDOFs) {
    K[dof][dof] = bigNumber;
    F[dof] = 0;
  }

  // 連立方程式を解く
  const displacements = solveLinear(K, F);

  // 部材端力の計算
  const memberEndForces: number[][] = [];
  for (let mi = 0; mi < members.length; mi++) {
    const m = members[mi];
    const T = transformMatrix(m);
    const kLocal = memberStiffness(m);

    const dof = [
      m.start * 3, m.start * 3 + 1, m.start * 3 + 2,
      m.end * 3, m.end * 3 + 1, m.end * 3 + 2,
    ];

    // グローバル変位を取得
    const dGlobal = dof.map(d => displacements[d]);

    // ローカル変位に変換
    const dLocal = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        dLocal[i] += T[i][j] * dGlobal[j];
      }
    }

    // 部材端力 = k_local × d_local + 固定端反力
    const forces = new Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        forces[i] += kLocal[i][j] * dLocal[j];
      }
      forces[i] += loadCase.fixedEndForces[mi][i];
    }

    memberEndForces.push(forces);
  }

  return { displacements, memberEndForces };
}

/** 部材端力から照査点の断面力を算出 */
function extractMemberForces(
  endForces: number[],  // [N_i, S_i, M_i, N_j, S_j, M_j]
  L: number,            // 部材長
  memberType: 'horizontal' | 'vertical',
  loadIntensity?: { w?: number; w1?: number; w2?: number }, // 分布荷重
  haunchLen?: number,    // ハンチ長 (m)
): MemberForces {
  const Ni = endForces[0];
  const Si = endForces[1];
  const Mi = endForces[2];
  const Nj = endForces[3];
  const Sj = endForces[4];
  const Mj = endForces[5];

  const h = haunchLen || 0;

  // 分布荷重の強度
  const w1 = loadIntensity?.w1 ?? loadIntensity?.w ?? 0;
  const w2 = loadIntensity?.w2 ?? loadIntensity?.w ?? 0;

  function getValues(x: number): { M: number; N: number; S: number } {
    // 台形分布荷重 w(x) = w1 + (w2-w1) × x/L
    const wx = w1 + (w2 - w1) * x / L;
    const wAvg = w1 + (w2 - w1) * x / (2 * L);

    const M = Mi + Si * x - wAvg * x * x / 2;
    const S = Si - (w1 * x + (w2 - w1) * x * x / (2 * L));
    const N = Ni; // 軸力は一定（分布荷重なしの場合）

    return { M, N, S };
  }

  const leftEnd = { M: Mi, N: Ni, S: Si };
  const rightEnd = { M: -Mj, N: -Nj, S: -Sj };

  const haunchLeft = h > 0 ? getValues(h) : { M: Mi, N: Ni, S: Si };
  const haunchRight = h > 0 ? getValues(L - h) : { M: -Mj, N: -Nj, S: -Sj };

  const mid = getValues(L / 2);

  // 2d点（有効高の2倍、概算で部材厚程度の位置）はハンチ端とほぼ同じ扱い
  const d2Left = haunchLeft;
  const d2Right = haunchRight;

  return {
    leftEnd,
    haunchLeft,
    d2Left,
    midspan: mid,
    d2Right,
    haunchRight,
    rightEnd,
  };
}

/** 全荷重ケースの骨組解析を実行 */
export function runFrameAnalysis(
  input: DesignInput,
  deadLoad: DeadLoadResult,
  liveLoad1: LiveLoadResult,
  liveLoad2: LiveLoadResult,
): {
  deadForces: CaseForces;
  live1Forces: CaseForces;
  live2Forces: CaseForces;
} {
  const model = getFrameModel(input);
  const { spanX, spanY } = model;
  const haunchLen = input.dimensions.haunch / 1000;

  // 死荷重解析
  const deadCase = buildDeadLoadCase(input, deadLoad);
  const deadResult = solveFrame(input, deadCase);

  // 活荷重Case-1解析
  const live1Case = buildLiveLoad1Case(input, liveLoad1);
  const live1Result = solveFrame(input, live1Case);

  // 活荷重Case-2解析
  const live2Case = buildLiveLoad2Case(input, liveLoad2);
  const live2Result = solveFrame(input, live2Case);

  function toCaseForces(result: FrameResult): CaseForces {
    return {
      topSlab: extractMemberForces(result.memberEndForces[0], spanX, 'horizontal', undefined, haunchLen),
      leftWall: extractMemberForces(result.memberEndForces[1], spanY, 'vertical', undefined, haunchLen),
      rightWall: extractMemberForces(result.memberEndForces[2], spanY, 'vertical', undefined, haunchLen),
      bottomSlab: extractMemberForces(result.memberEndForces[3], spanX, 'horizontal', undefined, haunchLen),
    };
  }

  return {
    deadForces: toCaseForces(deadResult),
    live1Forces: toCaseForces(live1Result),
    live2Forces: toCaseForces(live2Result),
  };
}
