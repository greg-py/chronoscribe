/**
 * @fileoverview Zustand store for log management
 *
 * Manages log entries, sources, filters, and alerts with efficient
 * updates and memoized selectors.
 */

import { create } from "zustand";
import {
  type LogEntry,
  type Source,
  type Filter,
  type AlertConfig,
  type TimeRangeFilter,
  type Bookmark,
  LogLevel,
  LOG_LEVEL_PRIORITY,
  DEFAULT_FILTER,
  DEFAULT_ALERT_CONFIG,
  MAX_LOG_ENTRIES,
} from "@logloom/shared";
import type { PatternGroup } from "../utils/patternUtils";
import type { TimeDisplayMode } from "../utils/timeUtils";
import { detectPattern } from "../utils/patternUtils";
import { parseTimestamp } from "../utils/timeUtils";

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
  showBookmarksOnly: boolean;
  timeDisplayMode: TimeDisplayMode;

  // Bookmarks
  bookmarks: Map<string, Bookmark>;

  // Patterns
  patterns: Map<string, PatternGroup>;
  patternDetectionEnabled: boolean;
  patternMinOccurrences: number;

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
  setSearchMode: (mode: "text" | "regex") => void;
  setSourceFilterMode: (mode: "any" | "all") => void;
  setTimeRange: (range: Partial<TimeRangeFilter>) => void;
  clearFilter: () => void;

  setAlertConfig: (config: Partial<AlertConfig>) => void;

  setPaused: (paused: boolean) => void;

  setSelectedLog: (logId: string | null) => void;
  selectNextLog: () => void;
  selectPreviousLog: () => void;

  // Bookmark actions
  addBookmark: (logId: string, note?: string) => void;
  removeBookmark: (logId: string) => void;
  updateBookmark: (logId: string, updates: Partial<Bookmark>) => void;
  toggleBookmark: (logId: string) => void;
  getBookmark: (logId: string) => Bookmark | undefined;
  setShowBookmarksOnly: (show: boolean) => void;

  // Pattern actions
  setPatternDetection: (enabled: boolean) => void;
  setPatternMinOccurrences: (count: number) => void;
  refreshPatterns: () => void;

  // Time display
  setTimeDisplayMode: (mode: TimeDisplayMode) => void;
}

/**
 * Load bookmarks from localStorage.
 */
function loadBookmarksFromStorage(): Map<string, Bookmark> {
  try {
    const stored = localStorage.getItem("logloom:bookmarks");
    if (stored) {
      const parsed = JSON.parse(stored) as Array<[string, Bookmark]>;
      return new Map(parsed);
    }
  } catch (e) {
    console.error("Failed to load bookmarks from localStorage:", e);
  }
  return new Map();
}

/**
 * Save bookmarks to localStorage.
 */
function saveBookmarksToStorage(bookmarks: Map<string, Bookmark>): void {
  try {
    const bookmarksArray = Array.from(bookmarks.entries());
    localStorage.setItem("logloom:bookmarks", JSON.stringify(bookmarksArray));
  } catch (e) {
    console.error("Failed to save bookmarks:", e);
  }
}

/**
 * Process a log entry to parse timestamps from content.
 */
function processLogEntry(log: LogEntry): LogEntry {
  const parsed = parseTimestamp(log.content);
  if (parsed.found) {
    return {
      ...log,
      originalTimestamp: parsed.timestamp!.toISOString(),
      timestampFormat: parsed.format!,
      content: parsed.remainder || log.content,
    };
  }
  return log;
}

/**
 * Clean up bookmarks that reference non-existent logs.
 */
function cleanupOrphanedBookmarks(
  bookmarks: Map<string, Bookmark>,
  logIds: Set<string>
): Map<string, Bookmark> {
  const cleaned = new Map<string, Bookmark>();
  for (const [logId, bookmark] of bookmarks) {
    if (logIds.has(logId)) {
      cleaned.set(logId, bookmark);
    }
  }
  return cleaned;
}

/**
 * Get filtered logs based on current filter state.
 * This is a pure function used internally by the store.
 */
