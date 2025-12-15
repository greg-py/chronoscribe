/**
 * @fileoverview Stack trace detection and formatting utilities
 */

export interface StackTraceLine {
  text: string;
  indent: number;
  isError: boolean;
  isFrame: boolean;
}

/**
 * Detect if content contains a stack trace.
 */
export function isStackTrace(content: string): boolean {
  const lines = content.split('\n');
  if (lines.length < 2) return false;

  // Check for common stack trace patterns
  const stackTracePatterns = [
    /^\s*at\s+/,                          // JavaScript: "at functionName"
    /^\s*at\s+.*\(.*:\d+:\d+\)/,          // JavaScript with location
    /^\s*File\s+".*",\s+line\s+\d+/,      // Python
    /Exception|Error:/,                    // Generic error/exception
    /Traceback|Stack trace:/i,             // Explicit trace indicators
    /^\s+at\s+[\w.$]+\(/,                 // Java stack frames
  ];

  let matchCount = 0;
  for (const line of lines) {
    if (stackTracePatterns.some(pattern => pattern.test(line))) {
      matchCount++;
    }
  }

  // If at least 2 lines match stack trace patterns, consider it a stack trace
  return matchCount >= 2;
}

/**
 * Check if content is multiple lines.
 */
export function isMultiLine(content: string): boolean {
  return content.includes('\n') && content.split('\n').length > 1;
}

/**
 * Parse stack trace into structured lines.
 */
export function parseStackTrace(content: string): StackTraceLine[] {
  const lines = content.split('\n');
  const parsed: StackTraceLine[] = [];

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Detect indent level
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Check if this is an error/exception line
    const isError = /^(Error|Exception|TypeError|ReferenceError|SyntaxError|.*Error):/i.test(trimmed);

    // Check if this is a stack frame
    const isFrame = /^\s*at\s+/.test(line) || 
                    /^\s*File\s+"/.test(line) ||
                    /^\s+at\s+[\w.$]+\(/.test(line);

    parsed.push({
      text: trimmed,
      indent: Math.floor(indent / 2), // Normalize indent
      isError,
      isFrame,
    });
  }

  return parsed;
}

/**
 * Try to parse content as JSON.
 */
export function tryParseJSON(content: string): { success: boolean; data?: any; formatted?: string } {
  const trimmed = content.trim();
  
  // Quick check if it looks like JSON
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return { success: false };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const formatted = JSON.stringify(parsed, null, 2);
    return { success: true, data: parsed, formatted };
  } catch {
    return { success: false };
  }
}

/**
 * Format timestamp for display.
 */
export function formatDetailTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * Truncate content for timeline display.
 */
export function truncateForTimeline(content: string, maxLines: number = 3): { preview: string; isTruncated: boolean } {
  const lines = content.split('\n');
  
  if (lines.length <= maxLines) {
    return { preview: content, isTruncated: false };
  }

  const preview = lines.slice(0, maxLines).join('\n');
  return { preview, isTruncated: true };
}
