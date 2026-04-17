<!-- TURON Courier Tracking - Quick Reference Sheet -->

# 🚀 TURON Live Tracking - Quick Reference

**File**: `CourierTracking.html`  
**Type**: Single-file HTML/CSS/JS solution  
**Status**: ✅ Production Ready  

---

## ⚡ 30-Second Setup

```html
1. Replace API key in script tag:
   <script src="https://api-maps.yandex.ru/2.1/?lang=en_US&apikey=YOUR_KEY"></script>

2. Open file in browser

3. Click "▶️ Simu" to test simulation

Done! ✅
```

---

## 🎯 Core Method

```javascript
tracker.updateCourierPosition(lat, lon, azimuth, speed);
// lat: -90 to 90
// lon: -180 to 180  
// azimuth: 0-360° (0=N, 90=E, 180=S, 270=W)
// speed: km/h
```

**Example**:
```javascript
// Courier heading northeast at 20 km/h
tracker.updateCourierPosition(41.32, 69.25, 45, 20);

// Heading south at 15 km/h
tracker.updateCourierPosition(41.32, 69.25, 180, 15);
```

---

## 🎨 UI Components

| Component | Shows | Update |
|-----------|-------|--------|
| Rotating 🛴 | Courier + heading | Auto (via `updateCourierPosition`) |
| Pulsing 🏠 | Customer location | Set in `tracker.customerPos` |
| Orange line | Route A→B | Auto (recalculates) |
| Distance card | "750 m" or "1.2 km" | Auto |
| Speed card | "18 km/h" | Auto |
| Duration card | "4 min" | Auto |
| ETA display | "14:35" | Auto |
| Turn instruction | "→ O'ng tomonga" | Auto (< 200m to dest) |

---

## 🔌 Connect Real GPS

### Option 1: REST API (Simple)
```javascript
setInterval(async () => {
  const res = await fetch(`/api/courier/${orderId}`);
  const data = await res.json();
  tracker.updateCourierPosition(
    data.lat, data.lon, data.heading, data.speed
  );
}, 2000); // Every 2 seconds
```

### Option 2: WebSocket (Real-time)
```javascript
const ws = new WebSocket('wss://api.turon.uz/gps');
ws.onmessage = (e) => {
  const d = JSON.parse(e.data);
  tracker.updateCourierPosition(d.lat, d.lon, d.heading, d.speed);
};
```

### Option 3: Use Integration Classes
```javascript
// Include CourierTracking.integration.js, then:
const gps = new WebSocketGPSStream(tracker, orderId, {
  wsUrl: 'wss://api.turon.uz/gps',
  authToken: token
});
gps.connect();
```

---

## 🎮 Control Buttons

| Button | Method | Effect |
|--------|--------|--------|
| 🔍 Mosla | `tracker.zoomToFit()` | Auto-zoom to show both |
| ▶️ Simu | `tracker.toggleSimulation()` | Simulate courier movement |
| 📍 Kuz | `tracker.centerOnCourier()` | Pan to courier position |

---

## 📊 Read Status

```javascript
tracker.courierPos;       // [lat, lon] - current position
tracker.courierHeading;   // 0-360° - current heading
tracker.currentSpeed;     // km/h - current speed
tracker.routeDistance;    // meters - distance to customer
tracker.routeDuration;    // seconds - time to customer
tracker.customerPos;      // [lat, lon] - customer location
```

---

## 🎨 Customize Colors

```javascript
// In HTML, find these lines and modify:

// Scooter icon color:
fill="#FF4500"  → fill="#YOUR_COLOR"

// Route color:
routeActiveStrokeColor: '#FF4500'  → '#YOUR_COLOR'

// Destination pulse color:
stroke="#2196F3"  → stroke="#YOUR_COLOR"
```

---

## 🧪 Test Commands (Browser Console)

```javascript
// Full access to tracker:
tracker

// Test different headings:
tracker.updateCourierPosition(41.32, 69.25, 0, 15);   // North
tracker.updateCourierPosition(41.32, 69.25, 90, 15);  // East
tracker.updateCourierPosition(41.32, 69.25, 180, 15); // South
tracker.updateCourierPosition(41.32, 69.25, 270, 15); // West

// Move to random location:
const lat = 41.3 + Math.random() * 0.05;
const lon = 69.2 + Math.random() * 0.05;
tracker.updateCourierPosition(lat, lon, Math.random() * 360, 20);

// Start simulation:
tracker.startSimulation();

// Stop simulation:
tracker.stopSimulation();

// Zoom to show both:
tracker.zoomToFit();

// Pan to courier:
tracker.centerOnCourier();

// Get current data:
console.log(tracker.getRouteData?.());
console.log('Distance:', tracker.routeDistance, 'm');
console.log('Duration:', tracker.routeDuration, 's');
console.log('Position:', tracker.courierPos);
console.log('Heading:', tracker.courierHeading, '°');
console.log('Speed:', tracker.currentSpeed, 'km/h');
```

