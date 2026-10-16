# OCTA Performance

E-commerce site for OCTA Performance, a brand of ZRG-X (PTY) LTD:
OCTA-X ethanol 96%, OCTA-M methanol and OCTA-BOOST octane booster, with
catalogue, cart and a simulated checkout. Product names, UN numbers, mix ratios
and label wording come from the real product labels; prices and pack sizes from
the client's price list (VAT included, courier excluded). No stock is tracked.

Product labels and containers are drawn as SVG in `src/components/brand/` and
`src/components/pack/`, driven by the `label` data in `src/lib/products.ts`.

## Stack

- Next.js (App Router) with static export (`output: "export"`)
- TypeScript, Tailwind CSS v4
- GSAP (with ScrollTrigger) for the animated hero, page transitions and scroll reveals
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

## Deployment

The demo is served from GitHub Pages on the `gh-pages` branch: `npm run build`
produces the static `out/`, which is published to that branch. A ready-to-use
GitHub Actions workflow that automates this on every push to `main` is kept in
[docs/github-pages-workflow.yml.example](docs/github-pages-workflow.yml.example);
move it to `.github/workflows/deploy.yml` and set the Pages source to "GitHub
Actions" once a token with the `workflow` scope is available.

## Attribution

Made and maintained by [Echo Software](https://echosoftware.co.za).
