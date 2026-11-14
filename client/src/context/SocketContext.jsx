import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getSocket, onSocketChange } from '../lib/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ connected: false, on: () => () => {} });

/**
 * Thin wrapper around the shared socket that:
 *  - exposes a `connected` flag for the header indicator
 *  - gives components a safe `on(event, handler)` subscription helper
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let current = null;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    // Attach to whichever socket instance currently exists. The socket is
    // created by AuthContext after this effect first runs, so we also listen
    // for later changes instead of checking only once.
    const attach = (s) => {
      if (s === current) return;
      if (current) {
        current.off('connect', onConnect);
        current.off('disconnect', onDisconnect);
      }
      current = s;
      socketRef.current = s;
      if (!s) {
        setConnected(false);
        return;
      }
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      setConnected(s.connected);
    };

    attach(getSocket());
    const unsubscribe = onSocketChange(attach);

    return () => {
      unsubscribe();
      if (current) {
        current.off('connect', onConnect);
        current.off('disconnect', onDisconnect);
      }
    };
  }, [user]);

  const on = (event, handler) => {
    const s = getSocket();
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  };

  return <SocketContext.Provider value={{ connected, on, socket: socketRef.current }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
