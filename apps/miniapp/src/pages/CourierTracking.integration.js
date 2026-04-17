/**
 * TURON Courier Tracking - Backend Integration Examples
 * Connect your tracking page to real GPS data sources
 */

/* ============================================
   1. REST API POLLING (Simple, Reliable)
   ============================================ */

class RESTGPSPoller {
  constructor(tracker, orderId, options = {}) {
    this.tracker = tracker;
    this.orderId = orderId;
    this.pollInterval = options.pollInterval || 2000; // 2 seconds
    this.apiBase = options.apiBase || '/api';
    this.authToken = options.authToken || null;
    this.pollingId = null;
  }

  start() {
    this.poll(); // Immediate first poll
    this.pollingId = setInterval(() => this.poll(), this.pollInterval);
  }

  stop() {
    if (this.pollingId) {
      clearInterval(this.pollingId);
      this.pollingId = null;
    }
  }

  async poll() {
    try {
      const response = await fetch(
        `${this.apiBase}/orders/${this.orderId}/courier-location`,
        {
          headers: this.authToken ? {
            'Authorization': `Bearer ${this.authToken}`
          } : {}
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.location) {
        this.tracker.updateCourierPosition(
          data.location.latitude,
          data.location.longitude,
          data.location.heading || 0,
          data.location.speed || 0
        );
      }

      this.tracker.setStatus('Faol', 'connected');
    } catch (error) {
      console.error('GPS poll error:', error);
      this.tracker.setStatus('Ulanishda xato', 'error');
    }
  }
}

// Usage:
// const poller = new RESTGPSPoller(tracker, 'ORDER_123', {
//   apiBase: 'https://api.turon.uz',
//   authToken: localStorage.getItem('auth_token')
// });
// poller.start();

/* ============================================
   2. WEBSOCKET REAL-TIME (Faster, Always On)
   ============================================ */

class WebSocketGPSStream {
  constructor(tracker, orderId, options = {}) {
    this.tracker = tracker;
    this.orderId = orderId;
    this.wsUrl = options.wsUrl || `wss://${window.location.host}/api/gps`;
    this.authToken = options.authToken || null;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  connect() {
    try {
      const url = new URL(this.wsUrl);
      url.searchParams.set('orderId', this.orderId);
      
      if (this.authToken) {
        url.searchParams.set('token', this.authToken);
      }

      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => this.onOpen();
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onerror = (error) => this.onError(error);
      this.ws.onclose = () => this.onClose();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.tracker.setStatus('WebSocket xatosi', 'error');
    }
  }

  onOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.tracker.setStatus('Faol (Real-time)', 'connected');

    // Send subscription request
    this.send({
      type: 'subscribe',
      orderId: this.orderId
    });
  }

