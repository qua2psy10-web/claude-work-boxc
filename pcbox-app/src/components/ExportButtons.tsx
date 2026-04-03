import { DesignInput, CalcResults, CaseForces, MemberForces, RCStressCheckPoint, ShearCheckPoint, SafetyCheckResult, cfLeftWall, cfRightWall } from '../types';
import { RebarCheckResult } from '../calc/rebarCheck';

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
  a.download = `rcbox_${new Date().toISOString().slice(0, 10)}.json`;
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

function rcStressTableHTML(title: string, points: RCStressCheckPoint[]): string {
  const locLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];
  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th><th>M (kN·m)</th><th>σc (N/mm²)</th><th>σca</th><th>判定</th>
    <th>σs (N/mm²)</th><th>σsa</th><th>判定</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    html += `<tr>
      <td>${locLabels[i]}</td>
      <td class="num">${fmt(p.M, 1)}</td>
      <td class="num">${fmt(p.sigma_c)}</td><td class="num">${fmt(p.sigma_ca)}</td>
      <td class="center ${p.ok_c ? 'ok' : 'ng'}">${p.ok_c ? 'OK' : 'NG'}</td>
      <td class="num">${fmt(p.sigma_s)}</td><td class="num">${fmt(p.sigma_sa)}</td>
      <td class="center ${p.ok_s ? 'ok' : 'ng'}">${p.ok_s ? 'OK' : 'NG'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function shearTableHTML(title: string, points: ShearCheckPoint[]): string {
  let html = `<h4>${title}</h4><table><thead><tr>
    <th>位置</th><th>S (kN)</th><th>d (cm)</th><th>τ (N/mm²)</th><th>τa (N/mm²)</th><th>判定</th>
  </tr></thead><tbody>`;
  for (const p of points) {
    html += `<tr>
      <td>${p.location}</td>
      <td class="num">${fmt(p.S, 1)}</td>
      <td class="num">${fmt(p.d, 1)}</td>
      <td class="num">${fmt(p.tau, 3)}</td>
      <td class="num">${fmt(p.tau_ca, 3)}</td>
      <td class="center ${p.ok ? 'ok' : 'ng'}">${p.ok ? 'OK' : 'NG'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function safetyTableHTML(title: string, checks: SafetyCheckResult[]): string {
  const locations = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];
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

  const cells: { ix0: number; ix1: number }[] = [];
  let xCursor = t3;
  for (let i = 0; i < numCells; i++) {
    const cix0 = ox + xCursor * scale;
    const cix1 = ox + (xCursor + B0) * scale;
    cells.push({ ix0: cix0, ix1: cix1 });
    xCursor += B0;
    if (i < numCells - 1) xCursor += midWallThicknesses[i];
  }

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

  const hatchCount = Math.ceil((outerW * scale + 40) / 12);
  let hatchLines = '';
  for (let i = 0; i < hatchCount; i++) {
    hatchLines += `<line x1="${ox - 20 + i * 12}" y1="${y0}" x2="${ox - 28 + i * 12}" y2="${y0 - 8}" stroke="#333" stroke-width="0.5"/>`;
  }

  let cellPaths = '';
  for (const cell of cells) {
    cellPaths += `<path d="M ${cell.ix0 + h} ${iy0} L ${cell.ix1 - h} ${iy0} L ${cell.ix1} ${iy0 + h} L ${cell.ix1} ${iy1 - h} L ${cell.ix1 - h} ${iy1} L ${cell.ix0 + h} ${iy1} L ${cell.ix0} ${iy1 - h} L ${cell.ix0} ${iy0 + h} Z" fill="white" stroke="#333" stroke-width="1"/>`;
  }

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

/** 断面力図のSVG文字列を生成 */
function forceDiagramSVG(cf: CaseForces, input: DesignInput, forceType: 'M' | 'N' | 'S', title: string): string {
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

  const allVals: number[] = [];
  for (const mf of cf.topSlabs) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  for (const mf of cf.bottomSlabs) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  for (const mf of cf.walls) for (const p of allPoints) allVals.push(Math.abs(getValFromMF(mf, p)));
  const maxVal = Math.max(...allVals, 1);
  const diagScale = 45 / maxVal;

  function memberPathSVG(x1: number, y1: number, x2: number, y2: number, mf: MemberForces, nx: number, ny: number): string {
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
  for (let ci = 0; ci < numCells; ci++) {
    svg += `<line x1="${wallXPositions[ci]}" y1="${yTop}" x2="${wallXPositions[ci + 1]}" y2="${yTop}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
    svg += `<line x1="${wallXPositions[ci]}" y1="${yBot}" x2="${wallXPositions[ci + 1]}" y2="${yBot}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
  }
  for (const wx of wallXPositions) {
    svg += `<line x1="${wx}" y1="${yTop}" x2="${wx}" y2="${yBot}" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;
    svg += `<circle cx="${wx}" cy="${yTop}" r="2.5" fill="#666"/>`;
    svg += `<circle cx="${wx}" cy="${yBot}" r="2.5" fill="#666"/>`;
  }
  for (let ci = 0; ci < numCells; ci++) {
    const xMid = (wallXPositions[ci] + wallXPositions[ci + 1]) / 2;
    svg += `<text x="${xMid}" y="${yTop - 5}" text-anchor="middle" font-size="8" fill="#666">${numCells > 1 ? `頂版${ci + 1}` : '頂版'}</text>`;
    svg += `<text x="${xMid}" y="${yBot + 12}" text-anchor="middle" font-size="8" fill="#666">${numCells > 1 ? `底版${ci + 1}` : '底版'}</text>`;
  }
  for (let ci = 0; ci < cf.topSlabs.length; ci++) svg += memberPathSVG(wallXPositions[ci], yTop, wallXPositions[ci + 1], yTop, cf.topSlabs[ci], 0, -1);
  for (let ci = 0; ci < cf.bottomSlabs.length; ci++) svg += memberPathSVG(wallXPositions[ci], yBot, wallXPositions[ci + 1], yBot, cf.bottomSlabs[ci], 0, 1);
  for (let wi = 0; wi < cf.walls.length; wi++) {
    const nx = wi === 0 ? -1 : wi === cf.walls.length - 1 ? 1 : (wi % 2 === 0 ? 1 : -1);
    svg += memberPathSVG(wallXPositions[wi], yTop, wallXPositions[wi], yBot, cf.walls[wi], nx, 0);
  }
  svg += `<text x="${svgW / 2}" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#333">${titleMap[ft]} - ${title}</text>`;
  svg += `<text x="${svgW / 2}" y="${svgH - 6}" text-anchor="middle" font-size="8" fill="#888">単位: ${unit}</text>`;
  svg += '</svg>';
  return svg;
}

function generateReportHTML(input: DesignInput, results: CalcResults): string {
  const { dimensions: dim, coverSoil, rcConcrete, rebar, unitWeights } = input;
  const { deadLoad, liveLoad1, stressCheck, rebarCheck, safetyCheck, sectionForces } = results;

  let body = '';

  // 1. 設計条件
  body += `<h2>1. 設計条件</h2>`;
  body += `<h3>構造寸法</h3>
    <table>
      <tr><td>内幅 B₀</td><td class="num">${dim.B0} mm</td><td>内高 H₀</td><td class="num">${dim.H0} mm</td></tr>
      <tr><td>頂版厚 t₁</td><td class="num">${dim.t1} mm</td><td>底版厚 t₂</td><td class="num">${dim.t2} mm</td></tr>
      <tr><td>左側壁厚 t₃</td><td class="num">${dim.t3} mm</td><td>右側壁厚 t₄</td><td class="num">${dim.t4} mm</td></tr>
      <tr><td>ハンチ</td><td class="num">${dim.haunch} mm</td><td>連数</td><td class="num">${dim.numCells}連</td></tr>
    </table>`;

  body += `<h3>土被り・舗装</h3>
    <table>
      <tr><td>土被り高</td><td class="num">${coverSoil.soilDepth} m</td><td>舗装厚</td><td class="num">${coverSoil.pavementThick} m</td></tr>
    </table>`;

  body += `<h3>コンクリート材料（RC）</h3>
    <table>
      <tr><td>σck</td><td class="num">${rcConcrete.sigma_ck} N/mm²</td><td>Ec</td><td class="num">${rcConcrete.Ec.toLocaleString()} N/mm²</td></tr>
      <tr><td>許容曲げ圧縮 σca</td><td class="num">${rcConcrete.sigma_ca} N/mm²</td><td>設計圧縮強度 f'cd</td><td class="num">${rcConcrete.f_cd} N/mm²</td></tr>
      <tr><td>許容せん断 τa1</td><td class="num">${rcConcrete.tau_a1} N/mm²</td><td>許容せん断 τa2</td><td class="num">${rcConcrete.tau_a2} N/mm²</td></tr>
    </table>`;

  body += `<h3>鉄筋材料</h3>
    <table>
      <tr><td>種別</td><td class="num">${rebar.grade}</td><td>許容引張 σsa</td><td class="num">${rebar.sigma_sa} N/mm²</td></tr>
      <tr><td>設計降伏強度 σsy</td><td class="num">${rebar.sigma_sy} N/mm²</td></tr>
    </table>`;

  body += `<h3>単位重量</h3>
    <table>
      <tr><td>躯体</td><td class="num">${unitWeights.gamma_c} kN/m³</td><td>土砂</td><td class="num">${unitWeights.gamma_s} kN/m³</td></tr>
    </table>`;

  // 2. 断面図
  body += `<h2>2. 構造断面図</h2>`;
  body += crossSectionSVG(input);

  // 3. 荷重集計
  body += `<h2>3. 荷重集計</h2>`;
  body += `<h3>死荷重</h3><table>
    <tr><td>頂版自重</td><td class="num">${fmt(deadLoad.selfWeight.topSlab)} kN/m²</td></tr>
    <tr><td>上載荷重</td><td class="num">${fmt(deadLoad.surcharge)} kN/m²</td></tr>
    <tr><td>地盤反力(左)</td><td class="num">${fmt(deadLoad.groundReaction.qLeft)} kN/m²</td>
        <td>地盤反力(右)</td><td class="num">${fmt(deadLoad.groundReaction.qRight)} kN/m²</td></tr>
  </table>`;
  body += `<h3>活荷重(T荷重)</h3><table>
    <tr><td>Pl_i</td><td class="num">${fmt(liveLoad1.Pl_i)} kN/m</td>
        <td>Pvl</td><td class="num">${fmt(liveLoad1.Pvl)} kN/m²</td></tr>
  </table>`;

  // 4. 断面力図
  body += `<h2>4. 断面力図</h2>`;
  const caseLabels = ['死荷重', '死+活1', '死+活2', '死+活1+活2'];
  if (sectionForces?.stress) {
    body += forceDiagramSVG(sectionForces.stress[1], input, 'M', '曲げ (死+活1)');
    body += forceDiagramSVG(sectionForces.stress[1], input, 'S', 'せん断 (死+活1)');
  }

  // 5. 断面力表
  body += `<h2>5. 断面力（応力度照査用）</h2>`;
  if (sectionForces?.stress) {
    body += forceTableHTML('頂版', sectionForces.stress, cf => cf.topSlabs[0], caseLabels);
    body += forceTableHTML('左側壁', sectionForces.stress, cf => cfLeftWall(cf), caseLabels);
    body += forceTableHTML('右側壁', sectionForces.stress, cf => cfRightWall(cf), caseLabels);
    body += forceTableHTML('底版', sectionForces.stress, cf => cf.bottomSlabs[0], caseLabels);
  }

  // 6. 応力度照査
  body += `<h2>6. RC応力度照査</h2>`;
  if (stressCheck?.bending) {
    for (const [key, pts] of Object.entries(stressCheck.bending)) {
      body += rcStressTableHTML(key, pts);
    }
    if (stressCheck.shear.length > 0) {
      body += shearTableHTML('せん断応力度', stressCheck.shear);
    }
  }

  // 7. 引張鉄筋量照査
  body += `<h2>7. 引張鉄筋量照査</h2>`;
  const rebarCheckArr = rebarCheck as RebarCheckResult[] | undefined;
  if (rebarCheckArr && rebarCheckArr.length > 0) {
    const byMember = new Map<string, RebarCheckResult[]>();
    for (const r of rebarCheckArr) {
      const list = byMember.get(r.member) || [];
      list.push(r);
      byMember.set(r.member, list);
    }
    for (const [member, rows] of byMember.entries()) {
      body += `<h4>${member}</h4><table><thead><tr>
        <th>位置</th><th>M (kN·m)</th><th>必要As (cm²/m)</th><th>配置As' (cm²/m)</th><th>判定</th>
      </tr></thead><tbody>`;
      for (const r of rows) {
        body += `<tr>
          <td>${r.location}</td>
          <td class="num">${fmt(r.M, 1)}</td>
          <td class="num">${fmt(r.As_req)}</td>
          <td class="num bold">${fmt(r.As_prov)}</td>
          <td class="center ${r.ok ? 'ok' : 'ng'}">${r.ok ? 'OK' : 'NG'}</td>
        </tr>`;
      }
      body += `</tbody></table>`;
    }
  }

  // 8. 破壊安全度照査
  body += `<h2>8. 破壊安全度照査</h2>`;
  if (safetyCheck) {
    for (const [key, checks] of Object.entries(safetyCheck as Record<string, SafetyCheckResult[]>)) {
      body += safetyTableHTML(key, checks);
    }
  }

  const css = `
    body { font-family: 'MS Gothic', 'Yu Gothic', monospace; font-size: 12px; margin: 20px; }
    h2 { font-size: 14px; border-bottom: 2px solid #333; margin-top: 24px; page-break-before: auto; }
    h3 { font-size: 13px; margin-top: 12px; color: #333; }
    h4 { font-size: 12px; margin-top: 10px; color: #555; }
    table { border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 2px 6px; }
    th { background: #eee; font-weight: bold; }
    td.num { text-align: right; }
    td.center { text-align: center; }
    td.small { font-size: 9px; color: #555; }
    td.bold { font-weight: bold; }
    td.ok { background: #d4edda; color: #155724; }
    td.ng { background: #f8d7da; color: #721c24; font-weight: bold; }
    @media print { h2 { page-break-before: auto; } }
  `;

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>RCボックスカルバート設計計算書</title><style>${css}</style></head>
  <body>
    <h1 style="font-size:16px;border-bottom:3px solid #333;padding-bottom:8px;">RCボックスカルバート設計計算書</h1>
    <p style="font-size:10px;color:#666;">出力日時: ${new Date().toLocaleString('ja-JP')}</p>
    ${body}
  </body></html>`;
}

function downloadReport(input: DesignInput, results: CalcResults) {
  const html = generateReportHTML(input, results);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rcbox_report_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ input, results }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        onClick={() => downloadJSON(input, results)}
      >
        JSON出力
      </button>
      <button
        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
        onClick={() => downloadReport(input, results)}
      >
        HTML計算書
      </button>
    </div>
  );
}
