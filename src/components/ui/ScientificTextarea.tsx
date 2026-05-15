
import React from 'react';
import { cn } from '../../lib/utils';
import { ScientificToolbar } from './ScientificToolbar';
import { handleScientificInput, superInverse, subInverse } from '../../lib/scientificFormat';

interface ScientificTextareaProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  italic?: boolean;
}

export function ScientificTextarea({ 
  value, 
  onChange, 
  className, 
  placeholder, 
  rows = 4, 
  minHeight = '140px',
  italic = false
}: ScientificTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [activeFormat, setActiveFormat] = React.useState<'none' | 'super' | 'sub'>('none');

  // Auto-resize height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleToggleFormat = (format: 'super' | 'sub') => {
    setActiveFormat(prev => prev === format ? 'none' : format);
  };

  const checkCursorFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const text = textarea.value;
    
    // Check characters around cursor to see if we should auto-activate mode
    // like in Word when clicking into a superscript area
    if (pos > 0) {
      const charBefore = text[pos - 1];
      if (superInverse[charBefore]) {
        setActiveFormat('super');
        return;
      }
      if (subInverse[charBefore]) {
        setActiveFormat('sub');
        return;
      }
    }
    setActiveFormat('none');
  };

  return (
    <div className="relative group/scientific flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all duration-300">
      <ScientificToolbar 
        targetRef={textareaRef} 
        onChange={onChange} 
        activeFormat={activeFormat}
        onToggleFormat={handleToggleFormat}
      />

      <textarea 
        ref={textareaRef}
        rows={rows}
        className={cn(
          "w-full p-4 bg-white outline-none border-none leading-relaxed resize-none transition-all duration-300",
          italic ? "italic text-slate-700" : "text-slate-800",
          className
        )}
        style={{ minHeight }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleScientificInput(e, activeFormat, onChange)}
        onSelect={checkCursorFormat}
        onKeyUp={checkCursorFormat}
        onClick={checkCursorFormat}
      />
    </div>
  );
}
