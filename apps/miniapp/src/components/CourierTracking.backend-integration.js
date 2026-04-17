/**
 * TURON Courier Tracking - Backend Integration Guide
 * Production-ready integration patterns with various backend systems
 */

/* ============================================
   PATTERN 1: Express.js Backend with GPS Stream
   ============================================ */

// backend/routes/courier-tracking.js
const express = require('express');
const router = express.Router();
const gpsCache = new Map(); // Simple in-memory cache

// Simulate WebSocket connection handler
const activeConnections = new Set();

/**
 * GET /api/orders/:orderId/courier/location
 * Fetch current courier location (REST fallback)
 */
router.get('/orders/:orderId/courier/location', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get from database or cache
    const location = gpsCache.get(orderId) || {
      latitude: 41.3200,
      longitude: 69.2500,
      speed: 0,
      accuracy: 5,
      timestamp: Date.now()
    };

    res.json({
      orderId,
      location,
      status: 'active'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:orderId/courier/location
 * Update courier location (called from courier app)
 */
router.post('/orders/:orderId/courier/location', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, speed, accuracy } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const locationData = {
      latitude,
      longitude,
      speed,
      accuracy,
      timestamp: Date.now()
    };

    // Cache the location
    gpsCache.set(orderId, locationData);

    // Save to database (async, doesn't block response)
    saveToDatabase(orderId, locationData).catch(err => 
      console.error('DB save error:', err)
    );

    // Broadcast to connected clients via WebSocket
    broadcastToClients(orderId, locationData);

    res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * WebSocket handler for real-time GPS stream
 */
const handleWebSocketConnection = (ws, req) => {
  const orderId = req.query.orderId;
  activeConnections.add({ ws, orderId });

  console.log(`Client connected for order: ${orderId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'location') {
        // Update location from client
        const locationData = {
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          accuracy: data.accuracy,
          timestamp: Date.now()
        };

        gpsCache.set(orderId, locationData);
        saveToDatabase(orderId, locationData);
        
        // Broadcast to all connected clients for this order
        broadcastToClients(orderId, locationData);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    activeConnections.delete(ws);
    console.log(`Client disconnected from order: ${orderId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};

function broadcastToClients(orderId, data) {
  activeConnections.forEach(({ ws, orderId: connOrderId }) => {
    if (connOrderId === orderId && ws.readyState === 1) { // OPEN state
      ws.send(JSON.stringify({
        type: 'location',
        data: data
      }));
    }
  });
}

function isValidCoordinate(lat, lon) {
  return typeof lat === 'number' && typeof lon === 'number' &&
         lat >= -90 && lat <= 90 &&
         lon >= -180 && lon <= 180;
}

async function saveToDatabase(orderId, locationData) {
  // TODO: Implement database save
  // db.collection('gps_tracking').insertOne({
  //   orderId,
  //   ...locationData,
  //   createdAt: new Date()
  // });
}

module.exports = { router, handleWebSocketConnection };

/* ============================================
   PATTERN 2: Database Schema (Prisma)
   ============================================ */

// prisma/schema.prisma
model CourierTracking {
  id              String    @id @default(cuid())
  orderId         String    @index
  courierId       String
  latitude        Float
  longitude       Float
  speed           Float?    // km/h
  accuracy        Float?    // meters
  heading         Float?    // degrees 0-360
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  courier         Courier   @relation(fields: [courierId], references: [id])

  @@index([orderId, createdAt])
  @@index([courierId, createdAt])
}

model CourierSession {
  id              String    @id @default(cuid())
  courierId       String    @unique
  connectionId    String
  status          String    // online, offline, busy
  currentOrderId  String?
  
  connectedAt     DateTime  @default(now())
  lastHeartbeat   DateTime  @default(now())
  
  @@index([courierId])
  @@index([status])
}

/* ============================================
   PATTERN 3: Firebase Realtime DB Integration
   ============================================ */

// backend/firebase-functions.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

/**
 * Cloud Function: Listen for GPS updates from courier app
 * Trigger: Firebase Realtime DB write to /courier_gps/:courierId/current
 */
exports.processGPSUpdate = functions.database
  .ref('/courier_gps/{courierId}/current')
  .onWrite(async (change, context) => {
    const { courierId } = context.params;
    const newData = change.after.val();

    if (!newData) return null;

    try {
      // Find active order for courier
      const ordersSnapshot = await db.ref('orders')
        .orderByChild('courierId')
        .equalTo(courierId)
        .once('value');

      const orders = ordersSnapshot.val();
      if (!orders) return null;

      // Get the first active order
      const orderId = Object.keys(orders)[0];

      // Save to tracking history
      await db.ref(`order_tracking/${orderId}`)
        .push({
          latitude: newData.latitude,
          longitude: newData.longitude,
          speed: newData.speed,
          accuracy: newData.accuracy,
          timestamp: admin.database.ServerValue.TIMESTAMP
        });

      // Update order's current courier location
      await db.ref(`orders/${orderId}/courier_location`)
        .set({
          latitude: newData.latitude,
          longitude: newData.longitude,
          timestamp: admin.database.ServerValue.TIMESTAMP
        });

      console.log(`GPS updated for courier ${courierId}, order ${orderId}`);
    } catch (error) {
      console.error('Error processing GPS update:', error);
    }

    return null;
  });

/**
 * Cloud Function: Send real-time location to customer
 */
exports.broadcastCourierLocation = functions.database
  .ref('orders/{orderId}/courier_location')
  .onWrite(async (change, context) => {
    const { orderId } = context.params;
    const locationData = change.after.val();

    if (!locationData) return null;

    try {
      // Get order details
      const orderSnapshot = await db.ref(`orders/${orderId}`)
        .once('value');
      const order = orderSnapshot.val();

      // Send to customer's connected devices
      await db.ref(`customer_tracking/${order.customerId}/${orderId}`)
        .set(locationData);

      console.log(`Broadcast location for order ${orderId}`);
    } catch (error) {
      console.error('Error broadcasting location:', error);
    }

    return null;
  });

/* ============================================
   PATTERN 4: Supabase Real-time Subscriptions
   ============================================ */

// backend/supabase-functions.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Subscribe to GPS updates via Supabase Realtime
 */
export async function subscribeToGPSUpdates(orderId: string, callback: Function) {
  const subscription = supabase
    .from(`courier_tracking:order_id=eq.${orderId}`)
    .on('*', (payload) => {
      console.log('Change received!', payload);
      callback(payload.new);
    })
    .subscribe();

  return subscription;
}

/**
 * Insert GPS tracking record
 */
export async function insertGPSTrack(
  orderId: string,
  courierId: string,
  latitude: number,
  longitude: number,
  speed: number,
  accuracy: number
) {
  const { data, error } = await supabase
    .from('courier_tracking')
    .insert([
      {
        order_id: orderId,
        courier_id: courierId,
        latitude,
        longitude,
        speed,
        accuracy,
        created_at: new Date().toISOString()
      }
    ]);

  if (error) throw error;
  return data;
}

/**
 * Get last known position
 */
export async function getLastPosition(orderId: string) {
  const { data, error } = await supabase
    .from('courier_tracking')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/* ============================================
   PATTERN 5: Frontend Integration (Updated)
   ============================================ */

// frontend/CourierTrackingPage.js
class CourierTrackingPage {
  constructor(orderId) {
    this.orderId = orderId;
    this.tracker = null;
    this.gpsStream = null;
  }

  async init() {
    // Initialize tracker
    this.tracker = new CourierTrackingMap({
      mapContainer: 'map',
      infoPanel: 'tracking-info',
      onRouteUpdate: (data) => this.onRouteUpdate(data),
      onError: (error) => this.onError(error)
    });

    // Connect to GPS stream
    await this.connectToGPSStream();
  }

  /**
   * Connect to GPS updates - tries multiple methods in order
   */
  async connectToGPSStream() {
    try {
      // Try WebSocket first (best performance)
      if (this.isWebSocketSupported()) {
        this.connectWebSocket();
        return;
      }

      // Fallback to REST polling
      this.startRESTPolling();
    } catch (error) {
      console.error('GPS connection error:', error);
      this.onError('GPS akamiga ulanishda xato');
    }
  }

  /**
   * WebSocket connection
   */
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/gps?orderId=${this.orderId}`;

    this.gpsStream = new WebSocket(url);

    this.gpsStream.onopen = () => {
      console.log('GPS WebSocket connected');
      this.updateStatus('connected');
    };

    this.gpsStream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'location' && data.data) {
          this.tracker.updateCourierPosition(
            data.data.latitude,
            data.data.longitude,
            {
              speed: data.data.speed,
              accuracy: data.data.accuracy,
              timestamp: data.data.timestamp
            }
          );
        }
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    this.gpsStream.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('error');
      this.startRESTPolling(); // Fallback
    };

    this.gpsStream.onclose = () => {
      console.log('GPS WebSocket closed');
      this.startRESTPolling(); // Fallback
    };
  }

  /**
   * REST API polling (fallback)
   */
  startRESTPolling() {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/orders/${this.orderId}/courier/location`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.location) {
          this.tracker.updateCourierPosition(
            data.location.latitude,
            data.location.longitude,
            {
              speed: data.location.speed,
              accuracy: data.location.accuracy
            }
          );
          this.updateStatus('connected');
        }
      } catch (error) {
        console.error('Poll error:', error);
        this.updateStatus('error');
      }
    }, 2000); // Poll every 2 seconds

    this.pollInterval = pollInterval;
  }

  isWebSocketSupported() {
    return 'WebSocket' in window && window.WebSocket !== undefined;
  }

  updateStatus(status) {
    const statusLight = document.querySelector('.status-light');
    const statusLabel = document.querySelector('.status-label');

    if (!statusLight || !statusLabel) return;

    const config = {
      connected: { class: 'connected', text: 'Kuzatish faol' },
      error: { class: 'error', text: 'Ulanishda xato' },
      loading: { class: '', text: 'Yuklanmoqda...' }
    };

    const state = config[status] || config.loading;
    statusLight.className = `status-light ${state.class}`;
    statusLabel.textContent = state.text;
  }

  onRouteUpdate(data) {
    console.log('Route updated:', data);
    // Send analytics event
    this.logAnalytics('courier_tracking_update', {
      orderId: this.orderId,
      distance: data.distance,
      duration: data.duration
    });
  }

  onError(error) {
    console.error('Tracking error:', error);
    // Send to error tracking service
    this.logError('courier_tracking_error', error);
  }

  logAnalytics(event, data) {
    // Implement with your analytics service
    // mixpanel.track(event, data);
    // or
    // gtag('event', event, data);
  }

  logError(event, error) {
    // Implement with your error tracking service
    // Sentry.captureMessage(event, 'error');
  }

  cleanup() {
    if (this.tracker) {
      this.tracker.destroy();
    }
    if (this.gpsStream) {
      this.gpsStream.close();
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

// Usage
document.addEventListener('DOMContentLoaded', async () => {
  const orderId = new URLSearchParams(window.location.search).get('orderId');
  const page = new CourierTrackingPage(orderId);
  
  await page.init();

  // Cleanup on page leave
  window.addEventListener('beforeunload', () => {
    page.cleanup();
  });

  window.courierPage = page; // For debugging
});

/* ============================================
   PATTERN 6: Error Recovery & Resilience
   ============================================ */

class ResilientGPSConnection {
  constructor(tracker, options = {}) {
    this.tracker = tracker;
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 1000;
    this.retryCount = 0;
    this.isConnected = false;
  }

  async connect() {
    while (this.retryCount < this.maxRetries) {
      try {
        await this.attemptConnection();
        this.retryCount = 0; // Reset on success
        this.isConnected = true;
        return true;
      } catch (error) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff

        console.log(`Connection attempt ${this.retryCount} failed. Retrying in ${delay}ms...`);

        if (this.retryCount < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('Max connection retries exceeded');
    this.isConnected = false;
    return false;
  }

  async attemptConnection() {
    // Implement connection logic
    // Can use WebSocket, REST, or other method
  }

  async reconnect() {
    console.log('Attempting to reconnect...');
    this.isConnected = false;
    this.retryCount = 0;
    return this.connect();
  }
}

module.exports = {
  ResilientGPSConnection,
  CourierTrackingPage
};
