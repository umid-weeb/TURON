import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Navigation, Target } from 'lucide-react';
import { useAddressStore } from '../../store/useAddressStore';
import MockMapComponent from '../../features/maps/components/MockMapComponent';

const MapSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { draftAddress, updateDraft } = useAddressStore();
  const [selectedPin, setSelectedPin] = useState({ 
    lat: draftAddress?.latitude || 41.2995, 
    lng: draftAddress?.longitude || 69.2401 
  });

  if (!draftAddress) {
    navigate('/customer/addresses');
    return null;
  }

  const handleConfirm = () => {
    updateDraft({
      latitude: selectedPin.lat,
      longitude: selectedPin.lng,
      // In a real app, reverse geocoding happens here or on component change
      addressText: draftAddress.addressText || `Xarita orqali tanlangan joy: ${selectedPin.lat.toFixed(4)}, ${selectedPin.lng.toFixed(4)}`
    });
    navigate(-1);
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-24 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Xaritadan tanlash</h2>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Pinni kerakli joyga qo'ying</p>
      </div>

      <div className="flex-1 relative min-h-[400px]">
        <MockMapComponent 
          initialCenter={selectedPin} 
          onLocationSelect={setSelectedPin}
          height="100%"
          className="rounded-[40px] shadow-2xl border-4 border-white"
        />
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest leading-none">
          <Target size={16} />
          <span>Tanlangan koordinatalar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 px-3 py-2 rounded-xl text-slate-900 font-bold text-sm">
            {selectedPin.lat.toFixed(6)}
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl text-slate-900 font-bold text-sm">
            {selectedPin.lng.toFixed(6)}
          </div>
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-6 z-40 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-2">
        <button 
          onClick={handleConfirm}
          className="w-full h-16 bg-amber-500 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-amber-200 active:bg-amber-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <Check size={24} />
          <span>Shu manzilni tanlash</span>
        </button>
      </div>
    </div>
  );
};

export default MapSelectionPage;
