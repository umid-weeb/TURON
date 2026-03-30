import { prisma } from '../src/lib/prisma.js';
import { UserRoleEnum, LanguageEnum, PromoDiscountTypeEnum } from '@turon/shared';

async function main() {
  console.log('🌱 Starting Turon DB Seeding...');

  // 1. Roles & Users (Admin & Couriers)
  const adminId = 'admin-user-id';
  const courier1Id = 'courier-1-id';
  const courier2Id = 'courier-2-id';

  await prisma.user.upsert({
    where: { telegramId: '123456789' }, // Mock Admin Telegram ID
    update: {},
    create: {
      id: adminId,
      telegramId: '123456789',
      firstName: 'Admin',
      lastName: 'Turon',
      language: LanguageEnum.UZ,
      roles: { create: { role: UserRoleEnum.ADMIN } },
    },
  });

  await prisma.user.upsert({
    where: { telegramId: '987654321' }, // Mock Courier 1 Telegram ID
    update: {},
    create: {
      id: courier1Id,
      telegramId: '987654321',
      firstName: 'Alisher',
      lastName: 'Courier',
      phoneNumber: '+998901234567',
      language: LanguageEnum.UZ,
      roles: { create: { role: UserRoleEnum.COURIER } },
    },
  });

  await prisma.user.upsert({
    where: { telegramId: '543216789' }, // Mock Courier 2 Telegram ID
    update: {},
    create: {
      id: courier2Id,
      telegramId: '543216789',
      firstName: 'Bobur',
      lastName: 'Delivery',
      phoneNumber: '+998911234568',
      language: LanguageEnum.UZ,
      roles: { create: { role: UserRoleEnum.COURIER } },
    },
  });

  console.log('✅ Users & Roles seeded');

  // 2. Menu Categories (8 items)
  const categories = [
    { nameUz: 'Somsa', nameRu: 'Самса', nameEn: 'Samsa', sortOrder: 1 },
    { nameUz: 'Shashlik', nameRu: 'Шашлык', nameEn: 'Shashlik', sortOrder: 2 },
    { nameUz: 'Osh', nameRu: 'Плов', nameEn: 'Plov', sortOrder: 3 },
    { nameUz: 'Sho’rva', nameRu: 'Суп', nameEn: 'Soup', sortOrder: 4 },
    { nameUz: 'Salatlar', nameRu: 'Салаты', nameEn: 'Salads', sortOrder: 5 },
    { nameUz: 'Nonlar', nameRu: 'Хлеб', nameEn: 'Bread', sortOrder: 6 },
    { nameUz: 'Ichimliklar', nameRu: 'Напитки', nameEn: 'Drinks', sortOrder: 7 },
    { nameUz: 'Desertlar', nameRu: 'Десерты', nameEn: 'Desserts', sortOrder: 8 },
  ];

  await prisma.menuCategory.deleteMany(); // Clear for fresh seed
  const createdCategories: any[] = [];
  for (const cat of categories) {
    const created = await prisma.menuCategory.create({ data: cat });
    createdCategories.push(created);
  }
  console.log('✅ Categories seeded');

  // 3. Menu Items (20 items distributed)
  const menuItems = [
    {
      categoryId: createdCategories[0].id,
      nameUz: 'Tandir Somsa', nameRu: 'Тандырная самса', nameEn: 'Tandoor Samsa',
      price: 12000, stockQuantity: 100,
      descriptionUz: 'An’anaviy tandirda yopilgan mazali somsa',
    },
    {
      categoryId: createdCategories[1].id,
      nameUz: 'Qo’y go’shtli shashlik', nameRu: 'Шашлык из баранины', nameEn: 'Lamb Shashlik',
      price: 25000, stockQuantity: 50,
      descriptionUz: 'Mayin va sershira qo’y go’shti',
    },
    {
      categoryId: createdCategories[2].id,
      nameUz: 'To’y Oshi', nameRu: 'Плов Свадебный', nameEn: 'Wedding Plov',
      price: 45000, stockQuantity: 80,
      descriptionUz: 'Eng sara guruch va go’shtdan tayyorlangan plov',
    },
    {
      categoryId: createdCategories[6].id,
      nameUz: 'Choy (Ko’k/Qora)', nameRu: 'Чай (Зеленый/Черный)', nameEn: 'Tea (Green/Black)',
      price: 5000, stockQuantity: 200,
    },
    // Adding more items to reach 20 as requested
    ...Array.from({ length: 16 }).map((_, i) => ({
      categoryId: createdCategories[i % 8].id,
      nameUz: `Taom #${i + 5}`, nameRu: `Блюдо #${i + 5}`, nameEn: `Dish #${i + 5}`,
      price: 15000 + (i * 1000),
      stockQuantity: 50,
      descriptionUz: 'Mazzali taom namunasi'
    }))
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log('✅ 20 Menu Items seeded');

  // 4. Promo Codes (2 items)
  await prisma.promoCode.createMany({
    data: [
      {
        code: 'WELCOME2026',
        discountType: PromoDiscountTypeEnum.PERCENTAGE,
        discountValue: 10,
        minOrderValue: 100000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        code: 'TURON_FIXED',
        discountType: PromoDiscountTypeEnum.FIXED_AMOUNT,
        discountValue: 20000,
        minOrderValue: 150000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      }
    ]
  });
  console.log('✅ Promo codes seeded');

  console.log('✨ Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
