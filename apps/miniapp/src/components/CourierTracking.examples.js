/**
 * TURON - Courier Tracking Implementation Examples
 * Shows how to integrate CourierTrackingMap in different environments
 */

/* ============================================
   EXAMPLE 1: Vanilla JavaScript Implementation
   ============================================ */

// Initialize tracking when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Make sure Yandex Maps API is loaded first
  const script = document.createElement('script');
  script.src = 'https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=YOUR_YANDEX_MAPS_API_KEY';
  script.async = true;
  script.defer = true;
  
  script.onload = function() {
    initializeCourierTracking();
  };
  
  document.head.appendChild(script);
});

function initializeCourierTracking() {
  // Create tracking instance
  const tracker = new CourierTrackingMap({
    mapContainer: 'map',
    infoPanel: 'tracking-info',
    initialCourierPosition: [41.3200, 69.2500], // Courier starting location
    customerPosition: [41.2900, 69.2200],       // Customer location
    zoom: 15,
    routeColor: '#FF4500',
    routeWidth: 5,
    updateInterval: 2000, // Update every 2 seconds
    
    // Callbacks
    onRouteUpdate: (data) => {
      console.log('Route updated:', data);
      updateUIState('active');
    },
    onError: (error) => {
      console.error('Tracking error:', error);
      updateUIState('error');
      showNotification(error, 'error');
    }
  });

  // Store tracker globally for debugging
  window.courierTracker = tracker;

  // Setup event listeners for UI buttons
  setupEventListeners(tracker);

  // Connect to real GPS stream or start simulation
  // Option 1: Start simulation for testing
  // tracker.startTrackingSimulation();

  // Option 2: Connect to real GPS data via WebSocket
  // tracker.connectToGPSStream(webSocketHandler);

  // Option 3: Manual GPS updates from backend
  window.updateCourierGPS = (lat, lon) => {
    tracker.updateCourierPosition(lat, lon);
  };
}

function setupEventListeners(tracker) {
  // Zoom to fit both courier and customer
  const btnZoomFit = document.getElementById('btn-zoom-fit');
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      tracker.zoomToFitBoth();
    });
  }

  // Center on courier
  const btnCenterCourier = document.getElementById('btn-center-courier');
  if (btnCenterCourier) {
    btnCenterCourier.addEventListener('click', () => {
      tracker.smoothPanToLocation(tracker.courierPosition);
    });
  }

  // Center on customer
  const btnCenterCustomer = document.getElementById('btn-center-customer');
  if (btnCenterCustomer) {
    btnCenterCustomer.addEventListener('click', () => {
      tracker.smoothPanToLocation(tracker.customerPosition);
    });
  }
}

function updateUIState(state) {
  const statusElement = document.getElementById('connection-status');
  const statusLight = statusElement?.querySelector('.status-light');
  const statusLabel = statusElement?.querySelector('.status-label');

  if (!statusElement) return;

  const states = {
    'loading': {
      class: '',
      text: 'Yuklanmoqda...',
      light: 'blink-orange'
    },
    'active': {
      class: 'connected',
      text: 'Kuzatish faol',
      light: 'connected'
    },
    'error': {
      class: 'error',
      text: 'Ulanishda xato',
      light: 'error'
    }
  };

  const config = states[state] || states.loading;

  if (statusLight) {
    statusLight.className = `status-light ${config.class}`;
  }
  if (statusLabel) {
    statusLabel.textContent = config.text;
  }
}

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/* ============================================
   EXAMPLE 2: React Component Implementation
   ============================================ */

// CourierTrackingPage.jsx
// @ts-check
import React, { useEffect, useRef, useState, useCallback } from 'react';
import CourierTrackingMap from './CourierTracking';
import './CourierTracking.css';

/**
 * React Component for Courier Tracking Page
 * 
 * Props:
 *   - orderId: string - Order identifier
 *   - initialCourierPosition: [number, number] - Starting courier position
 *   - customerPosition: [number, number] - Customer destination
 *   - onTrackingUpdate: (data) => void - Callback for route updates
 *   - onError: (error) => void - Error handler
 */
