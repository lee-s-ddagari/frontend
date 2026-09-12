import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { SEOUL_DONGS, type SeoulDong } from '../data/seoulDongs';

interface AddressSearchProps {
  value: SeoulDong | null;
  onChange: (value: SeoulDong | null) => void;
}

const RESULT_LIMIT = 8;

function optionLabel(address: SeoulDong): string {
  return `${address.dong} · ${address.gu}`;
}

export default function AddressSearch({
  value,
  onChange,
}: AddressSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.dong ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().replace(/\s/g, '');
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return SEOUL_DONGS.filter(
      ({ gu, dong }) =>
        gu.includes(normalizedQuery) || dong.includes(normalizedQuery),
    ).slice(0, RESULT_LIMIT);
  }, [normalizedQuery]);

  const showResults = open && normalizedQuery.length > 0;

  function selectAddress(address: SeoulDong) {
    setQuery(address.dong);
    setOpen(false);
    setActiveIndex(0);
    onChange(address);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showResults || results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + results.length) % results.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectAddress(results[Math.min(activeIndex, results.length - 1)]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <input
        type="search"
        value={query}
        role="combobox"
        aria-label="동 또는 구 검색"
        aria-autocomplete="list"
        aria-controls="address-search-results"
        aria-expanded={showResults}
        aria-activedescendant={
          showResults && results.length > 0
            ? `address-result-${activeIndex}`
            : undefined
        }
        placeholder="예: 서교동, 마포구"
        className="min-h-14 w-full rounded-md border border-ink/30 bg-surface-alt px-4 text-base text-ink placeholder:text-ink-muted/70"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          onChange(null);
        }}
        onKeyDown={handleKeyDown}
      />

      {!normalizedQuery && (
        <p className="mt-2 text-sm text-ink-muted">동 이름을 입력하세요</p>
      )}

      {value && !open && (
        <p className="mt-2 text-sm text-ink-muted">
          선택됨: {optionLabel(value)}
        </p>
      )}

      {showResults && (
        <div
          id="address-search-results"
          role="listbox"
          aria-label="서울 행정동 검색 결과"
          className="absolute inset-x-0 top-16 z-20 overflow-hidden rounded-md border border-ink/20 bg-surface"
        >
          {results.length > 0 ? (
            results.map((address, index) => (
              <button
                key={`${address.gu}-${address.dong}`}
                id={`address-result-${index}`}
                type="button"
                role="option"
                aria-selected={value?.gu === address.gu && value.dong === address.dong}
                className={`block min-h-12 w-full border-b border-ink/10 px-4 text-left text-base last:border-b-0 ${
                  index === activeIndex
                    ? 'bg-ink text-surface'
                    : 'bg-surface text-ink hover:bg-surface-alt'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectAddress(address)}
              >
                {optionLabel(address)}
              </button>
            ))
          ) : (
            <p className="px-4 py-4 text-sm text-ink-muted" role="status">
              검색 결과가 없어요
            </p>
          )}
        </div>
      )}
    </div>
  );
}
