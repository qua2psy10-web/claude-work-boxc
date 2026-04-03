import { CalcResults, RCStressCheckPoint } from '../types';

interface Props {
  results: CalcResults;
}

function fmt(v: number, d: number = 2): string {
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
  const pct = Math.min(ratio * 100, 100);
  const color = ratio > 1 ? 'bg-red-400' : ratio > 0.8 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="w-16 h-2 bg-gray-200 rounded-full inline-block ml-1 align-middle">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function WorstSummary({ points }: { points: Record<string, RCStressCheckPoint[]> }) {
  let worstMember = '';
  let worstRatio = 0;
  let worstOk = true;
  for (const [key, pts] of Object.entries(points)) {
    for (const p of pts) {
      const ratio = Math.max(p.sigma_ca > 0 ? p.sigma_c / p.sigma_ca : 0, p.sigma_sa > 0 ? p.sigma_s / p.sigma_sa : 0);
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstMember = key;
        worstOk = p.ok_c && p.ok_s;
      }
    }
  }
  if (!worstMember) return null;
  return (
    <div className={`text-xs px-3 py-1.5 rounded mb-2 ${worstOk ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      最厳しい部材 = <span className="font-bold">{worstMember}</span>（使用率 {(worstRatio * 100).toFixed(1)}%）
    </div>
  );
}

export default function StressResult({ results }: Props) {
  const { stressCheck } = results;
  if (!stressCheck) return <p>計算結果がありません</p>;

  const locationLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  return (
    <div className="space-y-6 text-sm">
      {/* RC曲げ応力度照査 */}
      <div>
        <h3 className="font-bold text-base mb-2">RC部材 曲げ応力度照査</h3>
        <p className="text-xs text-gray-500 mb-2">各照査点で最も不利な荷重ケースを表示</p>
        <WorstSummary points={stressCheck.bending} />
        {Object.entries(stressCheck.bending).map(([key, points]) => (
          <div key={key} className="mb-3">
            <h4 className="font-bold text-sm mb-1">{key}</h4>
            <table className="border-collapse border border-gray-300 text-xs w-full">
              <thead>
                <tr>
                  <th className="border px-1 py-1">位置</th>
                  <th className="border px-1 py-1">M (kN·m)</th>
                  <th className="border px-1 py-1">σc (N/mm²)</th>
                  <th className="border px-1 py-1">σca</th>
                  <th className="border px-1 py-1">使用率</th>
                  <th className="border px-1 py-1">判定</th>
                  <th className="border px-1 py-1">σs (N/mm²)</th>
                  <th className="border px-1 py-1">σsa</th>
                  <th className="border px-1 py-1">使用率</th>
                  <th className="border px-1 py-1">判定</th>
                </tr>
              </thead>
              <tbody>
                {locationLabels.map((loc, i) => {
                  const p = points[i];
                  if (!p) return null;
                  const ratioC = p.sigma_ca > 0 ? p.sigma_c / p.sigma_ca : 0;
                  const ratioS = p.sigma_sa > 0 ? p.sigma_s / p.sigma_sa : 0;
                  const rowNg = !p.ok_c || !p.ok_s;
                  return (
                    <tr key={i} className={rowNg ? 'bg-red-50' : ''}>
                      <td className="border px-1 py-1">{loc}</td>
                      <td className="border px-1 py-1 text-right">{fmt(p.M, 1)}</td>
                      <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                      <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                      <td className="border px-1 py-1 text-right">{(ratioC * 100).toFixed(0)}%<UsageBar ratio={ratioC} /></td>
                      <td className="border px-1 py-1 text-center"><Badge ok={p.ok_c} /></td>
                      <td className="border px-1 py-1 text-right">{fmt(p.sigma_s)}</td>
                      <td className="border px-1 py-1 text-right">{fmt(p.sigma_sa)}</td>
                      <td className="border px-1 py-1 text-right">{(ratioS * 100).toFixed(0)}%<UsageBar ratio={ratioS} /></td>
                      <td className="border px-1 py-1 text-center"><Badge ok={p.ok_s} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* せん断応力度照査 */}
      {stressCheck.shear.length > 0 && (
        <div>
          <h3 className="font-bold text-base mb-2">RC部材 せん断応力度照査</h3>
          <table className="border-collapse border border-gray-300 text-xs w-full">
            <thead>
              <tr>
                <th className="border px-1 py-1">位置</th>
                <th className="border px-1 py-1">S (kN)</th>
                <th className="border px-1 py-1">d (cm)</th>
                <th className="border px-1 py-1">τ (N/mm²)</th>
                <th className="border px-1 py-1">τa (N/mm²)</th>
                <th className="border px-1 py-1">使用率</th>
                <th className="border px-1 py-1">判定</th>
              </tr>
            </thead>
            <tbody>
              {stressCheck.shear.map((p, i) => {
                const ratio = p.tau_ca > 0 ? p.tau / p.tau_ca : 0;
                return (
                  <tr key={i} className={!p.ok ? 'bg-red-50' : ''}>
                    <td className="border px-1 py-1">{p.location}</td>
                    <td className="border px-1 py-1 text-right">{fmt(p.S, 1)}</td>
                    <td className="border px-1 py-1 text-right">{fmt(p.d, 1)}</td>
                    <td className="border px-1 py-1 text-right">{fmt(p.tau, 3)}</td>
                    <td className="border px-1 py-1 text-right">{fmt(p.tau_ca, 3)}</td>
                    <td className="border px-1 py-1 text-right">{(ratio * 100).toFixed(0)}%<UsageBar ratio={ratio} /></td>
                    <td className="border px-1 py-1 text-center"><Badge ok={p.ok} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
