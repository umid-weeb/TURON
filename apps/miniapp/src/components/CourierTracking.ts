/**
 * TURON - Real-time Courier Tracking System (TypeScript Version)
 * Yandex Maps JS API v2.1 Integration
 * Optimized for Scooter Delivery
 * 
 * @author TURON Engineering Team
 * @version 1.0.0
 */

/** Type Definitions */

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CourierMetadata {
  speed?: number;
  accuracy?: number;
  timestamp?: number;
  bearing?: number;
}

interface RouteData {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  distanceValue: number;
  durationValue: number;
  eta: string;
}

interface CourierTrackingOptions {
  mapContainer: string;
  infoPanel: string;
  apiKey?: string;
  initialCourierPosition?: [number, number];
  customerPosition?: [number, number];
  zoom?: number;
  routeColor?: string;
  routeWidth?: number;
  updateInterval?: number;
  onRouteUpdate?: (data: RouteData) => void;
  onError?: (error: string) => void;
}

interface InfoPanelData {
  distance: string;
  duration: string;
  distanceKm: string;
  durationMin: number;
  eta: string;
}

/** Main Class */

class CourierTrackingMap {
  // Configuration
  private mapContainer: string;
  private infoPanel: string;
  private apiKey?: string;
  private zoom: number;
  private routeColor: string;
  private routeWidth: number;
  private updateInterval: number;

  // State
  private myMap: ymaps.Map | null = null;
  private multiRoute: ymaps.multiRouter.MultiRoute | null = null;
  private courierMarker: ymaps.Placemark | null = null;
  private customerMarker: ymaps.Placemark | null = null;

  // Position tracking
  private courierPosition: [number, number];
  private customerPosition: [number, number];
  private isTracking: boolean = false;
  private trackingInterval: NodeJS.Timeout | null = null;

  // Callbacks
  private onRouteUpdate: (data: RouteData) => void;
  private onError: (error: string) => void;

  /**
   * Constructor
   */
  constructor(options: CourierTrackingOptions) {
    // Store configuration
    this.mapContainer = options.mapContainer || 'map';
    this.infoPanel = options.infoPanel || 'tracking-info';
    this.apiKey = options.apiKey;
    this.zoom = options.zoom || 15;
    this.routeColor = options.routeColor || '#FF4500';
    this.routeWidth = options.routeWidth || 5;
    this.updateInterval = options.updateInterval || 2000;

    // Store positions
    this.courierPosition = options.initialCourierPosition || [41.3200, 69.2500];
    this.customerPosition = options.customerPosition || [41.2900, 69.2200];

    // Store callbacks
    this.onRouteUpdate = options.onRouteUpdate || (() => {});
    this.onError = options.onError || (() => {});

    // Initialize
    this.init();
  }

  /**
   * Initialize the tracking system
   */
  private init(): void {
    if (typeof ymaps === 'undefined') {
      this.onError('Yandex Maps API not loaded');
      return;
    }

    ymaps.ready(() => {
      try {
        this.initializeMap();
        this.setupRouting();
        this.addMarkers();
        this.setupEventListeners();
      } catch (error) {
        this.onError(`Initialization error: ${error}`);
      }
    });
  }

  /**
   * Initialize Yandex Map
   */
  private initializeMap(): void {
    this.myMap = new ymaps.Map(this.mapContainer, {
      center: this.courierPosition,
      zoom: this.zoom,
      controls: ['zoomControl', 'fullscreenControl', 'typeSelector'],
      type: 'yandex#map' as any,
      behaviors: ['drag', 'dblClickZoom', 'rightMouseButtonMagnifier', 'pinchToZoom']
    });

    // Disable scroll zoom
    if (this.myMap.behaviors) {
      this.myMap.behaviors.disable('scrollZoom');
      this.myMap.behaviors.enable('drag');
    }
  }

