/**
 * @fileoverview Professional log details panel
 */

import { useCallback, useEffect } from "react";
import type { LogEntry } from "@chronoscribe/shared";
import { formatDetailTimestamp } from "../utils/timeUtils";
import { useLogStore } from "../hooks/useLogStore";
import {
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckCircleIcon,
} from "./Icons";
import { useState } from "react";

interface LogDetailsPanelProps {
  log: LogEntry;
  onClose: () => void;
}

export function LogDetailsPanel({ log, onClose }: LogDetailsPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const selectNextLog = useLogStore((state) => state.selectNextLog);
  const selectPreviousLog = useLogStore((state) => state.selectPreviousLog);
  const logs = useLogStore((state) => state.logs);

  const currentIndex = logs.findIndex((l) => l.id === log.id);
  const hasNext = currentIndex < logs.length - 1;
  const hasPrev = currentIndex > 0;

  const copyToClipboard = useCallback(async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown" && hasNext) {
        selectNextLog();
      } else if (e.key === "ArrowUp" && hasPrev) {
        selectPreviousLog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hasNext, hasPrev, selectNextLog, selectPreviousLog]);

  // Try to parse JSON
  let jsonContent = null;
  try {
    const parsed = JSON.parse(log.content);
    if (typeof parsed === "object" && parsed !== null) {
      jsonContent = JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="details-panel">
        <div className="details-panel__header">
          <h2 className="details-panel__title">Log Details</h2>
          <button
            className="details-panel__close"
            onClick={onClose}
            title="Close (Esc)"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="details-panel__content">
          {/* Metadata Section */}
          <section className="details-panel__section">
            <h3 className="details-panel__section-title">Metadata</h3>
            <div className="details-panel__metadata">
              <div className="details-panel__metadata-row">
                <span className="details-panel__metadata-label">Timestamp</span>
                <span className="details-panel__metadata-value">
                  {formatDetailTimestamp(log.timestamp)}
                </span>
              </div>
              {log.originalTimestamp && (
                <div className="details-panel__metadata-row">
                  <span className="details-panel__metadata-label">
                    Original Time
                  </span>
                  <span className="details-panel__metadata-value">
                    {formatDetailTimestamp(log.originalTimestamp)}
                    {log.timestampFormat && ` (${log.timestampFormat})`}
                  </span>
                </div>
              )}
              <div className="details-panel__metadata-row">
                <span className="details-panel__metadata-label">Source</span>
                <span className="details-panel__metadata-value">
                  {log.source}
                </span>
              </div>
              <div className="details-panel__metadata-row">
                <span className="details-panel__metadata-label">Level</span>
                <span className="details-panel__metadata-value">
                  {log.level}
                </span>
              </div>
              <div className="details-panel__metadata-row">
                <span className="details-panel__metadata-label">Log ID</span>
                <span className="details-panel__metadata-value">{log.id}</span>
              </div>
            </div>
          </section>

          {/* Content Section */}
          <section className="details-panel__section">
            <div className="details-panel__section-actions">
              <h3 className="details-panel__section-title">Content</h3>
              <button
                className="details-panel__copy-btn"
                onClick={() => copyToClipboard(log.content, "content")}
                title="Copy content"
              >
                {copiedSection === "content" ? (
                  <>
                    <CheckCircleIcon size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="details-panel__code-block">
              {jsonContent || log.content}
            </div>
          </section>

          {/* Raw Log Section */}
          <section className="details-panel__section">
            <div className="details-panel__section-actions">
              <h3 className="details-panel__section-title">Raw Log</h3>
              <button
                className="details-panel__copy-btn"
                onClick={() => copyToClipboard(log.raw, "raw")}
                title="Copy raw log"
              >
                {copiedSection === "raw" ? (
                  <>
                    <CheckCircleIcon size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="details-panel__code-block">{log.raw}</div>
          </section>
        </div>

        <div className="details-panel__footer">
          <button
            className="details-panel__nav-btn"
            onClick={selectPreviousLog}
            disabled={!hasPrev}
            title="Previous log (↑)"
          >
            <ChevronLeftIcon size={16} />
            Previous
          </button>
          <span className="details-panel__position">
            {currentIndex + 1} of {logs.length}
          </span>
          <button
            className="details-panel__nav-btn"
            onClick={selectNextLog}
            disabled={!hasNext}
            title="Next log (↓)"
          >
            Next
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
