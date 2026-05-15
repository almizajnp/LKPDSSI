import React, { useState } from 'react';
import { useLKPD } from '../../contexts/LKPDContext';
import { ExternalLink, Table as TableIcon, FileText, Plus, Trash2 } from 'lucide-react';
import { ScientificCell } from '../ui/ScientificCell';
import { cn } from '../../lib/utils';

const articles = [
  { id: '1', title: 'Dampak Kesehatan Merokok', url: 'https://drive.google.com/file/d/1wLeO7EYjm_bTkJjWeqsZUx15b4V2I-_O/preview' },
  { id: '2', title: 'Ekonomi Industri Rokok di Indonesia', url: 'https://drive.google.com/file/d/1xg7D_C5AznCgeonNUfRWEF7NBLNm72kT/preview' },
  { id: '3', title: 'Zat Kimia Berbahaya dalam Rokok', url: 'https://drive.google.com/file/d/1HJ76DRinqp1TZj_Sba94mGYdJ7ozXeFC/preview' },
  { id: '4', title: 'Dampak Kesehatan Merokok', url: 'https://drive.google.com/file/d/1ASHP9sYVYKmskD5NwL6Jggz0f6qwYSvB/preview' },
  { id: '5', title: 'Kenaikan ekonomi dari rokok', url: 'https://drive.google.com/file/d/1VlDFvLsQcGMkNOLste-3iniApzRWxnb4/preview' },
  { id: '6', title: 'Kandungan Kimia Rokok', url: 'https://validnews.id/opini/CUKAI-ROKOK-DAN-DAMPAK-KESEHATAN--DILEMA-TAK-BERKESUDAHAN-PLW' },
];

