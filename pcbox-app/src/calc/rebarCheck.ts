import { DesignInput, PrestressResult, CaseForces, RebarCheckResult } from '../types';

/**
 * 引張鉄筋量照査
 *
 * 荷重の組合せ: 死荷重 + 1.35×活荷重 + 有効プレストレス力
 *
 * As = max(As1, As2)
 * As1 = Tc/σsa = b·x·|σt| / (2·σsa)
 * x = |σt| / (|σt| + σc) × T
 * As2 = 0.005·b·x
 */
export function runRebarCheck(
  input: DesignInput,
  rebarForces: CaseForces[],
  prestress: { top: PrestressResult; bottom: PrestressResult },
): Record<string, RebarCheckResult> {
  const results: Record<string, RebarCheckResult> = {};
  const { dimensions, rebar } = input;

  // PC部材（頂版・底版）の引張鉄筋量照査
  const pcMembers = [
    { key: '頂版', forces: rebarForces.map(c => c.topSlab), T: dimensions.t1, pe: prestress.top, e_mm: input.pcSteel_top.e },
    { key: '底版', forces: rebarForces.map(c => c.bottomSlab), T: dimensions.t2, pe: prestress.bottom, e_mm: input.pcSteel_bottom.e },
  ];

  for (const pm of pcMembers) {
    // 支間部で最大引張鉄筋量が必要なケースを抽出
    let maxAs = -1;
    let maxResult: RebarCheckResult | null = null;

    for (let ci = 0; ci < pm.forces.length; ci++) {
      const f = pm.forces[ci].midspan;
      const result = calcRebarForPoint(f.M, f.N, pm.pe.Pe, pm.T, pm.e_mm, rebar.sigma_sa);
      if (result.As > maxAs) {
        maxAs = result.As;
        maxResult = result;
      }
    }
    if (maxResult) results[pm.key] = maxResult;
  }

  return results;
}

function calcRebarForPoint(
  M: number,    // kN·m
  N: number,    // kN
  Pe: number,   // kN
  T: number,    // 部材厚 mm
  e_mm: number, // 偏心量 mm
  sigma_sa: number, // 許容引張応力度 N/mm²
): RebarCheckResult {
  const b = 1000; // mm (1m幅)
  const Ac = b * T; // mm²
  const Zc = b * T * T / 6; // mm³

  const M_Nmm = M * 1e6;
  const N_N = N * 1e3;
  const Pe_N = Pe * 1e3;

  // σu, σl
  const sigma_u = (Pe_N + N_N) / Ac + (M_Nmm - Pe_N * e_mm) / Zc;
  const sigma_l = (Pe_N + N_N) / Ac - (M_Nmm - Pe_N * e_mm) / Zc;

  const sigma_c = Math.max(sigma_u, sigma_l);
  const sigma_t = Math.min(sigma_u, sigma_l);

  // 中立軸位置
  let x = 0;
  let As1 = 0;
  let As2 = 0;

  if (sigma_t < 0) {
    // 引張が発生
    x = Math.abs(sigma_t) / (Math.abs(sigma_t) + sigma_c) * T;
    const Tc = b * x * Math.abs(sigma_t) / 2; // N (引張力の合力)
    As1 = Tc / sigma_sa; // mm²
    As2 = 0.005 * b * x; // mm²
  }

  const As = Math.max(As1, As2);

  return {
    M, N, Pe, T, e_pc: e_mm,
    Ac, Zc,
    sigma_c,
    sigma_t,
    x: x / 10, // cm
    As1: As1 / 100, // cm²
    As2: As2 / 100, // cm²
    As: As / 100,   // cm²
  };
}
