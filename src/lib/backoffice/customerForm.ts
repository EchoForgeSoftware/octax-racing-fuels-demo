// ZRG-X Customer Information Form (account setup and authorised portal users),
// as supplied on 2026-10-16. Filled in at checkout or by staff for a private
// sale, for customers who want to become permanent (account) customers.
import type { Block } from "./referralText";
import type { BusinessSettings, Client } from "./types";

export type Address = { street: string; suburb: string; city: string; postcode: string; province: string };

/** People allowed to order on the company account; each signs in with their own email and password. */
export type PortalUser = { name: string; email: string; mobile: string };

export type CustomerProfile = {
  customerType: "company" | "sole" | "individual";
  registeredName: string;
  tradingName: string;
  registrationNumber: string;
  industry: string;
  contactPosition: string;
  mobile: string;
  landline: string;
  preferredContact: "" | "email" | "whatsapp" | "call";
  delivery: Address;
  /** null = same as delivery. */
  billing: Address | null;
  portalUsers: PortalUser[];
  heardAbout: string;
  monthlyVolume: string;
  accountNotes: string;
  declaration: { name: string; capacity: string; place: string; date: string; signature: string | null } | null;
  office: { accountNumber: string; receivedDate: string; activatedBy: string; activatedDate: string; notes: string };
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerProfile["customerType"], string> = {
  company: "Company / Close Corporation",
  sole: "Sole Proprietor",
  individual: "Individual / Private Person",
};

export const PROVINCES = ["Gauteng", "Mpumalanga", "Limpopo", "North West", "Free State", "KwaZulu-Natal", "Eastern Cape", "Western Cape", "Northern Cape"];

export const emptyAddress = (): Address => ({ street: "", suburb: "", city: "", postcode: "", province: "" });

export function emptyProfile(type: CustomerProfile["customerType"] = "company"): CustomerProfile {
  return {
    customerType: type, registeredName: "", tradingName: "", registrationNumber: "", industry: "",
    contactPosition: "", mobile: "", landline: "", preferredContact: "",
    delivery: emptyAddress(), billing: null, portalUsers: [], heardAbout: "", monthlyVolume: "", accountNotes: "",
    declaration: null, office: { accountNumber: "", receivedDate: "", activatedBy: "", activatedDate: "", notes: "" },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Required fields (marked * on the form). `contact` is the primary contact's name and email. */
export function profileErrors(p: CustomerProfile, contact: { name: string; email: string }): string[] {
  const e: string[] = [];
  const business = p.customerType !== "individual";
  if (business && !p.registeredName.trim()) e.push("Enter the registered company or business name.");
  if (!contact.name.trim()) e.push("Enter the primary contact's full name.");
  if (!EMAIL.test(contact.email.trim())) e.push("Enter the primary contact's email address.");
  if (!/^\+?[\d\s()-]{9,20}$/.test(p.mobile.trim())) e.push("Enter the primary contact's mobile number.");
  if (!p.delivery.street.trim() || !p.delivery.city.trim()) e.push("Enter the physical / delivery address (street and city).");
  const users = p.portalUsers.filter((u) => u.name.trim() || u.email.trim());
  if (users.length === 0) e.push("List at least one authorised buyer (name and email).");
  if (users.length > 5) e.push("List up to five authorised buyers; more can be added later in writing.");
  if (users.some((u) => !u.name.trim() || !EMAIL.test(u.email.trim()))) e.push("Each authorised buyer needs a full name and a valid email.");
  const emails = users.map((u) => u.email.trim().toLowerCase());
  if (new Set(emails).size !== emails.length) e.push("Each authorised buyer needs a different email.");
  if (!p.declaration || !p.declaration.name.trim() || !p.declaration.signature) e.push("The declaration needs the signer's full name and signature.");
  return e;
}

/** Emails allowed to sign in on this customer's account (contact, website login and authorised buyers). */
export function accountEmails(client: Pick<Client, "email" | "linkedEmail"> & { profile?: CustomerProfile }): string[] {
  const list = [client.linkedEmail, ...(client.profile?.portalUsers.map((u) => u.email) ?? [])];
  return [...new Set(list.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
}

const addr = (a: Address | null) => (a ? [a.street, a.suburb, a.city, a.postcode, a.province].filter((x) => x.trim()).join(", ") : "");
const or = (v: string, width = 30) => (v.trim() ? v.trim() : "_".repeat(width));

export function customerFormText(client: Client, settings: BusinessSettings): Block[] {
  const p = client.profile ?? emptyProfile();
  const tick = (t: CustomerProfile["customerType"]) => `${p.customerType === t ? "[X]" : "[  ]"}  ${CUSTOMER_TYPE_LABEL[t]}`;
  const users = [...p.portalUsers, ...Array(Math.max(0, 5 - p.portalUsers.length)).fill({ name: "", email: "", mobile: "" })].slice(0, Math.max(5, p.portalUsers.length));
  const d = p.declaration;
  return [
    { p: `${settings.businessName}  |  Registration No: ${settings.registration}` },
    { p: "Account Setup & Authorised Portal Users. Fields marked with * are required." },
    { h: "1. CUSTOMER TYPE *" },
    { p: `${tick("company")}      ${tick("sole")}      ${tick("individual")}` },
    { h: "2. COMPANY / BUSINESS DETAILS" },
    { fields: [
      ["Registered Company / Business Name *", or(p.registeredName || (p.customerType === "individual" ? "" : client.company))],
      ["Trading Name (if different)", or(p.tradingName)],
      ["Company Registration Number", or(p.registrationNumber)],
      ["VAT Registration Number", or(client.vat)],
      ["Industry / Nature of Business", or(p.industry)],
    ] },
    { h: "3. PRIMARY CONTACT PERSON *" },
    { fields: [
      ["Full Name *", or(client.name)], ["Position / Job Title", or(p.contactPosition)], ["Email Address *", or(client.email)],
      ["Mobile Number *", or(p.mobile || client.phone)], ["Landline Number", or(p.landline)],
      ["Preferred Contact Method", p.preferredContact ? { email: "Email", whatsapp: "WhatsApp", call: "Call" }[p.preferredContact] : "Email / WhatsApp / Call"],
    ] },
    { h: "4. ADDRESSES" },
    { fields: [["Physical / Delivery Address *", or(addr(p.delivery) || [client.address, client.city].filter(Boolean).join(", "), 40)], ["Billing Address (if different)", p.billing ? or(addr(p.billing), 40) : "Same as delivery address"]] },
    { h: "5. AUTHORISED BUYERS / PORTAL USERS *" },
    { p: "Persons authorised to place orders and make purchases on the customer portal. Only the people listed below will be granted access; each signs in with their own email and password." },
    { fields: users.map((u, i) => [`${i + 1}.`, u.name || u.email ? `${u.name}  ·  ${u.email}${u.mobile ? `  ·  ${u.mobile}` : ""}` : "_".repeat(40)] as [string, string]) },
    { p: "Additional authorised users can be added later by written request from the Primary Contact Person." },
    { h: "6. ADDITIONAL INFORMATION" },
    { fields: [["How did you hear about us?", or(p.heardAbout)], ["Estimated monthly purchase volume", or(p.monthlyVolume)], ["Special delivery or account notes", or(p.accountNotes, 40)]] },
    { h: "7. DECLARATION & AUTHORISATION *" },
    { p: "I, the undersigned, confirm that:" },
    { bullets: [
      "The information provided in this form is true and correct;",
      "I am authorised to open an account and nominate portal users on behalf of the customer;",
      "The persons listed in Section 5 are authorised to place orders and make purchases;",
      `I understand that access to the customer portal is subject to ${settings.businessName}'s terms and conditions;`,
      `I will notify ${settings.businessName} in writing of any changes to authorised users or contact details.`,
    ] },
    { fields: [["Signed at", or(d?.place ?? "")], ["Full Name", or(d?.name ?? "")], ["Position / Capacity", or(d?.capacity ?? "")], ["Signature", d?.signature ? "Signed on screen" : ""], ["Date", or(d?.date ?? "")]] },
    { h: "FOR OFFICE USE ONLY" },
    { fields: [["Account Number allocated", or(p.office.accountNumber, 16)], ["Date received", or(p.office.receivedDate, 14)], ["Portal access activated by", or(p.office.activatedBy, 16)], ["Date activated", or(p.office.activatedDate, 14)], ["Notes", or(p.office.notes, 40)]] },
  ];
}
