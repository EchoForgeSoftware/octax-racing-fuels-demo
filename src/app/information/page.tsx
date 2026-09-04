import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = buildMetadata({
  path: "/information/",
  title: "Fuel Information & Selection Guide",
  description:
    "How to choose between race fuel octanes, methanol, ethanol and E85, plus safe handling, storage and delivery information for Octax Racing Fuels.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Information", path: "/information/" },
];

const faqs = [
  {
    q: "What octane fuel does my engine need?",
    a: "It depends on compression ratio, boost and ignition timing. Higher cylinder pressure needs higher octane to resist detonation. Naturally aspirated builds often run well on 102 to 110, while high-boost and big-compression engines move to 118. When in doubt, tune conservatively and step up octane rather than chasing timing on a fuel that is too low.",
  },
  {
    q: "Can I mix race fuel with pump fuel?",
    a: "Leaded race fuel should not be run through catalytic converters or oxygen sensors. Unleaded race fuels like RF102 blend safely with pump premium to lift octane, but blending changes the effective octane and oxygen content, so re-check your tune.",
  },
  {
    q: "Why run methanol or E85 instead of petrol?",
    a: "Alcohol fuels have a high latent heat of vaporisation, which cools the intake charge and allows more timing and boost. They also carry their own oxygen. The trade-off is higher fuel flow, the need for compatible fuel-system parts, and lubricity additives to protect pumps and injectors.",
  },
  {
    q: "How is fuel delivered?",
    a: "Orders are dispatched within a 24 to 48 hour window to your workshop or a track address. Fuels are classed as dangerous goods, so delivery follows the relevant transport and storage regulations for your area.",
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
    h: "Race fuels: 102 to 118",
    p: "Our race fuels span 102 RON unleaded up to 118 RON leaded drag fuel. Unleaded grades suit modern, sensor-equipped and boosted engines; leaded grades add valve-seat protection and detonation resistance for high-compression and forced-induction builds.",
    href: "/shop/?category=race-fuels",
    cta: "Shop race fuels",
  },
  {
    h: "Methanol",
    p: "High-purity methanol for speedway, sprint cars and dedicated methanol drag engines. Purity matters: consistent 99.9% methanol keeps your tune stable and reduces corrosion risk when the fuel system is maintained.",
    href: "/shop/?category=methanol",
    cta: "Shop methanol",
  },
  {
    h: "Ethanol and E85",
    p: "Anhydrous E100 for blending or dedicated ethanol builds, and a consistent E85 blend for flex-fuel setups. Consistency is the point: unlike pump E85, our blend holds its ethanol percentage so your tune stays honest.",
    href: "/shop/?category=ethanol",
    cta: "Shop ethanol",
  },
  {
    h: "Additives",
    p: "Octane boosters for a quick lift, upper-cylinder lubricants for alcohol fuels, injector cleaners and lead substitutes for classic engines. The right additive protects hardware and keeps fuelling repeatable.",
    href: "/shop/?category=additives",
    cta: "Shop additives",
  },
];

export default function InformationPage() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema(trail), faqSchema()]} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <header>
          <h1 className="font-display text-4xl font-bold">Fuel information and selection guide</h1>
          <p className="mt-4 text-lg text-muted">
            A quick guide to choosing the right fuel for your engine and class, plus
            safe handling, storage and delivery. If you are still unsure,{" "}
            <Link href="/contact/" className="text-brand hover:underline">
              contact us
            </Link>{" "}
            with your build details.
          </p>
        </header>

        <section className="mt-12 space-y-8">
          {guide.map((g) => (
            <div key={g.h} className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-2xl font-bold">{g.h}</h2>
              <p className="mt-3 text-muted">{g.p}</p>
              <Link href={g.href} className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                {g.cta} &rarr;
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Safe handling and storage</h2>
          <ul className="mt-4 space-y-3 text-muted">
            <li>Store fuels in approved, sealed containers away from heat, sparks and direct sunlight.</li>
            <li>Methanol is toxic and absorbs through skin; wear appropriate gloves and eye protection.</li>
            <li>Alcohol fuels attract water over time; keep containers sealed and use fresh stock.</li>
            <li>Transport dangerous goods according to your local regulations and quantity limits.</li>
            <li>Keep a suitable fire extinguisher on hand when handling or decanting fuel.</li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Ordering and delivery</h2>
          <p className="mt-4 text-muted">
            Add products to your cart and check out online. Orders are dispatched within
            a 24 to 48 hour window to your workshop or a nominated track address, subject
            to dangerous-goods transport rules for your area. This is a demo store, so no
            payment is taken and no order is actually placed.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">Frequently asked questions</h2>
          <dl className="mt-6 space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-surface p-6">
                <dt className="font-display text-lg font-semibold">{f.q}</dt>
                <dd className="mt-2 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
