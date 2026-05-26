'use client';
import { useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UseSmartNotificationPollingProps {
  onNewNotification: (notification: Notification) => void;
}

export function useSmartNotificationPolling({
  onNewNotification
}: UseSmartNotificationPollingProps) {
  const lastSeenIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    try {
      // Fetch ONLY the most recent 1 notification
      const res = await api.get('/api/notifications/latest');
      const latestNotif: Notification | null = res.data.notification;

      // If there's a notification and we haven't seen it before
      if (latestNotif && latestNotif.id !== lastSeenIdRef.current) {
        lastSeenIdRef.current = latestNotif.id;
        onNewNotification(latestNotif);
      }
    } catch (error) {
      console.error('[notification polling] Error:', error);
    }
  }, [onNewNotification]);

  useEffect(() => {
    // Initial fetch on mount
    poll();

    // Set up polling interval — 3 seconds for demo, 5s for production
    pollIntervalRef.current = setInterval(poll, 3000);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [poll]);
}
