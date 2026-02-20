"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const HELP_LINKS = [
  { label: "GitHub Issues", href: "https://github.com/VideoGameRoulette/D2RLootFilters/issues" },
];

const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === "true";

export interface SavedFilter {
  id: string;
  name: string;
  payload: { name: string; rules: unknown[] };
}

export interface ToolbarProps {
  onLoadFile: () => void;
  onLoadFromClipboard: () => void;
  onExportFile: () => void;
  onCopyToClipboard: () => void;
  onSaveFilter: () => void | Promise<void>;
  onLoadFilter: (payload: { name: string; rules: unknown[] }) => void;
  onMobileView?: () => void;
  canExport: boolean;
  presets?: SavedFilter[];
  userFilters?: SavedFilter[];
  userFilterCount?: number;
  maxUserFilters?: number;
  dataBase?: string;
  logoUrl?: string;
}

type DropdownId = "actions" | "presets" | "filters" | "help" | "auth" | null;

export function Toolbar({
  onLoadFile,
  onLoadFromClipboard,
  onExportFile,
  onCopyToClipboard,
  onSaveFilter,
  onLoadFilter,
  onMobileView,
  canExport,
  presets = [],
  userFilters = [],
  userFilterCount = 0,
  maxUserFilters = 16,
  dataBase = "",
  logoUrl,
}: ToolbarProps) {
  const { user, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  const toggle = (id: DropdownId) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  const handleLoadPreset = (filter: SavedFilter) => {
    onLoadFilter(filter.payload);
    closeDropdown();
  };

  const handleLoadUserFilter = (filter: SavedFilter) => {
    onLoadFilter(filter.payload);
    closeDropdown();
  };

  const atFilterLimit = user && userFilterCount >= maxUserFilters;

  return (
    <div
      ref={menuRef}
      className="flex-shrink-0 flex items-center gap-0 border-b border-zinc-700/60 bg-zinc-800/90 px-2 py-0.5 text-sm"
      role="menubar"
      aria-label="Application menu"
    >
      {/* Logo */}
      {logoUrl && (
        <img src={logoUrl} alt="D2R Loot Filter" className="h-8 w-8 object-contain mr-1" />
      )}

      {/* Actions */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("actions")}
          className="px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
          aria-haspopup="true"
          aria-expanded={openDropdown === "actions"}
        >
          Actions
        </button>
        {openDropdown === "actions" && (
          <div
            className="absolute left-0 top-full mt-0.5 min-w-[200px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50"
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                onLoadFile();
                closeDropdown();
              }}
              className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white"
              role="menuitem"
            >
              Load File
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadFromClipboard();
                closeDropdown();
              }}
              className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white"
              role="menuitem"
            >
              Load From Clipboard
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveFilter();
                closeDropdown();
              }}
              disabled={!user || !canExport}
              className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              role="menuitem"
              title={!user ? "Log in to save" : !canExport ? "Add items or fix rules to save" : undefined}
            >
              Save filter to profile
            </button>
            <hr className="my-1 border-zinc-600" />
            <button
              type="button"
              onClick={() => {
                onExportFile();
                closeDropdown();
              }}
              disabled={!canExport}
              className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              role="menuitem"
            >
              Download File &quot;Export File&quot;
            </button>
            <button
              type="button"
              onClick={() => {
                onCopyToClipboard();
                closeDropdown();
              }}
              disabled={!canExport}
              className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              role="menuitem"
            >
              Copy To Clipboard
            </button>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("presets")}
          className="px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
          aria-haspopup="true"
          aria-expanded={openDropdown === "presets"}
        >
          Presets
        </button>
        {openDropdown === "presets" && (
          <div
            className="absolute left-0 top-full mt-0.5 min-w-[220px] max-h-[320px] overflow-y-auto py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50"
            role="menu"
          >
            {presets.length === 0 ? (
              <div className="px-3 py-4 text-zinc-500 text-sm text-center">
                No curated presets yet.
              </div>
            ) : (
              presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white truncate"
                  role="menuitem"
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Filters (user saved filters) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("filters")}
          className="px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
          aria-haspopup="true"
          aria-expanded={openDropdown === "filters"}
        >
          Filters
        </button>
        {openDropdown === "filters" && (
          <div
            className="absolute left-0 top-full mt-0.5 min-w-[220px] max-h-[320px] overflow-y-auto py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50"
            role="menu"
          >
            {isStaticBuild ? (
              <div className="px-3 py-4 text-zinc-500 text-sm text-center">
                Saved filters not available in static build.
              </div>
            ) : !user ? (
              <div className="px-3 py-4 text-zinc-500 text-sm text-center">
                <Link
                  href={`/auth/login/?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                  className="text-violet-400 hover:text-violet-300"
                >
                  Log in
                </Link>
                {" to see your saved filters."}
              </div>
            ) : userFilters.length === 0 ? (
              <div className="px-3 py-4 text-zinc-500 text-sm text-center">
                No saved filters. (Max {maxUserFilters})
              </div>
            ) : (
              <>
                <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-600/50">
                  {userFilterCount} / {maxUserFilters} filters
                </div>
                {userFilters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleLoadUserFilter(f)}
                    className="w-full px-3 py-2 text-left text-zinc-200 hover:bg-zinc-600/50 hover:text-white truncate"
                    role="menuitem"
                  >
                    {f.name}
                  </button>
                ))}
                {atFilterLimit && (
                  <div className="px-3 py-2 text-xs text-amber-400/90">
                    Delete one to save new filters.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("help")}
          className="px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
          aria-haspopup="true"
          aria-expanded={openDropdown === "help"}
        >
          Help
        </button>
        {openDropdown === "help" && (
          <div
            className="absolute left-0 top-full mt-0.5 min-w-[200px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50"
            role="menu"
          >
            {HELP_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white"
                role="menuitem"
                onClick={closeDropdown}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Mobile view button */}
      {onMobileView && (
        <button
          type="button"
          onClick={onMobileView}
          className="ml-auto p-1.5 text-zinc-300 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
          title="Mobile view"
          aria-label="Mobile view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
        </button>
      )}

      {/* Login / Welcome - hidden on static GitHub Pages build */}
      {!isStaticBuild && (
        <div className={`relative ${onMobileView ? "" : "ml-auto"}`}>
          <button
            type="button"
            onClick={() => toggle("auth")}
            className="px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white rounded transition-colors"
            aria-haspopup="true"
            aria-expanded={openDropdown === "auth"}
          >
            {user ? `Welcome, ${user.username}` : "Login"}
          </button>
          {openDropdown === "auth" && (
            <div
              className="absolute right-0 top-full mt-0.5 min-w-[160px] py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50"
              role="menu"
            >
              {user ? (
                <button
                  type="button"
                  className="block w-full text-left px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white"
                  role="menuitem"
                  onClick={() => { closeDropdown(); logout(); }}
                >
                  Logout
                </button>
              ) : (
                <Link
                  href={`/auth/login/?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                  className="block px-3 py-2 text-zinc-200 hover:bg-zinc-600/50 hover:text-white"
                  role="menuitem"
                  onClick={closeDropdown}
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
