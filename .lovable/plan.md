# Reinvenção: PM com setores

Sistema único, todos os dados filtrados por **setor**. GER será substituído por **Polícia Militar - SP** com 5 setores: GATE, 19º BPM, ROTA, ROCAM, Posto Comunitário.

## Modelo de acesso

- Usuário comum: pertence a **um setor**, só vê dados do seu setor.
- Admin de setor: gerencia apenas seu setor (aprovar usuários, ver patrulhas, dashboard).
- Superadmin (admindec atual vira `adminpm`): vê todos os setores.

## Banco de dados (migração)

- Novo enum `sector` com: `gate`, `bpm19`, `rota`, `rocam`, `posto`.
- Adicionar coluna `sector` (NOT NULL) em: `profiles`, `police_officers`, `patrols`.
- Nova tabela `user_sector_roles (user_id, sector, role)` para admins por setor; manter `user_roles` para superadmin.
- Função `is_sector_admin(uid, sector)` e `get_user_sector(uid)`.
- RLS reescrita: SELECT/UPDATE restritos a `sector = get_user_sector(auth.uid())` OR superadmin OR sector-admin do mesmo setor.
- Índice único parcial de `unidade` em patrols vira `(sector, unidade) WHERE active`.

## Seed dos admins

Migração executa via `pgcrypto` insert direto em `auth.users` + `profiles (status=approved)` + `user_sector_roles`:

| Usuário | Senha | Papel |
|---|---|---|
| `adminpm` | `AdminPM@2026` | Superadmin (todos os setores) |
| `admingate` | `AdminGate@2026` | Admin GATE |
| `admin19bpm` | `Admin19BPM@2026` | Admin 19º BPM |
| `adminrota` | `AdminRota@2026` | Admin ROTA |
| `adminrocam` | `AdminRocam@2026` | Admin ROCAM |
| `adminposto` | `AdminPosto@2026` | Admin Posto Comunitário |

(O `admindec` antigo é removido.)

## Frontend

- **Cadastro/Signup (`Auth.tsx`)**: novo campo obrigatório `Setor` (select). Salvo em `profiles.sector`.
- **Header**: "POLÍCIA MILITAR - SP" + badge do setor do usuário logado.
- **Navigation**: mantém abas existentes (Patrulhamento, Cadastro, Dashboard, Setor Admin, Usuários, Chefia); abas admin só aparecem se for superadmin ou admin do setor.
- **Patrulhamento / PoliceRegistration**: ao criar registro, anexa `sector = currentUserSector` automaticamente.
- **AdminDashboard / AdminSector / ChefiaDEC / UserApproval**: filtram por setor do admin; superadmin ganha seletor "Todos os setores / Setor X".
- Hierarquia de cargos: troca lista GER por hierarquia PM padrão (Soldado, Cabo, 3º Sgt, 2º Sgt, 1º Sgt, Subten, 2º Ten, 1º Ten, Cap, Maj, Ten Cel, Cel).
- Renomear branding: index.html title/desc, Header, Footer, Auth ("POLÍCIA MILITAR - SP").

## Pontos técnicos

- `AuthContext` expõe `currentSector` e `isSectorAdmin(sector)` além de `isAdmin` (superadmin).
- Constante `SECTORS` com `{ value, label }` em `src/types/police.ts`.
- Dados antigos sem `sector` recebem default `bpm19` na migração (para não quebrar registros existentes).
- Documentação/memory atualizada após implementação.

## Entrega

Após aprovação: rodo a migração (cria enum, colunas, RLS, seeds), depois aplico as mudanças de frontend numa leva, e te entrego a lista de logins funcionando.