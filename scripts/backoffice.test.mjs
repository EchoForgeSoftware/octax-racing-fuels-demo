import assert from "node:assert/strict";
import {test} from "node:test";
import {loadTs} from "./load-ts.mjs";
const calc=loadTs("src/lib/backoffice/calc.ts"),roles=loadTs("src/lib/backoffice/roles.ts"),bank=loadTs("src/lib/backoffice/bank.ts"),seed=loadTs("src/lib/backoffice/seed.ts"),scope=loadTs("src/lib/backoffice/scope.ts"),local=loadTs("src/lib/backoffice/local.ts");
const today="2026-10-16";

test("role permissions and scoped records hide unrelated customers, costs and profit inputs",()=>{
  const data=seed.demoData(today);
  const rep={id:"r",role:"rep",repId:"r-sipho"};
  const visible=scope.scopeBackoffice(data,rep);
  assert.ok(visible.clients.length>0 && visible.clients.length<data.clients.length);
  assert.ok(visible.clients.every(c=>c.repId===rep.repId));
  assert.ok(visible.documents.every(d=>visible.clients.some(c=>c.id===d.clientId)&&d.lines.every(l=>l.unitCost===0)));
  assert.equal(visible.bank.length,0);assert.equal(visible.suppliers.length,0);assert.ok(visible.catalogue.every(i=>i.cost===null));
  assert.equal(scope.scopeBackoffice(data,null),null);
  assert.equal(roles.canSeeProfit("rep"),false);assert.equal(roles.canSeeProfit("accounts"),false);
  assert.equal(roles.canEdit("rep","invoices"),false);assert.equal(roles.canEdit("viewer","clients"),false);assert.equal(roles.canRecordPayments("accounts"),true);
  assert.ok(scope.scopeBackoffice(data,{role:"viewer"}).documents.every(d=>d.kind==="invoice"));
});
test("demo staff and reps authenticate only with public sample credentials",()=>{
  const data=seed.demoData(today);
  assert.equal(local.demoAdminMatch("zuan@example.test",local.DEMO_ADMIN_PASSWORD,data.reps).role,"main");
  assert.equal(local.demoAdminMatch("rep@example.test",local.DEMO_ADMIN_PASSWORD,data.reps).repId,"r-sipho");
  assert.equal(local.demoAdminMatch("rep@example.test","incorrect",data.reps),null);
  data.reps[0].active=false;
  assert.equal(local.demoAdminMatch("rep@example.test",local.DEMO_ADMIN_PASSWORD,data.reps),null);
  assert.equal(local.demoAdminById("rep:r-sipho",data.reps),null);
});
test("agreed customer pricing overrides tiers and cost snapshots preserve historical gross profit",()=>{
  const data=seed.demoData(today),item=data.catalogue.find(i=>i.sku==="OCTA-X95-25"),client=data.clients.find(c=>c.id==="c-alex");
  assert.equal(calc.priceFor(item,client),720);
  assert.equal(calc.priceFor(item,{tier:"agent",prices:{}}),item.agent);
  const doc=data.documents.find(d=>d.kind==="invoice"),profit=calc.docProfit(doc);
  item.cost=9999;assert.equal(calc.docProfit(doc),profit);
  const d=calc.dashboard(data,"all",today);
  assert.equal(calc.cents(Object.values(d.byChannel).reduce((n,v)=>n+v,0)),d.turnover);
});
test("statements reconcile opening balance, dated payments and closing balance without counting quotes",()=>{
  const base={kind:"invoice",number:"INV-0001",clientId:"c",date:"2026-09-01",lines:[{qty:2,unitPrice:100}],courier:20,cancelled:false,payments:[{date:"2026-10-02",amount:75,method:"eft",note:""}]};
  const s=calc.statement("c",[base,{...base,kind:"quote"},{...base,cancelled:true}],"2026-10-01","2026-10-16");
  assert.equal(s.opening,220);assert.equal(s.rows.length,1);assert.equal(s.closing,145);
});
test("bank import parses decimal-comma amounts and rejects impossible dates",()=>{
  for(const [value,expected] of [["R 1 500,00",1500],["1,500.00",1500],["1.500,25",1500.25],["250.00Dr",-250],["1500.00Cr",1500]])assert.equal(bank.parseAmount(value),expected,value);
  assert.equal(bank.parseDate("31/02/2026"),null);assert.equal(bank.parseDate("29/02/2024"),"2024-02-29");
  assert.equal(bank.parseDate("01 Oct 2026"),"2026-10-01");
  const data=seed.demoData(today),csv=bank.sampleFnbCsv(data,today),parsed=bank.parseFnbCsv(csv);
  assert.equal(parsed.skipped,0);assert.ok(parsed.rows.length>=5);
  assert.equal(bank.txnKey(parsed.rows[0]),bank.txnKey(bank.parseFnbCsv(csv).rows[0]));
});
test("bank matching leaves ambiguous references for review and never pays cancelled invoices",()=>{
  const d={kind:"invoice",id:"1",number:"INV-0001",reference:"",cancelled:false,lines:[{qty:1,unitPrice:100}],courier:0,payments:[]};
  const data={documents:[d,{...d,id:"2",number:"INV-0002"}],suppliers:[],supplierInvoices:[]};
  assert.equal(bank.matchTxn({amount:100,description:"INV-0001 and INV-0002"},data),null);
  assert.equal(bank.matchTxn({amount:100,description:"INV 1"},data).doc.id,"1");
  d.cancelled=true;assert.equal(bank.matchTxn({amount:100,description:"INV 1"},data),null);
  assert.equal(bank.matchTxn({amount:100,description:"No reference"},data),null);
});
test("South African reporting dates change at local midnight",()=>{
  assert.equal(calc.todaySA(new Date("2026-10-15T22:01:00Z")),today);
});

