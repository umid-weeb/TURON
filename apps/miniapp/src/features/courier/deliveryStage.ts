import { DeliveryStage } from '../../data/types';

export type DeliveryStateKey = 'ACCEPTED' | 'ARRIVED' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED';

export const COURIER_STAGE_BUTTONS = [
  { key: 'accepted', label: 'Qabul qildim', target: DeliveryStage.GOING_TO_RESTAURANT },
  { key: 'arrived', label: 'Restoranga yetdim', target: DeliveryStage.ARRIVED_AT_RESTAURANT },
  { key: 'picked', label: 'Buyurtmani oldim', target: DeliveryStage.PICKED_UP },
  { key: 'delivering', label: 'Yetkazishni boshladim', target: DeliveryStage.DELIVERING },
  { key: 'delivered', label: 'Buyurtma topshirildi', target: DeliveryStage.DELIVERED },
] as const;

export function getDeliveryStateKey(stage: DeliveryStage = DeliveryStage.IDLE): DeliveryStateKey {
  switch (stage) {
    case DeliveryStage.ARRIVED_AT_RESTAURANT:
      return 'ARRIVED';
    case DeliveryStage.PICKED_UP:
      return 'PICKED_UP';
    case DeliveryStage.DELIVERING:
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return 'DELIVERING';
    case DeliveryStage.DELIVERED:
      return 'DELIVERED';
    case DeliveryStage.GOING_TO_RESTAURANT:
    case DeliveryStage.IDLE:
    default:
      return 'ACCEPTED';
  }
}

export function getCourierStageProgressIndex(stage: DeliveryStage = DeliveryStage.IDLE) {
  switch (stage) {
    case DeliveryStage.IDLE:
      return -1;
    case DeliveryStage.GOING_TO_RESTAURANT:
      return 0;
    case DeliveryStage.ARRIVED_AT_RESTAURANT:
      return 1;
    case DeliveryStage.PICKED_UP:
      return 2;
    case DeliveryStage.DELIVERING:
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return 3;
    case DeliveryStage.DELIVERED:
      return 4;
    default:
      return -1;
  }
}

export function getNextCourierStage(stage: DeliveryStage = DeliveryStage.IDLE): DeliveryStage | null {
  switch (stage) {
    case DeliveryStage.IDLE:
      return DeliveryStage.GOING_TO_RESTAURANT;
    case DeliveryStage.GOING_TO_RESTAURANT:
      return DeliveryStage.ARRIVED_AT_RESTAURANT;
    case DeliveryStage.ARRIVED_AT_RESTAURANT:
      return DeliveryStage.PICKED_UP;
    case DeliveryStage.PICKED_UP:
      return DeliveryStage.DELIVERING;
    case DeliveryStage.DELIVERING:
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return DeliveryStage.DELIVERED;
    case DeliveryStage.DELIVERED:
    default:
      return null;
  }
}

export function isActiveDeliveryStage(stage: DeliveryStage = DeliveryStage.IDLE) {
  return (
    stage === DeliveryStage.GOING_TO_RESTAURANT ||
    stage === DeliveryStage.ARRIVED_AT_RESTAURANT ||
    stage === DeliveryStage.PICKED_UP ||
    stage === DeliveryStage.DELIVERING ||
    stage === DeliveryStage.ARRIVED_AT_DESTINATION
  );
}

export function isNewDeliveryStage(stage: DeliveryStage = DeliveryStage.IDLE) {
  return stage === DeliveryStage.IDLE;
}

export function isCompletedDeliveryStage(stage: DeliveryStage = DeliveryStage.IDLE) {
  return stage === DeliveryStage.DELIVERED;
}

export function hasStartedDeliveryRun(stage: DeliveryStage = DeliveryStage.IDLE) {
  const state = getDeliveryStateKey(stage);
  return state === 'PICKED_UP' || state === 'DELIVERING' || state === 'DELIVERED';
}

export function getDeliveryStageMeta(stage: DeliveryStage = DeliveryStage.IDLE) {
  const progressIndex = getCourierStageProgressIndex(stage); // Add progress index

  switch (getDeliveryStateKey(stage)) {
    case 'ARRIVED':
      return {
        label: 'Restoranda',
        description: 'Paketni tekshirib, buyurtmani qabul qiling',
        badgeClass: 'bg-amber-50 text-amber-700',
        badgeClassDark: 'bg-amber-400/18 text-amber-200 border border-amber-400/25',
        progress: progressIndex, // Add progress property
      };
    case 'PICKED_UP':
      return {
        label: 'Buyurtma olindi',
        description: 'Buyurtma qo\'lingizda, mijoz manziliga yo\'l oling',
        badgeClass: 'bg-orange-50 text-orange-700',
        badgeClassDark: 'bg-orange-400/18 text-orange-200 border border-orange-400/25',
        progress: progressIndex, // Add progress property
      };
    case 'DELIVERING':
      return {
        label: 'Yetkazilmoqda',
        description: 'Mijoz manziliga eng qulay yo\'l bo\'yicha yetkazing',
        badgeClass: 'bg-violet-50 text-violet-700',
        badgeClassDark: 'bg-violet-400/18 text-violet-200 border border-violet-400/25',
        progress: progressIndex, // Add progress property
      };
    case 'DELIVERED':
      return {
        label: 'Topshirildi',
        description: 'Buyurtma muvaffaqiyatli yakunlandi',
        badgeClass: 'bg-emerald-50 text-emerald-700',
        badgeClassDark: 'bg-emerald-400/18 text-emerald-200 border border-emerald-400/25',
        progress: progressIndex, // Add progress property
      };
    case 'ACCEPTED':
    default:
      return {
        label: 'Qabul qilindi',
        description: 'Restoranga qarab harakatlaning va buyurtmani oling',
        badgeClass: 'bg-sky-50 text-sky-700',
        badgeClassDark: 'bg-sky-400/18 text-sky-200 border border-sky-400/25',
        progress: progressIndex, // Add progress property
      };
  }
}

