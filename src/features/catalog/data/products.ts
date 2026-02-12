import { Product } from '../types/product';

const rawProducts: Array<Omit<Product, 'stock'>> = [
  // Camisetas Oversized
  {
    id: 'oversized-branca',
    name: 'Oversized Branca',
    price: 110.00,
    originalPrice: 150.00,
    image: 'https://i.postimg.cc/pVjdZX5X/Imagem-do-Whats-App-de-2025-08-12-s-19-57-02-a1d5bf1f.jpg',
    category: 'oversized',
    description: 'Camiseta oversized branca com modelagem ampla e confortável',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'oversized-preta',
    name: 'Oversized Preta',
    price: 110.00,
    originalPrice: 150.00,
    image: 'https://i.postimg.cc/J4c4f6Qf/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-2395cdc7.jpg',
    category: 'oversized',
    description: 'Camiseta oversized preta com modelagem ampla e confortável',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'oversized-cinza',
    name: 'Oversized Cinza',
    price: 110.00,
    originalPrice: 150.00,
    image: 'https://i.postimg.cc/FHTFRY8G/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-dbf4fe7c.jpg',
    category: 'oversized',
    description: 'Camiseta oversized cinza com modelagem ampla e confortável',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'oversized-verde',
    name: 'Oversized Verde',
    price: 110.00,
    originalPrice: 150.00,
    image: 'https://i.postimg.cc/KY4GgZyb/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-f4c2f0eb.jpg',
    category: 'oversized',
    description: 'Camiseta oversized verde com modelagem ampla e confortável',
    sizes: ['P', 'M', 'G', 'GG']
  },
  // Camisetas Básicas
  {
    id: 'logo-basica-branca',
    name: 'Logo Básica Branca',
    price: 74.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/4xfNs6Lm/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-7485f5d8.jpg',
    category: 'basicas',
    description: 'Camiseta básica com logo da marca em alta qualidade',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'basica-preta',
    name: 'Nome Básica Preta',
    price: 74.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/7hf1YFF1/BASICA-1.jpg',
    category: 'basicas',
    description: 'Camiseta básica preta essencial para o guarda-roupa',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'basica-branca',
    name: 'Nome Básica Branca',
    price: 74.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/kGzQVjC0/BASICA-2.jpg',
    category: 'basicas',
    description: 'Camiseta básica branca clássica e versátil',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'logo-basica-preta',
    name: 'Logo Básica Preta',
    price: 74.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/SNpxtFcL/Imagem-do-Whats-App-de-2025-08-12-s-19-57-03-34020ff4.jpg',
    category: 'basicas',
    description: 'Camiseta básica preta com logo da marca',
    sizes: ['P', 'M', 'G', 'GG']
  },
  // Camisetas Estampadas
  {
    id: 'gold-eagle',
    name: 'Gold Eagle',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/zXHSm1S8/CAMISA-2.jpg',
    category: 'estampadas',
    description: 'Camiseta com estampa exclusiva Gold Eagle',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'blue-fox',
    name: 'Blue Fox',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/x1KvCy4Z/CAMISA-1.jpg',
    category: 'estampadas',
    description: 'Camiseta com estampa artística Blue Fox',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'pink-panther',
    name: 'Pink Panther',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/tJZPHh62/CAMISA-5.jpg',
    category: 'estampadas',
    description: 'Camiseta com estampa vibrante Pink Panther',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'pink-heron',
    name: 'Pink Heron',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/KYxng3X8/CAMISA-3.jpg',
    category: 'estampadas',
    description: 'Camiseta com estampa elegante Pink Heron',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'green-jaguar',
    name: 'Green Jaguar',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/KzsLV911/CAMISA-4.jpg',
    category: 'estampadas',
    description: 'Camiseta com estampa selvagem Green Jaguar',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'good-eagle',
    name: 'Good Eagle',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/V6sB2r4V/Camisa-1-ANTIGA.jpg',
    category: 'estampadas',
    description: 'Camiseta clássica com estampa Good Eagle',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'school-rabbit',
    name: 'School Rabbit',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/HkCMf8k9/Camisa-5-ANTIGA.jpg',
    category: 'estampadas',
    description: 'Camiseta divertida com estampa School Rabbit',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'millionaire-angel',
    name: 'Millionaire Angel',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/5Nzv7Sbt/Camisa-6-ANTIGA.jpg',
    category: 'estampadas',
    description: 'Camiseta exclusiva com estampa Millionaire Angel',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'millionaire-duck',
    name: 'Millionaire Duck',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/KcHrsYT0/Camisa-2-ANTIGA.jpg',
    category: 'estampadas',
    description: 'Camiseta única com estampa Millionaire Duck',
    sizes: ['P', 'M', 'G', 'GG']
  },
  {
    id: 'blue-alien',
    name: 'Blue Alien',
    price: 79.90,
    originalPrice: 100.00,
    image: 'https://i.postimg.cc/W34g5R1R/Camisa-3-ANTIGA.jpg',
    category: 'estampadas',
    description: 'Camiseta futurística com estampa Blue Alien',
    sizes: ['P', 'M', 'G', 'GG']
  }
];

export const products: Product[] = rawProducts.map((product) => ({
  ...product,
  stock: 20,
}));

