/**
 * @fileoverview Source badge component
 */

import type { Source } from '@chronoscribe/shared';

interface SourceBadgeProps {
    source: Source | { name: string; color: string };
    active?: boolean;
    onClick?: () => void;
}

export function SourceBadge({ source, active = true, onClick }: SourceBadgeProps) {
    return (
        <button
            className={`source-badge ${!active ? 'source-badge--inactive' : ''}`}
            style={{
                backgroundColor: `${source.color}20`,
                borderColor: active ? source.color : 'transparent',
            }}
            onClick={onClick}
            title={`Toggle ${source.name}`}
        >
            <span
                className="source-badge__dot"
                style={{ backgroundColor: source.color }}
            />
            <span style={{ color: source.color }}>{source.name}</span>
        </button>
    );
}
