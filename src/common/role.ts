export const Roles = {
  Admin: "Admin",
  Contractor: "Contractor",
  ClaimManager: "Claim Manager",
  InsuranceRep: "Insurance Representative",
  Evaluator: "Evaluator",
} as const;

export type RoleName = typeof Roles[keyof typeof Roles];