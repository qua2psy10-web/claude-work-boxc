import { DesignInput, PrestressResult, CaseForces, StressCheckPoint, ShearCheckPoint, RCStressCheckPoint, MemberForces, cfLeftWall, cfRightWall } from '../types';
import { calcRebarArea } from '../utils/constants';

/**
 * PC部材の応力度照査（曲げ）
 * σu = (Pe+N)/Ac + (M - Pe·e)/Zc
 * σl = (Pe+N)/Ac - (M - Pe·e)/Zc
 */
function checkPCBending(
  M: number,    // kN·m
  N: number,    // kN
  Pe: number,   // kN (有効プレストレス)
  e_mm: number, // PC鋼棒偏心量 mm
  b_cm: number, // 部材幅 cm
  h_cm: number, // 部材高 cm
  sigma_ca: number, // 許容圧縮応力度
  sigma_ta: number, // 許容引張応力度
): StressCheckPoint {
  const b = b_cm / 100; // m
  const h = h_cm / 100; // m
  const Ac = b * h; // m²
  const Zc = b * h * h / 6; // m³

  // M, N, Pe は kN, kN·m 単位
  // 応力度は N/mm² = kN/m² × 1e-3 ... いや、kN/m² / 1000 = N/mm²
  // Ac は m², なので (Pe+N)/Ac の単位は kN/m²
  // 1 kN/m² = 0.001 N/mm²
  // まとめて N/mm² で計算するため、全てN, mm単位に変換

  const Ac_mm2 = Ac * 1e6; // mm²
  const Zc_mm3 = Zc * 1e9; // mm³
  const M_Nmm = M * 1e6; // N·mm
  const N_N = N * 1e3;  // N
  const Pe_Nval = Pe * 1e3; // N
  const e_mmv = e_mm;

  const sigma_u = (Pe_Nval + N_N) / Ac_mm2 + (M_Nmm - Pe_Nval * e_mmv) / Zc_mm3;
  const sigma_l = (Pe_Nval + N_N) / Ac_mm2 - (M_Nmm - Pe_Nval * e_mmv) / Zc_mm3;

  const sigma_c = Math.max(sigma_u, sigma_l);
  const sigma_t = Math.min(sigma_u, sigma_l);

  return {
    M, N, Pe,
    b: b_cm, h: h_cm,
    Ac: Ac_mm2, Zc: Zc_mm3,
    e: e_mm,
    sigma_c,
    sigma_t,
    sigma_ca,
    sigma_ta,
    ok_c: sigma_c <= sigma_ca,
    ok_t: sigma_t >= -sigma_ta,
  };
}

/**
 * PC部材のせん断応力度照査
 * τ = S / (b·d) ≤ τca = k·τa
 * k = 1 + Mo/Md ≤ 2
 */
function checkPCShear(
  S: number,    // kN
  N_axial: number,    // kN (軸力)
  Pe: number,   // kN
  e_cm: number, // 偏心量 cm
  Ac_m2: number, // 断面積 m²
  Zc_m3: number, // 断面係数 m³
  b_cm: number, // 幅 cm
  d_cm: number, // 有効高 cm
  tau_a: number, // 許容せん断応力度
  location: string,
  caseNo: number,
  L: number,
): ShearCheckPoint {
  // Mo: 有効プレストレス及び軸力による応力度が部材断面の引張縁で零となる曲げモーメント
  const Mo = (Pe + N_axial / 1000) * (Zc_m3 / Ac_m2) + Pe * (e_cm / 100);

  // Md: 終局荷重時の曲げモーメント（ここでは設計断面力のMを使用）
  const Md = Math.abs(S) > 0 ? Mo * 1.5 : Mo; // 簡易的

  const k = Math.min(1 + Mo / Math.max(Math.abs(Md), 0.001), 2.0);

  const b_mm = b_cm * 10;
  const d_mm = d_cm * 10;
  const tau = Math.abs(S * 1000) / (b_mm * d_mm); // N/mm²
  const tau_ca = k * tau_a;

  return {
    S, d: d_cm,
    tau,
    tau_ca,
    k,
    ok: tau <= tau_ca,
    location,
    caseNo,
    L,
  };
}

/**
 * RC部材の応力度照査（曲げ）
 */
