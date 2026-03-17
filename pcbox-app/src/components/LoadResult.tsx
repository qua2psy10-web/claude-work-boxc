import { CalcResults } from '../types';

interface Props {
  results: CalcResults;
}

function fmt(v: number, d: number = 2): string {
  return v.toFixed(d);
}

export default function LoadResult({ results }: Props) {
  const { deadLoad, liveLoad1, liveLoad2 } = results;

  return (
    <div className="space-y-6 text-sm">
      {/* 死荷重 */}
      <div>
        <h3 className="font-bold text-base mb-2">死荷重 (case-1)</h3>

        <div className="mb-3">
          <h4 className="font-bold mb-1">躯体自重</h4>
          <table className="border-collapse border border-gray-300 text-xs">
            <tbody>
              <tr><td className="border px-2 py-1">頂版自重</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.selfWeight.topSlab)} kN/m²</td></tr>
              <tr><td className="border px-2 py-1">左側壁</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.selfWeight.leftWall)} kN/m²</td></tr>
              <tr><td className="border px-2 py-1">右側壁</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.selfWeight.rightWall)} kN/m²</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mb-3">
          <h4 className="font-bold mb-1">上載荷重</h4>
          <p>Σwd = {fmt(deadLoad.surcharge)} kN/m²</p>
        </div>

        <div className="mb-3">
          <h4 className="font-bold mb-1">土圧強度</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">左側壁</p>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr><th className="border px-2 py-1">着目位置</th><th className="border px-2 py-1">p (kN/m)</th></tr>
                </thead>
                <tbody>
                  <tr><td className="border px-2 py-1">頂版天端</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.left.p1)}</td></tr>
                  <tr><td className="border px-2 py-1">頂版軸線</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.left.p2)}</td></tr>
                  <tr><td className="border px-2 py-1">底版軸線</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.left.p3)}</td></tr>
                  <tr><td className="border px-2 py-1">底面</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.left.p4)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <p className="font-medium">右側壁</p>
              <table className="border-collapse border border-gray-300 text-xs w-full">
                <thead>
                  <tr><th className="border px-2 py-1">着目位置</th><th className="border px-2 py-1">p (kN/m)</th></tr>
                </thead>
                <tbody>
                  <tr><td className="border px-2 py-1">頂版天端</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.right.p1)}</td></tr>
                  <tr><td className="border px-2 py-1">頂版軸線</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.right.p2)}</td></tr>
                  <tr><td className="border px-2 py-1">底版軸線</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.right.p3)}</td></tr>
                  <tr><td className="border px-2 py-1">底面</td><td className="border px-2 py-1 text-right">{fmt(deadLoad.earthPressure.right.p4)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {(deadLoad.waterPressure.outer.pw_botAxis > 0 || deadLoad.waterPressure.inner.pw_botAxis > 0) && (
          <div className="mb-3">
            <h4 className="font-bold mb-1">水圧強度</h4>
            <table className="border-collapse border border-gray-300 text-xs">
              <thead>
                <tr>
                  <th className="border px-2 py-1">着目位置</th>
                  <th className="border px-2 py-1">外水圧 (kN/m²)</th>
                  <th className="border px-2 py-1">内水圧 (kN/m²)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1">頂版軸線</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.outer.pw_topAxis)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.inner.pw_topAxis)}</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">底版軸線</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.outer.pw_botAxis)}</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.inner.pw_botAxis)}</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">底版揚圧</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.outer.uplift)}</td>
                  <td className="border px-2 py-1 text-right">—</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1">内水重量</td>
                  <td className="border px-2 py-1 text-right">—</td>
                  <td className="border px-2 py-1 text-right">{fmt(deadLoad.waterPressure.inner.weight)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-3">
          <h4 className="font-bold mb-1">外力集計</h4>
          <table className="border-collapse border border-gray-300 text-xs">
            <thead>
              <tr>
                <th className="border px-2 py-1">項目</th>
                <th className="border px-2 py-1">V (kN/m)</th>
                <th className="border px-2 py-1">H (kN/m)</th>
                <th className="border px-2 py-1">x (m)</th>
                <th className="border px-2 py-1">y (m)</th>
                <th className="border px-2 py-1">M (kN·m/m)</th>
              </tr>
            </thead>
            <tbody>
              {deadLoad.forces.map((f, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{f.label}</td>
                  <td className="border px-2 py-1 text-right">{f.V ? fmt(f.V) : '—'}</td>
                  <td className="border px-2 py-1 text-right">{f.H ? fmt(f.H) : '—'}</td>
                  <td className="border px-2 py-1 text-right">{f.x ? fmt(f.x, 3) : '—'}</td>
                  <td className="border px-2 py-1 text-right">{f.y ? fmt(f.y, 3) : '—'}</td>
                  <td className="border px-2 py-1 text-right">{fmt(f.M)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border px-2 py-1">合計</td>
                <td className="border px-2 py-1 text-right">{fmt(deadLoad.totalV)}</td>
                <td className="border px-2 py-1" colSpan={3}></td>
                <td className="border px-2 py-1 text-right">{fmt(deadLoad.totalM)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="font-bold mb-1">地盤反力度</h4>
          <p>偏心距離 e = {fmt(deadLoad.eccentricity, 3)} m</p>
          <p>q(左) = {fmt(deadLoad.groundReaction.qLeft)} kN/m²</p>
          <p>q(右) = {fmt(deadLoad.groundReaction.qRight)} kN/m²</p>
        </div>
      </div>

      {/* 活荷重 Case-1 */}
      <div>
        <h3 className="font-bold text-base mb-2">活荷重 (case-1): T荷重</h3>
        <p>Pl+i = {fmt(liveLoad1.Pl_i)} kN/m</p>
        <p>Pvl = {fmt(liveLoad1.Pvl)} kN/m²</p>
        <div className="mt-2">
          <h4 className="font-bold mb-1">地盤反力度</h4>
          <p>q(左) = {fmt(liveLoad1.groundReaction.qLeft)} kN/m²</p>
          <p>q(右) = {fmt(liveLoad1.groundReaction.qRight)} kN/m²</p>
        </div>
      </div>

      {/* 活荷重 Case-2 */}
      <div>
        <h3 className="font-bold text-base mb-2">活荷重 (case-2): 側圧</h3>
        {liveLoad2.forces.map((f, i) => (
          <p key={i}>{f.label}: H = {fmt(f.H)} kN/m</p>
        ))}
      </div>
    </div>
  );
}
