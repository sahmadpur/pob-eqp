'use client';

import { useEffect, useRef, useState } from 'react';

export interface SlotOption {
  id: string;
  slotLabel: string;
}

interface Props {
  slots: SlotOption[];
  value: string | null;
  onChange: (slotId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableSlotSelect({
  slots,
  value,
  onChange,
  placeholder = 'Search slot…',
  disabled = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = slots.find((s) => s.id === value) ?? null;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = query
    ? slots.filter((s) => s.slotLabel.toLowerCase().includes(query.toLowerCase()))
    : slots;

  const display = selected ? selected.slotLabel : query;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={open ? query : display}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected) onChange(null);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pob-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {open && !disabled && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 italic">No matches</li>
          ) : (
            filtered.map((slot) => (
              <li
                key={slot.id}
                onClick={() => {
                  onChange(slot.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={`px-3 py-2 text-sm font-mono cursor-pointer hover:bg-pob-blue/10 ${
                  slot.id === value ? 'bg-pob-blue/10 font-semibold' : ''
                }`}
              >
                {slot.slotLabel}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
