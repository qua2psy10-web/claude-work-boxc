import React from 'react';
import { DesignInput, MemberRebar, RebarArrangement } from '../types';
import { REBAR_DIAMETERS } from '../utils/constants';

interface Props {
  input: DesignInput;
  onChange: (input: DesignInput) => void;
  onReset: () => void;
  onImport?: (input: DesignInput) => void;
}

function NumField({ label, value, onChange, unit, step, min, max }: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; step?: number; min?: number; max?: number;
}) {
  const hasError = (min !== undefined && value < min) || (max !== undefined && value > max);
  const isEmpty = isNaN(value);

  let warning = '';
  if (isEmpty) warning = '値を入力してください';
  else if (min !== undefined && value < min) warning = `${min}以上`;
  else if (max !== undefined && value > max) warning = `${max}以下`;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        <label className="text-sm w-40 text-right shrink-0">{label}</label>
        <input
          type="number"
          className={`border rounded px-2 py-1 w-28 text-right text-sm ${
            hasError || isEmpty ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
          value={value}
          step={step || 0.1}
          onChange={e => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) ? 0 : v);
          }}
        />
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
      {warning && (
        <div className="ml-40 pl-2 text-xs text-red-500">{warning}</div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="mb-3 border border-gray-200 rounded">
      <button
        className="w-full text-left px-3 py-2 bg-gray-50 font-bold text-sm flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        {title}
        <span className="text-gray-400">{open ? '\u25BC' : '\u25B6'}</span>
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

function validateInput(input: DesignInput): string[] {
  const errors: string[] = [];
  const { dimensions, coverSoil, cover } = input;

  if (dimensions.B0 <= 0) errors.push('内幅B₀は正の値が必要です');
  if (dimensions.H0 <= 0) errors.push('内高H₀は正の値が必要です');
  if (dimensions.t1 <= 0 || dimensions.t2 <= 0) errors.push('版厚は正の値が必要です');
  if (dimensions.t3 <= 0 || dimensions.t4 <= 0) errors.push('側壁厚は正の値が必要です');

  // ハンチが版厚や側壁厚より大きい場合
  const minSlab = Math.min(dimensions.t1, dimensions.t2);
  if (dimensions.haunch > minSlab) errors.push(`ハンチ(${dimensions.haunch}mm)が版厚(${minSlab}mm)を超えています`);

  // かぶりが部材厚の半分を超える場合
  const topH_cm = dimensions.t1 / 10;
  if (cover.top_upper + cover.top_lower >= topH_cm) errors.push('頂版のかぶり合計が版厚を超えています');
  const botH_cm = dimensions.t2 / 10;
  if (cover.bottom_upper + cover.bottom_lower >= botH_cm) errors.push('底版のかぶり合計が版厚を超えています');

  if (coverSoil.soilDepth < 0) errors.push('土被り高は0以上が必要です');

  return errors;
}

export default function InputPanel({ input, onChange, onReset, onImport }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const imported = json.input || json;
        if (imported.dimensions && imported.unitWeights) {
          // defaultInputとマージして欠落フィールドを補完
          const merged = { ...input, ...imported };
          for (const key of Object.keys(input) as (keyof DesignInput)[]) {
            if (typeof input[key] === 'object' && input[key] !== null && !Array.isArray(input[key])) {
              (merged as any)[key] = { ...(input[key] as any), ...((imported[key] as any) || {}) };
            }
          }
          onChange(merged);
          if (onImport) onImport(merged);
        } else {
          alert('無効なJSONファイルです。PCボックスカルバートの設計データではありません。');
        }
      } catch {
        alert('JSONの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    // リセットして同じファイルを再選択可能に
    e.target.value = '';
  };
  const update = <K extends keyof DesignInput>(key: K) =>
    <F extends keyof DesignInput[K]>(field: F) =>
      (v: number) => {
        const section = input[key];
        const newInput = { ...input, [key]: { ...(section as object), [field]: v } };
        onChange(newInput as DesignInput);
      };

  const dim = update('dimensions');
  const cs = update('coverSoil');
  const uw = update('unitWeights');
  const ep = update('earthPressure');
  const wl = update('waterLevel');
  const cv = update('cover');
  const ll = update('liveLoad');

  const errors = validateInput(input);

  return (
    <div className="w-full max-w-md overflow-y-auto p-2">
      <h2 className="text-lg font-bold mb-3">設計条件入力</h2>

      <Section title="構造寸法">
        <NumField label="内幅 B₀" value={input.dimensions.B0} onChange={dim('B0')} unit="mm" step={100} min={500} max={10000} />
        <NumField label="内高 H₀" value={input.dimensions.H0} onChange={dim('H0')} unit="mm" step={100} min={500} max={10000} />
        <NumField label="頂版厚 t₁" value={input.dimensions.t1} onChange={dim('t1')} unit="mm" step={10} min={100} max={2000} />
        <NumField label="底版厚 t₂" value={input.dimensions.t2} onChange={dim('t2')} unit="mm" step={10} min={100} max={2000} />
        <NumField label="左側壁厚 t₃" value={input.dimensions.t3} onChange={dim('t3')} unit="mm" step={10} min={100} max={2000} />
        <NumField label="右側壁厚 t₄" value={input.dimensions.t4} onChange={dim('t4')} unit="mm" step={10} min={100} max={2000} />
        <NumField label="ハンチ" value={input.dimensions.haunch} onChange={dim('haunch')} unit="mm" step={50} min={0} max={1000} />
        <div className="mb-1">
          <div className="flex items-center gap-2">
            <label className="text-sm w-40 text-right shrink-0">連数</label>
            <select
              className="border rounded px-2 py-1 w-28 text-sm border-gray-300"
              value={input.dimensions.numCells}
              onChange={e => {
                const n = Number(e.target.value);
                const midWalls = [...input.dimensions.midWallThicknesses];
                // 中壁数を調整
                while (midWalls.length < n - 1) midWalls.push(input.dimensions.t3);
                while (midWalls.length > n - 1) midWalls.pop();
                const midRebarWalls = [...input.rebarLayout.midWalls];
                while (midRebarWalls.length < n - 1) midRebarWalls.push({ ...input.rebarLayout.leftWall });
                while (midRebarWalls.length > n - 1) midRebarWalls.pop();
                onChange({
                  ...input,
                  dimensions: { ...input.dimensions, numCells: n, midWallThicknesses: midWalls },
                  rebarLayout: { ...input.rebarLayout, midWalls: midRebarWalls },
                });
              }}
            >
              <option value={1}>1連</option>
              <option value={2}>2連</option>
              <option value={3}>3連</option>
            </select>
          </div>
        </div>
        {input.dimensions.midWallThicknesses.map((tw, i) => (
          <NumField
            key={`midwall-${i}`}
            label={`中壁${i + 1}厚`}
            value={tw}
            onChange={v => {
              const newMids = [...input.dimensions.midWallThicknesses];
              newMids[i] = v;
              onChange({ ...input, dimensions: { ...input.dimensions, midWallThicknesses: newMids } });
            }}
            unit="mm" step={10} min={100} max={2000}
          />
        ))}
      </Section>

      <Section title="土被り・舗装">
        <NumField label="土被り高" value={input.coverSoil.soilDepth} onChange={cs('soilDepth')} unit="m" step={0.1} min={0} max={30} />
        <NumField label="舗装厚" value={input.coverSoil.pavementThick} onChange={cs('pavementThick')} unit="m" step={0.01} min={0} max={1} />
      </Section>

      <Section title="単位重量">
        <NumField label="躯体 γc" value={input.unitWeights.gamma_c} onChange={uw('gamma_c')} unit="kN/m³" min={20} max={30} />
        <NumField label="水 γw" value={input.unitWeights.gamma_w} onChange={uw('gamma_w')} unit="kN/m³" min={9} max={11} />
        <NumField label="舗装 γa" value={input.unitWeights.gamma_a} onChange={uw('gamma_a')} unit="kN/m³" min={15} max={25} />
        <NumField label="土砂 γ" value={input.unitWeights.gamma_s} onChange={uw('gamma_s')} unit="kN/m³" min={10} max={25} />
      </Section>

      <Section title="土圧係数">
        <NumField label="鉛直土圧係数 α" value={input.earthPressure.alpha} onChange={ep('alpha')} step={0.01} min={0} max={2} />
        <NumField label="水平土圧係数 Ko(左)" value={input.earthPressure.Ko_left} onChange={ep('Ko_left')} step={0.01} min={0} max={2} />
        <NumField label="水平土圧係数 Ko(右)" value={input.earthPressure.Ko_right} onChange={ep('Ko_right')} step={0.01} min={0} max={2} />
      </Section>

      <Section title="水位">
        <NumField label="外水位" value={input.waterLevel.outer} onChange={wl('outer')} unit="m" min={0} />
        <NumField label="内水位" value={input.waterLevel.inner} onChange={wl('inner')} unit="m" min={0} />
        <div className="mb-1 flex items-center gap-2 ml-40">
          <input
            type="checkbox"
            id="buoyancy"
            checked={input.analysis.considerBuoyancy}
            onChange={e => onChange({
              ...input,
              analysis: { ...input.analysis, considerBuoyancy: e.target.checked }
            })}
          />
          <label htmlFor="buoyancy" className="text-sm">浮力考慮</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ignoreBottomSW"
            checked={input.analysis.ignoreBottomSelfWeight}
            onChange={e => onChange({
              ...input,
              analysis: { ...input.analysis, ignoreBottomSelfWeight: e.target.checked }
            })}
          />
          <label htmlFor="ignoreBottomSW" className="text-sm">底版自重無視</label>
        </div>
      </Section>

      <Section title="鉄筋かぶり">
        <NumField label="頂版上側" value={input.cover.top_upper} onChange={cv('top_upper')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="頂版下側" value={input.cover.top_lower} onChange={cv('top_lower')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="底版上側" value={input.cover.bottom_upper} onChange={cv('bottom_upper')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="底版下側" value={input.cover.bottom_lower} onChange={cv('bottom_lower')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="左側壁外側" value={input.cover.left_outer} onChange={cv('left_outer')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="左側壁内側" value={input.cover.left_inner} onChange={cv('left_inner')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="右側壁外側" value={input.cover.right_outer} onChange={cv('right_outer')} unit="cm" step={0.5} min={2} max={15} />
        <NumField label="右側壁内側" value={input.cover.right_inner} onChange={cv('right_inner')} unit="cm" step={0.5} min={2} max={15} />
      </Section>

      <Section title="鉄筋配置">
        {(['topSlab', 'bottomSlab', 'leftWall', 'rightWall'] as const).map(member => {
          const labels: Record<string, string> = { topSlab: '頂版', bottomSlab: '底版', leftWall: '左側壁', rightWall: '右側壁' };
          const mr = input.rebarLayout[member];
          const updateRebar = (side: 'outer' | 'inner', field: keyof RebarArrangement, v: number) => {
            const updated: MemberRebar = {
              ...mr,
              [side]: { ...mr[side], [field]: v },
            };
            onChange({ ...input, rebarLayout: { ...input.rebarLayout, [member]: updated } });
          };
          return (
            <div key={member} className="mb-2">
              <div className="text-xs font-semibold text-gray-600 mb-1">{labels[member]}</div>
              <div className="grid grid-cols-3 gap-1 text-xs items-center">
                <span>外側</span>
                <select className="border rounded px-1 py-0.5" value={mr.outer.diameter}
                  onChange={e => updateRebar('outer', 'diameter', Number(e.target.value))}>
                  {REBAR_DIAMETERS.map(d => <option key={d} value={d}>D{d}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" className="border rounded px-1 py-0.5 w-14" value={mr.outer.count}
                    step={0.5} min={1} max={20}
                    onChange={e => updateRebar('outer', 'count', Number(e.target.value))} />
                  <span>本/m</span>
                </div>
                <span>内側</span>
                <select className="border rounded px-1 py-0.5" value={mr.inner.diameter}
                  onChange={e => updateRebar('inner', 'diameter', Number(e.target.value))}>
                  {REBAR_DIAMETERS.map(d => <option key={d} value={d}>D{d}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" className="border rounded px-1 py-0.5 w-14" value={mr.inner.count}
                    step={0.5} min={1} max={20}
                    onChange={e => updateRebar('inner', 'count', Number(e.target.value))} />
                  <span>本/m</span>
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="活荷重条件">
        <NumField label="輪荷重 P" value={input.liveLoad.P} onChange={ll('P')} unit="kN" min={0} max={500} />
        <NumField label="衝撃係数 i" value={input.liveLoad.i} onChange={ll('i')} step={0.01} min={0} max={1} />
        <NumField label="低減係数 β" value={input.liveLoad.beta} onChange={ll('beta')} step={0.01} min={0} max={1} />
        <NumField label="接地幅 D₀" value={input.liveLoad.D0} onChange={ll('D0')} unit="m" step={0.01} min={0.01} max={2} />
        <NumField label="側圧荷重 wl" value={input.liveLoad.wl} onChange={ll('wl')} unit="kN/m²" min={0} />
      </Section>

      <Section title="路面上載荷重">
        <NumField label="qd" value={input.roadSurfaceLoad} onChange={v => onChange({ ...input, roadSurfaceLoad: v })} unit="kN/m²" min={0} />
      </Section>

      {errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-3 text-xs text-yellow-800">
          <div className="font-bold mb-1">入力値の注意</div>
          {errors.map((e, i) => <div key={i}>・{e}</div>)}
        </div>
      )}

      <button
        className="w-full py-2 rounded font-bold text-sm mt-4 mb-2 border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        onClick={onReset}
      >
        初期値に戻す
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      <button
        className="w-full py-2 rounded font-bold text-sm mb-4 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
      >
        JSON読み込み
      </button>
    </div>
  );
}
