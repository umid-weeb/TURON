<!-- TURON Courier Tracking System - Complete Documentation -->

# 📍 TURON Courier Tracking System

Real-time courier tracking using Yandex Maps JavaScript API v2.1 with dynamic routing, live distance/time updates, and optimized scooter pathfinding.

## 🎯 Features

- ✅ **Real-time Tracking**: Update courier position in real-time without map re-initialization
- ✅ **Dynamic Routing**: Automatic route recalculation as courier moves
- ✅ **Scooter-Optimized**: Uses pedestrian mode for optimal shortcut pathfinding
- ✅ **Live Metrics**: Distance (km) and ETA updated in real-time
- ✅ **Smooth Animations**: Fluid map panning and marker updates
- ✅ **Custom Markers**: Red arrow for courier, blue house for customer
- ✅ **Production Ready**: Error handling, validation, and cleanup
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Dark Mode**: Full dark mode support
- ✅ **Accessibility**: WCAG 2.1 compliant

## 📋 Architecture

```
CourierTrackingMap Class
├── Map Initialization
├── Route Management (MultiRoute)
├── Marker Management
├── Real-time Position Updates
├── UI State Management
└── Event Handling
```

## 🚀 Quick Start

### 1. Include Yandex Maps API

```html
<!-- In your HTML head -->
<script src="https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=YOUR_API_KEY"></script>

<!-- Include the tracking module -->
<script src="path/to/CourierTracking.js"></script>

<!-- Include styles -->
<link rel="stylesheet" href="path/to/CourierTracking.css">
```

### 2. Add HTML Template

```html
<div class="courier-tracking-container">
  <div id="map" class="courier-map"></div>
  <div id="tracking-info" class="tracking-info-panel"></div>
  
  <div class="tracking-controls">
    <button id="btn-zoom-fit" class="control-btn">🔍 Mosla</button>
    <button id="btn-center-courier" class="control-btn">📍 Kuryer</button>
    <button id="btn-center-customer" class="control-btn">🏠 Mijoz</button>
  </div>
  
  <div class="tracking-status-bar">
    <div class="status-indicator" id="connection-status">
      <span class="status-light"></span>
      <span class="status-label">Ulanmoqda...</span>
    </div>
  </div>
</div>
```

### 3. Initialize Tracking

```javascript
// Vanilla JavaScript
const tracker = new CourierTrackingMap({
  mapContainer: 'map',
  infoPanel: 'tracking-info',
  initialCourierPosition: [41.3200, 69.2500],
  customerPosition: [41.2900, 69.2200],
  zoom: 15,
  
  onRouteUpdate: (data) => {
    console.log('Distance:', data.distance);
    console.log('ETA:', data.eta);
  },
  
  onError: (error) => {
    console.error('Tracking error:', error);
  }
});

// Update courier position in real-time
tracker.updateCourierPosition(41.321, 69.251);
```

## 📖 API Reference

### Constructor Options

```javascript
new CourierTrackingMap({
  // Required
  mapContainer: 'map',                    // ID of map DOM element
  infoPanel: 'tracking-info',            // ID of info panel DOM element
  
  // Optional
  apiKey: 'YOUR_YANDEX_MAPS_KEY',       // Yandex Maps API Key
  initialCourierPosition: [41.32, 69.25], // Courier starting coordinates [lat, lon]
  customerPosition: [41.29, 69.22],      // Customer location [lat, lon]
  zoom: 15,                               // Initial zoom level (1-21)
  routeColor: '#FF4500',                 // Route line color
  routeWidth: 5,                         // Route line width in pixels
  updateInterval: 2000,                  // Polling interval in milliseconds
  
  // Callbacks
  onRouteUpdate: (data) => {},           // Called when route is updated
  onError: (error) => {}                 // Called on errors
})
```

### Core Methods

#### `updateCourierPosition(lat, lon, metadata)`

Update courier's real-time position. This is the main method for tracking.

