/**
 * @fileoverview Notification utilities for LogLoom Dashboard
 *
 * Handles browser notifications and audio alerts for pattern matches.
 */

/**
 * Cached AudioContext instance to avoid memory leaks.
 * AudioContext is a limited browser resource, so we reuse a single instance.
 */
let audioContext: AudioContext | null = null;

/**
 * Get or create the shared AudioContext instance.
 */
function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== "closed") {
    // Resume if suspended (browsers suspend AudioContext until user interaction)
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        // Ignore resume errors
      });
    }
    return audioContext;
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Play an alert sound.
 */
export function playAlertSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      console.warn("[Dashboard] AudioContext not available");
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);

    // Clean up oscillator after it finishes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn("[Dashboard] Failed to play alert sound:", error);
  }
}

/**
 * Request notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("[Dashboard] Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Show a browser notification.
 */
export function showNotification(title: string, body: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      icon: "🪵",
      tag: "logloom-alert",
      requireInteraction: false,
    });
  } catch (error) {
    console.warn("[Dashboard] Failed to show notification:", error);
  }
}

/**
 * Check if a log content matches the alert pattern.
 */
export function matchesAlertPattern(content: string, pattern: string): boolean {
  if (!pattern) return false;

  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(content);
  } catch {
    // Invalid regex
    return false;
  }
}
