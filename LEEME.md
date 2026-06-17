# PARTE 2 — Next.js (el InfoLink conectado a la base)

Este es el **frontend** que tus clientes finales abren. Lee el menú/promos de
Supabase y maneja los sellos por API. Reusa el diseño SELLO (sello de cera).

## Requisito
Primero corre la **PARTE 1** en Supabase y ten a mano tus 3 llaves.

## Pasos para correr local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea el archivo de llaves:
   ```bash
   cp .env.local.example .env.local
   ```
   y pega tus 3 llaves de Supabase dentro.
3. Arranca:
   ```bash
   npm run dev
   ```
4. Abre: **http://localhost:3000/i/cafedelvalle/menu**
   - "Sumar sello" suma de verdad en la base (recarga y se mantiene).
   - Al llegar a 10 → premio + celebración → el contador vuelve a 0.

## Subir a producción (Vercel)

1. Sube esta carpeta a un repo de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. En **Environment Variables** pega las mismas 3 llaves del `.env.local`.
4. **Deploy**. Te queda una URL tipo `sello.vercel.app/i/cafedelvalle/menu`.

## Cómo funciona (mapa rápido)

```
Cliente abre  /i/[handle]/[slug]
      │
      ▼
app/i/[handle]/[slug]/page.jsx   (servidor)
      │  rpc get_infolink(handle) → menú + promos
      ▼
components/InfoLink.jsx          (navegador, "use client")
      │  POST /api/tarjeta  → crea/lee la tarjeta del cliente (token)
      │  POST /api/sello    → suma sello (rpc sumar_sello)
      │  POST /api/pedido   → guarda pedido + suma sello
      ▼
Supabase  (las funciones hacen la lógica, el front solo pinta)
```

## Para multi-cliente (white-label)
Ya está listo: crea otro negocio en la tabla `negocios` con otro `handle`
y su URL `/i/otro-handle/menu` funciona sola, con su color, premio y menú.

## Lo que sigue (no incluido aquí, siguiente fase)
- **Panel del dueño** con login (analítica + kanban de pedidos + CRM).
- **Pases reales** Apple/Google Wallet (vía PassKit/PassEntry).
- **QR del staff** para que el sello lo dé el negocio, no el cliente.
