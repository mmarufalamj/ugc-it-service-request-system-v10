# API Reference

All API routes are implemented in `server.ts`.

Authentication uses the `ugc_session` cookie. Most routes require either `requireAuth` or `requirePermission(...)`.

## Auth

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/login` | Public | Verify email/password, create session cookie. |
| `GET` | `/api/session` | Authenticated | Return current user. |
| `PUT` | `/api/change-password` | Authenticated | Change own password and clear `must_change_password`. |
| `POST` | `/api/logout` | Authenticated | Delete current session and clear cookie. |

## Divisions

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/divisions` | Authenticated | List divisions. |
| `POST` | `/api/divisions` | `division_management` | Create division. |
| `PUT` | `/api/divisions/:id` | `division_management` | Update division. |
| `DELETE` | `/api/divisions/:id` | `division_management` | Delete division. |

## Users And Roles

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/users` | `user_management` | List users with parsed permissions. |
| `GET` | `/api/officer-directory` | Authenticated | List active officers/providers for assignment UI. |
| `POST` | `/api/users` | `user_management` | Create user. |
| `PUT` | `/api/users/:id` | `user_management` | Update user and optional password. |
| `DELETE` | `/api/users/:id` | `user_management` | Delete user. |
| `GET` | `/api/roles` | `role_management` | List roles. |
| `POST` | `/api/roles` | `role_management` | Create role. |
| `PUT` | `/api/roles/:id` | `role_management` | Update role. |
| `DELETE` | `/api/roles/:id` | `role_management` | Delete role. |

User creation/update accepts `name`, `email`, `password`, `role`, `division`, `status`, `extra_permissions`, and `denied_permissions`.

## System Settings

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/system-settings` | Public/readable | Load app settings used by login and UI. |
| `PUT` | `/api/system-settings` | `settings` | Update system settings. |
| `POST` | `/api/system-settings/upload-quick-link` | `settings` | Upload a quick-link file. |

## Controlled Data Sharing

Admin/settings users can create scoped API clients for external systems. The raw API token is shown once at creation time; only its SHA-256 hash is stored in `data_share_clients`.

### Admin Routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/data-share/clients` | `settings` | List external API clients, scopes, status, and last-used time. |
| `POST` | `/api/data-share/clients` | `settings` | Create a scoped API client and return a one-time token. |
| `PUT` | `/api/data-share/clients/:id/revoke` | `settings` | Revoke an external API client. |
| `GET` | `/api/data-share/logs` | `settings` | List push/pull data sharing activity logs. |

Create payload:

```json
{
  "name": "External reporting app",
  "scopes": ["applications", "divisions"]
}
```

Available scopes:

- `applications`: application request records and applicant contact fields.
- `assignments`: item assignment/provider status records.
- `telephone_directory`: active telephone directory contacts.
- `divisions`: organization division list.
- `reports`: read-only shared Reports page dataset and embeddable report view.

### External Shared Data Routes

External apps authenticate with either header:

```http
Authorization: Bearer ugc_xxx
X-API-Key: ugc_xxx
```

If the external app calls these APIs from browser JavaScript on another origin, configure CORS:

```env
DATA_SHARE_ALLOWED_ORIGINS="http://localhost:5173,https://dashboard.example.gov.bd"
```

Development allows `localhost` and `127.0.0.1` origins automatically. Production only allows origins listed in `DATA_SHARE_ALLOWED_ORIGINS`.