```javascript
tracker.updateCourierPosition(
  41.321,           // Latitude
  69.251,           // Longitude
  {
    speed: 15.5,    // Speed in km/h (optional)
    accuracy: 5,    // Accuracy in meters (optional)
    timestamp: Date.now() // Timestamp (optional)
  }
);
```

**What it does:**
- Validates coordinates
- Updates marker position
- Recalculates route using `setReferencePoints()`
- Smoothly pans map to keep courier in view
- Triggers `onRouteUpdate` callback

#### `setCustomerPosition(lat, lon)`

Update customer destination.

```javascript
tracker.setCustomerPosition(41.280, 69.210);
```

#### `zoomToFitBoth()`

Automatically zoom and pan to show both courier and customer on screen.

```javascript
tracker.zoomToFitBoth();
```

#### `smoothPanToLocation(coordinates)`

Smoothly pan to a location with animation.

```javascript
tracker.smoothPanToLocation([41.32, 69.25]);
```

#### `getRouteData()`

Get current route information.

```javascript
const data = tracker.getRouteData();
console.log(data.distance); // { text: "5.2 км", value: 5200 }
console.log(data.duration); // { text: "12 мин", value: 720 }
```

#### `startTrackingSimulation()`

Start testing simulation (courier moves toward customer).

```javascript
tracker.startTrackingSimulation();
```

#### `stopTracking()`

Stop all tracking and animations.

```javascript
tracker.stopTracking();
```

#### `destroy()`

Clean up resources and destroy map.

```javascript
tracker.destroy();
```

### Event Callbacks

#### `onRouteUpdate(data)`

Called when route is successfully calculated or updated.

```javascript
onRouteUpdate: (data) => {
  console.log(data);
  // {
  //   distance: { text: "5.2 км", value: 5200 },
  //   duration: { text: "12 мин", value: 720 },
  //   distanceValue: 5200,
  //   durationValue: 720,
  //   eta: "14:35"
  // }
}
```

#### `onError(error)`

Called when an error occurs.

```javascript
onError: (error) => {
  console.error('Error:', error);
  // String like "Yo'nalishni hisoblashda xato"
}
```

## 🔌 Integration Examples

### REST API Polling

```javascript
async function pollCourierLocation(tracker, orderId) {
  setInterval(async () => {
    const response = await fetch(`/api/orders/${orderId}/location`);
    const data = await response.json();
    
    tracker.updateCourierPosition(
      data.latitude,
      data.longitude,
      { speed: data.speed }
    );
  }, 2000); // Poll every 2 seconds
}
```

### WebSocket (Real-time)

```javascript
function connectWebSocket(tracker) {
  const ws = new WebSocket('wss://your-server.com/gps');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    tracker.updateCourierPosition(data.lat, data.lon);
  };
}
```

### Firebase Realtime Database

```javascript
import { ref, onValue } from 'firebase/database';
import { db } from './firebase-config';

function listenToFirebase(tracker, orderId) {
  const locRef = ref(db, `orders/${orderId}/courier/location`);
  
  onValue(locRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      tracker.updateCourierPosition(data.lat, data.lon);
    }
  });
}
```

### React Component

See `CourierTracking.examples.js` for complete React component implementation.

## 🎨 Customization

### Route Colors

```javascript
const tracker = new CourierTrackingMap({
  routeColor: '#FF6B35',  // Orange-red
  routeWidth: 6
});
```

### Map Controls

```javascript
// The map includes by default:
// - zoomControl (+ and - buttons)
// - fullscreenControl (fullscreen button)
// - typeSelector (map type switcher)

// Custom controls can be added via Yandex Maps API
```

### Marker Customization

To customize courier/customer markers, modify the `addMarkers()` method:

```javascript
// In CourierTracking.js, find addMarkers() method
// Change the preset property to one of:
// - 'islands#redDotIcon'
// - 'islands#blueDotIcon'
// - 'islands#greenDotIcon'
// Or provide custom icon URL
```

