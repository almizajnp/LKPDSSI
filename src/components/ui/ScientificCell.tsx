
import React from 'react';
import { cn } from '../../lib/utils';
import { handleScientificInput, superInverse, subInverse } from '../../lib/scientificFormat';

interface ScientificCellProps {
  value: string;
  onChange: (val: string) => void;
  activeFormat?: 'none' | 'super' | 'sub';
  onFormatChange?: (format: 'none' | 'super' | 'sub') => void;
  onFocus?: (ref: React.RefObject<HTMLTextAreaElement>, currentVal: string, updateFn: (v: string) => void) => void;
  placeholder?: string;
}

export function ScientificCell({ 
  value, 
  onChange, 
  activeFormat = 'none', 
  onFormatChange,
  onFocus, 
  placeholder 
}: ScientificCellProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  // Auto-resize height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const checkCursorFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea || !onFormatChange) return;

    const pos = textarea.selectionStart;
    const text = textarea.value;
    
    if (pos > 0) {
      const charBefore = text[pos - 1];
      if (superInverse[charBefore]) {
        onFormatChange('super');
        return;
      }
      if (subInverse[charBefore]) {
        onFormatChange('sub');
        return;
      }
    }
    onFormatChange('none');
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(textareaRef, value, onChange);
    }
    checkCursorFormat();
  };

  return (
    <div className="relative group/cell w-full h-full min-h-[56px] flex flex-col justify-center">
      <textarea 
        ref={textareaRef}
        rows={1}
        className={cn(
          "w-full p-3 bg-transparent outline-none border-none focus:bg-blue-50/50 transition-all duration-200 resize-none text-[13px] leading-relaxed overflow-hidden py-4",
          isFocused ? "z-10 bg-white shadow-inner" : "z-0"
        )}
        style={{ minHeight: '56px' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleScientificInput(e, activeFormat, onChange)}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        onSelect={checkCursorFormat}
        onKeyUp={checkCursorFormat}
        onClick={checkCursorFormat}
        placeholder={placeholder || '...'}
      />
    </div>
  );
}
