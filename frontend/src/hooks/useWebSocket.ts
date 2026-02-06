import { useEffect, useRef } from 'react';
import { wsClient } from '@/services/websocket';

export function useWebSocket(onMessage?: (data: Record<string, unknown>) => void) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    wsClient.connect();

    const unsub = wsClient.on('*', (data: Record<string, unknown>) => {
      cbRef.current?.(data);
    });

    return () => {
      unsub();
    };
  }, []);

  return { send: wsClient.send.bind(wsClient) };
}
