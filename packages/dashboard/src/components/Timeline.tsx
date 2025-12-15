/**
 * @fileoverview Virtualized log timeline component
 */

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useFilteredLogs,
  useLogStore,
  useSourcesArray,
} from "../hooks/useLogStore";
import { LogEntryRow } from "./LogEntry";
import { ArrowDownIcon, TerminalIcon } from "./Icons";

// Default colors for sources
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
/**
 * Calculate update interval for relative time displays based on newest log age.
 */
function getRelativeTimeInterval(newestTimestamp: number): number {
  const ageMs = Date.now() - newestTimestamp;
  const ageSeconds = ageMs / 1000;

  if (ageSeconds < 60) return 5000; // Recent: update every 5 seconds
  if (ageSeconds < 3600) return 30000; // Within hour: every 30 seconds
  if (ageSeconds < 86400) return 60000; // Within day: every minute
  return 300000; // Older: every 5 minutes
}

export function Timeline() {
  const logs = useFilteredLogs();
  const sources = useSourcesArray();
  const filter = useLogStore((state) => state.filter);
  const isPaused = useLogStore((state) => state.isPaused);
  const setPaused = useLogStore((state) => state.setPaused);
  const timeDisplayMode = useLogStore((state) => state.timeDisplayMode);

  const parentRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef(true);

  // State to trigger re-renders for relative time updates
  const [, setTimeTick] = useState(0);

  // Find newest visible log for determining update frequency
  const newestTimestamp = useMemo(() => {
    if (logs.length === 0) return null;
    // Get the timestamp of the most recent log
    const lastLog = logs[logs.length - 1];
    return new Date(lastLog.originalTimestamp || lastLog.timestamp).getTime();
  }, [logs]);

  // Auto-update relative time displays
  useEffect(() => {
    // Only run timer if showing relative times and we have logs
    if (timeDisplayMode === "absolute" || !newestTimestamp) {
      return;
    }

    const interval = getRelativeTimeInterval(newestTimestamp);

    const timer = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [timeDisplayMode, newestTimestamp]);

  // Build color map
  const sourceColorMap = new Map<string, string>();
  sources.forEach((source) => {
    sourceColorMap.set(source.name, source.color);
  });

  // Get color for a source name
  const getSourceColor = useCallback(
    (sourceName: string) => {
      const color = sourceColorMap.get(sourceName);
      if (color) return color;

      // Fallback to hash-based color
      const allNames = [...new Set(logs.map((l) => l.source))];
      const index = allNames.indexOf(sourceName);
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? "#60A5FA";
    },
    [sourceColorMap, logs]
  );

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Estimated row height
    overscan: 20,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollEndRef.current && !isPaused && logs.length > 0) {
      virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
    }
  }, [logs.length, virtualizer, isPaused]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;

    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    scrollEndRef.current = atBottom;

    if (!atBottom && !isPaused) {
      setPaused(true);
    } else if (atBottom && isPaused) {
      setPaused(false);
    }
  }, [isPaused, setPaused]);

  // Resume auto-scroll
  const handleResumeScroll = useCallback(() => {
    setPaused(false);
    scrollEndRef.current = true;
    if (logs.length > 0) {
      virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
    }
  }, [logs.length, virtualizer, setPaused]);

  if (logs.length === 0) {
    return (
      <div className="timeline">
        <div className="timeline__empty">
          <div className="timeline__empty-icon">
            <TerminalIcon size={48} />
          </div>
          <h2 className="timeline__empty-title">No logs yet</h2>
          <p className="timeline__empty-text">Connect a source with:</p>
          <code className="timeline__empty-code">
            npm start | npx logloom --name myapp
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div
        ref={parentRef}
        className="timeline__container"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const log = logs[virtualItem.index];
            if (!log) return null;

            return (
              <div
                key={log.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <LogEntryRow
                  log={log}
                  sourceColor={getSourceColor(log.source)}
                  searchText={filter.searchText}
                />
              </div>
            );
          })}
        </div>
      </div>

      {isPaused && (
        <button className="timeline__resume-btn" onClick={handleResumeScroll}>
          <ArrowDownIcon size={14} />
          Resume auto-scroll
        </button>
      )}
    </div>
  );
}
