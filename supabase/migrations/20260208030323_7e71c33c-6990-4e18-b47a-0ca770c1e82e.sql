-- Add unique constraint for upsert on acuerdos_comerciales
-- This allows "Update or Insert" when partida + pais + tratado match
ALTER TABLE public.acuerdos_comerciales
ADD CONSTRAINT uq_acuerdo_partida_pais_tratado
UNIQUE (codigo_arancelario, pais_origen, tratado_codigo);
