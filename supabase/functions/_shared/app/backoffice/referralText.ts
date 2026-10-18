// GENERATED from src/lib/backoffice/referralText.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Wording of ZRG-X's referral documents (Referral Commission Agreement and
// Acknowledgement of Payment and Full and Final Settlement), as supplied by the
// business on 2026-10-16, with the blanks filled from the back office.
// The documents themselves say they are templates and not legal advice.
import type { BusinessSettings, Client, Referral, Rep } from "./types.ts";

export type Block =
  | { h: string }
  | { p: string }
  | { fields: [string, string][] }
  | { bullets: string[] }
  | { sign: { party: string; rows: [string, string][] }[] }
  | { note: string };

const blank = (v: string | null | undefined, width = 30) => (v && v.trim() ? v.trim() : "_".repeat(width));
const money = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const percentWords = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 20 ? WORDS[n] : String(n));

function signedAt(date: string | null | undefined, place = "") {
  if (!date) return "SIGNED at ________________________ on this _____ day of _________________ 20____.";
  const d = new Date(`${date}T00:00:00Z`);
  return `SIGNED at ${blank(place, 24)} on this ${d.getUTCDate()} day of ${d.toLocaleDateString("en-ZA", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}.`;
}

function companySign(ref: Referral, date: string | null) {
  return { party: `FOR AND ON BEHALF OF ${"ZRG-X (PTY) LTD"}`, rows: [["Signature", ""], ["Full Name", ref.signatory.name], ["Capacity", ref.signatory.capacity], ["Date", longDate(date)]] as [string, string][] };
}

