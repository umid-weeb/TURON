import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderStatus } from '../../data/types';
import { useAuthStore } from '../../store/useAuthStore';

export type CustomerLanguage = 'uz-latn' | 'uz-cyrl' | 'ru';

type TranslationKey =
  | 'brand'
  | 'common.choose'
  | 'common.itemsCount'
  | 'nav.home'
  | 'nav.search'
  | 'nav.cart'
  | 'nav.orders'
  | 'nav.profile'
  | 'sync.live'
  | 'sync.connecting'
  | 'sync.reconnecting'
  | 'sync.idle'
  | 'title.home'
  | 'title.search'
  | 'title.category'
  | 'title.product'
  | 'title.cart'
  | 'title.checkout'
  | 'title.orders'
  | 'title.order'
  | 'title.addresses'
  | 'title.newAddress'
  | 'title.map'
  | 'title.profile'
  | 'title.confirmation'
  | 'title.notifications'
  | 'title.support'
  | 'home.heroBadge'
  | 'home.heroTitle'
  | 'home.heroSubtitle'
  | 'home.metric.food'
  | 'home.metric.category'
  | 'home.metric.service'
  | 'home.categoriesBadge'
  | 'home.categoriesTitle'
  | 'home.popularTitle'
  | 'home.popularBadge'
  | 'home.fastOrderBadge'
  | 'home.fastOrderTitle'
  | 'home.fastOrderDescription'
  | 'search.badge'
  | 'search.title'
  | 'search.subtitle'
  | 'search.placeholder'
  | 'search.categoryTitle'
  | 'search.resultsTitle'
  | 'search.noCategories'
  | 'search.noProducts'
  | 'category.badge'
  | 'category.title'
  | 'category.subtitle'
  | 'category.readyList'
  | 'category.emptyTitle'
  | 'category.emptySubtitle'
  | 'product.selection'
  | 'product.available'
  | 'product.tempUnavailable'
  | 'product.outOfStock'
  | 'product.shortDescription'
  | 'product.ruleBadge'
  | 'product.ruleText'
  | 'product.weight'
  | 'product.stock'
  | 'product.quantity'
  | 'product.quantityHint'
  | 'product.add'
  | 'product.unavailableShort'
  | 'product.unavailable'
  | 'product.soldOut'
  | 'orders.title'
  | 'orders.subtitle'
  | 'orders.active'
  | 'orders.history'
  | 'orders.refresh'
  | 'orders.errorTitle'
  | 'orders.emptyTitle'
  | 'orders.emptySubtitle'
  | 'orders.browseMenu'
  | 'orders.total'
  | 'orders.moreItems'
  | 'order.liveTracking'
  | 'order.lastUpdate'
  | 'order.deliveryAddress'
  | 'order.paymentInfo'
  | 'order.orderItems'
  | 'order.needHelp'
  | 'order.reorder'
  | 'order.reorderAlert'
  | 'order.partialReorderAlert'
  | 'order.trackingStandbyTitle'
  | 'order.trackingStandbySubtitle'
  | 'order.helpAction'
  | 'order.mapAction'
  | 'order.copyAction'
  | 'order.backToOrders'
  | 'order.payment.cash'
  | 'order.payment.external'
  | 'order.payment.manual'
  | 'order.payment.completed'
  | 'order.payment.failed'
  | 'order.payment.pending'
  | 'order.payment.pendingHint'
  | 'order.summary.subtotal'
  | 'order.summary.discount'
  | 'order.summary.delivery'
  | 'order.summary.total'
  | 'order.copySuccess'
  | 'order.copyFail'
  | 'success.eyebrow'
  | 'success.created'
  | 'success.liveStatus'
  | 'success.total'
  | 'success.payment'
  | 'success.address'
  | 'success.nextStep'
  | 'success.contents'
  | 'success.trackButton'
  | 'success.homeButton'
  | 'success.footer'
  | 'support.title'
  | 'support.subtitle'
  | 'support.orderCard'
  | 'support.quickActions'
  | 'support.orderWhere'
  | 'support.changeOrder'
  | 'support.cancelOrder'
  | 'support.other'
  | 'support.paymentPromo'
  | 'support.operatorBridge'
  | 'support.telegramButton'
  | 'support.copyButton'
  | 'support.backButton'
  | 'support.noOrder'
  | 'support.copied'
  | 'support.copyFailed'
  | 'profile.badge'
  | 'profile.phone'
  | 'profile.language'
  | 'profile.languageHint'
  | 'profile.addresses'
  | 'profile.orders'
  | 'profile.notifications'
  | 'profile.support'
  | 'language.uzLatn'
  | 'language.uzCyrl'
  | 'language.ru';

type TranslationMap = Record<TranslationKey, Record<CustomerLanguage, string>>;

