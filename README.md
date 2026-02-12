# Nuvle Store

Projeto React + Vite + TypeScript organizado por dominio para ficar mais facil de entender e evoluir.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Estrutura

```text
src/
  app/
    App.tsx                  # Rotas principais da aplicacao
    pages/                   # Paginas (home, produtos, carrinho, checkout, pedidos...)
  features/
    catalog/
      components/            # Card, modal e busca de produtos
      data/products.ts       # Base de produtos
      types/product.ts       # Tipos do catalogo
      index.ts               # API publica do catalogo
    cart/
      components/            # Carrinho lateral
      context/CartContext.tsx# Estado global do carrinho
      types/                 # Tipos do carrinho e checkout
      index.ts               # API publica do carrinho
    orders/
      storage/localOrders.ts # Persistencia local do historico de pedidos
      types/                 # Tipos e metadados de status
      index.ts               # API publica de pedidos
    layout/
      components/Header.tsx
      index.ts
    theme/
      context/ThemeContext.tsx
      index.ts
  shared/
    providers/AppProviders.tsx # Providers globais da aplicacao
  main.tsx
  index.css
```

## Fluxo da aplicacao

1. `src/main.tsx` inicializa o React.
2. `src/app/App.tsx` monta layout global e as rotas.
3. `src/shared/providers/AppProviders.tsx` aplica `ThemeProvider` e `CartProvider`.
4. `src/features/cart/context/CartContext.tsx` persiste carrinho em `localStorage`.
5. `src/features/orders/storage/localOrders.ts` persiste historico de pedidos em `localStorage`.

## Onde editar cada parte

- Produtos: `src/features/catalog/data/products.ts`
- Regras do carrinho: `src/features/cart/context/CartContext.tsx`
- Regras de pedidos locais: `src/features/orders/storage/localOrders.ts`
- Header e navegacao: `src/features/layout/components/Header.tsx`
- Tema claro/escuro: `src/features/theme/context/ThemeContext.tsx`

## Rotas atuais

- `/` home
- `/produtos` catalogo
- `/produto/:productId` detalhe do produto
- `/carrinho` carrinho em pagina
- `/checkout` checkout em etapas
- `/pedidos` historico de pedidos local
- `/pedidos/:orderId` detalhe do pedido
- `/login` area de login visual
- `/conta` area de conta visual
