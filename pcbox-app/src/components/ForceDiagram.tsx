import React from 'react';
import { CalcResults, DesignInput, CaseForces } from '../types';

interface Props {
  results: CalcResults;
  input: DesignInput;
}

export default function ForceDiagram({ results, input }: Props) {
  const [caseIdx, setCaseIdx] = React.useState(0);
  const [forceType, setForceType] = React.useState<'M' | 'N' | 'S'>('M');

  const cases = results.sectionForces.stress;
  const cf = cases[caseIdx];

  const { B0, H0, t1, t2, t3, t4 } = input.dimensions;
  const spanX = (B0 + t3 / 2 + t4 / 2) / 1000;
  const spanY = (H0 + t1 / 2 + t2 / 2) / 1000;

  const svgW = 500;
  const svgH = 420;
  const margin = 60;
  const boxW = svgW - margin * 2;
  const boxH = svgH - margin * 2;

  const scaleX = boxW / spanX;
  const scaleY = boxH / spanY;

  // ボックスの4隅座標
  const corners = {
    tl: { x: margin, y: margin },                       // top-left
    tr: { x: margin + boxW, y: margin },                 // top-right
    bl: { x: margin, y: margin + boxH },                 // bottom-left
    br: { x: margin + boxW, y: margin + boxH },          // bottom-right
  };

  const ft = forceType;
  const scale = ft === 'M' ? 1.5 : ft === 'N' ? 1.0 : 1.0;

  // 各部材の値を取得
  function getVal(member: 'topSlab' | 'leftWall' | 'rightWall' | 'bottomSlab', point: string): number {
    const mf = cf[member];
    const p = (mf as any)[point];
    return p ? p[ft] : 0;
  }

  // 曲げモーメント図の描画用ポイント
  const maxVal = Math.max(
    ...['topSlab', 'leftWall', 'rightWall', 'bottomSlab'].flatMap(m =>
      ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'].map(p =>
        Math.abs(getVal(m as any, p))
      )
    ), 1
  );

  const diagScale = 60 / maxVal;

  function drawMemberDiagram(
    x1: number, y1: number, x2: number, y2: number,
    member: 'topSlab' | 'leftWall' | 'rightWall' | 'bottomSlab',
    normalDir: { nx: number; ny: number },
  ) {
    const points = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'];
    const positions = [0, 0.15, 0.5, 0.85, 1.0]; // 正規化位置

    const pathPoints: { x: number; y: number; val: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const t = positions[i];
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const val = getVal(member, points[i]);
      const offset = val * diagScale * (ft === 'M' ? -1 : 1); // Mは引張側に描画

      pathPoints.push({
        x: px + normalDir.nx * offset,
        y: py + normalDir.ny * offset,
        val,
      });
    }

    // パスを生成（軸線→ダイアグラム→軸線に戻る）
    const startX = x1 + normalDir.nx * 0;
    const startY = y1 + normalDir.ny * 0;
    const endX = x2 + normalDir.nx * 0;
    const endY = y2 + normalDir.ny * 0;

    const d = [
      `M ${startX} ${startY}`,
      ...pathPoints.map(p => `L ${p.x} ${p.y}`),
      `L ${endX} ${endY}`,
    ].join(' ');

    return (
      <g>
        <path d={d} fill="rgba(59,130,246,0.15)" stroke="rgb(59,130,246)" strokeWidth={1.5} />
        {/* 値ラベル */}
        {pathPoints.map((p, i) => (
          <text
            key={i}
            x={p.x + normalDir.nx * 10}
            y={p.y + normalDir.ny * 10}
            fontSize={8}
            fill="#333"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {p.val.toFixed(1)}
          </text>
        ))}
      </g>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="flex gap-1">
          {['M', 'N', 'S'].map(t => (
            <button
              key={t}
              className={`px-3 py-1 text-xs rounded ${forceType === t ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setForceType(t as 'M' | 'N' | 'S')}
            >
              {t === 'M' ? '曲げモーメント' : t === 'N' ? '軸力' : 'せん断力'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-4">
          {cases.map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 text-xs rounded ${caseIdx === i ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setCaseIdx(i)}
            >
              ケース{i + 1}
            </button>
          ))}
        </div>
      </div>

      <svg width={svgW} height={svgH} className="bg-white border border-gray-200 rounded">
        {/* ボックス軸線 */}
        <line x1={corners.tl.x} y1={corners.tl.y} x2={corners.tr.x} y2={corners.tr.y}
          stroke="#666" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.tl.x} y1={corners.tl.y} x2={corners.bl.x} y2={corners.bl.y}
          stroke="#666" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.tr.x} y1={corners.tr.y} x2={corners.br.x} y2={corners.br.y}
          stroke="#666" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.bl.x} y1={corners.bl.y} x2={corners.br.x} y2={corners.br.y}
          stroke="#666" strokeWidth={1} strokeDasharray="4,2" />

        {/* 頂版 */}
        {drawMemberDiagram(corners.tl.x, corners.tl.y, corners.tr.x, corners.tr.y, 'topSlab', { nx: 0, ny: -1 })}

        {/* 左側壁 */}
        {drawMemberDiagram(corners.tl.x, corners.tl.y, corners.bl.x, corners.bl.y, 'leftWall', { nx: -1, ny: 0 })}

        {/* 右側壁 */}
        {drawMemberDiagram(corners.tr.x, corners.tr.y, corners.br.x, corners.br.y, 'rightWall', { nx: 1, ny: 0 })}

        {/* 底版 */}
        {drawMemberDiagram(corners.bl.x, corners.bl.y, corners.br.x, corners.br.y, 'bottomSlab', { nx: 0, ny: 1 })}

        {/* タイトル */}
        <text x={svgW / 2} y={20} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#333">
          {forceType === 'M' ? '曲げモーメント図' : forceType === 'N' ? '軸力図' : 'せん断力図'} (検討ケース {caseIdx + 1})
        </text>
      </svg>
    </div>
  );
}
