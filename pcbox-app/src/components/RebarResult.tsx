import { CalcResults } from '../types';

interface Props {
  results: CalcResults;
}

function fmt(v: number, d: number = 2): string {
  return v.toFixed(d);
}

export default function RebarResult({ results }: Props) {
  const { rebarCheck } = results;
  if (!rebarCheck) return <p>計算結果がありません</p>;

  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-bold text-base mb-2">引張鉄筋量照査</h3>
      <p className="text-xs text-gray-600 mb-3">
        荷重の組合せ: 死荷重 + 1.35×活荷重 + 有効プレストレス力
      </p>

      <table className="border-collapse border border-gray-300 text-xs w-full">
        <thead>
          <tr>
            <th className="border px-2 py-1">部材</th>
            <th className="border px-2 py-1">M (kN·m)</th>
            <th className="border px-2 py-1">N (kN)</th>
            <th className="border px-2 py-1">σc (N/mm²)</th>
            <th className="border px-2 py-1">σt (N/mm²)</th>
            <th className="border px-2 py-1">x (cm)</th>
            <th className="border px-2 py-1">As1 (cm²)</th>
            <th className="border px-2 py-1">As2 (cm²)</th>
            <th className="border px-2 py-1">As (cm²)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rebarCheck).map(([key, r]) => (
            <tr key={key}>
              <td className="border px-2 py-1 font-bold">{key}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.M, 1)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.N, 1)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.sigma_c)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.sigma_t)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.x, 3)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.As1, 3)}</td>
              <td className="border px-2 py-1 text-right">{fmt(r.As2, 3)}</td>
              <td className="border px-2 py-1 text-right font-bold">{fmt(r.As, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
