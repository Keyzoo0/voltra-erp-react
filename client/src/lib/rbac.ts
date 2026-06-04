import type { Permission, Role } from "@/types";

// Role → permission matrix (DESIGN.md "Role-Based Access").
const MATRIX: Record<Role, Permission[]> = {
  admin: [
    "order.create",
    "order.edit",
    "order.status",
    "inventory.view",
    "inventory.adjust",
    "production.scan",
    "reports.view",
    "reports.export",
    "users.manage",
  ],
  supervisor: [
    "order.create",
    "order.edit",
    "order.status",
    "inventory.view",
    "inventory.adjust",
    "production.scan",
    "reports.view",
    "reports.export",
  ],
  operator: [
    // operator can only update status of jobs at their own station,
    // enforced contextually; the broad capability is production.scan.
    "order.status",
    "inventory.view",
    "production.scan",
  ],
  viewer: ["inventory.view", "reports.view"],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role];
}
