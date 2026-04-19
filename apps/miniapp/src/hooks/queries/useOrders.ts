import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type {
  AdminCourierOption,
  CourierOrderPreview,
  CourierStatusSummary,
  CourierTodayStats,
  Order,
  OrderQuote,
  OrderStatus,
  DeliveryStage,
  OrderTrackingState,
} from '../../data/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import { ORDER_TRACKING_FEATURE_ENABLED } from '../../features/tracking/config';
import {
  notifyCourierAssigned,
  notifyOrderCancelled,
  notifyOrderConfirmed,
  notifyOrderDelivered,
} from '../../features/notifications/notificationTriggers';

function resolveCourierStageActionPath(stage: DeliveryStage) {
  switch (stage) {
    case 'GOING_TO_RESTAURANT':
      return 'accept';
    case 'ARRIVED_AT_RESTAURANT':
      return 'arrived-restaurant';
    case 'PICKED_UP':
      return 'pickup';
    case 'DELIVERING':
      return 'start-delivery';
    case 'ARRIVED_AT_DESTINATION':
      return 'arrive-destination';
    case 'DELIVERED':
      return 'deliver';
    default:
      throw new Error("Kuryer bosqichi uchun endpoint topilmadi");
  }
}

function sortOrders(orders: Order[]) {
  return [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildQuoteItemsKey(items: Array<{ menuItemId: string; quantity: number }>) {
  return items
    .map((item) => `${item.menuItemId}:${item.quantity}`)
    .sort()
    .join('|');
}

function mergeOrderIntoCollection(orders: Order[] | undefined, updatedOrder: Order) {
  const currentOrders = orders ? [...orders] : [];
  const existingIndex = currentOrders.findIndex((order) => order.id === updatedOrder.id);

  if (existingIndex >= 0) {
    currentOrders[existingIndex] = updatedOrder;
    return sortOrders(currentOrders);
  }

  return sortOrders([updatedOrder, ...currentOrders]);
}

function removeOrderFromCollection(orders: Order[] | undefined, orderId: string) {
  if (!orders?.length) {
    return orders;
  }

  return orders.filter((order) => order.id !== orderId);
}

function mergeTrackingState(
  currentTracking: OrderTrackingState | undefined,
  incomingTracking: OrderTrackingState,
): OrderTrackingState {
  return {
    ...currentTracking,
    ...incomingTracking,
    courierLocation: incomingTracking.courierLocation
      ? {
          ...currentTracking?.courierLocation,
          ...incomingTracking.courierLocation,
        }
      : currentTracking?.courierLocation,
  };
}

function mergeTrackingIntoCollection(
  orders: Order[] | undefined,
  orderId: string,
  tracking: OrderTrackingState,
) {
  if (!orders?.length) {
    return orders;
  }

  return orders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          tracking: mergeTrackingState(order.tracking, tracking),
        }
      : order,
  );
}

function mergeCourierPreview(
  previews: CourierOrderPreview[] | undefined,
  updatedOrder: Order,
) {
  const nextPreview: CourierOrderPreview = {
    id: updatedOrder.id,
    assignmentId: null,
    orderNumber: updatedOrder.orderNumber,
    orderStatus: updatedOrder.orderStatus,
    deliveryStage: updatedOrder.deliveryStage,
    courierAssignmentStatus: updatedOrder.courierAssignmentStatus,
    total: updatedOrder.total,
    deliveryFee: updatedOrder.deliveryFee,
    paymentMethod: updatedOrder.paymentMethod,
    restaurantName: 'Turon Kafesi',
    distanceToRestaurantMeters: null,
    etaToRestaurantMinutes: updatedOrder.deliveryEtaMinutes ?? null,
    customerName: updatedOrder.customerName || 'Mijoz',
    destinationAddress: updatedOrder.customerAddress?.addressText || 'Manzil ko\'rsatilmagan',
    destinationArea:
      updatedOrder.customerAddress?.addressText?.split(',')[0]?.trim() || "Manzil ko'rsatilmagan",
    createdAt: updatedOrder.createdAt,
    itemCount: updatedOrder.items.length,
    latestCourierEventType: updatedOrder.courierLastEventType ?? null,
  };

  if (!previews?.length) {
    return [nextPreview];
  }

  const existingIndex = previews.findIndex((preview) => preview.id === updatedOrder.id);

  if (existingIndex >= 0) {
    return previews.map((preview) => (preview.id === updatedOrder.id ? { ...preview, ...nextPreview } : preview));
  }

  return [nextPreview, ...previews];
}

