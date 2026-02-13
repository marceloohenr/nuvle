# Nuvle Store

Projeto React + Vite + TypeScript de loja virtual com painel administrativo.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Supabase (obrigatorio para modo banco)

1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. No Supabase SQL Editor, execute `supabase/schema.sql`.
   Ele tambem cria o bucket `product-images` (publico) para upload das imagens no painel admin e adiciona suporte a multiplas imagens em `public.products.images`.
4. O SQL ja inclui a funcao transacional `create_order_with_stock` (pedido + baixa de estoque por tamanho).
   Sempre que eu atualizar esse arquivo, reexecute no SQL Editor para aplicar novas funcoes/policies.
5. Crie um usuario no Auth e depois marque o perfil como admin:

```sql
update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';
```

Sem essas variaveis, o projeto funciona em modo local (`localStorage`) para desenvolvimento.

## Estrutura

```text
src/
  app/
    App.tsx
    pages/
  features/
    auth/
      context/AuthContext.tsx      # Auth local + Supabase
    catalog/
      context/CatalogContext.tsx   # Catalogo/estoque local + Supabase
    cart/
      context/CartContext.tsx
    orders/
      storage/localOrders.ts       # Pedidos local + Supabase
    settings/
      context/StoreSettingsContext.tsx # Contato/redes local + Supabase
    layout/
    theme/
  shared/
    lib/supabase.ts                # Client e flag de configuracao
    providers/AppProviders.tsx
supabase/
  schema.sql                       # Tabelas, funcoes e politicas RLS
```

## Rotas

- `/` home
- `/produtos` catalogo
- `/produto/:productId` detalhe do produto
- `/carrinho` carrinho
- `/checkout` checkout
- `/pedidos` historico de pedidos
- `/pedidos/:orderId` detalhe do pedido
- `/login` login/cadastro
- `/conta` area da conta
- `/admin` painel administrativo
