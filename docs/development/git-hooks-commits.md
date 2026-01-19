# Git Hooks & Commits

This guide covers Git conventions and hooks used in the RAG CV Builder project.

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                         | Example                                    |
| ---------- | ----------------------------------- | ------------------------------------------ |
| `feat`     | New feature                         | `feat(user): add profile update endpoint`  |
| `fix`      | Bug fix                             | `fix(auth): resolve token refresh issue`   |
| `docs`     | Documentation changes               | `docs(readme): update installation guide`  |
| `style`    | Code style (formatting, semicolons) | `style: apply prettier formatting`         |
| `update`   | Dependency or minor updates         | `update: upgrade nestjs to v11`            |
| `refactor` | Code refactoring                    | `refactor(user): extract validation logic` |
| `test`     | Adding or updating tests            | `test(user): add unit tests for service`   |
| `chore`    | Maintenance tasks                   | `chore: update gitignore`                  |
| `perf`     | Performance improvements            | `perf(db): add index for user lookup`      |
| `ci`       | CI/CD changes                       | `ci: add github actions workflow`          |
| `build`    | Build system changes                | `build: update dockerfile`                 |
| `revert`   | Reverting previous commit           | `revert: revert feat(user)`                |

### Scope

Optional scope indicating the affected area:

- `auth` - Authentication module
- `user` - User module
- `db` - Database related
- `config` - Configuration changes
- `api` - API endpoints
- `docs` - Documentation

### Examples

```bash
# Feature
git commit -m "feat(user): add user profile update endpoint"

# Bug fix with body
git commit -m "fix(auth): resolve JWT token expiration issue

The token was not being refreshed correctly due to
timezone mismatch in the expiration check.

Closes #123"

# Breaking change (use ! or BREAKING CHANGE footer)
git commit -m "feat(api)!: change response format to JSON:API spec"

# Or with footer
git commit -m "feat(api): change response format

BREAKING CHANGE: Response format now follows JSON:API specification.
All clients need to update their parsers."
```

## Branch Naming

Use descriptive branch names with prefixes:

```
<type>/<description>
```

| Prefix      | Use Case                | Example                     |
| ----------- | ----------------------- | --------------------------- |
| `feature/`  | New features            | `feature/user-profile`      |
| `fix/`      | Bug fixes               | `fix/auth-token-refresh`    |
| `refactor/` | Code refactoring        | `refactor/user-service`     |
| `docs/`     | Documentation           | `docs/api-guide`            |
| `chore/`    | Maintenance             | `chore/update-dependencies` |
| `hotfix/`   | Urgent production fixes | `hotfix/critical-auth-bug`  |

### Examples

```bash
# Create feature branch
git checkout -b feature/user-authentication

# Create fix branch
git checkout -b fix/database-connection-pool

# Create docs branch
git checkout -b docs/setup-guide
```

## Git Workflow

### 1. Start New Work

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature
```

### 2. Make Changes

```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat(module): add new feature"
```

### 3. Push and Create PR

```bash
# Push branch
git push origin feature/my-feature

# Create Pull Request on GitHub/GitLab
```

### 4. After Merge

```bash
# Switch to main
git checkout main
git pull origin main

# Delete local branch
git branch -d feature/my-feature
```

## Pre-commit Hooks (Optional Setup)

You can set up Git hooks to enforce code quality:

### Using Husky

```bash
# Install husky
pnpm add -D husky

# Initialize husky
npx husky init
```

### Pre-commit Hook (lint-staged)

```bash
# Install lint-staged
pnpm add -D lint-staged
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

### Commit Message Hook (commitlint)

```bash
# Install commitlint
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'update',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ],
    ],
  },
};
```

Create `.husky/commit-msg`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

## Best Practices

1. **Atomic commits** - Each commit should represent one logical change
2. **Meaningful messages** - Write clear, descriptive commit messages
3. **Keep commits small** - Easier to review and revert if needed
4. **Test before committing** - Run `pnpm run lint` and `pnpm run test`
5. **Don't commit secrets** - Check `.gitignore` includes `.env`
6. **Squash WIP commits** - Clean up history before merging
