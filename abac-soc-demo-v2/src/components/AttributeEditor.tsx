import { useState, useEffect } from 'react';

interface AttributeEditorProps {
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
}

export default function AttributeEditor({ attributes, onChange }: AttributeEditorProps) {
  const [pairs, setPairs] = useState<[string, string][]>(
    () => Object.entries(attributes),
  );

  useEffect(() => {
    setPairs(Object.entries(attributes));
  }, [attributes]);

  function handleKeyChange(index: number, newKey: string) {
    const updated = pairs.map((pair, i) =>
      i === index ? [newKey, pair[1]] as [string, string] : pair,
    );
    setPairs(updated);
    onChange(Object.fromEntries(updated.filter(([k]) => k.trim() !== '')));
  }

  function handleValueChange(index: number, newValue: string) {
    const updated = pairs.map((pair, i) =>
      i === index ? [pair[0], newValue] as [string, string] : pair,
    );
    setPairs(updated);
    onChange(Object.fromEntries(updated.filter(([k]) => k.trim() !== '')));
  }

  function handleDelete(index: number) {
    const updated = pairs.filter((_, i) => i !== index);
    setPairs(updated);
    onChange(Object.fromEntries(updated.filter(([k]) => k.trim() !== '')));
  }

  function handleAdd() {
    setPairs((prev) => [...prev, ['', '']]);
  }

  return (
    <div className="space-y-2">
      {pairs.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No custom attributes defined.</p>
      ) : (
        <div className="space-y-2">
          {pairs.map(([key, value], index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                placeholder="key"
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-500 text-xs flex-shrink-0">=</span>
              <input
                type="text"
                value={value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder="value"
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors text-sm leading-none"
                aria-label="Remove attribute"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
      >
        <span className="text-sm leading-none">+</span>
        Add Attribute
      </button>
    </div>
  );
}
