import React from 'react';
import { CalcResults, DesignInput, CaseForces } from '../types';

interface Props {
  results: CalcResults;
  input: DesignInput;
}

const caseLabels = ['死荷重', '死+活1', '死+活2'];

export default function ForceDiagram({ results, input }: Props) {
  const [caseIdx, setCaseIdx] = React.useState(0);
  const [forceType, setForceType] = React.useState<'M' | 'N' | 'S'>('M');
  const [hovered, setHovered] = React.useState<{ member: string; point: string; val: number; x: number; y: number } | null>(null);

  const cases = results.sectionForces.stress;
  const cf = cases[caseIdx];

  const { B0, H0, t1, t2, t3, t4 } = input.dimensions;
  const spanX = (B0 + t3 / 2 + t4 / 2) / 1000;
  const spanY = (H0 + t1 / 2 + t2 / 2) / 1000;

  const svgW = 560;
  const svgH = 460;
  const margin = 80;
  const boxW = svgW - margin * 2;
  const boxH = svgH - margin * 2;

  const corners = {
    tl: { x: margin, y: margin },
    tr: { x: margin + boxW, y: margin },
    bl: { x: margin, y: margin + boxH },
    br: { x: margin + boxW, y: margin + boxH },
  };

  const ft = forceType;

  function getVal(member: 'topSlab' | 'leftWall' | 'rightWall' | 'bottomSlab', point: string): number {
    const mf = cf[member];
    const p = (mf as any)[point];
    return p ? p[ft] : 0;
  }

  const allPoints = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'];
  const allMembers: Array<'topSlab' | 'leftWall' | 'rightWall' | 'bottomSlab'> = ['topSlab', 'leftWall', 'rightWall', 'bottomSlab'];

  const maxVal = Math.max(
    ...allMembers.flatMap(m =>
      allPoints.map(p => Math.abs(getVal(m, p)))
    ), 1
  );

  const diagScale = 55 / maxVal;

  const memberLabels: Record<string, string> = {
    topSlab: '頂版', leftWall: '左側壁', rightWall: '右側壁', bottomSlab: '底版',
  };
  const pointLabels: Record<string, string> = {
    leftEnd: '左端部', haunchLeft: 'ハンチ端', midspan: '支間部', haunchRight: 'ハンチ端', rightEnd: '右端部',
  };

  function drawMemberDiagram(
    x1: number, y1: number, x2: number, y2: number,
    member: 'topSlab' | 'leftWall' | 'rightWall' | 'bottomSlab',
    normalDir: { nx: number; ny: number },
  ) {
    const positions = [0, 0.15, 0.5, 0.85, 1.0];
    const pathPoints: { x: number; y: number; val: number; bx: number; by: number; pt: string }[] = [];

    for (let i = 0; i < allPoints.length; i++) {
      const t = positions[i];
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const val = getVal(member, allPoints[i]);
      const offset = val * diagScale * (ft === 'M' ? -1 : 1);

      pathPoints.push({
        x: px + normalDir.nx * offset,
        y: py + normalDir.ny * offset,
        bx: px, by: py,
        val,
        pt: allPoints[i],
      });
    }

    const d = [
      `M ${x1} ${y1}`,
      ...pathPoints.map(p => `L ${p.x} ${p.y}`),
      `L ${x2} ${y2}`,
    ].join(' ');

    // Only show labels at key points (端部 and 支間部) to avoid clutter
    const labelIndices = [0, 2, 4]; // leftEnd, midspan, rightEnd

    return (
      <g>
        <path d={d} fill="rgba(59,130,246,0.12)" stroke="rgb(59,130,246)" strokeWidth={1.5} />
        {/* Hatching lines from axis to diagram */}
        {pathPoints.map((p, i) => (
          <line key={`h-${i}`} x1={p.bx} y1={p.by} x2={p.x} y2={p.y}
            stroke="rgba(59,130,246,0.3)" strokeWidth={0.5} />
        ))}
        {/* Value labels at key points */}
        {labelIndices.map(i => {
          const p = pathPoints[i];
          if (Math.abs(p.val) < 0.05) return null;
          const labelOffset = 12;
          return (
            <text
              key={`l-${i}`}
              x={p.x + normalDir.nx * labelOffset}
              y={p.y + normalDir.ny * labelOffset}
              fontSize={9}
              fontWeight="bold"
              fill="#1e40af"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {p.val.toFixed(1)}
            </text>
          );
        })}
        {/* Hover targets */}
        {pathPoints.map((p, i) => (
          <circle
            key={`c-${i}`}
            cx={p.x} cy={p.y} r={6}
            fill="transparent"
            cursor="pointer"
            onMouseEnter={() => setHovered({ member, point: allPoints[i], val: p.val, x: p.x, y: p.y })}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </g>
    );
  }

  const unit = ft === 'M' ? 'kN·m' : 'kN';
  const titleMap = { M: '曲げモーメント図', N: '軸力図', S: 'せん断力図' };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <div className="flex gap-1">
          {(['M', 'N', 'S'] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-1 text-xs rounded ${forceType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setForceType(t)}
            >
              {t === 'M' ? '曲げモーメント' : t === 'N' ? '軸力' : 'せん断力'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {cases.map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 text-xs rounded ${caseIdx === i ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setCaseIdx(i)}
            >
              {caseLabels[i] || `ケース${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 mb-2 text-xs text-gray-600">
        <span>単位: {unit}</span>
        {ft === 'M' && <span>※ 正(+): 内側引張 / 負(-): 外側引張</span>}
        {ft === 'N' && <span>※ 正(+): 圧縮 / 負(-): 引張</span>}
        {ft === 'S' && <span>※ せん断力の正方向は時計回り</span>}
        <span className="text-blue-500">● ホバーで詳細表示</span>
      </div>

      <svg width={svgW} height={svgH} className="bg-white border border-gray-200 rounded">
        {/* ボックス軸線 */}
        <line x1={corners.tl.x} y1={corners.tl.y} x2={corners.tr.x} y2={corners.tr.y}
          stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.tl.x} y1={corners.tl.y} x2={corners.bl.x} y2={corners.bl.y}
          stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.tr.x} y1={corners.tr.y} x2={corners.br.x} y2={corners.br.y}
          stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
        <line x1={corners.bl.x} y1={corners.bl.y} x2={corners.br.x} y2={corners.br.y}
          stroke="#999" strokeWidth={1} strokeDasharray="4,2" />

        {/* 部材ラベル */}
        <text x={(corners.tl.x + corners.tr.x) / 2} y={corners.tl.y - 5} textAnchor="middle" fontSize={9} fill="#666">頂版</text>
        <text x={(corners.bl.x + corners.br.x) / 2} y={corners.bl.y + 14} textAnchor="middle" fontSize={9} fill="#666">底版</text>
        <text x={corners.tl.x - 5} y={(corners.tl.y + corners.bl.y) / 2} textAnchor="end" fontSize={9} fill="#666" dominantBaseline="middle">左側壁</text>
        <text x={corners.tr.x + 5} y={(corners.tr.y + corners.br.y) / 2} textAnchor="start" fontSize={9} fill="#666" dominantBaseline="middle">右側壁</text>

        {/* 節点番号 */}
        <circle cx={corners.tl.x} cy={corners.tl.y} r={3} fill="#666" />
        <circle cx={corners.tr.x} cy={corners.tr.y} r={3} fill="#666" />
        <circle cx={corners.bl.x} cy={corners.bl.y} r={3} fill="#666" />
        <circle cx={corners.br.x} cy={corners.br.y} r={3} fill="#666" />

        {/* ダイアグラム */}
        {drawMemberDiagram(corners.tl.x, corners.tl.y, corners.tr.x, corners.tr.y, 'topSlab', { nx: 0, ny: -1 })}
        {drawMemberDiagram(corners.tl.x, corners.tl.y, corners.bl.x, corners.bl.y, 'leftWall', { nx: -1, ny: 0 })}
        {drawMemberDiagram(corners.tr.x, corners.tr.y, corners.br.x, corners.br.y, 'rightWall', { nx: 1, ny: 0 })}
        {drawMemberDiagram(corners.bl.x, corners.bl.y, corners.br.x, corners.br.y, 'bottomSlab', { nx: 0, ny: 1 })}

        {/* タイトル */}
        <text x={svgW / 2} y={22} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#333">
          {titleMap[ft]} ({caseLabels[caseIdx] || `ケース${caseIdx + 1}`})
        </text>

        {/* ホバーツールチップ */}
        {hovered && (
          <g>
            <rect
              x={Math.min(hovered.x + 10, svgW - 130)}
              y={Math.max(hovered.y - 35, 5)}
              width={120} height={28}
              rx={4} fill="white" stroke="#666" strokeWidth={0.5}
              filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.15))"
            />
            <text
              x={Math.min(hovered.x + 15, svgW - 125)}
              y={Math.max(hovered.y - 18, 22)}
              fontSize={10} fill="#333"
            >
              {memberLabels[hovered.member]} {pointLabels[hovered.point]}
            </text>
            <text
              x={Math.min(hovered.x + 15, svgW - 125)}
              y={Math.max(hovered.y - 6, 34)}
              fontSize={11} fontWeight="bold" fill="#1e40af"
            >
              {ft} = {hovered.val.toFixed(2)} {unit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