function shouldIncludeCourierPreview(order: Order) {
  return (
    Boolean(order.courierId) &&
    order.orderStatus !== 'CANCELLED' &&
    ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING', 'DELIVERED'].includes(
      order.courierAssignmentStatus || '',
    )
  );
}

function removeCourierPreview(
  previews: CourierOrderPreview[] | undefined,
  orderId: string,
) {
  if (!previews?.length) {
    return previews;
  }

  return previews.filter((preview) => preview.id !== orderId);
}

function useSyncOrdersStore(orders: Order[] | undefined) {
  const upsertOrders = useOrdersStore((state) => state.upsertOrders);

  useEffect(() => {
    if (!orders?.length) {
      return;
    }

    upsertOrders(orders);
  }, [orders, upsertOrders]);
}

function useSyncOrderStore(order: Order | undefined) {
  const upsertOrder = useOrdersStore((state) => state.upsertOrder);

  useEffect(() => {
    if (!order) {
      return;
    }

    upsertOrder(order);
  }, [order, upsertOrder]);
}

function applyOrderUpdateToCaches(
  queryClient: QueryClient,
  updatedOrder: Order,
  upsertOrder: (order: Order) => void,
) {
  queryClient.setQueryData(['order', updatedOrder.id], updatedOrder);
  queryClient.setQueryData<Order[]>(['my-orders'], (current) =>
    mergeOrderIntoCollection(current, updatedOrder),
  );
  queryClient.setQueryData<Order[]>(['admin-orders'], (current) =>
    mergeOrderIntoCollection(current, updatedOrder),
  );
  queryClient.setQueryData<Order>(['courier-order', updatedOrder.id], updatedOrder);

  if (shouldIncludeCourierPreview(updatedOrder)) {
    queryClient.setQueryData<CourierOrderPreview[]>(['courier-orders'], (current) =>
      mergeCourierPreview(current, updatedOrder),
    );
  } else {
    queryClient.setQueryData<CourierOrderPreview[]>(['courier-orders'], (current) =>
      removeCourierPreview(current, updatedOrder.id),
    );
  }

  upsertOrder(updatedOrder);
}

function applyTrackingUpdateToCaches(
  queryClient: QueryClient,
  orderId: string,
  tracking: OrderTrackingState,
  updateOrderTracking: (orderId: string, tracking: OrderTrackingState) => void,
) {
  queryClient.setQueryData<Order>(['order', orderId], (current) =>
    current
      ? {
          ...current,
          tracking: mergeTrackingState(current.tracking, tracking),
        }
      : current,
  );
  queryClient.setQueryData<Order>(['courier-order', orderId], (current) =>
    current
      ? {
          ...current,
          tracking: mergeTrackingState(current.tracking, tracking),
        }
      : current,
  );
  queryClient.setQueryData<Order[]>(['my-orders'], (current) =>
    mergeTrackingIntoCollection(current, orderId, tracking),
  );
  queryClient.setQueryData<Order[]>(['admin-orders'], (current) =>
    mergeTrackingIntoCollection(current, orderId, tracking),
  );
  updateOrderTracking(orderId, tracking);
}

function removeOrderFromLiveCollections(
  queryClient: QueryClient,
  orderId: string,
) {
  queryClient.setQueryData<Order[]>(['my-orders'], (current) => removeOrderFromCollection(current, orderId));
  queryClient.setQueryData<Order[]>(['admin-orders'], (current) => removeOrderFromCollection(current, orderId));
  queryClient.setQueryData<CourierOrderPreview[]>(['courier-orders'], (current) =>
    removeCourierPreview(current, orderId),
  );
  queryClient.setQueryData<Order | undefined>(['courier-order', orderId], undefined);
}

function notifyAboutOrderChanges(previousOrder: Order | undefined, updatedOrder: Order) {
  if (previousOrder?.orderStatus !== updatedOrder.orderStatus) {
    if (updatedOrder.orderStatus === 'PREPARING') {
      notifyOrderConfirmed(updatedOrder.id, updatedOrder.orderNumber);
    }

    if (updatedOrder.orderStatus === 'DELIVERED') {
      notifyOrderDelivered(updatedOrder.id, updatedOrder.orderNumber);
    }

    if (updatedOrder.orderStatus === 'CANCELLED') {
      notifyOrderCancelled(updatedOrder.id, updatedOrder.orderNumber, 'Admin tomonidan bekor qilindi');
    }
  }

  if (
    updatedOrder.courierId &&
    updatedOrder.courierName &&
    previousOrder?.courierId !== updatedOrder.courierId
  ) {
    notifyCourierAssigned(updatedOrder.id, updatedOrder.orderNumber, updatedOrder.courierName);
  }
}

