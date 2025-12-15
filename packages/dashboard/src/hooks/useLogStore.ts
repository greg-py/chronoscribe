/**
 * @fileoverview Zustand store for log management
 * 
 * Manages log entries, sources, filters, and alerts with efficient
 * updates and memoized selectors.
 */

import { create } from 'zustand';
import {
    type LogEntry,
    type Source,
    type Filter,
    type AlertConfig,
    type TimeRangeFilter,
    LogLevel,
    LOG_LEVEL_PRIORITY,
    DEFAULT_FILTER,
    DEFAULT_ALERT_CONFIG,
    MAX_LOG_ENTRIES,
} from '@logloom/shared';

/**
 * Store state interface.
 */
interface LogStoreState {
    // Data
    logs: LogEntry[];
    sources: Map<string, Source>;

    // UI state
    filter: Filter;
    alertConfig: AlertConfig;
    isPaused: boolean;
    selectedLogId: string | null;

    // Actions
    addLog: (log: LogEntry) => void;
    addLogs: (logs: LogEntry[]) => void;
    clearLogs: () => void;

    addSource: (source: Source) => void;
    removeSource: (sourceId: string) => void;
    setSources: (sources: Source[]) => void;

    setFilter: (filter: Partial<Filter>) => void;
    toggleSource: (sourceName: string) => void;
    toggleExcludeSource: (sourceName: string) => void;
    setMinLevel: (level: LogLevel) => void;
    setSearchText: (text: string) => void;
    setSearchMode: (mode: 'text' | 'regex') => void;
    setSourceFilterMode: (mode: 'any' | 'all') => void;
    setTimeRange: (range: Partial<TimeRangeFilter>) => void;
    clearFilter: () => void;

    setAlertConfig: (config: Partial<AlertConfig>) => void;

    setPaused: (paused: boolean) => void;

    setSelectedLog: (logId: string | null) => void;
    selectNextLog: () => void;
    selectPreviousLog: () => void;
}

/**
 * Create the log store.
 */
export const useLogStore = create<LogStoreState>((set, get) => ({
    // Initial state
    logs: [],
    sources: new Map(),
    filter: DEFAULT_FILTER,
    alertConfig: DEFAULT_ALERT_CONFIG,
    isPaused: false,
    selectedLogId: null,

    // Log actions
    addLog: (log) => {
        set((state) => {
            const newLogs = [...state.logs, log];
            // Trim to max size
            if (newLogs.length > MAX_LOG_ENTRIES) {
                newLogs.splice(0, newLogs.length - MAX_LOG_ENTRIES);
            }
            return { logs: newLogs };
        });
    },

    addLogs: (logs) => {
        set((state) => {
            const newLogs = [...state.logs, ...logs];
            // Trim to max size
            if (newLogs.length > MAX_LOG_ENTRIES) {
                newLogs.splice(0, newLogs.length - MAX_LOG_ENTRIES);
            }
            return { logs: newLogs };
        });
    },

    clearLogs: () => {
        set({ logs: [] });
    },

    // Source actions
    addSource: (source) => {
        set((state) => {
            const newSources = new Map(state.sources);
            newSources.set(source.id, source);
            return { sources: newSources };
        });
    },

    removeSource: (sourceId) => {
        set((state) => {
            const newSources = new Map(state.sources);
            const source = newSources.get(sourceId);
            if (source) {
                // Mark as disconnected instead of removing
                newSources.set(sourceId, { ...source, connected: false });
            }
            return { sources: newSources };
        });
    },

    setSources: (sources) => {
        set({
            sources: new Map(sources.map((s) => [s.id, s])),
        });
    },

    // Filter actions
    setFilter: (filter) => {
        set((state) => ({
            filter: { ...state.filter, ...filter },
        }));
    },

    toggleSource: (sourceName) => {
        set((state) => {
            const currentSources = state.filter.sources;
            const newSources = currentSources.includes(sourceName)
                ? currentSources.filter((s) => s !== sourceName)
                : [...currentSources, sourceName];
            return {
                filter: { ...state.filter, sources: newSources },
            };
        });
    },

    setMinLevel: (level) => {
        set((state) => ({
            filter: { ...state.filter, minLevel: level },
        }));
    },

    setSearchText: (text) => {
        set((state) => ({
            filter: { ...state.filter, searchText: text },
        }));
    },

    setSearchMode: (mode) => {
        set((state) => ({
            filter: { ...state.filter, searchMode: mode },
        }));
    },

    setSourceFilterMode: (mode) => {
        set((state) => ({
            filter: { ...state.filter, sourceFilterMode: mode },
        }));
    },

    toggleExcludeSource: (sourceName) => {
        set((state) => {
            const current = state.filter.excludeSources;
            const newExcludeSources = current.includes(sourceName)
                ? current.filter((s) => s !== sourceName)
                : [...current, sourceName];
            return {
                filter: { ...state.filter, excludeSources: newExcludeSources },
            };
        });
    },

    setTimeRange: (range) => {
        set((state) => ({
            filter: {
                ...state.filter,
                timeRange: { ...state.filter.timeRange, ...range },
            },
        }));
    },

    clearFilter: () => {
        set({ filter: DEFAULT_FILTER });
    },

    // Alert actions
    setAlertConfig: (config) => {
        set((state) => ({
            alertConfig: { ...state.alertConfig, ...config },
        }));
    },

    // Pause actions
    setPaused: (paused) => {
        set({ isPaused: paused });
    },

    // Selection actions
    setSelectedLog: (logId) => {
        set({ selectedLogId: logId });
    },

    selectNextLog: () => {
        const state = get();
        const { logs, selectedLogId } = state;
        if (logs.length === 0) return;

        if (!selectedLogId) {
            set({ selectedLogId: logs[0]?.id || null });
            return;
        }

        const currentIndex = logs.findIndex(log => log.id === selectedLogId);
        if (currentIndex < logs.length - 1) {
            set({ selectedLogId: logs[currentIndex + 1]?.id || null });
        }
    },

    selectPreviousLog: () => {
        const state = get();
        const { logs, selectedLogId } = state;
        if (logs.length === 0) return;

        if (!selectedLogId) {
            set({ selectedLogId: logs[logs.length - 1]?.id || null });
            return;
        }

        const currentIndex = logs.findIndex(log => log.id === selectedLogId);
        if (currentIndex > 0) {
            set({ selectedLogId: logs[currentIndex - 1]?.id || null });
        }
    },
}));

