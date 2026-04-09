import { describe, it, expect } from "vitest";
import { EDITOR_ROLES, CREATOR_ROLES, ADMIN_ROLES, MANAGEMENT_ROLES, ALL_ROLES, CAN_SUBMIT_REVIEW, roleLabelsMap } from "@/lib/roles";

describe("Role Constants", () => {
  it("EDITOR_ROLES includes SUPER_ADMIN", () => {
    expect(EDITOR_ROLES).toContain("SUPER_ADMIN");
  });

  it("EDITOR_ROLES includes EDITOR and EDITOR", () => {
    expect(EDITOR_ROLES).toContain("EDITOR");
    expect(EDITOR_ROLES).toContain("EDITOR");
  });

  it("CREATOR_ROLES includes all content creators", () => {
    expect(CREATOR_ROLES).toContain("JOURNALIST");
    expect(CREATOR_ROLES).toContain("JOURNALIST");
    expect(CREATOR_ROLES).toContain("CONTRIBUTOR");
  });

  it("CREATOR_ROLES does not include editor roles", () => {
    expect(CREATOR_ROLES).not.toContain("SUPER_ADMIN");
    expect(CREATOR_ROLES).not.toContain("EDITOR");
    expect(CREATOR_ROLES).not.toContain("EDITOR");
  });

  it("ALL_ROLES includes both editors and creators", () => {
    expect(ALL_ROLES.length).toBe(EDITOR_ROLES.length + CREATOR_ROLES.length);
  });

  it("ADMIN_ROLES contains only SUPER_ADMIN", () => {
    expect(ADMIN_ROLES).toEqual(["SUPER_ADMIN"]);
  });

  it("MANAGEMENT_ROLES contains SUPER_ADMIN and EDITOR", () => {
    expect(MANAGEMENT_ROLES).toEqual(["SUPER_ADMIN", "EDITOR"]);
  });

  it("CAN_SUBMIT_REVIEW includes editors and senior journalists", () => {
    expect(CAN_SUBMIT_REVIEW).toContain("SUPER_ADMIN");
    expect(CAN_SUBMIT_REVIEW).toContain("EDITOR");
    expect(CAN_SUBMIT_REVIEW).toContain("EDITOR");
    expect(CAN_SUBMIT_REVIEW).toContain("JOURNALIST");
    expect(CAN_SUBMIT_REVIEW).toContain("JOURNALIST");
    expect(CAN_SUBMIT_REVIEW).not.toContain("CONTRIBUTOR");
  });

  it("roleLabelsMap has labels for all roles", () => {
    const allRoles = [...EDITOR_ROLES, ...CREATOR_ROLES];
    for (const role of allRoles) {
      expect(roleLabelsMap[role]).toBeDefined();
      expect(typeof roleLabelsMap[role]).toBe("string");
    }
  });
});
