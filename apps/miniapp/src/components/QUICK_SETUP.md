# ⚡ TURON Courier Tracking - Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Get Your Yandex Maps API Key

1. Visit https://developer.yandex.com/
2. Create an account or login
3. Go to "My applications" → Create new app
4. Select Maps JavaScript API v2.1
5. Copy your API key
6. Add your domain to allowed list

### Step 2: Add Files to Your Project

```bash
# Copy these files to your miniapp
cp CourierTracking.js apps/miniapp/src/components/
cp CourierTracking.css apps/miniapp/src/components/
cp CourierTracking.html apps/miniapp/src/components/
```

### Step 3: Add API Key to Environment

Create or update `.env.production`:

```env
VITE_YANDEX_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### Step 4: Add to Your HTML

```html
<!-- In your main HTML file (index.html) -->
<head>
  <!-- Yandex Maps API -->
  <script src="https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=YOUR_API_KEY"></script>
  
  <!-- Tracking Styles -->
  <link rel="stylesheet" href="./components/CourierTracking.css">
</head>

<body>
  <!-- Tracking Container -->
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

  <!-- Tracking Script -->
  <script src="./components/CourierTracking.js"></script>
  <script src="./components/CourierTracking.examples.js"></script>
</body>
```

### Step 5: Initialize in Your App

#### If using Vanilla JavaScript:

```javascript
// Create the tracker instance
const tracker = new CourierTrackingMap({
  mapContainer: 'map',
  infoPanel: 'tracking-info',
  initialCourierPosition: [41.3200, 69.2500],
  customerPosition: [41.2900, 69.2200],
  zoom: 15,
  
  onRouteUpdate: (data) => {
    console.log('Distance:', data.distance);
    console.log('Time:', data.duration);
  },
  
  onError: (error) => {
    console.error('Error:', error);
  }
});

// Setup button handlers
document.getElementById('btn-zoom-fit').addEventListener('click', () => {
  tracker.zoomToFitBoth();
});

// Start tracking simulation for testing
tracker.startTrackingSimulation();

// Or connect to real GPS
window.updateCourierGPS = (lat, lon) => {
  tracker.updateCourierPosition(lat, lon);
};
```

#### If using React:

```jsx
import CourierTrackingPage from './components/CourierTracking';
import './components/CourierTracking.css';

export default function DeliveryPage() {
  return (
    <CourierTrackingPage
      orderId="ORDER_123"
      initialCourierPosition={[41.3200, 69.2500]}
      customerPosition={[41.2900, 69.2200]}
      onTrackingUpdate={(data) => console.log(data)}
      onError={(error) => console.error(error)}
    />
  );
}
```

## 🧪 Test It Immediately

### Option A: Run Simulation

```javascript
// In browser console (F12)
tracker.startTrackingSimulation();

// Courier will move toward customer over 60 seconds
// Check console for position updates
```

### Option B: Manual GPS Update

```javascript
// In browser console
tracker.updateCourierPosition(41.321, 69.251);
tracker.updateCourierPosition(41.320, 69.252);
tracker.updateCourierPosition(41.319, 69.253);

// You'll see route update in real-time
```

### Option C: Get Test Data

```javascript
// In browser console
tracker.getRouteData();
// Returns: { distance, duration, courierPosition, customerPosition }
```

## 📋 Checklist

- [ ] Yandex Maps API key obtained
- [ ] API key added to .env.production
- [ ] Files copied to project
- [ ] HTML template added
- [ ] API script loaded in <head>
- [ ] Tracker initialized
- [ ] Buttons configured
- [ ] Test simulation working

## 🔌 Connect Real GPS

### Using REST API

```javascript
// Poll courier location every 2 seconds
async function startTracking(orderId) {
  setInterval(async () => {
    const response = await fetch(`/api/orders/${orderId}/location`);
    const data = await response.json();
    
    tracker.updateCourierPosition(
      data.latitude,
      data.longitude,
      { speed: data.speed }
    );
  }, 2000);
}

startTracking('ORDER_123');
```

### Using WebSocket

```javascript
const ws = new WebSocket('wss://your-api.com/gps?orderId=ORDER_123');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  tracker.updateCourierPosition(data.lat, data.lon);
};
```

## 🎨 Customize Colors

```javascript
const tracker = new CourierTrackingMap({
  routeColor: '#FF6B35',    // Change route color
  routeWidth: 6,            // Make route thicker
  zoom: 18                  // Zoom closer
});
```

## 🐛 Troubleshooting

### Map not showing

```javascript
// Check if API key is valid
console.log('Map container:', document.getElementById('map'));

// Check if API loaded
console.log('Yandex Maps loaded:', typeof ymaps !== 'undefined');
```

### Coordinates not updating

```javascript
// Verify coordinates are valid
const lat = 41.32, lon = 69.25;
if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
  tracker.updateCourierPosition(lat, lon);
}
```

### Route not calculating

```javascript
// Check route model events
tracker.multiRoute.model.events.add('requesterror', (e) => {
  console.error('Route error:', e);
});
```

## 📚 Documentation Files

- **CourierTracking.js** - Main implementation class
- **CourierTracking.css** - All styles
- **CourierTracking.html** - HTML template
- **CourierTracking.examples.js** - Usage examples for vanilla JS, React, WebSocket, Firebase, etc.
- **CourierTracking.backend-integration.js** - Backend integration patterns
- **COURIER_TRACKING_README.md** - Complete API documentation

## 🚀 Deploy

### Build for Production

```bash
# Your Vite build command
npm run build
# or
yarn build
```

### Environment Variables (Production)

```env
# .env.production
VITE_YANDEX_MAPS_API_KEY=prod_api_key_here
VITE_API_BASE_URL=https://api.turon.uz
```

## 📞 Need Help?

### Check Examples

See `CourierTracking.examples.js` for:
- Vanilla JS initialization
- React component
- WebSocket handling
- Firebase integration
- REST API polling

### Common Issues

| Issue | Solution |
|-------|----------|
| Blank white map | Check API key in .env |
| Route not showing | Verify coordinates are valid |
| Markers not visible | Check zoom level (try zoom: 15) |
| No distance/time | Wait for route calculation (2-3 sec) |
| Performance issues | Reduce update frequency (updateInterval: 5000) |

## 📊 Performance Tips

- **Update Frequency**: 2-3 seconds is optimal
- **Zoom Level**: Use 15 for neighborhood level
- **Mobile**: Reduce animation on low-end devices
- **Network**: Use WebSocket instead of polling for real-time

## ✅ Success Indicators

Once working, you should see:
- ✅ Map loads with Tashkent center
- ✅ Red marker for courier
- ✅ Blue marker for customer
- ✅ Orange route line between them
- ✅ Distance and time in bottom panel
- ✅ Buttons work for zoom/pan
- ✅ Status bar shows "Kuzatish faol"

---

**Ready to go!** 🎉

For detailed API documentation, see `COURIER_TRACKING_README.md`
