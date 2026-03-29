export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Somsa', image: 'https://img.freepik.com/free-photo/side-view-meat-pies-with-onions-plate_141793-15555.jpg' },
  { id: '2', name: 'Shashlik', image: 'https://img.freepik.com/free-photo/shish-kebab-with-onions-herbs_140725-546.jpg' },
  { id: '3', name: 'Osh', image: 'https://img.freepik.com/free-photo/pilaf-plate-with-meat-vegetables_140725-564.jpg' },
  { id: '4', name: 'Suyuq ovqatlar', image: 'https://img.freepik.com/free-photo/delicious-soup-with-meat-vegetables_23-2148419681.jpg' },
  { id: '5', name: 'Salatlar', image: 'https://img.freepik.com/free-photo/fresh-vegetable-salad-healthy-eating_23-2148155255.jpg' },
  { id: '6', name: 'Ichimliklar', image: 'https://img.freepik.com/free-photo/glasses-cold-beverages-with-ice_23-2148906969.jpg' },
  { id: '7', name: 'Non', image: 'https://img.freepik.com/free-photo/freshly-baked-bread_144627-14282.jpg' },
  { id: '8', name: 'Desertlar', image: 'https://img.freepik.com/free-photo/delicious-dessert-with-fruit-cream_23-2148472591.jpg' }
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: '101', categoryId: '1', name: 'Tandir Somsa', 
    price: 12000, image: 'https://img.freepik.com/free-photo/pie-with-meat-onions_140725-3004.jpg',
    description: 'An’anaviy tandirda yopilgan, sershira somsa.' 
  },
  { 
    id: '102', categoryId: '1', name: 'Qovurma Somsa', 
    price: 8000, image: 'https://img.freepik.com/free-photo/fried-pies-with-meat_140725-1033.jpg',
    description: 'Yog’da qovurilgan, qarsildoq xamirli somsa.' 
  },
  { 
    id: '103', categoryId: '1', name: 'Ko’k Somsa', 
    price: 6000, image: 'https://img.freepik.com/free-photo/traditional-central-asian-puff-pastry-with-greens_140725-1034.jpg',
    description: 'Bahoriy ko’k va o’tlar bilan tayyorlangan somsa.' 
  },
  { 
    id: '201', categoryId: '2', name: 'Lula Shashlik', 
    price: 22000, image: 'https://img.freepik.com/free-photo/lula-kebab-with-vegetables-plate_140725-555.jpg',
    description: 'Maydalangan go’shtdan tayyorlangan mazzali shashlik.' 
  },
  { 
    id: '202', categoryId: '2', name: 'Qo’y go’shtli Shashlik', 
    price: 25000, image: 'https://img.freepik.com/free-photo/delicious-grilled-meat-skewers-with-vegetables_23-2148184515.jpg',
    description: 'Eng sara qo’y go’shtidan tayyorlangan klassik shashlik.' 
  },
  { 
    id: '203', categoryId: '2', name: 'Tovuq Shashlik', 
    price: 18000, image: 'https://img.freepik.com/free-photo/chicken-kebab-with-spices-herbs_140725-557.jpg',
    description: 'Yumshoq tovuq go’shtidan tayyorlangan parhezli shashlik.' 
  },
  { 
    id: '301', categoryId: '3', name: 'Toy Oshi', 
    price: 35000, image: 'https://img.freepik.com/free-photo/central-asian-plov-pilaff-rice-with-lamb-meat_140725-3531.jpg',
    description: 'Bayramona to’y oshi, haqiqiy o’zbekcha taom.' 
  },
  { 
    id: '302', categoryId: '3', name: 'Choyxona Oshi', 
    price: 38000, image: 'https://img.freepik.com/free-photo/pilaf-with-lamb-meat-carrots_140725-3532.jpg',
    description: 'Qo’y yog’ida qovurilgan sershira choyxona oshi.' 
  },
  { 
    id: '401', categoryId: '4', name: 'Sho’rva', 
    price: 20000, image: 'https://img.freepik.com/free-photo/delicious-soup-with-meat-vegetables_23-2148419681.jpg',
    description: 'Go’shtli va sershira issiq sho’rva.' 
  },
  { 
    id: '402', categoryId: '4', name: 'Mastava', 
    price: 18000, image: 'https://img.freepik.com/free-photo/delicious-soup-with-vegetables-meat_23-2148419684.jpg',
    description: 'Guruchli va go’shtli an’anaviy mastava.' 
  },
  { 
    id: '403', categoryId: '4', name: 'Lag’mon', 
    price: 25000, image: 'https://img.freepik.com/free-photo/delicious-noodle-soup-with-meat-vegetables_23-2148419685.jpg',
    description: 'Cho’zma xamirli mazzali lag’mon.' 
  },
  { 
    id: '501', categoryId: '5', name: 'Achchiq-chuchuk', 
    price: 8000, image: 'https://img.freepik.com/free-photo/side-view-vegetable-salad-with-tomato-cucumber_141793-4700.jpg',
    description: 'Pomidor va bodringdan tayyorlangan klassik salad.' 
  },
  { 
    id: '502', categoryId: '5', name: 'Bahor salati', 
    price: 10000, image: 'https://img.freepik.com/free-photo/fresh-vegetable-salad_144627-14282.jpg',
    description: 'Ko’katlar va bargli salat.' 
  },
  { 
    id: '601', categoryId: '6', name: 'Coca-Cola 0.5L', 
    price: 10000, image: 'https://img.freepik.com/free-photo/bottles-coca-cola-with-ice_23-2148906970.jpg',
    description: 'Muzdek chanqoqbosti ichimlik.' 
  },
  { 
    id: '602', categoryId: '6', name: 'Choy (Ko’k)', 
    price: 3000, image: 'https://img.freepik.com/free-photo/cup-green-tea-with-mint_23-2148560565.jpg',
    description: 'Qaynoq ko’k choy.' 
  },
  { 
    id: '701', categoryId: '7', name: 'Issiq non', 
    price: 4000, image: 'https://img.freepik.com/free-photo/freshly-baked-bread_141793-4701.jpg',
    description: 'Tandirdan chiqqan issiq non.' 
  },
  { 
    id: '801', categoryId: '8', name: 'Pahlava', 
    price: 15000, image: 'https://img.freepik.com/free-photo/delicious-baklava-with-nuts_23-2148472592.jpg',
    description: 'Asalli va yong’oqli an’anaviy pahlava.' 
  }
];
