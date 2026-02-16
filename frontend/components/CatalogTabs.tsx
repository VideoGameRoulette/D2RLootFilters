"use client";

import { ReactNode } from "react";

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
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-700/50 overflow-x-auto">
        <nav
          className="flex gap-0.5 min-w-max"
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
                  px-4 py-3 text-sm font-medium whitespace-nowrap
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
      <div
        role="tabpanel"
        id={`panel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
        className="flex-1 min-h-0 overflow-hidden mt-4 flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
