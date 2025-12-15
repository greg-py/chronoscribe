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

export function highlightText(content: string, searchText: string): TextSegment[] {
    if (!searchText) {
        return [{ text: content, highlighted: false }];
    }

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

        // Add highlighted match
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

    return segments.length > 0 ? segments : [{ text: content, highlighted: false }];
}

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(isoString: string): string {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    } catch {
        return '--:--:--.---';
    }
}
