-- =====================================================================
-- Migration 0002 — Imagem do prêmio
-- Adiciona a coluna image_url em raffle_prizes.
-- Idempotente.
-- =====================================================================

alter table raffle_prizes
  add column if not exists image_url text;