---

## ⚙️ Configuration

### Change Update Speed (Simulation)
```javascript
// In HTML, find setInterval and change:
setInterval(() => { ... }, 1500);  // milliseconds
// Increase = slower, Decrease = faster
```

### Change Zoom Level
```javascript
// In initMap() method:
zoom: 16  // 1-20 (higher = more zoomed)
```

### Change Panel Position
```css
/* In CSS: */
.nav-panel {
  bottom: 24px;   /* Distance from bottom */
  left: 50%;      /* Horizontal (50% = center) */
}
```

### Change Map Center
```javascript
// In initMap():
center: [41.3200, 69.2500]  // [lat, lon]
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank white map | Check API key in script tag |
| Icon not rotating | Verify azimuth 0-360° |
| Route not showing | Coordinates must be valid |
| Nothing updates | Check if `updateCourierPosition()` is called |
| Mobile cuts off | Refresh page, check viewport meta tag |
| Performance lag | Reduce update frequency or zoom level |

---

## 📱 Responsive Sizes

```
Mobile:     < 640px    (full width bottom sheet)
Tablet:     640-1024px (side panel)
Desktop:    > 1024px   (optimal layout)
```

---

## 🚀 Deployment Checklist

- [ ] Replace `YOUR_YANDEX_MAPS_API_KEY`
- [ ] Set correct backend endpoints
- [ ] Test on mobile device
- [ ] Verify dark mode
- [ ] Test error scenarios
- [ ] Monitor performance
- [ ] Set up analytics
- [ ] Test accessibility

---

## 📞 Quick Help

| Problem | Command |
|---------|---------|
| Check if working | `tracker.updateCourierPosition(41.32, 69.25, 0, 15)` |
| Verify position | `console.log(tracker.courierPos)` |
| See errors | `F12` → Console tab |
| Reset map | Refresh page |
| Change position | `tracker.updateCourierPosition(lat, lon, heading, speed)` |

---

## 🎯 Common Patterns

### Basic Integration
```javascript
// Minimal setup
tracker.updateCourierPosition(41.32, 69.25, 45, 20);
tracker.customerPos = [41.29, 69.22];
// That's it!
```

### From REST Endpoint
```javascript
async function pollGPS() {
  const res = await fetch(`/api/order/${id}/gps`);
  const {latitude, longitude, heading, speed} = await res.json();
  tracker.updateCourierPosition(latitude, longitude, heading, speed);
}
setInterval(pollGPS, 2000);
```

### Calculate Heading
```javascript
// From point A to point B
const heading = tracker.calculateHeading([41.32, 69.25], [41.29, 69.22]);
tracker.updateCourierPosition(41.32, 69.25, heading, 20);
```

---

## 📚 File Locations

```
apps/miniapp/src/pages/
├── CourierTracking.html           ← Main file (open this)
├── COURIER_TRACKING_GUIDE.md      ← Full documentation
├── CourierTracking.integration.js ← Backend patterns
└── COURIER_TRACKING_QUICK_REF.md  ← This file
```

---

## 🎪 Features at a Glance

✅ Rotating scooter icon  
✅ Pulsing destination marker  
✅ Real-time distance/duration  
✅ Glassmorphism UI  
✅ Smooth animations  
✅ Dark mode  
✅ Mobile responsive  
✅ Error handling  
✅ Multiple GPS sources  
✅ Simulation mode  

---

## 💡 Pro Tips

1. **Smooth Movement**: Update position every 1-3 seconds
2. **Save Battery**: Update every 5 seconds on mobile
3. **Real-time Feel**: Use WebSocket instead of polling
4. **Testing**: Use simulation mode before connecting real GPS
5. **Performance**: Reduce update frequency on low-end devices
6. **Error Handling**: Always wrap updates in try-catch
7. **Fallback**: Have REST API as fallback for WebSocket
8. **Validation**: Check coordinates before updating

---

**Quick Links**:
- 📖 Full Guide: `COURIER_TRACKING_GUIDE.md`
- 🔌 Integrations: `CourierTracking.integration.js`
- 🗂️ Main File: `CourierTracking.html`

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅
