import { DesignInput, DeadLoadResult, LiveLoadResult, MemberForces, CaseForces } from '../types';

/**
 * 多連ボックスカルバート骨組解析（剛性法）
 *
 * N連の場合:
 *   節点: 2*(N+1) 個
 *     上段: 0, 1, ..., N (左→右)
 *     下段: N+1, N+2, ..., 2N+1 (左→右)
 *   部材: 3N+1 本
 *     頂版:  0 .. N-1      (top slab i: node i → node i+1)
 *     壁:    N .. 2N       (wall j: top node j → bottom node N+1+j)
 *     底版:  2N+1 .. 3N    (bottom slab i: node N+1+i → node N+2+i)
 *   支点: 節点N+1=ピン(水平+鉛直固定), 節点N+2..2N+1=ローラー(鉛直固定)
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

/** ボックスカルバートの骨組モデルパラメータを取得（多連対応） */
function getFrameModel(input: DesignInput) {
  const { dimensions } = input;
  const { B0, H0, t1, t2, t3, t4, numCells, midWallThicknesses } = dimensions;
  const N = numCells;

  // 壁厚配列: [左壁, 中壁0, 中壁1, ..., 右壁] (N+1 個)
  const wallThicknesses: number[] = [t3];
  for (let i = 0; i < N - 1; i++) {
    wallThicknesses.push(midWallThicknesses[i]);
  }
  wallThicknesses.push(t4);

  // 軸線高さ (m)
  const spanY = (H0 + t1 / 2 + t2 / 2) / 1000;

  // 各セルの軸線スパン (m): B0/1000 + wallThicknesses[i]/(2*1000) + wallThicknesses[i+1]/(2*1000)
  const cellSpans: number[] = [];
  for (let i = 0; i < N; i++) {
    cellSpans.push(B0 / 1000 + wallThicknesses[i] / (2 * 1000) + wallThicknesses[i + 1] / (2 * 1000));
  }

  // 節点x座標の累積和
  const xPositions: number[] = [0];
  for (let i = 0; i < N; i++) {
    xPositions.push(xPositions[i] + cellSpans[i]);
  }
  const totalWidth = xPositions[N];

  // 節点座標
  const nodes: Node[] = [];
  // 上段: 0 .. N
  for (let i = 0; i <= N; i++) {
    nodes.push({ x: xPositions[i], y: spanY });
  }
  // 下段: N+1 .. 2N+1
  for (let i = 0; i <= N; i++) {
    nodes.push({ x: xPositions[i], y: 0 });
  }

  const Ec = input.pcConcrete.Ec * 1000; // N/mm² → kN/m²
  const b = 1.0; // 1m幅

  const members: Member[] = [];

  // 頂版: member 0 .. N-1
  for (let i = 0; i < N; i++) {
    members.push({
      start: i, end: i + 1,
      E: Ec,
      A: b * (t1 / 1000),
      I: b * Math.pow(t1 / 1000, 3) / 12,
      L: cellSpans[i],
      cos: 1, sin: 0,
    });
  }

  // 壁: member N .. 2N
  for (let j = 0; j <= N; j++) {
    const wt = wallThicknesses[j];
    members.push({
      start: j, end: N + 1 + j,
      E: Ec,
      A: b * (wt / 1000),
      I: b * Math.pow(wt / 1000, 3) / 12,
      L: spanY,
      cos: 0, sin: -1,
    });
  }

  // 底版: member 2N+1 .. 3N
  for (let i = 0; i < N; i++) {
    members.push({
      start: N + 1 + i, end: N + 1 + i + 1,
      E: Ec,
      A: b * (t2 / 1000),
      I: b * Math.pow(t2 / 1000, 3) / 12,
      L: cellSpans[i],
      cos: 1, sin: 0,
    });
  }

  return { nodes, members, cellSpans, wallThicknesses, spanY, totalWidth };
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

/** 死荷重の荷重ケースを構築（多連対応） */
function buildDeadLoadCase(input: DesignInput, deadLoad: DeadLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { cellSpans, spanY, totalWidth } = model;
  const N = input.dimensions.numCells;
  const nNodes = 2 * (N + 1);
  const nMembers = 3 * N + 1;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  // Member index helpers
  const topSlabIdx = (i: number) => i;              // 0 .. N-1
  const wallIdx = (j: number) => N + j;             // N .. 2N
  const botSlabIdx = (i: number) => 2 * N + 1 + i;  // 2N+1 .. 3N

  // (1) 頂版等分布荷重（自重 + 上載荷重）
  const w_top = deadLoad.selfWeight.topSlab + deadLoad.surcharge + input.roadSurfaceLoad;
  for (let i = 0; i < N; i++) {
    const fef = fixedEndUDL(w_top, cellSpans[i]);
    for (let k = 0; k < 6; k++) fixedEndForces[topSlabIdx(i)][k] += fef[k];
  }

  // (2) 壁自重 - 各壁の軸方向荷重
  // 左壁
  const w_leftWall = deadLoad.selfWeight.leftWall;
  fixedEndForces[wallIdx(0)][0] += -w_leftWall * spanY / 2;
  fixedEndForces[wallIdx(0)][3] += -w_leftWall * spanY / 2;
  // 中壁
  for (let j = 0; j < N - 1; j++) {
    const w_midWall = deadLoad.selfWeight.midWalls[j];
    fixedEndForces[wallIdx(j + 1)][0] += -w_midWall * spanY / 2;
    fixedEndForces[wallIdx(j + 1)][3] += -w_midWall * spanY / 2;
  }
  // 右壁
  const w_rightWall = deadLoad.selfWeight.rightWall;
  fixedEndForces[wallIdx(N)][0] += -w_rightWall * spanY / 2;
  fixedEndForces[wallIdx(N)][3] += -w_rightWall * spanY / 2;

  // (3) 土圧 - 左壁と右壁のみ
  const ep = deadLoad.earthPressure;
  // 左壁: 土圧は右向き(+global x = +local y)。fixedEndTrapezoid: w>0 = -local y, 右向きは負で渡す。
  const fef_ep_left = fixedEndTrapezoid(-ep.left.p2, -ep.left.p3, spanY);
  for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(0)][k] += fef_ep_left[k];
  // 右壁: 土圧は左向き(-local y)。w>0 = -local y なので正で渡す。
  const fef_ep_right = fixedEndTrapezoid(ep.right.p2, ep.right.p3, spanY);
  for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(N)][k] += fef_ep_right[k];

  // (4) 外水圧 - 左壁と右壁のみ
  const wp = deadLoad.waterPressure;
  if (wp.outer.pw_topAxis > 0 || wp.outer.pw_botAxis > 0) {
    // 左壁: 右向き(+local y → 負で渡す)
    const fef_wp_left = fixedEndTrapezoid(-wp.outer.pw_topAxis, -wp.outer.pw_botAxis, spanY);
    for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(0)][k] += fef_wp_left[k];
    // 右壁: 左向き(-local y → 正で渡す)
    const fef_wp_right = fixedEndTrapezoid(wp.outer.pw_topAxis, wp.outer.pw_botAxis, spanY);
    for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(N)][k] += fef_wp_right[k];
  }

  // (5) 内水圧 - 左壁と右壁のみ
  if (wp.inner.pw_topAxis > 0 || wp.inner.pw_botAxis > 0) {
    // 左壁: 左向き(-local y → 正で渡す)
    const fef_wpi_left = fixedEndTrapezoid(wp.inner.pw_topAxis, wp.inner.pw_botAxis, spanY);
    for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(0)][k] += fef_wpi_left[k];
    // 右壁: 右向き(+local y → 負で渡す)
    const fef_wpi_right = fixedEndTrapezoid(-wp.inner.pw_topAxis, -wp.inner.pw_botAxis, spanY);
    for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(N)][k] += fef_wpi_right[k];
  }

  // (6) 底版自重
  if (!input.analysis.ignoreBottomSelfWeight) {
    const w_bot = deadLoad.selfWeight.bottomSlab;
    for (let i = 0; i < N; i++) {
      const fef = fixedEndUDL(w_bot, cellSpans[i]);
      for (let k = 0; k < 6; k++) fixedEndForces[botSlabIdx(i)][k] += fef[k];
    }
  }

  // (7) 地盤反力 - 全底版に台形分布で配分
  // qLeft/qRight は全幅にわたる線形分布。各底版の左右端を線形補間。
  const qL = deadLoad.groundReaction.qLeft;
  const qR = deadLoad.groundReaction.qRight;
  let xAccum = 0;
  for (let i = 0; i < N; i++) {
    const xLeft = xAccum;
    const xRight = xAccum + cellSpans[i];
    // 線形補間: q(x) = qL + (qR - qL) * x / totalWidth
    const qAtLeft = qL + (qR - qL) * xLeft / totalWidth;
    const qAtRight = qL + (qR - qL) * xRight / totalWidth;
    // 上向き(+local y)なので負で渡す
    const fef = fixedEndTrapezoid(-qAtLeft, -qAtRight, cellSpans[i]);
    for (let k = 0; k < 6; k++) fixedEndForces[botSlabIdx(i)][k] += fef[k];
    xAccum = xRight;
  }

  return { nodeLoads, fixedEndForces };
}