export default function CourierTrackingPage({
  orderId,
  initialCourierPosition = [41.3200, 69.2500],
  customerPosition = [41.2900, 69.2200],
  onTrackingUpdate = () => {},
  onError = () => {}
}) {
  const trackerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize tracking on mount
  useEffect(() => {
    const initTracker = () => {
      try {
        trackerRef.current = new CourierTrackingMap({
          mapContainer: 'map',
          infoPanel: 'tracking-info',
          initialCourierPosition,
          customerPosition,
          zoom: 15,
          routeColor: '#FF4500',
          
          onRouteUpdate: (data) => {
            setStatus('active');
            onTrackingUpdate(data);
          },
          
          onError: (error) => {
            setStatus('error');
            setErrorMessage(error);
            onError(error);
          }
        });
      } catch (error) {
        console.error('Failed to initialize tracker:', error);
        setStatus('error');
        setErrorMessage('Xaritani yuklashda xato');
      }
    };

    // Load Yandex Maps API if not already loaded
    if (typeof ymaps === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=YOUR_YANDEX_MAPS_API_KEY';
      script.async = true;
      script.onload = initTracker;
      document.head.appendChild(script);
    } else {
      initTracker();
    }

    // Cleanup on unmount
    return () => {
      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
    };
  }, [initialCourierPosition, customerPosition, onTrackingUpdate, onError]);

  // Handle GPS updates from backend
  useEffect(() => {
    if (!trackerRef.current || !orderId) return;

    // Example: Connect to WebSocket for real-time GPS
    const connectToGPS = async () => {
      try {
        // Replace with your actual GPS endpoint
        const response = await fetch(`/api/orders/${orderId}/tracking`);
        const data = await response.json();

        if (data.courierLocation) {
          trackerRef.current.updateCourierPosition(
            data.courierLocation.latitude,
            data.courierLocation.longitude,
            {
              speed: data.courierLocation.speed,
              accuracy: data.courierLocation.accuracy,
              timestamp: data.courierLocation.timestamp
            }
          );
        }
      } catch (error) {
        console.error('GPS fetch error:', error);
      }
    };

    // Poll GPS every 5 seconds (in production, use WebSocket)
    const pollInterval = setInterval(connectToGPS, 5000);
    connectToGPS(); // Initial fetch

    return () => clearInterval(pollInterval);
  }, [orderId]);

  // UI Button Handlers
  const handleZoomFit = useCallback(() => {
    trackerRef.current?.zoomToFitBoth();
  }, []);

  const handleCenterCourier = useCallback(() => {
    if (trackerRef.current?.courierPosition) {
      trackerRef.current.smoothPanToLocation(trackerRef.current.courierPosition);
    }
  }, []);

  const handleCenterCustomer = useCallback(() => {
    if (trackerRef.current?.customerPosition) {
      trackerRef.current.smoothPanToLocation(trackerRef.current.customerPosition);
    }
  }, []);

  return (
    <div className="courier-tracking-container">
      <div id="map" className="courier-map"></div>
      <div id="tracking-info" className="tracking-info-panel"></div>

      <div className="tracking-controls">
        <button
          className="control-btn"
          onClick={handleZoomFit}
          title="Xaritani moslab ko'rsatish"
          aria-label="Zoom to fit"
        >
          🔍 Mosla
        </button>
        <button
          className="control-btn"
          onClick={handleCenterCourier}
          title="Kuryerga markazla"
          aria-label="Center on courier"
        >
          📍 Kuryer
        </button>
        <button
          className="control-btn"
          onClick={handleCenterCustomer}
          title="Mijozga markazla"
          aria-label="Center on customer"
        >
          🏠 Mijoz
        </button>
      </div>

      <StatusBar status={status} errorMessage={errorMessage} />
    </div>
  );
}

// StatusBar Component
function StatusBar({ status, errorMessage }) {
  const statusConfig = {
    loading: { light: 'blink', text: 'Yuklanmoqda...' },
    active: { light: 'connected', text: 'Kuzatish faol' },
    error: { light: 'error', text: 'Ulanishda xato' }
  };

  const config = statusConfig[status] || statusConfig.loading;

  return (
    <div className="tracking-status-bar">
      <div className="status-indicator" id="connection-status">
        <span className={`status-light ${config.light}`}></span>
        <span className="status-label">
          {errorMessage ? `Xato: ${errorMessage}` : config.text}
        </span>
      </div>
    </div>
  );
}

