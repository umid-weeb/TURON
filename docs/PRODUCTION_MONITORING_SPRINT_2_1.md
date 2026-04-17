# SPRINT 2.1 Production Monitoring Plan

**Feature**: Delivery Completion + Next Order Flow  
**Go-Live Date**: TBD (after staging validation)  
**Monitoring Duration**: First 48 hours  
**Owner**: DevOps + Backend Team

---

## Key Metrics to Monitor

### 1. API Performance Metrics

#### GET /courier/orders/next
```
- Response Time (p50, p95, p99): Target <500ms
- Error Rate: Target <0.5%
- Query Count: Monitor for N+1 problems
- Database Load: Ensure ASSIGNED status index is used
```

**Alert Thresholds**:
- ⚠️ Warning: Response time >1s or error rate >1%
- 🚨 Critical: Response time >3s or error rate >5%

#### POST /courier/order/:id/accept
```
- Success Rate: Target >99%
- Idempotency: Verify no double-accepts
- Race Conditions: Monitor for order assignment conflicts
- Cache Invalidation: Verify queue refreshes after accept
```

**Alert Thresholds**:
- ⚠️ Warning: Error rate >0.5%
- 🚨 Critical: Error rate >5%

---

### 2. User Experience Metrics

#### Delivery Completion Flow
```json
{
  "metric": "completion_panel_display_time",
  "target": "<200ms",
  "measurement": "time from DELIVERED stage update to panel render"
}
```

```json
{
  "metric": "next_order_auto_accept_success_rate",
  "target": ">95%",
  "measurement": "successful clicks on 'Keyingi buyurtma' button"
}
```

```json
{
  "metric": "next_order_accept_time",
  "target": "<5 seconds",
  "measurement": "user clicks button to order accepted on server"
}
```

#### Error Scenarios
```json
{
  "metric": "no_orders_available_rate",
  "baseline": "TBD",
  "measurement": "percentage of next-order requests returning no orders"
}
```

```json
{
  "metric": "error_recovery_success",
  "target": ">90%",
  "measurement": "users successfully retry after error"
}
```

---

### 3. Business Metrics

#### Order Fulfillment Efficiency
```
- Average delivery-to-next-order time: Track in seconds
- Courier idle time reduction: % time decrease between orders
- Revenue per courier: Monitor for surge/bonus changes
```

#### User Engagement
```
- Completion panel interaction rate: % couriers clicking "next"
- Fallback button usage: % using "back to list" instead
- Session retention: Do couriers stay online longer?
```

---

## Error Scenarios to Monitor

### Scenario 1: Slow Network
**Issue**: Courier on 3G connection takes >5s to auto-accept  
**Detection**: Log response times >3s  
**Action**: 
- Show loading indicator (already implemented)
- Verify timeout handling (10s)
- Consider optimizing query

**Logs to Check**:
```
GET /courier/orders/next took 4200ms
POST /courier/order/ORD-123/accept took 3800ms
```

---

### Scenario 2: No Orders Available
**Issue**: Courier finishes delivery but no next order in queue  
**Detection**: Monitor `noOrdersAvailable: true` rate  
**Action**:
- If >10% at peak hours, escalate to dispatching
- If >30% anytime, potential system issue
- Alert dispatcher to assign more orders

**Metrics Dashboard**:
```
24h Moving Average: {noOrdersAvailable} rate
Alert Threshold: >15%
```

---

### Scenario 3: Concurrent Order Acceptance Conflict
**Issue**: Two couriers accept same order  
**Detection**: Monitor duplicate accepts via audit logs  
**Action**:
- Check for race condition in `acceptCourierOrder`
- Verify database unique constraints
- Add pessimistic locking if needed

**Logs to Check**:
```
Audit: DUPLICATE_ORDER_ACCEPT detected
Order: ORD-123
Courier A: accepted at 14:32:05.123
Courier B: accepted at 14:32:05.145
```

---

### Scenario 4: Cache Invalidation Failure
**Issue**: Courier accepts next order but sees stale queue  
**Detection**: Monitor cache hit/miss ratio  
**Action**:
- Verify `['courier-orders']` cache invalidation on POST accept
- Check React Query cache keys
- Monitor SSE stream updates if used

**Metrics**:
```
Cache Invalidation Success Rate: >99%
Stale Data Reports: Monitor support tickets
```

---

### Scenario 5: Auto-Accept Creates Wrong Order
**Issue**: FIFO logic broken, courier gets wrong order priority  
**Detection**: 
- Monitor for distance anomalies (suddenly very far)
- Check acceptance patterns vs order timestamps
- Review customer complaints

**Action**:
- Check `orderBy: { createdAt: 'asc' }` query logic
- Verify no race conditions in assignment
- Consider adding `where: { status: 'ASSIGNED', assignedAt: { gte: now - 1h } }`

---

### Scenario 6: Haptic Feedback Not Working
**Issue**: Courier doesn't get vibration feedback  
**Detection**: User reports in support channel  
**Action**:
- Not critical for functionality (fallback to UI feedback only)
- Monitor support tickets
- Check browser compatibility (iOS vs Android)