export function getDeliveryStageAction(stage: DeliveryStage = DeliveryStage.IDLE) {
  const nextStage = getNextCourierStage(stage);

  if (!nextStage) {
    return {
      label: 'Buyurtma topshirildi',
      slideLabel: 'Buyurtma yakunlandi',
      hint: 'Buyurtma yakunlangan. Keyingi topshiriqni kuting.',
      next: null,
      buttonClass: 'bg-emerald-600',
    };
  }

  const actionConfig: Record<DeliveryStage, { label: string; slideLabel: string; hint: string; buttonClass: string }> = {
    [DeliveryStage.IDLE]: {
      label: 'Qabul qildim',
      slideLabel: 'Buyurtmani qabul qilasizmi?',
      hint: "Tasodifiy bosilish bo'lmasligi uchun o'ngga suring.",
      buttonClass: 'bg-sky-600',
    },
    [DeliveryStage.GOING_TO_RESTAURANT]: {
      label: 'Restoranga yetdim',
      slideLabel: 'Restoranga yetdim',
      hint: "Restoranga yetib borganingizdan keyin tasdiqlang.",
      buttonClass: 'bg-amber-500',
    },
    [DeliveryStage.ARRIVED_AT_RESTAURANT]: {
      label: 'Taom olindi',
      slideLabel: 'Taom olindi',
      hint: "Taomni olganingizdan keyin mijozga yo'l oling.",
      buttonClass: 'bg-orange-500',
    },
    [DeliveryStage.PICKED_UP]: {
      label: 'Yetkazishni boshladim',
      slideLabel: "Yo'lga chiqdim",
      hint: "Mijoz manzili tomon harakatni boshlaganingizda tasdiqlang.",
      buttonClass: 'bg-indigo-600',
    },
    [DeliveryStage.DELIVERING]: {
      label: 'Buyurtma topshirildi',
      slideLabel: 'Buyurtma topshirildi',
      hint: 'Faqat mijozga topshirilgandan keyin tasdiqlang.',
      buttonClass: 'bg-emerald-600',
    },
    [DeliveryStage.ARRIVED_AT_DESTINATION]: {
      label: 'Buyurtma topshirildi',
      slideLabel: 'Buyurtma topshirildi',
      hint: 'Faqat mijozga topshirilgandan keyin tasdiqlang.',
      buttonClass: 'bg-emerald-600',
    },
    [DeliveryStage.DELIVERED]: {
      label: 'Buyurtma topshirildi',
      slideLabel: 'Buyurtma yakunlandi',
      hint: 'Buyurtma allaqachon yakunlangan.',
      buttonClass: 'bg-emerald-600',
    },
  };

  return {
    label: actionConfig[stage].label,
    slideLabel: actionConfig[stage].slideLabel,
    hint: actionConfig[stage].hint,
    next: nextStage,
    buttonClass: actionConfig[stage].buttonClass,
  };
}

export function getDeliveryRouteMeta(stage: DeliveryStage = DeliveryStage.IDLE) {
  switch (stage) {
    case DeliveryStage.ARRIVED_AT_RESTAURANT:
      return {
        mode: 'restaurant' as const,
        title: 'Restoranga yetdingiz',
        description: 'Paketni tekshirib, buyurtmani oling va yo\'lga tayyorlaning',
        fromLabel: 'Restoran',
        toLabel: 'Buyurtma',
      };
    case DeliveryStage.PICKED_UP:
      return {
        mode: 'delivery' as const,
        title: 'Buyurtma qo\'lingizda',
        description: 'Mijoz manziliga chiqish uchun navigatsiya tayyor',
        fromLabel: 'Restoran',
        toLabel: 'Mijoz',
      };
    case DeliveryStage.DELIVERING:
    case DeliveryStage.ARRIVED_AT_DESTINATION:
      return {
        mode: 'delivery' as const,
        title: 'Mijozga yetkazilmoqda',
        description: 'Qolgan masofa va ETA shu yerda yangilanadi',
        fromLabel: 'Kuryer',
        toLabel: 'Mijoz',
      };
    case DeliveryStage.DELIVERED:
      return {
        mode: 'complete' as const,
        title: 'Buyurtma topshirildi',
        description: 'Faol marshrut yakunlandi, keyingi topshiriqni kuting',
        fromLabel: 'Yakun',
        toLabel: 'Topshirildi',
      };
    case DeliveryStage.IDLE:
    case DeliveryStage.GOING_TO_RESTAURANT:
    default:
      return {
        mode: 'restaurant' as const,
        title: 'Restoranga yo\'l oling',
        description: 'Buyurtma qabul qilindi, paketni olish uchun restoran tomon boring',
        fromLabel: 'Kuryer',
        toLabel: 'Restoran',
      };
  }
}

export const DELIVERY_STAGE_FLOW: Array<{ key: DeliveryStateKey; title: string }> = [
  { key: 'ACCEPTED', title: 'Qabul' },
  { key: 'ARRIVED', title: 'Yetdim' },
  { key: 'PICKED_UP', title: 'Oldim' },
  { key: 'DELIVERING', title: 'Yo\'ldaman' },
  { key: 'DELIVERED', title: 'Topshirdim' },
];

export function getDeliveryStageIndex(stage: DeliveryStage = DeliveryStage.IDLE) {
  const key = getDeliveryStateKey(stage);
  const index = DELIVERY_STAGE_FLOW.findIndex((entry) => entry.key === key);
  return index === -1 ? 0 : index;
}
