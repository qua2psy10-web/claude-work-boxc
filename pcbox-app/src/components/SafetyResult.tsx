import { CalcResults } from '../types';

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

export default function SafetyResult({ results }: Props) {
  const { safetyCheck } = results;
  if (!safetyCheck) return <p>計算結果がありません</p>;

  return (
    <div className="space-y-6 text-sm">
      <h3 className="font-bold text-base mb-2">破壊安全度照査</h3>

      {/* PC部材 */}
      <div>
        <h4 className="font-bold mb-2">PC部材</h4>
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
                    <th className="border px-1 py-1">判定</th>
                    <th className="border px-1 py-1">組合せ</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocation.map((p, i) => {
                    if (!p) return null;
                    return (
                      <tr key={i}>
                        <td className="border px-1 py-1">{locations[i]}</td>
                        <td className="border px-1 py-1 text-right">{p.Md.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Nd.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Mu.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right font-bold">{fmt(p.ratio, 3)}</td>
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
                    <th className="border px-1 py-1">判定</th>
                    <th className="border px-1 py-1">組合せ</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocation.map((p, i) => {
                    if (!p) return null;
                    return (
                      <tr key={i}>
                        <td className="border px-1 py-1">{locations[i]}</td>
                        <td className="border px-1 py-1 text-right">{p.Md.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Nd.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right">{p.Mu.toFixed(1)}</td>
                        <td className="border px-1 py-1 text-right font-bold">{fmt(p.ratio, 3)}</td>
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
