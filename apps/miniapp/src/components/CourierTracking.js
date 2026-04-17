/**
 * TURON - Real-time Courier Tracking System
 * Yandex Maps JS API v2.1 Integration
 * Optimized for Scooter Delivery
 * 
 * @author TURON Engineering Team
 * @version 1.0.0
 */

class CourierTrackingMap {
  constructor(options = {}) {
    this.mapContainer = options.mapContainer || 'map';
    this.infoPanel = options.infoPanel || 'tracking-info';
    this.apiKey = options.apiKey;
    
    // Map state
    this.myMap = null;
    this.multiRoute = null;
    this.courierMarker = null;
    this.customerMarker = null;
    
    // Tracking state
    this.courierPosition = options.initialCourierPosition || [41.3200, 69.2500];
    this.customerPosition = options.customerPosition || [41.2900, 69.2200];
    this.isTracking = false;
    this.updateInterval = options.updateInterval || 2000; // ms between updates
    
    // Visual config
    this.routeColor = options.routeColor || '#FF4500';
    this.routeWidth = options.routeWidth || 5;
    this.zoomLevel = options.zoom || 15;
    
    // Event callbacks
    this.onRouteUpdate = options.onRouteUpdate || (() => {});
    this.onError = options.onError || (() => {});
    
    this.init();
  }

  /**
   * Initialize the map and routing system
   */
  init() {
    if (typeof ymaps === 'undefined') {
      console.error('Yandex Maps API not loaded');
      this.onError('Yandex Maps API not loaded');
      return;
    }

    ymaps.ready(() => {
      this.initializeMap();
      this.setupRouting();
      this.addMarkers();
      this.setupEventListeners();
    });
  }

  /**
   * Initialize Yandex Map
   */
  initializeMap() {
    this.myMap = new ymaps.Map(this.mapContainer, {
      center: this.courierPosition,
      zoom: this.zoomLevel,
      controls: ['zoomControl', 'fullscreenControl', 'typeSelector'],
      type: 'yandex#map',
      behaviors: ['drag', 'dblClickZoom', 'rightMouseButtonMagnifier', 'pinchToZoom']
    });

    // Add map style customization
    this.myMap.behaviors.disable('scrollZoom');
    this.myMap.behaviors.enable('drag');
  }

  /**
   * Setup multi-route from courier to customer
   * Using 'pedestrian' mode for optimal scooter routing (finds shortcuts)
   */
  setupRouting() {
    this.multiRoute = new ymaps.multiRouter.MultiRoute({
      referencePoints: [
        this.courierPosition,
        this.customerPosition
      ],
      params: {
        // 'pedestrian' mode is optimal for scooters - finds narrow streets and shortcuts
        // Fallback to 'auto' if needed, but pedestrian mode avoids highways
        routingMode: 'pedestrian',
        avoidTrafficJams: true,
        results: 1 // Return only the best route
      }
    }, {
      // Route styling
      routeActiveStrokeColor: this.routeColor,
      routeActiveStrokeWidth: this.routeWidth,
      routeActiveOpacity: 0.8,
      boundsAutoApply: true,
      
      // Inactive route styling
      routeStrokeColor: '#E0E0E0',
      routeStrokeWidth: 3,
      routeOpacity: 0.5
    });

    // Add route to map
    this.myMap.geoObjects.add(this.multiRoute);
  }

  /**
   * Add custom markers for courier and customer
   */
  addMarkers() {
    // Courier Marker (Red Scooter/Arrow)
    this.courierMarker = new ymaps.Placemark(this.courierPosition, {
      hintContent: 'Kuryer lokatsiyasi',
      balloonContent: 'Kuryer 🛴'
    }, {
      preset: 'islands#redDotIcon',
      iconColor: '#FF4500',
      zIndex: 100
    });

    // Customer Marker (Blue House/Circle)
    this.customerMarker = new ymaps.Placemark(this.customerPosition, {
      hintContent: 'Mushtari manzili',
      balloonContent: 'Mushtari 🏠'
    }, {
      preset: 'islands#blueDotIcon',
      iconColor: '#2196F3',
      zIndex: 50
    });

    // Add markers to map
    this.myMap.geoObjects.add(this.courierMarker);
    this.myMap.geoObjects.add(this.customerMarker);
  }

  /**
   * Listen to route update events
   */
  setupEventListeners() {
    // Route calculation success event
    this.multiRoute.model.events.add('requestsuccess', () => {
      this.updateInfoPanel();
    });

    // Route calculation error
    this.multiRoute.model.events.add('requesterror', (e) => {
      console.error('Route calculation error:', e);
      this.onError('Yo\'nalishni hisoblashda xato');
    });
  }

