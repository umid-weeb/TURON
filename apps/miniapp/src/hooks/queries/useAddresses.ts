import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Address } from '../../data/types';
import { getUserGeolocationErrorMessage } from '../../features/maps/geolocation';
import { getMapProvider } from '../../features/maps/provider';
import { useAddressStore } from '../../store/useAddressStore';

export interface AddressPayload {
  title?: string;
  address: string;
  note?: string;
  latitude: number;
  longitude: number;
}

interface AutoDetectAddressInput {
  currentAddresses?: Address[];
  preferredLabel?: string;
}

interface AutoDetectAddressResult {
  address: Address;
  wasCreated: boolean;
  hint: string;
}

const AUTO_ADDRESS_MATCH_DISTANCE_METERS = 40;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(right.latitude - left.latitude);
  const lngDelta = toRadians(right.longitude - left.longitude);
  const fromLat = toRadians(left.latitude);
  const toLat = toRadians(right.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return Math.max(
    0,
    Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))),
  );
}

function normalizeAddressText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findMatchingSavedAddress(
  addresses: Address[],
  detectedAddressText: string,
  pin: { lat: number; lng: number },
) {
  const normalizedDetectedAddress = normalizeAddressText(detectedAddressText);

  return (
    addresses.find((address) => {
      const normalizedSavedAddress = normalizeAddressText(address.addressText);
      if (normalizedSavedAddress && normalizedSavedAddress === normalizedDetectedAddress) {
        return true;
      }

      const distanceMeters = haversineDistanceMeters(
        { latitude: address.latitude, longitude: address.longitude },
        { latitude: pin.lat, longitude: pin.lng },
      );

      return distanceMeters <= AUTO_ADDRESS_MATCH_DISTANCE_METERS;
    }) || null
  );
}

export const useAddresses = () => {
  return useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get('/addresses')) as Address[],
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddressPayload) => (await api.post('/addresses', data)) as Address,
    onSuccess: (createdAddress: Address) => {
      queryClient.setQueryData<Address[]>(['addresses'], (current = []) => [
        createdAddress,
        ...current.filter((address) => address.id !== createdAddress.id),
      ]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
};

export const useAutoDetectAndSaveAddress = () => {
  const queryClient = useQueryClient();
  const selectAddress = useAddressStore((state) => state.selectAddress);

  return useMutation<AutoDetectAddressResult, Error, AutoDetectAddressInput | undefined>({
    mutationFn: async (input) => {
      const mapProvider = getMapProvider();

      if (!mapProvider.supportsGeolocation) {
        throw new Error("Joylashuvni avtomatik aniqlash hozircha mavjud emas.");
      }

      try {
        const location = await mapProvider.detectUserLocation();
        let resolvedAddress = '';

        try {
          resolvedAddress = (await mapProvider.reverseGeocode(location.pin))?.trim() || '';
        } catch {
          resolvedAddress = '';
        }

        const addressText = resolvedAddress || mapProvider.formatCoordinateAddress(location.pin);
        const currentAddresses = input?.currentAddresses ?? [];
        const matchingAddress = findMatchingSavedAddress(currentAddresses, addressText, location.pin);

        if (matchingAddress) {
          return {
            address: matchingAddress,
            wasCreated: false,
            hint: "Saqlangan manzil tanlandi.",
          };
        }

        const createdAddress = (await api.post('/addresses', {
          title: input?.preferredLabel || (currentAddresses.length === 0 ? 'Uy' : 'Boshqa'),
          address: addressText,
          latitude: location.pin.lat,
          longitude: location.pin.lng,
        })) as Address;

        return {
          address: createdAddress,
          wasCreated: true,
          hint: "Joriy joylashuv saqlandi.",
        };
      } catch (error) {
        throw new Error(getUserGeolocationErrorMessage(error));
      }
    },
    onSuccess: (result) => {
      selectAddress(result.address.id);
      queryClient.setQueryData<Address[]>(['addresses'], (current = []) => {
        const withoutCurrent = current.filter((address) => address.id !== result.address.id);
        return [result.address, ...withoutCurrent];
      });
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressPayload }) =>
      api.put(`/addresses/${id}`, data) as Promise<Address>,
    onSuccess: (updatedAddress: Address) => {
      queryClient.setQueryData<Address[]>(['addresses'], (current = []) =>
        current
          .map((address) => (address.id === updatedAddress.id ? updatedAddress : address))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/addresses/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Address[]>(['addresses'], (current = []) =>
        current.filter((address) => address.id !== deletedId),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
};
