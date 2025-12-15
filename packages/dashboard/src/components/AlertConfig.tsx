/**
 * @fileoverview Alert configuration panel
 */

import { useState, useEffect } from 'react';
import { useLogStore } from '../hooks/useLogStore';
import { requestNotificationPermission } from '../utils/notifications';

export function AlertConfig() {
    const alertConfig = useLogStore((state) => state.alertConfig);
    const setAlertConfig = useLogStore((state) => state.setAlertConfig);
    const [patternInput, setPatternInput] = useState(alertConfig.pattern);

    // Sync pattern input with store
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAlertConfig({ pattern: patternInput });
        }, 300);
        return () => clearTimeout(timeout);
    }, [patternInput, setAlertConfig]);

    // Request notification permission when enabling notifications
    const handleToggleNotifications = async () => {
        if (!alertConfig.showNotification) {
            const granted = await requestNotificationPermission();
            if (granted) {
                setAlertConfig({ showNotification: true, enabled: true });
            }
        } else {
            setAlertConfig({ showNotification: false });
        }
    };

    return (
        <div className="alert-panel">
            <div className="alert-panel__row">
                <span className="alert-panel__label">🔔 Alert on regex:</span>
                <input
                    className="alert-panel__input"
                    type="text"
                    placeholder="e.g., ERROR|FATAL|Exception"
                    value={patternInput}
                    onChange={(e) => setPatternInput(e.target.value)}
                />

                <button
                    className={`alert-panel__toggle ${alertConfig.playSound ? 'alert-panel__toggle--active' : ''}`}
                    onClick={() => setAlertConfig({ playSound: !alertConfig.playSound, enabled: true })}
                    title="Toggle sound alert"
                >
                    🔊 Sound
                </button>

                <button
                    className={`alert-panel__toggle ${alertConfig.showNotification ? 'alert-panel__toggle--active' : ''}`}
                    onClick={handleToggleNotifications}
                    title="Toggle browser notification"
                >
                    📢 Notify
                </button>

                <button
                    className={`alert-panel__toggle ${alertConfig.enabled ? 'alert-panel__toggle--active' : ''}`}
                    onClick={() => setAlertConfig({ enabled: !alertConfig.enabled })}
                    title={alertConfig.enabled ? 'Disable alerts' : 'Enable alerts'}
                >
                    {alertConfig.enabled ? '✓ Active' : 'Disabled'}
                </button>
            </div>
        </div>
    );
}
