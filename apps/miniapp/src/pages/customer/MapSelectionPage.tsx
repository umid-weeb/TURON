import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronUp,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Target,
  X,
} from 'lucide-react';
import type { AddressCandidate, RouteInfo } from '../../features/maps/MapProvider';
import { formatGeolocationAccuracy, getUserGeolocationErrorMessage } from '../../features/maps/geolocation';
import { getMapProvider } from '../../features/maps/provider';
import { DEFAULT_RESTAURANT_LOCATION } from '../../features/maps/restaurant';
import { useCustomerLanguage } from '../../features/i18n/customerLocale';
import { useAddressStore } from '../../store/useAddressStore';

const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

const MapSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { draftAddress, updateDraft } = useAddressStore();
  const { language } = useCustomerLanguage();
  const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : null;
  const mapProvider = getMapProvider();
  const LocationPicker = mapProvider.LocationPicker;
  const skipNextSearchRef = React.useRef(false);
  const interactionEndTimeoutRef = React.useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<AddressCandidate[]>([]);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [resolvingSuggestionId, setResolvingSuggestionId] = React.useState<string | null>(null);
  const [searchFeedback, setSearchFeedback] = React.useState<string | null>(null);
  const [selectedPin, setSelectedPin] = React.useState({
    lat: draftAddress?.latitude || TASHKENT_CENTER.lat,
    lng: draftAddress?.longitude || TASHKENT_CENTER.lng,
  });
  const [resolvedAddress, setResolvedAddress] = React.useState(draftAddress?.addressText || '');
  const [isResolvingAddress, setIsResolvingAddress] = React.useState(false);
  const [isLocatingMe, setIsLocatingMe] = React.useState(false);
  const [locationHint, setLocationHint] = React.useState<string | null>(null);
  const [userLocationPin, setUserLocationPin] = React.useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const [showCompactInfo, setShowCompactInfo] = React.useState(true);

  const copy =
    language === 'ru'
      ? {
          title: 'Tochka dostavki',
          subtitle: 'Pin v centre. Dvigayte kartu pod nim.',
          searchPlaceholder: mapProvider.supportsAddressSearch
            ? 'Ulitsa, dom, orientir...'
            : 'Qidiruv hozircha mavjud emas',
          searching: 'Manzil qidirilmoqda...',
          noResults: 'Mos manzil topilmadi.',
          searchError: 'Manzil qidirishda xatolik yuz berdi.',
          geolocationUnsupported: 'Geolokatsiya qo‘llab-quvvatlanmaydi.',
          resolving: 'Manzil aniqlanmoqda...',
          selected: 'Tanlangan manzil',
          confirmBadge: 'Tasdiq',
          radius: 'Radius',
          distance: 'Masofa',
          eta: 'ETA',
          precision: 'Aniqlik',
          basedOnCurrent: 'Joriy joylashuv bo‘yicha markazlandi',
          confirm: 'Shu yerga yetkazilsin',
          calculating: 'Hisoblanmoqda',
          currentLocation: 'Joylashuvim',
          expand: 'Batafsil ko‘rish',
        }
      : {
          title: 'Yetkazish nuqtasi',
          subtitle: 'Pin markazda. Xarita ostidan suriladi.',
          searchPlaceholder: mapProvider.supportsAddressSearch
            ? "Ko'cha, uy, mo'ljal..."
            : "Qidiruv hozircha mavjud emas",
          searching: 'Manzil qidirilmoqda...',
          noResults: "Mos manzil topilmadi.",
          searchError: 'Manzil qidirishda xatolik yuz berdi.',
          geolocationUnsupported: "Geolokatsiya qo'llab-quvvatlanmaydi.",
          resolving: 'Manzil aniqlanmoqda...',
          selected: 'Tanlangan manzil',
          confirmBadge: 'Tasdiq',
          radius: 'Radius',
          distance: 'Masofa',
          eta: 'ETA',
          precision: 'Aniqlik',
          basedOnCurrent: 'Joriy joylashuv bo‘yicha markazlandi',
          confirm: 'Shu yerga yetkazilsin',
          calculating: 'Hisoblanmoqda',
          currentLocation: 'Joylashuvim',
          expand: 'Batafsil ko‘rish',
        };

  React.useEffect(() => {
    if (!draftAddress) {
      navigate('/customer/addresses', { replace: true, state: { returnTo } });
    }
  }, [draftAddress, navigate, returnTo]);

  React.useEffect(() => {
    let isCancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setIsResolvingAddress(true);
      const geocodedAddress = await mapProvider.reverseGeocode(selectedPin);

      if (!isCancelled) {
        setResolvedAddress(geocodedAddress || mapProvider.formatCoordinateAddress(selectedPin));
        setIsResolvingAddress(false);
        setShowCompactInfo(true);
      }
    }, 260);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mapProvider, selectedPin]);

  React.useEffect(() => {
    if (!mapProvider.supportsAddressSearch || !isSearchOpen) {
      setSearchResults([]);
      setSearchFeedback(null);
      setIsSearching(false);
      return;
    }

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery.length < 3) {
      setSearchResults([]);
      setSearchFeedback(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    setSearchFeedback(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await mapProvider.searchAddresses(normalizedQuery, 5, userLocationPin || selectedPin);

        if (isCancelled) {
          return;
        }

        setSearchResults(results);
        if (results.length === 0) {
          setSearchFeedback(copy.noResults);
        }
      } catch {
        if (!isCancelled) {
          setSearchResults([]);
          setSearchFeedback(copy.searchError);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 240);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [copy.noResults, copy.searchError, isSearchOpen, mapProvider, searchQuery, selectedPin, userLocationPin]);

  if (!draftAddress) {
    return null;
  }

  const displayAddress = resolvedAddress || mapProvider.formatCoordinateAddress(selectedPin);
  const compactAddress = displayAddress.split(',').slice(0, 2).join(', ').trim() || displayAddress;
  const compactDistance = routeInfo?.distance || copy.calculating;
  const compactEta = routeInfo?.eta || copy.calculating;

  const handleSearchPick = async (candidate: AddressCandidate) => {
    try {
      setResolvingSuggestionId(candidate.id);
      const resolvedCandidate = await mapProvider.resolveAddressCandidate(candidate);

      if (!resolvedCandidate.pin) {
        throw new Error("Tanlangan nuqtaning koordinatalari topilmadi.");
      }

      skipNextSearchRef.current = true;
      setSearchQuery(resolvedCandidate.address);
      setSearchResults([]);
      setSearchFeedback(null);
      setResolvedAddress(resolvedCandidate.address);
      setSelectedPin(resolvedCandidate.pin);
      setIsSearchOpen(false);
      setShowCompactInfo(true);
      setIsSheetExpanded(false);
    } catch (error) {
      setSearchFeedback((error as Error).message);
    } finally {
      setResolvingSuggestionId(null);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!mapProvider.supportsGeolocation) {
      setSearchFeedback(copy.geolocationUnsupported);
      return;
    }

    setIsLocatingMe(true);
    setSearchFeedback(null);
    setLocationHint(null);

    void mapProvider
      .detectUserLocation()
      .then((locationResult) => {
        setUserLocationPin(locationResult.pin);
        setSelectedPin(locationResult.pin);
        setSearchResults([]);
        setIsSearchOpen(false);
        setShowCompactInfo(true);
        setIsSheetExpanded(false);

        const accuracy = formatGeolocationAccuracy(locationResult.accuracy);
        setLocationHint(accuracy ? `${copy.precision}: ${accuracy}` : copy.basedOnCurrent);
      })
      .catch((locationError) => {
        setSearchFeedback(getUserGeolocationErrorMessage(locationError));
      })
      .finally(() => {
        setIsLocatingMe(false);
      });
  };

  const handleConfirm = () => {
    updateDraft({
      latitude: selectedPin.lat,
      longitude: selectedPin.lng,
      addressText: displayAddress,
    });
    navigate('/customer/address/new', { state: { returnTo } });
  };

  const handleMapInteractionStart = () => {
    if (interactionEndTimeoutRef.current) {
      window.clearTimeout(interactionEndTimeoutRef.current);
      interactionEndTimeoutRef.current = null;
    }

    setIsSearchOpen(false);
    setIsSheetExpanded(false);
    setShowCompactInfo(false);
    setSearchResults([]);
  };

  const handleMapInteractionEnd = () => {
    interactionEndTimeoutRef.current = window.setTimeout(() => {
      setShowCompactInfo(true);
      interactionEndTimeoutRef.current = null;
    }, 120);
  };

  React.useEffect(
    () => () => {
      if (interactionEndTimeoutRef.current) {
        window.clearTimeout(interactionEndTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-950 text-white animate-in fade-in duration-500">
      <div className="relative h-full">
        <LocationPicker
          initialCenter={selectedPin}
          onLocationSelect={setSelectedPin}
          onRouteInfoChange={setRouteInfo}
          onInteractionStart={handleMapInteractionStart}
          onInteractionEnd={handleMapInteractionEnd}
          userLocationPin={userLocationPin}
          restaurantLocationPin={DEFAULT_RESTAURANT_LOCATION.pin}
          height="100%"
          className="rounded-none border-0"
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.4)_0%,rgba(2,6,23,0.04)_22%,rgba(2,6,23,0)_50%,rgba(2,6,23,0.48)_100%)]" />

        <div className="absolute left-4 right-4 top-4 z-30">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/78 text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="rounded-full bg-slate-950/72 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/78 backdrop-blur-md">
              {copy.title}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocatingMe}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/78 text-white shadow-lg backdrop-blur-md transition-transform active:scale-95 disabled:opacity-60"
                aria-label={copy.currentLocation}
              >
                {isLocatingMe ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((current) => !current);
                  setSearchFeedback(null);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/78 text-white shadow-lg backdrop-blur-md transition-transform active:scale-95"
                aria-label="Manzil qidirish"
              >
                {isSearchOpen ? <X size={18} /> : <Search size={18} />}
              </button>
            </div>
          </div>

          {isSearchOpen ? (
            <div className="mt-3 rounded-[18px] bg-slate-950/88 p-3 shadow-2xl backdrop-blur-xl">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/38" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  disabled={!mapProvider.supportsAddressSearch}
                  placeholder={copy.searchPlaceholder}
                  className="h-11 w-full rounded-[14px] border border-white/8 bg-white/8 pl-11 pr-4 text-sm font-bold text-white placeholder:text-white/34 outline-none"
                />
              </div>

              {isSearching ? (
                <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-white/8 px-4 py-3 text-sm font-bold text-white/72">
                  <Loader2 size={15} className="animate-spin" />
                  <span>{copy.searching}</span>
                </div>
              ) : null}

              {!isSearching && searchResults.length > 0 ? (
                <div className="mt-3 max-h-[200px] space-y-2 overflow-y-auto pr-1">
                  {searchResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        void handleSearchPick(candidate);
                      }}
                      disabled={Boolean(resolvingSuggestionId)}
                      className="flex w-full items-start gap-3 rounded-[14px] bg-white/8 px-3 py-3 text-left transition-colors active:bg-white/12 disabled:opacity-60"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#ffd600] text-slate-950">
                        {resolvingSuggestionId === candidate.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <MapPin size={14} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{candidate.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/62">
                          {candidate.subtitle ? `${candidate.subtitle}, ${candidate.address}` : candidate.address}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {!isSearching && searchFeedback ? (
                <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-amber-400/12 px-4 py-3 text-sm font-bold text-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{searchFeedback}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
          <div className="mx-auto max-w-[430px]">
            <button
              type="button"
              onClick={() => setIsSheetExpanded((current) => !current)}
              className="mx-auto mb-1.5 flex h-5 w-14 items-center justify-center rounded-full bg-slate-950/52 text-white/60 backdrop-blur-md"
              aria-label={copy.expand}
            >
              <ChevronUp
                size={16}
                className={`transition-transform ${isSheetExpanded ? '' : 'rotate-180'}`}
              />
            </button>

            {showCompactInfo ? (
              <div
                className={`overflow-hidden rounded-[22px] border border-white/8 bg-[#171717]/94 shadow-[0_-20px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all ${
                  isSheetExpanded ? 'px-4 pb-3.5 pt-3.5' : 'px-3 py-2.5'
                }`}
              >
                {isSheetExpanded ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                          {copy.selected}
                        </p>
                        {isResolvingAddress ? (
                          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-white/70">
                            <Loader2 size={14} className="animate-spin" />
                            <span>{copy.resolving}</span>
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[14px] font-black leading-5 text-white">{displayAddress}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isResolvingAddress || isLocatingMe}
                        className="shrink-0 rounded-full bg-[#ffd600] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
                      >
                        {copy.confirmBadge}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <InfoTile label={copy.radius} value="50m" tone="amber" icon={<Target size={14} />} />
                      <InfoTile label={copy.distance} value={compactDistance} tone="slate" icon={<Target size={14} />} />
                      <InfoTile label={copy.eta} value={compactEta} tone="emerald" icon={<MapPin size={14} />} />
                    </div>

                    <div className="mt-2.5 rounded-[14px] bg-white/6 px-3 py-2.5 text-[13px] leading-5 text-white/68">
                      Nuqta taxminan 50 metr aniqlik bilan saqlanadi.
                      {locationHint ? <span className="mt-1 block text-[11px] font-bold text-emerald-300">{locationHint}</span> : null}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isResolvingAddress || isLocatingMe}
                      className="mt-2.5 flex h-11 w-full items-center justify-center gap-3 rounded-[14px] bg-[#ffd600] text-[15px] font-black text-slate-950 transition-transform active:scale-[0.985] disabled:opacity-60"
                    >
                      <Check size={18} />
                      <span>{copy.confirm}</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-white">
                        {isResolvingAddress ? copy.resolving : compactAddress}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2.5 text-[10px] font-bold text-white/58">
                        <span>{compactDistance}</span>
                        <span>{compactEta}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSheetExpanded(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white"
                      aria-label={copy.expand}
                    >
                      <ChevronUp size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isResolvingAddress || isLocatingMe}
                      className="flex h-9 items-center justify-center rounded-full bg-[#ffd600] px-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-60"
                    >
                      {copy.confirmBadge}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoTile: React.FC<{
  label: string;
  value: string;
  tone: 'amber' | 'emerald' | 'slate';
  icon: React.ReactNode;
}> = ({ label, value, tone, icon }) => {
  const toneClass =
    tone === 'amber'
      ? 'bg-[#ffd600] text-slate-950'
      : tone === 'emerald'
        ? 'bg-emerald-400/18 text-emerald-300'
        : 'bg-white/10 text-white';

  return (
    <div className="rounded-[14px] bg-white/6 px-3 py-2.5">
      <div className={`flex h-7 w-7 items-center justify-center rounded-[10px] ${toneClass}`}>{icon}</div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-1 text-[13px] font-black text-white">{value}</p>
    </div>
  );
};

export default MapSelectionPage;
