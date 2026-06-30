import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { storage } from '../config/firebase.js';
import { ref, uploadString } from 'firebase/storage';

export interface OfflineResolution {
  issue_id: string;
  new_status: 'resolved' | 'in_progress';
  photo_data_url: string | null;
  timestamp: number;
}

const QUEUE_KEY = 'civicsense_offline_resolutions';

export function useOfflineSync() {
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  const getQueue = (): OfflineResolution[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const updateCount = () => {
    setOfflineCount(getQueue().length);
  };

  const addToQueue = (resolution: OfflineResolution) => {
    const queue = getQueue();
    queue.push(resolution);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    updateCount();
  };

  const syncQueue = async () => {
    if (!token || !navigator.onLine || syncing) return;
    
    const queue = getQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

    let remainingQueue = [...queue];

    for (const item of queue) {
      try {
        let finalPhotoUrl: string | null = null;
        if (item.new_status === 'resolved' && item.photo_data_url) {
          const storagePath = `resolutions/${item.issue_id}/after_offline_${item.timestamp}.jpg`;
          const storageRef = ref(storage, storagePath);
          await uploadString(storageRef, item.photo_data_url, 'data_url');
          finalPhotoUrl = storagePath;
        }

        const res = await fetch(`${base}/api/v1/authority/issues/${item.issue_id}/status`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ new_status: item.new_status, after_photo_ref: finalPhotoUrl })
        });

        if (res.ok) {
          // Remove from queue
          remainingQueue = remainingQueue.filter(q => q.timestamp !== item.timestamp);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
          updateCount();
        }
      } catch (err) {
        console.error('Failed to sync offline resolution', err);
      }
    }

    setSyncing(false);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateCount();
    
    // Initial sync attempt if online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  return { isOnline, syncing, offlineCount, addToQueue };
}
