"use client";

import { useEffect, useRef, useCallback } from 'react';

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '').replace(/^http/, 'ws');
  }
  if (typeof window !== 'undefined') {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${loc.hostname}:3001`;
  }
  return 'ws://localhost:3001';
}

type EventHandler = (data: unknown) => void;

interface Subscription {
  resource: string;
  id: string;
  handler: EventHandler;
}

// ── Module-scope singleton (client-side only) ─────────────────────────────────
let socket: WebSocket | null = null;
let subscriptions: Subscription[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let isConnecting = false;
const eventCursors = new Map<string, number>();

function clearTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('jwt') ||
    localStorage.getItem('jwt') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    null
  );
}

const RESOURCE_ALIASES: Record<string, string[]> = {
  chat: ['chats', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  chats: ['chat', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  messages: ['chat', 'chats', 'message_reaction', 'message_receipt'],
  call: ['calls', 'incoming_call', 'call_status', 'call_signal'],
  calls: ['call'],
};

function matchesResource(subscribedResource: string, incomingResource: string): boolean {
  return subscribedResource === incomingResource || (RESOURCE_ALIASES[subscribedResource] || []).includes(incomingResource);
}

function connect() {
  if (typeof window === 'undefined') return; // SSR guard
  if (isConnecting || socket?.readyState === WebSocket.OPEN) return;
  isConnecting = true;

  const token = getAuthToken();
  if (!token) {
    isConnecting = false;
    return;
  }

  const wsBase = getWsUrl();
  try {
    socket = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      reconnectDelay = 1000;
      isConnecting = false;
      subscriptions.forEach(({ resource, id }) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'subscribe', resource, id, since: eventCursors.get(`${resource}:${id}`) || 0 }));
          (RESOURCE_ALIASES[resource] || []).forEach((alias) => {
            socket?.send(JSON.stringify({ type: 'subscribe', resource: alias, id, since: eventCursors.get(`${alias}:${id}`) || 0 }));
          });
        }
      });
    };

    socket.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type !== 'event') return;
      if (Number.isFinite(msg.sequence)) eventCursors.set(`${msg.resource}:${msg.id}`, Number(msg.sequence));
      subscriptions.forEach(({ resource, id, handler }) => {
        if (matchesResource(resource, msg.resource) && (id === msg.id || id === 'all')) {
          handler(msg.data);
        }
      });
    };

    socket.onclose = () => {
      isConnecting = false;
      clearTimer();
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        connect();
      }, reconnectDelay);
    };

    socket.onerror = () => {
      isConnecting = false;
    };
  } catch (err) {
    isConnecting = false;
    console.warn('[useWebSocket] Failed to establish WS connection:', err);
  }
}

export function disconnectWs() {
  clearTimer();
  subscriptions = [];
  socket?.close();
  socket = null;
  reconnectDelay = 1000;
}

export function subscribe(resource: string, id: string, handler: EventHandler): () => void {
  if (!subscriptions.some((s) => s.resource === resource && s.id === id && s.handler === handler)) {
    subscriptions.push({ resource, id, handler });
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'subscribe', resource, id, since: eventCursors.get(`${resource}:${id}`) || 0 }));
    (RESOURCE_ALIASES[resource] || []).forEach((alias) => {
      socket?.send(JSON.stringify({ type: 'subscribe', resource: alias, id, since: eventCursors.get(`${alias}:${id}`) || 0 }));
    });
  } else {
    connect();
  }
  return () => {
    subscriptions = subscriptions.filter(
      (s) => !(s.resource === resource && s.id === id && s.handler === handler)
    );
    if (!subscriptions.some((s) => s.resource === resource && s.id === id) &&
        socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe', resource, id }));
      (RESOURCE_ALIASES[resource] || []).forEach((alias) => {
        socket.send(JSON.stringify({ type: 'unsubscribe', resource: alias, id }));
      });
    }
  };
}

export function sendWsMessage(msg: Record<string, any>): boolean {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
    return true;
  }
  connect();
  return false;
}

export function sendCallSignal(targetUserId: string, signal: Record<string, any>): boolean {
  return sendWsMessage({
    type: 'call:signal',
    targetUserId,
    signal,
  });
}

export function useWebSocket(resource: string, id: string, handler: EventHandler, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const stableHandler = useCallback((data: unknown) => {
    handlerRef.current(data);
  }, []);

  useEffect(() => {
    if (!enabled || !resource || !id) return;
    return subscribe(resource, id, stableHandler);
  }, [resource, id, enabled, stableHandler]);
}
