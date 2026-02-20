"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

export interface CatalogTab {
  id: string;
  label: string;
  count: number;
  /** Optional badge to show selection count, e.g. "3" when 3 selected */
  selectedCount?: number;
  accentClass?: string;
}

interface CatalogTabsProps {
  tabs: CatalogTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function CatalogTabs({
  tabs,
  activeTabId,
  onTabChange,
  children,
}: CatalogTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateOverflow = useCallback(() => {
    const container = containerRef.current;
    const nav = navRef.current;
    if (!container || !nav) return;
    const overflow = nav.scrollWidth > container.clientWidth;
    setHasOverflow(overflow);
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateOverflow, tabs.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div ref={containerRef} className="flex-shrink-0 border-b border-zinc-700/50 flex items-stretch relative">
        {/* Hidden measuring nav - always rendered to detect overflow */}
        <nav
          ref={navRef}
          className="flex gap-0.5 items-center py-0.5 min-w-max absolute invisible pointer-events-none"
          aria-hidden="true"
        >
          {tabs.map((tab) => (
            <span key={tab.id} className="px-3 py-2 text-sm font-medium whitespace-nowrap">
              {tab.label}
              {tab.selectedCount !== undefined && tab.selectedCount > 0 && (
                <span className="ml-2 text-xs">({tab.selectedCount})</span>
              )}
            </span>
          ))}
        </nav>

        {hasOverflow ? (
          <div className="flex-1 py-1 px-1">
            <select
              value={activeTabId}
              onChange={(e) => onTabChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
              aria-label="Select category"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                  {tab.selectedCount !== undefined && tab.selectedCount > 0
                    ? ` (${tab.selectedCount})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide">
            <nav
              className="flex gap-0.5 items-center py-0.5 min-w-max"
              role="tablist"
              aria-label="Item categories"
            >
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                const accent = tab.accentClass ?? "text-zinc-400";
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      px-3 py-2 text-sm font-medium whitespace-nowrap
                      border-b-2 -mb-px transition-colors
                      focus:outline-none
                      ${
                        isActive
                          ? `${accent} border-current`
                          : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600"
                      }
                    `}
                  >
                    <span>{tab.label}</span>
                    {tab.selectedCount !== undefined && tab.selectedCount > 0 && (
                      <span className="ml-2 text-xs opacity-80">
                        ({tab.selectedCount})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
        className="flex-1 min-h-0 overflow-hidden mt-2 flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
