/**
 * @fileoverview Log export utilities for JSON, CSV, and plain text formats
 */

import type { LogEntry, Filter } from "@logloom/shared";

export type ExportFormat = "json" | "csv" | "txt";

export interface ExportOptions {
  format: ExportFormat;
  logs: LogEntry[];
  filters: Filter;
  includeMetadata?: boolean;
}

export interface ExportMetadata {
  exportedAt: string;
  totalLogs: number;
  filters: {
    sources: string[];
    excludeSources?: string[];
    minLevel: string;
    searchText: string;
    searchMode?: string;
    timeRange?: string;
  };
}

/**
 * Export logs in the specified format and trigger download.
 */
export function exportLogs(options: ExportOptions): void {
  const { format, logs } = options;

  if (logs.length === 0) {
    alert("No logs to export. Try adjusting your filters.");
    return;
  }

  try {
    const content = generateExportContent(options);
    const blob = new Blob([content], { type: getMimeType(format) });
    const filename = generateFilename(format);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error("[LogLoom] Export failed:", error);
    alert("Export failed. Please check console for details.");
  }
}

/**
 * Generate content based on export format.
 */
function generateExportContent(options: ExportOptions): string {
  const { format, logs, filters, includeMetadata = true } = options;

  switch (format) {
    case "json":
      return generateJSONExport(logs, filters, includeMetadata);
    case "csv":
      return generateCSVExport(logs, includeMetadata);
    case "txt":
      return generateTextExport(logs, filters, includeMetadata);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate JSON export with metadata.
 */
function generateJSONExport(
  logs: LogEntry[],
  filters: Filter,
  includeMetadata: boolean
): string {
  const data: any = { logs };

  if (includeMetadata) {
    data.metadata = createMetadata(logs, filters);
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Generate CSV export.
 */
function generateCSVExport(logs: LogEntry[], includeMetadata: boolean): string {
  const lines: string[] = [];

  // Header
  if (includeMetadata) {
    lines.push(`# LogLoom Export - ${new Date().toISOString()}`);
    lines.push(`# Total Logs: ${logs.length}`);
    lines.push("");
  }

  // CSV Header
  lines.push("Timestamp,Source,Level,Content");

  // CSV Rows
  for (const log of logs) {
    const timestamp = log.timestamp;
    const source = escapeCsvField(log.source);
    const level = log.level;
    const content = escapeCsvField(log.content);

    lines.push(`${timestamp},${source},${level},${content}`);
  }

  return lines.join("\n");
}

/**
 * Generate plain text export.
 */
function generateTextExport(
  logs: LogEntry[],
  filters: Filter,
  includeMetadata: boolean
): string {
  const lines: string[] = [];

  if (includeMetadata) {
    lines.push("=".repeat(80));
    lines.push("LogLoom Export");
    lines.push("=".repeat(80));
    lines.push("");
    lines.push(`Exported At: ${new Date().toLocaleString()}`);
    lines.push(`Total Logs: ${logs.length}`);
    lines.push("");

    // Filter info
    if (filters.sources.length > 0) {
      lines.push(`Sources: ${filters.sources.join(", ")}`);
    }
    lines.push(`Min Level: ${filters.minLevel}`);
    if (filters.searchText) {
      lines.push(`Search: "${filters.searchText}"`);
    }
    lines.push("");
    lines.push("-".repeat(80));
    lines.push("");
  }

  // Log entries
  for (const log of logs) {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const line = `[${timestamp}] [${log.source}] ${log.level}: ${log.content}`;
    lines.push(line);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Create export metadata object.
 */
function createMetadata(logs: LogEntry[], filters: Filter): ExportMetadata {
  return {
    exportedAt: new Date().toISOString(),
    totalLogs: logs.length,
    filters: {
      sources: filters.sources,
      minLevel: filters.minLevel,
      searchText: filters.searchText,
    },
  };
}

/**
 * Escape CSV field (handle quotes, commas, and newlines).
 */
function escapeCsvField(field: string): string {
  // Check if field needs quoting BEFORE replacing newlines
  const needsQuoting =
    field.includes(",") || field.includes('"') || field.includes("\n");

  // Replace newlines with spaces for cleaner output
  let escaped = field.replace(/\n/g, " ");

  if (needsQuoting) {
    // Escape existing quotes by doubling them
    escaped = escaped.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Get MIME type for export format.
 */
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "json":
      return "application/json";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

/**
 * Generate filename with timestamp.
 */
function generateFilename(format: ExportFormat): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, ""); // Remove milliseconds

  return `logloom-export-${timestamp}.${format}`;
}

/**
 * Trigger file download in browser.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
