# HowToHack

Sitio en Astro con publicacion automatica de articulos para Cloudflare Pages.

## Flujo automatico diario

1. GitHub Action corre cada dia (o manualmente).
2. Ejecuta `npm run generate:posts`.
3. Crea articulos markdown en `src/content/blog/`.
4. Hace commit/push automatico.
5. Cloudflare Pages detecta el push y despliega.

## Configuracion en GitHub

En el repositorio `howtohack`:

1. Ve a `Settings` -> `Secrets and variables` -> `Actions`.
2. Crea secret:
   - `ANTHROPIC_API_KEY` (tu API key real de Claude).
3. (Opcional) Crea variables:
   - `POSTS_PER_RUN` (ejemplo `10`).
   - `ANTHROPIC_MODEL` (ejemplo `claude-3-5-sonnet-latest`).
4. Ve a `Actions` y habilita el workflow `Daily Content Generator`.

## Ejecutar local

```sh
npm install
npm run generate:posts
npm run build
```

## Comandos utiles

- `npm run dev`: desarrollo local.
- `npm run build`: build de produccion.
- `npm run generate:posts`: genera articulos automaticamente.

## Notas de contenido

- El script es estricto: sin `ANTHROPIC_API_KEY` el workflow falla.
- Los articulos se publican como contenido etico y practico.
- Para imagenes libres no-AI, puedes ampliar el script con una API de stock libre antes de publicar.
