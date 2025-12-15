/**
 * @fileoverview Filter bar component with enhanced search and export
 */

import { useState } from 'react';
import { LogLevel } from '@logloom/shared';
import { useLogStore, useUniqueSourceNames, useSourcesArray, useFilteredLogs } from '../hooks/useLogStore';
import { SourceBadge } from './SourceBadge';
import { exportLogs, type ExportFormat } from '../utils/export';

// Default colors for sources without server-assigned colors
const DEFAULT_COLORS = [
    '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
    '#FB923C', '#2DD4BF', '#F472B6', '#818CF8', '#4ADE80',
];

/**
 * Level badges for filtering.
 */
const LEVELS = [
    { level: LogLevel.DEBUG, label: 'DBG' },
    { level: LogLevel.INFO, label: 'INF' },
    { level: LogLevel.WARN, label: 'WRN' },
    { level: LogLevel.ERROR, label: 'ERR' },
] as const;

/**
 * Time range presets for quick filtering.
 */
const TIME_RANGES = [
    { label: 'All Time', value: '' },
    { label: 'Last 5 min', value: '5' },
    { label: 'Last 15 min', value: '15' },
    { label: 'Last hour', value: '60' },
    { label: 'Last 24h', value: '1440' },
] as const;

export function FilterBar() {
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Store selectors
    const filter = useLogStore((state) => state.filter);
    const setSearchText = useLogStore((state) => state.setSearchText);
    const setSearchMode = useLogStore((state) => state.setSearchMode);
    const setMinLevel = useLogStore((state) => state.setMinLevel);
    const toggleSource = useLogStore((state) => state.toggleSource);
    const setTimeRange = useLogStore((state) => state.setTimeRange);
    const clearFilter = useLogStore((state) => state.clearFilter);
    const clearLogs = useLogStore((state) => state.clearLogs);

    const sources = useSourcesArray();
    const uniqueSourceNames = useUniqueSourceNames();
    const filteredLogs = useFilteredLogs();

    // Create a color map for sources
    const sourceColorMap = new Map<string, string>();
    sources.forEach((source) => {
        sourceColorMap.set(source.name, source.color);
    });

    // Get display sources (from logs if no server sources)
    const displaySources = uniqueSourceNames.map((name, index) => ({
        name,
        color: sourceColorMap.get(name) ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? '#60A5FA',
    }));

    // Export handlers
    const handleExport = (format: ExportFormat) => {
        exportLogs({
            format,
            logs: filteredLogs,
            filters: filter,
            includeMetadata: true,
        });
        setShowExportMenu(false);
    };

    // Time range handler
    const handleTimeRangeChange = (value: string) => {
        if (!value) {
            setTimeRange({ enabled: false });
        } else {
            setTimeRange({
                enabled: true,
                type: 'relative',
                last: parseInt(value, 10),
            });
        }
    };

    return (
        <div className="filter-bar">
            <div className="filter-bar__sources">
                {displaySources.map((source) => (
                    <SourceBadge
                        key={source.name}
                        source={source}
                        active={filter.sources.length === 0 || filter.sources.includes(source.name)}
                        onClick={() => toggleSource(source.name)}
                    />
                ))}
                {displaySources.length === 0 && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        No sources connected
                    </span>
                )}
            </div>

            <div className="filter-bar__search">
                <input
                    type="text"
                    placeholder="Filter logs..."
                    value={filter.searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <button
                    className={`search-mode-toggle ${filter.searchMode === 'regex' ? 'search-mode-toggle--active' : ''}`}
                    onClick={() => setSearchMode(filter.searchMode === 'text' ? 'regex' : 'text')}
                    title={filter.searchMode === 'text' ? 'Enable regex search' : 'Disable regex search'}
                >
                    .*
                </button>
            </div>

            <div className="filter-bar__time-range">
                <select
                    value={filter.timeRange.enabled && filter.timeRange.last ? filter.timeRange.last.toString() : ''}
                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                    title="Filter by time range"
                >
                    {TIME_RANGES.map((range) => (
                        <option key={range.value} value={range.value}>
                            {range.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-bar__levels">
                {LEVELS.map(({ level, label }) => (
                    <button
                        key={level}
                        className={`level-badge level-badge--${level.toLowerCase()} ${filter.minLevel !== level ? '' : 'level-badge--active'
                            }`}
                        onClick={() => setMinLevel(level)}
                        title={`Show ${level} and above`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="filter-bar__actions">
                <button
                    className="filter-bar__reset"
                    onClick={clearFilter}
                    title="Reset all filters"
                >
                    Reset
                </button>

                <div className="filter-bar__divider" />

                {/* Export Dropdown */}
                <div className="export-dropdown">
                    <button
                        className="export-dropdown__trigger"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        title="Export logs"
                    >
                        💾 Export
                    </button>
                    {showExportMenu && (
                        <>
                            <div
                                className="export-dropdown__backdrop"
                                onClick={() => setShowExportMenu(false)}
                            />
                            <div className="export-dropdown__menu">
                                <button onClick={() => handleExport('json')}>
                                    Export as JSON
                                </button>
                                <button onClick={() => handleExport('csv')}>
                                    Export as CSV
                                </button>
                                <button onClick={() => handleExport('txt')}>
                                    Export as Text
                                </button>
                                <div className="export-dropdown__info">
                                    {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="filter-bar__divider" />

                <button
                    className="filter-bar__clear-logs"
                    onClick={() => {
                        if (confirm('Are you sure you want to clear all logs?')) {
                            clearLogs();
                        }
                    }}
                    title="Clear all logs"
                >
                    🗑️ Clear Logs
                </button>
            </div>
        </div>
    );
}
