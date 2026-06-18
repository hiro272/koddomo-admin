# Registrando eventos (estatística real)

O painel já tem tudo pronto do lado do banco:

- tabela **`public.events`** (append-only, qualquer um insere, só admin lê);
- funções de agregação **`admin_overview`**, **`admin_timeseries`**, **`admin_event_breakdown`** (só contagens, travadas por `is_admin()`).

Falta só o **app (koddomo-app)** passar a registrar eventos. Enquanto isso, o painel mostra
um “zero” honesto — nada é inventado.

---

## 1) Helper `track()`

Cole este arquivo em `src/lib/track.js` do **koddomo-app** (é o mesmo que já está aqui):

```js
import { supabase } from './supabase' // ajuste o caminho do seu client

function sessionId() {
  try {
    let s = localStorage.getItem('kdo_sid')
    if (!s) { s = crypto.randomUUID(); localStorage.setItem('kdo_sid', s) }
    return s
  } catch { return null }
}

// COPPA: NUNCA passe nome de criança ou qualquer dado pessoal em `props`.
export async function track(name, { family_id = null, role = null, props = null } = {}) {
  try {
    await supabase.from('events').insert({ name, family_id, role, props, session_id: sessionId() })
  } catch { /* telemetria nunca pode quebrar a tela */ }
}
```

## 2) Onde chamar (sugestão de eventos)

Use nomes curtos e estáveis (snake_case). Bons primeiros eventos:

| Evento              | Quando disparar                                  | Exemplo de `props` (sem PII) |
|---------------------|--------------------------------------------------|------------------------------|
| `app_open`          | ao abrir o app                                   | `{ plan: 'free' }`           |
| `signup`            | família criada                                   | `{}`                         |
| `child_added`       | criança adicionada à família                     | `{}`                         |
| `item_added`        | item catalogado                                  | `{ category: 'cards' }`      |
| `booster_opened`    | booster registrado                               | `{ set: 'sv1' }`             |
| `scan_used`         | uso do Market Scanner                            | `{}`                         |
| `request_created`   | criança pede add/sell/donate/grade               | `{ type: 'add' }`            |
| `video_play`        | aula iniciada                                    | `{ video_id, status }`       |
| `news_open`         | post do feed aberto                              | `{ tag }`                    |
| `upgrade_nudge`     | nudge de upgrade exibido                         | `{ where: 'home' }`          |
| `checkout_started`  | checkout do Stripe iniciado                      | `{}`                         |
| `subscription_active` | assinatura confirmada                          | `{}`                         |

Exemplo de chamada:

```js
import { track } from '../lib/track'

await track('item_added', { family_id, role: 'parent', props: { category: item.category } })
```

## 3) Regras (importante)

- **Sem PII.** Só `family_id` (UUID), `role` (`parent` | `child` | `anon`) e metadados pequenos.
  Nada de nome, e-mail, aniversário, etc.
- **`role`** aceita só `parent`, `child` ou `anon` (ou vazio).
- O painel agrupa por `name` e mostra eventos por dia + os mais comuns, assim que começarem a chegar.

Quando isso estiver no app, o bloco “Eventos do app” do painel preenche sozinho.
