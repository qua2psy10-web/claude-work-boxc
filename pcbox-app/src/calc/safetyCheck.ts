import { DesignInput, PrestressResult, CaseForces, SafetyCheckResult, MemberForces, cfLeftWall, cfRightWall } from '../types';
import { calcRebarArea } from '../utils/constants';

/**
 * 破壊安全度照査
 *
 * PC部材: 曲げ耐力Muを算出し、Mu/Md ≥ 1.0 を確認
 * RC部材: 同様
 */
export function runSafetyCheck(
  input: DesignInput,
  safety1: CaseForces[],
  safety2: CaseForces[],
  safety3: CaseForces[],
  prestress: { top: PrestressResult; bottom: PrestressResult },
): {
  pc: Record<string, SafetyCheckResult[]>;
  rc: Record<string, SafetyCheckResult[]>;
} {
  const results = {
    pc: {} as Record<string, SafetyCheckResult[]>,
    rc: {} as Record<string, SafetyCheckResult[]>,
  };

  const { dimensions, pcConcrete, rcConcrete, rebar, pcSteel_top, pcSteel_bottom, cover } = input;

  // PC部材: 頂版・底版（多連時は全スラブ）
  const numCells = dimensions.numCells;
  const pcMembers: { key: string; t: number; pe: typeof prestress.top; pcSteel: typeof pcSteel_top; d1: number; d2: number; forces: CaseForces[][]; getMember: (cf: CaseForces) => MemberForces }[] = [];
  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    pcMembers.push(
      {
        key: `頂版${suffix}`,
        t: dimensions.t1,
        pe: prestress.top,
        pcSteel: pcSteel_top,
        d1: cover.top_upper,
        d2: cover.top_lower,
        forces: [safety1, safety2, safety3],
        getMember: (cf: CaseForces) => cf.topSlabs[si],
      },
      {
        key: `底版${suffix}`,
        t: dimensions.t2,
        pe: prestress.bottom,
        pcSteel: pcSteel_bottom,
        d1: cover.bottom_upper,
        d2: cover.bottom_lower,
        forces: [safety1, safety2, safety3],
        getMember: (cf: CaseForces) => cf.bottomSlabs[si],
      },
    );
  }

  for (const pm of pcMembers) {
    const checkResults: SafetyCheckResult[] = [];
    const b = 1000; // mm
    const h = pm.t;  // mm
    const d_s = h - pm.d1 * 10; // mm (RC鉄筋位置)
    const e_mm = pm.pcSteel.e; // PC鋼棒偏心量 mm

    // PC鋼棒
    const Ap = pm.pe.Ap_per_m; // mm²/m
    const sigma_py = pm.pcSteel.sigma_py;

    // RC鉄筋（外側）
    const rebarLayout = pm.key === '頂版' ? input.rebarLayout.topSlab : input.rebarLayout.bottomSlab;
    const As_outer = calcRebarArea(rebarLayout.outer.diameter, rebarLayout.outer.count);

    const sigma_ck = pcConcrete.sigma_ck;
    const sigma_sy = rebar.sigma_sy;

    const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
    const safetyLabels = ['1) 1.3D+2.5L', '2) 1.0D+2.5L', '3) 1.7(D+L)'];

    for (let si = 0; si < 3; si++) {
      const safetyForces = pm.forces[si];
      for (let ci = 0; ci < safetyForces.length; ci++) {
        const cf = safetyForces[ci];
        const mf = pm.getMember(cf);

        for (const loc of locations) {
          const f = mf[loc];
          const Md = f.M;
          const Nd = f.N;

          // PC鋼棒の有効高: 正曲げ時は圧縮側(上面)からの距離
          // 正曲げ(M>0): d_ps = T/2 + e (PC鋼棒は引張側に偏心)
          // 負曲げ(M<0): d_ps = T/2 - e (PC鋼棒は圧縮側寄り)
          const d_ps = Md >= 0 ? h / 2 + e_mm : h / 2 - e_mm;

          // 曲げ耐力Muの計算 (2層鋼材)
          // a = (Ap×σpy + As×σsy) / (0.85×σck×b)
          const T_ps = Ap * sigma_py;
          const T_s = As_outer * sigma_sy;
          const a = (T_ps + T_s) / (0.85 * sigma_ck * b);
          const Mu_Nmm = T_ps * (d_ps - a / 2) + T_s * (d_s - a / 2);
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
    results.pc[pm.key] = checkResults;
  }

  // RC部材: 左側壁・中壁・右側壁
  const rcMembers: { key: string; t: number; d1: number; d2: number; forces: CaseForces[][]; getMember: (cf: CaseForces) => typeof cf.walls[0]; rebarLayout: typeof input.rebarLayout.leftWall }[] = [
    {
      key: '左側壁',
      t: dimensions.t3,
      d1: cover.left_outer,
      d2: cover.left_inner,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cfLeftWall(cf),
      rebarLayout: input.rebarLayout.leftWall,
    },
  ];
  // 中壁
  for (let wi = 0; wi < dimensions.midWallThicknesses.length; wi++) {
    const wallIdx = wi + 1;
    rcMembers.push({
      key: `中壁${wi + 1}`,
      t: dimensions.midWallThicknesses[wi],
      d1: cover.left_outer,
      d2: cover.left_inner,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.walls[wallIdx],
      rebarLayout: input.rebarLayout.midWalls[wi] || input.rebarLayout.leftWall,
    });
  }
  rcMembers.push({
    key: '右側壁',
    t: dimensions.t4,
    d1: cover.right_outer,
    d2: cover.right_inner,
    forces: [safety1, safety2, safety3],
    getMember: (cf: CaseForces) => cfRightWall(cf),
    rebarLayout: input.rebarLayout.rightWall,
  });

  for (const rm of rcMembers) {
    const checkResults: SafetyCheckResult[] = [];
    const b = 1000;
    const h = rm.t;
    const d = h - rm.d1 * 10;

    const As_outer = calcRebarArea(rm.rebarLayout.outer.diameter, rm.rebarLayout.outer.count);

    const sigma_ck = rcConcrete.f_cd;
    const sigma_sy = rebar.sigma_sy;

    const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
    const safetyLabels = ['1) 1.3D+2.5L', '2) 1.0D+2.5L', '3) 1.7(D+L)'];

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
          const Mu = Mu_Nmm / 1e6;

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
    results.rc[rm.key] = checkResults;
  }

  return results;
}
