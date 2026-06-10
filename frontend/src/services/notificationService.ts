// src/services/notificationService.ts
/**
 * Native PWA Browser Notification Service
 * 
 * Handles permission request, status checking, and triggering native
 * system notification banners. Uses localStorage to prevent spamming
 * the user with duplicate alerts on the same day.
 */
import i18n from '@/i18n';

class NotificationService {
  /** Safely retrieve item from localStorage with try/catch guard */
  private safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return null;
    }
  }

  /** Safely store item in localStorage with try/catch guard */
  private safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage set failed:', e);
    }
  }

  /** Check if the current browser environment supports the Notifications API */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /** Get the current notification permission state */
  public getPermissionState(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request system-level notification permissions from the user.
   * Best called directly in response to a user click gesture.
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    
    try {
      const permission = await Notification.requestPermission();
      
      // If permission is newly granted, throw a lovely welcome notification
      if (permission === 'granted') {
        this.sendNotification(
          i18n.t('notifications.welcomeTitle', '🔔 FloraMentor Reminders Enabled!'),
          i18n.t('notifications.welcomeBody', 'Your plant care reminders and smart weather alerts are now fully active.'),
          { tag: 'fm-welcome' }
        );
      }
      return permission;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return 'denied';
    }
  }

  /**
   * Trigger a native operating system notification.
   * Safely falls back if permission is not granted or API is unsupported.
   */
  public sendNotification(title: string, body: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported() || this.getPermissionState() !== 'granted') {
      return null;
    }

    try {
      return new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } catch (err) {
      console.error('Failed to send native notification:', err);
      return null;
    }
  }

  /**
   * Send a daily care reminder with strict single-trigger caching per day.
   */
  public sendDailyCareReminder(count: number): void {
    if (count <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifiedDate = this.safeGetItem('fm_last_care_reminder_date');

    // Only notify if we haven't already sent a care reminder today
    if (lastNotifiedDate !== todayStr) {
      const title = i18n.t('notifications.careTitle', '🌱 Care Tasks Due Today!');
      const body = count === 1
        ? i18n.t('notifications.careBodySingular', 'You have 1 plant that needs care today. Tap to open FloraMentor.')
        : i18n.t('notifications.careBodyPlural', `You have ${count} plants that need care today. Tap to open FloraMentor.`, { count });

      const notification = this.sendNotification(title, body, { tag: 'fm-care-reminder' });
      
      if (notification) {
        this.safeSetItem('fm_last_care_reminder_date', todayStr);
        
        // Custom action: focus the browser tab when notification is clicked
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
        };
      }
    }
  }

  /**
   * Send a smart weather alert notification (e.g., skip watering) with single-trigger caching per day.
   */
  public sendSmartWeatherAlert(count: number): void {
    if (count <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifiedDate = this.safeGetItem('fm_last_weather_alert_date');

    // Only notify if we haven't already sent a weather advice notification today
    if (lastNotifiedDate !== todayStr) {
      const title = i18n.t('notifications.weatherTitle', '🌦️ Smart Weather Recommendation');
      const body = count === 1
        ? i18n.t('notifications.weatherBodySingular', 'High humidity/moisture detected. Consider skipping your plant watering task today.')
        : i18n.t('notifications.weatherBodyPlural', `High humidity/moisture detected. Consider skipping your ${count} watering tasks today.`, { count });

      const notification = this.sendNotification(title, body, { tag: 'fm-weather-alert' });
      
      if (notification) {
        this.safeSetItem('fm_last_weather_alert_date', todayStr);
        
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
        };
      }
    }
  }
}

export const notificationService = new NotificationService();
