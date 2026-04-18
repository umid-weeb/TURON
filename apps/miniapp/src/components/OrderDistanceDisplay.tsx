import React from 'react';
import { estimateRouteMetrics, formatRouteDistance } from '../features/maps/route';

/**
 * OrderDistanceDisplay
 * Reusable component to show the distance from courier to destination.
 * Handles loading, missing data, and formatting.
 *
 * Props:
 * - courier: { latitude: number, longitude: number } | undefined
 * - destination: { latitude: number, longitude: number } | undefined
 * - label?: string (optional, e.g. 'Buyurtmagacha masofa' or 'Qolgan masofa')
 * - className?: string (optional)
 */
export const OrderDistanceDisplay: React.FC<{
  courier?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  label?: string;
  className?: string;
}> = ({ courier, destination, label = 'Masofa', className }) => {
  if (!courier || !destination) {
    return (
      <p className={className || 'mt-1 text-xs text-muted-foreground'}>
        {label}: <span className="italic">Hisoblanmoqda...</span>
      </p>
    );
  }
  const { distanceKm } = estimateRouteMetrics(
    { lat: courier.latitude, lng: courier.longitude },
    { lat: destination.latitude, lng: destination.longitude },
    { minimumDistanceKm: 0 }
  );
  return (
    <p className={className || 'mt-1 text-xs text-muted-foreground'}>
      {label}: <span className="font-bold">{formatRouteDistance(distanceKm)}</span>
    </p>
  );
};
