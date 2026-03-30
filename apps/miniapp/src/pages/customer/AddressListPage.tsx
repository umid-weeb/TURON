import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, ChevronLeft } from 'lucide-react';
import { useAddressStore } from '../../store/useAddressStore';
import { AddressCard, AddressEmptyState } from '../../components/customer/AddressComponents';
import { AppButton } from '../../components/ui/GlobalComponents';

const AddressListPage: React.FC = () => {
  const navigate = useNavigate();
  const { savedAddresses, selectedAddressId, selectAddress, deleteAddress, setInitialDraft } = useAddressStore();

  const handleAddNew = () => {
    setInitialDraft();
    navigate('/customer/address/new');
  };

  const handleEdit = (id: string) => {
    const address = savedAddresses.find((a) => a.id === id);
    if (address) {
      setInitialDraft(address);
      navigate('/customer/address/new');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Ushbu manzilni o'chirib tashlamoqchimisiz?")) {
      deleteAddress(id);
    }
  };

  const handleSelect = (id: string) => {
    selectAddress(id);
    // Auto-navigate back to checkout if we came from there
    // For now just stay or go back
    if (window.history.length > 1) {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right duration-300">
      {/* Header section with Plus button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manzillarim</h2>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Yetkazib berish joyini tanlang</p>
        </div>
        <AppButton
          onClick={handleAddNew}
          variant="primary"
          size="md"
          className="w-12 h-12 p-0 rounded-2xl"
          icon={<Plus size={24} strokeWidth={3} />}
          aria-label="Yangi manzil qo'shish"
        />
      </div>

      {savedAddresses.length > 0 ? (
        <div className="space-y-4">
          {savedAddresses.map((address) => (
            <AddressCard 
              key={address.id}
              address={address}
              isSelected={selectedAddressId === address.id}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          
          <AppButton
            onClick={handleAddNew}
            variant="ghost"
            size="lg"
            className="w-full h-16 border-2 border-dashed border-slate-200 text-slate-400 mt-6"
            icon={<Plus size={20} />}
          >
            Yangi manzil qo'shish
          </AppButton>
        </div>
      ) : (
        <AddressEmptyState onAdd={handleAddNew} />
      )}
    </div>
  );
};

export default AddressListPage;
