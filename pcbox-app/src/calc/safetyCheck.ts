import { DesignInput, PrestressResult, CaseForces, SafetyCheckResult } from '../types';

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

  // PC部材: 頂版・底版
  const pcMembers = [
    {
      key: '頂版',
      t: dimensions.t1,
      pe: prestress.top,
      pcSteel: pcSteel_top,
      d1: cover.top_upper,
      d2: cover.top_lower,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.topSlab,
    },
    {
      key: '底版',
      t: dimensions.t2,
      pe: prestress.bottom,
      pcSteel: pcSteel_bottom,
      d1: cover.bottom_upper,
      d2: cover.bottom_lower,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.bottomSlab,
    },
  ];

  for (const pm of pcMembers) {
    const checkResults: SafetyCheckResult[] = [];
    const b = 1000; // mm
    const h = pm.t;  // mm
    const d = h - pm.d1 * 10; // mm (有効高)

    // PC鋼棒
    const Ap = pm.pe.Ap_per_m; // mm²/m
    const sigma_py = pm.pcSteel.sigma_py;

    // RC鉄筋（外側・内側）
    const As_outer = 6.335 * 100; // D13 5本 (PDF参照) mm²
    const As_inner = 6.335 * 100;

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

          // 曲げ耐力Muの簡易計算
          // PC部材: Mu = Ap×σpy×(d - a/2) + As×σsy×(d - a/2)
          // a = (Ap×σpy + As×σsy - Nd×1000) / (0.85×σck×b)
          // ここでσckはf'c (設計圧縮強度)
          const totalTension = Ap * sigma_py + As_outer * sigma_sy;
          const Nd_N = Nd * 1000; // kN → N
          const a = (totalTension - Nd_N) / (0.85 * sigma_ck * b);
          const Mu_Nmm = totalTension * (d - a / 2) + Nd_N * (h / 2 - a / 2);
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

  // RC部材: 左側壁・右側壁
  const rcMembers = [
    {
      key: '左側壁',
      t: dimensions.t3,
      d1: cover.left_outer,
      d2: cover.left_inner,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.leftWall,
    },
    {
      key: '右側壁',
      t: dimensions.t4,
      d1: cover.right_outer,
      d2: cover.right_inner,
      forces: [safety1, safety2, safety3],
      getMember: (cf: CaseForces) => cf.rightWall,
    },
  ];

  for (const rm of rcMembers) {
    const checkResults: SafetyCheckResult[] = [];
    const b = 1000;
    const h = rm.t;
    const d = h - rm.d1 * 10;

    const As_outer = 14.325 * 100; // D19 5本 mm²
    const As_inner = 3.567 * 100;

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
