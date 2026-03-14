import React from 'react';
import { CalcResults, CaseForces, MemberForces } from '../types';

interface Props {
  results: CalcResults;
}

function fmt(v: number): string {
  return v.toFixed(1);
}

function MemberTable({ title, cases, getMember }: {
  title: string;
  cases: CaseForces[];
  getMember: (cf: CaseForces) => MemberForces;
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
                  <td className="border px-1 py-1 text-center" rowSpan={3}>{ci + 1}</td>
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

export default function ForceTable({ results }: Props) {
  const [section, setSection] = React.useState<'stress' | 'rebar' | 'safety1' | 'safety2' | 'safety3'>('stress');

  const sectionLabels = {
    stress: '応力度照査用',
    rebar: '引張鉄筋量照査用 (死+1.35×活)',
    safety1: '破壊安全度-1 (1.3×死+2.5×活)',
    safety2: '破壊安全度-2 (1.0×死+2.5×活)',
    safety3: '破壊安全度-3 (1.7×(死+活))',
  };

  const cases = results.sectionForces[section];

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

      <MemberTable title="頂　版" cases={cases} getMember={cf => cf.topSlab} />
      <MemberTable title="左側壁" cases={cases} getMember={cf => cf.leftWall} />
      <MemberTable title="右側壁" cases={cases} getMember={cf => cf.rightWall} />
      <MemberTable title="底　版" cases={cases} getMember={cf => cf.bottomSlab} />
    </div>
  );
}