export default function Step2() {
  const { answers, updateStepData } = useLKPD();
  const [activeTab, setActiveTab] = useState(0);

  const updateTable = (tableName: string, index: number, field: string, value: string) => {
    const currentTable = [...(answers?.step2?.[tableName] || [])];
    if (index >= currentTable.length) {
      currentTable.push({ [field]: value });
    } else {
      currentTable[index] = { ...currentTable[index], [field]: value };
    }
    updateStepData('step2', { [tableName]: currentTable });
  };

  const addRow = (tableName: string) => {
    const currentTable = [...(answers?.step2?.[tableName] || [])];
    currentTable.push({});
    updateStepData('step2', { [tableName]: currentTable });
  };

  const removeRow = (tableName: string, index: number) => {
    const currentTable = [...(answers?.step2?.[tableName] || [])];
    currentTable.splice(index, 1);
    updateStepData('step2', { [tableName]: currentTable });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
       <div className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-blue-600 pl-4">STEP 2 — Data Generation</h2>
        <p className="text-slate-600 text-sm italic">Pelajari artikel-artikel di bawah ini untuk mengumpulkan data pendukung investigasi Anda.</p>
      </div>

      {/* Article Viewer */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
           <FileText className="text-blue-500" size={20} /> Referensi Artikel (6 Sumber)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art, idx) => (
            <div key={idx} className="lkpd-card p-4 hover:border-blue-300 transition-all group">
              <h4 className="text-xs font-bold text-slate-900 mb-3 truncate" title={art.title}>{art.title}</h4>
              <div className="aspect-[4/3] bg-slate-100 rounded border border-slate-200 overflow-hidden relative">
                <iframe 
                  src={art.url} 
                  className="w-full h-full p-2"
                  title={art.title}
                />
              </div>
              <a 
                href={art.url} 
                target="_blank" 
                rel="noreferrer"
                className="mt-3 w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase py-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                Buka Penuh <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Investigation Tables */}
      <div className="space-y-10 pt-6">
        {/* Table 1 */}
        <TableSection 
          title="Tabel 1 — Zat Kimia Rokok"
          columns={[{ key: 'chemical', label: 'Zat Kimia' }, { key: 'source', label: 'Sumber' }]}
          data={answers?.step2?.table1 || []}
          onUpdate={(idx, key, val) => updateTable('table1', idx, key, val)}
          onAdd={() => addRow('table1')}
          onRemove={(idx) => removeRow('table1', idx)}
        />

        {/* Table 2 */}
        <TableSection 
          title="Tabel 2 — Dampak terhadap Kesehatan"
          columns={[{ key: 'impact', label: 'Dampak Kesehatan' }, { key: 'source', label: 'Sumber' }]}
          data={answers?.step2?.table2 || []}
          onUpdate={(idx, key, val) => updateTable('table2', idx, key, val)}
          onAdd={() => addRow('table2')}
          onRemove={(idx) => removeRow('table2', idx)}
        />

        {/* Table 3 */}
        <TableSection 
          title="Tabel 3 — Dampak terhadap Ekonomi"
          columns={[{ key: 'impact', label: 'Dampak Ekonomi' }, { key: 'source', label: 'Sumber' }]}
          data={answers?.step2?.table3 || []}
          onUpdate={(idx, key, val) => updateTable('table3', idx, key, val)}
          onAdd={() => addRow('table3')}
          onRemove={(idx) => removeRow('table3', idx)}
        />
      </div>
    </div>
  );
}

import { ScientificToolbar } from '../ui/ScientificToolbar';

function TableSection({ title, columns, data, onUpdate, onAdd, onRemove }: any) {
  const [activeCell, setActiveCell] = useState<{
    ref: React.RefObject<HTMLTextAreaElement>;
    onChange: (val: string) => void;
  } | null>(null);
  const [activeFormat, setActiveFormat] = useState<'none' | 'super' | 'sub'>('none');

  const handleCellFocus = (
    ref: React.RefObject<HTMLTextAreaElement>, 
    currentVal: string, 
    updateFn: (v: string) => void
  ) => {
    setActiveCell({ ref, onChange: updateFn });
  };

  const handleToggleFormat = (format: 'super' | 'sub') => {
    setActiveFormat(prev => prev === format ? 'none' : format);
  };

  return (
    <div className="space-y-0 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header & Toolbar */}
      <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <TableIcon size={16} /> {title}
        </h3>
        <button onClick={onAdd} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded flex items-center gap-1 transition-colors">
          <Plus size={14} /> Tambah Baris
        </button>
      </div>

      {/* Shared Scientific Toolbar for Table */}
      <ScientificToolbar 
        targetRef={activeCell?.ref || { current: null }} 
        onChange={activeCell?.onChange || (() => {})} 
        activeFormat={activeFormat}
        onToggleFormat={handleToggleFormat}
        className={cn(
          "bg-slate-100 border-b border-slate-200 transition-opacity duration-300",
          activeCell ? "opacity-100" : "opacity-50 grayscale pointer-events-none"
        )}
        showStatus={true}
      />

      <div className="overflow-x-auto bg-white">
        <table className="lkpd-table border-none ring-0 rounded-none">
          <thead>
            <tr>
              {columns.map((col: any) => <th key={col.key} className="bg-slate-50">{col.label}</th>)}
              <th className="w-10 bg-slate-50"></th>
            </tr>
          </thead>
          <tbody>
            {(data.length === 0 ? [{}] : data).map((row: any, idx: number) => (
              <tr key={idx}>
                {columns.map((col: any) => (
                  <td key={col.key} className="p-0 align-top border-slate-100">
                    <ScientificCell 
                      value={row[col.key] || ''}
                      onChange={(val: string) => onUpdate(idx, col.key, val)}
                      onFocus={handleCellFocus}
                      activeFormat={activeFormat}
                      onFormatChange={setActiveFormat}
                      placeholder="..."
                    />
                  </td>
                ))}
                <td className="text-center pt-3 border-slate-100">
                  <button onClick={() => onRemove(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {!activeCell && (
        <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 italic">
          * Klik pada sel tabel untuk mengaktifkan alat bantu format.
        </div>
      )}
    </div>
  );
}