---

## Deployment Verification (Go-Live)

Before enabling in production, verify:

- [ ] Backend builds successfully: `pnpm --filter @turon/backend build`
- [ ] Frontend builds successfully: `pnpm --filter @turon/miniapp build`
- [ ] Database migrations applied (if any)
- [ ] New endpoint NOT breaking any existing API contracts
- [ ] Audit logging configured for new endpoint
- [ ] Feature flag (if available) set to track rollout
- [ ] Logs are being captured and available in monitoring dashboard
- [ ] Alerts are configured and tested

---

## Monitoring Dashboard Setup

### Recommended Metrics to Chart (48-hour view)

```
Panel 1: API Response Times
- Line chart: GET /courier/orders/next response time (p50, p95, p99)
- Y-axis: milliseconds
- Alert line: 1000ms

Panel 2: Success Rates
- Stacked bar: Success vs Error for both endpoints
- Target line: 99%

Panel 3: User Funnel
- Funnel chart: 
  1. Order marked DELIVERED
  2. Completion panel shown
  3. Next order button clicked
  4. Order accepted successfully
  5. Navigation to new map completed

Panel 4: Error Types
- Pie chart: Distribution of error reasons
  - No orders available
  - Network timeout
  - Permission denied
  - Server error (5xx)

Panel 5: Performance Percentiles
- Bar chart: Response time distribution
  - <100ms
  - 100-500ms
  - 500-1000ms
  - >1000ms

Panel 6: Business Metrics
- KPI: Avg delivery-to-next-order time
- KPI: Courier online retention rate
- KPI: Orders accepted via auto-next feature (%)
```

---

## Incident Response Procedures

### Critical Issue Detected: >5% Error Rate

**Immediate Actions** (within 5 minutes):
1. Page on-call engineer
2. Check recent deployments
3. Review error logs for patterns
4. Verify database connectivity

**Diagnosis** (within 10 minutes):
- [ ] Is it specific to one endpoint or both?
- [ ] Is it a data issue or code issue?
- [ ] Can errors be reproduced?
- [ ] What's the error message pattern?

**Resolution** (within 30 minutes):
- Option A: Hotfix and redeploy
- Option B: Disable feature via feature flag
- Option C: Rollback to previous version

**Communication**:
- Notify dispatch team if affects courier availability
- Send status update to support team
- Document incident for post-mortem

---

### High Error Rate on Next-Order: 15% No Orders Available

**Immediate Actions**:
1. Alert dispatching team
2. Review order assignment queue
3. Check if orders are being cancelled before assignment

**Investigation**:
- [ ] Are orders being created?
- [ ] Are they being assigned to couriers?
- [ ] Why are they not ASSIGNED status?

**Resolution**:
- Escalate to dispatcher to manually assign orders
- Investigate order creation flow
- Check for stuck orders in PENDING status

---

## Rollback Procedure

If production issues require rollback:

```bash
# Option 1: Git rollback
git revert <commit-hash>
pnpm --filter @turon/backend build
pnpm --filter @turon/miniapp build
# Deploy containers

# Option 2: Feature flag disable
export SPRINT_2_1_ENABLED=false
# Restart services

# Option 3: Full rollback to previous tag
git checkout <previous-tag>
# Follow standard deployment procedure
```

**Expected Downtime**: 5-10 minutes  
**Data Loss Risk**: None (no database changes)  
**User Impact**: Couriers see fallback "back to list" button only

---

## Post-Incident Review (48 hours after go-live)

### Questions to Answer:
1. What was the error rate trend? Stable? Trending down?
2. Did users experience completion panel correctly?
3. How many couriers used auto-next vs fallback?
4. Were there any unexpected edge cases?
5. Did monitoring alerts work as expected?

### Metrics to Analyze:
- Peak error rate vs sustained error rate
- User engagement with new feature
- Order fulfillment velocity changes
- Customer satisfaction impact (if trackable)

### Actions:
- [ ] Document lessons learned
- [ ] Update this monitoring plan based on actual data
- [ ] Schedule optimization if needed
- [ ] Plan for SPRINT 2.2 (queue management improvements)

---

## Success Criteria (48 hours)

✅ **Availability**: 99.9%+ uptime (max 4 minutes downtime)  
✅ **Error Rate**: <1% on both endpoints  
✅ **Performance**: <500ms p95 response time  
✅ **Adoption**: >60% of couriers using auto-next feature  
✅ **Satisfaction**: No increase in support tickets  

---

## Contacts

- **On-Call Engineer**: [Phone/Slack]
- **Backend Lead**: [Contact]
- **DevOps Team**: [Channel]
- **Dispatch Lead**: [Contact]
- **Support Team**: [Channel]

---

**Plan Created**: April 17, 2026  
**Status**: READY FOR PRODUCTION DEPLOYMENT  
**Review Date**: April 19, 2026 (48-hour post-launch)
