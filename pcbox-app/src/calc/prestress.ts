import { DesignInput, PrestressResult, CaseForces } from '../types';

/**
 * 有効プレストレス計算
 * PDF p.33-34 の計算手順に基づく
 */
export function calcPrestress(
  input: DesignInput,
  deadForces: CaseForces,
): { top: PrestressResult; bottom: PrestressResult } {
  return {
    top: calcPrestressForMember(input, input.pcSteel_top, input.dimensions.t1, deadForces.topSlab.midspan.M),
    bottom: calcPrestressForMember(input, input.pcSteel_bottom, input.dimensions.t2, deadForces.bottomSlab.midspan.M),
  };
}

function calcPrestressForMember(
  input: DesignInput,
  pcSteel: typeof input.pcSteel_top,
  thickness: number, // mm
  Mw: number, // 死荷重による曲げモーメント (kN·m)
): PrestressResult {
  const { Ec, psi, eps_s } = input.pcConcrete;
  const { sigma_pt, Ap, gamma, Ep, N, e, L } = pcSteel;

  const T = thickness; // mm
  const b = 1000; // mm (1m幅)

  // (1) PC鋼棒の初期引張力 (per meter)
  // Pt = N × Ap × σpt / L (N/m → kN)
  const Pt_N = N * Ap * sigma_pt / L; // N (per meter)
  const Pt_kN = Pt_N / 1000; // kN

  // (2) リラクセーションによる減少量
  const delta_sigma_pr = (gamma / 100) * sigma_pt;

  // (3) クリープ・乾燥収縮による減少量
  const n = Ep / Ec; // 弾性係数比
  const Ac = b * T; // mm² (断面積)
  const Ic = b * T * T * T / 12; // mm⁴ (断面二次モーメント)

  // σcd: PC鋼棒図心位置における死荷重によるコンクリートの応力度
  const Mw_Nmm = Mw * 1e6; // kN·m → N·mm
  const sigma_cd = Mw_Nmm * (-e) / Ic; // N/mm²

  // σcpt: PC鋼棒図心位置におけるプレストレッシング直後のコンクリートの応力度
  const sigma_cpt = Pt_N / Ac + Pt_N * e * e / Ic;

  // σcp = σcd + σcpt
  const sigma_cp = sigma_cd + sigma_cpt;

  // Δσpψ
  const delta_sigma_ppsi = (n * psi * sigma_cp + Ep * eps_s) /
    (1 + n * (sigma_cpt / sigma_pt) * (1 + psi / 2));

  // (4) 有効引張応力度
  const sigma_pe = sigma_pt - delta_sigma_pr - delta_sigma_ppsi;

  // 単位幅(1.0m)当りのPC鋼棒断面積
  const Ap_per_m = N * Ap / L; // mm²/m

  // 有効引張力
  const Pe = sigma_pe * Ap_per_m / 1000; // N → kN

  return {
    Pt: Pt_kN,
    delta_sigma_pr,
    delta_sigma_ppsi,
    sigma_pe,
    Pe,
    Ap_per_m,
  };
}
