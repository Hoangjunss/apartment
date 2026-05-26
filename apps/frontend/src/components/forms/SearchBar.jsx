// src/components/forms/SearchBar.jsx
import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({
  placeholder = 'Tìm kiếm...',
  value,
  onChange,
  debounceMs = 300,
}) {
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sync external value
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  // Debounce onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-9 w-full"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
