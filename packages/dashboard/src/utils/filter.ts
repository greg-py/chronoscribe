/**
 * @fileoverview Filter utilities for log searching and highlighting
 */

/**
 * Highlight matching text in content.
 * Returns an array of segments with highlighted flag.
 */
export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Highlight matching text in content.
 * Supports both plain text (case-insensitive) and regex modes.
 */
export function highlightText(
  content: string,
  searchText: string,
  searchMode: "text" | "regex" = "text"
): TextSegment[] {
  if (!searchText) {
    return [{ text: content, highlighted: false }];
  }

  // Try regex mode
  if (searchMode === "regex") {
    try {
      return highlightWithRegex(content, searchText);
    } catch {
      // Invalid regex, fall back to text mode
      return highlightWithText(content, searchText);
    }
  }

  return highlightWithText(content, searchText);
}

/**
 * Highlight using regex matching.
 */
function highlightWithRegex(content: string, pattern: string): TextSegment[] {
  const regex = new RegExp(pattern, "gi");
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Prevent infinite loop on zero-width matches
    if (match.index === lastIndex && match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }

    // Add non-highlighted segment before match
    if (match.index > lastIndex) {
      segments.push({
        text: content.slice(lastIndex, match.index),
        highlighted: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: match[0],
      highlighted: true,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining non-highlighted text
  if (lastIndex < content.length) {
    segments.push({
      text: content.slice(lastIndex),
      highlighted: false,
    });
  }

  return segments.length > 0
    ? segments
    : [{ text: content, highlighted: false }];
}

/**
 * Highlight using plain text matching (case-insensitive).
 */
function highlightWithText(content: string, searchText: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const searchLower = searchText.toLowerCase();
  const contentLower = content.toLowerCase();

  let lastIndex = 0;
  let index = contentLower.indexOf(searchLower);

  while (index !== -1) {
    // Add non-highlighted segment before match
    if (index > lastIndex) {
      segments.push({
        text: content.slice(lastIndex, index),
        highlighted: false,
      });
    }

    // Add highlighted match (use original case from content)
    segments.push({
      text: content.slice(index, index + searchText.length),
      highlighted: true,
    });

    lastIndex = index + searchText.length;
    index = contentLower.indexOf(searchLower, lastIndex);
  }

  // Add remaining non-highlighted text
  if (lastIndex < content.length) {
    segments.push({
      text: content.slice(lastIndex),
      highlighted: false,
    });
  }

  return segments.length > 0
    ? segments
    : [{ text: content, highlighted: false }];
}

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return "--:--:--.---";
  }
}
