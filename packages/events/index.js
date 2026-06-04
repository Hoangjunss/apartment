import { EventEmitter } from 'events';
import crypto from 'crypto';

class EventHub extends EventEmitter {
  constructor() {
    super();
    this.on('error', (err) => {
      console.error('[EventHub Global Error]:', err);
    });
  }

  // Phương thức emit với cơ chế Failure Isolation
  emit(eventType, payload = {}) {
    const eventId = payload.eventId || crypto.randomUUID();
    const timestamp = payload.timestamp || new Date().toISOString();
    const actorId = payload.actorId || null;
    const entityId = payload.entityId || null;

    const normalizedPayload = {
      eventId,
      eventType,
      timestamp,
      actorId,
      entityId,
      data: payload.data || {}
    };

    console.log(`[EventHub] Emitting "${eventType}" [${eventId}]`);

    const listeners = this.listeners(eventType);
    
    // Gọi từng listener bất đồng bộ hoặc trong try-catch để cách ly lỗi
    for (const listener of listeners) {
      try {
        // Thực thi listener
        listener(normalizedPayload);
      } catch (err) {
        console.error(`[EventHub] Listener for event "${eventType}" threw an error:`, err);
      }
    }

    return listeners.length > 0;
  }
}

const eventHub = new EventHub();
export default eventHub;