export function referralAgreementText(ref: Referral, rep: Rep, client: Client | null, settings: BusinessSettings): Block[] {
  const company = `${settings.businessName} (Registration Number: ${settings.registration})`;
  const clientName = client ? client.company || client.name : "";
  return [
    { p: "(Independent Contractor – One-Off Referral)" },
    { h: "1. PARTIES" },
    { p: "This Referral Commission Agreement (“Agreement”) is entered into between:" },
    { p: `1.1  ${company}, a private company duly incorporated in accordance with the laws of the Republic of South Africa (hereinafter referred to as the “Company”); and` },
    { p: `1.2  ${blank(rep.name)} (Identity / Passport Number: ${blank(rep.idNumber, 20)}), of Address: ${blank(rep.address, 40)} (hereinafter referred to as the “Referrer”).` },
    { p: "The Company and the Referrer are collectively referred to as the “Parties” and individually as a “Party”." },
    { h: "2. BACKGROUND AND PURPOSE" },
    { p: "2.1  The Referrer has identified and wishes to introduce a potential client to the Company." },
    { p: "2.2  The Parties wish to record the terms on which the Referrer may earn a one-off referral commission should the introduction result in a successful sale, on a strictly independent contractor basis." },
    { p: "2.3  This Agreement does not create any ongoing or exclusive relationship and is limited to the specific referral described herein." },
    { h: "3. THE REFERRAL" },
    { p: "3.1  The Referrer introduces the following potential client (the “Client”):" },
    { fields: [["Client Full Name / Company Name", blank(clientName)], ["Client Contact Person", blank(ref.contactPerson)], ["Client Contact Details", blank(ref.contactDetails)], ["Nature of proposed business / product", blank(ref.nature)]] },
    { p: "3.2  The Referrer warrants that the introduction is genuine, that the Client has not previously been introduced to the Company by any other person, and that the Referrer is not prohibited by any prior agreement from making this introduction." },
    { h: "4. COMMISSION" },
    { p: `4.1  Subject to the conditions in clause 5, the Company shall pay the Referrer a once-off referral commission equal to: ${ref.percent} % (${percentWords(ref.percent)} percent) of the net invoice value (excluding VAT) actually received by the Company from the Client in respect of the first successful sale arising directly from this introduction.` },
    { p: "4.2  “Net invoice value” means the amount actually paid by the Client to the Company after deduction of any discounts, returns, credit notes, bad debts, or other adjustments." },
    { p: "4.3  No commission shall be payable on any subsequent sales, renewals, or ongoing business with the same Client unless the Parties enter into a further written agreement." },
    { p: "4.4  The commission is inclusive of any VAT that may be payable by the Referrer (if registered for VAT). The Referrer is solely responsible for declaring and paying any tax due on the commission." },
    { h: "5. CONDITIONS FOR EARNING AND PAYMENT OF COMMISSION" },
    { p: "5.1  Commission is earned and becomes payable only when ALL of the following conditions have been met:" },
    { p: "(a)  The Client has entered into a binding sale or supply agreement with the Company as a direct result of the Referrer’s introduction;" },
    { p: "(b)  The Company has issued a tax invoice to the Client;" },
    { p: "(c)  The Client has paid the full invoice amount to the Company in cleared funds; and" },
    { p: "(d)  There has been no cancellation, return, or dispute that results in a refund or non-payment." },
    { p: "5.2  Payment of the commission shall be made by electronic funds transfer (EFT) from the Company’s bank account into the Referrer’s nominated bank account within fourteen (14) days after the conditions in clause 5.1 have been satisfied, against a valid invoice issued by the Referrer (if required)." },
    { p: `5.3  The payment reference shall clearly state: “Client referral commission – ${clientName || "[Client Name]"}”.` },
    { p: "5.4  The Company reserves the right to withhold or claw back any commission paid if the Client’s payment is subsequently reversed, refunded, or becomes a bad debt within ninety (90) days of the original payment." },
    { fields: [["Referrer’s nominated bank account", bankLine(rep)]] },
    { h: "6. INDEPENDENT CONTRACTOR STATUS" },
    { p: "6.1  The Referrer is engaged strictly as an independent contractor and not as an employee, agent, partner, or representative of the Company." },
    { p: "6.2  Nothing in this Agreement creates an employment relationship under the Labour Relations Act 66 of 1995, the Basic Conditions of Employment Act 75 of 1997, or any other applicable legislation." },
    { p: "6.3  The Referrer:" },
    { p: "(a)  controls his/her own working methods, hours, and place of work;" },
    { p: "(b)  is free to provide similar referral services to other parties;" },
    { p: "(c)  is solely responsible for all income tax, provisional tax, VAT (if applicable), and any other statutory contributions arising from the commission;" },
    { p: "(d)  is not entitled to any employee benefits, leave, medical aid, pension, UIF, or any other statutory or contractual benefits from the Company; and" },
    { p: "(e)  acknowledges that the Company will not deduct PAYE or any other employees’ tax from the commission." },
    { p: "6.4  The Referrer warrants that he/she is carrying on an independent trade or business and is not economically dependent on the Company." },
    { h: "7. FULL AND FINAL SETTLEMENT" },
    { p: "7.1  Payment of the commission in accordance with this Agreement shall constitute full and final settlement of any and all claims, demands, or causes of action that the Referrer may have against the Company arising out of or in connection with this referral and the introduction of the Client." },
    { p: "7.2  Upon receipt of the commission, the Referrer irrevocably waives, releases, and forever discharges the Company, its directors, officers, employees, agents, and successors from any further liability, claim, or demand of whatever nature arising from this Agreement or the referral." },
    { p: "7.3  The Referrer acknowledges that he/she has had the opportunity to obtain independent legal advice before signing this Agreement and enters into it freely and voluntarily." },
    { h: "8. PROTECTION OF THE COMPANY AND ITS DIRECTORS" },
    { p: "8.1  The Referrer indemnifies and holds harmless the Company and each of its directors, officers, and employees against any claim, loss, damage, cost, or expense (including reasonable legal costs) arising from:" },
    { p: "(a)  any breach of this Agreement by the Referrer;" },
    { p: "(b)  any misrepresentation made by the Referrer to the Client;" },
    { p: "(c)  any claim by the Client or any third party arising from the Referrer’s conduct; or" },
    { p: "(d)  any tax, penalty, or interest assessed against the Company as a result of the Referrer’s failure to account for tax on the commission." },
    { p: "8.2  No director or officer of the Company shall have any personal liability to the Referrer under this Agreement. The Referrer’s sole recourse is against the Company itself." },
    { p: "8.3  The Referrer shall not institute any legal proceedings against any director of the Company in his or her personal capacity arising from this Agreement or the referral." },
    { h: "9. GENERAL" },
    { p: "9.1  This Agreement constitutes the entire agreement between the Parties in respect of the subject matter and supersedes all prior discussions or arrangements." },
    { p: "9.2  No variation of this Agreement shall be valid unless reduced to writing and signed by both Parties." },
    { p: "9.3  This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa. The Parties submit to the exclusive jurisdiction of the South African courts." },
    { p: "9.4  If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect." },
    { p: "9.5  This Agreement may be signed in counterparts, each of which shall be deemed an original." },
    { h: "10. SIGNATURE" },
    { p: signedAt(ref.agreementDate) },
    { sign: [companySign(ref, ref.agreementDate), { party: "THE REFERRER", rows: [["Signature", ""], ["Full Name", rep.name], ["ID / Passport No.", rep.idNumber ?? ""], ["Date", longDate(ref.agreementDate)]] }] },
    { h: "ACKNOWLEDGEMENT BY REFERRER" },
    { p: "I, the undersigned Referrer, confirm that:" },
    { bullets: ["I have read and understood this Agreement;", "I am signing it freely and voluntarily;", "I understand that I am an independent contractor and not an employee;", "I am solely responsible for my own tax affairs; and", "payment of the commission will be in full and final settlement of all claims arising from this referral."] },
    { fields: [["Referrer Signature", ""], ["Date", ""]] },
    { note: "IMPORTANT NOTE: This is a sample template for internal use. It is not legal advice. The classification of a person as an independent contractor depends on the actual facts and circumstances (including the dominant-impression test and SARS Interpretation Note 17). You should obtain professional legal and tax advice before relying on this document, especially regarding employees’ tax (PAYE) obligations." },
  ];
}