| Method | Route | Required Scope | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/shared-data/meta` | Any active API key | Return client name, allowed scopes, and allowed endpoints. |
| `GET` | `/api/shared-data/dashboard-summary` | `applications` | Return dashboard counts as JSON. |
| `GET` | `/api/shared-data/apps` | `applications` | Return compact dashboard app counts in the standard wrapped JSON format. |
| `GET` | `/api/shared-data/applications` | `applications` | Export up to 1000 application rows. |
| `GET` | `/api/shared-data/assignments` | `assignments` | Export up to 1000 assignment/status rows. |
| `GET` | `/api/shared-data/telephone_directory` | `telephone_directory` | Export active telephone directory rows. |
| `GET` | `/api/shared-data/telephone-directory` | `telephone_directory` | Alias for telephone directory export. |
| `GET` | `/api/shared-data/divisions` | `divisions` | Export division rows. |
| `GET` | `/api/shared-data/reports` | `reports` | Export the dataset used by the shared Reports page. |

Embeddable shared report view:

```text
/shared/reports?token=ugc_xxx
```

Use this URL in an iframe or browser tab when the other app needs the same report page UI with filters. The token must belong to an active API client with the `reports` scope. In production, allow the parent app origin through `DATA_SHARE_ALLOWED_ORIGINS` so the report can be framed.

Dashboard summary response shape:

```json
{
  "success": true,
  "apps": {
    "total": 120,
    "pending": 15,
    "completed": 105,
    "rejected": 0
  },
  "by_status": {
    "Submitted": 5,
    "Done": 105
  }
}
```

`GET /api/shared-data/applications` supports optional query filters:

- `status`: exact application status.
- `since`: minimum `submission_date` value.

Security behavior:

- API tokens are hashed at rest.
- Revoked clients receive `401`.
- Missing scopes receive `403`.
- Successful shared-data requests update `last_used_at`.
- Successful shared-data requests write a `Pull` log with client, endpoint, scope, row count, IP, and user agent.
- API client creation/revocation writes a `Push` log for the API Settings audit view.
- Signature fields, session data, password data, and audit-log internals are not exposed by shared-data routes.

Upload constraints:

- Maximum quick-link upload size: 5 MB.
- Allowed MIME/file types are defined in `ALLOWED_UPLOAD_TYPES`.
- Files are stored under `UPLOAD_DIR/quick-links`.
- Public route: `/quick-links/:fileName`.

## Telephone Directory

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/telephone-directory` | `telephone_directory` | List entries. |
| `POST` | `/api/telephone-directory` | `settings` | Create entry. |
| `PUT` | `/api/telephone-directory/:id` | `settings` | Update entry. |
| `POST` | `/api/telephone-directory/import` | `settings` | Bulk import entries. |
| `DELETE` | `/api/telephone-directory` | `settings` | Delete all entries. |
| `DELETE` | `/api/telephone-directory/:id` | `settings` | Delete one entry. |

## Applications

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/applications` | Authenticated | List applications visible to current user. |
| `POST` | `/api/applications` | `application_form` | Submit new application. |
| `PUT` | `/api/applications/approve` | `received_applications` | Divisional head approves/forwards application. |
| `PUT` | `/api/applications/:id/status` | `assigned_applications` | Desk officer assigns items or provider updates status. |

### `GET /api/applications`

Visibility is calculated by `getVisibleApplicationsForUser`.

Rules:

- `all_applications`: all applications.
- Desk officer with `assigned_applications`: applications whose service type includes the officer category.
- Service provider feature with `assigned_applications`: applications assigned to the provider email.
- Divisional head with `received_applications`: applications in their division.
- `application_history`: own applications.

Optional query:

- `email`: only allowed for own email unless user has `all_applications`.

### `POST /api/applications`

Creates a new application with status `Submitted`.

Important server behavior:

- Uses current authenticated user as applicant.
- Generates `tracking_no`.
- Stores category problem details as JSON.

### `PUT /api/applications/approve`

Divisional head approval.

Important server behavior:

- Non-admin/division-wide users can approve only their own division's submitted applications.
- Writes divisional head signature metadata.

### `PUT /api/applications/:id/status`

This route handles two modes.

Desk officer assignment mode:

- `as_service_provider` is false.
- Requires provider selection unless this is a recognized self-assigned status update.
- Requires at least one selected remaining item.
- Inserts assignment rows into `application_item_assignments`.

Provider/status update mode:

- `as_service_provider` is true, or server detects desk-officer self-assigned status update.
- Current user must be assigned to the item rows, or be the desk officer updating self-assigned work.
- Updates assignment status, service info, provider signature, and provider date.

Self-assignment rule:

- Desk officer can select themselves as provider.
- After no remaining items exist, they can update status without choosing a provider again.

## Profile And Signature

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/api/profile` | `profile` | Update profile fields and signature/pending signature. |
| `GET` | `/api/signature-approvals` | Admin | List pending signature approvals. |
| `PUT` | `/api/signature-approvals/:id` | Admin | Approve/reject pending signature. |

## Reporting And Audit

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/audit-logs` | Admin | List audit logs. |
| `GET` | `/api/stats` | `dashboard` | Dashboard stats scoped by current user permissions. |

## Health And Static Routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthz` | Public | Health check and database reachability. |
| `GET` | `/quick-links/*` | Public | Static quick-link uploaded files. |
| `GET` | `*` | Public | Serves SPA `dist/index.html` in production. |

## Error Model

Most API errors return JSON:

```json
{
  "success": false,
  "message": "Human-readable error"
}
```

Common status codes:

- `400`: invalid request payload.
- `401`: authentication required.
- `403`: missing permission or forbidden workflow action.
- `409`: workflow conflict, such as duplicate item assignment.
- `429`: too many login attempts.
- `503`: maintenance mode or health failure.
