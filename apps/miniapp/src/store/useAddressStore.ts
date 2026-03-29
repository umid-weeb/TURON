import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Address } from '../data/types';

interface AddressState {
  savedAddresses: Address[];
  selectedAddressId: string | null;
  draftAddress: Partial<Address> | null;
  
  // Actions
  saveAddress: (address: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  selectAddress: (id: string | null) => void;
  updateDraft: (fields: Partial<Address>) => void;
  clearDraft: () => void;
  setInitialDraft: (address?: Address) => void;
  
  // Helpers
  getSelectedAddress: () => Address | undefined;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      savedAddresses: [],
      selectedAddressId: null,
      draftAddress: null,

      saveAddress: (addressData) => {
        const { savedAddresses } = get();
        const now = new Date().toISOString();
        
        if (addressData.id) {
          // Update existing
          const updatedAddresses = savedAddresses.map((a) =>
            a.id === addressData.id
              ? { ...a, ...addressData, updatedAt: now } as Address
              : a
          );
          set({ savedAddresses: updatedAddresses });
        } else {
          // Create new
          const newAddress: Address = {
            id: Math.random().toString(36).substring(2, 9),
            label: addressData.label || 'Manzil',
            addressText: addressData.addressText || '',
            latitude: addressData.latitude || 41.2995, // Default Tashkent
            longitude: addressData.longitude || 69.2401,
            note: addressData.note || '',
            isDefault: savedAddresses.length === 0, // First address is default
            createdAt: now,
            updatedAt: now,
          };
          set({ 
            savedAddresses: [...savedAddresses, newAddress],
            selectedAddressId: newAddress.id // Auto-select new address
          });
        }
      },

      deleteAddress: (id) => {
        const { savedAddresses, selectedAddressId } = get();
        set({
          savedAddresses: savedAddresses.filter((a) => a.id !== id),
          selectedAddressId: selectedAddressId === id ? null : selectedAddressId,
        });
      },

      selectAddress: (id) => set({ selectedAddressId: id }),

      updateDraft: (fields) => {
        const { draftAddress } = get();
        set({ draftAddress: { ...draftAddress, ...fields } });
      },

      clearDraft: () => set({ draftAddress: null }),

      setInitialDraft: (address) => {
        if (address) {
          set({ draftAddress: { ...address } });
        } else {
          set({ 
            draftAddress: { 
              label: 'Uy', 
              latitude: 41.2995, 
              longitude: 69.2401,
              addressText: '' 
            } 
          });
        }
      },

      getSelectedAddress: () => {
        const { savedAddresses, selectedAddressId } = get();
        return savedAddresses.find((a) => a.id === selectedAddressId);
      },
    }),
    {
      name: 'turon-address-storage',
    }
  )
);