  /**
   * Setup multi-route from courier to customer
   */
  private setupRouting(): void {
    this.multiRoute = new ymaps.multiRouter.MultiRoute({
      referencePoints: [
        this.courierPosition,
        this.customerPosition
      ],
      params: {
        routingMode: 'pedestrian' as any,
        avoidTrafficJams: true,
        results: 1
      }
    }, {
      routeActiveStrokeColor: this.routeColor,
      routeActiveStrokeWidth: this.routeWidth,
      routeActiveOpacity: 0.8,
      boundsAutoApply: true,
      routeStrokeColor: '#E0E0E0',
      routeStrokeWidth: 3,
      routeOpacity: 0.5
    });

    if (this.myMap) {
      this.myMap.geoObjects.add(this.multiRoute);
    }
  }

  /**
   * Add markers for courier and customer
   */
  private addMarkers(): void {
    this.courierMarker = new ymaps.Placemark(
      this.courierPosition,
      {
        hintContent: 'Kuryer lokatsiyasi',
        balloonContent: 'Kuryer 🛴'
      },
      {
        preset: 'islands#redDotIcon',
        iconColor: '#FF4500',
        zIndex: 100
      }
    );

    this.customerMarker = new ymaps.Placemark(
      this.customerPosition,
      {
        hintContent: 'Mushtari manzili',
        balloonContent: 'Mushtari 🏠'
      },
      {
        preset: 'islands#blueDotIcon',
        iconColor: '#2196F3',
        zIndex: 50
      }
    );

    if (this.myMap) {
      this.myMap.geoObjects.add(this.courierMarker);
      this.myMap.geoObjects.add(this.customerMarker);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.multiRoute) return;

    this.multiRoute.model.events.add('requestsuccess', () => {
      this.updateInfoPanel();
    });

    this.multiRoute.model.events.add('requesterror', (e: any) => {
      console.error('Route calculation error:', e);
      this.onError('Yo\'nalishni hisoblashda xato');
    });
  }

