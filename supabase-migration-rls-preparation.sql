-- =============================================================================
-- PREPARACAO DE RLS POR TENANT (Hardening final) - NAO RODAR EM PRODUCAO AINDA
-- =============================================================================
--
-- OBJETIVO
--   Deixar pronta a infraestrutura de Row Level Security (RLS) como SEGUNDA
--   camada de isolamento entre lojas (defesa em profundidade). Hoje o isolamento
--   e feito 100% em codigo (todo SELECT/UPDATE filtra store_id). A RLS adiciona
--   uma rede de seguranca no proprio banco: mesmo que uma query esqueca o filtro,
--   o Postgres bloqueia linhas de outra loja.
--
-- AVISO CRITICO - POR QUE NAO ATIVAR AINDA
--   A aplicacao conecta com a SERVICE ROLE KEY do Supabase. A service role
--   IGNORA (bypassa) qualquer policy de RLS. Portanto, ativar RLS agora NAO tem
--   efeito sobre o trafego atual e NAO quebra nada -- mas tambem nao protege
--   nada ate que a camada de acesso passe a:
--     (a) usar uma conexao com papel NAO-service (anon/authenticated), ou
--     (b) definir o tenant por requisicao via GUC e rodar as queries sob um papel
--         que respeite RLS.
--
--   Plano de adocao recomendado (fase futura, fora deste hardening):
--     1. Rodar este arquivo para CRIAR as policies (seguro: service role bypassa).
--     2. Introduzir um cliente Postgres por-requisicao que execute, no inicio de
--        cada transacao:  SELECT set_config('app.current_store_id', $1, true);
--        (onde $1 e o store_id resolvido por slug/host, NUNCA pelo cliente).
--     3. Migrar gradualmente as rotas sensiveis para esse cliente.
--     4. So depois, considerar remover o uso da service role nas rotas de dados.
--
-- IDEMPOTENTE: pode rodar mais de uma vez. NAO apaga dados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Funcao auxiliar: store_id do tenant atual a partir de uma GUC de sessao.
--    A aplicacao define isso por requisicao com set_config('app.current_store_id', ...).
--    Retorna NULL se nao definido (e nesse caso as policies negam tudo).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_store_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_store_id', true), '')::bigint
$$;

-- -----------------------------------------------------------------------------
-- 2) Habilitar RLS e criar policy de isolamento por loja nas tabelas sensiveis.
--    A policy permite a linha apenas quando store_id == tenant atual.
--    (FORCE garante que ate o dono da tabela respeite a RLS; a service role do
--     Supabase ainda bypassa por design, o que e aceitavel na fase de transicao.)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'orders',
    'customers',
    'order_reviews',
    'store_settings',
    'customer_cashback',
    'customer_points',
    'products',
    'categories',
    'banners'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    -- So aplica se a tabela existir e tiver a coluna store_id.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'store_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);

      -- Remove policy anterior (se existir) para recriar de forma idempotente.
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I;', t);

      -- Policy unica para todas as operacoes: store_id deve bater com o tenant.
      EXECUTE format($f$
        CREATE POLICY tenant_isolation ON public.%I
        USING (store_id = public.current_tenant_store_id())
        WITH CHECK (store_id = public.current_tenant_store_id());
      $f$, t);

      RAISE NOTICE 'RLS preparada para tabela %', t;
    ELSE
      RAISE NOTICE 'Pulada (sem store_id ou inexistente): %', t;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3) VALIDACAO (apos adotar o cliente tenant-scoped):
--      SET app.current_store_id = '5';
--      SELECT count(*) FROM public.orders;   -- deve ver SO a loja 5
--      SET app.current_store_id = '1';
--      SELECT count(*) FROM public.orders;   -- deve ver SO a loja 1
-- -----------------------------------------------------------------------------