  onMessage(event) {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'location') {
        this.tracker.updateCourierPosition(
          data.latitude,
          data.longitude,
          data.heading || 0,
          data.speed || 0
        );
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  onError(error) {
    console.error('WebSocket error:', error);
    this.tracker.setStatus('WebSocket xatosi', 'error');
  }

  onClose() {
    console.log('WebSocket closed');
    
    // Attempt reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      this.tracker.setStatus('Ulanish yorildi', 'error');
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage:
// const ws = new WebSocketGPSStream(tracker, 'ORDER_123', {
//   wsUrl: 'wss://api.turon.uz/gps',
//   authToken: localStorage.getItem('auth_token')
// });
// ws.connect();

/* ============================================
   3. FIREBASE REALTIME DATABASE
   ============================================ */

class FirebaseGPSListener {
  constructor(tracker, orderId, options = {}) {
    this.tracker = tracker;
    this.orderId = orderId;
    this.database = options.database; // Firebase DB instance
    this.unsubscribe = null;
  }

  start() {
    if (!this.database) {
      console.error('Firebase database not provided');
      return;
    }

    const { ref, onValue } = require('firebase/database');
    const locationRef = ref(
      this.database,
      `orders/${this.orderId}/courier_location`
    );

    this.unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        this.tracker.updateCourierPosition(
          data.latitude,
          data.longitude,
          data.heading || 0,
          data.speed || 0
        );
        this.tracker.setStatus('Faol (Firebase)', 'connected');
      }
    }, (error) => {
      console.error('Firebase error:', error);
      this.tracker.setStatus('Firebase xatosi', 'error');
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Usage:
// import { initializeApp } from 'firebase/app';
// import { getDatabase } from 'firebase/database';
// const app = initializeApp(firebaseConfig);
// const db = getDatabase(app);
// const listener = new FirebaseGPSListener(tracker, 'ORDER_123', { database: db });
// listener.start();

/* ============================================
   4. SUPABASE REALTIME SUBSCRIPTIONS
   ============================================ */

class SupabaseGPSListener {
  constructor(tracker, orderId, options = {}) {
    this.tracker = tracker;
    this.orderId = orderId;
    this.supabase = options.supabase; // Supabase client
    this.subscription = null;
  }

  start() {
    if (!this.supabase) {
      console.error('Supabase client not provided');
      return;
    }

    this.subscription = this.supabase
      .channel(`order:${this.orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'courier_tracking',
        filter: `order_id=eq.${this.orderId}`
      }, (payload) => {
        const data = payload.new;
        
        this.tracker.updateCourierPosition(
          data.latitude,
          data.longitude,
          data.heading || 0,
          data.speed || 0
        );
        this.tracker.setStatus('Faol (Supabase)', 'connected');
      })
      .subscribe();
  }

  stop() {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }
}

// Usage:
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(url, key);
// const listener = new SupabaseGPSListener(tracker, 'ORDER_123', { supabase });
// listener.start();

/* ============================================
   5. HYBRID GPS MANAGER (Auto-select best method)
   ============================================ */

class HybridGPSManager {
  constructor(tracker, orderId, options = {}) {
    this.tracker = tracker;
    this.orderId = orderId;
    this.options = options;
    this.activeStream = null;
  }

  start() {
    // Try WebSocket first (real-time)
    if (this.options.wsUrl) {
      this.startWebSocket();
      return;
    }

    // Fall back to REST polling
    if (this.options.apiBase) {
      this.startREST();
      return;
    }

    // Fall back to Firebase
    if (this.options.database) {
      this.startFirebase();
      return;
    }

    // Last resort: Supabase
    if (this.options.supabase) {
      this.startSupabase();
      return;
    }

    console.error('No GPS source configured');
    this.tracker.setStatus('GPS kaynagi topilmadi', 'error');
  }

  startWebSocket() {
    console.log('Starting WebSocket GPS stream...');
    this.activeStream = new WebSocketGPSStream(this.tracker, this.orderId, this.options);
    this.activeStream.connect();
  }

  startREST() {
    console.log('Starting REST API GPS polling...');
    this.activeStream = new RESTGPSPoller(this.tracker, this.orderId, this.options);
    this.activeStream.start();
  }

  startFirebase() {
    console.log('Starting Firebase GPS listener...');
    this.activeStream = new FirebaseGPSListener(this.tracker, this.orderId, this.options);
    this.activeStream.start();
  }

  startSupabase() {
    console.log('Starting Supabase GPS listener...');
    this.activeStream = new SupabaseGPSListener(this.tracker, this.orderId, this.options);
    this.activeStream.start();
  }

  stop() {
    if (this.activeStream) {
      if (this.activeStream.stop) {
        this.activeStream.stop();
      } else if (this.activeStream.disconnect) {
        this.activeStream.disconnect();
      }
    }
  }
}

// Usage:
// const gpsManager = new HybridGPSManager(tracker, 'ORDER_123', {
//   wsUrl: 'wss://api.turon.uz/gps',  // Primary (real-time)
//   apiBase: 'https://api.turon.uz',  // Fallback (polling)
//   authToken: localStorage.getItem('auth_token')
// });
// gpsManager.start();

/* ============================================
   6. COMPLETE INTEGRATION EXAMPLE
   ============================================ */

class CompleteTrackingSystem {
  constructor(orderId, options = {}) {
    this.orderId = orderId;
    this.options = options;
    this.tracker = null;
    this.gpsManager = null;
    this.initialized = false;
  }

  async initialize() {
    // Wait for Yandex Maps to load
    if (typeof ymaps === 'undefined') {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (typeof ymaps !== 'undefined') {
            clearInterval(checkInterval);
            this.setup();
            resolve();
          }
        }, 100);
      });
    } else {
      this.setup();
    }
  }

  setup() {
    // Initialize tracker
    this.tracker = new CourierTracker('map');

    // Set customer position (optional)
    if (this.options.customerPosition) {
      this.tracker.customerPos = this.options.customerPosition;
    }

    // Set initial courier position (optional)
    if (this.options.courierPosition) {
      const [lat, lon] = this.options.courierPosition;
      this.tracker.updateCourierPosition(lat, lon, 0, 0);
    }

    // Start GPS stream
    this.gpsManager = new HybridGPSManager(this.tracker, this.orderId, {
      wsUrl: this.options.wsUrl || `wss://${window.location.host}/api/gps`,
      apiBase: this.options.apiBase || '/api',
      authToken: this.options.authToken || localStorage.getItem('auth_token'),
      database: this.options.database,
      supabase: this.options.supabase
    });

    this.gpsManager.start();

    // Export to window for debugging
    window.trackingSystem = this;
    window.tracker = this.tracker;

    this.initialized = true;
    console.log('Tracking system initialized');
  }

  stop() {
    if (this.gpsManager) {
      this.gpsManager.stop();
    }
  }
}

// ============================================
// FULL INTEGRATION EXAMPLE IN HTML
// ============================================

/*
// In your HTML file, after including CourierTracking.html:

<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const system = new CompleteTrackingSystem('ORDER_123', {
      apiBase: 'https://api.turon.uz',
      wsUrl: 'wss://api.turon.uz/gps',
      authToken: localStorage.getItem('auth_token'),
      courierPosition: [41.3200, 69.2500],
      customerPosition: [41.2900, 69.2200]
    });

    await system.initialize();

    // Cleanup on page leave
    window.addEventListener('beforeunload', () => {
      system.stop();
    });
  });
</script>
*/

/* ============================================
   BACKEND REQUIREMENTS
   ============================================ */

/*
Your backend should provide GPS data in this format:

REST API Response:
{
  "location": {
    "latitude": 41.3210,
    "longitude": 69.2505,
    "heading": 45,        // degrees (0-360)
    "speed": 18.5,        // km/h
    "accuracy": 5,        // meters
    "timestamp": 1713347123456
  }
}

WebSocket Message:
{
  "type": "location",
  "latitude": 41.3210,
  "longitude": 69.2505,
  "heading": 45,
  "speed": 18.5,
  "timestamp": 1713347123456
}

Firebase Structure:
/orders/{orderId}/courier_location/
  - latitude: 41.3210
  - longitude: 69.2505
  - heading: 45
  - speed: 18.5

Supabase Table Structure:
CREATE TABLE courier_tracking (
  id uuid PRIMARY KEY,
  order_id text NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  heading float,
  speed float,
  accuracy float,
  created_at timestamp DEFAULT now()
);
*/

/* ============================================
   EXPORT FOR USE IN OTHER MODULES
   ============================================ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESTGPSPoller,
    WebSocketGPSStream,
    FirebaseGPSListener,
    SupabaseGPSListener,
    HybridGPSManager,
    CompleteTrackingSystem
  };
}
