/**
 * @fileoverview Filter bar component
 */

import { LogLevel } from '@logloom/shared';
import { useLogStore, useUniqueSourceNames, useSourcesArray } from '../hooks/useLogStore';
import { SourceBadge } from './SourceBadge';

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

export function FilterBar() {
    const filter = useLogStore((state) => state.filter);
    const setSearchText = useLogStore((state) => state.setSearchText);
    const setMinLevel = useLogStore((state) => state.setMinLevel);
    const toggleSource = useLogStore((state) => state.toggleSource);
    const clearFilter = useLogStore((state) => state.clearFilter);
    const clearLogs = useLogStore((state) => state.clearLogs);

    const sources = useSourcesArray();
    const uniqueSourceNames = useUniqueSourceNames();

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
