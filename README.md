# Sandy Garden · Propuesta de web y tarjeta de lealtad digital

Propuesta para Sandy Garden (sensory playground, Costa Rica): en `/` el rediseño de su web a todo el ancho, con el logo escribiéndose en la arena; en `/lealtad` la demo interactiva de la tarjeta de lealtad digital (8 visitas y la siguiente es gratis, personalizada a nombre de cada familia).

## Qué muestra

- **Celular de la familia**: tarjeta estilo Wallet con nombre, 8 sellos, premios (10% café a las 4, juego libre gratis a las 8), QR e historial (tocá `···`).
- **Mostrador · Recepción**: elegir familia, sellar visita, deshacer, crear tarjeta nueva, reiniciar demo.
- **Celebración de las 8 visitas**: pantalla completa en Three.js donde miles de granos de arena forman el logo de Sandy Garden. También se puede abrir con "Ver la celebración del pase gratis".
- **Arena viva**: el fondo se raya con el cursor y se borra solo.

El estado se guarda en `localStorage` del navegador. No hay backend.

## Correr

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/
```

## Estructura

- `src/pages/index.astro` la web propuesta (hero con el logo escrito en la arena, `scripts/sandWrite.ts`).
- `src/pages/lealtad.astro` la demo de la tarjeta de lealtad y arranca sus scripts.
- `src/components/` Header, Hero (Counter + Phone), HowItWorks, Experience, NextSteps (CTA de xnjaca), RewardOverlay, SandCanvas, Footer.
- `src/scripts/` `store.ts` (estado y persistencia), `loyalty.ts` (mostrador ↔ tarjeta), `reward.ts` + `sandLogo.ts` (escena Three.js, se carga bajo demanda), `sandWrite.ts` (logo escrito en la arena), `sand.ts` (fondo), `tilt.ts`.
- `src/data/families.ts` familias de ejemplo y reglas (`META = 8`, `MEDIA = 4`).
- `public/fonts` LORE y Vintage Rhyme (fuentes de la marca) · `public/img` logos oficiales · `public/img/site` fotos de sandygarden.com.

## Marca

Paleta oficial: Arena `#e5dbcc`, Lino `#fbf1e5`, Madera `#c79981`, Verde `#c9b659`, Azul Cielo `#c7dee2`. Tipografías: Vintage Rhyme (títulos), LORE (etiquetas), Figtree (interfaz). Voseo costarricense en todo el copy.