test("dashboard breakdown splits sales by rep, lists agents, and keeps cash customers apart from key customers",()=>{
  const data=seed.demoData(today);
  const b=calc.breakdown(data,"all",today);
  const live=data.documents.filter(d=>d.kind==="invoice"&&!d.cancelled);
  const total=live.reduce((n,d)=>n+calc.docTotal(d),0);
  assert.equal(Math.round(b.byRep.reduce((n,r)=>n+r.turnover,0)*100),Math.round(total*100));
  assert.ok(b.byRep.some(r=>r.repId==="r-sipho"&&r.clients===2));
  assert.deepEqual(b.agents.map(a=>a.client.type).filter(t=>t!=="agent"),[]);
  assert.ok(b.cash.sales.length>0&&b.cash.sales.every(s=>s.name&&s.doc.number.startsWith("INV-")));
  const privateTotal=live.filter(d=>data.clients.find(c=>c.id===d.clientId)?.type==="private").reduce((n,d)=>n+calc.docTotal(d),0);
  assert.equal(Math.round((b.keyPrivate+b.cash.total)*100),Math.round(privateTotal*100));
  const bulkTotal=live.filter(d=>data.clients.find(c=>c.id===d.clientId)?.type==="bulk").reduce((n,d)=>n+calc.docTotal(d),0);
  assert.equal(Math.round(b.bulk*100),Math.round(bulkTotal*100));
});

test("sample FNB statement round-trips: invoice references match, the fee is filed, the unknown deposit waits",()=>{
  const data=seed.demoData(today);
  const {rows,skipped}=bank.parseFnbCsv(bank.sampleFnbCsv(data,today));
  assert.equal(skipped,0);
  assert.ok(rows.length>=5);
  const matches=rows.map(r=>bank.matchTxn(r,data));
  assert.ok(matches.filter(m=>m?.kind==="invoice").length>=2);
  assert.ok(matches.some(m=>m?.kind==="other"&&m.category==="fees"));
  const unknown=rows.find(r=>/UNKNOWN DEPOSIT/.test(r.description));
  assert.equal(bank.matchTxn(unknown,data),null);
  assert.ok(rows.some(r=>/OZOW/i.test(r.description)&&bank.methodFor(r.description)==="ozow"));
  assert.ok(rows.some(r=>/Cash Deposit/i.test(r.description)&&bank.methodFor(r.description)==="cash"));
});

const courier=loadTs("src/lib/courier.ts"),stock=loadTs("src/lib/backoffice/stock.ts");

