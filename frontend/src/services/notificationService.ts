// src/services/notificationService.ts
/**
 * Native PWA Browser Notification Service
 * 
 * Handles permission request, status checking, and triggering native
 * system notification banners. Uses localStorage to prevent spamming
 * the user with duplicate alerts on the same day.
 */

class NotificationService {
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
          '🔔 FloraMentor Reminders Enabled!',
          'Your plant care reminders and smart weather alerts are now fully active.'
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
        tag: 'floramentor-notification', // replaces prior notification instead of stacking infinite alerts
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
    const lastNotifiedDate = localStorage.getItem('fm_last_care_reminder_date');

    // Only notify if we haven't already sent a care reminder today
    if (lastNotifiedDate !== todayStr) {
      const title = '🌱 Care Tasks Due Today!';
      const body = count === 1
        ? 'You have 1 plant that needs care today. Tap to open FloraMentor.'
        : `You have ${count} plants that need care today. Tap to open FloraMentor.`;

      const notification = this.sendNotification(title, body);
      
      if (notification) {
        localStorage.setItem('fm_last_care_reminder_date', todayStr);
        
        // Custom action: focus the browser tab when notification is clicked
        notification.onclick = () => {
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
    const lastNotifiedDate = localStorage.getItem('fm_last_weather_alert_date');

    // Only notify if we haven't already sent a weather advice notification today
    if (lastNotifiedDate !== todayStr) {
      const title = '🌦️ Smart Weather Recommendation';
      const body = count === 1
        ? 'High humidity/moisture detected. Consider skipping your plant watering task today.'
        : `High humidity/moisture detected. Consider skipping your ${count} watering tasks today.`;

      const notification = this.sendNotification(title, body);
      
      if (notification) {
        localStorage.setItem('fm_last_weather_alert_date', todayStr);
        
        notification.onclick = () => {
          window.focus();
        };
      }
    }
  }
}

export const notificationService = new NotificationService();
