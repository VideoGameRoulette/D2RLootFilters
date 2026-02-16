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

const SCROLL_STEP = 160;

export function CatalogTabs({
  tabs,
  activeTabId,
  onTabChange,
  children,
}: CatalogTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && el.scrollLeft > 0);
    setCanScrollRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, tabs.length]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const step = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
      el.scrollBy({ left: step, behavior: "smooth" });
    },
    []
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-700/50 flex items-stretch">
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scroll("left")}
            onFocus={updateScrollState}
            aria-label="Scroll tabs left"
            className={`
              flex-shrink-0 px-2 border-r border-zinc-700/50
              text-zinc-400 hover:text-white hover:bg-zinc-700/50
              focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:ring-inset
              transition-colors
              ${!canScrollLeft ? "opacity-40 pointer-events-none" : ""}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
          onScroll={updateScrollState}
        >
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
                  {(tab.selectedCount !== undefined && tab.selectedCount > 0) && (
                    <span className="ml-2 text-xs opacity-80">
                      ({tab.selectedCount})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        {hasOverflow && (
          <button
            type="button"
            onClick={() => scroll("right")}
            onFocus={updateScrollState}
            aria-label="Scroll tabs right"
            className={`
              flex-shrink-0 px-2 border-l border-zinc-700/50
              text-zinc-400 hover:text-white hover:bg-zinc-700/50
              focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:ring-inset
              transition-colors
              ${!canScrollRight ? "opacity-40 pointer-events-none" : ""}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
