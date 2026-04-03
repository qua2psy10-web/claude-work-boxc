import { DesignInput, CaseForces, RCStressCheckPoint, ShearCheckPoint, MemberForces, cfLeftWall, cfRightWall } from '../types';
import { calcRebarArea } from '../utils/constants';

/**
 * RC部材の応力度照査（曲げ）
 * 中立軸: x = (√(2nρ + (nρ)²) - nρ) × d
 * σc = 2M / (b × x × j × d)
 * σs = M / (As × j × d)
 */
function checkRCBending(
  M: number, N: number,
  b_cm: number, h_cm: number,
  d_cm: number,
  As_mm2: number,
  n: number,
  sigma_ca: number, sigma_sa: number,
  caseNo: number,
): RCStressCheckPoint {
  const b = b_cm * 10; // mm
  const d = d_cm * 10; // mm
  const M_Nmm = Math.abs(M * 1e6); // kN·m → N·mm (absolute)

  const As = As_mm2;
  const rho = As / (b * d);
  const nrho = n * rho;
  const k = Math.sqrt(2 * nrho + nrho * nrho) - nrho;
  const x = k * d;
  const j = 1 - k / 3;

  const sigma_c = M_Nmm > 0 && x > 0 ? 2 * M_Nmm / (b * x * j * d) : 0;
  const sigma_s = M_Nmm > 0 && As > 0 ? M_Nmm / (As * j * d) : 0;

  return {
    M, N, b: b_cm, h: h_cm, d: d_cm,
    As: As_mm2,
    sigma_c,
    sigma_s,
    sigma_ca,
    sigma_sa,
    x: x / 10, // cm
    ok_c: sigma_c <= sigma_ca,
    ok_s: sigma_s <= sigma_sa,
    caseNo,
  };
}

/**
 * 全応力度照査を実行（全部材RC）
 */
export function runStressCheck(
  input: DesignInput,
  stressForces: CaseForces[],
) {
  const { dimensions, rcConcrete, rebar, cover } = input;
  const results: {
    bending: Record<string, RCStressCheckPoint[]>;
    shear: ShearCheckPoint[];
  } = {
    bending: {},
    shear: [],
  };

  const n_rc = 200000 / rcConcrete.Ec; // Es/Ec
  const numCells = dimensions.numCells;

  // 全部材をRC部材として照査
  const allMembers: {
    key: string;
    forces: MemberForces[];
    t: number;
    rebarLayout: typeof input.rebarLayout.leftWall;
    coverOuter: number;
    coverInner: number;
  }[] = [];

  // 頂版
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `頂版${suffix}`,
      forces: stressForces.map(c => c.topSlabs[si]),
      t: dimensions.t1,
      rebarLayout: input.rebarLayout.topSlab,
      coverOuter: cover.top_upper,
      coverInner: cover.top_lower,
    });
  }

  // 左側壁
  allMembers.push({
    key: '左側壁',
    forces: stressForces.map(c => cfLeftWall(c)),
    t: dimensions.t3,
    rebarLayout: input.rebarLayout.leftWall,
    coverOuter: cover.left_outer,
    coverInner: cover.left_inner,
  });

  // 中壁
  for (let wi = 0; wi < dimensions.midWallThicknesses.length; wi++) {
    const wallIdx = wi + 1;
    allMembers.push({
      key: `中壁${wi + 1}`,
      forces: stressForces.map(c => c.walls[wallIdx]),
      t: dimensions.midWallThicknesses[wi],
      rebarLayout: input.rebarLayout.midWalls[wi] || input.rebarLayout.leftWall,
      coverOuter: cover.left_outer,
      coverInner: cover.left_inner,
    });
  }

  // 右側壁
  allMembers.push({
    key: '右側壁',
    forces: stressForces.map(c => cfRightWall(c)),
    t: dimensions.t4,
    rebarLayout: input.rebarLayout.rightWall,
    coverOuter: cover.right_outer,
    coverInner: cover.right_inner,
  });

  // 底版
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `底版${suffix}`,
      forces: stressForces.map(c => c.bottomSlabs[si]),
      t: dimensions.t2,
      rebarLayout: input.rebarLayout.bottomSlab,
      coverOuter: cover.bottom_lower,
      coverInner: cover.bottom_upper,
    });
  }

  for (const rm of allMembers) {
    const b_cm = 100.0;
    const h_cm = rm.t / 10;
    const d_cm = h_cm - rm.coverOuter;
    const As_outer = calcRebarArea(rm.rebarLayout.outer.diameter, rm.rebarLayout.outer.count);

    const points: RCStressCheckPoint[] = [];
    const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;

    for (const loc of locations) {
      let maxRatio = -Infinity;
      let maxPoint: RCStressCheckPoint | null = null;
      for (let ci = 0; ci < rm.forces.length; ci++) {
        const f = rm.forces[ci][loc];
        const point = checkRCBending(f.M, f.N, b_cm, h_cm, d_cm, As_outer, n_rc, rcConcrete.sigma_ca, rebar.sigma_sa, ci);
        const ratio = Math.max(
          rcConcrete.sigma_ca > 0 ? point.sigma_c / rcConcrete.sigma_ca : 0,
          rebar.sigma_sa > 0 ? point.sigma_s / rebar.sigma_sa : 0,
        );
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxPoint = point;
        }
      }
      if (maxPoint) points.push(maxPoint);
    }
    results.bending[rm.key] = points;

    // せん断照査（d/2点）
    const isHorizontal = rm.key.includes('頂版') || rm.key.includes('底版');
    const spanLen = isHorizontal
      ? (dimensions.B0 + dimensions.t3 / 2 + dimensions.t4 / 2) / 1000
      : (dimensions.H0 + dimensions.t1 / 2 + dimensions.t2 / 2) / 1000;

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
          location: `${rm.key} ${side === 'd2Left' ? '左d/2' : '右d/2'}`,
          caseNo: ci,
          L: spanLen,
        };
        if (sp.tau > maxTau) { maxTau = sp.tau; maxShear = sp; }
      }
      if (maxShear) results.shear.push(maxShear);
    }
  }

  return results;
}