/** 活荷重Case-1の荷重ケースを構築（多連対応） */
function buildLiveLoad1Case(input: DesignInput, liveLoad: LiveLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { cellSpans, totalWidth } = model;
  const N = input.dimensions.numCells;
  const nNodes = 2 * (N + 1);
  const nMembers = 3 * N + 1;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  const topSlabIdx = (i: number) => i;
  const botSlabIdx = (i: number) => 2 * N + 1 + i;

  // 頂版に等分布活荷重
  const w = liveLoad.Pvl;
  for (let i = 0; i < N; i++) {
    const fef = fixedEndUDL(w, cellSpans[i]);
    for (let k = 0; k < 6; k++) fixedEndForces[topSlabIdx(i)][k] += fef[k];
  }

  // 地盤反力
  const qL = liveLoad.groundReaction.qLeft;
  const qR = liveLoad.groundReaction.qRight;
  let xAccum = 0;
  for (let i = 0; i < N; i++) {
    const xLeft = xAccum;
    const xRight = xAccum + cellSpans[i];
    const qAtLeft = qL + (qR - qL) * xLeft / totalWidth;
    const qAtRight = qL + (qR - qL) * xRight / totalWidth;
    const fef = fixedEndTrapezoid(-qAtLeft, -qAtRight, cellSpans[i]);
    for (let k = 0; k < 6; k++) fixedEndForces[botSlabIdx(i)][k] += fef[k];
    xAccum = xRight;
  }

  return { nodeLoads, fixedEndForces };
}

