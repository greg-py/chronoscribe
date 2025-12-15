/**
 * @fileoverview Professional log entry component
 */

import { memo, useCallback, useState } from "react";
import type { LogEntry } from "@logloom/shared";
import { highlightText } from "../utils/filter";
import {
  isMultiLine,
  isStackTrace,
  parseStackTrace,
  truncateForTimeline,
} from "../utils/stackTrace";
import { formatTimestamp } from "../utils/timeUtils";
import { useLogStore } from "../hooks/useLogStore";
import {
  BookmarkIcon,
  BookmarkFilledIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "./Icons";

interface LogEntryRowProps {
  log: LogEntry;
  sourceColor: string;
  searchText: string;
}

function getLevelClass(level: string): string {
  return `log-entry__level--${level.toLowerCase()}`;
}

export const LogEntryRow = memo(function LogEntryRow({
  log,
  sourceColor,
  searchText,
}: LogEntryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const setSelectedLog = useLogStore((state) => state.setSelectedLog);
  const toggleBookmark = useLogStore((state) => state.toggleBookmark);
  const bookmarks = useLogStore((state) => state.bookmarks);
  const timeDisplayMode = useLogStore((state) => state.timeDisplayMode);
  const searchMode = useLogStore((state) => state.filter.searchMode);

  const isBookmarked = bookmarks.has(log.id);
  const multiLine = isMultiLine(log.content);
  const hasStackTrace = multiLine && isStackTrace(log.content);
  const { preview, isTruncated } = truncateForTimeline(log.content, 3);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".log-entry__bookmark") ||
        target.closest(".log-entry__expand-btn")
      ) {
        return;
      }
      setSelectedLog(log.id);
    },
    [log.id, setSelectedLog]
  );

  const handleExpandToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded]
  );

  const handleBookmarkToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleBookmark(log.id);
    },
    [log.id, toggleBookmark]
  );

  const segments = highlightText(
    isExpanded || !isTruncated ? log.content : preview,
    searchText,
    searchMode
  );
  const stackTraceLines =
    hasStackTrace && isExpanded ? parseStackTrace(log.content) : [];

  const displayTimestamp = log.originalTimestamp || log.timestamp;
  const timeDisplay = formatTimestamp(displayTimestamp, timeDisplayMode);

  return (
    <div
      className={`log-entry ${isBookmarked ? "log-entry--bookmarked" : ""}`}
      onClick={handleClick}
    >
      <button
        className={`log-entry__bookmark ${
          isBookmarked ? "log-entry__bookmark--active" : ""
        }`}
        onClick={handleBookmarkToggle}
        title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {isBookmarked ? (
          <BookmarkFilledIcon size={16} />
        ) : (
          <BookmarkIcon size={16} />
        )}
      </button>

      <div className="log-entry__time" title={timeDisplay.tooltip}>
        <span className="log-entry__time-primary">{timeDisplay.primary}</span>
        {timeDisplay.secondary && (
          <span className="log-entry__time-secondary">
            {timeDisplay.secondary}
          </span>
        )}
      </div>

      <div className="log-entry__source">
        <span
          className="log-entry__source-dot"
          style={{ backgroundColor: sourceColor }}
        />
        <span className="log-entry__source-name">{log.source}</span>
      </div>

      <span className={`log-entry__level ${getLevelClass(log.level)}`}>
        {log.level}
      </span>

      <div className="log-entry__content">
        {hasStackTrace && isExpanded ? (
          <div>
            {stackTraceLines.map((line, i) => (
              <div
                key={i}
                className={`stack-trace-line ${
                  line.isError ? "stack-trace-line--error" : ""
                } ${line.isFrame ? "stack-trace-line--frame" : ""}`}
                style={{ paddingLeft: `${line.indent * 12}px` }}
              >
                {line.text}
              </div>
            ))}
          </div>
        ) : (
          <>
            {segments.map((segment, i) =>
              segment.highlighted ? (
                <mark key={i} className="log-entry__highlight">
                  {segment.text}
                </mark>
              ) : (
                <span key={i}>{segment.text}</span>
              )
            )}
          </>
        )}
        {multiLine && (
          <button
            className="log-entry__expand-btn"
            onClick={handleExpandToggle}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon size={12} />
                Collapse
              </>
            ) : (
              <>
                <ChevronDownIcon size={12} />
                Expand
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});
