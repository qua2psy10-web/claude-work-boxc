import { DesignInput, CalcResults, CaseForces, MemberForces, StressCheckPoint, RCStressCheckPoint, ShearCheckPoint, SafetyCheckResult } from '../types';

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

function forceTableHTML(title: string, cases: CaseForces[], getMember: (cf: CaseForces) => MemberForces): string {
  const points = ['leftEnd', 'haunchLeft', 'midspan', 'haunchRight', 'rightEnd'] as const;
  const pointLabels = ['左端部', 'ハンチ端', '支間部', 'ハンチ端', '右端部'];

  let html = `<h4>${title}</h4><table><thead><tr><th>CASE</th><th></th>`;
  for (const l of pointLabels) html += `<th>${l}</th>`;
  html += `</tr></thead><tbody>`;

  for (let ci = 0; ci < cases.length; ci++) {
    const mf = getMember(cases[ci]);
    html += `<tr><td rowspan="3" class="center">${ci + 1}</td><td>M(kN·m)</td>`;
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

  body += `<h3>活荷重 (case-1): T荷重</h3>`;
  body += `<p>Pl+i = ${fmt(liveLoad1.Pl_i)} kN/m &nbsp; Pvl = ${fmt(liveLoad1.Pvl)} kN/m²</p>`;
  body += `<p>q(左) = ${fmt(liveLoad1.groundReaction.qLeft)} kN/m² &nbsp; q(右) = ${fmt(liveLoad1.groundReaction.qRight)} kN/m²</p>`;

  body += `<h3>活荷重 (case-2): 側圧</h3>`;
  for (const f of liveLoad2.forces) {
    body += `<p>${f.label}: H = ${fmt(f.H)} kN/m</p>`;
  }

  // 3. 断面力
  body += `<h2>3. 設計断面力</h2>`;

  const sectionConfigs = [
    { key: 'stress' as const, label: '応力度照査用' },
    { key: 'rebar' as const, label: '引張鉄筋量照査用 (死+1.35×活)' },
    { key: 'safety1' as const, label: '破壊安全度-1 (1.3×死+2.5×活)' },
    { key: 'safety2' as const, label: '破壊安全度-2 (1.0×死+2.5×活)' },
    { key: 'safety3' as const, label: '破壊安全度-3 (1.7×(死+活))' },
  ];
  for (const sc of sectionConfigs) {
    body += `<h3>${sc.label}</h3>`;
    const cases = sectionForces[sc.key];
    body += forceTableHTML('頂　版', cases, cf => cf.topSlab);
    body += forceTableHTML('左側壁', cases, cf => cf.leftWall);
    body += forceTableHTML('右側壁', cases, cf => cf.rightWall);
    body += forceTableHTML('底　版', cases, cf => cf.bottomSlab);
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
