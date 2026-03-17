import { DesignInput } from '../types';

interface Props {
  input: DesignInput;
}

export default function CrossSection({ input }: Props) {
  const { B0, H0, t1, t2, t3, t4, haunch, numCells, midWallThicknesses } = input.dimensions;

  const midWallSum = midWallThicknesses.reduce((s, v) => s + v, 0);
  const outerW = numCells * B0 + t3 + t4 + midWallSum;
  const outerH = H0 + t1 + t2;

  // SVG座標系（余白含む）
  const margin = 80;
  const scale = Math.min(0.08, 300 / outerW); // mm → SVG px (auto-fit for wide boxes)
  const svgW = outerW * scale + margin * 2;
  const svgH = (outerH + input.coverSoil.soilDepth * 1000) * scale + margin * 2;

  const ox = margin; // 左上原点
  const oy = margin + input.coverSoil.soilDepth * 1000 * scale;

  // 外形座標
  const x0 = ox;
  const y0 = oy;
  const x1 = ox + outerW * scale;
  const y1 = oy + outerH * scale;

  const iy0 = oy + t1 * scale;
  const iy1 = oy + (t1 + H0) * scale;

  // ハンチ
  const h = haunch * scale;

  // 各セルの内空を計算
  const cellOpenings: { ix0: number; ix1: number }[] = [];
  let xCursor = t3; // mm from left outer edge
  for (let i = 0; i < numCells; i++) {
    const cellIx0 = ox + xCursor * scale;
    const cellIx1 = ox + (xCursor + B0) * scale;
    cellOpenings.push({ ix0: cellIx0, ix1: cellIx1 });
    xCursor += B0;
    if (i < numCells - 1) {
      xCursor += midWallThicknesses[i];
    }
  }

  // 寸法線ヘルパー
  function DimLine({ x1: dx1, y1: dy1, x2: dx2, y2: dy2, label, offset }: {
    x1: number; y1: number; x2: number; y2: number; label: string; offset: number;
  }) {
    const isHorizontal = Math.abs(dy1 - dy2) < 1;
    const mid = isHorizontal
      ? { x: (dx1 + dx2) / 2, y: dy1 + offset }
      : { x: dx1 + offset, y: (dy1 + dy2) / 2 };

    return (
      <g className="text-xs">
        {isHorizontal ? (
          <>
            <line x1={dx1} y1={dy1 + offset * 0.6} x2={dx2} y2={dy2 + offset * 0.6}
              stroke="#333" strokeWidth={0.5} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <line x1={dx1} y1={dy1} x2={dx1} y2={dy1 + offset * 0.8} stroke="#333" strokeWidth={0.3} />
            <line x1={dx2} y1={dy2} x2={dx2} y2={dy2 + offset * 0.8} stroke="#333" strokeWidth={0.3} />
          </>
        ) : (
          <>
            <line x1={dx1 + offset * 0.6} y1={dy1} x2={dx2 + offset * 0.6} y2={dy2}
              stroke="#333" strokeWidth={0.5} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <line x1={dx1} y1={dy1} x2={dx1 + offset * 0.8} y2={dy1} stroke="#333" strokeWidth={0.3} />
            <line x1={dx2} y1={dy2} x2={dx2 + offset * 0.8} y2={dy2} stroke="#333" strokeWidth={0.3} />
          </>
        )}
        <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={9} fill="#333">{label}</text>
      </g>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-2">
      <h3 className="text-sm font-bold mb-1">構造寸法図{numCells > 1 ? ` (${numCells}連)` : ''}</h3>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="#333" />
          </marker>
        </defs>

        {/* 地表面ハッチング */}
        <line x1={ox - 20} y1={y0} x2={x1 + 20} y2={y0} stroke="#333" strokeWidth={1} />
        {Array.from({ length: Math.ceil((outerW * scale + 40) / 12) }).map((_, i) => (
          <line key={i} x1={ox - 20 + i * 12} y1={y0} x2={ox - 28 + i * 12} y2={y0 - 8}
            stroke="#333" strokeWidth={0.5} />
        ))}

        {/* 外形 */}
        <rect x={x0} y={y0} width={outerW * scale} height={outerH * scale}
          fill="#e0e0e0" stroke="#333" strokeWidth={1.5} />

        {/* 各セルの内空（ハンチ付き） */}
        {cellOpenings.map((cell, i) => (
          <path key={i} d={`
            M ${cell.ix0 + h} ${iy0}
            L ${cell.ix1 - h} ${iy0}
            L ${cell.ix1} ${iy0 + h}
            L ${cell.ix1} ${iy1 - h}
            L ${cell.ix1 - h} ${iy1}
            L ${cell.ix0 + h} ${iy1}
            L ${cell.ix0} ${iy1 - h}
            L ${cell.ix0} ${iy0 + h}
            Z
          `} fill="white" stroke="#333" strokeWidth={1} />
        ))}

        {/* 寸法線 */}
        {/* 最初のセルの内幅 */}
        <DimLine x1={cellOpenings[0].ix0} y1={iy1} x2={cellOpenings[0].ix1} y2={iy1} label={`${B0}`} offset={25} />
        {/* 外幅 */}
        <DimLine x1={x0} y1={y1} x2={x1} y2={y1} label={`${outerW}`} offset={40} />
        {/* 内高 */}
        <DimLine x1={cellOpenings[numCells - 1].ix1} y1={iy0} x2={cellOpenings[numCells - 1].ix1} y2={iy1} label={`${H0}`} offset={30} />
        {/* 外高 */}
        <DimLine x1={x1} y1={y0} x2={x1} y2={y1} label={`${outerH}`} offset={50} />
        {/* 頂版厚 */}
        <DimLine x1={x1} y1={y0} x2={x1} y2={iy0} label={`${t1}`} offset={70} />
        {/* 左側壁厚 */}
        <DimLine x1={x0} y1={iy0 + 20} x2={cellOpenings[0].ix0} y2={iy0 + 20} label={`${t3}`} offset={-15} />
        {/* ハンチ */}
        {haunch > 0 && (
          <text x={cellOpenings[0].ix0 + h / 2 + 2} y={iy0 + h / 2 + 12} fontSize={8} fill="#666">{haunch}</text>
        )}
        {/* 中壁厚 */}
        {midWallThicknesses.map((tw, i) => {
          const wallX0 = cellOpenings[i].ix1;
          const wallX1 = cellOpenings[i + 1].ix0;
          return (
            <DimLine key={`mw-${i}`}
              x1={wallX0} y1={iy0 + 20} x2={wallX1} y2={iy0 + 20}
              label={`${tw}`} offset={-15}
            />
          );
        })}

        {/* 土被り高 */}
        {input.coverSoil.soilDepth > 0 && (
          <DimLine x1={x1} y1={margin} x2={x1} y2={y0}
            label={`${(input.coverSoil.soilDepth * 1000).toFixed(0)}`} offset={70} />
        )}
      </svg>
    </div>
  );
}
