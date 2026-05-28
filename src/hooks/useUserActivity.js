import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
const ACTIVITY_THROTTLE_MS = 5000; // 5 seconds - throttle activity updates

/**
 * Hook for tracking user activity and online status
 * - Updates last_seen timestamp periodically
 * - Sets is_online to true when active
 * - Uses Supabase realtime for presence tracking
 * - Automatically marks user offline after inactivity
 */
export function useUserActivity(userId) {
  const heartbeatIntervalRef = useRef(null);
  const channelRef = useRef(null);
  const lastActivityUpdateRef = useRef(0);

  const updateActivity = useCallback(async () => {
    if (!userId) return;

    // Throttle activity updates to avoid excessive database writes
    const now = Date.now();
    if (now - lastActivityUpdateRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }
    lastActivityUpdateRef.current = now;

    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          last_seen: timestamp,
          is_online: true,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user activity:', error);
      }
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }, [userId]);

  const markOffline = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', userId);

      if (error) {
        console.error('Error marking user offline:', error);
      }
    } catch (error) {
      console.error('Error marking user offline:', error);
    }
  }, [userId]);

  const cleanup = useCallback(async () => {
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Unsubscribe from presence channel
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current);
        console.log('✅ User activity channel cleaned up');
      } catch (error) {
        console.error('Error removing user activity channel:', error);
      }
      channelRef.current = null;
    }

    // Mark user offline
    await markOffline();
  }, [markOffline]);

  useEffect(() => {
    if (!userId) return;

    // Initial activity update
    updateActivity();

    // Set up heartbeat interval to update activity periodically
    heartbeatIntervalRef.current = setInterval(() => {
      updateActivity();
    }, HEARTBEAT_INTERVAL_MS);

    // Set up Supabase realtime presence channel
    const channel = supabase
      .channel(`user_presence_${userId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('🔄 Presence sync event');
      })
      .on('presence', { event: 'join' }, () => {
        console.log('👤 User joined presence');
      })
      .on('presence', { event: 'leave' }, () => {
        console.log('👤 User left presence');
      })
      .subscribe((status) => {
        console.log('📡 Presence subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Track user presence
          channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          }).catch((error) => {
            console.error('Error tracking presence:', error);
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Presence channel error');
        }
      });

    channelRef.current = channel;

    // Handle visibility change (tab hidden/shown)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };

    // Handle user activity events
    const handleActivity = () => {
      updateActivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Cleanup
    return () => {
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);

      // Cleanup channels and mark offline
      cleanup();
    };
  }, [userId, updateActivity, cleanup]);

  return null;
}

/**
 * Format last_seen timestamp to relative time (e.g., "2 mins ago")
 */
export function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Never';

  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return lastSeenDate.toLocaleDateString();
}

/**
 * Check if user is considered online based on last_seen timestamp
 */
export function isUserOnline(lastSeen) {
  if (!lastSeen) return false;
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;
  return diffMs < ONLINE_THRESHOLD_MS;
}
