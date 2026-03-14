import React from 'react';
import { DesignInput } from '../types';

interface Props {
  input: DesignInput;
  onChange: (input: DesignInput) => void;
  onCalc: () => void;
}

function NumField({ label, value, onChange, unit, step }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <label className="text-sm w-40 text-right shrink-0">{label}</label>
      <input
        type="number"
        className="border border-gray-300 rounded px-2 py-1 w-28 text-right text-sm"
        value={value}
        step={step || 0.1}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
      {unit && <span className="text-xs text-gray-500">{unit}</span>}
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
        <span className="text-gray-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  );
}

export default function InputPanel({ input, onChange, onCalc }: Props) {
  const update = <K extends keyof DesignInput>(key: K) =>
    <F extends keyof DesignInput[K]>(field: F) =>
      (v: number) => {
        const newInput = { ...input, [key]: { ...input[key], [field]: v } };
        onChange(newInput);
      };

  const dim = update('dimensions');
  const cs = update('coverSoil');
  const uw = update('unitWeights');
  const ep = update('earthPressure');
  const wl = update('waterLevel');
  const cv = update('cover');
  const ll = update('liveLoad');

  return (
    <div className="w-full max-w-md overflow-y-auto p-2">
      <h2 className="text-lg font-bold mb-3">設計条件入力</h2>

      <Section title="構造寸法">
        <NumField label="内幅 B₀" value={input.dimensions.B0} onChange={dim('B0')} unit="mm" step={100} />
        <NumField label="内高 H₀" value={input.dimensions.H0} onChange={dim('H0')} unit="mm" step={100} />
        <NumField label="頂版厚 t₁" value={input.dimensions.t1} onChange={dim('t1')} unit="mm" step={10} />
        <NumField label="底版厚 t₂" value={input.dimensions.t2} onChange={dim('t2')} unit="mm" step={10} />
        <NumField label="左側壁厚 t₃" value={input.dimensions.t3} onChange={dim('t3')} unit="mm" step={10} />
        <NumField label="右側壁厚 t₄" value={input.dimensions.t4} onChange={dim('t4')} unit="mm" step={10} />
        <NumField label="ハンチ" value={input.dimensions.haunch} onChange={dim('haunch')} unit="mm" step={50} />
      </Section>

      <Section title="土被り・舗装">
        <NumField label="土被り高" value={input.coverSoil.soilDepth} onChange={cs('soilDepth')} unit="m" step={0.1} />
        <NumField label="舗装厚" value={input.coverSoil.pavementThick} onChange={cs('pavementThick')} unit="m" step={0.01} />
      </Section>

      <Section title="単位重量">
        <NumField label="躯体 γc" value={input.unitWeights.gamma_c} onChange={uw('gamma_c')} unit="kN/m³" />
        <NumField label="水 γw" value={input.unitWeights.gamma_w} onChange={uw('gamma_w')} unit="kN/m³" />
        <NumField label="舗装 γa" value={input.unitWeights.gamma_a} onChange={uw('gamma_a')} unit="kN/m³" />
        <NumField label="土砂 γ" value={input.unitWeights.gamma_s} onChange={uw('gamma_s')} unit="kN/m³" />
      </Section>

      <Section title="土圧係数">
        <NumField label="鉛直土圧係数 α" value={input.earthPressure.alpha} onChange={ep('alpha')} step={0.01} />
        <NumField label="水平土圧係数 Ko(左)" value={input.earthPressure.Ko_left} onChange={ep('Ko_left')} step={0.01} />
        <NumField label="水平土圧係数 Ko(右)" value={input.earthPressure.Ko_right} onChange={ep('Ko_right')} step={0.01} />
      </Section>

      <Section title="水位">
        <NumField label="外水位" value={input.waterLevel.outer} onChange={wl('outer')} unit="m" />
        <NumField label="内水位" value={input.waterLevel.inner} onChange={wl('inner')} unit="m" />
      </Section>

      <Section title="鉄筋かぶり">
        <NumField label="頂版上側" value={input.cover.top_upper} onChange={cv('top_upper')} unit="cm" step={0.5} />
        <NumField label="頂版下側" value={input.cover.top_lower} onChange={cv('top_lower')} unit="cm" step={0.5} />
        <NumField label="底版上側" value={input.cover.bottom_upper} onChange={cv('bottom_upper')} unit="cm" step={0.5} />
        <NumField label="底版下側" value={input.cover.bottom_lower} onChange={cv('bottom_lower')} unit="cm" step={0.5} />
        <NumField label="左側壁外側" value={input.cover.left_outer} onChange={cv('left_outer')} unit="cm" step={0.5} />
        <NumField label="左側壁内側" value={input.cover.left_inner} onChange={cv('left_inner')} unit="cm" step={0.5} />
        <NumField label="右側壁外側" value={input.cover.right_outer} onChange={cv('right_outer')} unit="cm" step={0.5} />
        <NumField label="右側壁内側" value={input.cover.right_inner} onChange={cv('right_inner')} unit="cm" step={0.5} />
      </Section>

      <Section title="活荷重条件">
        <NumField label="輪荷重 P" value={input.liveLoad.P} onChange={ll('P')} unit="kN" />
        <NumField label="衝撃係数 i" value={input.liveLoad.i} onChange={ll('i')} step={0.01} />
        <NumField label="低減係数 β" value={input.liveLoad.beta} onChange={ll('beta')} step={0.01} />
        <NumField label="接地幅 D₀" value={input.liveLoad.D0} onChange={ll('D0')} unit="m" step={0.01} />
        <NumField label="側圧荷重 wl" value={input.liveLoad.wl} onChange={ll('wl')} unit="kN/m²" />
      </Section>

      <Section title="路面上載荷重">
        <NumField label="qd" value={input.roadSurfaceLoad} onChange={v => onChange({ ...input, roadSurfaceLoad: v })} unit="kN/m²" />
      </Section>

      <button
        className="w-full bg-blue-600 text-white py-3 rounded font-bold text-lg hover:bg-blue-700 mt-4 mb-4"
        onClick={onCalc}
      >
        計算実行
      </button>
    </div>
  );
}