## 🐛 Debugging

### Enable Console Logging

```javascript
const tracker = new CourierTrackingMap({...});

// Access tracker from console
window.tracker = tracker;

// In browser console:
tracker.getRouteData()
tracker.courierPosition
tracker.customerPosition
```

### Simulation Mode (Testing)

```javascript
const tracker = new CourierTrackingMap({...});
tracker.startTrackingSimulation();

// Courier will move step by step toward customer
// Great for UI testing without real GPS data
```

## ⚡ Performance Optimization

### Update Frequency

```javascript
// Too frequent (every 100ms) - may cause lag
new CourierTrackingMap({ updateInterval: 100 });

// Optimal (every 2-3 seconds) - good balance
new CourierTrackingMap({ updateInterval: 2000 });

// Less frequent (every 5 seconds) - for slower networks
new CourierTrackingMap({ updateInterval: 5000 });
```

### Zoom Level

```javascript
// City-wide view (lower zoom = less detail)
new CourierTrackingMap({ zoom: 12 });

// Neighborhood level
new CourierTrackingMap({ zoom: 15 });

// Street level (higher zoom = more detail)
new CourierTrackingMap({ zoom: 18 });
```

## 🔒 Security

### API Key Management

**Never hardcode API keys in client code!**

```javascript
// ❌ WRONG - API key exposed in frontend code
const tracker = new CourierTrackingMap({
  apiKey: 'YOUR_ACTUAL_KEY_123456'
});

// ✅ CORRECT - Load from environment
const apiKey = process.env.REACT_APP_YANDEX_MAPS_KEY;
```

### Coordinate Validation

The system automatically validates coordinates:

```javascript
// This will be rejected (invalid latitude)
tracker.updateCourierPosition(95, 69.25);  // ❌ Latitude > 90

// This will be accepted
tracker.updateCourierPosition(41.32, 69.25); // ✅ Valid
```

## 📱 Responsive Behavior

The system automatically adapts to screen size:

- **Desktop (1024px+)**: Side panel, 3-column stats
- **Tablet (768px-1023px)**: Side panel, 2-column stats
- **Mobile (<768px)**: Bottom sheet, stacked stats

## 🌙 Dark Mode

Automatically detects system preference:

```css
/* Enable dark mode in system settings */
/* Component will automatically switch */
```

Or force dark mode via CSS:

```css
@media (prefers-color-scheme: dark) {
  /* Styles already included */
}
```

## ♿ Accessibility

- ARIA labels on all buttons
- Keyboard navigation support
- Respects `prefers-reduced-motion`
- High contrast text
- Touch-friendly button sizes (48px on mobile)

## 🚨 Error Handling

```javascript
// Errors are caught and reported via callback
const tracker = new CourierTrackingMap({
  onError: (error) => {
    // Handle error appropriately
    // Examples:
    // - "Xaritani yuklashda xato"
    // - "Yo'nalishni hisoblashda xato"
    // - "Kuryer lokatsiyasini yangilanishda xato"
    
    showErrorNotification(error);
    logToSentry(error);
  }
});
```

## 📊 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

## 📦 File Structure

```
├── CourierTracking.js           # Main class (production code)
├── CourierTracking.html         # HTML template
├── CourierTracking.css          # Styles
├── CourierTracking.examples.js  # Usage examples
└── README.md                    # This file
```

## 🤝 Contributing

For bugs, feature requests, or improvements:

1. Test thoroughly with real GPS data
2. Check browser compatibility
3. Verify accessibility
4. Update documentation
5. Submit changes to engineering team

## 📞 Support

For technical issues or questions:
- Check examples in `CourierTracking.examples.js`
- Review Yandex Maps API documentation: https://yandex.com/dev/maps/
- Contact: engineering@turon.uz

## 📄 License

Internal TURON project. All rights reserved.

---

**Last Updated**: April 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