test("local area is 30 km around the four East Rand towns; local orders are flagged but still pay courier, at the fee set in the back office",()=>{
  for(const town of ["Benoni","brakpan","Boksburg North","Kempton Park","Germiston"]) assert.equal(courier.deliveryFor(town).method,"own");
  for(const town of ["Durban","Cape Town","Polokwane","Pretoria",""]) assert.equal(courier.deliveryFor(town).method,"courier");
  const lines=[{size:"25L",qty:2}];
  assert.equal(courier.cartCourier(lines).fee,400);
  assert.deepEqual(courier.cartCourier(lines,"Brakpan"),{fee:400,quoted:false,local:"brakpan"});
  assert.equal(courier.cartCourier(lines,"Durban",250).fee,500,"courier fee per pack is editable");
  assert.equal(courier.cartCourier([{size:"25L",qty:10}],null,250).fee,0,"free-delivery quantities still apply");
  assert.match(courier.courierNote("25L",2,250),/R500\.00 \(2 × R250\.00\)/);
});

test("pending orders list undelivered live invoices only, oldest first",()=>{
  const data=seed.demoData(today);
  const pending=calc.pendingOrders(data.documents);
  assert.ok(pending.length>0);
  assert.ok(pending.every(d=>d.kind==="invoice"&&!d.cancelled&&d.delivery?.status==="pending"));
  assert.deepEqual(pending.map(d=>d.date),[...pending.map(d=>d.date)].sort());
  assert.equal(calc.pendingDelivery({kind:"invoice",cancelled:false}),false);
});

test("stock: FIFO batches, sales since book-in, stock-take losses, and old or expiring stock warnings",()=>{
  const settings={vatRegistered:false};
  const batch=(id,date,qty,expiryDate=null,cost=115)=>({id,sku:"S",date,qty,expiryDate,batchNumber:id,unitCostEx:100,unitCostIncl:cost,supplierId:null,supplierInvoiceId:null,sellPrice:150,notes:"",createdAt:date});
  const inv=(date,qty,cancelled=false)=>({kind:"invoice",cancelled,date,lines:[{sku:"S",qty}]});
  const data={settings,stock:[batch("old","2026-01-10",10,"2026-11-30"),batch("new","2026-10-01",20,"2027-10-01")],stockCounts:[{id:"c",sku:"S",date:"2026-10-12",expected:22,counted:20,note:""}],
    documents:[inv("2025-12-01",50),inv("2026-03-01",8),inv("2026-10-05",4,true)]};
  const [level]=stock.stockLevels(data,today);
  assert.equal(level.sold,8,"sales before the first book-in and cancelled invoices don't count");
  assert.equal(level.onHand,20);
  assert.equal(level.batches[0].remaining,0,"oldest batch is used first, including losses");
  assert.equal(level.batches[1].remaining,20);
  const fresh=stock.stockLevels({...data,documents:[],stockCounts:[]},today)[0];
  assert.deepEqual(fresh.batches[0].warnings.sort(),["expires-soon","old"]);
  assert.equal(stock.stockLosses(data).units,2);
  assert.equal(stock.stockLosses(data).value,230);
  assert.ok(stock.sellWarnings(fresh,40).some(w=>/Only 30 in stock/.test(w)));
  assert.ok(stock.sellWarnings(fresh,1).some(w=>/Sell batch old first/.test(w)));
});

test("VAT switches and profit checks: ex/incl at 15%, under-cost flagged",()=>{
  assert.equal(stock.inclVat(100),115);
  assert.equal(stock.exVat(115),100);
  assert.equal(stock.effectiveCost({unitCostEx:100,unitCostIncl:115},false),115);
  assert.equal(stock.effectiveCost({unitCostEx:100,unitCostIncl:115},true),100);
  assert.deepEqual(stock.unitProfit(150,115),{profit:35,margin:23.3,under:false});
  assert.equal(stock.unitProfit(100,115).under,true);
  assert.equal(stock.unitProfit(null,115),null);
});

const form=loadTs("src/lib/backoffice/customerForm.ts"),pdfs=loadTs("src/lib/backoffice/pdf.ts");

