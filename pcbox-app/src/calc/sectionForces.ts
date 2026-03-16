import { CaseForces, MemberForces } from '../types';

/** 2つのMemberForcesを係数を付けて合成 */
function combineMemberForces(
  a: MemberForces, fa: number,
  b: MemberForces, fb: number,
): MemberForces {
  const combine = (
    av: { M: number; N: number; S: number },
    bv: { M: number; N: number; S: number },
  ) => ({
    M: av.M * fa + bv.M * fb,
    N: av.N * fa + bv.N * fb,
    S: av.S * fa + bv.S * fb,
  });

  return {
    leftEnd: combine(a.leftEnd, b.leftEnd),
    haunchLeft: combine(a.haunchLeft, b.haunchLeft),
    d2Left: combine(a.d2Left, b.d2Left),
    midspan: combine(a.midspan, b.midspan),
    d2Right: combine(a.d2Right, b.d2Right),
    haunchRight: combine(a.haunchRight, b.haunchRight),
    rightEnd: combine(a.rightEnd, b.rightEnd),
  };
}

/** 3つのMemberForcesを係数を付けて合成 */
function combineMemberForces3(
  a: MemberForces, fa: number,
  b: MemberForces, fb: number,
  c: MemberForces, fc: number,
): MemberForces {
  const ab = combineMemberForces(a, fa, b, fb);
  return combineMemberForces(ab, 1.0, c, fc);
}

/** CaseForces全体を合成 */
function combineCaseForces(
  a: CaseForces, fa: number,
  b: CaseForces, fb: number,
): CaseForces {
  return {
    topSlab: combineMemberForces(a.topSlab, fa, b.topSlab, fb),
    leftWall: combineMemberForces(a.leftWall, fa, b.leftWall, fb),
    rightWall: combineMemberForces(a.rightWall, fa, b.rightWall, fb),
    bottomSlab: combineMemberForces(a.bottomSlab, fa, b.bottomSlab, fb),
  };
}

function combineCaseForces3(
  a: CaseForces, fa: number,
  b: CaseForces, fb: number,
  c: CaseForces, fc: number,
): CaseForces {
  const ab = combineCaseForces(a, fa, b, fb);
  return combineCaseForces(ab, 1.0, c, fc);
}

/**
 * 設計断面力を算出
 *
 * 検討ケース:
 *   1: 死荷重のみ
 *   2: 死+活1（鉛直）
 *   3: 死+活2（側圧）
 *   4: 死+活1+活2（鉛直+側圧同時）← FORUM8と同等
 *
 * 活荷重Case1（鉛直）とCase2（側圧）は同一荷重源（交通荷重）から
 * 生じるため、同時作用ケースを含めて最大を選択する。
 */
export function calcSectionForces(
  deadForces: CaseForces,
  live1Forces: CaseForces,
  live2Forces: CaseForces,
): {
  stress: CaseForces[];     // 応力度照査用
  rebar: CaseForces[];      // 引張鉄筋量照査用
  safety1: CaseForces[];    // 破壊安全度-1 (1.3×死+2.5×活)
  safety2: CaseForces[];    // 破壊安全度-2 (1.0×死+2.5×活)
  safety3: CaseForces[];    // 破壊安全度-3 (1.7×(死+活))
} {
  // 応力度照査用: 4ケース
  const stress = [
    combineCaseForces(deadForces, 1.0, deadForces, 0),      // case1: 死荷重のみ
    combineCaseForces(deadForces, 1.0, live1Forces, 1.0),    // case2: 死+活1
    combineCaseForces(deadForces, 1.0, live2Forces, 1.0),    // case3: 死+活2
    combineCaseForces3(deadForces, 1.0, live1Forces, 1.0, live2Forces, 1.0), // case4: 死+活1+活2
  ];

  // 引張鉄筋量照査用: 4ケース (死 + 1.35×活)
  const rebar = [
    combineCaseForces(deadForces, 1.0, deadForces, 0),
    combineCaseForces(deadForces, 1.0, live1Forces, 1.35),
    combineCaseForces(deadForces, 1.0, live2Forces, 1.35),
    combineCaseForces3(deadForces, 1.0, live1Forces, 1.35, live2Forces, 1.35),
  ];

  // 破壊安全度-1: 1.3×死 + 2.5×活
  const safety1 = [
    combineCaseForces(deadForces, 1.3, deadForces, 0),
    combineCaseForces(deadForces, 1.3, live1Forces, 2.5),
    combineCaseForces(deadForces, 1.3, live2Forces, 2.5),
    combineCaseForces3(deadForces, 1.3, live1Forces, 2.5, live2Forces, 2.5),
  ];

  // 破壊安全度-2: 1.0×死 + 2.5×活
  const safety2 = [
    combineCaseForces(deadForces, 1.0, deadForces, 0),
    combineCaseForces(deadForces, 1.0, live1Forces, 2.5),
    combineCaseForces(deadForces, 1.0, live2Forces, 2.5),
    combineCaseForces3(deadForces, 1.0, live1Forces, 2.5, live2Forces, 2.5),
  ];

  // 破壊安全度-3: 1.7×(死+活) = 1.7×死 + 1.7×活
  const safety3 = [
    combineCaseForces(deadForces, 1.7, deadForces, 0),
    combineCaseForces(deadForces, 1.7, live1Forces, 1.7),
    combineCaseForces(deadForces, 1.7, live2Forces, 1.7),
    combineCaseForces3(deadForces, 1.7, live1Forces, 1.7, live2Forces, 1.7),
  ];

  return { stress, rebar, safety1, safety2, safety3 };
}
