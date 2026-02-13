-- Seed inicial do catalogo (categorias, produtos e estoque por tamanho).
-- Idempotente via UPSERT.

begin;

insert into public.categories (id, label)
values
  ('oversized', 'Oversized'),
  ('basicas', 'Basicas'),
  ('estampadas', 'Estampadas')
on conflict (id) do update
set label = excluded.label;

insert into public.products (
  id,
  name,
  price,
  original_price,
  discount_percentage,
  image,
  category_id,
  description
)
values
  (
    'oversized-branca',
    'Oversized Branca',
    110.00,
    150.00,
    26.67,
    'https://i.postimg.cc/pVjdZX5X/Imagem-do-Whats-App-de-2025-08-12-s-19-57-02-a1d5bf1f.jpg',
    'oversized',
    'Camiseta oversized branca com modelagem ampla e confortavel'
  ),
  (
    'oversized-preta',
    'Oversized Preta',
    110.00,
    150.00,
    26.67,
    'https://i.postimg.cc/J4c4f6Qf/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-2395cdc7.jpg',
    'oversized',
    'Camiseta oversized preta com modelagem ampla e confortavel'
  ),
  (
    'oversized-cinza',
    'Oversized Cinza',
    110.00,
    150.00,
    26.67,
    'https://i.postimg.cc/FHTFRY8G/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-dbf4fe7c.jpg',
    'oversized',
    'Camiseta oversized cinza com modelagem ampla e confortavel'
  ),
  (
    'oversized-verde',
    'Oversized Verde',
    110.00,
    150.00,
    26.67,
    'https://i.postimg.cc/KY4GgZyb/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-f4c2f0eb.jpg',
    'oversized',
    'Camiseta oversized verde com modelagem ampla e confortavel'
  ),
  (
    'logo-basica-branca',
    'Logo Basica Branca',
    74.90,
    100.00,
    25.10,
    'https://i.postimg.cc/4xfNs6Lm/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-7485f5d8.jpg',
    'basicas',
    'Camiseta basica com logo da marca em alta qualidade'
  ),
  (
    'basica-preta',
    'Nome Basica Preta',
    74.90,
    100.00,
    25.10,
    'https://i.postimg.cc/7hf1YFF1/BASICA-1.jpg',
    'basicas',
    'Camiseta basica preta essencial para o guarda-roupa'
  ),
  (
    'basica-branca',
    'Nome Basica Branca',
    74.90,
    100.00,
    25.10,
    'https://i.postimg.cc/kGzQVjC0/BASICA-2.jpg',
    'basicas',
    'Camiseta basica branca classica e versatil'
  ),
  (
    'logo-basica-preta',
    'Logo Basica Preta',
    74.90,
    100.00,
    25.10,
    'https://i.postimg.cc/SNpxtFcL/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-34020ff4.jpg',
    'basicas',
    'Camiseta basica preta com logo da marca'
  ),
  (
    'gold-eagle',
    'Gold Eagle',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/zXHSm1S8/CAMISA-2.jpg',
    'estampadas',
    'Camiseta com estampa exclusiva Gold Eagle'
  ),
  (
    'blue-fox',
    'Blue Fox',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/x1KvCy4Z/CAMISA-1.jpg',
    'estampadas',
    'Camiseta com estampa artistica Blue Fox'
  ),
  (
    'pink-panther',
    'Pink Panther',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/tJZPHh62/CAMISA-5.jpg',
    'estampadas',
    'Camiseta com estampa vibrante Pink Panther'
  ),
  (
    'pink-heron',
    'Pink Heron',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/KYxng3X8/CAMISA-3.jpg',
    'estampadas',
    'Camiseta com estampa elegante Pink Heron'
  ),
  (
    'green-jaguar',
    'Green Jaguar',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/KzsLV911/CAMISA-4.jpg',
    'estampadas',
    'Camiseta com estampa selvagem Green Jaguar'
  ),
  (
    'good-eagle',
    'Good Eagle',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/V6sB2r4V/Camisa-1-ANTIGA.jpg',
    'estampadas',
    'Camiseta classica com estampa Good Eagle'
  ),
  (
    'school-rabbit',
    'School Rabbit',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/HkCMf8k9/Camisa-5-ANTIGA.jpg',
    'estampadas',
    'Camiseta divertida com estampa School Rabbit'
  ),
  (
    'millionaire-angel',
    'Millionaire Angel',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/5Nzv7Sbt/Camisa-6-ANTIGA.jpg',
    'estampadas',
    'Camiseta exclusiva com estampa Millionaire Angel'
  ),
  (
    'millionaire-duck',
    'Millionaire Duck',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/KcHrsYT0/Camisa-2-ANTIGA.jpg',
    'estampadas',
    'Camiseta unica com estampa Millionaire Duck'
  ),
  (
    'blue-alien',
    'Blue Alien',
    79.90,
    100.00,
    20.10,
    'https://i.postimg.cc/W34g5R1R/Camisa-3-ANTIGA.jpg',
    'estampadas',
    'Camiseta futuristica com estampa Blue Alien'
  )
on conflict (id) do update
set
  name = excluded.name,
  price = excluded.price,
  original_price = excluded.original_price,
  discount_percentage = excluded.discount_percentage,
  image = excluded.image,
  category_id = excluded.category_id,
  description = excluded.description;

-- Estoque e guia de tamanho padrao por tamanho (aplicado a todos os produtos seed).
insert into public.product_sizes (product_id, size, stock, width_cm, length_cm, sleeve_cm)
select
  p.product_id,
  s.size,
  5 as stock,
  s.width_cm,
  s.length_cm,
  s.sleeve_cm
from (
  values
    ('oversized-branca'),
    ('oversized-preta'),
    ('oversized-cinza'),
    ('oversized-verde'),
    ('logo-basica-branca'),
    ('basica-preta'),
    ('basica-branca'),
    ('logo-basica-preta'),
    ('gold-eagle'),
    ('blue-fox'),
    ('pink-panther'),
    ('pink-heron'),
    ('green-jaguar'),
    ('good-eagle'),
    ('school-rabbit'),
    ('millionaire-angel'),
    ('millionaire-duck'),
    ('blue-alien')
) as p(product_id)
cross join (
  values
    ('P', 53, 71, 22),
    ('M', 56, 73, 23),
    ('G', 59, 75, 24),
    ('GG', 62, 77, 25)
) as s(size, width_cm, length_cm, sleeve_cm)
on conflict (product_id, size) do update
set
  stock = excluded.stock,
  width_cm = excluded.width_cm,
  length_cm = excluded.length_cm,
  sleeve_cm = excluded.sleeve_cm;

commit;