export function bankLine(rep: Rep): string {
  const b = rep.bank;
  if (!b || !b.account) return "_".repeat(40);
  return [b.holder, b.bank, b.type, `Acc ${b.account}`, b.branch ? `Branch ${b.branch}` : ""].filter(Boolean).join(" · ");
}

export function paymentAcknowledgementText(ref: Referral, rep: Rep, client: Client | null, settings: BusinessSettings): Block[] {
  const paid = ref.paid;
  const clientName = client ? client.company || client.name : "";
  return [
    { p: "(Once-Off Referral Commission)" },
    { p: "This Acknowledgement of Payment and Full and Final Settlement (“Acknowledgement”) is made between:" },
    { p: `${settings.businessName} (Registration Number: ${settings.registration}) (the “Company”)` },
    { p: "and" },
    { fields: [["Full Name of Recipient", blank(rep.name)], ["Identity / Passport Number", blank(rep.idNumber, 20)]] },
    { p: "(the “Recipient”)." },
    { h: "1. PAYMENT DETAILS" },
    { p: "The Company has paid, and the Recipient hereby acknowledges receipt of, the following once-off referral commission:" },
    { fields: [
      ["Client referred", blank(clientName)],
      ["Commission percentage", `${ref.percent} %`],
      ["Net invoice value on which commission was calculated", paid ? money(paid.netValue) : "R ________________"],
      ["Commission amount paid", paid ? money(paid.amount) : "R ________________"],
      ["Date of payment", paid ? longDate(paid.date) : blank("")],
      ["Payment method", "EFT"],
      ["Bank reference used", paid?.reference || `Client referral commission – ${clientName}`],
      ["Recipient’s bank account into which payment was made", bankLine(rep)],
    ] },
    { h: "2. FULL AND FINAL SETTLEMENT" },
    { p: "2.1  The Recipient confirms that the amount stated above has been received in full and constitutes full and final settlement of any and all claims, demands, or causes of action that the Recipient may have against the Company arising from or in connection with the referral of the above-mentioned Client and any related commission." },
    { p: "2.2  The Recipient irrevocably waives, releases, and forever discharges the Company, its directors, officers, employees, agents, and successors from any further liability, claim, or demand of whatever nature arising from the referral or the commission." },
    { p: "2.3  The Recipient confirms that no further commission, fee, or payment is due or payable by the Company in respect of this referral or any subsequent business with the same Client." },
    { h: "3. STATUS AND TAX" },
    { p: "3.1  The Recipient confirms that the payment was received in his/her capacity as an independent contractor and not as an employee of the Company." },
    { p: "3.2  The Recipient is solely responsible for declaring and paying any income tax, provisional tax, VAT (if applicable), or any other statutory amounts due on the commission. The Company has not deducted, and is not required to deduct, PAYE or any other employees’ tax from the payment." },
    { p: "3.3  The Recipient indemnifies the Company against any tax, penalty, interest, or claim that may arise as a result of the Recipient’s failure to account correctly for the commission." },
    { h: "4. PROTECTION OF DIRECTORS AND OFFICERS" },
    { p: "4.1  No director or officer of the Company shall have any personal liability to the Recipient arising from this payment or the underlying referral." },
    { p: "4.2  The Recipient shall not institute any legal proceedings against any director of the Company in his or her personal capacity in connection with this matter." },
    { h: "5. GENERAL" },
    { p: "5.1  This Acknowledgement constitutes the entire agreement between the Parties in respect of the payment and settlement of the commission and supersedes any prior discussions." },
    { p: "5.2  This Acknowledgement shall be governed by the laws of the Republic of South Africa." },
    { p: "5.3  The Recipient confirms that he/she has read and understood this document, has had the opportunity to obtain independent advice, and signs it freely and voluntarily." },
    { p: signedAt(paid?.date) },
    { sign: [companySign(ref, paid?.date ?? null), { party: "THE RECIPIENT", rows: [["Signature", ""], ["Full Name", rep.name], ["ID / Passport No.", rep.idNumber ?? ""], ["Date", longDate(paid?.date)]] }] },
    { h: "RECIPIENT’S CONFIRMATION" },
    { p: "I confirm that:" },
    { bullets: ["I have received the commission amount stated above in full;", "this payment is in full and final settlement of all claims arising from the referral;", "I was engaged as an independent contractor and not as an employee;", "I am solely responsible for my own tax on this payment; and", "I have no further claim against the Company or any of its directors."] },
    { fields: [["Recipient Signature", ""], ["Date", ""]] },
    { note: "NOTE: This document is a template for internal use and does not constitute legal advice. Keep this signed acknowledgement together with the proof of payment and any original referral agreement for your records." },
  ];
}