test("customer information form: required fields, authorised buyers and account sign-in emails",()=>{
  const contact={name:"Pat Sample",email:"pat@example.test"};
  const p=form.emptyProfile("company");
  assert.ok(form.profileErrors(p,contact).length>=4);
  Object.assign(p,{registeredName:"Sample Racing",mobile:"082 000 0000",delivery:{...p.delivery,street:"1 Test Road",city:"Benoni"},
    portalUsers:[{name:"Pat Sample",email:"pat@example.test",mobile:""},{name:"Lee Buyer",email:"lee@example.test",mobile:""}],
    declaration:{name:"Pat Sample",capacity:"Director",place:"Benoni",date:today,signature:"data:image/png;base64,AAA"}});
  assert.deepEqual(form.profileErrors(p,contact),[]);
  assert.ok(form.profileErrors({...p,portalUsers:[...p.portalUsers,{name:"Dup",email:"LEE@example.test",mobile:""}]},contact).some(e=>/different email/.test(e)));
  assert.ok(form.profileErrors({...p,customerType:"individual",registeredName:""},contact).length===0,"individuals need no company name");
  assert.deepEqual(form.accountEmails({email:"x@example.test",linkedEmail:"Pat@Example.test",profile:p}),["pat@example.test","lee@example.test"]);
});

test("referral commission: earned on the first fully paid invoice after the agreement, net of courier",()=>{
  const inv=(number,date,goods,courier,paid)=>({kind:"invoice",number,cancelled:false,clientId:"c1",date,courier,lines:[{qty:1,unitPrice:goods}],payments:paid?[{date,amount:goods+courier}]:[]});
  const ref={clientId:"c1",percent:5,agreementDate:"2026-09-01"};
  assert.equal(calc.referralEarning(ref,[inv("INV-1","2026-08-01",9000,0,true)],false).invoice,null,"sales before the agreement don't count");
  const pending=calc.referralEarning(ref,[inv("INV-2","2026-09-10",10000,400,false)],false);
  assert.equal(pending.earned,false);
  assert.equal(pending.amount,500);
  const earned=calc.referralEarning(ref,[inv("INV-3","2026-09-20",2000,0,true),inv("INV-2","2026-09-10",10000,400,true)],false);
  assert.equal(earned.invoice.number,"INV-2","only the first sale earns commission");
  assert.equal(earned.dueBy,"2026-09-24");
  assert.equal(calc.referralEarning(ref,[inv("INV-2","2026-09-10",11500,0,true)],true).netValue,10000,"VAT removed once VAT-registered");
});

test("referral, payment acknowledgement and customer form PDFs render with filled details and chosen capacity",async()=>{
  const data=seed.demoData(today);
  const rep={...data.reps[0],idNumber:"9001015009087",address:"1 Sample Street, Boksburg",bank:{holder:"S Sample",bank:"FNB",account:"62000000000",branch:"250655",type:"Cheque"}};
  const ref={...data.referrals[0],signatory:{name:"Zuan",capacity:"Manager"},paid:{date:today,amount:500,netValue:10000,invoiceId:null,reference:"Client referral commission – Highveld"}};
  const client=data.clients.find(c=>c.id===ref.clientId);
  const text=JSON.stringify(loadTs("src/lib/backoffice/referralText.ts").referralAgreementText(ref,rep,client,data.settings));
  assert.match(text,/Capacity","Manager/);
  assert.match(text,/9001015009087/);
  assert.match(text,/5 % \(five percent\)/);
  for(const bytes of [await pdfs.referralAgreementPdf(ref,rep,client,data.settings),await pdfs.paymentAcknowledgementPdf(ref,rep,client,data.settings),await pdfs.customerFormPdf({...client,profile:form.emptyProfile()},data.settings)]){
    assert.ok(bytes.length>2000);
    assert.equal(Buffer.from(bytes.slice(0,5)).toString(),"%PDF-");
  }
});

const costing=loadTs("src/lib/backoffice/costing.ts");

