import React from 'react';
import { CalcResults, DesignInput, CaseForces, MemberForces, cfTopSlab, cfBottomSlab, cfLeftWall, cfRightWall } from '../types';

interface Props {
  results: CalcResults;
  input: DesignInput;
}

function fmt(v: number): string {
  return v.toFixed(1);
}

function MemberTable({ title, cases, getMember, caseLabels }: {
  title: string;
  cases: CaseForces[];
  getMember: (cf: CaseForces) => MemberForces;
  caseLabels: string[];
}) {
  const points = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
  const pointLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  return (
    <div className="mb-4">
      <h4 className="font-bold text-sm mb-1">{title}</h4>
      <table className="border-collapse border border-gray-300 text-xs w-full">
        <thead>
          <tr>
            <th className="border px-1 py-1">CASE</th>
            <th className="border px-1 py-1"></th>
            {pointLabels.map((l, i) => (
              <th key={i} className="border px-1 py-1">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map((cf, ci) => {
            const mf = getMember(cf);
            return (
              <React.Fragment key={ci}>
                <tr>
                  <td className="border px-1 py-1 text-center whitespace-nowrap" rowSpan={3} title={caseLabels[ci] || ''}>{caseLabels[ci] || `${ci + 1}`}</td>
                  <td className="border px-1 py-1">M(kN·m)</td>
                  {points.map((p, pi) => (
                    <td key={pi} className="border px-1 py-1 text-right">{fmt(mf[p].M)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border px-1 py-1">N(kN)</td>
                  {points.map((p, pi) => (
                    <td key={pi} className="border px-1 py-1 text-right">{fmt(mf[p].N)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="border px-1 py-1">S(kN)</td>
                  {points.map((p, pi) => (
                    <td key={pi} className="border px-1 py-1 text-right">{fmt(mf[p].S)}</td>
                  ))}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ForceTable({ results, input }: Props) {
  const numCells = input.dimensions.numCells;
  const [section, setSection] = React.useState<'stress' | 'safety1' | 'safety2' | 'safety3'>('stress');

  const sectionLabels = {
    stress: '応力度照査用',
    safety1: '破壊安全度-1 (1.3×死+2.5×活)',
    safety2: '破壊安全度-2 (1.0×死+2.5×活)',
    safety3: '破壊安全度-3 (1.7×(死+活))',
  };

  const caseLabelsMap: Record<string, string[]> = {
    stress: ['D', 'D+L1', 'D+L2', 'D+L1+L2'],
    safety1: ['1.3D', '1.3D+2.5L1', '1.3D+2.5L2', '1.3D+2.5(L1+L2)'],
    safety2: ['D', 'D+2.5L1', 'D+2.5L2', 'D+2.5(L1+L2)'],
    safety3: ['1.7D', '1.7(D+L1)', '1.7(D+L2)', '1.7(D+L1+L2)'],
  };

  const cases = results.sectionForces[section];
  const currentCaseLabels = caseLabelsMap[section] || [];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(sectionLabels).map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-1 text-xs rounded ${
              section === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setSection(key as typeof section)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 頂版 */}
      {numCells > 1
        ? Array.from({ length: numCells }).map((_, ci) => (
            <MemberTable key={`top-${ci}`} title={`頂版${ci + 1}`} cases={cases} getMember={cf => cf.topSlabs[ci]} caseLabels={currentCaseLabels} />
          ))
        : <MemberTable title="頂　版" cases={cases} getMember={cf => cfTopSlab(cf)} caseLabels={currentCaseLabels} />
      }
      {/* 壁 */}
      <MemberTable title="左側壁" cases={cases} getMember={cf => cfLeftWall(cf)} caseLabels={currentCaseLabels} />
      {input.dimensions.midWallThicknesses.map((_, wi) => (
        <MemberTable key={`mw-${wi}`} title={`中壁${wi + 1}`} cases={cases} getMember={cf => cf.walls[wi + 1]} caseLabels={currentCaseLabels} />
      ))}
      <MemberTable title="右側壁" cases={cases} getMember={cf => cfRightWall(cf)} caseLabels={currentCaseLabels} />
      {/* 底版 */}
      {numCells > 1
        ? Array.from({ length: numCells }).map((_, ci) => (
            <MemberTable key={`bot-${ci}`} title={`底版${ci + 1}`} cases={cases} getMember={cf => cf.bottomSlabs[ci]} caseLabels={currentCaseLabels} />
          ))
        : <MemberTable title="底　版" cases={cases} getMember={cf => cfBottomSlab(cf)} caseLabels={currentCaseLabels} />
      }
    </div>
  );
}
