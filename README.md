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
    App.tsx                  # Composicao da pagina principal
  features/
    catalog/
      components/            # Card, modal e busca de produtos
      data/products.ts       # Base de produtos
      types/product.ts       # Tipos do catalogo
      index.ts               # API publica do catalogo
    cart/
      components/            # Carrinho e checkout
      context/CartContext.tsx# Estado global do carrinho
      types/                 # Tipos do carrinho e checkout
      index.ts               # API publica do carrinho
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
2. `src/app/App.tsx` monta layout, filtros, grid e modais.
3. `src/shared/providers/AppProviders.tsx` aplica `ThemeProvider` e `CartProvider`.
4. Cada feature expone seus modulos pelo proprio `index.ts`.

## Onde editar cada parte

- Produtos: `src/features/catalog/data/products.ts`
- Regras do carrinho: `src/features/cart/context/CartContext.tsx`
- Header e navegacao: `src/features/layout/components/Header.tsx`
- Tema claro/escuro: `src/features/theme/context/ThemeContext.tsx`