test("costing: purity, per-litre product price, switchable lines, other costs and VAT",()=>{
  assert.equal(costing.litresIn("25L"),25); assert.equal(costing.litresIn("210L plastic drum"),210); assert.equal(costing.litresIn("500ml"),0.5); assert.equal(costing.litresIn("Large"),null);
  const c=costing.defaultCosting({size:"25L",productName:"OCTA-X Ethanol 95%",category:"ethanol"});
  assert.equal(c.purityEnabled,true); assert.equal(c.purity,95); assert.equal(c.litres,25);
  const set=(id,exVat)=>c.lines.find(l=>l.id===id).exVat=exVat;
  set("product",18); set("sticker",4); set("container",40); set("cap",3); set("travel",10);
  c.lines.push({id:"o1",label:"Other cost",description:"Pallet wrap",enabled:true,exVat:2,perLitre:false,builtIn:false});
  let t=costing.costingTotals(c);
  assert.equal(t.exVat,18*25+4+40+3+10+2);
  assert.equal(t.inclVat,Math.round(t.exVat*1.15*100)/100);
  assert.equal(costing.costingCost(c,false),t.inclVat,"not VAT-registered: incl VAT is the real cost");
  assert.equal(costing.costingCost(c,true),t.exVat);
  c.lines.find(l=>l.id==="container").enabled=false;
  t=costing.costingTotals(c);
  assert.equal(t.exVat,18*25+4+3+10+2,"switched-off lines don't count");
  const hoodie=costing.defaultCosting({size:"Large",productName:"OCTA Hoodie",category:"merch"});
  assert.equal(hoodie.purityEnabled,false); assert.equal(hoodie.litres,null);
  assert.deepEqual(hoodie.lines.filter(l=>l.enabled).map(l=>l.id),["product","sticker","travel"],"no container or cap for merch by default");
  assert.equal(hoodie.lines[0].perLitre,false);
});

test("the back office picks up new, renamed and removed website products without touching prices or costs",()=>{
  const data=seed.emptyData();
  const gone={...data.catalogue.find(i=>i.sku==="OCTA-M-25"),sku:"OCTA-X-25",slug:"octa-x-ethanol",productName:"OCTA-X Plus Ethanol 96%",retail:760};
  const old=[...data.catalogue.map(i=>i.sku==="OCTA-M-25"?{...i,productName:"OCTA-M old",short:"old",retail:999,cost:500}:i).filter(i=>i.sku!=="OCTA-X95-210"),gone];
  const changes=seed.catalogueChanges(old);
  const renamed=changes.find(i=>i.sku==="OCTA-M-25");
  assert.equal(renamed.productName,"OCTA-M Methanol 99.9%");assert.equal(renamed.retail,999);assert.equal(renamed.cost,500);assert.notEqual(renamed.short,"old");
  assert.deepEqual(changes.filter(i=>i.sku.startsWith("OCTA-X95")).map(i=>i.sku),["OCTA-X95-210"]);
  const plus=changes.find(i=>i.sku==="OCTA-X-25");
  assert.equal(plus.active,false);assert.equal(plus.slug,null);assert.equal(plus.retail,760,"switched off, price kept");
  assert.equal(seed.catalogueChanges(data.catalogue).length,0,"an up-to-date catalogue needs nothing");
});

test("products added in the back office get a pack picture and label from the words typed",()=>{
  const pd=loadTs("src/lib/packDesign.ts");
  const start=pd.defaultPack({productName:"OCTA-N Nitro methane 98%",size:"25L",category:"fuel"});
  assert.equal(start.mark,"N");assert.equal(start.title,"NITRO");assert.equal(start.highlight,"98%");assert.equal(start.container,"can");assert.equal(start.un,"UN 1170");
  assert.equal(pd.defaultPack({productName:"OCTA Hoodie",size:"Large",category:"merch"}).un,"","merch has no dangerous-goods line");
  const product=pd.packProduct({sku:"CUSTOM-N-25",productName:"OCTA-N Nitro methane 98%",size:"5L"},{...start,container:"drum",badge:"plus",title:"a very long label word"});
  assert.equal(product.variants[0].size,"210L plastic drum","a size that doesn't fit the container shows the container's own size");
  assert.equal(product.label.layout,"wide");assert.equal(product.label.badge,"PLUS");assert.equal(product.label.title.length,12);
  const jug=pd.packProduct({sku:"S",productName:"X",size:"5L"},{...start,container:"jug",lines:["one","two","three","four"]});
  assert.equal(jug.label.layout,"tall");assert.deepEqual(jug.label.lines,["ONE","TWO","THREE"]);assert.equal(jug.label.badge,undefined);
});