const translations: TranslationMap = {
  brand: {
    'uz-latn': 'Turon Kafe',
    'uz-cyrl': 'Турон Кафе',
    ru: 'Turon Cafe',
  },
  'common.choose': {
    'uz-latn': 'Tanlang',
    'uz-cyrl': 'Танланг',
    ru: 'Выбрать',
  },
  'common.itemsCount': {
    'uz-latn': '{{count}} ta',
    'uz-cyrl': '{{count}} та',
    ru: '{{count}} шт.',
  },
  'nav.home': {
    'uz-latn': 'Asosiy',
    'uz-cyrl': 'Асосий',
    ru: 'Главная',
  },
  'nav.search': {
    'uz-latn': 'Qidiruv',
    'uz-cyrl': 'Қидирув',
    ru: 'Поиск',
  },
  'nav.cart': {
    'uz-latn': 'Savat',
    'uz-cyrl': 'Сават',
    ru: 'Корзина',
  },
  'nav.orders': {
    'uz-latn': 'Buyurtma',
    'uz-cyrl': 'Буюртма',
    ru: 'Заказы',
  },
  'nav.profile': {
    'uz-latn': 'Profil',
    'uz-cyrl': 'Профил',
    ru: 'Профиль',
  },
  'sync.live': {
    'uz-latn': 'Jonli',
    'uz-cyrl': 'Жонли',
    ru: 'Онлайн',
  },
  'sync.connecting': {
    'uz-latn': 'Ulanish',
    'uz-cyrl': 'Уланиш',
    ru: 'Подключение',
  },
  'sync.reconnecting': {
    'uz-latn': 'Qayta',
    'uz-cyrl': 'Қайта',
    ru: 'Повтор',
  },
  'sync.idle': {
    'uz-latn': 'Sync',
    'uz-cyrl': 'Синк',
    ru: 'Синхро',
  },
  'title.home': {
    'uz-latn': 'Asosiy',
    'uz-cyrl': 'Асосий',
    ru: 'Главная',
  },
  'title.search': {
    'uz-latn': 'Qidiruv',
    'uz-cyrl': 'Қидирув',
    ru: 'Поиск',
  },
  'title.category': {
    'uz-latn': 'Kategoriya',
    'uz-cyrl': 'Категория',
    ru: 'Категория',
  },
  'title.product': {
    'uz-latn': 'Taom',
    'uz-cyrl': 'Таом',
    ru: 'Блюдо',
  },
  'title.cart': {
    'uz-latn': 'Savat',
    'uz-cyrl': 'Сават',
    ru: 'Корзина',
  },
  'title.checkout': {
    'uz-latn': 'Tasdiqlash',
    'uz-cyrl': 'Тасдиқлаш',
    ru: 'Подтверждение',
  },
  'title.orders': {
    'uz-latn': 'Buyurtmalar',
    'uz-cyrl': 'Буюртмалар',
    ru: 'Заказы',
  },
  'title.order': {
    'uz-latn': 'Buyurtma',
    'uz-cyrl': 'Буюртма',
    ru: 'Заказ',
  },
  'title.addresses': {
    'uz-latn': 'Manzillar',
    'uz-cyrl': 'Манзиллар',
    ru: 'Адреса',
  },
  'title.newAddress': {
    'uz-latn': 'Yangi manzil',
    'uz-cyrl': 'Янги манзил',
    ru: 'Новый адрес',
  },
  'title.map': {
    'uz-latn': 'Xaritada tanlash',
    'uz-cyrl': 'Харитада танлаш',
    ru: 'Выбор на карте',
  },
  'title.profile': {
    'uz-latn': 'Profil',
    'uz-cyrl': 'Профил',
    ru: 'Профиль',
  },
  'title.confirmation': {
    'uz-latn': 'Tasdiq',
    'uz-cyrl': 'Тасдиқ',
    ru: 'Подтверждение',
  },
  'title.notifications': {
    'uz-latn': 'Xabarlar',
    'uz-cyrl': 'Хабарлар',
    ru: 'Уведомления',
  },
  'title.support': {
    'uz-latn': 'Yordam',
    'uz-cyrl': 'Ёрдам',
    ru: 'Поддержка',
  },
  'home.heroBadge': {
    'uz-latn': 'Turon signature',
    'uz-cyrl': 'Турон сигнатуре',
    ru: 'Turon signature',
  },
  'home.heroTitle': {
    'uz-latn': '{{name}}, bugun nimani tatib ko‘ramiz?',
    'uz-cyrl': '{{name}}, бугун нимани татиб кўрамиз?',
    ru: '{{name}}, что попробуем сегодня?',
  },
  'home.heroSubtitle': {
    'uz-latn': 'Issiq taomlar, chiroyli servis va tez tayyorlanadigan buyurtmalar bir joyda.',
    'uz-cyrl': 'Иссиқ таомлар, чиройли сервис ва тез тайёрланадиган буюртмалар бир жойда.',
    ru: 'Горячие блюда, понятный сервис и быстрый заказ в одном месте.',
  },
  'home.metric.food': {
    'uz-latn': 'Taom',
    'uz-cyrl': 'Таом',
    ru: 'Блюда',
  },
  'home.metric.category': {
    'uz-latn': 'Bo‘lim',
    'uz-cyrl': 'Бўлим',
    ru: 'Разделы',
  },
  'home.metric.service': {
    'uz-latn': 'Servis',
    'uz-cyrl': 'Сервис',
    ru: 'Сервис',
  },
  'home.categoriesBadge': {
    'uz-latn': 'Kategoriya',
    'uz-cyrl': 'Категория',
    ru: 'Категории',
  },
  'home.categoriesTitle': {
    'uz-latn': 'Qaysi kayfiyatdasiz?',
    'uz-cyrl': 'Қайси кайфиятдасиз?',
    ru: 'Что выбираем?',
  },
  'home.popularTitle': {
    'uz-latn': 'Ommabop taomlar',
    'uz-cyrl': 'Оммабоп таомлар',
    ru: 'Популярные блюда',
  },
  'home.popularBadge': {
    'uz-latn': 'Bugungi vibe',
    'uz-cyrl': 'Бугунги вайб',
    ru: 'Сегодняшний выбор',
  },
  'home.fastOrderBadge': {
    'uz-latn': 'Tez buyurtma',
    'uz-cyrl': 'Тез буюртма',
    ru: 'Быстрый заказ',
  },
  'home.fastOrderTitle': {
    'uz-latn': 'Katta tugmalar, aniq narx va sodda oqim',
    'uz-cyrl': 'Катта тугмалар, аниқ нарх ва содда оқим',
    ru: 'Крупные кнопки, понятная цена и простой путь',
  },
  'home.fastOrderDescription': {
    'uz-latn': 'Bu ekran oddiy foydalanuvchi uchun ham tushunarli bo‘lishi uchun yengil va aniq yig‘ilgan.',
    'uz-cyrl': 'Бу экран оддий фойдаланувчи учун ҳам тушунарли бўлиши учун енгил ва аниқ йиғилган.',
    ru: 'Экран собран так, чтобы даже неопытный пользователь быстро оформил заказ.',
  },
  'search.badge': {
    'uz-latn': 'Qidiruv',
    'uz-cyrl': 'Қидирув',
    ru: 'Поиск',
  },
  'search.title': {
    'uz-latn': 'Nima qidiramiz?',
    'uz-cyrl': 'Нима қидирамиз?',
    ru: 'Что ищем?',
  },
  'search.subtitle': {
    'uz-latn': 'Taom nomi, kategoriya yoki qisqa tavsif bo‘yicha qidiring.',
    'uz-cyrl': 'Таом номи, категория ёки қисқа тавсиф бўйича қидиринг.',
    ru: 'Ищите по названию блюда, разделу или короткому описанию.',
  },
  'search.placeholder': {
    'uz-latn': 'Masalan: burger, pizza, ichimlik...',
    'uz-cyrl': 'Масалан: бургер, пицца, ичимлик...',
    ru: 'Например: бургер, пицца, напиток...',
  },
  'search.categoryTitle': {
    'uz-latn': 'Mos bo‘limlar',
    'uz-cyrl': 'Мос бўлимлар',
    ru: 'Подходящие разделы',
  },
  'search.resultsTitle': {
    'uz-latn': 'Taomlar',
    'uz-cyrl': 'Таомлар',
    ru: 'Блюда',
  },
  'search.noCategories': {
    'uz-latn': 'Mos kategoriya topilmadi.',
    'uz-cyrl': 'Мос категория топилмади.',
    ru: 'Подходящий раздел не найден.',
  },
  'search.noProducts': {
    'uz-latn': 'So‘rov bo‘yicha taom topilmadi.',
    'uz-cyrl': 'Сўров бўйича таом топилмади.',
    ru: 'По запросу ничего не найдено.',
  },
  'category.badge': {
    'uz-latn': 'Tanlangan bo‘lim',
    'uz-cyrl': 'Танланган бўлим',
    ru: 'Выбранный раздел',
  },
  'category.title': {
    'uz-latn': 'Kategoriya',
    'uz-cyrl': 'Категория',
    ru: 'Категория',
  },
  'category.subtitle': {
    'uz-latn': 'Turon oshxonasidagi shu kayfiyatga mos taomlarni bir joyga yig‘dik.',
    'uz-cyrl': 'Турон ошхонасидаги шу кайфиятга мос таомларни бир жойга йиғдик.',
    ru: 'Мы собрали блюда Turon, которые подходят под это настроение.',
  },
  'category.readyList': {
    'uz-latn': 'Tayyor ro‘yxat',
    'uz-cyrl': 'Тайёр рўйхат',
    ru: 'Готовый список',
  },
  'category.emptyTitle': {
    'uz-latn': 'Hozircha bu yerda hech narsa yo‘q!',
    'uz-cyrl': 'Ҳозирча бу ерда ҳеч нарса йўқ!',
    ru: 'Пока здесь ничего нет!',
  },
  'category.emptySubtitle': {
    'uz-latn': 'Boshqa kategoriyalarni ko‘rib chiqing.',
    'uz-cyrl': 'Бошқа категорияларни кўриб чиқинг.',
    ru: 'Посмотрите другие категории.',
  },
  'product.selection': {
    'uz-latn': 'Turon tanlovi',
    'uz-cyrl': 'Турон танлови',
    ru: 'Выбор Turon',
  },
  'product.available': {
    'uz-latn': 'Tayyorlanadi',
    'uz-cyrl': 'Тайёрланади',
    ru: 'Готовится',
  },
  'product.tempUnavailable': {
    'uz-latn': 'Vaqtincha yo‘q',
    'uz-cyrl': 'Вақтинча йўқ',
    ru: 'Временно нет',
  },
  'product.outOfStock': {
    'uz-latn': 'Tugagan',
    'uz-cyrl': 'Тугаган',
    ru: 'Закончилось',
  },
  'product.shortDescription': {
    'uz-latn': 'Qisqa ta’rif',
    'uz-cyrl': 'Қисқа таъриф',
    ru: 'Кратко',
  },
  'product.ruleBadge': {
    'uz-latn': 'Buyurtma qoidasi',
    'uz-cyrl': 'Буюртма қоидаси',
    ru: 'Правило заказа',
  },
  'product.ruleText': {
    'uz-latn': 'Katta tugma, aniq narx, ortiqcha chalg‘ituvchi elementlarsiz',
    'uz-cyrl': 'Катта тугма, аниқ нарх, ортиқча чалғитувчи элементларсиз',
    ru: 'Крупная кнопка, понятная цена и ничего лишнего',
  },
  'product.weight': {
    'uz-latn': 'Og‘irligi',
    'uz-cyrl': 'Оғирлиги',
    ru: 'Вес',
  },
  'product.stock': {
    'uz-latn': 'Tayyor holat',
    'uz-cyrl': 'Тайёр ҳолат',
    ru: 'Наличие',
  },
  'product.quantity': {
    'uz-latn': 'Miqdor',
    'uz-cyrl': 'Миқдор',
    ru: 'Количество',
  },
  'product.quantityHint': {
    'uz-latn': 'Kerakli sonni tanlang',
    'uz-cyrl': 'Керакли сонни танланг',
    ru: 'Выберите нужное количество',
  },
  'product.add': {
    'uz-latn': 'qo‘shish',
    'uz-cyrl': 'қўшиш',
    ru: 'добавить',
  },
  'product.unavailableShort': {
    'uz-latn': 'Mavjud emas',
    'uz-cyrl': 'Мавжуд эмас',
    ru: 'Недоступно',
  },
  'product.unavailable': {
    'uz-latn': 'Bu taom hozir buyurtma uchun yopiq. Menyudan boshqa mavjud taomni tanlab ko‘ring.',
    'uz-cyrl': 'Бу таом ҳозир буюртма учун ёпиқ. Менюдан бошқа мавжуд таомни танлаб кўринг.',
    ru: 'Сейчас это блюдо недоступно. Попробуйте выбрать другое.',
  },
  'product.soldOut': {
    'uz-latn': 'Tugagan',
    'uz-cyrl': 'Тугаган',
    ru: 'Нет в наличии',
  },
  'orders.title': {
    'uz-latn': 'Buyurtmalarim',
    'uz-cyrl': 'Буюртмаларим',
    ru: 'Мои заказы',
  },
  'orders.subtitle': {
    'uz-latn': 'Buyurtmalar tarixi va joriy holati',
    'uz-cyrl': 'Буюртмалар тарихи ва жорий ҳолати',
    ru: 'История заказов и текущий статус',
  },
  'orders.active': {
    'uz-latn': 'Faol buyurtmalar',
    'uz-cyrl': 'Фаол буюртмалар',
    ru: 'Активные заказы',
  },
  'orders.history': {
    'uz-latn': 'Tarix',
    'uz-cyrl': 'Тарих',
    ru: 'История',
  },
  'orders.refresh': {
    'uz-latn': 'Ma’lumotlarni yangilash',
    'uz-cyrl': 'Маълумотларни янгилаш',
    ru: 'Обновить данные',
  },
  'orders.errorTitle': {
    'uz-latn': 'Ma’lumotlarni yuklashda xatolik',
    'uz-cyrl': 'Маълумотларни юклашда хато',
    ru: 'Ошибка загрузки данных',
  },
  'orders.emptyTitle': {
    'uz-latn': 'Buyurtmalar yo‘q!',
    'uz-cyrl': 'Буюртмалар йўқ!',
    ru: 'Заказов пока нет!',
  },
  'orders.emptySubtitle': {
    'uz-latn': 'Siz hali bizdan taom buyurtma bermagansiz.',
    'uz-cyrl': 'Сиз ҳали биздан таом буюртма бермагансиз.',
    ru: 'Вы еще не оформляли заказ в Turon.',
  },
  'orders.browseMenu': {
    'uz-latn': 'Menyuni ko‘rish',
    'uz-cyrl': 'Менюни кўриш',
    ru: 'Открыть меню',
  },
  'orders.total': {
    'uz-latn': 'Jami summa',
    'uz-cyrl': 'Жами сумма',
    ru: 'Итого',
  },
  'orders.moreItems': {
    'uz-latn': 'va yana {{count}} ta mahsulot...',
    'uz-cyrl': 'ва яна {{count}} та маҳсулот...',
    ru: 'и еще {{count}} позиций...',
  },
  'order.liveTracking': {
    'uz-latn': 'Jonli kuzatuv',
    'uz-cyrl': 'Жонли кузатув',
    ru: 'Живое отслеживание',
  },
  'order.lastUpdate': {
    'uz-latn': 'So‘nggi yangilanish',
    'uz-cyrl': 'Сўнгги янгиланиш',
    ru: 'Последнее обновление',
  },
  'order.deliveryAddress': {
    'uz-latn': 'Yetkazib berish manzili',
    'uz-cyrl': 'Етказиб бериш манзили',
    ru: 'Адрес доставки',
  },
  'order.paymentInfo': {
    'uz-latn': 'To‘lov ma’lumotlari',
    'uz-cyrl': 'Тўлов маълумотлари',
    ru: 'Информация об оплате',
  },
  'order.orderItems': {
    'uz-latn': 'Buyurtma tarkibi',
    'uz-cyrl': 'Буюртма таркиби',
    ru: 'Состав заказа',
  },
  'order.needHelp': {
    'uz-latn': 'Yordam kerakmi?',
    'uz-cyrl': 'Ёрдам керакми?',
    ru: 'Нужна помощь?',
  },
  'order.reorder': {
    'uz-latn': 'Yana buyurtma berish',
    'uz-cyrl': 'Яна буюртма бериш',
    ru: 'Повторить заказ',
  },
  'order.reorderAlert': {
    'uz-latn': 'Oldingi buyurtmadagi taomlar hozir menyuda mavjud emas.',
    'uz-cyrl': 'Олдинги буюртмадаги таомлар ҳозир менюда мавжуд эмас.',
    ru: 'Блюда из прошлого заказа сейчас недоступны в меню.',
  },
  'order.partialReorderAlert': {
    'uz-latn': 'Ba’zi taomlar hozir mavjud emas va savatga qo‘shilmadi.',
    'uz-cyrl': 'Баъзи таомлар ҳозир мавжуд эмас ва саватга қўшилмади.',
    ru: 'Часть блюд сейчас недоступна и не была добавлена в корзину.',
  },
  'order.trackingStandbyTitle': {
    'uz-latn': 'Jonli xarita tayyorlanmoqda',
    'uz-cyrl': 'Жонли харита тайёрланмоқда',
    ru: 'Живая карта готовится',
  },
  'order.trackingStandbySubtitle': {
    'uz-latn': 'Restoran buyurtmani tayyorlayapti. Kuryer yo‘lga chiqishi bilan xarita shu yerda jonlanadi.',
    'uz-cyrl': 'Ресторан буюртмани тайёрлаяпти. Курьер йўлга чиқиши билан харита шу ерда жонланади.',
    ru: 'Ресторан готовит заказ. Как только курьер поедет, карта оживет здесь.',
  },
  'order.helpAction': {
    'uz-latn': 'Yordam',
    'uz-cyrl': 'Ёрдам',
    ru: 'Помощь',
  },
  'order.mapAction': {
    'uz-latn': 'Xaritaga o‘tish',
    'uz-cyrl': 'Харитага ўтиш',
    ru: 'К карте',
  },
  'order.copyAction': {
    'uz-latn': 'Raqamni nusxalash',
    'uz-cyrl': 'Рақамни нусхалаш',
    ru: 'Скопировать номер',
  },
  'order.backToOrders': {
    'uz-latn': 'Ro‘yxatga qaytish',
    'uz-cyrl': 'Рўйхатга қайтиш',
    ru: 'Назад к заказам',
  },
  'order.payment.cash': {
    'uz-latn': 'Naqd pul',
    'uz-cyrl': 'Нақд пул',
    ru: 'Наличные',
  },
  'order.payment.external': {
    'uz-latn': 'Click / Payme',
    'uz-cyrl': 'Click / Payme',
    ru: 'Click / Payme',
  },
  'order.payment.manual': {
    'uz-latn': 'Karta',
    'uz-cyrl': 'Карта',
    ru: 'Ручной перевод',
  },
  'order.payment.completed': {
    'uz-latn': 'To‘langan',
    'uz-cyrl': 'Тўланган',
    ru: 'Оплачено',
  },
  'order.payment.failed': {
    'uz-latn': 'Xatolik',
    'uz-cyrl': 'Хатолик',
    ru: 'Ошибка',
  },
  'order.payment.pending': {
    'uz-latn': 'Verifikatsiya kutilmoqda',
    'uz-cyrl': 'Верификация кутилмоқда',
    ru: 'Ожидает проверки',
  },
  'order.payment.pendingHint': {
    'uz-latn': 'To‘lovdan keyin admin tranzaksiyani tasdiqlaydi. Buyurtma shundan so‘ng tayyorlanadi.',
    'uz-cyrl': 'Тўловдан кейин админ транзакцияни тасдиқлайди. Буюртма шундан сўнг тайёрланади.',
    ru: 'После оплаты администратор подтверждает транзакцию. Затем заказ запускается в работу.',
  },
  'order.summary.subtotal': {
    'uz-latn': 'Subtotal',
    'uz-cyrl': 'Субтотал',
    ru: 'Сумма блюд',
  },
  'order.summary.discount': {
    'uz-latn': 'Chegirma',
    'uz-cyrl': 'Чегирма',
    ru: 'Скидка',
  },
  'order.summary.delivery': {
    'uz-latn': 'Yetkazib berish',
    'uz-cyrl': 'Етказиб бериш',
    ru: 'Доставка',
  },
  'order.summary.total': {
    'uz-latn': 'Jami',
    'uz-cyrl': 'Жами',
    ru: 'Итого',
  },
  'order.copySuccess': {
    'uz-latn': 'Buyurtma raqami nusxalandi',
    'uz-cyrl': 'Буюртма рақами нусхаланди',
    ru: 'Номер заказа скопирован',
  },
  'order.copyFail': {
    'uz-latn': 'Nusxalab bo‘lmadi',
    'uz-cyrl': 'Нусхалаб бўлмади',
    ru: 'Не удалось скопировать',
  },
  'success.eyebrow': {
    'uz-latn': 'Buyurtma yaratildi',
    'uz-cyrl': 'Буюртма яратилди',
    ru: 'Заказ создан',
  },
  'success.created': {
    'uz-latn': 'Tasdiqlandi',
    'uz-cyrl': 'Тасдиқланди',
    ru: 'Подтверждено',
  },
  'success.liveStatus': {
    'uz-latn': 'Jonli holat',
    'uz-cyrl': 'Жонли ҳолат',
    ru: 'Текущий статус',
  },
  'success.total': {
    'uz-latn': 'Jami to‘lov',
    'uz-cyrl': 'Жами тўлов',
    ru: 'Сумма',
  },
  'success.payment': {
    'uz-latn': 'To‘lov usuli',
    'uz-cyrl': 'Тўлов усули',
    ru: 'Способ оплаты',
  },
  'success.address': {
    'uz-latn': 'Yetkazish manzili',
    'uz-cyrl': 'Етказиш манзили',
    ru: 'Адрес доставки',
  },
  'success.nextStep': {
    'uz-latn': 'Keyingi bosqich',
    'uz-cyrl': 'Кейинги босқич',
    ru: 'Следующий шаг',
  },
  'success.contents': {
    'uz-latn': 'Buyurtma tarkibi',
    'uz-cyrl': 'Буюртма таркиби',
    ru: 'Состав заказа',
  },
  'success.trackButton': {
    'uz-latn': 'Buyurtmani kuzatish',
    'uz-cyrl': 'Буюртмани кузатиш',
    ru: 'Отследить заказ',
  },
  'success.homeButton': {
    'uz-latn': 'Bosh sahifa',
    'uz-cyrl': 'Бош саҳифа',
    ru: 'На главную',
  },
  'success.footer': {
    'uz-latn': 'Statuslar buyurtma sahifasida jonlanadi',
    'uz-cyrl': 'Статуслар буюртма саҳифасида жонланади',
    ru: 'Подробные статусы доступны на странице заказа',
  },
  'support.title': {
    'uz-latn': 'Sizga qanday yordam bera olamiz?',
    'uz-cyrl': 'Сизга қандай ёрдам бера оламиз?',
    ru: 'Чем можем помочь?',
  },
  'support.subtitle': {
    'uz-latn': 'Savolingiz Telegram orqali operatorga yuboriladi va javob shu bot orqali qaytadi.',
    'uz-cyrl': 'Саволингиз Telegram орқали операторга юборилади ва жавоб шу бот орқали қайтади.',
    ru: 'Ваш вопрос уйдет оператору через Telegram, ответ вернется через этого же бота.',
  },
  'support.orderCard': {
    'uz-latn': 'Buyurtma bo‘yicha savol',
    'uz-cyrl': 'Буюртма бўйича савол',
    ru: 'Вопрос по заказу',
  },
  'support.quickActions': {
    'uz-latn': 'Tez savollar',
    'uz-cyrl': 'Тез саволлар',
    ru: 'Быстрые вопросы',
  },
  'support.orderWhere': {
    'uz-latn': 'Buyurtmam qani?',
    'uz-cyrl': 'Буюртмам қани?',
    ru: 'Где мой заказ?',
  },
  'support.changeOrder': {
    'uz-latn': 'Buyurtmani o‘zgartirish',
    'uz-cyrl': 'Буюртмани ўзгартириш',
    ru: 'Изменить заказ',
  },
  'support.cancelOrder': {
    'uz-latn': 'Buyurtmani bekor qilish',
    'uz-cyrl': 'Буюртмани бекор қилиш',
    ru: 'Отменить заказ',
  },
  'support.other': {
    'uz-latn': 'Boshqa',
    'uz-cyrl': 'Бошқа',
    ru: 'Другое',
  },
  'support.paymentPromo': {
    'uz-latn': 'To‘lov va promo-kodlar',
    'uz-cyrl': 'Тўлов ва промо-кодлар',
    ru: 'Оплата и промокоды',
  },
  'support.operatorBridge': {
    'uz-latn': 'Operator bilan yozish',
    'uz-cyrl': 'Оператор билан ёзиш',
    ru: 'Написать оператору',
  },
  'support.telegramButton': {
    'uz-latn': 'Telegramda ochish',
    'uz-cyrl': 'Telegramда очиш',
    ru: 'Открыть в Telegram',
  },
  'support.copyButton': {
    'uz-latn': 'Buyurtma raqamini nusxalash',
    'uz-cyrl': 'Буюртма рақамини нусхалаш',
    ru: 'Скопировать номер заказа',
  },
  'support.backButton': {
    'uz-latn': 'Buyurtmaga qaytish',
    'uz-cyrl': 'Буюртмага қайтиш',
    ru: 'Вернуться к заказу',
  },
  'support.noOrder': {
    'uz-latn': 'Buyurtma tanlanmagan. Umumiy savol bilan operatorga yozishingiz mumkin.',
    'uz-cyrl': 'Буюртма танланмаган. Умумий савол билан операторга ёзишингиз мумкин.',
    ru: 'Заказ не выбран. Можно написать оператору с общим вопросом.',
  },
  'support.copied': {
    'uz-latn': 'Raqam nusxalandi',
    'uz-cyrl': 'Рақам нусхаланди',
    ru: 'Номер скопирован',
  },
  'support.copyFailed': {
    'uz-latn': 'Nusxalab bo‘lmadi',
    'uz-cyrl': 'Нусхалаб бўлмади',
    ru: 'Не удалось скопировать',
  },
  'profile.badge': {
    'uz-latn': 'Profil',
    'uz-cyrl': 'Профил',
    ru: 'Профиль',
  },
  'profile.phone': {
    'uz-latn': 'Telefon',
    'uz-cyrl': 'Телефон',
    ru: 'Телефон',
  },
  'profile.language': {
    'uz-latn': 'Til',
    'uz-cyrl': 'Тил',
    ru: 'Язык',
  },
  'profile.languageHint': {
    'uz-latn': 'Ilovani o‘qish sizga eng qulay bo‘lgan ko‘rinishni tanlang.',
    'uz-cyrl': 'Иловани ўқиш сизга энг қулай бўлган кўринишни танланг.',
    ru: 'Выберите самый удобный для вас язык интерфейса.',
  },
  'profile.addresses': {
    'uz-latn': 'Manzillar',
    'uz-cyrl': 'Манзиллар',
    ru: 'Адреса',
  },
  'profile.orders': {
    'uz-latn': 'Buyurtmalar',
    'uz-cyrl': 'Буюртмалар',
    ru: 'Заказы',
  },
  'profile.notifications': {
    'uz-latn': 'Xabarlar',
    'uz-cyrl': 'Хабарлар',
    ru: 'Уведомления',
  },
  'profile.support': {
    'uz-latn': 'Yordam',
    'uz-cyrl': 'Ёрдам',
    ru: 'Поддержка',
  },
  'language.uzLatn': {
    'uz-latn': 'UZBEK',
    'uz-cyrl': 'ЎЗБЕК',
    ru: 'UZBEK',
  },
  'language.uzCyrl': {
    'uz-latn': 'ЎЗБЕК',
    'uz-cyrl': 'ЎЗБЕК',
    ru: 'ЎЗБЕК',
  },
  'language.ru': {
    'uz-latn': 'РУССКИЙ',
    'uz-cyrl': 'РУССКИЙ',
    ru: 'РУССКИЙ',
  },
};

