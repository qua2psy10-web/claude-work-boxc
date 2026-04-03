import { DesignInput, CaseForces, SafetyCheckResult, MemberForces, cfLeftWall, cfRightWall } from '../types';
import { calcRebarArea } from '../utils/constants';

/**
 * 破壊安全度照査（全部材RC）
 *
 * 曲げ耐力Muを算出し、Mu/Md ≥ 1.0 を確認
 * RC: a = (As×σsy - Nd) / (0.85×σck×b)
 *     Mu = As×σsy×(d - a/2) + Nd×(h/2 - a/2)
 */
export function runSafetyCheck(
  input: DesignInput,
  safety1: CaseForces[],
  safety2: CaseForces[],
  safety3: CaseForces[],
): Record<string, SafetyCheckResult[]> {
  const results: Record<string, SafetyCheckResult[]> = {};
  const { dimensions, rcConcrete, rebar, cover } = input;
  const numCells = dimensions.numCells;

  const allMembers: {
    key: string;
    t: number;
    d1: number;
    rebarLayout: typeof input.rebarLayout.leftWall;
    forces: CaseForces[][];
    getMember: (cf: CaseForces) => MemberForces;
  }[] = [];

  // 頂版
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `頂版${suffix}`,
      t: dimensions.t1,
      d1: cover.top_upper,
      rebarLayout: input.rebarLayout.topSlab,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.topSlabs[si],
    });
  }

  // 左側壁
  allMembers.push({
    key: '左側壁',
    t: dimensions.t3,
    d1: cover.left_outer,
    rebarLayout: input.rebarLayout.leftWall,
    forces: [safety1, safety2, safety3],
    getMember: (cf: CaseForces) => cfLeftWall(cf),
  });

  // 中壁
  for (let wi = 0; wi < dimensions.midWallThicknesses.length; wi++) {
    const wallIdx = wi + 1;
    allMembers.push({
      key: `中壁${wi + 1}`,
      t: dimensions.midWallThicknesses[wi],
      d1: cover.left_outer,
      rebarLayout: input.rebarLayout.midWalls[wi] || input.rebarLayout.leftWall,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.walls[wallIdx],
    });
  }

  // 右側壁
  allMembers.push({
    key: '右側壁',
    t: dimensions.t4,
    d1: cover.right_outer,
    rebarLayout: input.rebarLayout.rightWall,
    forces: [safety1, safety2, safety3],
    getMember: (cf: CaseForces) => cfRightWall(cf),
  });

  // 底版
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `底版${suffix}`,
      t: dimensions.t2,
      d1: cover.bottom_lower,
      rebarLayout: input.rebarLayout.bottomSlab,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.bottomSlabs[si],
    });
  }

  const sigma_ck = rcConcrete.f_cd;
  const sigma_sy = rebar.sigma_sy;
  const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
  const safetyLabels = ['1) 1.3D+2.5L', '2) 1.0D+2.5L', '3) 1.7(D+L)'];

  for (const rm of allMembers) {
    const checkResults: SafetyCheckResult[] = [];
    const b = 1000; // mm
    const h = rm.t;  // mm
    const d = h - rm.d1 * 10; // mm
    const As_outer = calcRebarArea(rm.rebarLayout.outer.diameter, rm.rebarLayout.outer.count);

    for (let si = 0; si < 3; si++) {
      const safetyForces = rm.forces[si];
      for (let ci = 0; ci < safetyForces.length; ci++) {
        const cf = safetyForces[ci];
        const mf = rm.getMember(cf);

        for (const loc of locations) {
          const f = mf[loc];
          const Md = f.M;
          const Nd = f.N;

          const totalTension = As_outer * sigma_sy;
          const Nd_N = Nd * 1000;
          const a = (totalTension - Nd_N) / (0.85 * sigma_ck * b);
          const Mu_Nmm = totalTension * (d - Math.max(a, 0) / 2) + Nd_N * (h / 2 - Math.max(a, 0) / 2);
          const Mu = Mu_Nmm / 1e6; // N·mm → kN·m

          const ratio = Math.abs(Md) > 0.001 ? Math.abs(Mu / Md) : 999;

          checkResults.push({
            Md,
            Nd,
            Mu,
            ratio,
            ok: ratio >= 1.0,
            caseLabel: `${safetyLabels[si]} case-${ci + 1}`,
          });
        }
      }
    }
    results[rm.key] = checkResults;
  }

  return results;
}