test("delivery options: collection first, local inside the radius from a minimum of litres, courier on request unless switched on",()=>{
  const d=loadTs("src/lib/delivery.ts");
  assert.equal(d.orderLitres([{size:"25L",qty:5}]),125);assert.equal(d.orderLitres([{size:"500ml",qty:2},{size:"XL",qty:3}]),1);
  const defaults=d.deliveryRules({});
  assert.equal(defaults.minLitres,125);assert.equal(defaults.localKm,25);assert.equal(defaults.courierOnline,false);
  const rules=d.deliveryRules({courierFee:200,deliveryRules:{localTowns:["Boksburg"],localKm:20,localFee:null,minLitres:15,collection:{enabled:true,address:"x",hours:""}}});
  assert.ok(rules.localArea.includes("germiston"));assert.ok(!rules.localArea.includes("pretoria"));
  const small=d.deliveryOptions([{size:"5L",qty:1}],"Pretoria",rules);
  assert.deepEqual(small.map(o=>[o.method,o.available,o.fee,!!o.quoteLater]),[["collect",true,0,false],["courier",true,0,true]],"courier on request: quoted after ordering");
  const big=d.deliveryOptions([{size:"5L",qty:3}],"Germiston",rules);
  assert.deepEqual(big.map(o=>[o.method,o.available,o.fee]),[["collect",true,0],["local",true,600]]);
  assert.equal(d.pickDelivery([{size:"5L",qty:1}],"Pretoria",rules,"courier").quoteLater,true);
  const tooSmall=d.deliveryOptions([{size:"5L",qty:2}],"Germiston",rules);
  assert.deepEqual(tooSmall.map(o=>[o.method,o.available]),[["collect",true],["local",false],["courier",true]],"too small for local delivery: collect or courier on request");
  assert.equal(d.pickDelivery([{size:"5L",qty:1}],"Pretoria",rules).method,"collect","no choice: collection");
  assert.equal(d.pickDelivery([{size:"5L",qty:2}],"Germiston",rules,"local").ok,false,"10 L is under the local minimum");
  const online=d.deliveryRules({courierFee:200,deliveryRules:{courierOnline:true}});
  assert.deepEqual(d.pickDelivery([{size:"5L",qty:1}],"Pretoria",online,"courier"),{ok:true,method:"courier",fee:200,label:"Courier",quoteLater:false});
  assert.equal(d.deliveryRules({deliveryRules:{collection:{enabled:true,address:"  "}}}).collection.enabled,false,"no address, no collection");
});

test("costing profit with and without travel; rep commission credited on the rep's clients' invoices, due when paid",()=>{
  const c=costing.defaultCosting({size:"25L",productName:"OCTA-M Methanol 99.9%",category:"methanol"});
  c.lines=c.lines.map(l=>l.id==="product"?{...l,exVat:10}:l.id==="travel"?{...l,exVat:100}:l);
  const split=costing.costingSplit(c,false);
  assert.equal(split.travel,115);assert.equal(split.cost,402.5);assert.equal(split.withoutTravel,287.5);
  const com=loadTs("src/lib/backoffice/commission.ts");
  assert.deepEqual(com.cleanShares([{repId:"r1",percent:5},{repId:"r1",percent:9},{repId:"nobody",percent:3},{repId:"r2",percent:0}],["r1","r2"]),[{repId:"r1",percent:5}]);
  const inv=(id,clientId,paidAmount,extra={})=>({id,kind:"invoice",number:id,clientId,date:"2026-10-20",cancelled:false,courier:0,lines:[{sku:"A",qty:2,unitPrice:500},{sku:"B",qty:1,unitPrice:100}],payments:paidAmount?[{amount:paidAmount}]:[],...extra});
  const data={clients:[{id:"c1",repId:"r1"},{id:"c2",repId:"r2"}],catalogue:[{sku:"A",repShares:[{repId:"r1",percent:5}]},{sku:"B"}],
    documents:[inv("i1","c1",1100),inv("i2","c1",0),inv("i3","c2",1100),inv("i4","c1",1100,{cancelled:true}),{...inv("q1","c1",0),kind:"quote"}]};
  const rows=com.salesCommissions(data,"r1");
  assert.deepEqual(rows.map(r=>[r.invoiceId,r.amount,r.due]).sort(),[["i1",50,true],["i2",50,false]]);
  assert.equal(com.salesCommissions(data,"r2").length,0,"no percentage for r2");
});