function invalidateOrderQueries(queryClient: QueryClient, orderId: string) {
  queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  queryClient.invalidateQueries({ queryKey: ['my-orders'] });
  queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
  queryClient.invalidateQueries({ queryKey: ['courier-status'] });
  queryClient.invalidateQueries({ queryKey: ['courier-stats-today'] });
  queryClient.invalidateQueries({ queryKey: ['order', orderId] });
  queryClient.invalidateQueries({ queryKey: ['courier-order', orderId] });
}

export const useMyOrders = () => {
  const query = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: async () => (await api.get('/orders/my')) as Order[],
  });

  useSyncOrdersStore(query.data);

  return query;
};

export const useOrderDetails = (id: string) => {
  const query = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)) as Order,
    enabled: !!id,
  });

  useSyncOrderStore(query.data);

  return query;
};

export const useOrderQuote = ({
  items,
  deliveryAddressId,
  promoCode,
  enabled = true,
}: {
  items: Array<{ menuItemId: string; quantity: number }>;
  deliveryAddressId?: string | null;
  promoCode?: string;
  enabled?: boolean;
}) => {
  const hasOnlyValidItemIds = items.every((item) => isUuid(item.menuItemId));

  return useQuery<OrderQuote>({
    queryKey: ['order-quote', deliveryAddressId || 'none', promoCode || 'none', buildQuoteItemsKey(items)],
    enabled: enabled && items.length > 0 && Boolean(deliveryAddressId) && hasOnlyValidItemIds,
    queryFn: async () =>
      (await api.post('/orders/quote', {
        items,
        deliveryAddressId,
        promoCode,
      })) as OrderQuote,
    staleTime: 30_000,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) =>
      (await api.post('/orders', data, {
        timeout: 35000,
      })) as Order,
    onSuccess: (createdOrder: Order) => {
      queryClient.setQueryData<Order[]>(['my-orders'], (current = []) => [
        createdOrder,
        ...current.filter((order) => order.id !== createdOrder.id),
      ]);
      queryClient.setQueryData<Order>(['order', createdOrder.id], createdOrder);
      useOrdersStore.getState().upsertOrder(createdOrder);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const request = () =>
        api.patch(`/orders/${id}/status`, { status }, { timeout: 30000 }) as Promise<Order>;

      try {
        return await request();
      } catch (error) {
        const isConnectivityIssue =
          error instanceof Error &&
          error.message.includes('Server bilan aloqa uzildi');

        if (!isConnectivityIssue) {
          throw error;
        }

        // Retry once for transient Telegram WebView/mobile network hiccups.
        await new Promise((resolve) => setTimeout(resolve, 900));

        try {
          return await request();
        } catch (retryError) {
          // Fallback: if backend actually processed the update but response was lost,
          // confirm current order state and treat as success when statuses match.
          try {
            const latestOrder = (await api.get(`/orders/${id}`)) as Order;
            if (latestOrder.orderStatus === status) {
              return latestOrder;
            }
          } catch {
            // Keep original network error semantics.
          }

          throw retryError;
        }
      }
    },
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useConfirmOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(`/orders/${id}/confirm`, undefined, { timeout: 30000 }) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useAdminOrders = () => {
  const query = useQuery<Order[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => (await api.get('/orders')) as Order[],
  });

  useSyncOrdersStore(query.data);

  return query;
};

export const useAdminCouriers = (enabled = true) => {
  return useQuery<AdminCourierOption[]>({
    queryKey: ['admin-couriers'],
    queryFn: async () => (await api.get('/orders/courier-options')) as AdminCourierOption[],
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
};

export const useCourierOrders = () => {
  return useQuery<CourierOrderPreview[]>({
    queryKey: ['courier-orders'],
    queryFn: async () => (await api.get('/courier/orders')) as CourierOrderPreview[],
    // Poll every 30 s as a fallback in case an SSE push is missed
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
};

export const useCourierStatus = () => {
  return useQuery<CourierStatusSummary>({
    queryKey: ['courier-status'],
    queryFn: async () => (await api.get('/courier/me/status')) as CourierStatusSummary,
  });
};

export const useCourierTodayStats = () => {
  return useQuery<CourierTodayStats>({
    queryKey: ['courier-stats-today'],
    queryFn: async () => (await api.get('/courier/stats/today')) as CourierTodayStats,
  });
};

export const useUpdateCourierStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { isOnline?: boolean; isAcceptingOrders?: boolean }) =>
      api.patch('/courier/me/status', payload) as Promise<CourierStatusSummary>,
    onSuccess: (updatedStatus) => {
      queryClient.setQueryData(['courier-status'], updatedStatus);
      queryClient.invalidateQueries({ queryKey: ['courier-status'] });
      queryClient.invalidateQueries({ queryKey: ['courier-stats-today'] });
      queryClient.invalidateQueries({ queryKey: ['admin-couriers'] });
    },
  });
};

export const useCourierOrderDetails = (id: string) => {
  const query = useQuery<Order>({
    queryKey: ['courier-order', id],
    queryFn: async () => (await api.get(`/courier/order/${id}`)) as Order,
    enabled: !!id,
  });

  useSyncOrderStore(query.data);

  return query;
};

export const useUpdateCourierOrderStage = () => {
  const queryClient = useQueryClient();
  // One stable key per hook instance — all rapid taps share the same key,
  // so the backend processes only the first and returns the cached response for the rest.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DeliveryStage }) =>
      api.post(
        `/courier/order/${id}/${resolveCourierStageActionPath(stage)}`,
        undefined,
        { headers: { 'Idempotency-Key': idempotencyKeyRef.current } },
      ) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      // Rotate key so the next stage action gets a fresh idempotency scope
      idempotencyKeyRef.current = crypto.randomUUID();

      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useDeclineCourierOrder = () => {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(
        `/courier/order/${id}/decline`,
        undefined,
        { headers: { 'Idempotency-Key': idempotencyKeyRef.current } },
      ) as Promise<{ success: boolean; orderId: string }>,
    onSuccess: (_result, { id }) => {
      idempotencyKeyRef.current = crypto.randomUUID();

      // Remove from courier orders cache immediately — courier no longer owns this order
      queryClient.setQueryData<CourierOrderPreview[]>(
        ['courier-orders'],
        (current) => current?.filter((o) => o.id !== id) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ['courier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-status'] });
    },
  });
};