function checkRCBending(
  M: number, N: number,
  b_cm: number, h_cm: number,
  d_cm: number,
  As_outer: number, // 外側鉄筋量 mm²
  _As_inner: number, // 内側鉄筋量 mm²
  n: number,        // 弾性係数比
  sigma_ca: number, sigma_sa: number,
): RCStressCheckPoint {
  const b = b_cm * 10; // mm
  const d = d_cm * 10; // mm
  const M_Nmm = M * 1e6;

  // 簡易的なRC断面計算
  // 中立軸位置xを求める（軸力無視の簡易計算）
  const As = As_outer; // 引張鉄筋
  const rho = As / (b * d);
  const k = Math.sqrt(2 * n * rho + (n * rho) * (n * rho)) - n * rho;
  const x = k * d;
  const j = 1 - k / 3;

  const sigma_c = Math.abs(M_Nmm) > 0 ? 2 * Math.abs(M_Nmm) / (b * x * j * d) : 0;
  const sigma_s = Math.abs(M_Nmm) > 0 ? Math.abs(M_Nmm) / (As * j * d) : 0;

  return {
    M, N, b: b_cm, h: h_cm, d: d_cm,
    sigma_c,
    sigma_s,
    sigma_ca,
    sigma_sa,
    x: x / 10, // cm
    ok_c: sigma_c <= sigma_ca,
    ok_s: sigma_s <= sigma_sa,
  };
}

/**
 * 全応力度照査を実行
 */
