# SPRINT 2.1 Test Plan - Delivery Completion + Next Order Flow

**Date**: April 17, 2026  
**Feature**: Seamless order-to-order delivery workflow with celebration UI  
**Environment**: Staging  
**Status**: READY FOR TESTING

---

## Test Scope

### Components Under Test
- **DeliveryCompletedPanel** - Celebration UI shown after DELIVERED stage
- **useNextAvailableOrder** - Hook for fetching and auto-accepting next order
- **GET /courier/orders/next** - Backend endpoint for next available order
- **CourierMapPage Integration** - Conditional render on DELIVERED stage

### Test Approach
- Manual end-to-end testing with real courier and order data
- Happy path validation
- Error scenario validation
- UI/UX responsiveness validation

---

## Test Cases

### TC 1.1: Happy Path - Complete Delivery → Show Celebration
**Precondition**:  
- Courier is logged in and on delivery map for active order
- Order is in DELIVERING stage with customer location marked

**Steps**:
1. Verify map shows order details and delivery button
2. Click "Buyurtma topshirildi" (Order Delivered) button
3. Observe stage update toast notification

**Expected Result**:
- ✅ DeliveryCompletedPanel displays with animation
- ✅ Shows confetti background with rotating emoji
- ✅ Displays order recap (number, customer name)
- ✅ Shows stats: distance (km), time (minutes), earnings (so'm)
- ✅ "🚀 Keyingi buyurtma" button visible and enabled
- ✅ "Buyurtmalar ro'yxatiga qaytish" fallback button visible

**Evidence**: Screenshot of celebration screen with all UI elements visible

---

### TC 1.2: Click Next Order Button → Auto-Accept
**Precondition**:
- DeliveryCompletedPanel is showing (from TC 1.1)
- Courier has at least one ASSIGNED order waiting

**Steps**:
1. Click "🚀 Keyingi buyurtma" button
2. Observe loading state (button should show loading indicator)
3. Wait for auto-accept completion

**Expected Result**:
- ✅ Button enters loading state immediately
- ✅ Success toast appears: "Yangi buyurtma #[ORDER_NUMBER]!"
- ✅ Automatic navigation to new order's map view
- ✅ New order details load on map
- ✅ New delivery workflow begins (map updates, stage buttons available)

**Evidence**: 
- Screenshot of loading state during auto-accept
- Screenshot of success toast
- Screenshot of new order map after navigation

---

### TC 1.3: No Orders Available → Show Error
**Precondition**:
- DeliveryCompletedPanel is showing
- No ASSIGNED orders available for courier in system

**Steps**:
1. Click "🚀 Keyingi buyurtma" button
2. Observe for 2-3 seconds

**Expected Result**:
- ✅ Error toast appears: "Keyingi buyurtma topilmadi" (No next order found)
- ✅ DeliveryCompletedPanel remains visible
- ✅ Courier can still see "Buyurtmalar ro'yxatiga qaytish" button
- ✅ No navigation occurs (stays on completion screen)

**Evidence**: Screenshot of error toast and completion panel still visible

---

### TC 2.1: Order Stats Accuracy
**Precondition**:
- Order with known delivery duration and distance completed
- DeliveryCompletedPanel showing

**Steps**:
1. Review stats displayed:
   - Distance traveled (km)
   - Time spent (minutes)
   - Earnings (so'm)
2. Compare with order tracking data in backend

**Expected Result**:
- ✅ Distance matches `remainingMetrics.distanceKm` passed to component
- ✅ Time matches `remainingMetrics.etaMinutes` or calculated duration
- ✅ Earnings = order.deliveryFee (with any surge/bonus applied)

**Evidence**: Screenshot with console logs of passed metrics vs displayed values

---

### TC 2.2: Fallback Navigation Button
**Precondition**:
- DeliveryCompletedPanel visible
- No next order available (optional)

**Steps**:
1. Click "Buyurtmalar ro'yxatiga qaytish" (Back to Orders List) button
2. Observe navigation

**Expected Result**:
- ✅ Navigate to `/courier/orders` (orders list page)
- ✅ Show all courier's orders (active and completed)
- ✅ New completed order appears in list

**Evidence**: Screenshot of orders list after navigation

---

### TC 3.1: Loading States During Next Order Fetch
**Precondition**:
- DeliveryCompletedPanel visible
- Network connection intentionally slowed (DevTools throttle)

**Steps**:
1. Enable throttling: 4G slow (100 Mbps down, 20 Mbps up, 400ms latency)
2. Click "🚀 Keyingi buyurtma" button
3. Observe UI during 3-5 second fetch delay

**Expected Result**:
- ✅ Button shows loading spinner/disabled state
- ✅ Panel remains interactive (can still click fallback button)
- ✅ No timeout error (minimum 10s timeout on frontend)
- ✅ Eventually completes (either success or error toast)

**Evidence**: Video of loading sequence with throttled network

---

### TC 3.2: Network Error During Next Order Fetch
**Precondition**:
- DeliveryCompletedPanel visible

**Steps**:
1. Go offline (disable network in DevTools)
2. Click "🚀 Keyingi buyurtma" button
3. Wait 2 seconds
4. Re-enable network

**Expected Result**:
- ✅ Error toast appears after timeout: "Keyingi buyurtma topilmadi"
- ✅ Completion panel remains visible
- ✅ Can retry by clicking button again after network restored

**Evidence**: Console logs showing failed network request, screenshot of error state

---

### TC 4.1: UI Responsiveness on Different Screen Sizes
**Precondition**:
- DeliveryCompletedPanel visible

**Steps**:
1. Test on mobile viewport (375x667px iPhone SE)
2. Test on tablet viewport (768x1024px iPad)
3. Test on desktop viewport (1920x1080px)
4. Check all button sizes, text scaling, emoji visibility

**Expected Result**:
- ✅ Layout adapts properly to screen size
- ✅ All buttons remain tappable (≥44px height on mobile)
- ✅ Text is readable (no overflow)
- ✅ Confetti animation plays smoothly on all sizes
- ✅ Stats grid formats correctly (2 cols on mobile, 3 on desktop)

**Evidence**: Screenshots from each device size

---

### TC 4.2: Dark Mode / Light Mode Compatibility
**Precondition**:
- DeliveryCompletedPanel visible
- Telegram app dark/light mode settings available

**Steps**:
1. Switch Telegram to dark mode (if available)
2. Observe colors and contrast
3. Switch to light mode
4. Observe colors and contrast

**Expected Result**:
- ✅ Text remains readable in both modes
- ✅ Glassmorphism effect visible (blur + semi-transparent)
- ✅ Gradient colors adapt or remain consistent
- ✅ Emoji remain visible and colored

**Evidence**: Screenshots in both modes

---

### TC 5.1: Haptic Feedback on Action
**Precondition**:
- Device with haptic feedback support (most modern phones)
- DeliveryCompletedPanel visible

**Steps**:
1. Click "🚀 Keyingi buyurtma" button
2. Feel device vibration
3. Complete auto-accept
4. Feel additional haptic on success

**Expected Result**:
- ✅ Haptic feedback on button click (notificationOccurred('success'))
- ✅ Haptic feedback on successful next order accept
- ✅ Vibration is noticeable but not jarring

**Evidence**: User observation, can be noted in test results

---

### TC 6.1: Concurrent Orders Not Assigned
**Precondition**:
- Courier completes order
- Another order gets auto-assigned to different courier while completion panel showing

**Steps**:
1. Complete delivery (show completion panel)
2. Backend auto-assigns new order to courier B (different)
3. Click "🚀 Keyingi buyurtma" on courier A's panel
4. Observe result

**Expected Result**:
- ✅ Courier A gets the NEXT available order (not the one assigned to B)
- ✅ FIFO ordering respected (oldest ASSIGNED first)
- ✅ No conflicts or race conditions

**Evidence**: Backend logs showing order assignments, screenshot of correct order accepted

---

## Test Data Setup

### Required Test Scenarios

**Scenario 1: Happy Path (Order Available)**
```
- Courier: Active, accepting orders
- Order: In DELIVERING stage, near customer location
- Next Order: 1+ orders in ASSIGNED status waiting
- Distance: 2.5 km completed
- Time: 18 minutes elapsed
- Fee: 15,000 so'm
```

**Scenario 2: No Orders Available**
```
- Courier: Active, accepting orders
- Order: In DELIVERING stage
- Next Order: 0 ASSIGNED orders available
- Backend response: {noOrdersAvailable: true}
```

**Scenario 3: Multiple Orders Available**
```
- Courier: Active
- Order 1: Completed (DELIVERED)
- Order 2, 3, 4: All ASSIGNED
- Expected: Order 2 fetched (oldest first)
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All test cases passed on staging
- [ ] No errors in browser console during test
- [ ] Network requests logged correctly (DevTools)
- [ ] Backend /courier/orders/next endpoint confirmed working
- [ ] POST /courier/order/:id/accept still working (not broken by changes)
- [ ] Cache invalidation working (orders list refreshes after accept)
- [ ] Toast notifications displaying correctly (success, error)
- [ ] Haptic feedback working on test device
- [ ] No memory leaks detected (React profiler)
- [ ] Loading states prevent double-click errors

---

## Rollback Plan

If critical issues found during staging:

1. **Issue**: Completion panel not showing
   - **Rollback**: Revert last CourierMapPage.tsx changes
   - **Fallback**: Auto-redirect to orders list after 3 seconds (original behavior)

2. **Issue**: Next order fetch failing frequently
   - **Rollback**: Remove GET /courier/orders/next endpoint
   - **Fallback**: Show "Buyurtmalar ro'yxatiga qaytish" button only, no auto-fetch

3. **Issue**: Auto-accept causing wrong orders accepted
   - **Rollback**: Revert backend endpoint
   - **Fallback**: Change to manual order selection from queue

---

## Success Metrics

✅ **Test Coverage**: 95%+ of test cases passing  
✅ **Error Rate**: <1% of completion events cause errors  
✅ **Load Time**: Completion panel renders in <200ms  
✅ **Auto-Accept Time**: Next order accepts within 2-5s (network dependent)  
✅ **User Satisfaction**: Smooth UX with no confusing states  

---

## Notes

- **API Response Format**: Both frontend and backend must match:
  - Success: `{ order: CourierOrderPreview }`
  - No orders: `{ noOrdersAvailable: true }`
- **Cache Strategy**: Invalidate `['courier-orders']` cache on successful accept
- **Error Handling**: Show toast with error message, keep panel visible for retry
- **A/B Testing**: Track metrics on production for 48 hours before full rollout

---

**Test Status**: Ready for execution  
**Test Lead**: QA Team  
**Expected Duration**: 2-3 hours  
**Created**: April 17, 2026  
