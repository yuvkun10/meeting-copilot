# Dependency readiness

Dependencies are checked at the workspace root with `npm outdated --workspaces --long` and `npm audit --audit-level=moderate`. CI runs both checks after `npm ci`, and Dependabot is configured for npm workspace manifests plus GitHub Actions.

- `npm run audit`: run `npm audit --audit-level=moderate`.
- `npm run outdated`: run `npm outdated --workspaces --long`.
