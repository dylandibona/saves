# Session notes — 2026-05-13

Short follow-up session: respond to a Supabase Security Advisor email that
flagged `Table publicly accessible` on the `Finds` project. Full triage,
one migration applied, eleven of twenty-five advisor lints resolved.

> Read this against `CLAUDE.md` §17 (Supabase notes) and against
> `docs/session-notes-2026-05-12.md` for the work that preceded.

---

## 1. What triggered the work

Supabase emailed:

> **Critical issue — Table publicly accessible**
> Anyone with your project URL can read, edit, and delete all data in this
> table because Row-Level Security is not enabled.
> `rls_disabled_in_public` — Project: Finds (`lqmjglpzrfcpnpshbjwo`)

Pulled the full advisor output via the Supabase MCP. **25 lints total**, of
which one was the ERROR cited in the email. Most of the rest were
related-but-quieter warnings about our SECURITY DEFINER functions and
mutable search paths.

---

## 2. Full triage

| # | Lint | Level | Target | Verdict |
|---|---|---|---|---|
| 1 | `rls_disabled_in_public` | **ERROR** | `public.spatial_ref_sys` | False positive — PostGIS's ~8500-row static EPSG catalog, public reference data, no user info. Can't fix from user-space (owned by `supabase_admin`). |
| 2 | `rls_enabled_no_policy` | INFO | `public.stripe_events` | Intentional default-deny. Service-role-only via webhook. Documented via `COMMENT ON TABLE`. |
| 3-7 | `function_search_path_mutable` | WARN | 6 of our functions | **Real risk.** Fixed via `SET search_path = ''`. |
| 8-12 | `anon_security_definer_function_executable` | WARN | Our SECURITY DEFINER functions | **Real risk.** Fixed via `REVOKE EXECUTE FROM anon`. |
| 13-14 | `authenticated_security_definer_function_executable` | WARN | `generate_share_token`, `is_household_member` | Intentional — both are designed to be authenticated-callable. `is_household_member` is called from RLS policies, removing authenticated EXECUTE would break every household-scoped query. |
| 15-20 | `anon/authenticated_security_definer_function_executable` | WARN | PostGIS `st_estimatedextent` × 3 overloads × 2 roles | Ships with PostGIS. Not ours. |
| 21-22 | `extension_in_public` | WARN | `postgis`, `pg_trgm` | Destructive to move post-install. Deferred. |
| 23 | `auth_leaked_password_protection` | WARN | Auth setting | Dashboard toggle. Dylan to flip. |

The email's "critical" framing was misleading. The actual urgent items
were the SECURITY DEFINER + search-path issues on our functions, which
were buried as warnings.

---

## 3. The migration that landed

**`20260513000001_security_hardening.sql`** — applied via Supabase MCP
`apply_migration`, mirrored to `supabase/migrations/`.

Three actions, in order:

1. **`COMMENT ON TABLE public.stripe_events`** documenting that the
   no-policy-on-RLS-enabled posture is intentional. Service role bypasses
   RLS; webhook handler writes here as service role; default-deny for
   `anon` + `authenticated` is correct.

2. **`ALTER FUNCTION … SET search_path = ''`** on all six of our own
   functions (`handle_new_user`, `is_household_member`, `set_updated_at`,
   `expire_merge_proposals`, `update_save_capture_stats`,
   `generate_share_token`). Empty search_path forces fully-qualified
   references inside the function body, eliminating the
   search-path-hijack attack surface.

3. **`REVOKE EXECUTE`** on SECURITY DEFINER functions per role:
   - Trigger functions (`handle_new_user`, `set_updated_at`,
     `expire_merge_proposals`, `update_save_capture_stats`,
     `rls_auto_enable`): revoked from `PUBLIC, anon, authenticated`.
     Triggers don't check EXECUTE permission, so this can't break the
     trigger pathway.
   - `is_household_member`: revoked from `PUBLIC, anon`. Kept
     `authenticated` because RLS policies that reference it require the
     evaluating role to have EXECUTE permission.
   - `generate_share_token`: revoked from `PUBLIC, anon`. Kept
     `authenticated` because `settings/actions.ts` calls it as a Server
     Action.

### Why we didn't touch `spatial_ref_sys`

First attempt at the migration failed with `42501: must be owner of
table spatial_ref_sys`. The table is owned by `supabase_admin`, not by
our migration role. The only safe path is moving PostGIS to a separate
schema, which would require recreating every spatial index plus all
references in our migrations + queries. Not worth doing for an
informational lint on a static read-only PostGIS catalog. Left as-is
with a documented carve-out in the migration header.

---

## 4. Before / after

| | Before | After |
|---|---|---|
| Total lints | 25 | 14 |
| ERROR | 1 | 1 (spatial_ref_sys — unfixable) |
| WARN | 23 | 12 (10 PostGIS-shipped or intentional, 2 destructive-to-move, 1 dashboard toggle) |
| INFO | 1 | 1 (stripe_events — now documented as intentional) |

Everything resolvable from user-space is resolved.

---

## 5. Open items for Dylan

| Item | Where | Effort |
|---|---|---|
| **Enable Leaked Password Protection** | Supabase dashboard → Auth → Providers → Password → toggle "Check against HaveIBeenPwned.org" | 30 sec |
| Acknowledge the `spatial_ref_sys` advisor entry | Dashboard advisor view | Optional — can mark as "intended" or leave |

---

## 6. Architectural learning

**Supabase Security Advisor severity is calibrated for the dashboard, not
for triage.** The ERROR-level `rls_disabled_in_public` on `spatial_ref_sys`
sounds catastrophic but the table is PostGIS reference data with no user
info, and the underlying lint is structurally unfixable. Meanwhile the
WARN-level `function_search_path_mutable` and `anon_security_definer`
items were the actual risks. Future advisor responses: query the API for
the full list first, then triage by what the function/table actually
does, not by the severity label.

**RLS-pathway function calls DO check EXECUTE permission.** Initially
assumed that SECURITY DEFINER functions called from policy bodies would
bypass the EXECUTE grant check, since the function runs as its owner.
That's wrong — Postgres still checks whether the *caller* has EXECUTE
before invoking the function, regardless of SECURITY DEFINER. This
matters: revoking `authenticated` EXECUTE on `is_household_member` would
break every household-scoped RLS policy. Kept authenticated EXECUTE on
both `is_household_member` and `generate_share_token` for this reason.

---

## 7. Production-deploy status

- DB migration applied to project `lqmjglpzrfcpnpshbjwo` via MCP.
- Source mirrored to `supabase/migrations/20260513000001_security_hardening.sql`.
- No app code changes. No type regeneration needed (no schema-level changes —
  COMMENTs, search_path, and EXECUTE grants don't affect TypeScript types).
- No deploy required. The Vercel app is unaffected by these changes.