export const useReportCourierProblem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post(`/courier/order/${id}/problem`, { text }) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useUpdateCourierLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      latitude,
      longitude,
      heading,
      speedKmh,
      remainingDistanceKm,
      remainingEtaMinutes,
    }: {
      id: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speedKmh?: number;
      remainingDistanceKm?: number;
      remainingEtaMinutes?: number;
    }) => {
      if (!ORDER_TRACKING_FEATURE_ENABLED) {
        return Promise.resolve({ orderId: id, tracking: undefined });
      }

      return api.patch(`/courier/order/${id}/location`, {
        latitude,
        longitude,
        heading,
        speedKmh,
        remainingDistanceKm,
        remainingEtaMinutes,
      }) as Promise<{ orderId: string; tracking?: OrderTrackingState }>;
    },
    onSuccess: (result, variables) => {
      if (!result.tracking) {
        return;
      }

      queryClient.setQueryData<Order>(['courier-order', variables.id], (current) =>
        current
          ? {
              ...current,
              tracking: mergeTrackingState(current.tracking, result.tracking!),
            }
          : current,
      );
      queryClient.setQueryData<Order>(['order', variables.id], (current) =>
        current
          ? {
              ...current,
              tracking: mergeTrackingState(current.tracking, result.tracking!),
            }
          : current,
      );
      queryClient.setQueryData<Order[]>(['my-orders'], (current) =>
        mergeTrackingIntoCollection(current, variables.id, result.tracking!),
      );
      queryClient.setQueryData<Order[]>(['admin-orders'], (current) =>
        mergeTrackingIntoCollection(current, variables.id, result.tracking!),
      );
      useOrdersStore.getState().updateOrderTracking(variables.id, result.tracking);
    },
  });
};

export const useAssignCourierToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, courierId }: { id: string; courierId: string }) =>
      api.post(`/orders/${id}/dispatch`, { courierId }) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useApproveOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/orders/${id}/payment/approve`) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

export const useRejectOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/orders/${id}/payment/reject`, reason ? { reason } : {}) as Promise<Order>,
    onSuccess: (updatedOrder) => {
      const previousOrder = useOrdersStore.getState().getOrderById(updatedOrder.id);
      const { upsertOrder } = useOrdersStore.getState();

      applyOrderUpdateToCaches(queryClient, updatedOrder, upsertOrder);
      notifyAboutOrderChanges(previousOrder, updatedOrder);
      invalidateOrderQueries(queryClient, updatedOrder.id);
    },
  });
};

type TrackingConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface TrackingStreamEvent {
  type: 'snapshot' | 'order.updated' | 'courier.location' | 'order.removed';
  orderId: string;
  order?: Order;
  tracking?: OrderTrackingState;
}

