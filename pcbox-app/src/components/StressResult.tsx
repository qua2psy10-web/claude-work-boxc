import { CalcResults, StressCheckPoint, RCStressCheckPoint } from '../types';

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

function PCWorstSummary({ label, points }: { label: string; points: Record<string, StressCheckPoint[]> }) {
  let worstMember = '';
  let worstRatio = 0;
  let worstOk = true;
  for (const [key, pts] of Object.entries(points)) {
    for (const p of pts) {
      const rc = p.sigma_c / p.sigma_ca;
      const rt = -p.sigma_t / Math.max(Math.abs(p.sigma_ta), 0.01);
      const ratio = Math.max(rc, rt);
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstMember = key;
        worstOk = p.ok_c && p.ok_t;
      }
    }
  }
  if (!worstMember) return null;
  return (
    <div className={`text-xs px-3 py-1.5 rounded mb-2 ${worstOk ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      {label}: 最厳しい部材 = <span className="font-bold">{worstMember}</span>（使用率 {(worstRatio * 100).toFixed(1)}%）
    </div>
  );
}

function RCWorstSummary({ points }: { points: Record<string, RCStressCheckPoint[]> }) {
  let worstMember = '';
  let worstRatio = 0;
  let worstOk = true;
  for (const [key, pts] of Object.entries(points)) {
    for (const p of pts) {
      const rc = p.sigma_c / p.sigma_ca;
      const rs = p.sigma_s / p.sigma_sa;
      const ratio = Math.max(rc, rs);
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
            <PCWorstSummary label="死荷重時" points={stressCheck.pc_dead} />
            {Object.entries(stressCheck.pc_dead).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
                      <th className="border px-1 py-1">σc (N/mm²)</th>
                      <th className="border px-1 py-1">σca</th>
                      <th className="border px-1 py-1">使用率</th>
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
                      const ratioC = p.sigma_c / p.sigma_ca;
                      const rowNg = !p.ok_c || !p.ok_t;
                      return (
                        <tr key={i} className={rowNg ? 'bg-red-50' : ''}>
                          <td className="border px-1 py-1">{loc}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                          <td className="border px-1 py-1 text-right">{(ratioC * 100).toFixed(0)}%<UsageBar ratio={ratioC} /></td>
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
            <PCWorstSummary label="設計荷重時" points={stressCheck.pc_design} />
            {Object.entries(stressCheck.pc_design).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
                      <th className="border px-1 py-1">σc (N/mm²)</th>
                      <th className="border px-1 py-1">σca</th>
                      <th className="border px-1 py-1">使用率</th>
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
                      const ratioC = p.sigma_c / p.sigma_ca;
                      const rowNg = !p.ok_c || !p.ok_t;
                      return (
                        <tr key={i} className={rowNg ? 'bg-red-50' : ''}>
                          <td className="border px-1 py-1">{loc}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_c)}</td>
                          <td className="border px-1 py-1 text-right">{fmt(p.sigma_ca)}</td>
                          <td className="border px-1 py-1 text-right">{(ratioC * 100).toFixed(0)}%<UsageBar ratio={ratioC} /></td>
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

          {/* PC部材 せん断照査 */}
          {(stressCheck.pc_shear_dead.length > 0 || stressCheck.pc_shear_design.length > 0) && (
            <div>
              <h3 className="font-bold text-base mb-2">PC部材 せん断応力度照査</h3>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr>
                    <th className="border px-1 py-1">位置</th>
                    <th className="border px-1 py-1">荷重</th>
                    <th className="border px-1 py-1">S (kN)</th>
                    <th className="border px-1 py-1">τ (N/mm²)</th>
                    <th className="border px-1 py-1">k</th>
                    <th className="border px-1 py-1">τca (N/mm²)</th>
                    <th className="border px-1 py-1">使用率</th>
                    <th className="border px-1 py-1">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {stressCheck.pc_shear_dead.map((p, i) => {
                    const ratio = p.tau / p.tau_ca;
                    return (
                      <tr key={`dead-${i}`} className={!p.ok ? 'bg-red-50' : ''}>
                        <td className="border px-1 py-1">{p.location}</td>
                        <td className="border px-1 py-1">死荷重</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.S, 1)}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.tau, 3)}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.k, 3)}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.tau_ca, 3)}</td>
                        <td className="border px-1 py-1 text-right">{(ratio * 100).toFixed(0)}%<UsageBar ratio={ratio} /></td>
                        <td className="border px-1 py-1 text-center"><Badge ok={p.ok} /></td>
                      </tr>
                    );
                  })}
                  {stressCheck.pc_shear_design.map((p, i) => {
                    const ratio = p.tau / p.tau_ca;
                    return (
                      <tr key={`design-${i}`} className={!p.ok ? 'bg-red-50' : ''}>
                        <td className="border px-1 py-1">{p.location}</td>
                        <td className="border px-1 py-1">設計荷重</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.S, 1)}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.tau, 3)}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.k, 3)}</td>
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

          <div>
            <h3 className="font-bold text-base mb-2">RC部材 応力度照査</h3>
            <RCWorstSummary points={stressCheck.rc} />
            {Object.entries(stressCheck.rc).map(([key, points]) => (
              <div key={key} className="mb-3">
                <h4 className="font-bold text-sm">{key}</h4>
                <table className="border-collapse border border-gray-300 text-xs w-full">
                  <thead>
                    <tr>
                      <th className="border px-1 py-1">位置</th>
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
                    {['上端部', 'ハンチ端', '支間部', 'ハンチ端', '下端部'].map((loc, i) => {
                      const p = points[i];
                      if (!p) return null;
                      const ratioC = p.sigma_c / p.sigma_ca;
                      const ratioS = p.sigma_s / p.sigma_sa;
                      const rowNg = !p.ok_c || !p.ok_s;
                      return (
                        <tr key={i} className={rowNg ? 'bg-red-50' : ''}>
                          <td className="border px-1 py-1">{loc}</td>
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

          {/* RC部材 せん断照査 */}
          {stressCheck.rc_shear.length > 0 && (
            <div>
              <h3 className="font-bold text-base mb-2">RC部材 せん断応力度照査</h3>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr>
                    <th className="border px-1 py-1">位置</th>
                    <th className="border px-1 py-1">S (kN)</th>
                    <th className="border px-1 py-1">τ (N/mm²)</th>
                    <th className="border px-1 py-1">τa (N/mm²)</th>
                    <th className="border px-1 py-1">使用率</th>
                    <th className="border px-1 py-1">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {stressCheck.rc_shear.map((p, i) => {
                    const ratio = p.tau / p.tau_ca;
                    return (
                      <tr key={i} className={!p.ok ? 'bg-red-50' : ''}>
                        <td className="border px-1 py-1">{p.location}</td>
                        <td className="border px-1 py-1 text-right">{fmt(p.S, 1)}</td>
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
        </>
      )}
    </div>
  );
}
