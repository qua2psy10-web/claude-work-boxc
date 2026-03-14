import { CalcResults } from '../types';

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

export default function StressResult({ results }: Props) {
  const { prestress, stressCheck } = results;

  return (
    <div className="space-y-6 text-sm">
      {/* 有効プレストレス */}
      <div>
        <h3 className="font-bold text-base mb-2">有効プレストレス</h3>
        <table className="border-collapse border border-gray-300 text-xs">
          <thead>
            <tr>
              <th className="border px-2 py-1"></th>
              <th className="border px-2 py-1">σpt (N/mm²)</th>
              <th className="border px-2 py-1">Δσpr (N/mm²)</th>
              <th className="border px-2 py-1">Δσpψ (N/mm²)</th>
              <th className="border px-2 py-1">σpe (N/mm²)</th>
              <th className="border px-2 py-1">Ap' (mm²)</th>
              <th className="border px-2 py-1">Pe (kN)</th>
            </tr>
          </thead>
          <tbody>
            {(['top', 'bottom'] as const).map(key => {
              const p = prestress[key];
              return (
                <tr key={key}>
                  <td className="border px-2 py-1 font-bold">{key === 'top' ? '頂版' : '底版'}</td>
                  <td className="border px-2 py-1 text-right">861.00</td>
                  <td className="border px-2 py-1 text-right">{fmt(p.delta_sigma_pr)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(p.delta_sigma_ppsi)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(p.sigma_pe)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(p.Ap_per_m, 1)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(p.Pe, 3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PC部材 応力度照査 */}
      {stressCheck && (
        <>
          <div>
            <h3 className="font-bold text-base mb-2">PC部材 応力度照査（死荷重時）</h3>
            {Object.entries(stressCheck.pc_dead).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
                      <th className="border px-1 py-1">σc (N/mm²)</th>
                      <th className="border px-1 py-1">σca</th>
                      <th className="border px-1 py-1">判定</th>
                      <th className="border px-1 py-1">σt (N/mm²)</th>
                      <th className="border px-1 py-1">σta</th>
                      <th className="border px-1 py-1">判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'].map((loc, i) => {
                      const p = points[i];
                      if (!p) return null;
                      return (
                        <tr key={i}>
                          <td className="border px-1 py-1">{loc}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_c} /></td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_t)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ta)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_t} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-bold text-base mb-2">PC部材 応力度照査（設計荷重時）</h3>
            {Object.entries(stressCheck.pc_design).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
                      <th className="border px-1 py-1">σc (N/mm²)</th>
                      <th className="border px-1 py-1">σca</th>
                      <th className="border px-1 py-1">判定</th>
                      <th className="border px-1 py-1">σt (N/mm²)</th>
                      <th className="border px-1 py-1">σta</th>
                      <th className="border px-1 py-1">判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'].map((loc, i) => {
                      const p = points[i];
                      if (!p) return null;
                      return (
                        <tr key={i}>
                          <td className="border px-1 py-1">{loc}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_c} /></td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_t)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ta)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_t} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-bold text-base mb-2">RC部材 応力度照査</h3>
            {Object.entries(stressCheck.rc).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
                      <th className="border px-1 py-1">σc (N/mm²)</th>
                      <th className="border px-1 py-1">σca</th>
                      <th className="border px-1 py-1">判定</th>
                      <th className="border px-1 py-1">σs (N/mm²)</th>
                      <th className="border px-1 py-1">σsa</th>
                      <th className="border px-1 py-1">判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['上端部', 'ハンチ端', '支間部', 'ハンチ端', '下端部'].map((loc, i) => {
                      const p = points[i];
                      if (!p) return null;
                      return (
                        <tr key={i}>
                          <td className="border px-1 py-1">{loc}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_c} /></td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_s)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_sa)}</td>
                          <td className="border px-1 py-1 text-center"><Badge ok={p.ok_s} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
