/**
 * @fileoverview Log pattern detection and grouping utilities
 */

import type { LogEntry, LogLevel } from '@logloom/shared';

export interface PatternGroup {
    id: string;
    pattern: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    logIds: string[];
    severity: LogLevel;
    sources: Set<string>;
}

/**
 * Normalize log content into a pattern by replacing variable parts.
 */
export function detectPattern(content: string): string {
    let pattern = content;

    // Replace UUIDs with {UUID}
    pattern = pattern.replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '{UUID}'
    );

    // Replace hex values with {HEX}
    pattern = pattern.replace(/0x[0-9a-f]+/gi, '{HEX}');

    // Replace IP addresses with {IP}
    pattern = pattern.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '{IP}');

    // Replace numbers (but preserve common log level numbers)
    pattern = pattern.replace(/\b\d+\b/g, (match) => {
        // Keep small numbers that might be log levels
        const num = parseInt(match, 10);
        if (num >= 100 && num <= 500) return match; // HTTP status codes
        return '{N}';
    });

    // Replace ISO timestamps with {TIME}
    pattern = pattern.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g, '{TIME}');

    // Replace common timestamp formats
    pattern = pattern.replace(/\d{2}:\d{2}:\d{2}(?:\.\d{3})?/g, '{TIME}');

    // Replace file paths with {PATH}
    pattern = pattern.replace(/\/[\w\/.-]+\.\w+/g, '{PATH}');
    pattern = pattern.replace(/[A-Z]:\\[\w\\.-]+\.\w+/g, '{PATH}'); // Windows paths

    // Replace quoted strings with {STR}
    pattern = pattern.replace(/"[^"]+"/g, '{STR}');
    pattern = pattern.replace(/'[^']+'/g, '{STR}');

    // Replace durations with {DUR}
    pattern = pattern.replace(/\d+(?:ms|s|m|h|d)/g, '{DUR}');

    // Replace memory/size values with {SIZE}
    pattern = pattern.replace(/\d+(?:B|KB|MB|GB|TB)/gi, '{SIZE}');

    // Replace URLs with {URL}
    pattern = pattern.replace(/https?:\/\/[^\s]+/g, '{URL}');

    // Normalize whitespace
    pattern = pattern.replace(/\s+/g, ' ').trim();

    return pattern;
}

/**
 * Calculate similarity between two strings (0-1).
 * Uses Jaccard similarity on word sets.
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Group logs by detected patterns.
 * Returns map of pattern -> PatternGroup.
 */
export function groupLogsByPattern(
    logs: LogEntry[],
    minOccurrences: number = 3
): Map<string, PatternGroup> {
    const patterns = new Map<string, PatternGroup>();

    for (const log of logs) {
        const pattern = detectPattern(log.content);

        const existing = patterns.get(pattern);
        if (existing) {
            existing.count++;
            existing.lastSeen = log.timestamp;
            existing.logIds.push(log.id);
            existing.sources.add(log.source);

            // Update severity to highest
            if (getSeverityLevel(log.level) > getSeverityLevel(existing.severity)) {
                existing.severity = log.level;
            }
        } else {
            patterns.set(pattern, {
                id: generatePatternId(pattern),
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

    // Filter out patterns below threshold
    const filtered = new Map<string, PatternGroup>();
    for (const [pattern, group] of patterns.entries()) {
        if (group.count >= minOccurrences) {
            filtered.set(pattern, group);
        }
    }

    return filtered;
}

/**
 * Get severity as number for comparison.
 */
function getSeverityLevel(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
    };
    return levels[level] ?? 0;
}

/**
 * Generate a deterministic ID from pattern.
 */
function generatePatternId(pattern: string): string {
    // Simple hash for pattern ID
    let hash = 0;
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `pattern-${Math.abs(hash).toString(36)}`;
}

/**
 * Find anomalous logs (appear only once or very rarely).
 */
export function findAnomalies(
    patterns: Map<string, PatternGroup>,
    maxOccurrences: number = 2
): PatternGroup[] {
    return Array.from(patterns.values()).filter((group) => group.count <= maxOccurrences);
}

/**
 * Get most common patterns sorted by count.
 */
export function getTopPatterns(
    patterns: Map<string, PatternGroup>,
    limit: number = 10
): PatternGroup[] {
    return Array.from(patterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Calculate pattern statistics.
 */
export interface PatternStats {
    totalPatterns: number;
    totalLogs: number;
    groupedLogs: number;
    ungroupedLogs: number;
    mostCommonPattern: PatternGroup | null;
    anomalyCount: number;
}

export function calculatePatternStats(
    patterns: Map<string, PatternGroup>,
    totalLogs: number
): PatternStats {
    const groups = Array.from(patterns.values());
    const groupedLogs = groups.reduce((sum, g) => sum + g.count, 0);
    const anomalies = findAnomalies(patterns, 2);

    return {
        totalPatterns: patterns.size,
        totalLogs,
        groupedLogs,
        ungroupedLogs: totalLogs - groupedLogs,
        mostCommonPattern: groups.length > 0 ? getTopPatterns(patterns, 1)[0] : null,
        anomalyCount: anomalies.length,
    };
}

/**
 * Check if a log matches a pattern.
 */
export function matchesPattern(log: LogEntry, pattern: string): boolean {
    return detectPattern(log.content) === pattern;
}

/**
 * Format pattern for display (truncate if too long).
 */
export function formatPattern(pattern: string, maxLength: number = 100): string {
    if (pattern.length <= maxLength) return pattern;
    return pattern.substring(0, maxLength - 3) + '...';
}
