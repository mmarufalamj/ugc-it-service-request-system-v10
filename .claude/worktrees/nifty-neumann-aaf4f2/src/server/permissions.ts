/**
 * User role type
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OFFICER = 'officer',
  DEPARTMENT_HEAD = 'department_head',
  APPLICANT = 'applicant',
}

/**
 * Resource type for permissions
 */
export enum ResourceType {
  APPLICATION = 'application',
  USER = 'user',
  DIVISION = 'division',
  SETTINGS = 'settings',
  REPORTS = 'reports',
  DATA_SHARE = 'data_share',
}

/**
 * Action type for permissions
 */
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  EXPORT = 'export',
}

/**
 * User permission object
 */
export interface UserPermissions {
  role: string;
  permissions: string[];
  deniedPermissions?: string[];
  extraPermissions?: string[];
}

/**
 * Check if user has permission
 */
export const hasPermission = (
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean => {
  const permissionKey = `${resource}:${action}`;

  // Check if explicitly denied
  if (userPermissions.deniedPermissions?.includes(permissionKey)) {
    return false;
  }

  // Check if explicitly allowed via extra permissions
  if (userPermissions.extraPermissions?.includes(permissionKey)) {
    return true;
  }

  // Check role-based permissions
  return userPermissions.permissions.includes(permissionKey);
};

/**
 * Check if user can perform action on resource
 */
export const canPerformAction = (
  userRole: string,
  resource: ResourceType,
  action: ActionType,
  userPermissions?: UserPermissions
): boolean => {
  // Super admin can do anything
  if (userRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (userPermissions) {
    return hasPermission(userPermissions, resource, action);
  }

  // Default permissions by role
  const defaultPermissions: Record<string, Record<string, boolean>> = {
    [UserRole.ADMIN]: {
      [ResourceType.APPLICATION]: true,
      [ResourceType.USER]: true,
      [ResourceType.DIVISION]: true,
      [ResourceType.SETTINGS]: true,
      [ResourceType.REPORTS]: true,
    },
    [UserRole.DEPARTMENT_HEAD]: {
      [ResourceType.APPLICATION]: true,
      [ResourceType.REPORTS]: true,
    },
    [UserRole.OFFICER]: {
      [ResourceType.APPLICATION]: true,
    },
    [UserRole.APPLICANT]: {
      [ResourceType.APPLICATION]: true,
    },
  };

  return defaultPermissions[userRole]?.[resource] || false;
};

/**
 * Get role hierarchy (lower index = higher privilege)
 */
export const getRoleHierarchy = (): UserRole[] => {
  return [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.DEPARTMENT_HEAD,
    UserRole.OFFICER,
    UserRole.APPLICANT,
  ];
};

/**
 * Check if a role has higher privilege than another
 */
export const hasHigherPrivilege = (role1: string, role2: string): boolean => {
  const hierarchy = getRoleHierarchy();
  const index1 = hierarchy.indexOf(role1 as UserRole);
  const index2 = hierarchy.indexOf(role2 as UserRole);

  if (index1 === -1 || index2 === -1) {
    return false;
  }

  return index1 < index2;
};

/**
 * Check if user can manage another user (based on role)
 */
export const canManageUser = (managerRole: string, targetRole: string): boolean => {
  // Super admin can manage anyone
  if (managerRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Others can't manage anyone (simplified for now)
  return false;
};
