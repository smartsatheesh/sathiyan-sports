// Who may do what. Shared by the middleware, route handlers and pages so a role's
// scope is defined in one place.
//
//   admin       the owner: everything, including money (revenue, fees, payments, expenses)
//   coach       runs the ground: match scores and live scoring, attendance, booking status —
//               never revenue, and never the tournament set-up (creating, fixtures, reshuffles)
//   club_admin  a partner club's admin: their club's members, fees and settings
//   finance     Sathiyan Finance collection staff: records loans given, instalments, interest
//               and principal received — never the finance reports or settings, and nothing
//               else in the admin area
//   customer    a member / walk-in customer

export type Role = "customer" | "admin" | "coach" | "club_admin" | "finance";

export const ROLES: Role[] = ["customer", "coach", "admin", "club_admin", "finance"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Member",
  coach: "Coach",
  admin: "Admin",
  club_admin: "Club admin",
  finance: "Finance staff",
};

/** Roles the owner can give a Sathiyan user from the members screen. */
export const ASSIGNABLE_ROLES: Role[] = ["customer", "coach", "admin", "finance"];

export const isOwner = (role?: string | null) => role === "admin";

/** Admin or coach — ground staff at Sathiyan. */
export const isStaff = (role?: string | null) => role === "admin" || role === "coach";

/** Open the admin tournament screens: fixtures, registrations list, live matches. */
export const canManageTournaments = isStaff;
/** Start matches and enter, update or correct scores and winners (the coach's job on match day). */
export const canScoreMatches = isStaff;
/**
 * Set a tournament up or change it: create / edit / delete tournaments, generate or reshuffle
 * fixtures, add or remove matches, change who plays whom, edit or delete registrations.
 */
export const canEditTournaments = isOwner;
export const canManageAttendance = isStaff;
/** Change booking status, slots and details — the amounts stay with the owner. */
export const canManageBookings = isStaff;

/** Revenue, amounts, fees, payments, expenses: owner only. */
export const canSeeMoney = isOwner;

/** Sathiyan Finance (lending ledger): the owner and the finance staff. */
export const canUseFinance = (role?: string | null) => role === "admin" || role === "finance";
/** Finance reports (interest earned, money out), loan edits and the finance settings: owner only. */
export const canManageFinance = isOwner;

/** Anyone who gets the /admin hub. */
export const hasAdminArea = (role?: string | null) => isStaff(role) || role === "club_admin" || role === "finance";
