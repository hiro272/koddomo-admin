# Koddomo · Painel da equipe (koddomo-admin)

Painel web interno para o time Koddomo. Projeto **separado** do app, mas usa o **mesmo Supabase**
(`iobhrfiqsxanwktaoqlw`). Acesso só para quem está na tabela `admins`.

O que dá pra fazer:
- **Painel:** estatísticas reais (famílias, crianças, assinantes, itens, valor catalogado, novidades/vídeos no ar) + funil de eventos do app.
- **Novidades:** criar, editar, publicar/despublicar e excluir posts do feed (`news_posts`).
- **Vídeos do curso:** cadastrar e ordenar aulas (`course_videos`).

Tudo respeita o princípio Koddomo: **nenhum dado inventado** — só números reais.

---

## Rodar localmente (opcional)

```bash
npm install
npm run dev
```

## Deploy na Vercel (a partir do GitHub)

1. Crie um repositório novo (ex.: `koddomo-admin`) e suba **todos os arquivos desta pasta**.
2. Na Vercel: **Add New → Project → importar o repositório**.
3. Framework: **Vite** (detectado sozinho). Build: `npm run build`. Output: `dist`.
4. **Deploy.** Pronto — a URL já funciona.

> As chaves do Supabase já vêm embutidas como fallback (a chave pública é segura: o banco é
> protegido por RLS e escrita só com `is_admin()`). Se um dia quiser apontar para outro projeto,
> defina na Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).

---

## Adicionar alguém ao time (virar admin)

Duas etapas, feitas no **painel do Supabase**:

1. **Criar o login:** Authentication → Users → *Add user* (e-mail + senha). Passe a senha para a pessoa.
2. **Dar acesso de admin:** SQL Editor, rode (troque o e-mail):

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'pessoa@dizcharge.com'
on conflict (user_id) do nothing;
```

Para **remover** o acesso:

```sql
delete from public.admins
where user_id = (select id from auth.users where email = 'pessoa@dizcharge.com');
```

Quem fizer login sem estar em `admins` vê a tela “Sem acesso”.

---

## Estatística real (eventos)

A tabela `events` e as métricas já existem. Para o bloco “Eventos do app” começar a encher,
o **koddomo-app** precisa chamar `track()` — passo a passo em **`TRACKING.md`**.

## Segurança (resumo)

- `events`: qualquer um insere (telemetria), **só admin lê**.
- `news_posts` / `course_videos`: leitura pública do que está no ar; **escrita só admin** (`is_admin()`).
- Funções `admin_*`: rodam como `security definer` mas **conferem `is_admin()`** e devolvem só contagens (sem dados pessoais).