const statusLabels: Record<OrderStatus, Record<CustomerLanguage, string>> = {
  [OrderStatus.PENDING]: {
    'uz-latn': 'Yangi',
    'uz-cyrl': 'Янги',
    ru: 'Новый',
  },
  [OrderStatus.PREPARING]: {
    'uz-latn': 'Tayyorlanmoqda',
    'uz-cyrl': 'Тайёрланмоқда',
    ru: 'Готовится',
  },
  [OrderStatus.READY_FOR_PICKUP]: {
    'uz-latn': 'Tayyor',
    'uz-cyrl': 'Тайёр',
    ru: 'Готов',
  },
  [OrderStatus.DELIVERING]: {
    'uz-latn': 'Yo‘lda',
    'uz-cyrl': 'Йўлда',
    ru: 'В пути',
  },
  [OrderStatus.DELIVERED]: {
    'uz-latn': 'Yetkazildi',
    'uz-cyrl': 'Етказилди',
    ru: 'Доставлен',
  },
  [OrderStatus.CANCELLED]: {
    'uz-latn': 'Bekor qilindi',
    'uz-cyrl': 'Бекор қилинди',
    ru: 'Отменен',
  },
};

const trackingStepsByLanguage: Record<
  CustomerLanguage,
  Array<{ id: OrderStatus; label: string; description: string }>
