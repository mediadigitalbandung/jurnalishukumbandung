export const EDITOR_ROLES = ["SUPER_ADMIN", "EDITOR"];
export const CREATOR_ROLES = ["JOURNALIST", "CONTRIBUTOR"];
export const ADMIN_ROLES = ["SUPER_ADMIN"];
export const MANAGEMENT_ROLES = ["SUPER_ADMIN", "EDITOR"];
export const ALL_ROLES = [...EDITOR_ROLES, ...CREATOR_ROLES];
export const CAN_SUBMIT_REVIEW = ["SUPER_ADMIN", "EDITOR", "JOURNALIST"];

export const roleLabelsMap: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  EDITOR: "Editor",
  JOURNALIST: "Jurnalis",
  CONTRIBUTOR: "Kontributor",
};
