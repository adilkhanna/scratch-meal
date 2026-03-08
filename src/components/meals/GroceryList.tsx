'use client';

import { GroceryItem, GrocerySection, GROCERY_SECTION_LABELS } from '@/types';

interface Props {
  items: GroceryItem[];
  onToggle: (index: number) => void;
}

const SECTION_ORDER: GrocerySection[] = [
  'produce', 'proteins', 'dairy', 'grains', 'spices', 'oils_condiments', 'other',
];

export default function GroceryList({ items, onToggle }: Props) {
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    label: GROCERY_SECTION_LABELS[section],
    items: items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between px-2">
        <span className="text-[12px] tracking-[1px] uppercase text-black/50">
          {items.length} items &middot; {checkedCount} checked
        </span>
      </div>

      {/* Sections */}
      {grouped.map(({ section, label, items: sectionItems }) => (
        <div key={section}>
          <h4 className="text-[12px] font-medium tracking-[1px] uppercase text-black/50 mb-3">
            {label}
          </h4>
          <div className="glass-panel divide-y divide-black/5">
            {sectionItems.map((item) => (
              <button
                key={item.originalIndex}
                onClick={() => onToggle(item.originalIndex)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/10 transition-colors text-left"
              >
                {/* Checkbox */}
                <span
                  className={`w-[14px] h-[14px] rounded border-[1.5px] shrink-0 flex items-center justify-center transition-all ${
                    item.checked
                      ? 'bg-black border-black'
                      : 'border-black/30'
                  }`}
                >
                  {item.checked && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>

                {/* Item details */}
                <span className={`flex-1 text-[14px] transition-all ${
                  item.checked ? 'line-through text-black/30' : 'text-black'
                }`}>
                  {item.name}
                </span>
                <span className={`text-[12px] font-[family-name:var(--font-mono-option)] tracking-[0.5px] uppercase shrink-0 transition-all ${
                  item.checked ? 'text-black/20' : 'text-black/40'
                }`}>
                  {item.quantity} {item.unit}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-center text-[13px] text-black/40 py-8">
          No items in your grocery list yet.
        </p>
      )}
    </div>
  );
}