> = {
  'uz-latn': [
    { id: OrderStatus.PENDING, label: 'Yaratildi', description: 'Buyurtmangiz qabul qilindi' },
    { id: OrderStatus.PREPARING, label: 'Tasdiqlandi', description: 'Restoran tayyorlashni boshladi' },
    { id: OrderStatus.READY_FOR_PICKUP, label: 'Tayyor', description: 'Taom kuryerga topshirilmoqda' },
    { id: OrderStatus.DELIVERING, label: 'Yetkazilmoqda', description: 'Buyurtmangiz manzilga yo‘l oldi' },
    { id: OrderStatus.DELIVERED, label: 'Yetkazildi', description: 'Yoqimli ishtaha!' },
  ],
  'uz-cyrl': [
    { id: OrderStatus.PENDING, label: 'Яратилди', description: 'Буюртмангиз қабул қилинди' },
    { id: OrderStatus.PREPARING, label: 'Тасдиқланди', description: 'Ресторан тайёрлашни бошлади' },
    { id: OrderStatus.READY_FOR_PICKUP, label: 'Тайёр', description: 'Таом курьерга топширилмоқда' },
    { id: OrderStatus.DELIVERING, label: 'Етказилмоқда', description: 'Буюртмангиз манзилга йўл олди' },
    { id: OrderStatus.DELIVERED, label: 'Етказилди', description: 'Ёқимли иштаҳа!' },
  ],
  ru: [
    { id: OrderStatus.PENDING, label: 'Создан', description: 'Ваш заказ принят системой' },
    { id: OrderStatus.PREPARING, label: 'Подтвержден', description: 'Ресторан начал готовить заказ' },
    { id: OrderStatus.READY_FOR_PICKUP, label: 'Готов', description: 'Блюдо передается курьеру' },
    { id: OrderStatus.DELIVERING, label: 'Доставляется', description: 'Заказ едет к вам' },
    { id: OrderStatus.DELIVERED, label: 'Доставлен', description: 'Приятного аппетита!' },
  ],
};

