import { CalcResults } from '../types';

interface Props {
  results: CalcResults;
}

interface CheckItem {
  label: string;
  category: string;
  ok: boolean;
}

function collectChecks(results: CalcResults): CheckItem[] {
  const items: CheckItem[] = [];
  const { stressCheck, safetyCheck } = results;

  if (stressCheck) {
    // RC曲げ応力度
    for (const [member, points] of Object.entries(stressCheck.bending)) {
      const allOk_c = points.every(p => p.ok_c);
      const allOk_s = points.every(p => p.ok_s);
      items.push({ label: `${member} 圧縮`, category: 'RC曲げ', ok: allOk_c });
      items.push({ label: `${member} 鉄筋`, category: 'RC曲げ', ok: allOk_s });
    }
    // せん断
    if (stressCheck.shear.length > 0) {
      const shearOk = stressCheck.shear.every(p => p.ok);
      items.push({ label: 'せん断（全部材）', category: 'せん断', ok: shearOk });
    }
  }

  if (safetyCheck) {
    for (const [member, checks] of Object.entries(safetyCheck)) {
      const allOk = checks.every(c => c.ok);
      items.push({ label: member, category: '破壊安全度', ok: allOk });
    }
  }

  return items;
}

export default function SummaryPanel({ results }: Props) {
  const checks = collectChecks(results);
  const allOk = checks.every(c => c.ok);
  const ngCount = checks.filter(c => !c.ok).length;

  const categories = new Map<string, CheckItem[]>();
  for (const c of checks) {
    const list = categories.get(c.category) || [];
    list.push(c);
    categories.set(c.category, list);
  }

  return (
    <div className={`rounded-lg border-2 p-4 mb-4 ${allOk ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl font-bold ${allOk ? 'text-green-700' : 'text-red-700'}`}>
          {allOk ? 'ALL OK' : `NG: ${ngCount}件`}
        </span>
        <span className="text-sm text-gray-600">全{checks.length}項目</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from(categories.entries()).map(([cat, items]) => {
          const catOk = items.every(i => i.ok);
          return (
            <div key={cat} className={`rounded px-3 py-2 text-xs ${catOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="font-bold flex items-center gap-1">
                <span>{catOk ? '✓' : '✗'}</span>
                <span>{cat}</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={item.ok ? 'text-green-600' : 'text-red-600 font-bold'}>
                      {item.ok ? '✓' : '✗'}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
