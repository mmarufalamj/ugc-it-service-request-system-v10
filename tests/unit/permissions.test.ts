import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canPerformAction,
  getRoleHierarchy,
  hasHigherPrivilege,
  canManageUser,
  UserRole,
  ResourceType,
  ActionType,
  UserPermissions,
} from '../../src/server/permissions';

describe('Permissions Module', () => {
  describe('hasPermission', () => {
    it('should return true for allowed permission', () => {
      const userPerms: UserPermissions = {
        role: UserRole.OFFICER,
        permissions: ['application:read', 'application:create'],
      };

      expect(hasPermission(userPerms, 'application', 'read')).toBe(true);
      expect(hasPermission(userPerms, 'application', 'create')).toBe(true);
    });

    it('should return false for denied permission', () => {
      const userPerms: UserPermissions = {
        role: UserRole.OFFICER,
        permissions: ['application:read'],
        deniedPermissions: ['application:delete'],
      };

      expect(hasPermission(userPerms, 'application', 'delete')).toBe(false);
    });

    it('should allow explicit extra permissions', () => {
      const userPerms: UserPermissions = {
        role: UserRole.OFFICER,
        permissions: ['application:read'],
        extraPermissions: ['application:delete'],
      };

      expect(hasPermission(userPerms, 'application', 'delete')).toBe(true);
    });

    it('should deny if in denied list even with extra permissions', () => {
      const userPerms: UserPermissions = {
        role: UserRole.OFFICER,
        permissions: ['application:read'],
        deniedPermissions: ['application:delete'],
        extraPermissions: ['application:delete'],
      };

      expect(hasPermission(userPerms, 'application', 'delete')).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should allow super admin all actions', () => {
      expect(canPerformAction(UserRole.SUPER_ADMIN, ResourceType.SETTINGS, ActionType.UPDATE)).toBe(true);
      expect(canPerformAction(UserRole.SUPER_ADMIN, ResourceType.USER, ActionType.DELETE)).toBe(true);
    });

    it('should check user permissions if provided', () => {
      const userPerms: UserPermissions = {
        role: UserRole.OFFICER,
        permissions: ['application:read'],
      };

      expect(canPerformAction(UserRole.OFFICER, ResourceType.APPLICATION, ActionType.READ, userPerms)).toBe(true);
      expect(canPerformAction(UserRole.OFFICER, ResourceType.SETTINGS, ActionType.UPDATE, userPerms)).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return roles in correct order', () => {
      const hierarchy = getRoleHierarchy();
      expect(hierarchy[0]).toBe(UserRole.SUPER_ADMIN);
      expect(hierarchy[hierarchy.length - 1]).toBe(UserRole.APPLICANT);
    });
  });

  describe('hasHigherPrivilege', () => {
    it('should identify higher privilege correctly', () => {
      expect(hasHigherPrivilege(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasHigherPrivilege(UserRole.ADMIN, UserRole.OFFICER)).toBe(true);
      expect(hasHigherPrivilege(UserRole.OFFICER, UserRole.ADMIN)).toBe(false);
    });

    it('should return false for invalid roles', () => {
      expect(hasHigherPrivilege('invalid', UserRole.ADMIN)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should allow super admin to manage all users', () => {
      expect(canManageUser(UserRole.SUPER_ADMIN, UserRole.OFFICER)).toBe(true);
      expect(canManageUser(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
    });

    it('should not allow non-super admin to manage users', () => {
      expect(canManageUser(UserRole.ADMIN, UserRole.OFFICER)).toBe(false);
      expect(canManageUser(UserRole.OFFICER, UserRole.APPLICANT)).toBe(false);
    });
  });
});