export const customerLanguageOptions: Array<{
  value: CustomerLanguage;
  labelKey: TranslationKey;
}> = [
  { value: 'uz-latn', labelKey: 'language.uzLatn' },
  { value: 'uz-cyrl', labelKey: 'language.uzCyrl' },
  { value: 'ru', labelKey: 'language.ru' },
];

type CustomerPreferencesState = {
  language: CustomerLanguage | null;
  setLanguage: (language: CustomerLanguage) => void;
};

export const useCustomerPreferencesStore = create<CustomerPreferencesState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'turon-customer-preferences',
    },
  ),
);

export function resolveCustomerLanguage(
  preferredLanguage: CustomerLanguage | null | undefined,
  authLanguage?: string | null,
): CustomerLanguage {
  if (preferredLanguage) {
    return preferredLanguage;
  }

  if (authLanguage === 'RU') {
    return 'ru';
  }

  return 'uz-latn';
}

export function getIntlLocale(language: CustomerLanguage) {
  if (language === 'ru') {
    return 'ru-RU';
  }

  return 'uz-UZ';
}

function normalizeApostrophes(value: string) {
  return value.replace(/[ʻʼ`']/g, '’');
}

const cp1252ToByte: Record<number, number> = {
  8364: 128,
  8218: 130,
  402: 131,
  8222: 132,
  8230: 133,
  8224: 134,
  8225: 135,
  710: 136,
  8240: 137,
  352: 138,
  8249: 139,
  338: 140,
  381: 142,
  8216: 145,
  8217: 146,
  8220: 147,
  8221: 148,
  8226: 149,
  8211: 150,
  8212: 151,
  732: 152,
  8482: 153,
  353: 154,
  8250: 155,
  339: 156,
  382: 158,
  376: 159,
};

const mojibakePattern = /(Ð|Ñ|Ò|Ã|Â|â€|â€™|â€œ|â€)/;

function decodeWindows1252Utf8(value: string) {
  const bytes = Uint8Array.from(
    Array.from(value).map((char) => {
      const codePoint = char.codePointAt(0) ?? 63;
      if (codePoint <= 255) {
        return codePoint;
      }

      return cp1252ToByte[codePoint] ?? 63;
    }),
  );

  return new TextDecoder('utf-8').decode(bytes);
}

function repairMojibake(value: string) {
  if (!mojibakePattern.test(value)) {
    return value;
  }

  try {
    const decoded = decodeWindows1252Utf8(value);
    return decoded.includes('�') ? value : decoded;
  } catch {
    return value;
  }
}

const latinToCyrillicRules: Array<[RegExp, string]> = [
  [/G’/g, 'Ғ'],
  [/g’/g, 'ғ'],
  [/O’/g, 'Ў'],
  [/o’/g, 'ў'],
  [/Sh/g, 'Ш'],
  [/sh/g, 'ш'],
  [/Ch/g, 'Ч'],
  [/ch/g, 'ч'],
  [/Yo/g, 'Ё'],
  [/yo/g, 'ё'],
  [/Yu/g, 'Ю'],
  [/yu/g, 'ю'],
  [/Ya/g, 'Я'],
  [/ya/g, 'я'],
  [/Ye/g, 'Е'],
  [/ye/g, 'е'],
  [/A/g, 'А'],
  [/a/g, 'а'],
  [/B/g, 'Б'],
  [/b/g, 'б'],
  [/D/g, 'Д'],
  [/d/g, 'д'],
  [/E/g, 'Е'],
  [/e/g, 'е'],
  [/F/g, 'Ф'],
  [/f/g, 'ф'],
  [/G/g, 'Г'],
  [/g/g, 'г'],
  [/H/g, 'Ҳ'],
  [/h/g, 'ҳ'],
  [/I/g, 'И'],
  [/i/g, 'и'],
  [/J/g, 'Ж'],
  [/j/g, 'ж'],
  [/K/g, 'К'],
  [/k/g, 'к'],
  [/L/g, 'Л'],
  [/l/g, 'л'],
  [/M/g, 'М'],
  [/m/g, 'м'],
  [/N/g, 'Н'],
  [/n/g, 'н'],
  [/O/g, 'О'],
  [/o/g, 'о'],
  [/P/g, 'П'],
  [/p/g, 'п'],
  [/Q/g, 'Қ'],
  [/q/g, 'қ'],
  [/R/g, 'Р'],
  [/r/g, 'р'],
  [/S/g, 'С'],
  [/s/g, 'с'],
  [/T/g, 'Т'],
  [/t/g, 'т'],
  [/U/g, 'У'],
  [/u/g, 'у'],
  [/V/g, 'В'],
  [/v/g, 'в'],
  [/X/g, 'Х'],
  [/x/g, 'х'],
  [/Y/g, 'Й'],
  [/y/g, 'й'],
  [/Z/g, 'З'],
  [/z/g, 'з'],
];

export function localizeDynamicText(value: string | undefined | null, language: CustomerLanguage) {
  if (!value) {
    return '';
  }

  const repairedValue = repairMojibake(value);

  if (language !== 'uz-cyrl') {
    return repairedValue;
  }

  return latinToCyrillicRules.reduce(
    (currentValue, [pattern, replacement]) => currentValue.replace(pattern, replacement),
    normalizeApostrophes(repairedValue),
  );
}

export function translate(
  language: CustomerLanguage,
  key: TranslationKey,
  variables?: Record<string, string | number>,
) {
  const message = repairMojibake(translations[key]?.[language] || translations[key]?.['uz-latn'] || key);

  if (!variables) {
    return message;
  }

  return Object.entries(variables).reduce(
    (currentMessage, [variableKey, variableValue]) =>
      currentMessage.replaceAll(`{{${variableKey}}}`, String(variableValue)),
    message,
  );
}

export function getLocalizedOrderStatusLabel(status: OrderStatus, language: CustomerLanguage) {
  return statusLabels[status]?.[language] || statusLabels[status]?.['uz-latn'] || status;
}

export function getLocalizedTrackingSteps(language: CustomerLanguage) {
  return trackingStepsByLanguage[language] || trackingStepsByLanguage['uz-latn'];
}

export function useCustomerLanguage() {
  const preferredLanguage = useCustomerPreferencesStore((state) => state.language);
  const setLanguage = useCustomerPreferencesStore((state) => state.setLanguage);
  const authLanguage = useAuthStore((state) => state.user?.language);

  const language = React.useMemo(
    () => resolveCustomerLanguage(preferredLanguage, authLanguage),
    [preferredLanguage, authLanguage],
  );

  const tr = React.useCallback(
    (key: TranslationKey, variables?: Record<string, string | number>) =>
      translate(language, key, variables),
    [language],
  );

  const formatText = React.useCallback(
    (value: string | undefined | null) => localizeDynamicText(value, language),
    [language],
  );

  return {
    language,
    setLanguage,
    tr,
    formatText,
    intlLocale: getIntlLocale(language),
  };
}
