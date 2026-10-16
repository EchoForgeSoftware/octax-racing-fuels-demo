import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {test} from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
import { customerDemoProblems } from "./check-launch.mjs";
const nativeRequire=createRequire(import.meta.url);
function load(path,deps={}){const exports={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;runInNewContext(code,{exports,require:name=>name in deps?deps[name]:nativeRequire(name)});return exports;}
const history=load("../src/lib/customerHistory.ts");
const navigation=load("../src/lib/navigation.ts");
const demo=load("../src/lib/customerDemo.ts");
const base={id:3,ref:"OCTA-PAID-EXAMPLE",items:[{sku:"OCTA-X-25",name:"OCTA-X Ethanol 96%",size:"25L",qty:2,price:760}],subtotal:1520,courier:400,total:1920,status:"paid",created_at:"2026-10-15T10:00:00Z",payment_method:"ozow",payment_environment:"production",payment_confirmed_at:"2026-10-16T10:00:00Z",payment_confirmed_amount:1920,payment_reference:"provider-reference-example"};

test("sample sign-in is opt-in, loopback-only and cannot replace connected authentication",()=>{
  assert.equal(demo.allowCustomerDemo("true","127.0.0.1",false,false),true);
  for(const host of ["shop.example.com","127.0.0.1.evil.test","localhost.evil.test",""]) assert.equal(demo.allowCustomerDemo("true",host,false,false),false);
  assert.equal(demo.allowCustomerDemo(undefined,"localhost",false,false),false);
  assert.equal(demo.allowCustomerDemo("true","localhost",true,false),false);
  assert.equal(demo.allowCustomerDemo("true","localhost",false,true),false);
  // An exactly listed preview host is allowed; look-alikes and unlisted hosts are not.
  assert.equal(demo.allowCustomerDemo("true","octa-performance.pages.dev",false,false,"octa-performance.pages.dev"),true);
  for(const host of ["evil-octa-performance.pages.dev","octa-performance.pages.dev.evil.test","shop.example.com"]) assert.equal(demo.allowCustomerDemo("true",host,false,false,"octa-performance.pages.dev"),false);
  assert.equal(demo.allowCustomerDemo("true","octa-performance.pages.dev",true,false,"octa-performance.pages.dev"),false);
  assert.equal(demo.demoCredentialsMatch(demo.DEMO_EMAIL,demo.DEMO_PASSWORD),true);
  assert.equal(demo.demoCredentialsMatch(demo.DEMO_EMAIL,"incorrect"),false);
  assert.equal(demo.demoCredentialsMatch("other@example.test",demo.DEMO_PASSWORD),false);
  const env={NEXT_PUBLIC_CUSTOMER_DEMO:"true"};
  assert.equal(customerDemoProblems(env).length,0);
  for(const [key,value] of Object.entries({NEXT_PUBLIC_SITE_INDEXABLE:"true",NEXT_PUBLIC_SUPABASE_URL:"https://sample.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"example",NEXT_PUBLIC_OZOW_ENABLED:"true",NEXT_PUBLIC_RESELLER_ENABLED:"true"})) assert.ok(customerDemoProblems({...env,[key]:value}).length>0);
});

test("sample orders exercise paid, dispatched, pending and cancelled states with accurate totals",()=>{
  const orders=demo.demoOrders(demo.DEMO_USER_ID);
  assert.equal(demo.demoOrders("someone-else").length,0);
  assert.equal(orders.length,4);
  assert.equal(history.customerHistorySummary(orders).paid,3320);
  assert.equal(history.customerHistorySummary(orders).awaiting,1);
  assert.equal(history.confirmedPayments(orders).length,2);
  for(const order of orders){
    assert.ok(order.ref.startsWith("DEMO-"));
    assert.equal(order.items.reduce((n,item)=>n+item.price*item.qty,0),order.subtotal);
    assert.equal(order.subtotal+order.courier,order.total);
  }
  orders[0].items[0].qty=99;
  assert.equal(demo.demoOrders(demo.DEMO_USER_ID)[0].items[0].qty,1);
});

test("customer history uses the account owner, stable cursor pagination and bounded pages",async()=>{
  const calls=[];const rows=Array.from({length:26},(_,i)=>({...base,id:100-i}));
  const query={select(value){calls.push(["select",value]);return query;},eq(...args){calls.push(["eq",...args]);return query;},order(...args){calls.push(["order",...args]);return query;},lt(...args){calls.push(["lt",...args]);return query;},limit(value){calls.push(["limit",value]);return Promise.resolve({data:rows,error:null});}};
  const result=await history.fetchCustomerOrders({from:table=>{assert.equal(table,"orders");return query;}},"current-customer",90);
  assert.equal(result.orders.length,25);assert.equal(result.hasMore,true);
  assert.ok(calls.some(c=>c[0]==="eq"&&c[1]==="user_id"&&c[2]==="current-customer"));
  assert.ok(calls.some(c=>c[0]==="lt"&&c[1]==="id"&&c[2]===90));
  assert.ok(calls.some(c=>c[0]==="limit"&&c[1]===26));
  assert.ok(!calls[0][1].includes("customer,"));
  await assert.rejects(()=>history.fetchCustomerOrders({},""),/sign in/i);
});

test("recorded payment history excludes staging and legacy/unconfirmed status guesses",()=>{
  const rows=[base,{...base,id:2,payment_environment:"staging"},{...base,id:1,status:"dispatched",payment_confirmed_at:null,payment_confirmed_amount:null},{...base,id:0,status:"paid",payment_confirmed_at:null,payment_confirmed_amount:null}];
  const summary=history.customerHistorySummary(rows);
  assert.equal(history.confirmedPayments(rows).length,1);assert.equal(summary.paid,1920);assert.equal(summary.orders,3);
  assert.match(history.paymentLabel(rows[2]),/no payment confirmation/i);
  assert.match(history.paymentLabel(rows[3]),/date not recorded/i);
  assert.match(history.paymentLabel(rows[1]),/test payment/i);
});

test("payment history displays recorded amount, method, reference, date and ordered items",()=>{
  const {PaymentHistory}=load("../src/components/account/PaymentHistory.tsx",{"@/lib/customerHistory":history,"@/lib/format":{formatPrice:n=>`R${n.toFixed(2)}`}});
  const html=renderToStaticMarkup(createElement(PaymentHistory,{orders:[{...base,total:999,payment_confirmed_amount:1920}, {...base,id:7,ref:"UNPAID-PRIVATE-EXAMPLE",status:"awaiting_payment",payment_confirmed_at:null,payment_confirmed_amount:null}]}));
  for(const value of ["R1920.00","Ozow","provider-reference-example","OCTA-X Ethanol 96%","25L","16 Oct 2026"])assert.ok(html.includes(value),value);
  assert.ok(!html.includes("R999.00")&&!html.includes("UNPAID-PRIVATE-EXAMPLE"));
});

test("Customer navigation is available only in the signed-in header; guests retain Sign in",()=>{
  for(const signedIn of [false,true]){
    const {Nav}=load("../src/components/Nav.tsx",{"next/link":({children,...props})=>createElement("a",props,children),"next/navigation":{usePathname:()=>"/account/"},"./AuthContext":{useAuth:()=>({user:signedIn?{id:"customer"}:null})},"./CartContext":{useCart:()=>({count:0,ready:true})},"./brand/Wordmark":{OctaLogo:()=>createElement("span",null,"OCTA")},"./Icon":{Icon:()=>null},"@/lib/navigation":navigation});
    const html=renderToStaticMarkup(createElement(Nav));
    if(signedIn){assert.match(html,/>Customer</);assert.match(html,/aria-current="page"/);assert.ok(!html.includes('href="/account/login/"'));}
    else{assert.ok(!html.includes('href="/account/"'));assert.match(html,/>Sign in</);}
  }
});
