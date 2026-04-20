begin;

-- Refreshes the live customer catalog for the single-restaurant Turon Kafesi app.
-- Safe to re-run: categories are upserted by slug, products by fixed id.

-- 1) Deactivate the currently active catalog so legacy demo rows stop surfacing.
update public.menu_items
set
  is_active = false,
  availability_status = 'TEMPORARILY_UNAVAILABLE',
  updated_at = now()
where is_active = true;

-- 2) Upsert the approved Turon Kafesi category list.
insert into public.menu_categories (slug, name_uz, name_ru, icon_url, sort_order, is_active)
values
  ('osh', 'Osh', 'Plov', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', 1, true),
  ('shorva', 'Sho''rva', 'Sup', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', 2, true),
  ('fast-food', 'Fast food', 'Fast food', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 3, true),
  ('lavash', 'Lavash', 'Lavash', 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=1200&q=80', 4, true),
  ('burger', 'Burger', 'Burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', 5, true),
  ('donar', 'Donar', 'Doner', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=80', 6, true),
  ('grill', 'Grill', 'Grill', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80', 7, true),
  ('pitsa', 'Pitsa', 'Pitsa', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', 8, true),
  ('ichimliklar', 'Ichimliklar', 'Napitki', 'https://images.unsplash.com/photo-1508253578933-20b529302151?auto=format&fit=crop&w=1200&q=80', 9, true),
  ('shirinliklar', 'Shirinliklar', 'Deserty', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80', 10, true),
  ('tortlar', 'Tortlar', 'Torty', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80', 11, true),
  ('somsa', 'Somsa', 'Samsa', 'https://images.unsplash.com/photo-1542826438-4c8b6f1f27a0?auto=format&fit=crop&w=1200&q=80', 12, true),
  ('muzqaymoq', 'Muzqaymoq', 'Morozhenoe', 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80', 13, true)
on conflict (slug) do update
set
  name_uz = excluded.name_uz,
  name_ru = excluded.name_ru,
  icon_url = excluded.icon_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- 3) Only the approved single-restaurant categories remain active.
update public.menu_categories
set
  is_active = false,
  updated_at = now()
where slug not in (
  'osh',
  'shorva',
  'fast-food',
  'lavash',
  'burger',
  'donar',
  'grill',
  'pitsa',
  'ichimliklar',
  'shirinliklar',
  'tortlar',
  'somsa',
  'muzqaymoq'
);

-- 4) Upsert the live Turon catalog.
insert into public.menu_items (
  id,
  category_id,
  name_uz,
  name_ru,
  description_uz,
  description_ru,
  price,
  old_price,
  image_url,
  weight_text,
  badge_text,
  is_featured,
  is_new,
  is_popular,
  is_discounted,
  discount_percent,
  is_active,
  availability_status,
  stock_quantity,
  sort_order
)
values
  -- Osh
  ('41000000-0000-4000-8000-000000000001', (select id from public.menu_categories where slug = 'osh'), 'Osh 1 porsiya', 'Plov 1 portsia', 'An''anaviy osh, bedana tuxumi va qazi bilan.', 'Traditsionnyy plov s perepelinym yaytsom i kazy.', 32000, null, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Top', false, false, true, false, null, true, 'AVAILABLE', 50, 1),
  ('41000000-0000-4000-8000-000000000002', (select id from public.menu_categories where slug = 'osh'), 'Osh 1 kg', 'Plov 1 kg', 'Oilaviy buyurtma uchun katta hajmli osh.', 'Plov dlya semeynogo zakaza, bolshaya porciya.', 110000, 125000, 'https://images.unsplash.com/photo-1604908177522-022b08b1c6e5?auto=format&fit=crop&w=1200&q=80', '1 kg', 'Aksiya', true, false, true, true, 12, true, 'AVAILABLE', 12, 2),

  -- Sho'rva
  ('41000000-0000-4000-8000-000000000003', (select id from public.menu_categories where slug = 'shorva'), 'Mastava', 'Mastava', 'Yengil va to''yimli guruchli sho''rva.', 'Legkiy i sytnyy risovyy sup.', 24000, null, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 25, 1),
  ('41000000-0000-4000-8000-000000000004', (select id from public.menu_categories where slug = 'shorva'), 'Mol go''shtli sho''rva', 'Sup s govyadinoy', 'Mol go''shti va sabzavotli sho''rva.', 'Sup s govyadinoy i ovoschami.', 27000, null, 'https://images.unsplash.com/photo-1505253216365-85f98fbcbb76?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 20, 2),
  ('41000000-0000-4000-8000-000000000005', (select id from public.menu_categories where slug = 'shorva'), 'Chuchvara sho''rva', 'Sup s pelmenyami', 'Uy usulidagi chuchvara sho''rva.', 'Domashniy sup s chuchvaroy.', 26000, null, 'https://images.unsplash.com/photo-1498579809087-ef1e558fd1da?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 18, 3),

  -- Fast food
  ('41000000-0000-4000-8000-000000000006', (select id from public.menu_categories where slug = 'fast-food'), 'Beshteks', 'Bifshteks', 'Go''shtli beshteks va garnir bilan.', 'Bifshteks s garnitrom.', 34000, null, 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 16, 1),
  ('41000000-0000-4000-8000-000000000007', (select id from public.menu_categories where slug = 'fast-food'), 'Assorti', 'Assorti', 'Turli taomlardan iborat katta to''plam.', 'Bolshoy set iz raznyh blyud.', 99000, 115000, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', '1 to''plam', 'Aksiya', true, false, true, true, 14, true, 'AVAILABLE', 8, 2),
  ('41000000-0000-4000-8000-000000000008', (select id from public.menu_categories where slug = 'fast-food'), 'Qozonkabob', 'Kazan-kebab', 'Qozonda pishirilgan go''sht va kartoshka.', 'Myaso i kartofel, prigotovlennye v kazane.', 78000, null, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, true, false, null, true, 'AVAILABLE', 10, 3),
  ('41000000-0000-4000-8000-000000000009', (select id from public.menu_categories where slug = 'fast-food'), 'Xot-dog go''shtli', 'Myasnoy hot-dog', 'Go''shtli sosiska va maxsus sous bilan.', 'Myasnaya sosiska s firmennym sousom.', 22000, null, 'https://images.unsplash.com/photo-1619740455993-9c86b1a2a2c8?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 30, 4),

  -- Lavash
  ('41000000-0000-4000-8000-000000000010', (select id from public.menu_categories where slug = 'lavash'), 'Lavash oddiy', 'Klassicheskiy lavash', 'Tovuq go''shti, sabzavot va sous bilan.', 'Kuritsa, ovoschi i sous.', 29000, null, 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Top', false, false, true, false, null, true, 'AVAILABLE', 40, 1),
  ('41000000-0000-4000-8000-000000000011', (select id from public.menu_categories where slug = 'lavash'), 'Lavash big', 'Bolshoy lavash', 'Katta hajmli va ko''proq go''shtli lavash.', 'Bolshoy lavash s dopolnitelnym myasom.', 36000, 41000, 'https://images.unsplash.com/photo-1530469912745-a215c6b256ea?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Aksiya', true, false, true, true, 12, true, 'AVAILABLE', 24, 2),
  ('41000000-0000-4000-8000-000000000012', (select id from public.menu_categories where slug = 'lavash'), 'Lavash tandir', 'Tandyrnyy lavash', 'Tandir nonli lavash.', 'Lavash v tandyrnoy lepeshke.', 33000, null, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 18, 3),
  ('41000000-0000-4000-8000-000000000013', (select id from public.menu_categories where slug = 'lavash'), 'Lavash chiz', 'Lavash s syrom', 'Pishloqli va yumshoq lavash.', 'Lavash s rasplavlennym syrom.', 31000, null, 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 15, 4),

  -- Burger
  ('41000000-0000-4000-8000-000000000014', (select id from public.menu_categories where slug = 'burger'), 'Gamburger', 'Gamburger', 'Klassik gamburger.', 'Klassicheskiy gamburger.', 24000, null, 'https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 25, 1),
  ('41000000-0000-4000-8000-000000000015', (select id from public.menu_categories where slug = 'burger'), 'Dabl gamburger', 'Dvoynoy gamburger', 'Ikki qavatli kotlet bilan.', 'S dvumya kotletami.', 33000, 38000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Aksiya', false, false, true, true, 13, true, 'AVAILABLE', 18, 2),
  ('41000000-0000-4000-8000-000000000016', (select id from public.menu_categories where slug = 'burger'), 'Chiz burger', 'Chizburger', 'Cheddar pishloqli burger.', 'Burger s syrom cheddar.', 28000, null, 'https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Top', false, false, true, false, null, true, 'AVAILABLE', 20, 3),
  ('41000000-0000-4000-8000-000000000017', (select id from public.menu_categories where slug = 'burger'), 'Tovuq burger', 'Kurinyy burger', 'Qarsildoq tovuq filesi bilan.', 'S hrustyashchim kurinym file.', 27000, null, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, true, false, false, null, true, 'AVAILABLE', 22, 4),

  -- Donar
  ('41000000-0000-4000-8000-000000000018', (select id from public.menu_categories where slug = 'donar'), 'Donar klassik', 'Klassicheskiy doner', 'Mol go''shti, karam va sous bilan.', 'Govyadina, kapusta i sous.', 32000, null, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Top', false, false, true, false, null, true, 'AVAILABLE', 26, 1),
  ('41000000-0000-4000-8000-000000000019', (select id from public.menu_categories where slug = 'donar'), 'Donar achchiq', 'Ostryy doner', 'Achchiq sousli donar.', 'Doner s ostrym sousom.', 34000, null, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 18, 2),

  -- Grill
  ('41000000-0000-4000-8000-000000000020', (select id from public.menu_categories where slug = 'grill'), 'KFC 1 kg', 'KFC 1 kg', 'Katta to''plam qarsildoq tovuq.', 'Bolshoy set hrustyashchey kuritsy.', 98000, 114000, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80', '1 kg', 'Aksiya', true, false, true, true, 14, true, 'AVAILABLE', 10, 1),
  ('41000000-0000-4000-8000-000000000021', (select id from public.menu_categories where slug = 'grill'), 'KFC 1 porsiya', 'KFC 1 portsia', 'Qarsildoq tovuq, bitta porsiya.', 'Hrustyashchaya kuritsa, odna porciya.', 34000, null, 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 16, 2),
  ('41000000-0000-4000-8000-000000000022', (select id from public.menu_categories where slug = 'grill'), 'Grill tovuq', 'Gril kuritsa', 'Butun grill tovuq.', 'Tselyy gril kuritsa.', 62000, null, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 9, 3),
  ('41000000-0000-4000-8000-000000000023', (select id from public.menu_categories where slug = 'grill'), 'Grill 1 porsiya', 'Gril 1 portsia', 'Grill tovuqning ixcham porsiyasi.', 'Portsiya gril kuritsy.', 29000, null, 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 18, 4),

  -- Pitsa
  ('41000000-0000-4000-8000-000000000024', (select id from public.menu_categories where slug = 'pitsa'), 'Pitsa go''shtli', 'Myasnaya pitsa', 'Go''shtli pitsa.', 'Pitsa s myasom.', 74000, null, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', '30 sm', null, false, false, false, false, null, true, 'AVAILABLE', 12, 1),
  ('41000000-0000-4000-8000-000000000025', (select id from public.menu_categories where slug = 'pitsa'), 'Pitsa qaziqli', 'Pitsa s kazy', 'Qazi qo''shilgan pitsa.', 'Pitsa s kazy.', 79000, 89000, 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1200&q=80', '30 sm', 'Aksiya', false, false, true, true, 11, true, 'AVAILABLE', 10, 2),
  ('41000000-0000-4000-8000-000000000026', (select id from public.menu_categories where slug = 'pitsa'), 'Pitsa pepperoni', 'Pitsa pepperoni', 'Pepperoni va pishloqli pitsa.', 'Pitsa pepperoni s syrom.', 82000, null, 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?auto=format&fit=crop&w=1200&q=80', '30 sm', 'Top', true, true, true, false, null, true, 'AVAILABLE', 14, 3),

  -- Ichimliklar
  ('41000000-0000-4000-8000-000000000027', (select id from public.menu_categories where slug = 'ichimliklar'), 'Limon choy', 'Limonnyy chay', 'Limonli issiq choy.', 'Goryachiy chay s limonom.', 12000, null, 'https://images.unsplash.com/photo-1508253578933-20b529302151?auto=format&fit=crop&w=1200&q=80', '400 ml', null, false, false, false, false, null, true, 'AVAILABLE', 30, 1),
  ('41000000-0000-4000-8000-000000000028', (select id from public.menu_categories where slug = 'ichimliklar'), 'Mevali choy', 'Fruktovyy chay', 'Mevali issiq choy.', 'Fruktovyy goryachiy chay.', 14000, null, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', '400 ml', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 22, 2),
  ('41000000-0000-4000-8000-000000000029', (select id from public.menu_categories where slug = 'ichimliklar'), 'Americano', 'Americano', 'Qora qahva.', 'Chyornyy kofe.', 17000, null, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80', '250 ml', null, false, false, false, false, null, true, 'AVAILABLE', 18, 3),
  ('41000000-0000-4000-8000-000000000030', (select id from public.menu_categories where slug = 'ichimliklar'), 'Cappuccino', 'Cappuccino', 'Sutli qahva.', 'Kofe s molokom.', 22000, null, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80', '250 ml', null, false, false, false, false, null, true, 'AVAILABLE', 16, 4),
  ('41000000-0000-4000-8000-000000000031', (select id from public.menu_categories where slug = 'ichimliklar'), 'Pepsi 1.5L', 'Pepsi 1.5L', 'Sovuq gazli ichimlik.', 'Gazirovannyy napitok.', 16000, null, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80', '1.5 L', null, false, false, true, false, null, true, 'AVAILABLE', 45, 5),

  -- Shirinliklar
  ('41000000-0000-4000-8000-000000000032', (select id from public.menu_categories where slug = 'shirinliklar'), 'Pirojniy', 'Pirozhnoe', 'Yengil kremli pirojniy.', 'Lyogkoe kremovoe pirozhnoe.', 18000, null, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 20, 1),
  ('41000000-0000-4000-8000-000000000033', (select id from public.menu_categories where slug = 'shirinliklar'), 'Desert', 'Desert', 'Shirin desert.', 'Sladkiy desert.', 22000, null, 'https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 14, 2),

  -- Tortlar
  ('41000000-0000-4000-8000-000000000034', (select id from public.menu_categories where slug = 'tortlar'), 'Napoleon tort', 'Tort Napoleon', 'Qatlamli napoleon tort bo''lagi.', 'Kusok torta napoleon.', 24000, null, 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80', '1 bo''lak', null, false, false, false, false, null, true, 'AVAILABLE', 16, 1),
  ('41000000-0000-4000-8000-000000000035', (select id from public.menu_categories where slug = 'tortlar'), 'Medovik tort', 'Tort medovik', 'Asalli medovik tort.', 'Medovik s myodovym vkusom.', 26000, null, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=80', '1 bo''lak', 'Top', false, false, true, false, null, true, 'AVAILABLE', 12, 2),

  -- Somsa
  ('41000000-0000-4000-8000-000000000036', (select id from public.menu_categories where slug = 'somsa'), 'Somsa go''shtli', 'Samsa s myasom', 'Go''shtli somsa.', 'Samsa s myasom.', 9000, null, 'https://images.unsplash.com/photo-1542826438-4c8b6f1f27a0?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 60, 1),
  ('41000000-0000-4000-8000-000000000037', (select id from public.menu_categories where slug = 'somsa'), 'Somsa kartoshkali', 'Samsa s kartoshkoy', 'Kartoshkali somsa.', 'Samsa s kartoshkoy.', 7000, null, 'https://images.unsplash.com/photo-1542826438-4c8b6f1f27a0?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 40, 2),
  ('41000000-0000-4000-8000-000000000038', (select id from public.menu_categories where slug = 'somsa'), 'Somsa ko''katli', 'Samsa s zelenyu', 'Ko''katli somsa.', 'Samsa s zelenyu.', 7000, null, 'https://images.unsplash.com/photo-1542826438-4c8b6f1f27a0?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 35, 3),

  -- Muzqaymoq
  ('41000000-0000-4000-8000-000000000039', (select id from public.menu_categories where slug = 'muzqaymoq'), 'Muzqaymoq vanilli', 'Vanilnoe morozhenoe', 'Vanilli muzqaymoq.', 'Vanilnoe morozhenoe.', 12000, null, 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80', '120 g', null, false, false, true, false, null, true, 'AVAILABLE', 30, 1),
  ('41000000-0000-4000-8000-000000000040', (select id from public.menu_categories where slug = 'muzqaymoq'), 'Muzqaymoq shokoladli', 'Shokoladnoe morozhenoe', 'Shokoladli muzqaymoq.', 'Shokoladnoe morozhenoe.', 13000, null, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80', '120 g', null, false, false, false, false, null, true, 'AVAILABLE', 24, 2),

  -- Qo'shimcha Osh
  ('41000000-0000-4000-8000-000000000041', (select id from public.menu_categories where slug = 'osh'), 'Osh sabzi bilan', 'Plov s zeleninoy', 'Sabzavotli osh.', 'Plov s zelenyu i speciyami.', 36000, null, 'https://images.unsplash.com/photo-1585238341710-4913d3ca7296?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Top', false, true, false, false, null, true, 'AVAILABLE', 15, 3),
  ('41000000-0000-4000-8000-000000000042', (select id from public.menu_categories where slug = 'osh'), 'Osh mol go''shti', 'Plov s govyadinoy', 'Mol go''shti bilan osh.', 'Plov s govyadinoy i yaycom.', 38000, 44000, 'https://images.unsplash.com/photo-1593080810901-8d1b68aad999?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Aksiya', true, false, true, true, 13, true, 'AVAILABLE', 12, 4),

  -- Qo'shimcha Sho'rva
  ('41000000-0000-4000-8000-000000000043', (select id from public.menu_categories where slug = 'shorva'), 'Xo''rma sho''rva', 'Sup v'kharma', 'Xo''rma va somsa bilan sho''rva.', 'Sup s ha harma.', 28000, null, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 13, 4),
  ('41000000-0000-4000-8000-000000000044', (select id from public.menu_categories where slug = 'shorva'), 'Jo ''josh sho''rva', 'Sup goryachiy', 'Jo''josh bilan achchiq sho''rva.', 'Ostriy goryachiy sup.', 25000, null, 'https://images.unsplash.com/photo-1547114855-ab107036c474?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 17, 5),

  -- Qo'shimcha Fast Food
  ('41000000-0000-4000-8000-000000000045', (select id from public.menu_categories where slug = 'fast-food'), 'Achchiq qozon', 'Ostryy kazan', 'Achchiq qozonda pishirilgan.', 'S ostrym sousom v kazane.', 82000, null, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80', '1 porsiya', null, false, false, false, false, null, true, 'AVAILABLE', 11, 5),
  ('41000000-0000-4000-8000-000000000046', (select id from public.menu_categories where slug = 'fast-food'), 'Tavuk tandur', 'Kuritsa tandur', 'Tandurda pishirilgan tavuk.', 'Kuritsa, prigotvlennaya v tandyre.', 68000, 78000, 'https://images.unsplash.com/photo-1555939594-58d7cb561404?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Aksiya', false, false, true, true, 12, true, 'AVAILABLE', 14, 6),

  -- Qo'shimcha Lavash
  ('41000000-0000-4000-8000-000000000047', (select id from public.menu_categories where slug = 'lavash'), 'Lavash achchiqi', 'Ostriy lavash', 'Achchiq sous bilan lavash.', 'Lavash s ostrym sousom.', 32000, null, 'https://images.unsplash.com/photo-1544986991-b53faf72f640?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 16, 5),
  ('41000000-0000-4000-8000-000000000048', (select id from public.menu_categories where slug = 'lavash'), 'Lavash tovuq', 'Lavash kuritsa', 'Tovuq go''shti lavash.', 'Lavash s kuritsey.', 31000, null, 'https://images.unsplash.com/photo-1552332386-e2d2ffa2da65?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 18, 6),

  -- Qo'shimcha Burger
  ('41000000-0000-4000-8000-000000000049', (select id from public.menu_categories where slug = 'burger'), 'Burger vegearian', 'Vegetarianskiy burger', 'Sabzavot bilan burger.', 'Burger s zelenyu i ovoshhami.', 26000, null, 'https://images.unsplash.com/photo-1585340741938-3246dd4ae446?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 14, 5),
  ('41000000-0000-4000-8000-000000000050', (select id from public.menu_categories where slug = 'burger'), 'Burger achchiq', 'Burger ostriy', 'Achchiq burger.', 'Burger s ostrym pepperom.', 29000, null, 'https://images.unsplash.com/photo-1556740712-6b33ca2c8f7d?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, true, false, false, null, true, 'AVAILABLE', 13, 6),

  -- Qo'shimcha Donar
  ('41000000-0000-4000-8000-000000000051', (select id from public.menu_categories where slug = 'donar'), 'Donar tovuq', 'Doner kuritsa', 'Tovuq donari.', 'Doner iz kuritsy.', 30000, null, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 19, 3),
  ('41000000-0000-4000-8000-000000000052', (select id from public.menu_categories where slug = 'donar'), 'Donar vegetarian', 'Vegetarianskiy doner', 'Sabzavot donari.', 'Doner iz ovoshchey.', 26000, null, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', '1 dona', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 17, 4),

  -- Qo'shimcha Grill
  ('41000000-0000-4000-8000-000000000053', (select id from public.menu_categories where slug = 'grill'), 'Grill qo''y go''shti', 'Gril baranina', 'Qo''y go''shti grillda.', 'Baranina na grile.', 89000, null, 'https://images.unsplash.com/photo-1432856712768-6f851b8a23d6?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Top', false, false, true, false, null, true, 'AVAILABLE', 8, 5),
  ('41000000-0000-4000-8000-000000000054', (select id from public.menu_categories where slug = 'grill'), 'Grill lula', 'Gril lula', 'Lula kebab grillda.', 'Lula kebab na grile.', 76000, 88000, 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80', '1 porsiya', 'Aksiya', false, false, true, true, 13, true, 'AVAILABLE', 11, 6),

  -- Qo'shimcha Pitsa
  ('41000000-0000-4000-8000-000000000055', (select id from public.menu_categories where slug = 'pitsa'), 'Pitsa sabzavotli', 'Pitsa s zelenyu', 'Sabzavotli pitsa.', 'Pitsa s zelenyu i speciyami.', 86000, null, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80', '30 sm', null, false, false, false, false, null, true, 'AVAILABLE', 11, 4),
  ('41000000-0000-4000-8000-000000000056', (select id from public.menu_categories where slug = 'pitsa'), 'Pitsa Margarita', 'Margarita', 'Klassik margarita pitsa.', 'Klassicheskaya margarita.', 72000, null, 'https://images.unsplash.com/photo-1628840042765-356cda07f4ee?auto=format&fit=crop&w=1200&q=80', '30 sm', 'Yangi', false, true, false, false, null, true, 'AVAILABLE', 13, 5),

  -- Qo'shimcha Ichimliklar
  ('41000000-0000-4000-8000-000000000057', (select id from public.menu_categories where slug = 'ichimliklar'), 'Qahva latte', 'Latte kofe', 'Latte qahva.', 'Kofe latte.', 24000, null, 'https://images.unsplash.com/photo-1487700307025-ab594b3ec370?auto=format&fit=crop&w=1200&q=80', '250 ml', null, false, false, false, false, null, true, 'AVAILABLE', 15, 6),
  ('41000000-0000-4000-8000-000000000058', (select id from public.menu_categories where slug = 'ichimliklar'), 'Sharbat', 'Kompot', 'Mevali sharbat.', 'Fruktovyy kompot.', 11000, null, 'https://images.unsplash.com/photo-1437282318942-d5bbb2d9b0ee?auto=format&fit=crop&w=1200&q=80', '300 ml', null, false, false, false, false, null, true, 'AVAILABLE', 25, 7),
  ('41000000-0000-4000-8000-000000000059', (select id from public.menu_categories where slug = 'ichimliklar'), 'Mineeral suvi', 'Mineralnaya voda', 'Mineralni suv.', 'Mineralnaya voda.', 8000, null, 'https://images.unsplash.com/photo-1608720039177-a92e85f5c0ff?auto=format&fit=crop&w=1200&q=80', '500 ml', null, false, false, false, false, null, true, 'AVAILABLE', 50, 8),

  -- Qo'shimcha Shirinliklar
  ('41000000-0000-4000-8000-000000000060', (select id from public.menu_categories where slug = 'shirinliklar'), 'Krem-brulee', 'Krem-brulee', 'Kremli krem-brulee.', 'Kremovoe krem-brulee.', 21000, null, 'https://images.unsplash.com/photo-1488477304112-4bae1a6978f9?auto=format&fit=crop&w=1200&q=80', '1 dona', null, false, false, false, false, null, true, 'AVAILABLE', 10, 3),

  -- Qo'shimcha Tortlar
  ('41000000-0000-4000-8000-000000000061', (select id from public.menu_categories where slug = 'tortlar'), 'Shokoladli tort', 'Shokoladnyy tort', 'Shokoladli tort.', 'Shokoladnyy tort.', 28000, null, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80', '1 bo''lak', null, false, false, false, false, null, true, 'AVAILABLE', 11, 3)
on conflict (id) do update
set
  category_id = excluded.category_id,
  name_uz = excluded.name_uz,
  name_ru = excluded.name_ru,
  description_uz = excluded.description_uz,
  description_ru = excluded.description_ru,
  price = excluded.price,
  old_price = excluded.old_price,
  image_url = excluded.image_url,
  weight_text = excluded.weight_text,
  badge_text = excluded.badge_text,
  is_featured = excluded.is_featured,
  is_new = excluded.is_new,
  is_popular = excluded.is_popular,
  is_discounted = excluded.is_discounted,
  discount_percent = excluded.discount_percent,
  is_active = excluded.is_active,
  availability_status = excluded.availability_status,
  stock_quantity = excluded.stock_quantity,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