/* ============================================
   EXAMPLE 3: WebSocket GPS Stream Handler
   ============================================ */

/**
 * Example WebSocket handler for real-time GPS updates
 * Connect this to your backend GPS stream
 */
function webSocketGPSHandler(tracker) {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${wsProtocol}://${window.location.host}/api/courier/gps`);

  ws.onopen = () => {
    console.log('GPS stream connected');
    updateUIState('active');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Update tracker with new GPS coordinates
      tracker.updateCourierPosition(data.latitude, data.longitude, {
        speed: data.speed,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
        bearing: data.bearing
      });

      console.log(`Kuryer: ${data.latitude}, ${data.longitude}`);
    } catch (error) {
      console.error('GPS data parse error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateUIState('error');
  };

  ws.onclose = () => {
    console.log('GPS stream disconnected');
    // Attempt to reconnect after 3 seconds
    setTimeout(() => webSocketGPSHandler(tracker), 3000);
  };

  return ws;
}

/* ============================================
   EXAMPLE 4: Firebase Realtime Database Handler
   ============================================ */

/**
 * Example Firebase handler for real-time GPS updates
 * Requires: import { database } from 'firebase/app';
 *           import { ref, onValue } from 'firebase/database';
 */
function firebaseGPSHandler(tracker, orderId) {
  // Note: This example assumes Firebase is initialized
  // const { database } = require('firebase/app');
  // const { ref, onValue } = require('firebase/database');

  const gpsRef = `orders/${orderId}/courier/location`;
  
  // Set up real-time listener
  // onValue(ref(database(), gpsRef), (snapshot) => {
  //   const data = snapshot.val();
  //   if (data) {
  //     tracker.updateCourierPosition(data.lat, data.lon, {
  //       speed: data.speed,
  //       accuracy: data.accuracy,
  //       timestamp: data.timestamp
  //     });
  //   }
  // });
}

/* ============================================
   EXAMPLE 5: REST API Polling Handler
   ============================================ */

/**
 * Simple REST API polling for GPS updates
 * Used when WebSocket is not available
 */
async function restAPIGPSHandler(tracker, orderId, pollInterval = 2000) {
  let isPolling = true;

  async function poll() {
    if (!isPolling) return;

    try {
      const response = await fetch(
        `/api/orders/${orderId}/courier/location`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.location) {
        tracker.updateCourierPosition(
          data.location.latitude,
          data.location.longitude,
          {
            speed: data.location.speed,
            accuracy: data.location.accuracy,
            timestamp: data.location.timestamp
          }
        );
      }
    } catch (error) {
      console.error('GPS fetch error:', error);
    }

    // Schedule next poll
    if (isPolling) {
      setTimeout(poll, pollInterval);
    }
  }

  // Start polling
  poll();

  // Return stop function
  return () => {
    isPolling = false;
  };
}

/* ============================================
   EXAMPLE 6: Testing & Simulation
   ============================================ */

/**
 * Start testing with simulated courier movement
 * Useful for QA and development
 */
function startTestingSimulation(tracker) {
  console.log('Starting courier tracking simulation...');
  tracker.startTrackingSimulation();
  
  // You can also manually test with:
  setInterval(() => {
    // Simulate random movement
    const [lat, lon] = tracker.courierPosition;
    const newLat = lat + (Math.random() - 0.5) * 0.001;
    const newLon = lon + (Math.random() - 0.5) * 0.001;
    
    tracker.updateCourierPosition(newLat, newLon, {
      speed: (15 + Math.random() * 10).toFixed(1)
    });
  }, 3000);
}

/* ============================================
   Debug Console Commands
   ============================================ */

/**
 * Add these to window for testing in browser console:
 * 
 * window.courierTracker.updateCourierPosition(41.31, 69.24)
 * window.courierTracker.setCustomerPosition(41.28, 69.21)
 * window.courierTracker.getRouteData()
 * window.courierTracker.zoomToFitBoth()
 * window.courierTracker.startTrackingSimulation()
 * window.courierTracker.stopTracking()
 */
