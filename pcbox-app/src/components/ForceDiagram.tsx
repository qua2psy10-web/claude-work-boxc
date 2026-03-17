import React from 'react';
import { CalcResults, DesignInput, MemberForces } from '../types';

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
  const numCells = input.dimensions.numCells;

  const svgW = 560 + (numCells - 1) * 120;
  const svgH = 460;
  const margin = 80;
  const boxW = svgW - margin * 2;
  const boxH = svgH - margin * 2;

  // Calculate proportional x-positions for each wall
  const { B0, t3, t4, midWallThicknesses } = input.dimensions;
  const midWallSum = midWallThicknesses.reduce((s, v) => s + v, 0);
  const totalInternalW = numCells * B0 + t3 + t4 + midWallSum;

  // Wall x-positions (proportional within boxW)
  const wallXPositions: number[] = []; // x position for each wall (numCells + 1)
  let cursor = t3 / 2; // left wall axis at t3/2
  wallXPositions.push(margin + (cursor / totalInternalW) * boxW);
  for (let i = 0; i < numCells; i++) {
    cursor += B0;
    if (i < numCells - 1) {
      cursor += midWallThicknesses[i] / 2;
      wallXPositions.push(margin + (cursor / totalInternalW) * boxW);
      cursor += midWallThicknesses[i] / 2;
    }
  }
  cursor = totalInternalW - t4 / 2; // right wall axis
  wallXPositions.push(margin + (cursor / totalInternalW) * boxW);

  const yTop = margin;
  const yBot = margin + boxH;

  const ft = forceType;

  function getValFromMember(mf: MemberForces, point: string): number {
    const p = (mf as any)[point];
    return p ? p[ft] : 0;
  }

  const allPoints = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'];

  // Collect all values for scale
  const allVals: number[] = [];
  for (let i = 0; i < cf.topSlabs.length; i++) {
    for (const p of allPoints) allVals.push(Math.abs(getValFromMember(cf.topSlabs[i], p)));
  }
  for (let i = 0; i < cf.bottomSlabs.length; i++) {
    for (const p of allPoints) allVals.push(Math.abs(getValFromMember(cf.bottomSlabs[i], p)));
  }
  for (let i = 0; i < cf.walls.length; i++) {
    for (const p of allPoints) allVals.push(Math.abs(getValFromMember(cf.walls[i], p)));
  }
  const maxVal = Math.max(...allVals, 1);
  const diagScale = 55 / maxVal;

  const memberLabels: Record<string, string> = {
    topSlab: '頂版', leftWall: '左側壁', rightWall: '右側壁', bottomSlab: '底版',
  };
  const pointLabels: Record<string, string> = {
    leftEnd: '左端部', haunchLeft: 'ハンチ端', midspan: '支間部', haunchRight: 'ハンチ端', rightEnd: '右端部',
  };

  function drawMemberDiagramGeneric(
    x1: number, y1: number, x2: number, y2: number,
    mf: MemberForces,
    memberLabel: string,
    normalDir: { nx: number; ny: number },
    diagKey: string,
  ) {
    const positions = [0, 0.15, 0.5, 0.85, 1.0];
    const pathPoints: { x: number; y: number; val: number; bx: number; by: number; pt: string }[] = [];

    for (let i = 0; i < allPoints.length; i++) {
      const t = positions[i];
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const val = getValFromMember(mf, allPoints[i]);
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

    const labelIndices = [0, 2, 4];

    return (
      <g key={diagKey}>
        <path d={d} fill="rgba(59,130,246,0.12)" stroke="rgb(59,130,246)" strokeWidth={1.5} />
        {pathPoints.map((p, i) => (
          <line key={`${diagKey}-h-${i}`} x1={p.bx} y1={p.by} x2={p.x} y2={p.y}
            stroke="rgba(59,130,246,0.3)" strokeWidth={0.5} />
        ))}
        {labelIndices.map(i => {
          const p = pathPoints[i];
          if (Math.abs(p.val) < 0.05) return null;
          const labelOffset = 12;
          return (
            <text
              key={`${diagKey}-l-${i}`}
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
        {pathPoints.map((p, i) => (
          <circle
            key={`${diagKey}-c-${i}`}
            cx={p.x} cy={p.y} r={6}
            fill="transparent"
            cursor="pointer"
            onMouseEnter={() => setHovered({ member: memberLabel, point: allPoints[i], val: p.val, x: p.x, y: p.y })}
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
        {/* ボックス軸線: 頂版・底版セグメント */}
        {Array.from({ length: numCells }).map((_, ci) => {
          const xL = wallXPositions[ci];
          const xR = wallXPositions[ci + 1];
          return (
            <React.Fragment key={`axis-${ci}`}>
              <line x1={xL} y1={yTop} x2={xR} y2={yTop} stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
              <line x1={xL} y1={yBot} x2={xR} y2={yBot} stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
            </React.Fragment>
          );
        })}
        {/* 壁軸線 */}
        {wallXPositions.map((wx, wi) => (
          <line key={`wall-axis-${wi}`} x1={wx} y1={yTop} x2={wx} y2={yBot}
            stroke="#999" strokeWidth={1} strokeDasharray="4,2" />
        ))}

        {/* 部材ラベル */}
        {Array.from({ length: numCells }).map((_, ci) => {
          const xMid = (wallXPositions[ci] + wallXPositions[ci + 1]) / 2;
          return (
            <React.Fragment key={`label-${ci}`}>
              <text x={xMid} y={yTop - 5} textAnchor="middle" fontSize={9} fill="#666">
                {numCells > 1 ? `頂版${ci + 1}` : '頂版'}
              </text>
              <text x={xMid} y={yBot + 14} textAnchor="middle" fontSize={9} fill="#666">
                {numCells > 1 ? `底版${ci + 1}` : '底版'}
              </text>
            </React.Fragment>
          );
        })}
        <text x={wallXPositions[0] - 5} y={(yTop + yBot) / 2} textAnchor="end" fontSize={9} fill="#666" dominantBaseline="middle">左側壁</text>
        <text x={wallXPositions[wallXPositions.length - 1] + 5} y={(yTop + yBot) / 2} textAnchor="start" fontSize={9} fill="#666" dominantBaseline="middle">右側壁</text>
        {midWallThicknesses.map((_, wi) => (
          <text key={`mwlabel-${wi}`} x={wallXPositions[wi + 1] + 5} y={(yTop + yBot) / 2 - 10} textAnchor="start" fontSize={8} fill="#888" dominantBaseline="middle">
            中壁{wi + 1}
          </text>
        ))}

        {/* 節点 */}
        {wallXPositions.map((wx, wi) => (
          <React.Fragment key={`nodes-${wi}`}>
            <circle cx={wx} cy={yTop} r={3} fill="#666" />
            <circle cx={wx} cy={yBot} r={3} fill="#666" />
          </React.Fragment>
        ))}

        {/* ダイアグラム: 頂版 */}
        <g>
          {cf.topSlabs.map((mf, ci) => drawMemberDiagramGeneric(
            wallXPositions[ci], yTop, wallXPositions[ci + 1], yTop,
            mf, numCells > 1 ? `頂版${ci + 1}` : '頂版', { nx: 0, ny: -1 }, `diag-top-${ci}`,
          ))}
        </g>
        {/* ダイアグラム: 底版 */}
        <g>
          {cf.bottomSlabs.map((mf, ci) => drawMemberDiagramGeneric(
            wallXPositions[ci], yBot, wallXPositions[ci + 1], yBot,
            mf, numCells > 1 ? `底版${ci + 1}` : '底版', { nx: 0, ny: 1 }, `diag-bot-${ci}`,
          ))}
        </g>
        {/* ダイアグラム: 壁 */}
        <g>
          {cf.walls.map((mf, wi) => {
            const label = wi === 0 ? '左側壁' : wi === cf.walls.length - 1 ? '右側壁' : `中壁${wi}`;
            const nx = wi === 0 ? -1 : wi === cf.walls.length - 1 ? 1 : (wi % 2 === 0 ? 1 : -1);
            return drawMemberDiagramGeneric(
              wallXPositions[wi], yTop, wallXPositions[wi], yBot,
              mf, label, { nx, ny: 0 }, `diag-wall-${wi}`,
            );
          })}
        </g>

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
              {memberLabels[hovered.member] || hovered.member} {pointLabels[hovered.point]}
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
