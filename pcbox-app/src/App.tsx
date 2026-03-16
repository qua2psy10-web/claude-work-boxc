import React from 'react';
import { DesignInput, CalcResults } from './types';
import { defaultInput } from './utils/constants';
import { calcDeadLoad, calcLiveLoad1, calcLiveLoad2 } from './calc/loads';
import { runFrameAnalysis } from './calc/frame';
import { calcSectionForces } from './calc/sectionForces';
import { calcPrestress } from './calc/prestress';
import { runStressCheck } from './calc/stressCheck';
import { runRebarCheck } from './calc/rebarCheck';
import { runSafetyCheck } from './calc/safetyCheck';
import InputPanel from './components/InputPanel';
import CrossSection from './components/CrossSection';
import ResultTabs from './components/ResultTabs';
import SummaryPanel from './components/SummaryPanel';
import ExportButtons from './components/ExportButtons';

function runCalculation(input: DesignInput): CalcResults {
  const deadLoad = calcDeadLoad(input);
  const liveLoad1 = calcLiveLoad1(input);
  const liveLoad2 = calcLiveLoad2(input);

  const { deadForces, live1Forces, live2Forces } = runFrameAnalysis(input, deadLoad, liveLoad1, liveLoad2);
  const sectionForces = calcSectionForces(deadForces, live1Forces, live2Forces);

  const prestress = calcPrestress(input, {
    topSlab: deadForces.topSlab,
    leftWall: deadForces.leftWall,
    rightWall: deadForces.rightWall,
    bottomSlab: deadForces.bottomSlab,
  });

  const stressCheck = runStressCheck(input, sectionForces.stress, prestress);
  const rebarCheck = runRebarCheck(input, sectionForces.rebar, prestress);
  const safetyCheck = runSafetyCheck(
    input,
    sectionForces.safety1,
    sectionForces.safety2,
    sectionForces.safety3,
    prestress,
  );

  return {
    deadLoad,
    liveLoad1,
    liveLoad2,
    sectionForces,
    prestress,
    stressCheck,
    rebarCheck,
    safetyCheck,
  };
}

export default function App() {
  const [input, setInput] = React.useState<DesignInput>(defaultInput);
  const [results, setResults] = React.useState<CalcResults | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleCalc = () => {
    try {
      setError(null);
      const r = runCalculation(input);
      setResults(r);
    } catch (e: any) {
      setError(e.message || '計算エラーが発生しました');
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white px-6 py-3 shadow">
        <h1 className="text-xl font-bold">PCボックスカルバート設計計算</h1>
      </header>
      <div className="flex flex-col lg:flex-row">
        <div
          className="lg:w-96 border-r border-gray-200 bg-white overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 52px)' }}
        >
          <InputPanel input={input} onChange={setInput} onCalc={handleCalc} />
        </div>
        <div
          className="flex-1 p-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 52px)' }}
        >
          <CrossSection input={input} />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {results ? (
            <>
              <ExportButtons input={input} results={results} />
              <SummaryPanel results={results} />
              <ResultTabs results={results} input={input} />
            </>
          ) : (
            <div className="text-center text-gray-400 py-20">
              <p>「計算実行」ボタンを押して計算を開始してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
