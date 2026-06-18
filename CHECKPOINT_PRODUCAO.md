# CHECKPOINT DE PRODUCAO - LOJA ACAI

**Data:** 2026-06-05
**Commit:** `22ef05abd3909aaccecbe7984265d7d98b65814e`
**Build:** SUCESSO (sem erros)

---

## ETAPA 1 - ESTRUTURA DE PASTAS

```
/vercel/share/v0-project/
├── app/
│   ├── (store)/              # Loja publica
│   │   ├── components/       # 37 componentes da loja
│   │   ├── hooks/            # 5 hooks (useCart, useCheckout, etc)
│   │   ├── providers/        # 4 providers (Cart, Customer, Store)
│   │   ├── constants/        # Constantes da loja
│   │   ├── types/            # Tipos TypeScript
│   │   └── utils/            # Utilitarios
│   ├── admin/                # Painel administrativo
│   │   ├── components/       # 20+ componentes admin
│   │   ├── hooks/            # 6 hooks admin
│   │   ├── constants/        # Constantes admin
│   │   ├── types/            # Tipos admin
│   │   └── utils/            # Utilitarios admin
│   ├── api/                  # 23 rotas de API
│   ├── entregador/[token]/   # Painel do entregador
│   └── pedido/[id]/          # Rastreamento de pedido
├── components/ui/            # Componentes shadcn/ui
├── lib/                      # Bibliotecas e servicos
│   ├── supabase/             # Cliente Supabase
│   ├── services/             # Servicos (Asaas, etc)
│   └── storage/              # Armazenamento
├── hooks/                    # Hooks globais
├── providers/                # Providers globais
├── config/                   # Configuracoes
├── types/                    # Tipos globais
└── public/                   # Assets estaticos
```

---

## ETAPA 2 - SCHEMA DO BANCO DE DADOS (SUPABASE)

### Tabela: `orders` (Pedidos)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK auto-increment |
| order_number | text | Codigo publico do pedido |
| customer_name | text | Nome do cliente |
| customer_phone | text | Telefone |
| customer_address | text | Endereco |
| customer_neighborhood | text | Bairro |
| payment_method | text | Metodo de pagamento |
| payment_status | text | pending/confirmed/failed |
| order_status | text | Status do pedido |
| total | numeric | Valor total |
| subtotal | numeric | Subtotal |
| discount | numeric | Desconto aplicado |
| delivery_fee | numeric | Taxa de entrega |
| delivery_type | text | delivery/pickup |
| coupon_code | text | Cupom aplicado |
| notes | text | Observacoes |
| tracking_code | text | Codigo de rastreamento |
| asaas_payment_id | text | ID do pagamento Asaas |
| pix_code | text | Codigo PIX |
| pix_qrcode | text | QR Code PIX |
| driver_id | integer | FK entregador |
| driver_name | text | Nome entregador |
| created_at | timestamp | Data criacao |
| prepared_at | timestamp | Data preparacao |
| dispatched_at | timestamp | Data despacho |
| delivered_at | timestamp | Data entrega |
| cancelled_at | timestamp | Data cancelamento |

### Tabela: `order_items` (Itens do Pedido)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| order_id | integer | FK pedido |
| product_id | integer | FK produto |
| product_name | text | Nome produto |
| product_price | numeric | Preco unitario |
| quantity | integer | Quantidade |
| subtotal | numeric | Subtotal item |
| notes | text | Observacoes |

### Tabela: `products` (Produtos)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| name | text | Nome |
| description | text | Descricao |
| price | numeric | Preco |
| image | text | URL imagem |
| category | text | Categoria (legado) |
| category_id | integer | FK categoria |
| active | boolean | Ativo |
| featured | boolean | Destaque |
| best_seller | boolean | Mais vendido |
| stock | integer | Estoque |
| sort_order | integer | Ordem |
| badge_enabled | boolean | Badge ativo |
| badge_text | text | Texto badge |
| badge_color | text | Cor badge |

### Tabela: `product_categories` (Categorias)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| name | text | Nome |
| description | text | Descricao |
| icon | text | Icone |
| image_url | text | Imagem |
| sort_order | integer | Ordem |
| active | boolean | Ativo |

