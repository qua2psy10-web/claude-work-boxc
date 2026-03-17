import { CalcResults, SafetyCheckResult } from '../types';

interface Props {
  results: CalcResults;
}

function fmt(v: number, d: number = 2): string {
  if (v > 100) return '>100';
  return v.toFixed(d);
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {ok ? 'OK' : 'NG'}
    </span>
  );
}

function UsageBar({ ratio }: { ratio: number }) {
  // For safety, ratio > 1 means OK (Mu/Md >= 1). Invert for display: usage = 1/ratio
  const usage = ratio > 0.001 ? 1 / ratio : 999;
  const pct = Math.min(usage * 100, 100);
  const color = usage > 1 ? 'bg-red-400' : usage > 0.8 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="w-16 h-2 bg-gray-200 rounded-full inline-block ml-1 align-middle">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function WorstSummary({ label, members }: { label: string; members: Record<string, SafetyCheckResult[]> }) {
  let worstMember = '';
  let worstRatio = Infinity;
  let worstOk = true;
  for (const [key, checks] of Object.entries(members)) {
    for (const c of checks) {
      if (c.ratio < worstRatio) {
        worstRatio = c.ratio;
        worstMember = key;
        worstOk = c.ok;
      }
    }
  }
  if (!worstMember) return null;
  return (
    <div className={`text-xs px-3 py-1.5 rounded mb-2 ${worstOk ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      {label}: 最厳しい部材 = <span className="font-bold">{worstMember}</span>（Mu/Md = {fmt(worstRatio, 3)}）
    </div>
  );
}

export default function SafetyResult({ results }: Props) {
  const { safetyCheck } = results;
  if (!safetyCheck) return <p>計算結果がありません</p>;

  return (
    <div className="space-y-6 text-sm">
      <h3 className="font-bold text-base mb-2">破壊安全度照査</h3>

      {/* PC部材 */}
      <div>
        <h4 className="font-bold mb-2">PC部材</h4>
        <WorstSummary label="PC部材" members={safetyCheck.pc} />
        {Object.entries(safetyCheck.pc).map(([key, checks]) => {
          // 最小のratioを持つ結果を各位置ごとに抽出
          const locations = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];
          const perLocation = locations.map((_, li) => {
            const relevant = checks.filter((_, ci) => ci % 5 === li);
            if (relevant.length === 0) return null;
            return relevant.reduce((min, c) => c.ratio < min.ratio ? c : min, relevant[0]);
          });

          return (
            <div key={key} className="mb-3">
              <h5 className="font-medium text-sm">{key}</h5>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr>
                    <th className="border px-1 py-1">位置</th>
                    <th className="border px-1 py-1">Md (kN·m)</th>
                    <th className="border px-1 py-1">Nd (kN)</th>
                    <th className="border px-1 py-1">Mu (kN·m)</th>
                    <th className="border px-1 py-1">Mu/Md</th>
                    <th className="border px-1 py-1">安全率</th>
                    <th className="border px-1 py-1">判定</th>
                    <th className="border px-1 py-1">組合せ</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocation.map((p, i) => {
                    if (!p) return null;
                    return (
                      <tr key={i} className={!p.ok ? 'bg-red-50' : ''}>
                        <td className="border px-1 py-1">{locations[i]}</td>
                        <td className="border px-1 py-1 text-right">{p.Md.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Nd.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Mu.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right font-bold">{fmt(p.ratio, 3)}</td>
                        <td className="border px-1 py-1"><UsageBar ratio={p.ratio} /></td>
                        <td className="border px-1 py-1 text-center"><Badge ok={p.ok} /></td>
                        <td className="border px-1 py-1 text-xs">{p.caseLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* RC部材 */}
      <div>
        <h4 className="font-bold mb-2">RC部材</h4>
        <WorstSummary label="RC部材" members={safetyCheck.rc} />
        {Object.entries(safetyCheck.rc).map(([key, checks]) => {
          const locations = ['上端部', 'ハンチ端', '支間部', 'ハンチ端', '下端部'];
          const perLocation = locations.map((_, li) => {
            const relevant = checks.filter((_, ci) => ci % 5 === li);
            if (relevant.length === 0) return null;
            return relevant.reduce((min, c) => c.ratio < min.ratio ? c : min, relevant[0]);
          });

          return (
            <div key={key} className="mb-3">
              <h5 className="font-medium text-sm">{key}</h5>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr>
                    <th className="border px-1 py-1">位置</th>
                    <th className="border px-1 py-1">Md (kN·m)</th>
                    <th className="border px-1 py-1">Nd (kN)</th>
                    <th className="border px-1 py-1">Mu (kN·m)</th>
                    <th className="border px-1 py-1">Mu/Md</th>
                    <th className="border px-1 py-1">安全率</th>
                    <th className="border px-1 py-1">判定</th>
                    <th className="border px-1 py-1">組合せ</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocation.map((p, i) => {
                    if (!p) return null;
                    return (
                      <tr key={i} className={!p.ok ? 'bg-red-50' : ''}>
                        <td className="border px-1 py-1">{locations[i]}</td>
                        <td className="border px-1 py-1 text-right">{p.Md.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Nd.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Mu.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right font-bold">{fmt(p.ratio, 3)}</td>
                        <td className="border px-1 py-1"><UsageBar ratio={p.ratio} /></td>
                        <td className="border px-1 py-1 text-center"><Badge ok={p.ok} /></td>
                        <td className="border px-1 py-1 text-xs">{p.caseLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
