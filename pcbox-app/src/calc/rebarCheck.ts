import { DesignInput, CaseForces, MemberForces, cfLeftWall, cfRightWall } from '../types';
import { calcRebarArea } from '../utils/constants';

/**
 * 引張鉄筋量照査（RC部材）
 *
 * 応力度照査と同じRC曲げ計算で、必要鉄筋量を算出
 * 荷重: 応力度照査用の断面力（死荷重+活荷重の包絡）
 */

export interface RebarCheckResult {
  member: string;
  location: string;
  M: number;       // kN·m
  N: number;       // kN
  As_req: number;  // 必要鉄筋量 (cm²/m)
  As_prov: number; // 配置鉄筋量 (cm²/m)
  ok: boolean;
}

export function runRebarCheck(
  input: DesignInput,
  stressForces: CaseForces[],
): RebarCheckResult[] {
  const results: RebarCheckResult[] = [];
  const { dimensions, rcConcrete, rebar, cover } = input;
  const numCells = dimensions.numCells;
  const n = 200000 / rcConcrete.Ec;

  const allMembers: {
    key: string;
    forces: MemberForces[];
    t: number;
    rebarLayout: typeof input.rebarLayout.leftWall;
    coverOuter: number;
  }[] = [];

  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `頂版${suffix}`,
      forces: stressForces.map(c => c.topSlabs[si]),
      t: dimensions.t1,
      rebarLayout: input.rebarLayout.topSlab,
      coverOuter: cover.top_upper,
    });
  }

  allMembers.push({
    key: '左側壁',
    forces: stressForces.map(c => cfLeftWall(c)),
    t: dimensions.t3,
    rebarLayout: input.rebarLayout.leftWall,
    coverOuter: cover.left_outer,
  });

  for (let wi = 0; wi < dimensions.midWallThicknesses.length; wi++) {
    const wallIdx = wi + 1;
    allMembers.push({
      key: `中壁${wi + 1}`,
      forces: stressForces.map(c => c.walls[wallIdx]),
      t: dimensions.midWallThicknesses[wi],
      rebarLayout: input.rebarLayout.midWalls[wi] || input.rebarLayout.leftWall,
      coverOuter: cover.left_outer,
    });
  }

  allMembers.push({
    key: '右側壁',
    forces: stressForces.map(c => cfRightWall(c)),
    t: dimensions.t4,
    rebarLayout: input.rebarLayout.rightWall,
    coverOuter: cover.right_outer,
  });

  for (let si = 0; si < numCells; si++) {
    const suffix = numCells > 1 ? `${si + 1}` : '';
    allMembers.push({
      key: `底版${suffix}`,
      forces: stressForces.map(c => c.bottomSlabs[si]),
      t: dimensions.t2,
      rebarLayout: input.rebarLayout.bottomSlab,
      coverOuter: cover.bottom_lower,
    });
  }

  const locations = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
  const locationLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  for (const rm of allMembers) {
    const b = 1000; // mm (1m幅)
    const d = rm.t - rm.coverOuter * 10; // mm
    const As_prov = calcRebarArea(rm.rebarLayout.outer.diameter, rm.rebarLayout.outer.count); // mm²/m

    for (let li = 0; li < locations.length; li++) {
      const loc = locations[li];
      // Find max |M| across all load cases
      let maxAbsM = 0;
      let maxM = 0;
      let maxN = 0;
      for (let ci = 0; ci < rm.forces.length; ci++) {
        const f = rm.forces[ci][loc];
        if (Math.abs(f.M) > maxAbsM) {
          maxAbsM = Math.abs(f.M);
          maxM = f.M;
          maxN = f.N;
        }
      }

      // Required As from RC bending: M = As × σsa × j × d
      // simplified: As_req = M / (σsa × j × d)
      const nrho = n * (As_prov / (b * d));
      const k = Math.sqrt(2 * nrho + nrho * nrho) - nrho;
      const j = 1 - k / 3;
      const As_req = maxAbsM > 0 ? (maxAbsM * 1e6) / (rebar.sigma_sa * j * d) : 0; // mm²/m

      results.push({
        member: rm.key,
        location: locationLabels[li],
        M: maxM,
        N: maxN,
        As_req: As_req / 100, // cm²/m
        As_prov: As_prov / 100, // cm²/m
        ok: As_prov >= As_req,
      });
    }
  }

  return results;
}
