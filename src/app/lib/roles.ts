// Who may do what. Shared by the middleware, route handlers and pages so a role's
// scope is defined in one place.
//
//   admin       the owner: everything, including money (revenue, fees, payments, expenses)
//   coach       runs the ground: tournaments, attendance, booking status — never revenue
//   club_admin  a partner club's admin: their club's members, fees and settings
//   customer    a member / walk-in customer

export type Role = "customer" | "admin" | "coach" | "club_admin";

export const ROLES: Role[] = ["customer", "coach", "admin", "club_admin"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Member",
  coach: "Coach",
  admin: "Admin",
  club_admin: "Club admin",
};

/** Roles the owner can give a Sathiyan user from the members screen. */
export const ASSIGNABLE_ROLES: Role[] = ["customer", "coach", "admin"];

export const isOwner = (role?: string | null) => role === "admin";

/** Admin or coach — ground staff at Sathiyan. */
export const isStaff = (role?: string | null) => role === "admin" || role === "coach";

export const canManageTournaments = isStaff;
export const canManageAttendance = isStaff;
/** Change booking status, slots and details — the amounts stay with the owner. */
export const canManageBookings = isStaff;

/** Revenue, amounts, fees, payments, expenses: owner only. */
export const canSeeMoney = isOwner;

/** Anyone who gets the /admin hub. */
export const hasAdminArea = (role?: string | null) => isStaff(role) || role === "club_admin";
