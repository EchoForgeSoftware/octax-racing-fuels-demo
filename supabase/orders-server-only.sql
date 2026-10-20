-- Website orders are placed by the "backoffice" (EFT) and "ozow-checkout" Edge
-- Functions, which price them from the live back office on the server. Browsers
-- no longer insert orders directly, so a changed total in a browser can't be
-- saved. Customers still read their own orders (order history). Rerunnable.
-- Run AFTER setup-all.sql and backoffice-live.sql, once the new checkout is live.
begin;
drop policy if exists "Anyone can place an order" on public.orders;
revoke insert on public.orders from anon, authenticated;
commit;
