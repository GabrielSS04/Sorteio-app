-- =====================================================================
-- Migration 0004 — Preço promocional (combo)
-- Ex.: unidade R$ 5, mas "4 números/nomes por R$ 15".
--   promo_quantity = quantos números/nomes no combo (ex.: 4)
--   promo_price    = valor do combo (ex.: 15.00)
-- Idempotente.
-- =====================================================================

alter table raffles
  add column if not exists promo_quantity integer,
  add column if not exists promo_price    numeric(12, 2);