### Tabela: `customers` (Clientes)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| name | text | Nome |
| phone | text | Telefone (login) |
| email | text | Email |
| address | text | Endereco |
| neighborhood | text | Bairro |
| complement | text | Complemento |
| reference | text | Referencia |

### Tabela: `coupons` (Cupons)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| code | text | Codigo |
| discount_type | text | percent/fixed |
| discount_value | numeric | Valor desconto |
| min_order_value | numeric | Pedido minimo |
| max_uses | integer | Usos maximos |
| uses_count | integer | Usos atuais |
| active | boolean | Ativo |
| expires_at | timestamp | Expiracao |

### Tabela: `neighborhoods` (Bairros)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| name | text | Nome |
| delivery_fee | numeric | Taxa entrega |
| delivery_time | text | Tempo entrega |
| active | boolean | Ativo |

### Tabela: `delivery_drivers` (Entregadores)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| name | text | Nome |
| phone | text | Telefone |
| vehicle | text | Veiculo |
| available | boolean | Disponivel |
| active | boolean | Ativo |
| current_order_id | integer | Pedido atual |

### Tabela: `hero_banners` (Banners)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| title | varchar | Titulo |
| subtitle | varchar | Subtitulo |
| image_url | text | Imagem |
| link_url | text | Link |
| sort_order | integer | Ordem |
| active | boolean | Ativo |

### Tabela: `store_settings` (Configuracoes)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | integer | PK |
| store_name | text | Nome loja |
| subtitle | text | Subtitulo |
| slogan | text | Slogan |
| whatsapp | text | WhatsApp |
| address | text | Endereco |
| instagram | text | Instagram |
| facebook | text | Facebook |
| tiktok | text | TikTok |
| logo_url | text | Logo |
| cover_image_url | text | Capa |
| favicon_url | text | Favicon |
| customization | jsonb | Personalizacao completa |
| color_* | text | Cores do tema |
| hero_* | text | Config hero |

---

## ETAPA 3 - APIs

### CRITICAS (Pedidos e Pagamentos)

| Endpoint | Metodo | Finalidade |
|----------|--------|------------|
| `/api/orders` | GET/POST/DELETE | CRUD pedidos |
| `/api/orders/confirm` | POST | Confirmar pagamento |
| `/api/orders/public/[id]` | GET | Rastreamento publico |
| `/api/asaas/create-pix` | POST | Gerar PIX Asaas |
| `/api/asaas/check-payment` | POST | Verificar pagamento |
| `/api/asaas/webhook` | POST | Webhook Asaas |
| `/api/customers` | GET/POST | CRUD clientes |
| `/api/customers/orders` | GET | Pedidos do cliente |

### NAO CRITICAS (Configuracao)

| Endpoint | Metodo | Finalidade |
|----------|--------|------------|
| `/api/products` | GET/POST | CRUD produtos |
| `/api/categories` | GET/POST | CRUD categorias |
| `/api/banners` | GET/POST | CRUD banners |
| `/api/coupons` | GET/POST | CRUD cupons |
| `/api/neighborhoods` | GET/POST | CRUD bairros |
| `/api/entregadores` | GET/POST | CRUD entregadores |
| `/api/entregador/[token]` | GET/POST | Painel entregador |
| `/api/entregador/[token]/entregar` | POST | Marcar entregue |
| `/api/store-settings` | GET/POST | Config loja |
| `/api/customization` | GET/POST | Personalizacao |
| `/api/pix-keys` | GET/POST | Chaves PIX |
| `/api/pix-keys/active` | GET | Chave PIX ativa |
| `/api/config` | GET | Config geral |
| `/api/admin/auth` | POST | Auth admin |
| `/api/debug-supabase` | GET | Debug (remover) |

---

## ETAPA 4 - FUNCIONALIDADES

### LOJA (Funcionando)
- [x] Listagem de produtos
- [x] Filtro por categoria
- [x] Carrinho de compras
- [x] Checkout completo
- [x] Cupons de desconto
- [x] Selecao de bairro e taxa
- [x] PIX Automatico (Asaas)
- [x] PIX Manual
- [x] Dinheiro
- [x] Cartao
- [x] Rastreamento de pedido
- [x] Login cliente (telefone)
- [x] Historico de pedidos
- [x] Repetir pedido
- [x] WhatsApp integrado
- [x] Banner hero
- [x] Promocoes
- [x] Tema dinamico