  /**
   * Update info panel with distance and time
   */
  updateInfoPanel() {
    const activeRoute = this.multiRoute.getActiveRoute();
    
    if (!activeRoute) {
      console.warn('No active route available');
      return;
    }

    try {
      // Extract distance and time from route properties
      const distanceObj = activeRoute.properties.get('distance');
      const durationObj = activeRoute.properties.get('duration');
      
      // Get formatted text (e.g., "5.2 км" and "12 мин")
      const distance = distanceObj ? distanceObj.text : 'Noma\'lum';
      const duration = durationObj ? durationObj.text : 'Noma\'lum';
      
      // Get raw values for calculations
      const distanceValue = distanceObj ? distanceObj.value : 0; // in meters
      const durationValue = durationObj ? durationObj.value : 0; // in seconds
      
      // Calculate ETA
      const eta = this.calculateETA(durationValue);
      
      // Update UI
      this.renderInfoPanel({
        distance,
        duration,
        distanceKm: (distanceValue / 1000).toFixed(1),
        durationMin: Math.ceil(durationValue / 60),
        eta
      });

      // Fire callback
      this.onRouteUpdate({
        distance,
        duration,
        distanceValue,
        durationValue,
        eta
      });

    } catch (error) {
      console.error('Error updating info panel:', error);
      this.onError('Yo\'nalish ma\'lumotlarini o\'qishda xato');
    }
  }

