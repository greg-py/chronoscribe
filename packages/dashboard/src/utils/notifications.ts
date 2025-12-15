/**
 * @fileoverview Notification utilities for LogLoom Dashboard
 * 
 * Handles browser notifications and audio alerts for pattern matches.
 */

/**
 * Play an alert sound.
 */
export function playAlertSound(): void {
    try {
        // Create a simple beep using Web Audio API
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.warn('[Dashboard] Failed to play alert sound:', error);
    }
}

/**
 * Request notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('[Dashboard] Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Show a browser notification.
 */
export function showNotification(title: string, body: string): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    try {
        new Notification(title, {
            body,
            icon: '🪵',
            tag: 'logloom-alert',
            requireInteraction: false,
        });
    } catch (error) {
        console.warn('[Dashboard] Failed to show notification:', error);
    }
}

/**
 * Check if a log content matches the alert pattern.
 */
export function matchesAlertPattern(content: string, pattern: string): boolean {
    if (!pattern) return false;

    try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(content);
    } catch {
        // Invalid regex
        return false;
    }
}
