import { useEffect, useState, useRef } from "react";
import { supabase } from "@/core/api/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useToast } from "@/components/toast/ToastProvider";

export default function AdminUsersPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [rawQuery, setRawQuery] = useState("");
  const debounceRef = useRef<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<number | null>(null); // default: null => 'Todos'
  const [activationFilter, setActivationFilter] = useState<"all" | "activated" | "not_activated">("all");
  const [disabledCount, setDisabledCount] = useState<number | null>(null);
  const [notActivatedCount, setNotActivatedCount] = useState<number | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);
  const [activatedUsersCount, setActivatedUsersCount] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [modalUser, setModalUser] = useState<any | null>(null);
  const [deactivationLoading, setDeactivationLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | undefined>(undefined);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);

  // Toggle active/disabled state for a user (soft-deactivate via `is_disabled`)
  async function handleToggleActive() {
    if (!modalUser) return;
    setDeactivateError(undefined);
    setDeactivationLoading(true);
    try {
      const newDisabled = !!modalUser.is_disabled ? false : true;
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_disabled: newDisabled })
        .eq("id", modalUser.id)
        .select("id, is_disabled");

      if (error) {
        // More descriptive message for typical RLS/permission errors
        const msg = error.message || "Error al actualizar usuario";
        setDeactivateError(msg);
        toast.error("No se pudo actualizar el usuario: " + msg);
        // log details for debugging
        console.error("profiles.update error:", error);
        return;
      }

      // Post-update: update local list and disabled counter
      const updated = Array.isArray(data) && data.length ? data[0] : (data as any);
      const updatedDisabled = updated?.is_disabled ?? newDisabled;
      setUsers((prev) => prev.map((u) => (u.id === modalUser.id ? { ...u, is_disabled: updatedDisabled } : u)));

      // Adjust disabledCount reliably (if unknown, refetch by setting null so effect could refetch or we compute)
      setDisabledCount((prev) => {
        try {
          if (prev === null) return prev;
          return updatedDisabled ? (prev + 1) : Math.max(0, prev - 1);
        } catch { return prev; }
      });

      toast.success(updatedDisabled ? "Usuario dado de baja" : "Usuario reactivado");
      setShowModal(false);
      setModalUser(null);
    } catch (err: any) {
      setDeactivateError(err?.message || String(err));
      toast.error("Error: " + (err?.message || String(err)));
    } finally {
      setDeactivationLoading(false);
    }
  }

  useEffect(() => {
    const createdName = (location.state as any)?.createdName;
    if (createdName) {
      toast.success(`Usuario creado: ${createdName}`);
      try {
        // clear state so toast doesn't repeat on navigation history back
        (window.history.state && window.history.replaceState({ ...window.history.state, usr: { ...window.history.state.usr, createdName: undefined } }, "", window.location.pathname))
          && window.history.replaceState({}, "", window.location.pathname);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce rawQuery -> query to avoid refetch on every keystroke
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // small debounce to prevent spamming the UI with loading transitions
    debounceRef.current = window.setTimeout(() => {
      setPage(1);
      setQuery(rawQuery.trim());
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        let q = supabase
          .from("profiles")
          .select("id, first_names, last_names, email, role_id, institution_id, created_at, avatar_url, auth_user_id, is_disabled", { count: "exact" })
          .order("created_at", { ascending: false });

        if (roleFilter) {
          q = q.eq("role_id", roleFilter);
        }

        if (activationFilter === "activated") {
          q = q.not("auth_user_id", "is", null);
        } else if (activationFilter === "not_activated") {
          q = q.is("auth_user_id", null);
        }

        // search will include institution_id via the combined query (below)

        if (query && query.length > 0) {
          const qEsc = query;
          q = q.or(`first_names.ilike.%${qEsc}%,last_names.ilike.%${qEsc}%,email.ilike.%${qEsc}%,institution_id.ilike.%${qEsc}%`);
        }

        const res = await q.range(from, to);
        if (!mounted) return;
        if (res.error) throw res.error;
        setUsers(res.data ?? []);
        setTotal(res.count ?? 0);
      } catch (e) {
        console.error("admin users fetch error:", e);
        setUsers([]);
        setTotal(0);
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [page, pageSize, query, roleFilter, activationFilter]);

  // fetch count of inactivos (profiles without auth_user_id)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = supabase.from("profiles").select("id", { count: "exact", head: true }).is("auth_user_id", null);
        const res = await q;
        if (!mounted) return;
        if (res.error) {
          setNotActivatedCount(null);
        } else {
          setNotActivatedCount(res.count ?? 0);
        }
      } catch (err) {
        setNotActivatedCount(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // fetch count of disabled (soft-deactivated) users
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_disabled", true);
        if (!mounted) return;
        if (error) setDisabledCount(null);
        else setDisabledCount(count ?? 0);
      } catch (err) {
        if (!mounted) return;
        setDisabledCount(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // fetch global totals: total users and activated users
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const totalRes = await supabase.from("profiles").select("id", { count: "exact", head: true });
        const activatedRes = await supabase.from("profiles").select("id", { count: "exact", head: true }).not("auth_user_id", "is", null);
        if (!mounted) return;
        setTotalUsersCount(totalRes.count ?? 0);
        setActivatedUsersCount(activatedRes.count ?? 0);
      } catch (err) {
        setTotalUsersCount(null);
        setActivatedUsersCount(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // get current logged-in auth user id to hide self-actions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await supabase.auth.getSession();
        const id = s?.data?.session?.user?.id ?? null;
        if (!mounted) return;
        setCurrentAuthUserId(id);
      } catch {
        if (!mounted) return;
        setCurrentAuthUserId(null);
      }
    })();
    return () => { mounted = false; };
  }, []);


  // Show full-screen loader only on the very first load.
  if (initialLoading) return <FullScreenLoader />;

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-text">
      <header className="flex flex-col gap-4 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-semibold">Usuarios</h1>
            <p className="mt-1 text-sm text-text/70">Listado de usuarios registrados en la plataforma.</p>
          </div>
          <div>
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
            >
              Crear usuario
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
          <div className="flex items-center gap-3">
            {typeof totalUsersCount === 'number' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-text shadow-sm border border-border">
                <span className="text-xs text-text/60">Total</span>
                <span className="font-semibold">{totalUsersCount}</span>
              </div>
            )}
            {typeof activatedUsersCount === 'number' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                <span className="text-xs text-green-700/80">Activos</span>
                <span className="font-semibold text-green-700">{activatedUsersCount}</span>
              </div>
            )}
            {typeof notActivatedCount === 'number' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                <span className="text-xs text-red-700/80">Inactivos</span>
                <span className="font-semibold text-red-700">{notActivatedCount}</span>
              </div>
            )}
            {typeof disabledCount === 'number' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
                <span className="text-xs text-gray-600">Baja</span>
                <span className="font-semibold text-gray-700">{disabledCount}</span>
              </div>
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 w-full max-w-3xl shadow-sm border border-border min-w-0">
              <select value={roleFilter ?? ''} onChange={(e) => { setPage(1); setRoleFilter(e.target.value ? Number(e.target.value) : null); }} className="hidden sm:inline-block rounded-md border border-border bg-white px-3 py-2 text-sm">
                <option value="">Todos</option>
                <option value="3">Estudiantes</option>
                <option value="2">Docentes</option>
                <option value="1">Admins</option>
              </select>

              <select value={activationFilter} onChange={(e) => { setPage(1); setActivationFilter(e.target.value as any); }} className="hidden sm:inline-block rounded-md border border-border bg-white px-3 py-2 text-sm">
                <option value="all">Todos</option>
                <option value="activated">Activos</option>
                <option value="not_activated">Inactivos</option>
              </select>

              <input
                value={rawQuery}
                onChange={(e) => { setPage(1); setRawQuery(e.target.value); }}
                placeholder="Buscar por nombre, correo o ID institucional..."
                className="flex-1 min-w-0 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        {/* loader shown as overlay inside the users card to avoid moving header controls */}
      </header>

        {/* Deactivate / Reactivate confirmation modal */}
        {showModal && modalUser && (
          <div className="fixed inset-0 grid place-items-center bg-black/40" style={{ zIndex: 2147483646 }}>
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg relative" style={{ zIndex: 2147483647 }}>
              <h3 className="text-lg font-semibold mb-2">{modalUser.is_disabled ? "Reactivar usuario" : "Dar de baja usuario"}</h3>
              <p className="text-sm text-text/70 mb-4">¿Deseas {modalUser.is_disabled ? "reactivar" : "dar de baja"} a <strong>{`${modalUser.first_names ?? ""} ${modalUser.last_names ?? ""}`}</strong>? Esta acción puede revertirse.</p>
              {deactivateError && <div className="text-sm text-red-600 mb-2">{deactivateError}</div>}
              <div className="flex items-center gap-2">
                <button onClick={() => { handleToggleActive(); }} disabled={deactivationLoading} className="rounded-md bg-primary px-3 py-2 text-white">{deactivationLoading ? "Procesando..." : (modalUser.is_disabled ? "Reactivar" : "Dar de baja")}</button>
                <button onClick={() => { setShowModal(false); setModalUser(null); setDeactivateError(undefined); }} className="rounded-md border px-3 py-2">Cancelar</button>
              </div>
            </div>
          </div>
        )}

      <div className="relative rounded-xl border border-border bg-surface p-4">
        {users.length === 0 ? (
          <div className="py-8 text-center text-sm text-text/60">No se encontraron usuarios.</div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden sm:block overflow-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-left text-text/60">
                    <th className="p-2">Usuario</th>
                    {/* Correo column removed (emails shown under name) */}
                    <th className="p-2 hidden md:table-cell">Rol</th>
                    <th className="p-2 hidden lg:table-cell">Institución</th>
                    <th className="p-2 hidden lg:table-cell">Creado</th>
                    <th className="p-2">Estado <span title="Activo = usuario con cuenta de inicio de sesión. Inactivo = sin cuenta vinculada." className="ml-2 text-xs text-text/60">ℹ</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted transition-colors">
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {u.avatar_url ? (
                              <AvatarImage src={u.avatar_url} alt={`${u.first_names} ${u.last_names}`} />
                            ) : (
                              <AvatarFallback>{(u.first_names ?? "")[0] || (u.last_names ?? "")[0] || "U"}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{`${u.first_names ?? ""} ${u.last_names ?? ""}`.trim() || "—"}</div>
                            <div className="text-xs text-text/60">{u.email ?? u.id}</div>
                          </div>
                        </div>
                      </td>
                      {/* desktop email column removed per request */}
                      <td className="p-2 hidden md:table-cell">{u.role_id === 1 ? "Admin" : u.role_id === 2 ? "Teacher" : "Student"}</td>
                      <td className="p-2 hidden lg:table-cell">{u.institution_id ?? "—"}</td>
                      <td className="p-2 hidden lg:table-cell">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                      <td className="p-2">
                        {u.auth_user_id ? (
                          <span title="Usuario con cuenta de autenticación vinculada" className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Activo</span>
                        ) : (
                          <span title="Usuario sin cuenta de autenticación" className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Inactivo</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {u.id !== currentAuthUserId && (
                          <button
                            onClick={() => { setModalUser(u); setShowModal(true); setDeactivateError(undefined); }}
                            className={`rounded-md px-3 py-1 text-sm ${u.is_disabled ? 'bg-green-50 text-green-700 hover:bg-green-60' : 'bg-red-600 text-white hover:bg-red-700'}`}
                          >
                            {u.is_disabled ? 'Reactivar' : 'Dar de baja'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden space-y-3">
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {u.avatar_url ? (
                        <AvatarImage src={u.avatar_url} alt={`${u.first_names} ${u.last_names}`} />
                      ) : (
                        <AvatarFallback>{(u.first_names ?? "")[0] || (u.last_names ?? "")[0] || "U"}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                        <div className="font-medium">{`${u.first_names ?? ""} ${u.last_names ?? ""}`.trim() || "—"}</div>
                        <div>
                          {u.auth_user_id ? (
                                <span title="Usuario con cuenta de autenticación vinculada" className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Activo</span>
                              ) : (
                                <span title="Usuario sin cuenta de autenticación" className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Inactivo</span>
                              )}
                        </div>
                      </div>
                      <div className="text-xs text-text/60">{u.email ?? u.id}</div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-text/60">
                        <div>{u.role_id === 1 ? "Admin" : u.role_id === 2 ? "Teacher" : "Student"}</div>
                        <div className="truncate">{u.institution_id ?? "—"}</div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => { setModalUser(u); setShowModal(true); setDeactivateError(undefined); }} className="rounded-md bg-secondary/10 px-3 py-1 text-sm text-secondary">{u.is_disabled ? 'Reactivar' : 'Dar de baja'}</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Pagination */}
        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-text/60">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}</div>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">Anterior</button>
              <div className="text-sm">Página {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
              <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
