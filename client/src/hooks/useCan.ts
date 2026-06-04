import type { Permission } from "@/types";
import { can } from "@/lib/rbac";
import { useAuth } from "@/stores/auth";

/** Returns a predicate bound to the current user's role. */
export function useCan() {
  const role = useAuth((s) => s.user?.role);
  return (permission: Permission) => can(role, permission);
}
