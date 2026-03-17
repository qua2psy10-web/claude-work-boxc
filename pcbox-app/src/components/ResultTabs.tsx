import React from 'react';
import { CalcResults, DesignInput } from '../types';
import LoadResult from './LoadResult';
import ForceTable from './ForceTable';
import ForceDiagram from './ForceDiagram';
import StressResult from './StressResult';
import RebarResult from './RebarResult';
import SafetyResult from './SafetyResult';

interface Props {
  results: CalcResults;
  input: DesignInput;
}

const tabs = [
  { key: 'load', label: '荷重' },
  { key: 'force', label: '断面力' },
  { key: 'diagram', label: '断面力図' },
  { key: 'stress', label: '応力度照査' },
  { key: 'rebar', label: '引張鉄筋量' },
  { key: 'safety', label: '破壊安全度' },
];

export default function ResultTabs({ results, input }: Props) {
  const [active, setActive] = React.useState('load');

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              active === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'load' && <LoadResult results={results} />}
      {active === 'force' && <ForceTable results={results} />}
      {active === 'diagram' && <ForceDiagram results={results} input={input} />}
      {active === 'stress' && <StressResult results={results} />}
      {active === 'rebar' && <RebarResult results={results} />}
      {active === 'safety' && <SafetyResult results={results} />}
    </div>
  );
}