/** 活荷重Case-2の荷重ケースを構築（多連対応） */
function buildLiveLoad2Case(input: DesignInput, _liveLoad: LiveLoadResult): LoadCase {
  const model = getFrameModel(input);
  const { spanY } = model;
  const N = input.dimensions.numCells;
  const nNodes = 2 * (N + 1);
  const nMembers = 3 * N + 1;

  const nodeLoads = Array.from({ length: nNodes }, () => [0, 0, 0]);
  const fixedEndForces = Array.from({ length: nMembers }, () => new Array(6).fill(0));

  const wallIdx = (j: number) => N + j;

  // 側圧 - 左壁と右壁のみ
  const p = input.earthPressure.Ko_left * input.liveLoad.wl;

  // 左壁: 右向き(+local y → 負で渡す)
  const fef_left = fixedEndUDL(-p, spanY);
  for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(0)][k] += fef_left[k];

  // 右壁: 左向き(-local y → 正で渡す)
  const fef_right = fixedEndUDL(p, spanY);
  for (let k = 0; k < 6; k++) fixedEndForces[wallIdx(N)][k] += fef_right[k];

  return { nodeLoads, fixedEndForces };
}

/** フレーム解析実行（多連対応） */
function solveFrame(input: DesignInput, loadCase: LoadCase): FrameResult {
  const model = getFrameModel(input);
  const { members } = model;
  const N = input.dimensions.numCells;
  const nNodes = 2 * (N + 1);
  const nDOF = nNodes * 3;

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
  // 下段左端(idx=N+1): ピン → DOF (N+1)*3, (N+1)*3+1 を拘束
  // 下段その他(idx=N+2..2N+1): ローラー → DOF i*3+1 を拘束
  const fixedDOFs: number[] = [];
  fixedDOFs.push((N + 1) * 3);     // bottom-left: horizontal
  fixedDOFs.push((N + 1) * 3 + 1); // bottom-left: vertical
  for (let i = N + 2; i <= 2 * N + 1; i++) {
    fixedDOFs.push(i * 3 + 1);     // other bottom nodes: vertical only
  }

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
  _memberType: 'horizontal' | 'vertical',
  loadIntensity?: { w?: number; w1?: number; w2?: number }, // 分布荷重
  haunchLen?: number,    // ハンチ長 (m)
  memberThickness?: number, // 部材厚 (m) — d/2点の位置計算に使用
): MemberForces {
  const Ni = endForces[0];
  const Si = endForces[1];
  const Mi = endForces[2];
  const Nj = endForces[3];
  const Sj = endForces[4];
  const Mj = endForces[5];

  const h = haunchLen || 0;
  const t = memberThickness || 0;

  // 分布荷重の強度
  const w1 = loadIntensity?.w1 ?? loadIntensity?.w ?? 0;
  const w2 = loadIntensity?.w2 ?? loadIntensity?.w ?? 0;

  function getValues(x: number): { M: number; N: number; S: number } {
    // 内部断面力（たわみ正の慣例: 正M = 内側引張 = たわみ）
    // M(x) = -Mi + Si*x - w1*x²/2 - (w2-w1)*x³/(6L)
    // S(x) = Si - w1*x - (w2-w1)*x²/(2L)
    const M = -Mi + Si * x - w1 * x * x / 2 - (w2 - w1) * x * x * x / (6 * L);
    const S = Si - (w1 * x + (w2 - w1) * x * x / (2 * L));
    const N = Ni;

    return { M, N, S };
  }

  const leftEnd = { M: -Mi, N: Ni, S: Si };
  const rightEnd = { M: Mj, N: -Nj, S: -Sj };

  const haunchLeft = h > 0 ? getValues(h) : { M: -Mi, N: Ni, S: Si };
  const haunchRight = h > 0 ? getValues(L - h) : { M: Mj, N: -Nj, S: -Sj };

  const mid = getValues(L / 2);

  // d/2点: ハンチ端から部材厚の半分の位置（せん断照査用の断面位置）
  const d2Offset = h + t / 2;
  const d2Left = d2Offset > 0 && d2Offset < L / 2 ? getValues(d2Offset) : haunchLeft;
  const d2Right = d2Offset > 0 && d2Offset < L / 2 ? getValues(L - d2Offset) : haunchRight;

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

/** M符号を FORUM8 慣例（内面引張正）に変換: 左側壁・中壁・底版は部材方向が逆のため反転 */
function flipMomentSign(mf: MemberForces): MemberForces {
  const flip = (p: { M: number; N: number; S: number }) => ({ M: -p.M, N: p.N, S: p.S });
  return {
    leftEnd: flip(mf.leftEnd),
    haunchLeft: flip(mf.haunchLeft),
    d2Left: flip(mf.d2Left),
    midspan: flip(mf.midspan),
    d2Right: flip(mf.d2Right),
    haunchRight: flip(mf.haunchRight),
    rightEnd: flip(mf.rightEnd),
  };
}

/** 全荷重ケースの骨組解析を実行（多連対応） */
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
  const { cellSpans, spanY, totalWidth } = model;
  const N = input.dimensions.numCells;
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

  // 死荷重の分布荷重情報
  const w_top_dead = deadLoad.selfWeight.topSlab + deadLoad.surcharge + input.roadSurfaceLoad;
  const ep = deadLoad.earthPressure;
  const wp = deadLoad.waterPressure;
  const p_side = input.earthPressure.Ko_left * input.liveLoad.wl;

  // 部材厚 (m)
  const t1 = input.dimensions.t1 / 1000;
  const t2 = input.dimensions.t2 / 1000;
  const t3 = input.dimensions.t3 / 1000;
  const t4 = input.dimensions.t4 / 1000;
  const midWallT = input.dimensions.midWallThicknesses.map(t => t / 1000);

  // Member indices
  const topSlabMemberIdx = (i: number) => i;
  const wallMemberIdx = (j: number) => N + j;
  const botSlabMemberIdx = (i: number) => 2 * N + 1 + i;

  // 壁のハンチ幅（壁厚の半分をhaunch位置として使う）
  // ただし頂版・底版のハンチ長は壁厚に依存する
  // 頂版のi番目スラブ: 左端ハンチ = wallThicknesses[i]/(2*1000), 右端ハンチ = wallThicknesses[i+1]/(2*1000)
  // ここではhaunchLenは入力値を使用（全部材共通のハンチ寸法）

  // --- 死荷重断面力 ---
  const deadTopSlabs: MemberForces[] = [];
  for (let i = 0; i < N; i++) {
    deadTopSlabs.push(
      extractMemberForces(deadResult.memberEndForces[topSlabMemberIdx(i)], cellSpans[i], 'horizontal', { w: w_top_dead }, haunchLen, t1)
    );
  }

  const deadWalls: MemberForces[] = [];
  for (let j = 0; j <= N; j++) {
    const mi = wallMemberIdx(j);
    let wallLoad: { w1?: number; w2?: number } | undefined;
    let wallT: number;

    if (j === 0) {
      // 左壁: 土圧(右向き=-) + 外水圧(右向き=-) + 内水圧(左向き=+)
      wallLoad = {
        w1: -ep.left.p2 - wp.outer.pw_topAxis + wp.inner.pw_topAxis,
        w2: -ep.left.p3 - wp.outer.pw_botAxis + wp.inner.pw_botAxis,
      };
      wallT = t3;
    } else if (j === N) {
      // 右壁: 土圧(左向き=+) + 外水圧(左向き=+) + 内水圧(右向き=-)
      wallLoad = {
        w1: ep.right.p2 + wp.outer.pw_topAxis - wp.inner.pw_topAxis,
        w2: ep.right.p3 + wp.outer.pw_botAxis - wp.inner.pw_botAxis,
      };
      wallT = t4;
    } else {
      // 中壁: 横方向の外力なし
      wallLoad = undefined;
      wallT = midWallT[j - 1];
    }

    const mf = extractMemberForces(deadResult.memberEndForces[mi], spanY, 'vertical', wallLoad, haunchLen, wallT);
    // 左壁・中壁: flip（部材方向がFORUM8慣例と逆）、右壁: no flip
    if (j < N) {
      deadWalls.push(flipMomentSign(mf));
    } else {
      deadWalls.push(mf);
    }
  }

  const deadBotSlabs: MemberForces[] = [];
  {
    let xAccum = 0;
    for (let i = 0; i < N; i++) {
      const xLeft = xAccum;
      const xRight = xAccum + cellSpans[i];
      const qAtLeft = deadLoad.groundReaction.qLeft + (deadLoad.groundReaction.qRight - deadLoad.groundReaction.qLeft) * xLeft / totalWidth;
      const qAtRight = deadLoad.groundReaction.qLeft + (deadLoad.groundReaction.qRight - deadLoad.groundReaction.qLeft) * xRight / totalWidth;
      const botSW = input.analysis.ignoreBottomSelfWeight ? 0 : deadLoad.selfWeight.bottomSlab;
      const mf = extractMemberForces(
        deadResult.memberEndForces[botSlabMemberIdx(i)], cellSpans[i], 'horizontal',
        { w1: botSW - qAtLeft, w2: botSW - qAtRight },
        haunchLen, t2
      );
      deadBotSlabs.push(flipMomentSign(mf));
      xAccum = xRight;
    }
  }

  const deadForces: CaseForces = {
    topSlabs: deadTopSlabs,
    walls: deadWalls,
    bottomSlabs: deadBotSlabs,
  };

  // --- 活荷重Case-1断面力 ---
  const live1TopSlabs: MemberForces[] = [];
  for (let i = 0; i < N; i++) {
    live1TopSlabs.push(
      extractMemberForces(live1Result.memberEndForces[topSlabMemberIdx(i)], cellSpans[i], 'horizontal', { w: liveLoad1.Pvl }, haunchLen, t1)
    );
  }

  const live1Walls: MemberForces[] = [];
  for (let j = 0; j <= N; j++) {
    const mi = wallMemberIdx(j);
    const wallT = j === 0 ? t3 : j === N ? t4 : midWallT[j - 1];
    const mf = extractMemberForces(live1Result.memberEndForces[mi], spanY, 'vertical', undefined, haunchLen, wallT);
    if (j < N) {
      live1Walls.push(flipMomentSign(mf));
    } else {
      live1Walls.push(mf);
    }
  }

  const live1BotSlabs: MemberForces[] = [];
  {
    let xAccum = 0;
    for (let i = 0; i < N; i++) {
      const xLeft = xAccum;
      const xRight = xAccum + cellSpans[i];
      const qAtLeft = liveLoad1.groundReaction.qLeft + (liveLoad1.groundReaction.qRight - liveLoad1.groundReaction.qLeft) * xLeft / totalWidth;
      const qAtRight = liveLoad1.groundReaction.qLeft + (liveLoad1.groundReaction.qRight - liveLoad1.groundReaction.qLeft) * xRight / totalWidth;
      const mf = extractMemberForces(
        live1Result.memberEndForces[botSlabMemberIdx(i)], cellSpans[i], 'horizontal',
        { w1: -qAtLeft, w2: -qAtRight },
        haunchLen, t2
      );
      live1BotSlabs.push(flipMomentSign(mf));
      xAccum = xRight;
    }
  }

  const live1Forces: CaseForces = {
    topSlabs: live1TopSlabs,
    walls: live1Walls,
    bottomSlabs: live1BotSlabs,
  };

  // --- 活荷重Case-2断面力 ---
  const live2TopSlabs: MemberForces[] = [];
  for (let i = 0; i < N; i++) {
    live2TopSlabs.push(
      extractMemberForces(live2Result.memberEndForces[topSlabMemberIdx(i)], cellSpans[i], 'horizontal', undefined, haunchLen, t1)
    );
  }

  const live2Walls: MemberForces[] = [];
  for (let j = 0; j <= N; j++) {
    const mi = wallMemberIdx(j);
    const wallT = j === 0 ? t3 : j === N ? t4 : midWallT[j - 1];
    let wallLoad: { w?: number } | undefined;
    if (j === 0) {
      wallLoad = { w: -p_side }; // 左壁: 右向き → 負
    } else if (j === N) {
      wallLoad = { w: p_side };  // 右壁: 左向き → 正
    } else {
      wallLoad = undefined;      // 中壁: 側圧なし
    }
    const mf = extractMemberForces(live2Result.memberEndForces[mi], spanY, 'vertical', wallLoad, haunchLen, wallT);
    if (j < N) {
      live2Walls.push(flipMomentSign(mf));
    } else {
      live2Walls.push(mf);
    }
  }

  const live2BotSlabs: MemberForces[] = [];
  for (let i = 0; i < N; i++) {
    live2BotSlabs.push(
      flipMomentSign(extractMemberForces(live2Result.memberEndForces[botSlabMemberIdx(i)], cellSpans[i], 'horizontal', undefined, haunchLen, t2))
    );
  }

  const live2Forces: CaseForces = {
    topSlabs: live2TopSlabs,
    walls: live2Walls,
    bottomSlabs: live2BotSlabs,
  };

  return { deadForces, live1Forces, live2Forces };
}