export function runStressCheck(
  input: DesignInput,
  stressForces: CaseForces[],
  prestress: { top: PrestressResult; bottom: PrestressResult },
) {
  const { dimensions, pcConcrete, rcConcrete, rebar, cover } = input;
  const results: {
    pc_dead: Record<string, StressCheckPoint[]>;
    pc_design: Record<string, StressCheckPoint[]>;
    pc_shear_dead: ShearCheckPoint[];
    pc_shear_design: ShearCheckPoint[];
    rc: Record<string, RCStressCheckPoint[]>;
    rc_shear: ShearCheckPoint[];
  } = {
    pc_dead: {},
    pc_design: {},
    pc_shear_dead: [],
    pc_shear_design: [],
    rc: {},
    rc_shear: [],
  };

  // PC部材: 頂版・底版（多連時は全スラブ）
  const numCells = dimensions.numCells;
  const pcMembers: { key: string; forces: MemberForces[]; t: number; pe: typeof prestress.top; e: number }[] = [];
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    pcMembers.push(
      { key: `頂版${suffix}`, forces: stressForces.map(c => c.topSlabs[si]), t: dimensions.t1, pe: prestress.top, e: input.pcSteel_top.e },
      { key: `底版${suffix}`, forces: stressForces.map(c => c.bottomSlabs[si]), t: dimensions.t2, pe: prestress.bottom, e: input.pcSteel_bottom.e },
    );
  }

  for (const pm of pcMembers) {
    const b_cm = 100.0; // 1m幅
    const h_cm = pm.t / 10; // mm → cm

    // 死荷重時 (case 0)
    const deadForce = pm.forces[0];
    const points_dead: StressCheckPoint[] = [];
    const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;

    for (const loc of locations) {
      const f = deadForce[loc];
      const sigma_ca = loc.includes('haunch') ? pcConcrete.sigma_ca_haunch_dead : pcConcrete.sigma_ca_general_dead;
      const sigma_ta = pcConcrete.sigma_ta_dead;
      points_dead.push(checkPCBending(f.M, f.N, pm.pe.Pe, pm.e, b_cm, h_cm, sigma_ca, sigma_ta));
    }
    results.pc_dead[pm.key] = points_dead;

    // 設計荷重時 (最大ケースを抽出)
    const points_design: StressCheckPoint[] = [];
    for (const loc of locations) {
      let maxRatio = -Infinity;
      let maxPoint: StressCheckPoint | null = null;
      for (let ci = 0; ci < pm.forces.length; ci++) {
        const f = pm.forces[ci][loc];
        const sigma_ca = loc.includes('haunch') ? pcConcrete.sigma_ca_haunch_design : pcConcrete.sigma_ca_general_design;
        const sigma_ta = pcConcrete.sigma_ta_design;
        const point = checkPCBending(f.M, f.N, pm.pe.Pe, pm.e, b_cm, h_cm, sigma_ca, sigma_ta);
        const ratio = Math.max(point.sigma_c / sigma_ca, -point.sigma_t / Math.max(Math.abs(sigma_ta), 0.01));
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxPoint = point;
        }
      }
      if (maxPoint) points_design.push(maxPoint);
    }
    results.pc_design[pm.key] = points_design;

    // PC部材せん断照査（d/2点）
    const d_cm_pc = h_cm - (pm.key === '頂版' ? cover.top_upper : cover.bottom_upper);
    const Ac_m2 = 1.0 * (pm.t / 1000); // m²
    const Zc_m3 = 1.0 * Math.pow(pm.t / 1000, 2) / 6; // m³
    const spanX = (dimensions.B0 + dimensions.t3 / 2 + dimensions.t4 / 2) / 1000;

    for (const side of ['d2Left', 'd2Right'] as const) {
      // 死荷重時
      const fd = pm.forces[0][side];
      results.pc_shear_dead.push(checkPCShear(
        fd.S, fd.N, pm.pe.Pe, pm.e / 10, Ac_m2, Zc_m3,
        b_cm, d_cm_pc, pcConcrete.tau_a1,
        `${pm.key} ${side === 'd2Left' ? '左d/2' : '右d/2'}`, 0, spanX,
      ));

      // 設計荷重時（最大せん断のケースを選択）
      let maxTau = -1;
      let maxShear: ShearCheckPoint | null = null;
      for (let ci = 0; ci < pm.forces.length; ci++) {
        const f = pm.forces[ci][side];
        const sp = checkPCShear(
          f.S, f.N, pm.pe.Pe, pm.e / 10, Ac_m2, Zc_m3,
          b_cm, d_cm_pc, pcConcrete.tau_a1,
          `${pm.key} ${side === 'd2Left' ? '左d/2' : '右d/2'}`, ci, spanX,
        );
        if (sp.tau > maxTau) { maxTau = sp.tau; maxShear = sp; }
      }
      if (maxShear) results.pc_shear_design.push(maxShear);
    }
  }

  // RC部材: 左側壁・中壁・右側壁
  const n_rc = input.pcSteel_top.Ep ? 200000 / (rcConcrete.Ec) : 15; // Es/Ec
  const rcMembers: { key: string; forces: MemberForces[]; t: number; rebarLayout: typeof input.rebarLayout.leftWall; coverOuter: number; coverInner: number }[] = [
    { key: '左側壁', forces: stressForces.map(c => cfLeftWall(c)), t: dimensions.t3, rebarLayout: input.rebarLayout.leftWall, coverOuter: cover.left_outer, coverInner: cover.left_inner },
  ];
  // 中壁
  for (let wi = 0; wi < dimensions.midWallThicknesses.length; wi++) {
    const wallIdx = wi + 1; // walls[0]=左, walls[1..N-1]=中壁, walls[N]=右
    rcMembers.push({
      key: `中壁${wi + 1}`,
      forces: stressForces.map(c => c.walls[wallIdx]),
      t: dimensions.midWallThicknesses[wi],
      rebarLayout: input.rebarLayout.midWalls[wi] || input.rebarLayout.leftWall,
      coverOuter: cover.left_outer,
      coverInner: cover.left_inner,
    });
  }
  rcMembers.push(
    { key: '右側壁', forces: stressForces.map(c => cfRightWall(c)), t: dimensions.t4, rebarLayout: input.rebarLayout.rightWall, coverOuter: cover.right_outer, coverInner: cover.right_inner },
  );

  for (const rm of rcMembers) {
    const b_cm = 100.0;
    const h_cm = rm.t / 10;
    const d_cm = h_cm - rm.coverOuter;
    const As_outer = calcRebarArea(rm.rebarLayout.outer.diameter, rm.rebarLayout.outer.count);
    const As_inner = calcRebarArea(rm.rebarLayout.inner.diameter, rm.rebarLayout.inner.count);

    const points: RCStressCheckPoint[] = [];
    const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;

    for (const loc of locations) {
      let maxRatio = -Infinity;
      let maxPoint: RCStressCheckPoint | null = null;
      for (let ci = 0; ci < rm.forces.length; ci++) {
        const f = rm.forces[ci][loc];
        const sigma_ca = loc.includes('haunch') ? rcConcrete.sigma_ca_haunch : rcConcrete.sigma_ca_general;
        const point = checkRCBending(f.M, f.N, b_cm, h_cm, d_cm, As_outer, As_inner, n_rc, sigma_ca, rebar.sigma_sa);
        const ratio = Math.max(point.sigma_c / sigma_ca, point.sigma_s / rebar.sigma_sa);
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxPoint = point;
        }
      }
      if (maxPoint) points.push(maxPoint);
    }
    results.rc[rm.key] = points;

    // RC部材せん断照査（d/2点）
    const spanY = (dimensions.H0 + dimensions.t1 / 2 + dimensions.t2 / 2) / 1000;
    for (const side of ['d2Left', 'd2Right'] as const) {
      let maxTau = -1;
      let maxShear: ShearCheckPoint | null = null;
      for (let ci = 0; ci < rm.forces.length; ci++) {
        const f = rm.forces[ci][side];
        const b_mm = b_cm * 10;
        const d_mm = d_cm * 10;
        const tau = Math.abs(f.S * 1000) / (b_mm * d_mm);
        const sp: ShearCheckPoint = {
          S: f.S, d: d_cm,
          tau,
          tau_ca: rcConcrete.tau_a1,
          k: 1.0,
          ok: tau <= rcConcrete.tau_a1,
          location: `${rm.key} ${side === 'd2Left' ? '上d/2' : '下d/2'}`,
          caseNo: ci,
          L: spanY,
        };
        if (sp.tau > maxTau) { maxTau = sp.tau; maxShear = sp; }
      }
      if (maxShear) results.rc_shear.push(maxShear);
    }
  }

  return results;
}