### ADMIN (Funcionando)
- [x] Dashboard unificado
- [x] Faturamento por periodo
- [x] Grafico de vendas
- [x] Gestao de pedidos (todas as abas)
- [x] Confirmar pagamento manual
- [x] Cancelar pedido
- [x] Atribuir entregador
- [x] Gestao de produtos
- [x] Gestao de categorias
- [x] Gestao de cupons
- [x] Gestao de bairros
- [x] Gestao de entregadores
- [x] Configuracoes da loja
- [x] Personalizacao visual
- [x] Horario de funcionamento
- [x] Configuracao de pagamentos
- [x] WhatsApp config

### PAGAMENTOS (Funcionando)
- [x] PIX Automatico Asaas (webhook)
- [x] PIX Manual (confirmacao lojista)
- [x] Dinheiro (confirmacao lojista)
- [x] Cartao (confirmacao lojista)
- [x] Verificacao de status

### ENTREGADOR (Funcionando)
- [x] Painel por token
- [x] Ver pedidos atribuidos
- [x] Marcar como entregue
- [x] Contato cliente

---

## ETAPA 5 - ARQUIVOS ORFAOS

| Arquivo | Status | Acao Sugerida |
|---------|--------|---------------|
| `AdminReportsSettings.tsx` | Orfao | Remover (substituido por Dashboard) |
| `/api/debug-supabase/route.ts` | Debug | Remover em producao |
| `backup/` | Backup | Manter ou arquivar |

---

## ETAPA 6 - SEGURANCA

### Riscos Identificados

| Risco | Severidade | Mitigacao |
|-------|------------|-----------|
| RLS desabilitado | MEDIA | Habilitar RLS nas tabelas |
| API debug exposta | BAIXA | Remover `/api/debug-supabase` |
| Senha admin em memoria | BAIXA | Usar sessao segura |
| Webhook sem validacao assinatura | MEDIA | Validar assinatura Asaas |

### Validacoes Implementadas
- [x] Senha admin para acesso
- [x] Validacao de inputs nas APIs
- [x] Tratamento de erros de rede
- [x] Tratamento de valores nulos
- [x] Sanitizacao de dados

### Variaveis de Ambiente Obrigatorias
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
POSTGRES_URL
```

### Variaveis Opcionais (Asaas)
```
ASAAS_API_KEY
ASAAS_WALLET_ID
NEXT_PUBLIC_ASAAS_ENABLED
```

---

## ETAPA 7 - BUILD

```
Build Status: SUCESSO
Rotas Compiladas: 25
Erros: 0
Warnings Criticos: 0
```

### Rotas Dinamicas
- `/` (Loja)
- `/admin` (Painel)
- `/pedido/[id]` (Rastreamento)
- `/entregador/[token]` (Painel entregador)
- 23 APIs

---

## ETAPA 8 - RELATORIO FINAL

### VERSAO ESTAVEL

**Commit Hash:** `22ef05abd3909aaccecbe7984265d7d98b65814e`
**Branch:** `verificar-estado-atual`
**Build:** SUCESSO

### Funcionalidades Estaveis
1. Loja completa com checkout
2. Carrinho persistente
3. Todos os metodos de pagamento
4. PIX Asaas integrado
5. Dashboard unificado
6. Gestao completa de pedidos
7. Rastreamento em tempo real
8. Painel do entregador
9. Sistema de cupons
10. Personalizacao visual

### Pontos Criticos
1. RLS desabilitado no Supabase
2. Webhook Asaas sem validacao de assinatura
3. API de debug exposta

### Arquivos Orfaos (3)
1. `AdminReportsSettings.tsx`
2. `/api/debug-supabase/`
3. `backup/`

### Proximas Melhorias Sugeridas
1. Habilitar RLS nas tabelas
2. Remover arquivo debug
3. Validar assinatura webhook
4. Implementar rate limiting
5. Adicionar testes automatizados
6. Implementar cache de produtos

---

**CHECKPOINT CONGELADO - NAO ALTERAR SEM NOVA VERSAO**
