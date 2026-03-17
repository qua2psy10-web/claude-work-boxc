import { DesignInput, CalcResults, CaseForces, MemberForces, StressCheckPoint, RCStressCheckPoint, ShearCheckPoint, SafetyCheckResult, cfLeftWall, cfRightWall } from '../types';

interface Props {
  input: DesignInput;
  results: CalcResults;
}

function fmt(v: number, d: number = 2): string {
  return v.toFixed(d);
}

function downloadJSON(input: DesignInput, results: CalcResults) {
  const data = { input, results, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pcbox_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function forceTableHTML(title: string, cases: CaseForces[], getMember: (cf: CaseForces) => MemberForces, caseLabels?: string[]): string {
  const points = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
  const pointLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  let html = `<h4>${title}</h4><table><thead><tr><th>CASE</th><th></th>`;
  for (const l of pointLabels) html += `<th>${l}</th>`;
  html += `</tr></thead><tbody>`;

  for (let ci = 0; ci < cases.length; ci++) {
    const mf = getMember(cases[ci]);
    const label = caseLabels?.[ci] || `${ci + 1}`;
    html += `<tr><td rowspan="3" class="center">${label}</td><td>M(kN·m)</td>`;
    for (const p of points) html += `<td class="num">${fmt(mf[p].M, 1)}</td>`;
    html += `</tr><tr><td>N(kN)</td>`;
    for (const p of points) html += `<td class="num">${fmt(mf[p].N, 1)}</td>`;
    html += `</tr><tr><td>S(kN)</td>`;
    for (const p of points) html += `<td class="num">${fmt(mf[p].S, 1)}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function pcStressTableHTML(title: string, points: StressCheckPoint[]): string {
  const locLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];
  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th><th>σc (N/mm²)</th><th>σca</th><th>判定</th>
    <th>σt (N/mm²)</th><th>σta</th><th>判定</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    html += `<tr>
      <td>${locLabels[i]}</td>
      <td class="num">${fmt(p.sigma_c)}</td><td class="num">${fmt(p.sigma_ca)}</td>
      <td class="center ${p.ok_c ? 'ok' : 'ng'}">${p.ok_c ? 'OK' : 'NG'}</td>
      <td class="num">${fmt(p.sigma_t)}</td><td class="num">${fmt(p.sigma_ta)}</td>
      <td class="center ${p.ok_t ? 'ok' : 'ng'}">${p.ok_t ? 'OK' : 'NG'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function rcStressTableHTML(title: string, points: RCStressCheckPoint[]): string {
  const locLabels = ['上端部', 'ハンチ端', '支間部', 'ハンチ端', '下端部'];
  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th><th>σc (N/mm²)</th><th>σca</th><th>判定</th>
    <th>σs (N/mm²)</th><th>σsa</th><th>判定</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    html += `<tr>
      <td>${locLabels[i]}</td>
      <td class="num">${fmt(p.sigma_c)}</td><td class="num">${fmt(p.sigma_ca)}</td>
      <td class="center ${p.ok_c ? 'ok' : 'ng'}">${p.ok_c ? 'OK' : 'NG'}</td>
      <td class="num">${fmt(p.sigma_s)}</td><td class="num">${fmt(p.sigma_sa)}</td>
      <td class="center ${p.ok_s ? 'ok' : 'ng'}">${p.ok_s ? 'OK' : 'NG'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function shearTableHTML(title: string, points: ShearCheckPoint[], isPC: boolean): string {
  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th>${isPC ? '<th>荷重</th>' : ''}<th>S (kN)</th><th>τ (N/mm²)</th>
    ${isPC ? '<th>k</th>' : ''}<th>τa (N/mm²)</th><th>判定</th>
  </tr></thead><tbody>`;
  for (const p of points) {
    html += `<tr>
      <td>${p.location}</td>
      ${isPC ? `<td>${p.caseNo === 0 ? '死荷重' : '設計荷重'}</td>` : ''}
      <td class="num">${fmt(p.S, 1)}</td>
      <td class="num">${fmt(p.tau, 3)}</td>
      ${isPC ? `<td class="num">${fmt(p.k, 3)}</td>` : ''}
      <td class="num">${fmt(p.tau_ca, 3)}</td>
      <td class="center ${p.ok ? 'ok' : 'ng'}">${p.ok ? 'OK' : 'NG'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function safetyTableHTML(title: string, checks: SafetyCheckResult[]): string {
  const locations = title.includes('RC') ?
    ['上端部', 'ハンチ端', '支間部', 'ハンチ端', '下端部'] :
    ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  const perLocation = locations.map((_, li) => {
    const relevant = checks.filter((_, ci) => ci % 5 === li);
    if (relevant.length === 0) return null;
    return relevant.reduce((min, c) => c.ratio < min.ratio ? c : min, relevant[0]);
  });

  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th><th>Md (kN·m)</th><th>Nd (kN)</th><th>Mu (kN·m)</th>
    <th>Mu/Md</th><th>判定</th><th>組合せ</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < perLocation.length; i++) {
    const p = perLocation[i];
    if (!p) continue;
    const ratioStr = p.ratio > 100 ? '>100' : fmt(p.ratio, 3);
    html += `<tr>
      <td>${locations[i]}</td>
      <td class="num">${p.Md.toFixed(1)}</td>
      <td class="num">${p.Nd.toFixed(1)}</td>
      <td class="num">${p.Mu.toFixed(1)}</td>
      <td class="num bold">${ratioStr}</td>
      <td class="center ${p.ok ? 'ok' : 'ng'}">${p.ok ? 'OK' : 'NG'}</td>
      <td class="small">${p.caseLabel}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

/** 構造断面図のSVG文字列を生成（多連対応） */
function crossSectionSVG(input: DesignInput): string {
  const { B0, H0, t1, t2, t3, t4, haunch, numCells, midWallThicknesses } = input.dimensions;
  const midWallSum = midWallThicknesses.reduce((s, v) => s + v, 0);
  const outerW = numCells * B0 + t3 + t4 + midWallSum;
  const outerH = H0 + t1 + t2;
  const soilDepthMm = input.coverSoil.soilDepth * 1000;

  const margin = 80;
  const scale = Math.min(0.08, 300 / outerW);
  const svgW = outerW * scale + margin * 2;
  const svgH = (outerH + soilDepthMm) * scale + margin * 2;
  const ox = margin;
  const oy = margin + soilDepthMm * scale;

  const x0 = ox, y0 = oy;
  const x1 = ox + outerW * scale, y1 = oy + outerH * scale;
  const iy0 = oy + t1 * scale, iy1 = oy + (t1 + H0) * scale;
  const h = haunch * scale;

  // Cell openings
  const cells: { ix0: number; ix1: number }[] = [];
  let xCursor = t3;
  for (let i = 0; i < numCells; i++) {
    const cix0 = ox + xCursor * scale;
    const cix1 = ox + (xCursor + B0) * scale;
    cells.push({ ix0: cix0, ix1: cix1 });
    xCursor += B0;
    if (i < numCells - 1) xCursor += midWallThicknesses[i];
  }

  // Dimension line helper
  function dimLine(dx1: number, dy1: number, dx2: number, dy2: number, label: string, offset: number): string {
    const isH = Math.abs(dy1 - dy2) < 1;
    const mx = (dx1 + dx2) / 2, my = (dy1 + dy2) / 2;
    if (isH) {
      return `<line x1="${dx1}" y1="${dy1 + offset * 0.6}" x2="${dx2}" y2="${dy2 + offset * 0.6}" stroke="#333" stroke-width="0.5" marker-start="url(#arw)" marker-end="url(#arw)"/>
        <line x1="${dx1}" y1="${dy1}" x2="${dx1}" y2="${dy1 + offset * 0.8}" stroke="#333" stroke-width="0.3"/>
        <line x1="${dx2}" y1="${dy2}" x2="${dx2}" y2="${dy2 + offset * 0.8}" stroke="#333" stroke-width="0.3"/>
        <text x="${mx}" y="${dy1 + offset}" text-anchor="middle" font-size="9" fill="#333">${label}</text>`;
    } else {
      return `<line x1="${dx1 + offset * 0.6}" y1="${dy1}" x2="${dx2 + offset * 0.6}" y2="${dy2}" stroke="#333" stroke-width="0.5" marker-start="url(#arw)" marker-end="url(#arw)"/>
        <line x1="${dx1}" y1="${dy1}" x2="${dx1 + offset * 0.8}" y2="${dy1}" stroke="#333" stroke-width="0.3"/>
        <line x1="${dx2}" y1="${dy2}" x2="${dx2 + offset * 0.8}" y2="${dy2}" stroke="#333" stroke-width="0.3"/>
        <text x="${dx1 + offset}" y="${my + 3}" text-anchor="middle" font-size="9" fill="#333">${label}</text>`;
    }
  }

  // Ground surface hatching
  const hatchCount = Math.ceil((outerW * scale + 40) / 12);
  let hatchLines = '';
  for (let i = 0; i < hatchCount; i++) {
    hatchLines += `<line x1="${ox - 20 + i * 12}" y1="${y0}" x2="${ox - 28 + i * 12}" y2="${y0 - 8}" stroke="#333" stroke-width="0.5"/>`;
  }

  // Cell openings paths
  let cellPaths = '';
  for (const cell of cells) {
    cellPaths += `<path d="M ${cell.ix0 + h} ${iy0} L ${cell.ix1 - h} ${iy0} L ${cell.ix1} ${iy0 + h} L ${cell.ix1} ${iy1 - h} L ${cell.ix1 - h} ${iy1} L ${cell.ix0 + h} ${iy1} L ${cell.ix0} ${iy1 - h} L ${cell.ix0} ${iy0 + h} Z" fill="white" stroke="#333" stroke-width="1"/>`;
  }

  // Dimension lines
  let dims = '';
  dims += dimLine(cells[0].ix0, iy1, cells[0].ix1, iy1, `${B0}`, 25);
  dims += dimLine(x0, y1, x1, y1, `${outerW}`, 40);
  dims += dimLine(cells[numCells - 1].ix1, iy0, cells[numCells - 1].ix1, iy1, `${H0}`, 30);
  dims += dimLine(x1, y0, x1, y1, `${outerH}`, 50);
  dims += dimLine(x1, y0, x1, iy0, `${t1}`, 70);
  dims += dimLine(x0, iy0 + 20, cells[0].ix0, iy0 + 20, `${t3}`, -15);
  if (haunch > 0) {
    dims += `<text x="${cells[0].ix0 + h / 2 + 2}" y="${iy0 + h / 2 + 12}" font-size="8" fill="#666">${haunch}</text>`;
  }
  for (let i = 0; i < midWallThicknesses.length; i++) {
    dims += dimLine(cells[i].ix1, iy0 + 20, cells[i + 1].ix0, iy0 + 20, `${midWallThicknesses[i]}`, -15);
  }
  if (soilDepthMm > 0) {
    dims += dimLine(x1, margin, x1, y0, `${soilDepthMm.toFixed(0)}`, 70);
  }

  return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arw" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#333"/></marker></defs>
    <line x1="${ox - 20}" y1="${y0}" x2="${x1 + 20}" y2="${y0}" stroke="#333" stroke-width="1"/>
    ${hatchLines}
    <rect x="${x0}" y="${y0}" width="${outerW * scale}" height="${outerH * scale}" fill="#e0e0e0" stroke="#333" stroke-width="1.5"/>
    ${cellPaths}
    ${dims}
  </svg>`;
}

/** 断面力図のSVG文字列を生成（多連対応） */
function forceDiagramSVG(
  cf: CaseForces,
  input: DesignInput,
  forceType: 'M' | 'N' | 'S',
  title: string,
): string {
  const numCells = input.dimensions.numCells;
  const { B0, t3, t4, midWallThicknesses } = input.dimensions;
  const midWallSum = midWallThicknesses.reduce((s, v) => s + v, 0);
  const totalW = numCells * B0 + t3 + t4 + midWallSum;

  const svgW = 480 + (numCells - 1) * 100;
  const svgH = 380;
  const margin = 70;
  const boxW = svgW - margin * 2;
  const boxH = svgH - margin * 2;
  const yTop = margin;
  const yBot = margin + boxH;

  // Wall x-positions (proportional)
  const wallXPositions: number[] = [];
  let cursor = t3 / 2;
  wallXPositions.push(margin + (cursor / totalW) * boxW);
  for (let i = 0; i < numCells; i++) {
    cursor += B0;
    if (i < numCells - 1) {
      cursor += midWallThicknesses[i] / 2;
      wallXPositions.push(margin + (cursor / totalW) * boxW);
      cursor += midWallThicknesses[i] / 2;
    }
  }
  cursor = totalW - t4 / 2;
  wallXPositions.push(margin + (cursor / totalW) * boxW);

  const ft = forceType;
  const allPoints = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'];

  function getValFromMF(mf: MemberForces, point: string): number {
    const p = (mf as any)[point];
    return p ? p[ft] : 0;
  }

  // Collect all values for scale
  const allVals: number[] = [];
  for (const mf of cf.topSlabs) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  for (const mf of cf.bottomSlabs) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  for (const mf of cf.walls) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  const maxVal = Math.max(...allVals, 1);
  const diagScale = 45 / maxVal;

  function memberPathSVG(
    x1: number, y1: number, x2: number, y2: number,
    mf: MemberForces, nx: number, ny: number,
  ): string {
    const positions = [0, 0.15, 0.5, 0.85, 1.0];
    const pts: { x: number; y: number; bx: number; by: number; val: number }[] = [];

    for (let i = 0; i < allPoints.length; i++) {
      const t = positions[i];
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const val = getValFromMF(mf, allPoints[i]);
      const offset = val * diagScale * (ft === 'M' ? -1 : 1);
      pts.push({ x: px + nx * offset, y: py + ny * offset, bx: px, by: py, val });
    }

    let s = '';
    const d = [`M ${x1} ${y1}`, ...pts.map(p => `L ${p.x} ${p.y}`), `L ${x2} ${y2}`, 'Z'].join(' ');
    s += `<path d="${d}" fill="rgba(59,130,246,0.12)" stroke="rgb(59,130,246)" stroke-width="1.2"/>`;
    for (const p of pts) {
      s += `<line x1="${p.bx}" y1="${p.by}" x2="${p.x}" y2="${p.y}" stroke="rgba(59,130,246,0.3)" stroke-width="0.5"/>`;
    }
    for (const i of [0, 2, 4]) {
      const p = pts[i];
      if (Math.abs(p.val) < 0.05) continue;
      s += `<text x="${p.x + nx * 11}" y="${p.y + ny * 11}" font-size="8" font-weight="bold" fill="#1e40af" text-anchor="middle" dominant-baseline="middle">${p.val.toFixed(1)}</text>`;
    }
    return s;
  }

  const unit = ft === 'M' ? 'kN&middot;m' : 'kN';
  const titleMap: Record<string, string> = { M: '曲げモーメント図', N: '軸力図', S: 'せん断力図' };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="background:#fff;border:1px solid #ddd;margin:4px 0;">`;

  // Axis lines: top/bottom slab segments
  for (let ci = 0; ci < numCells; ci++) {
    svg += `<line x1="${wallXPositions[ci]}" y1="${yTop}" x2="${wallXPositions[ci + 1]}" y2="${yTop}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
    svg += `<line x1="${wallXPositions[ci]}" y1="${yBot}" x2="${wallXPositions[ci + 1]}" y2="${yBot}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
  }
  // Wall axis lines
  for (const wx of wallXPositions) {
    svg += `<line x1="${wx}" y1="${yTop}" x2="${wx}" y2="${yBot}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
  }

  // Labels
  for (let ci = 0; ci < numCells; ci++) {
    const xMid = (wallXPositions[ci] + wallXPositions[ci + 1]) / 2;
    const topLabel = numCells > 1 ? `頂版${ci + 1}` : '頂版';
    const botLabel = numCells > 1 ? `底版${ci + 1}` : '底版';
    svg += `<text x="${xMid}" y="${yTop - 5}" text-anchor="middle" font-size="8" fill="#666">${topLabel}</text>`;
    svg += `<text x="${xMid}" y="${yBot + 12}" text-anchor="middle" font-size="8" fill="#666">${botLabel}</text>`;
  }
  svg += `<text x="${wallXPositions[0] - 5}" y="${(yTop + yBot) / 2}" text-anchor="end" font-size="8" fill="#666" dominant-baseline="middle">左側壁</text>`;
  svg += `<text x="${wallXPositions[wallXPositions.length - 1] + 5}" y="${(yTop + yBot) / 2}" text-anchor="start" font-size="8" fill="#666" dominant-baseline="middle">右側壁</text>`;
  for (let wi = 0; wi < midWallThicknesses.length; wi++) {
    svg += `<text x="${wallXPositions[wi + 1] + 5}" y="${(yTop + yBot) / 2 - 10}" text-anchor="start" font-size="7" fill="#888" dominant-baseline="middle">中壁${wi + 1}</text>`;
  }

  // Node dots
  for (const wx of wallXPositions) {
    svg += `<circle cx="${wx}" cy="${yTop}" r="2.5" fill="#666"/>`;
    svg += `<circle cx="${wx}" cy="${yBot}" r="2.5" fill="#666"/>`;
  }

  // Diagrams: top slabs
  for (let ci = 0; ci < cf.topSlabs.length; ci++) {
    svg += memberPathSVG(wallXPositions[ci], yTop, wallXPositions[ci + 1], yTop, cf.topSlabs[ci], 0, -1);
  }
  // Diagrams: bottom slabs
  for (let ci = 0; ci < cf.bottomSlabs.length; ci++) {
    svg += memberPathSVG(wallXPositions[ci], yBot, wallXPositions[ci + 1], yBot, cf.bottomSlabs[ci], 0, 1);
  }
  // Diagrams: walls
  for (let wi = 0; wi < cf.walls.length; wi++) {
    const nx = wi === 0 ? -1 : wi === cf.walls.length - 1 ? 1 : (wi % 2 === 0 ? 1 : -1);
    svg += memberPathSVG(wallXPositions[wi], yTop, wallXPositions[wi], yBot, cf.walls[wi], nx, 0);
  }

  // Title & unit
  svg += `<text x="${svgW / 2}" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#333">${titleMap[ft]} - ${title}</text>`;
  svg += `<text x="${svgW / 2}" y="${svgH - 6}" text-anchor="middle" font-size="8" fill="#888">単位: ${unit}</text>`;

  svg += '</svg>';
  return svg;
}

function generateReportHTML(input: DesignInput, results: CalcResults): string {
  const { dimensions: dim, coverSoil, pcConcrete, rcConcrete, rebar, pcSteel_top, pcSteel_bottom, unitWeights } = input;
  const { deadLoad, liveLoad1, liveLoad2, prestress, stressCheck, rebarCheck, safetyCheck, sectionForces } = results;

  let body = '';

  // 1. 設計条件
  body += `<h2>1. 設計条件</h2>`;
  body += `<h3>構造寸法</h3>
    <table>
      <tr><td>内幅 B0</td><td class="num">${dim.B0} mm</td><td>内高 H0</td><td class="num">${dim.H0} mm</td></tr>
      <tr><td>頂版厚 t1</td><td class="num">${dim.t1} mm</td><td>底版厚 t2</td><td class="num">${dim.t2} mm</td></tr>
      <tr><td>左側壁厚 t3</td><td class="num">${dim.t3} mm</td><td>右側壁厚 t4</td><td class="num">${dim.t4} mm</td></tr>
      <tr><td>ハンチ</td><td class="num">${dim.haunch} mm</td><td>土被り</td><td class="num">${coverSoil.soilDepth} m</td></tr>
    </table>`;

  body += `<h3>構造断面図</h3>`;
  body += crossSectionSVG(input);

  body += `<h3>材料特性</h3>
    <table>
      <tr><th colspan="2">PCコンクリート</th><th colspan="2">RCコンクリート</th></tr>
      <tr><td>σck</td><td class="num">${pcConcrete.sigma_ck} N/mm²</td><td>σck</td><td class="num">${rcConcrete.sigma_ck} N/mm²</td></tr>
      <tr><td>Ec</td><td class="num">${pcConcrete.Ec} N/mm²</td><td>Ec</td><td class="num">${rcConcrete.Ec} N/mm²</td></tr>
    </table>
    <table class="mt">
      <tr><th colspan="2">PC鋼棒（頂版）</th><th colspan="2">PC鋼棒（底版）</th></tr>
      <tr><td>σpy</td><td class="num">${pcSteel_top.sigma_py} N/mm²</td><td>σpy</td><td class="num">${pcSteel_bottom.sigma_py} N/mm²</td></tr>
      <tr><td>Ap</td><td class="num">${pcSteel_top.Ap} mm²</td><td>Ap</td><td class="num">${pcSteel_bottom.Ap} mm²</td></tr>
      <tr><td>本数</td><td class="num">${pcSteel_top.N} 本</td><td>本数</td><td class="num">${pcSteel_bottom.N} 本</td></tr>
      <tr><td>偏心 e</td><td class="num">${pcSteel_top.e} mm</td><td>偏心 e</td><td class="num">${pcSteel_bottom.e} mm</td></tr>
    </table>
    <table class="mt">
      <tr><th colspan="2">鉄筋</th><th colspan="2">単位重量</th></tr>
      <tr><td>種別</td><td>${rebar.grade}</td><td>γc</td><td class="num">${unitWeights.gamma_c} kN/m³</td></tr>
      <tr><td>σsa</td><td class="num">${rebar.sigma_sa} N/mm²</td><td>γw</td><td class="num">${unitWeights.gamma_w} kN/m³</td></tr>
      <tr><td>σsy</td><td class="num">${rebar.sigma_sy} N/mm²</td><td>γs</td><td class="num">${unitWeights.gamma_s} kN/m³</td></tr>
    </table>`;

  // 鉄筋配置
  const rl = input.rebarLayout;
  body += `<h3>鉄筋配置 (1m幅あたり)</h3>
    <table>
      <thead><tr><th>部材</th><th>外側</th><th>内側</th></tr></thead>
      <tbody>
        <tr><td>頂版</td><td>D${rl.topSlab.outer.diameter} × ${rl.topSlab.outer.count}本</td><td>D${rl.topSlab.inner.diameter} × ${rl.topSlab.inner.count}本</td></tr>
        <tr><td>底版</td><td>D${rl.bottomSlab.outer.diameter} × ${rl.bottomSlab.outer.count}本</td><td>D${rl.bottomSlab.inner.diameter} × ${rl.bottomSlab.inner.count}本</td></tr>
        <tr><td>左側壁</td><td>D${rl.leftWall.outer.diameter} × ${rl.leftWall.outer.count}本</td><td>D${rl.leftWall.inner.diameter} × ${rl.leftWall.inner.count}本</td></tr>
        <tr><td>右側壁</td><td>D${rl.rightWall.outer.diameter} × ${rl.rightWall.outer.count}本</td><td>D${rl.rightWall.inner.diameter} × ${rl.rightWall.inner.count}本</td></tr>
        ${rl.midWalls.map((mw, i) => `<tr><td>中壁${i + 1}</td><td>D${mw.outer.diameter} × ${mw.outer.count}本</td><td>D${mw.inner.diameter} × ${mw.inner.count}本</td></tr>`).join('')}
      </tbody>
    </table>`;

  // 2. 荷重計算
  body += `<h2>2. 荷重計算</h2>`;
  body += `<h3>死荷重</h3>`;
  body += `<table><thead><tr>
    <th>項目</th><th>V (kN/m)</th><th>H (kN/m)</th><th>x (m)</th><th>y (m)</th><th>M (kN·m/m)</th>
  </tr></thead><tbody>`;
  for (const f of deadLoad.forces) {
    body += `<tr>
      <td>${f.label}</td>
      <td class="num">${f.V ? fmt(f.V) : '—'}</td>
      <td class="num">${f.H ? fmt(f.H) : '—'}</td>
      <td class="num">${f.x ? fmt(f.x, 3) : '—'}</td>
      <td class="num">${f.y ? fmt(f.y, 3) : '—'}</td>
      <td class="num">${fmt(f.M)}</td>
    </tr>`;
  }
  body += `<tr class="bold"><td>合計</td><td class="num">${fmt(deadLoad.totalV)}</td><td colspan="3"></td><td class="num">${fmt(deadLoad.totalM)}</td></tr>`;
  body += `</tbody></table>`;
  body += `<p>偏心距離 e = ${fmt(deadLoad.eccentricity, 3)} m</p>`;
  body += `<p>q(左) = ${fmt(deadLoad.groundReaction.qLeft)} kN/m² &nbsp; q(右) = ${fmt(deadLoad.groundReaction.qRight)} kN/m²</p>`;

  // 水圧計算
  const wp = deadLoad.waterPressure;
  if (input.waterLevel.outer > 0 || input.waterLevel.inner > 0) {
    body += `<h3>水圧</h3>`;
    body += `<table>
      <tr><th colspan="2">外水圧</th><th colspan="2">内水圧</th></tr>
      <tr><td>外水位</td><td class="num">${fmt(input.waterLevel.outer, 3)} m (底版下面から)</td>
          <td>内水位</td><td class="num">${fmt(input.waterLevel.inner, 3)} m (底版上面から)</td></tr>
      <tr><td>頂版軸線位置</td><td class="num">${fmt(wp.outer.pw_topAxis, 3)} kN/m²</td>
          <td>頂版軸線位置</td><td class="num">${fmt(wp.inner.pw_topAxis, 3)} kN/m²</td></tr>
      <tr><td>底版軸線位置</td><td class="num">${fmt(wp.outer.pw_botAxis, 3)} kN/m²</td>
          <td>底版軸線位置</td><td class="num">${fmt(wp.inner.pw_botAxis, 3)} kN/m²</td></tr>
      <tr><td>揚圧力</td><td class="num">${fmt(wp.outer.uplift, 3)} kN/m²</td>
          <td>内水重量</td><td class="num">${fmt(wp.inner.weight, 3)} kN/m²</td></tr>
    </table>`;
    body += `<p>浮力考慮: ${input.analysis.considerBuoyancy ? 'あり' : 'なし'}</p>`;
  }

  body += `<h3>活荷重 (case-1): T荷重</h3>`;
  body += `<p>Pl+i = ${fmt(liveLoad1.Pl_i)} kN/m &nbsp; Pvl = ${fmt(liveLoad1.Pvl)} kN/m²</p>`;
  body += `<p>q(左) = ${fmt(liveLoad1.groundReaction.qLeft)} kN/m² &nbsp; q(右) = ${fmt(liveLoad1.groundReaction.qRight)} kN/m²</p>`;

  body += `<h3>活荷重 (case-2): 側圧</h3>`;
  for (const f of liveLoad2.forces) {
    body += `<p>${f.label}: H = ${fmt(f.H)} kN/m</p>`;
  }

  // 3. 断面力
  body += `<h2>3. 設計断面力</h2>`;

  const sectionConfigs: { key: keyof typeof sectionForces; label: string; caseLabels: string[] }[] = [
    { key: 'stress', label: '応力度照査用', caseLabels: ['D', 'D+L1', 'D+L2', 'D+L1+L2'] },
    { key: 'rebar', label: '引張鉄筋量照査用 (死+1.35×活)', caseLabels: ['D', 'D+1.35L1', 'D+1.35L2', 'D+1.35(L1+L2)'] },
    { key: 'safety1', label: '破壊安全度-1 (1.3×死+2.5×活)', caseLabels: ['1.3D', '1.3D+2.5L1', '1.3D+2.5L2', '1.3D+2.5(L1+L2)'] },
    { key: 'safety2', label: '破壊安全度-2 (1.0×死+2.5×活)', caseLabels: ['D', 'D+2.5L1', 'D+2.5L2', 'D+2.5(L1+L2)'] },
    { key: 'safety3', label: '破壊安全度-3 (1.7×(死+活))', caseLabels: ['1.7D', '1.7(D+L1)', '1.7(D+L2)', '1.7(D+L1+L2)'] },
  ];
  for (const sc of sectionConfigs) {
    body += `<h3>${sc.label}</h3>`;
    const cases = sectionForces[sc.key];
    // 頂版
    for (let ci = 0; ci < dim.numCells; ci++) {
      const label = dim.numCells > 1 ? `頂版${ci + 1}` : '頂　版';
      body += forceTableHTML(label, cases, cf => cf.topSlabs[ci], sc.caseLabels);
    }
    // 壁
    body += forceTableHTML('左側壁', cases, cf => cfLeftWall(cf), sc.caseLabels);
    for (let wi = 0; wi < dim.midWallThicknesses.length; wi++) {
      const wallIdx = wi + 1;
      body += forceTableHTML(`中壁${wi + 1}`, cases, cf => cf.walls[wallIdx], sc.caseLabels);
    }
    body += forceTableHTML('右側壁', cases, cf => cfRightWall(cf), sc.caseLabels);
    // 底版
    for (let ci = 0; ci < dim.numCells; ci++) {
      const label = dim.numCells > 1 ? `底版${ci + 1}` : '底　版';
      body += forceTableHTML(label, cases, cf => cf.bottomSlabs[ci], sc.caseLabels);
    }
  }

  // 断面力図 (応力度照査用ケースのM/N/S図)
  body += `<h3>断面力図（応力度照査用）</h3>`;
  const stressCases = sectionForces.stress;
  const caseNames = ['死荷重', '死+活1', '死+活2', '死+活1+活2'];
  for (let ci = 0; ci < Math.min(stressCases.length, 4); ci++) {
    body += `<div style="display:flex;gap:4px;flex-wrap:wrap;">`;
    for (const ft of ['M', 'N', 'S'] as const) {
      body += forceDiagramSVG(stressCases[ci], input, ft, caseNames[ci] || `ケース${ci + 1}`);
    }
    body += `</div>`;
  }

  // 4. 有効プレストレス
  body += `<h2>4. 有効プレストレス</h2>`;
  body += `<table><thead><tr>
    <th></th><th>σpt (N/mm²)</th><th>Δσpr</th><th>Δσpψ</th><th>σpe (N/mm²)</th><th>Ap' (mm²)</th><th>Pe (kN)</th>
  </tr></thead><tbody>`;
  for (const [key, label] of [['top', '頂版'], ['bottom', '底版']] as const) {
    const p = prestress[key];
    body += `<tr>
      <td class="bold">${label}</td>
      <td class="num">861.00</td>
      <td class="num">${fmt(p.delta_sigma_pr)}</td>
      <td class="num">${fmt(p.delta_sigma_ppsi)}</td>
      <td class="num">${fmt(p.sigma_pe)}</td>
      <td class="num">${fmt(p.Ap_per_m, 1)}</td>
      <td class="num">${fmt(p.Pe, 3)}</td>
    </tr>`;
  }
  body += `</tbody></table>`;

  // 5. 応力度照査
  if (stressCheck) {
    body += `<h2>5. 応力度照査</h2>`;
    body += `<h3>PC部材（死荷重時）</h3>`;
    for (const [key, points] of Object.entries(stressCheck.pc_dead)) {
      body += pcStressTableHTML(key, points);
    }
    body += `<h3>PC部材（設計荷重時）</h3>`;
    for (const [key, points] of Object.entries(stressCheck.pc_design)) {
      body += pcStressTableHTML(key, points);
    }
    if (stressCheck.pc_shear_dead.length > 0 || stressCheck.pc_shear_design.length > 0) {
      body += shearTableHTML('PC部材 せん断応力度', [...stressCheck.pc_shear_dead, ...stressCheck.pc_shear_design], true);
    }
    body += `<h3>RC部材</h3>`;
    for (const [key, points] of Object.entries(stressCheck.rc)) {
      body += rcStressTableHTML(key, points);
    }
    if (stressCheck.rc_shear.length > 0) {
      body += shearTableHTML('RC部材 せん断応力度', stressCheck.rc_shear, false);
    }
  }

  // 6. 引張鉄筋量
  if (rebarCheck) {
    body += `<h2>6. 引張鉄筋量照査</h2>`;
    body += `<p>荷重の組合せ: 死荷重 + 1.35×活荷重 + 有効プレストレス力</p>`;
    body += `<table><thead><tr>
      <th>部材</th><th>M (kN·m)</th><th>N (kN)</th><th>σc</th><th>σt</th>
      <th>x (cm)</th><th>As1 (cm²)</th><th>As2 (cm²)</th><th>As (cm²)</th>
    </tr></thead><tbody>`;
    for (const [key, r] of Object.entries(rebarCheck)) {
      body += `<tr>
        <td class="bold">${key}</td>
        <td class="num">${fmt(r.M, 1)}</td><td class="num">${fmt(r.N, 1)}</td>
        <td class="num">${fmt(r.sigma_c)}</td><td class="num">${fmt(r.sigma_t)}</td>
        <td class="num">${fmt(r.x, 3)}</td><td class="num">${fmt(r.As1, 3)}</td>
        <td class="num">${fmt(r.As2, 3)}</td><td class="num bold">${fmt(r.As, 3)}</td>
      </tr>`;
    }
    body += `</tbody></table>`;
  }

  // 7. 破壊安全度
  if (safetyCheck) {
    body += `<h2>7. 破壊安全度照査</h2>`;
    body += `<h3>PC部材</h3>`;
    for (const [key, checks] of Object.entries(safetyCheck.pc)) {
      body += safetyTableHTML(`PC ${key}`, checks);
    }
    body += `<h3>RC部材</h3>`;
    for (const [key, checks] of Object.entries(safetyCheck.rc)) {
      body += safetyTableHTML(`RC ${key}`, checks);
    }
  }

  const date = new Date().toLocaleDateString('ja-JP');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>PCボックスカルバート設計計算書</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; font-size: 10px; line-height: 1.4; color: #222; }
  h1 { font-size: 16px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 20px; }
  h2 { font-size: 13px; border-left: 4px solid #2563eb; padding-left: 8px; margin-top: 20px; margin-bottom: 8px; page-break-after: avoid; }
  h3 { font-size: 11px; margin-top: 12px; margin-bottom: 4px; page-break-after: avoid; }
  h4 { font-size: 10px; margin-top: 8px; margin-bottom: 2px; font-weight: bold; page-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; page-break-inside: avoid; }
  th, td { border: 1px solid #999; padding: 2px 4px; font-size: 9px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .small { font-size: 8px; }
  .ok { color: #166534; background: #dcfce7; font-weight: bold; }
  .ng { color: #991b1b; background: #fee2e2; font-weight: bold; }
  .mt { margin-top: 8px; }
  p { margin: 2px 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h2 { break-after: avoid; }
    table { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>PCボックスカルバート 設計計算書</h1>
<div class="subtitle">出力日: ${date} &nbsp;|&nbsp; B0=${dim.B0}mm × H0=${dim.H0}mm &nbsp;|&nbsp; 土被り ${coverSoil.soilDepth}m</div>
${body}
</body>
</html>`;
}

function openPrintReport(input: DesignInput, results: CalcResults) {
  const html = generateReportHTML(input, results);
  const win = window.open('', '_blank');
  if (!win) {
    alert('ポップアップがブロックされました。ポップアップを許可してください。');
    return;
  }
  win.document.write(html);
  win.document.close();
}

export default function ExportButtons({ input, results }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-800"
        onClick={() => downloadJSON(input, results)}
      >
        JSON保存
      </button>
      <button
        className="px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800"
        onClick={() => openPrintReport(input, results)}
      >
        計算書印刷
      </button>
    </div>
  );
}
