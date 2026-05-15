
import React from 'react';

export const superMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
};

export const subMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ', '+': '₊', '-': '₋', '=': '₌',
  '(': '₍', ')': '₎'
};

// Inverse maps to convert back to normal text
export const superInverse: Record<string, string> = Object.entries(superMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});
export const subInverse: Record<string, string> = Object.entries(subMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});

export function toggleScientificFormat(
  textarea: HTMLTextAreaElement | null,
  type: 'super' | 'sub',
  onChange: (val: string) => void
) {
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  if (!selected) return;

  const map = type === 'super' ? superMap : subMap;
  const invMap = type === 'super' ? superInverse : subInverse;

  // Check if ALL selected characters are already in this format
  const isAlreadyFormatted = selected.split('').every(char => invMap[char]);

  let formatted: string;
  if (isAlreadyFormatted) {
    // Revert back to normal
    formatted = selected.split('').map(char => invMap[char] || char).join('');
  } else {
    // Apply format - preserve case if no mapping exists
    formatted = selected.split('').map(char => map[char.toLowerCase()] || char).join('');
  }

  const newText = text.substring(0, start) + formatted + text.substring(end);
  onChange(newText);
  
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + formatted.length);
  }, 0);
}

export function handleScientificInput(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  activeFormat: 'none' | 'super' | 'sub',
  onChange: (val: string) => void
) {
  if (activeFormat === 'none') return;
  
  // Allow system keys
  if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

  const char = e.key;
  const map = activeFormat === 'super' ? superMap : subMap;
  const formattedChar = map[char.toLowerCase()];

  if (formattedChar) {
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + formattedChar + text.substring(end);
    onChange(newText);

    // Update cursor position manually after state update
    setTimeout(() => {
      textarea.setSelectionRange(start + 1, start + 1);
    }, 0);
  }
  // If no mapping exists (like for capital letters in subscript), 
  // we let the default behavior happen so the normal character is typed.
}
