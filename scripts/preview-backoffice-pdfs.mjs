import {mkdirSync,writeFileSync} from "node:fs";
import {loadTs} from "./load-ts.mjs";
const {demoData}=loadTs("src/lib/backoffice/seed.ts"),pdf=loadTs("src/lib/backoffice/pdf.ts");
const today="2026-10-16",data=demoData(today),dir="output/pdf";
mkdirSync(dir,{recursive:true});
for(const kind of ["invoice","quote"]){
 const doc=data.documents.find(d=>d.kind===kind),client=data.clients.find(c=>c.id===doc.clientId);
 writeFileSync(`${dir}/octa-demo-${kind}.pdf`,await pdf.documentPdf(doc,client,data.settings,today));
}
const client=data.clients.find(c=>c.id==="c-alex");
writeFileSync(`${dir}/octa-demo-statement.pdf`,await pdf.statementPdf(client,data.documents,data.settings,"2026-05-01",today));
writeFileSync(`${dir}/octa-demo-price-list.pdf`,await pdf.priceListPdf(client,data.catalogue,data.settings,today));
console.log("Generated four clearly marked sample back-office PDFs.");
