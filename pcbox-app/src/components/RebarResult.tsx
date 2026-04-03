import { CalcResults } from '../types';
import { RebarCheckResult } from '../calc/rebarCheck';

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

export default function RebarResult({ results }: Props) {
  const rebarCheck = results.rebarCheck as RebarCheckResult[] | undefined;
  if (!rebarCheck || rebarCheck.length === 0) return <p>計算結果がありません</p>;

  // Group by member
  const byMember = new Map<string, RebarCheckResult[]>();
  for (const r of rebarCheck) {
    const list = byMember.get(r.member) || [];
    list.push(r);
    byMember.set(r.member, list);
  }

  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-bold text-base mb-2">引張鉄筋量照査（RC）</h3>
      <p className="text-xs text-gray-500 mb-3">
        配置鉄筋量（As'）≥ 必要鉄筋量（As）を確認
      </p>

      {Array.from(byMember.entries()).map(([member, rows]) => (
        <div key={member} className="mb-3">
          <h4 className="font-bold text-sm mb-1">{member}</h4>
          <table className="border-collapse border border-gray-300 text-xs w-full">
            <thead>
              <tr>
                <th className="border px-2 py-1">位置</th>
                <th className="border px-2 py-1">M (kN·m)</th>
                <th className="border px-2 py-1">必要As (cm²/m)</th>
                <th className="border px-2 py-1">配置As' (cm²/m)</th>
                <th className="border px-2 py-1">判定</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={!r.ok ? 'bg-red-50' : ''}>
                  <td className="border px-2 py-1">{r.location}</td>
                  <td className="border px-2 py-1 text-right">{fmt(r.M, 1)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(r.As_req, 2)}</td>
                  <td className="border px-2 py-1 text-right font-bold">{fmt(r.As_prov, 2)}</td>
                  <td className="border px-2 py-1 text-center"><Badge ok={r.ok} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
