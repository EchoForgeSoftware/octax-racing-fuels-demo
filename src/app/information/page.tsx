import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/anim/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";
import { TechnicalDataSheets } from "@/components/TechnicalDataSheets";

export const metadata: Metadata = buildMetadata({
  path: "/information/",
  title: "Product Guide & Safe Handling",
  description:
    "How to choose between OCTA-X ethanol, OCTA-M methanol and OCTA-BOOST octane booster, with mix ratios, safe handling, storage and delivery information.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Information", path: "/information/" },
];

const faqs = [
  {
    q: "How do I mix OCTA-BOOST?",
    a: "Mix OCTA-BOOST only with 95 octane pump fuel. The technical sheet specifies 5L per 30L, 25L, 20L or 15L of base fuel (1:6, 1:5, 1:4 or 1:3). Consult its full dosage table and re-check your tune whenever you change the mix.",
  },
  {
    q: "Should I run ethanol or methanol?",
    a: "Run the fuel your engine and fuel system are built for. Both are alcohol fuels that carry their own oxygen and cool the intake charge, but methanol needs much more fuel flow than ethanol and is toxic. If you are unsure, contact us with your build details.",
  },
  {
    q: "What safety gear do I need?",
    a: "Every OCTA label shows the same protective equipment: eye protection, gloves and a respirator. All three products are flammable liquids (UN Class 3), so keep them away from open flame, sparks and heat.",
  },
  {
    q: "What are the MFD and BATCH boxes on the label for?",
    a: "Traceability. The manufacture date and batch number are written on every pack with a marker, so any pack can be traced back to its batch.",
  },
  {
    q: "How is it delivered?",
    a: "Prices on the site include VAT. Courier is R200 per pack. Delivery is free on 10 or more of the same 5L or 25L product, or 12 or more of the same 500ml product; 210L drums always pay the standard R200 courier. Dispatch and delivery arrangements are confirmed for the order and destination. OCTA fuels are dangerous goods, so appropriate transport arrangements are required.",
  },
];

function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

const guide = [
  {
    h: "OCTA-X Ethanol 96%",
    p: "Ethanol in its purest form for performance use. Ethanol carries its own oxygen and cools the intake charge as it evaporates, which suits ethanol-fuelled and flex-fuel builds with an alcohol-rated fuel system.",
    href: "/shop/octa-x-ethanol/",
    cta: "Shop OCTA-X",
  },
  {
    h: "OCTA-M Methanol",
    p: "99.9% methanol for methanol-burning performance engines. Methanol is toxic as well as flammable: handle it with eye protection, gloves and a respirator, and keep it away from open flame.",
    href: "/shop/octa-m-methanol/",
    cta: "Shop OCTA-M",
  },
  {
    h: "OCTA-BOOST Octane Booster",
    p: "An octane booster mixed only with 95 octane pump fuel. The technical sheet gives doses of 5L per 30L, 25L, 20L or 15L of base fuel.",
    href: "/shop/octa-boost/",
    cta: "Shop OCTA-BOOST",
  },
  {
    h: "OCTA-SHOT Fuel Octane Booster",
    p: "OCTA's fuel octane booster in a 500ml bottle, the compact partner to the 5L OCTA-BOOST. Follow the dosing instructions supplied with the product.",
    href: "/shop/octa-shot/",
    cta: "Shop OCTA-SHOT",
  },
  {
    h: "OCTA-TORQUE Diesel Improver",
    p: "OCTA's diesel improver in a 500ml bottle, for diesel engines. Follow the dosing instructions supplied with the product.",
    href: "/shop/octa-torque/",
    cta: "Shop OCTA-TORQUE",
  },
];

export default function InformationPage() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema(trail), faqSchema()]} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <header>
          <p className="kicker text-flare">Field manual</p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,4.5rem)] leading-[0.9]">Product guide &amp; safe handling</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">
            A quick guide to the OCTA range, plus safe handling, storage and
            delivery. If you are still unsure,{" "}
            <Link href="/contact/" className="text-flare underline">contact us</Link> with your
            build details.
          </p>
        </header>

        <TechnicalDataSheets />

        <section className="mt-14 border-t-2 border-ink">
          {guide.map((g, i) => (
            <Reveal key={g.h} self className="grid gap-3 border-b-2 border-ink py-8 md:grid-cols-[auto_1fr]">
              <span className="text-outline font-display text-4xl md:w-24">0{i + 1}</span>
              <div>
                <h2 className="font-display text-2xl">{g.h}</h2>
                <p className="mt-3 max-w-2xl text-ink-soft">{g.p}</p>
                <Link href={g.href} className="kicker mt-4 inline-block border-b-2 border-ink pb-1 hover:text-flare">
                  {g.cta} &rarr;
                </Link>
              </div>
            </Reveal>
          ))}
        </section>

        <section className="mt-14 border-2 border-ink bg-ink p-8 text-paper">
          <p className="kicker text-lime">Safe handling and storage</p>
          <ul className="mt-5 space-y-3">
            {[
              "Store fuels in approved, sealed containers away from heat, sparks and direct sunlight.",
              "Wear eye protection, gloves and a respirator, as shown on every OCTA label.",
              "Methanol is toxic and absorbs through skin; never handle OCTA-M without gloves.",
              "Alcohol fuels attract water over time; keep containers sealed and use fresh stock.",
              "Transport dangerous goods according to your local regulations and quantity limits.",
              "Keep a suitable fire extinguisher on hand when handling or decanting fuel.",
            ].map((t) => (
              <li key={t} className="flex gap-3 text-paper/80">
                <span className="mt-2 h-2 w-2 shrink-0 bg-lime" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl">Ordering and delivery</h2>
          <p className="mt-4 text-ink-soft">
            Add products to your cart and check out online. Prices include VAT, and courier is
            added at R200 per pack, free on 10 or more of the same 5L or 25L product or 12
            or more of the same 500ml product. Dispatch and delivery arrangements are
            confirmed for each order and destination, subject to appropriate
            dangerous-goods transport arrangements. See the <Link href="/delivery-returns/" className="underline">delivery and returns information</Link>.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)]">FAQ</h2>
          <dl className="mt-6 border-t-2 border-ink">
            {faqs.map((f) => (
              <div key={f.q} className="border-b-2 border-ink py-6">
                <dt className="font-display text-lg uppercase">{f.q}</dt>
                <dd className="mt-2 max-w-3xl text-ink-soft">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
