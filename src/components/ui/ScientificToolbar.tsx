
import React from 'react';
import { toggleScientificFormat } from '../../lib/scientificFormat';
import { cn } from '../../lib/utils';

interface ScientificToolbarProps {
  targetRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (val: string) => void;
  activeFormat?: 'none' | 'super' | 'sub';
  onToggleFormat?: (format: 'super' | 'sub') => void;
  className?: string;
  showStatus?: boolean;
}

export function ScientificToolbar({ 
  targetRef, 
  onChange, 
  activeFormat = 'none',
  onToggleFormat,
  className, 
  showStatus = true 
}: ScientificToolbarProps) {
  
  const handleToggle = (type: 'super' | 'sub') => {
    const textarea = targetRef.current;
    if (!textarea) return;

    const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
    
    if (hasSelection) {
      // If text is selected, toggle formatting on that text
      toggleScientificFormat(textarea, type, onChange);
    } else if (onToggleFormat) {
      // If no selection, toggle the "active mode" for subsequent typing
      onToggleFormat(type);
    }
  };

  return (
    <div className={cn(
      "bg-slate-50 border-b border-slate-200 px-3 py-2 flex gap-1 items-center",
      className
    )}>
      <button 
        onMouseDown={(e) => { 
          e.preventDefault(); 
          handleToggle('super');
        }}
        className={cn(
          "w-10 h-8 flex items-center justify-center text-[10px] font-bold border transition-all rounded shadow-sm",
          activeFormat === 'super' 
            ? "bg-blue-600 border-blue-600 text-white" 
            : "bg-white border-slate-200 hover:bg-blue-50 text-slate-600"
        )}
        title="Superscript (Aktifkan untuk mulai menulis)"
      >
        x<sup>2</sup>
      </button>
      <button 
        onMouseDown={(e) => { 
          e.preventDefault(); 
          handleToggle('sub');
        }}
        className={cn(
          "w-10 h-8 flex items-center justify-center text-[10px] font-bold border transition-all rounded shadow-sm",
          activeFormat === 'sub' 
            ? "bg-blue-600 border-blue-600 text-white" 
            : "bg-white border-slate-200 hover:bg-blue-50 text-slate-600"
        )}
        title="Subscript (Aktifkan untuk mulai menulis)"
      >
        x<sub>2</sub>
      </button>
      
      {showStatus && (
        <>
          <div className="w-px h-4 bg-slate-300 mx-2" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Format Kimia</span>
            {activeFormat !== 'none' && (
              <span className="text-[9px] text-blue-500 font-medium animate-pulse mt-1">
                Mode {activeFormat === 'super' ? 'Superskrip' : 'Subskrip'} Aktif
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