  /**
   * Calculate ETA (Estimated Time of Arrival)
   * @param {number} durationSeconds - Duration in seconds
   * @returns {string} Formatted ETA time
   */
  calculateETA(durationSeconds) {
    const now = new Date();
    const eta = new Date(now.getTime() + durationSeconds * 1000);
    
    const hours = String(eta.getHours()).padStart(2, '0');
    const minutes = String(eta.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  }

  /**
   * Render tracking info panel
   * @param {object} data - Route data object
   */
  renderInfoPanel(data) {
    const infoPanelElement = document.getElementById(this.infoPanel);
    
    if (!infoPanelElement) {
      console.warn(`Info panel element with id "${this.infoPanel}" not found`);
      return;
    }

    const html = `
      <div class="tracking-card">
        <div class="tracking-header">
          <h3>Yetib borish ma'lumotlari</h3>
        </div>
        
        <div class="tracking-stats">
          <div class="stat-item">
            <span class="stat-icon">📏</span>
            <div class="stat-content">
              <span class="stat-label">Masofa</span>
              <span class="stat-value">${data.distance}</span>
              <span class="stat-detail">(${data.distanceKm} km)</span>
            </div>
          </div>
          
          <div class="stat-item">
            <span class="stat-icon">⏱️</span>
            <div class="stat-content">
              <span class="stat-label">Yetib borish vaqti</span>
              <span class="stat-value">${data.duration}</span>
              <span class="stat-detail">(${data.durationMin} daqiqa)</span>
            </div>
          </div>
          
          <div class="stat-item">
            <span class="stat-icon">🕐</span>
            <div class="stat-content">
              <span class="stat-label">Taxminiy yetish vaqti</span>
              <span class="stat-value">${data.eta}</span>
            </div>
          </div>
        </div>
        
        <div class="tracking-status">
          <div class="status-badge" id="tracking-status">
            <span class="status-dot"></span>
            <span class="status-text">Kuryerni kuzatish oqilmoqda...</span>
          </div>
        </div>
      </div>
    `;

    infoPanelElement.innerHTML = html;
  }

  /**
   * Update courier position in real-time
   * This is the main function called when GPS coordinates update
   * 
   * @param {number} newLat - New latitude
   * @param {number} newLon - New longitude
   * @param {object} metadata - Optional metadata (speed, accuracy, etc.)
   */
  updateCourierPosition(newLat, newLon, metadata = {}) {
    try {
      // Validate coordinates
      if (!this.isValidCoordinate(newLat, newLon)) {
        console.warn('Invalid coordinates:', newLat, newLon);
        return;
      }

      // Update internal state
      this.courierPosition = [newLat, newLon];

      // Update marker position
      if (this.courierMarker) {
        this.courierMarker.geometry.setCoordinates(this.courierPosition);
      }

      // Update route (critical - this recalculates the route without re-initializing map)
      this.multiRoute.model.setReferencePoints([
        this.courierPosition,
        this.customerPosition
      ]);

      // Pan map to follow courier (smooth animation)
      this.smoothPanToLocation(this.courierPosition);

      // Log tracking data
      if (metadata.speed) {
        console.log(`Kuryer: ${newLat}, ${newLon} - Tezlik: ${metadata.speed} km/h`);
      }

    } catch (error) {
      console.error('Error updating courier position:', error);
      this.onError('Kuryer lokatsiyasini yangilanishda xato');
    }
  }

  /**
   * Smooth pan to a location with animation
   * @param {array} coordinates - [lat, lon]
   */
  smoothPanToLocation(coordinates) {
    if (!this.myMap) return;

    // Check if location is within current bounds
    const bounds = this.myMap.getBounds();
    const isInView = bounds && this.isLocationInBounds(coordinates, bounds);

    if (!isInView) {
      // Pan with smooth animation
      this.myMap.panTo(coordinates, {
        flying: true,
        duration: 800
      });
    }
  }

  /**
   * Check if location is within map bounds
   * @param {array} coordinates - [lat, lon]
   * @param {array} bounds - Map bounds [[minLat, minLon], [maxLat, maxLon]]
   * @returns {boolean}
   */
  isLocationInBounds(coordinates, bounds) {
    if (!bounds || !coordinates) return false;
    
    const [lat, lon] = coordinates;
    const [[minLat, minLon], [maxLat, maxLon]] = bounds;
    
    return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  }

  /**
   * Validate coordinate format
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {boolean}
   */
  isValidCoordinate(lat, lon) {
    const latValid = typeof lat === 'number' && lat >= -90 && lat <= 90;
    const lonValid = typeof lon === 'number' && lon >= -180 && lon <= 180;
    return latValid && lonValid;
  }

  /**
   * Start tracking simulation (for testing)
   * In production, replace with real GPS data stream
   */
  startTrackingSimulation() {
    if (this.isTracking) return;

    this.isTracking = true;
    let step = 0;
    const steps = 20;

    // Simulate scooter moving towards customer
    const simInterval = setInterval(() => {
      if (step >= steps || !this.isTracking) {
        clearInterval(simInterval);
        this.isTracking = false;
        console.log('Tracking simulation completed');
        return;
      }

      // Linear interpolation towards customer
      const progress = step / steps;
      const newLat = this.courierPosition[0] + 
                     (this.customerPosition[0] - this.courierPosition[0]) * 
                     (progress * 0.5) + 
                     (Math.random() - 0.5) * 0.0005; // Add slight randomness
      
      const newLon = this.courierPosition[1] + 
                     (this.customerPosition[1] - this.courierPosition[1]) * 
                     (progress * 0.5) + 
                     (Math.random() - 0.5) * 0.0005;

      this.updateCourierPosition(newLat, newLon, {
        speed: (15 + Math.random() * 10).toFixed(1)
      });

      step++;
    }, this.updateInterval);
  }

  /**
   * Stop tracking (cleanup)
   */
  stopTracking() {
    this.isTracking = false;
  }

  /**
   * Connect to real GPS data stream (WebSocket/Firebase)
   * @param {function} streamHandler - Function to handle GPS data updates
   */
  connectToGPSStream(streamHandler) {
    // Example implementation for WebSocket
    if (typeof streamHandler === 'function') {
      streamHandler((data) => {
        if (data.lat && data.lon) {
          this.updateCourierPosition(data.lat, data.lon, {
            speed: data.speed,
            accuracy: data.accuracy,
            timestamp: data.timestamp
          });
        }
      });
    }
  }

  /**
   * Get current route data
   * @returns {object} Route information
   */
  getRouteData() {
    if (!this.multiRoute) return null;

    const activeRoute = this.multiRoute.getActiveRoute();
    if (!activeRoute) return null;

    return {
      distance: activeRoute.properties.get('distance'),
      duration: activeRoute.properties.get('duration'),
      courierPosition: this.courierPosition,
      customerPosition: this.customerPosition
    };
  }

  /**
   * Set new customer destination
   * @param {number} lat - Customer latitude
   * @param {number} lon - Customer longitude
   */
  setCustomerPosition(lat, lon) {
    if (!this.isValidCoordinate(lat, lon)) {
      console.warn('Invalid customer coordinates');
      return;
    }

    this.customerPosition = [lat, lon];

    // Update marker
    if (this.customerMarker) {
      this.customerMarker.geometry.setCoordinates(this.customerPosition);
    }

    // Recalculate route
    this.multiRoute.model.setReferencePoints([
      this.courierPosition,
      this.customerPosition
    ]);
  }

  /**
   * Zoom to fit both courier and customer
   */
  zoomToFitBoth() {
    if (!this.myMap) return;

    const collection = new ymaps.GeoObjectCollection();
    collection.add(this.courierMarker);
    collection.add(this.customerMarker);

    this.myMap.setBounds(collection.getBounds(), {
      checkZoomRange: true,
      zoomMargin: [50, 50, 50, 50]
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopTracking();
    
    if (this.myMap) {
      this.myMap.destroy();
      this.myMap = null;
    }

    this.multiRoute = null;
    this.courierMarker = null;
    this.customerMarker = null;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CourierTrackingMap;
}
