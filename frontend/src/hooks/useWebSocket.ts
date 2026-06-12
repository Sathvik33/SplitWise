import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '../types';

export const useWebSocket = (expenseId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectCount = useRef(0);
  const maxReconnects = 3;
  const isIntentionalClose = useRef(false);

  useEffect(() => {
    if (!expenseId) return;

    isIntentionalClose.current = false;

    const connect = () => {
      const token = localStorage.getItem('splitwise_token');
      const wsUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
      ws.current = new WebSocket(`${wsUrl}/api/ws/expenses/${expenseId}?token=${token}`);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectCount.current = 0;
      };

      ws.current.onmessage = (event) => {
        const newMessage: Message = JSON.parse(event.data);
        queryClient.setQueryData(
          ['expense', expenseId, 'messages'],
          (old: Message[] | undefined) => {
            if (!old) return [newMessage];
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          }
        );
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        if (!isIntentionalClose.current && reconnectCount.current < maxReconnects) {
          reconnectCount.current += 1;
          const backoff = Math.min(1000 * Math.pow(2, reconnectCount.current), 10000);
          setTimeout(connect, backoff);
        }
      };
    };

    connect();

    return () => {
      isIntentionalClose.current = true;
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [expenseId, queryClient]);

  return { isConnected };
};