/**
 * Selector: Get filtered logs.
 */
export function useFilteredLogs(): LogEntry[] {
    const logs = useLogStore((state) => state.logs);
    const filter = useLogStore((state) => state.filter);

    return logs.filter((log) => {
        // Time range filter (NEW)
        if (filter.timeRange.enabled) {
            const logTime = new Date(log.timestamp).getTime();
            const now = Date.now();

            if (filter.timeRange.type === 'relative' && filter.timeRange.last) {
                const cutoff = now - (filter.timeRange.last * 60 * 1000);
                if (logTime < cutoff) return false;
            }

            if (filter.timeRange.type === 'absolute') {
                if (filter.timeRange.start && logTime < new Date(filter.timeRange.start).getTime()) {
                    return false;
                }
                if (filter.timeRange.end && logTime > new Date(filter.timeRange.end).getTime()) {
                    return false;
                }
            }
        }

        // Exclude sources filter (NEW)
        if (filter.excludeSources.includes(log.source)) {
            return false;
        }

        // Include sources filter (ENHANCED with ANY/ALL logic)
        if (filter.sources.length > 0) {
            // For 'any' mode, log must match at least one source
            // For 'all' mode, we treat it as single-source filter (since a log can only have one source)
            const matchesInclude = filter.sources.includes(log.source);
            if (!matchesInclude) return false;
        }

        // Filter by level
        const logPriority = LOG_LEVEL_PRIORITY[log.level];
        const minPriority = LOG_LEVEL_PRIORITY[filter.minLevel];
        if (logPriority < minPriority) {
            return false;
        }

        // Search with regex support (ENHANCED)
        if (filter.searchText) {
            if (filter.searchMode === 'regex') {
                try {
                    const regex = new RegExp(filter.searchText, 'i');
                    if (!regex.test(log.content)) return false;
                } catch {
                    // Invalid regex, fall back to text search
                    const searchLower = filter.searchText.toLowerCase();
                    if (!log.content.toLowerCase().includes(searchLower)) {
                        return false;
                    }
                }
            } else {
                const searchLower = filter.searchText.toLowerCase();
                if (!log.content.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
        }

        // Legacy regex filter (keep for backwards compatibility with alerts)
        if (filter.regex) {
            try {
                const regex = new RegExp(filter.regex, 'i');
                if (!regex.test(log.content)) {
                    return false;
                }
            } catch {
                // Invalid regex, skip filtering
            }
        }

        return true;
    });
}

/**
 * Selector: Get connected sources as array.
 */
export function useSourcesArray(): Source[] {
    const sources = useLogStore((state) => state.sources);
    return Array.from(sources.values());
}

/**
 * Selector: Get unique source names from logs.
 */
export function useUniqueSourceNames(): string[] {
    const logs = useLogStore((state) => state.logs);
    return [...new Set(logs.map((log) => log.source))];
}

/**
 * Selector: Get selected log entry.
 */
export function useSelectedLog(): LogEntry | null {
    const logs = useLogStore((state) => state.logs);
    const selectedLogId = useLogStore((state) => state.selectedLogId);
    return logs.find(log => log.id === selectedLogId) || null;
}