function getFilteredLogsFromState(state: {
  logs: LogEntry[];
  filter: Filter;
  bookmarks: Map<string, Bookmark>;
  showBookmarksOnly: boolean;
}): LogEntry[] {
  const { logs, filter, bookmarks, showBookmarksOnly } = state;

  return logs.filter((log) => {
    // Bookmark filter
    if (showBookmarksOnly && !bookmarks.has(log.id)) {
      return false;
    }

    // Time range filter
    if (filter.timeRange.enabled) {
      const logTime = new Date(log.timestamp).getTime();
      const now = Date.now();

      if (filter.timeRange.type === "relative" && filter.timeRange.last) {
        const cutoff = now - filter.timeRange.last * 60 * 1000;
        if (logTime < cutoff) return false;
      }

      if (filter.timeRange.type === "absolute") {
        if (
          filter.timeRange.start &&
          logTime < new Date(filter.timeRange.start).getTime()
        ) {
          return false;
        }
        if (
          filter.timeRange.end &&
          logTime > new Date(filter.timeRange.end).getTime()
        ) {
          return false;
        }
      }
    }

    // Exclude sources filter
    if (filter.excludeSources.includes(log.source)) {
      return false;
    }

    // Include sources filter
    if (filter.sources.length > 0) {
      const matchesInclude = filter.sources.includes(log.source);
      if (!matchesInclude) return false;
    }

    // Filter by level
    const logPriority = LOG_LEVEL_PRIORITY[log.level];
    const minPriority = LOG_LEVEL_PRIORITY[filter.minLevel];
    if (logPriority < minPriority) {
      return false;
    }

    // Search with regex support
    if (filter.searchText) {
      if (filter.searchMode === "regex") {
        try {
          const regex = new RegExp(filter.searchText, "i");
          if (!regex.test(log.content)) return false;
        } catch {
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

    // Legacy regex filter
    if (filter.regex) {
      try {
        const regex = new RegExp(filter.regex, "i");
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
  showBookmarksOnly: false,
  timeDisplayMode: "absolute",
  bookmarks: loadBookmarksFromStorage(), // Load from localStorage on init
  patterns: new Map(),
  patternDetectionEnabled: false,
  patternMinOccurrences: 3,

  // Log actions
  addLog: (log) => {
    set((state) => {
      const enhancedLog = processLogEntry(log);
      const newLogs = [...state.logs, enhancedLog];

      // Trim to max size and clean up orphaned bookmarks
      if (newLogs.length > MAX_LOG_ENTRIES) {
        const removedCount = newLogs.length - MAX_LOG_ENTRIES;
        newLogs.splice(0, removedCount);

        // Clean up bookmarks for removed logs
        const remainingLogIds = new Set(newLogs.map((l) => l.id));
        const cleanedBookmarks = cleanupOrphanedBookmarks(
          state.bookmarks,
          remainingLogIds
        );
        if (cleanedBookmarks.size !== state.bookmarks.size) {
          saveBookmarksToStorage(cleanedBookmarks);
          return { logs: newLogs, bookmarks: cleanedBookmarks };
        }
      }
      return { logs: newLogs };
    });
  },

  addLogs: (logs) => {
    set((state) => {
      // Process each log to parse timestamps (same as addLog)
      const processedLogs = logs.map(processLogEntry);
      const newLogs = [...state.logs, ...processedLogs];

      // Trim to max size and clean up orphaned bookmarks
      if (newLogs.length > MAX_LOG_ENTRIES) {
        const removedCount = newLogs.length - MAX_LOG_ENTRIES;
        newLogs.splice(0, removedCount);

        // Clean up bookmarks for removed logs
        const remainingLogIds = new Set(newLogs.map((l) => l.id));
        const cleanedBookmarks = cleanupOrphanedBookmarks(
          state.bookmarks,
          remainingLogIds
        );
        if (cleanedBookmarks.size !== state.bookmarks.size) {
          saveBookmarksToStorage(cleanedBookmarks);
          return { logs: newLogs, bookmarks: cleanedBookmarks };
        }
      }
      return { logs: newLogs };
    });
  },

  clearLogs: () => {
    // Clear bookmarks when logs are cleared since they're now orphaned
    saveBookmarksToStorage(new Map());
    set({ logs: [], bookmarks: new Map() });
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
    const { selectedLogId } = state;
    // Use filtered logs for navigation so we only navigate through visible logs
    const filteredLogs = getFilteredLogsFromState(state);
    if (filteredLogs.length === 0) return;

    if (!selectedLogId) {
      set({ selectedLogId: filteredLogs[0]?.id || null });
      return;
    }

    const currentIndex = filteredLogs.findIndex(
      (log) => log.id === selectedLogId
    );
    if (currentIndex === -1) {
      // Selected log not in filtered view, select first filtered log
      set({ selectedLogId: filteredLogs[0]?.id || null });
    } else if (currentIndex < filteredLogs.length - 1) {
      set({ selectedLogId: filteredLogs[currentIndex + 1]?.id || null });
    }
  },

  selectPreviousLog: () => {
    const state = get();
    const { selectedLogId } = state;
    // Use filtered logs for navigation so we only navigate through visible logs
    const filteredLogs = getFilteredLogsFromState(state);
    if (filteredLogs.length === 0) return;

    if (!selectedLogId) {
      set({ selectedLogId: filteredLogs[filteredLogs.length - 1]?.id || null });
      return;
    }

    const currentIndex = filteredLogs.findIndex(
      (log) => log.id === selectedLogId
    );
    if (currentIndex === -1) {
      // Selected log not in filtered view, select last filtered log
      set({ selectedLogId: filteredLogs[filteredLogs.length - 1]?.id || null });
    } else if (currentIndex > 0) {
      set({ selectedLogId: filteredLogs[currentIndex - 1]?.id || null });
    }
  },

  // Bookmark actions
  addBookmark: (logId, note = "") => {
    const bookmark: Bookmark = {
      logId,
      note,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const newBookmarks = new Map(state.bookmarks);
      newBookmarks.set(logId, bookmark);
      saveBookmarksToStorage(newBookmarks);
      return { bookmarks: newBookmarks };
    });
  },

  removeBookmark: (logId) => {
    set((state) => {
      const newBookmarks = new Map(state.bookmarks);
      newBookmarks.delete(logId);
      saveBookmarksToStorage(newBookmarks);
      return { bookmarks: newBookmarks };
    });
  },

  updateBookmark: (logId, updates) => {
    set((state) => {
      const existing = state.bookmarks.get(logId);
      if (!existing) return state;

      const newBookmarks = new Map(state.bookmarks);
      newBookmarks.set(logId, { ...existing, ...updates });
      saveBookmarksToStorage(newBookmarks);
      return { bookmarks: newBookmarks };
    });
  },

  toggleBookmark: (logId) => {
    const state = get();
    if (state.bookmarks.has(logId)) {
      state.removeBookmark(logId);
    } else {
      state.addBookmark(logId);
    }
  },

  getBookmark: (logId) => {
    return get().bookmarks.get(logId);
  },

  setShowBookmarksOnly: (show) => {
    set({ showBookmarksOnly: show });
  },

  // Pattern actions
  setPatternDetection: (enabled) => {
    set({ patternDetectionEnabled: enabled });
    if (enabled) {
      get().refreshPatterns();
    }
  },

  setPatternMinOccurrences: (count) => {
    set({ patternMinOccurrences: count });
    get().refreshPatterns();
  },

  refreshPatterns: () => {
    const state = get();
    if (!state.patternDetectionEnabled) {
      set({ patterns: new Map() });
      return;
    }

    const patterns = new Map<string, PatternGroup>();

    for (const log of state.logs) {
      const pattern = detectPattern(log.content);

      const existing = patterns.get(pattern);
      if (existing) {
        existing.count++;
        existing.lastSeen = log.timestamp;
        existing.logIds.push(log.id);
        existing.sources.add(log.source);

        // Update severity to highest
        const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        if (levels[log.level] > levels[existing.severity]) {
          existing.severity = log.level;
        }
      } else {
        patterns.set(pattern, {
          id: `pattern-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          pattern,
          count: 1,
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          logIds: [log.id],
          severity: log.level,
          sources: new Set([log.source]),
        });
      }
    }

    // Filter by min occurrences
    const filtered = new Map<string, PatternGroup>();
    for (const [pattern, group] of patterns.entries()) {
      if (group.count >= state.patternMinOccurrences) {
        filtered.set(pattern, group);
      }
    }

    set({ patterns: filtered });
  },

  // Time display
  setTimeDisplayMode: (mode) => {
    set({ timeDisplayMode: mode });
  },
}));

/**
 * Selector: Get filtered logs.
 */
export function useFilteredLogs(): LogEntry[] {
  const logs = useLogStore((state) => state.logs);
  const filter = useLogStore((state) => state.filter);
  const bookmarks = useLogStore((state) => state.bookmarks);
  const showBookmarksOnly = useLogStore((state) => state.showBookmarksOnly);

  return getFilteredLogsFromState({
    logs,
    filter,
    bookmarks,
    showBookmarksOnly,
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
  return logs.find((log) => log.id === selectedLogId) || null;
}