export const useOrdersRealtimeSync = (enabled = true) => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const updateOrderTracking = useOrdersStore((state) => state.updateOrderTracking);
  const upsertOrder = useOrdersStore((state) => state.upsertOrder);
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>(
    enabled && ORDER_TRACKING_FEATURE_ENABLED ? 'connecting' : 'idle',
  );

  useEffect(() => {
    if (!ORDER_TRACKING_FEATURE_ENABLED || !enabled || !token) {
      setConnectionState('idle');
      return;
    }

    const streamUrl = `${api.defaults.baseURL}/orders/stream`;
    const abortController = new AbortController();
    let reconnectTimer: number | null = null;
    let isDisposed = false;

    const scheduleReconnect = () => {
      if (isDisposed || reconnectTimer) {
        return;
      }

      setConnectionState('reconnecting');
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, 3000);
    };

    const processChunk = (chunk: string) => {
      const dataLines = chunk
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());

      if (!dataLines.length) {
        return;
      }

      const payload = JSON.parse(dataLines.join('\n')) as TrackingStreamEvent;

      if (payload.type === 'order.removed') {
        removeOrderFromLiveCollections(queryClient, payload.orderId);
        return;
      }

      if (payload.order) {
        applyOrderUpdateToCaches(queryClient, payload.order, upsertOrder);
      }

      if (payload.tracking) {
        applyTrackingUpdateToCaches(queryClient, payload.orderId, payload.tracking, updateOrderTracking);
      }
    };

    const connect = async () => {
      setConnectionState((current) => (current === 'reconnecting' ? current : 'connecting'));

      try {
        const response = await fetch(streamUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Order stream ulanmagan');
        }

        setConnectionState('connected');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isDisposed) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf('\n\n');
          while (boundaryIndex >= 0) {
            const chunk = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            if (chunk.trim()) {
              processChunk(chunk);
            }

            boundaryIndex = buffer.indexOf('\n\n');
          }
        }

        if (!isDisposed) {
          scheduleReconnect();
        }
      } catch (error) {
        if (abortController.signal.aborted || isDisposed) {
          return;
        }

        setConnectionState('error');
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      isDisposed = true;
      abortController.abort();

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [enabled, queryClient, token, updateOrderTracking, upsertOrder]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
  };
};

export const useOrderTrackingStream = (orderId: string, enabled = true) => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const updateOrderTracking = useOrdersStore((state) => state.updateOrderTracking);
  const upsertOrder = useOrdersStore((state) => state.upsertOrder);
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>(
    enabled && orderId && ORDER_TRACKING_FEATURE_ENABLED ? 'connecting' : 'idle',
  );

  useEffect(() => {
    if (!ORDER_TRACKING_FEATURE_ENABLED || !enabled || !orderId || !token) {
      setConnectionState('idle');
      return;
    }

    const streamUrl = `${api.defaults.baseURL}/orders/${orderId}/tracking/stream`;
    const abortController = new AbortController();
    let reconnectTimer: number | null = null;
    let isDisposed = false;

    const scheduleReconnect = () => {
      if (isDisposed || reconnectTimer) {
        return;
      }

      setConnectionState('reconnecting');
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, 3000);
    };

    const processChunk = (chunk: string) => {
      const dataLines = chunk
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());

      if (!dataLines.length) {
        return;
      }

      const payload = JSON.parse(dataLines.join('\n')) as TrackingStreamEvent;

      if (payload.order) {
        applyOrderUpdateToCaches(queryClient, payload.order, upsertOrder);
      }

      if (payload.tracking) {
        applyTrackingUpdateToCaches(queryClient, orderId, payload.tracking, updateOrderTracking);
      }
    };

    const connect = async () => {
      setConnectionState((current) => (current === 'reconnecting' ? current : 'connecting'));

      try {
        const response = await fetch(streamUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Tracking stream ulanmagan');
        }

        setConnectionState('connected');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isDisposed) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf('\n\n');
          while (boundaryIndex >= 0) {
            const chunk = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            if (chunk.trim()) {
              processChunk(chunk);
            }

            boundaryIndex = buffer.indexOf('\n\n');
          }
        }

        if (!isDisposed) {
          scheduleReconnect();
        }
      } catch (error) {
        if (abortController.signal.aborted || isDisposed) {
          return;
        }

        setConnectionState('error');
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      isDisposed = true;
      abortController.abort();

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [enabled, orderId, queryClient, token, updateOrderTracking, upsertOrder]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
  };
};
