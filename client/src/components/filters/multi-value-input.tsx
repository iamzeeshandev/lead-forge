'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { Input } from '@/components/ui/input';

interface MultiValueInputProps {
  id: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  maxValues?: number;
}

export function MultiValueInput({
  id,
  values,
  onValuesChange,
  placeholder,
  maxValues,
}: MultiValueInputProps) {
  const [draft, setDraft] = useState('');
  const atLimit = maxValues !== undefined && values.length >= maxValues;

  function commit(raw: string) {
    const seen = new Set(values.map((value) => value.toLowerCase()));
    const additions: string[] = [];
    for (const part of raw.split(',')) {
      const value = part.trim();
      if (value && !seen.has(value.toLowerCase())) {
        seen.add(value.toLowerCase());
        additions.push(value);
      }
    }
    if (additions.length > 0) {
      onValuesChange([...values, ...additions].slice(0, maxValues));
    }
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter would otherwise submit the surrounding form before the value is added.
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onValuesChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex h-6 items-center gap-0.5 rounded-sm border bg-secondary pr-0.5 pl-2 text-xs"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() =>
                  onValuesChange(values.filter((v) => v !== value))
                }
                className="inline-flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-divider hover:text-foreground"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        disabled={atLimit}
        placeholder={atLimit ? `Up to ${maxValues} values` : placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
      />
    </div>
  );
}
