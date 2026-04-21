// filepath: apps/miniapp/src/features/courier/proofOfDelivery.ts
/**
 * Proof of Delivery (POD) System
 * Validates and stores delivery confirmation with photo + GPS + OTP
 */

import { api } from '../../lib/api';

export interface DeliveryProof {
  orderId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  customerOtp?: string;
}

export interface ProofValidationResult {
  isValid: boolean;
  errors: string[];
  distanceFromDestinationMeters?: number;
}

/**
 * Validate GPS accuracy (must be within 100m of destination)
 */
export function validateGpsAccuracy(
  courierLat: number,
  courierLng: number,
  destinationLat: number,
  destinationLng: number,
  maxDistanceMeters: number = 100,
): ProofValidationResult {
  const errors: string[] = [];

  // Haversine formula
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(destinationLat - courierLat);
  const dLng = toRad(destinationLng - courierLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(courierLat)) * Math.cos(toRad(destinationLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;

  if (distanceMeters > maxDistanceMeters) {
    errors.push(`Mijoz manzilidan ${Math.round(distanceMeters)}m uzoq. Noto'g'ri joylashuvda bo'lmasligini tekshiring.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    distanceFromDestinationMeters: Math.round(distanceMeters),
  };
}

/**
 * Validate OTP if required by restaurant
 */
export function validateOtp(enteredOtp: string, correctOtp: string): ProofValidationResult {
  const errors: string[] = [];

  if (!enteredOtp || enteredOtp.trim() !== correctOtp.trim()) {
    errors.push('OTP noto\'g\'ri. Qayta urinib ko\'ring.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Submit delivery proof to backend
 */
export async function submitDeliveryProof(proof: DeliveryProof): Promise<{ success: boolean; orderId: string }> {
  try {
    await api.post(`/courier/order/${proof.orderId}/deliver`, {
      gpsLatitude: proof.latitude,
      gpsLongitude: proof.longitude,
      gpsAccuracy: proof.accuracy,
    });

    return {
      success: true,
      orderId: proof.orderId,
    };
  } catch (error) {
    throw new Error(`Topshirishda xatolik: ${error instanceof Error ? error.message : 'Noma\'lum xatolik'}`);
  }
}

/**
 * Get delivery proof history
 */
export async function getDeliveryProofs(orderId: string) {
  try {
    const response = await api.get(`/courier/orders/${orderId}/delivery-proofs`);
    return response;
  } catch (error) {
    throw new Error('POD tarixini olishda xatolik');
  }
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
