# Octax Racing Fuels (demo)

Demonstration e-commerce site for Octax Racing Fuels: high-octane race fuels,
methanol, ethanol and additives, with catalogue, cart and a simulated checkout.
All products, prices and stock are sample data.

## Stack

- Next.js (App Router) with static export (`output: "export"`)
- TypeScript, Tailwind CSS v4
- Framer Motion for the animated hero and scroll reveals
- Deployed as static files to GitHub Pages

## Run and build

```bash
npm install
npm run dev      # local dev at http://localhost:3000/octax-racing-fuels-demo
npm run build    # static export to ./out
npm run serve    # preview the built ./out with `npx serve`
```

`npm run build` runs `scripts/gen-assets.mjs` (favicon, apple icon, OG image) and
`scripts/gen-llms.mjs` (llms.txt) before exporting.

## URLs: one source of truth

Every absolute URL (canonical, sitemap, robots, Open Graph, JSON-LD) derives from
[`site.config.mjs`](site.config.mjs):

- `ORIGIN` + `BASE_PATH` -> `SITE_URL`
- `INDEXABLE` toggles robots and per-page meta between noindex (demo) and index.

`BASE_PATH` also feeds `next.config.mjs` so assets and links resolve under the
GitHub Pages sub-path.

## Production handoff

When the production domain is known:

1. In `site.config.mjs`, set `ORIGIN` and `BASE_PATH` to the production values
   (for a root domain, `BASE_PATH = ""`).
2. Set `INDEXABLE = true`.
3. Rebuild. Sitemap, robots, canonical, OG and schema URLs update automatically.
4. Wire a real payment provider into the checkout (the demo takes no payment).
5. Fill in real contact details and address; switch `Organization` schema to
   `LocalBusiness` if there is a physical location.
6. Submit the sitemap in Google Search Console.

## Attribution

Made and maintained by [Echo Software](https://echosoftware.co.za).
