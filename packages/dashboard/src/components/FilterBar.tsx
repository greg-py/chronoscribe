/**
 * @fileoverview Professional filter bar component
 */

import { useState } from "react";
import { LogLevel } from "@logloom/shared";
import {
  useLogStore,
  useUniqueSourceNames,
  useSourcesArray,
  useFilteredLogs,
} from "../hooks/useLogStore";
import { SourceBadge } from "./SourceBadge";
import { exportLogs, type ExportFormat } from "../utils/export";
import type { TimeDisplayMode } from "../utils/timeUtils";
import {
  SearchIcon,
  DownloadIcon,
  TrashIcon,
  RefreshIcon,
  BookmarkIcon,
} from "./Icons";

const DEFAULT_COLORS = [
  "#60A5FA",
  "#34D399",
  "#FBBF24",
  "#F87171",
  "#A78BFA",
  "#FB923C",
  "#2DD4BF",
  "#F472B6",
  "#818CF8",
  "#4ADE80",
];

const LEVELS = [
  { level: LogLevel.DEBUG, label: "Debug" },
  { level: LogLevel.INFO, label: "Info" },
  { level: LogLevel.WARN, label: "Warn" },
  { level: LogLevel.ERROR, label: "Error" },
] as const;

const TIME_RANGES = [
  { label: "All Time", value: "" },
  { label: "Last 5 min", value: "5" },
  { label: "Last 15 min", value: "15" },
  { label: "Last hour", value: "60" },
  { label: "Last 24h", value: "1440" },
] as const;

export function FilterBar() {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Store selectors
  const filter = useLogStore((state) => state.filter);
  const setSearchText = useLogStore((state) => state.setSearchText);
  const setMinLevel = useLogStore((state) => state.setMinLevel);
  const toggleSource = useLogStore((state) => state.toggleSource);
  const setTimeRange = useLogStore((state) => state.setTimeRange);
  const showBookmarksOnly = useLogStore((state) => state.showBookmarksOnly);
  const setShowBookmarksOnly = useLogStore(
    (state) => state.setShowBookmarksOnly
  );
  const timeDisplayMode = useLogStore((state) => state.timeDisplayMode);
  const setTimeDisplayMode = useLogStore((state) => state.setTimeDisplayMode);
  const bookmarks = useLogStore((state) => state.bookmarks);
  const clearFilter = useLogStore((state) => state.clearFilter);
  const clearLogs = useLogStore((state) => state.clearLogs);

  const sources = useSourcesArray();
  const uniqueSourceNames = useUniqueSourceNames();
  const filteredLogs = useFilteredLogs();

  const sourceColorMap = new Map<string, string>();
  sources.forEach((source) => {
    sourceColorMap.set(source.name, source.color);
  });

  const displaySources = uniqueSourceNames.map((name, index) => ({
    name,
    color:
      sourceColorMap.get(name) ??
      DEFAULT_COLORS[index % DEFAULT_COLORS.length] ??
      "#60A5FA",
  }));

  const handleExport = (format: ExportFormat) => {
    exportLogs({
      format,
      logs: filteredLogs,
      filters: filter,
      includeMetadata: true,
    });
    setShowExportMenu(false);
  };

  const handleTimeRangeChange = (value: string) => {
    if (!value) {
      setTimeRange({ enabled: false });
    } else {
      setTimeRange({
        enabled: true,
        type: "relative",
        last: parseInt(value, 10),
      });
    }
  };

  return (
    <div className="filter-bar">
      {/* Sources - only render if there are sources */}
      {displaySources.length > 0 && (
        <>
          <div className="filter-bar__section">
            {displaySources.map((source) => (
              <SourceBadge
                key={source.name}
                source={source}
                active={
                  filter.sources.length === 0 ||
                  filter.sources.includes(source.name)
                }
                onClick={() => toggleSource(source.name)}
              />
            ))}
          </div>
          <div className="filter-bar__divider" />
        </>
      )}

      {/* Search */}
      <div className="filter-bar__search">
        <div className="filter-bar__search-icon">
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          placeholder="Search logs..."
          value={filter.searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Time Range */}
      <select
        className="select-input"
        value={
          filter.timeRange.enabled && filter.timeRange.last
            ? filter.timeRange.last.toString()
            : ""
        }
        onChange={(e) => handleTimeRangeChange(e.target.value)}
        title="Filter by time range"
      >
        {TIME_RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>

      {/* Level Filters */}
      <div className="filter-bar__section">
        {LEVELS.map(({ level, label }) => (
          <button
            key={level}
            className={`level-badge level-badge--${level.toLowerCase()} ${
              filter.minLevel === level ? "level-badge--active" : ""
            }`}
            onClick={() => setMinLevel(level)}
            title={`Show ${level} and above`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-bar__divider" />

      {/* Time Display Mode */}
      <select
        className="select-input"
        value={timeDisplayMode}
        onChange={(e) => setTimeDisplayMode(e.target.value as TimeDisplayMode)}
        title="Time display format"
      >
        <option value="absolute">Absolute Time</option>
        <option value="relative">Relative Time</option>
        <option value="both">Both</option>
      </select>

      {/* Bookmarks Filter */}
      <button
        className={`toggle-button ${
          showBookmarksOnly ? "toggle-button--active" : ""
        }`}
        onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
        title={
          showBookmarksOnly ? "Show all logs" : "Show only bookmarked logs"
        }
      >
        <BookmarkIcon size={16} />
        Bookmarks
        {bookmarks.size > 0 && ` (${bookmarks.size})`}
      </button>

      <div className="filter-bar__divider" />

      {/* Actions */}
      <button
        className="icon-button"
        onClick={clearFilter}
        title="Reset all filters"
      >
        <RefreshIcon size={16} />
      </button>

      {/* Export Dropdown */}
      <div className="export-dropdown">
        <button
          className="toggle-button"
          onClick={() => setShowExportMenu(!showExportMenu)}
          title="Export logs"
        >
          <DownloadIcon size={16} />
          Export
        </button>
        {showExportMenu && (
          <>
            <div
              className="export-dropdown__backdrop"
              onClick={() => setShowExportMenu(false)}
            />
            <div className="export-dropdown__menu">
              <button
                className="export-dropdown__item"
                onClick={() => handleExport("json")}
              >
                <DownloadIcon size={16} />
                Export as JSON
              </button>
              <button
                className="export-dropdown__item"
                onClick={() => handleExport("csv")}
              >
                <DownloadIcon size={16} />
                Export as CSV
              </button>
              <button
                className="export-dropdown__item"
                onClick={() => handleExport("txt")}
              >
                <DownloadIcon size={16} />
                Export as Text
              </button>
              <div className="export-dropdown__footer">
                {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        className="icon-button"
        onClick={() => {
          if (confirm("Are you sure you want to clear all logs?")) {
            clearLogs();
          }
        }}
        title="Clear all logs"
      >
        <TrashIcon size={16} />
      </button>
    </div>
  );
}