  /**
   * Update info panel with distance and time
   */
  private updateInfoPanel(): void {
    if (!this.multiRoute) return;

    const activeRoute = this.multiRoute.getActiveRoute();
    if (!activeRoute) return;

    try {
      const distanceObj = activeRoute.properties.get('distance') as any;
      const durationObj = activeRoute.properties.get('duration') as any;

      const distance = distanceObj?.text || 'N/A';
      const duration = durationObj?.text || 'N/A';
      const distanceValue = distanceObj?.value || 0;
      const durationValue = durationObj?.value || 0;

      const eta = this.calculateETA(durationValue);

      this.renderInfoPanel({
        distance,
        duration,
        distanceKm: (distanceValue / 1000).toFixed(1),
        durationMin: Math.ceil(durationValue / 60),
        eta
      });

      this.onRouteUpdate({
        distance: distanceObj,
        duration: durationObj,
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
   * Calculate ETA
   */
  private calculateETA(durationSeconds: number): string {
    const now = new Date();
    const eta = new Date(now.getTime() + durationSeconds * 1000);

    const hours = String(eta.getHours()).padStart(2, '0');
    const minutes = String(eta.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  /**
   * Render info panel
   */
  private renderInfoPanel(data: InfoPanelData): void {
    const element = document.getElementById(this.infoPanel);
    if (!element) return;

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
      </div>
    `;

    element.innerHTML = html;
  }

  /**
   * Update courier position (main tracking function)
   */
  public updateCourierPosition(
    newLat: number,
    newLon: number,
    metadata: CourierMetadata = {}
  ): void {
    try {
      if (!this.isValidCoordinate(newLat, newLon)) {
        console.warn('Invalid coordinates:', newLat, newLon);
        return;
      }

      this.courierPosition = [newLat, newLon];

      if (this.courierMarker) {
        this.courierMarker.geometry.setCoordinates(this.courierPosition);
      }

      if (this.multiRoute) {
        this.multiRoute.model.setReferencePoints([
          this.courierPosition,
          this.customerPosition
        ]);
      }

      this.smoothPanToLocation(this.courierPosition);

      if (metadata.speed) {
        console.log(`Kuryer: ${newLat}, ${newLon} - Tezlik: ${metadata.speed} km/h`);
      }
    } catch (error) {
      console.error('Error updating courier position:', error);
      this.onError('Kuryer lokatsiyasini yangilanishda xato');
    }
  }

  /**
   * Smooth pan to location
   */
  private smoothPanToLocation(coordinates: [number, number]): void {
    if (!this.myMap) return;

    const bounds = this.myMap.getBounds();
    const isInView = bounds && this.isLocationInBounds(coordinates, bounds);

    if (!isInView) {
      this.myMap.panTo(coordinates, {
        flying: true,
        duration: 800
      });
    }
  }

  /**
   * Check if location is in bounds
   */
  private isLocationInBounds(
    coordinates: [number, number],
    bounds: [[number, number], [number, number]]
  ): boolean {
    const [lat, lon] = coordinates;
    const [[minLat, minLon], [maxLat, maxLon]] = bounds;

    return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    const latValid = typeof lat === 'number' && lat >= -90 && lat <= 90;
    const lonValid = typeof lon === 'number' && lon >= -180 && lon <= 180;
    return latValid && lonValid;
  }

  /**
   * Start tracking simulation
   */
  public startTrackingSimulation(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    let step = 0;
    const steps = 20;

    this.trackingInterval = setInterval(() => {
      if (step >= steps || !this.isTracking) {
        if (this.trackingInterval) clearInterval(this.trackingInterval);
        this.isTracking = false;
        return;
      }

      const progress = step / steps;
      const newLat = this.courierPosition[0] +
        (this.customerPosition[0] - this.courierPosition[0]) * (progress * 0.5) +
        (Math.random() - 0.5) * 0.0005;

      const newLon = this.courierPosition[1] +
        (this.customerPosition[1] - this.courierPosition[1]) * (progress * 0.5) +
        (Math.random() - 0.5) * 0.0005;

      this.updateCourierPosition(newLat, newLon, {
        speed: parseFloat((15 + Math.random() * 10).toFixed(1))
      });

      step++;
    }, this.updateInterval);
  }

  /**
   * Stop tracking
   */
  public stopTracking(): void {
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  /**
   * Set customer position
   */
  public setCustomerPosition(lat: number, lon: number): void {
    if (!this.isValidCoordinate(lat, lon)) {
      console.warn('Invalid customer coordinates');
      return;
    }

    this.customerPosition = [lat, lon];

    if (this.customerMarker) {
      this.customerMarker.geometry.setCoordinates(this.customerPosition);
    }

    if (this.multiRoute) {
      this.multiRoute.model.setReferencePoints([
        this.courierPosition,
        this.customerPosition
      ]);
    }
  }

  /**
   * Zoom to fit both markers
   */
  public zoomToFitBoth(): void {
    if (!this.myMap || !this.courierMarker || !this.customerMarker) return;

    const collection = new ymaps.GeoObjectCollection();
    collection.add(this.courierMarker);
    collection.add(this.customerMarker);

    this.myMap.setBounds(collection.getBounds(), {
      checkZoomRange: true,
      zoomMargin: [50, 50, 50, 50]
    });
  }

  /**
   * Get route data
   */
  public getRouteData(): RouteData | null {
    if (!this.multiRoute) return null;

    const activeRoute = this.multiRoute.getActiveRoute();
    if (!activeRoute) return null;

    const distanceObj = activeRoute.properties.get('distance') as any;
    const durationObj = activeRoute.properties.get('duration') as any;

    return {
      distance: distanceObj,
      duration: durationObj,
      distanceValue: distanceObj?.value || 0,
      durationValue: durationObj?.value || 0,
      eta: this.calculateETA(durationObj?.value || 0)
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
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

// Export for TypeScript modules
export default CourierTrackingMap;
export type { CourierTrackingOptions, RouteData, Coordinates, CourierMetadata };
