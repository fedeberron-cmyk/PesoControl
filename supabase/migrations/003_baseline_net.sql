-- Baseline: acumulado neto histórico (kcal) previo al tracking granular en la app.
-- Permite importar el progreso real (p.ej. los −75,616 de Federico) sin re-loguear
-- 46 semanas. cumulativeNet = baseline_net_kcal + suma de netos diarios registrados.
alter table public.users_profile
  add column if not exists baseline_net_kcal integer default 0;
