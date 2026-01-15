# Code Organizer Agent

## Goal
Prepare the codebase for production by:
- Removing unused files, dependencies, and code
- Organizing file structure according to conventions
- Cleaning development artifacts
- Validating production configuration

## Prerequisites
- Node.js installed
- Project dependencies installed (`npm install`)
- Git repository initialized (for safe operations)

## Inputs
- **Mode**: `audit` (read-only analysis) or `clean` (make changes with approval)
- **Target scope** (default: entire repository)
- **Exclusions**: Patterns to skip (e.g., `node_modules`, `.git`)

## Tools/Scripts
- `execution/code_organizer.js` - Main orchestrator
- `execution/find_dead_code.js` - Unused code detection
- `execution/audit_dependencies.js` - Package analysis
- `execution/validate_structure.js` - File organization
- `execution/cleanup_dev_artifacts.js` - Development cleanup

## Execution Steps

### 1. Dead Code Detection
Find code that is never executed or referenced:
```bash
node execution/code_organizer.js --check dead-code
```

This will:
- Find unused exports (functions, classes, constants)
- Identify orphaned files (not imported anywhere)
- Detect commented-out code blocks (>5 lines)
- Flag unresolved TODO/FIXME comments

### 2. Dependency Audit
Analyze npm dependencies for cleanup opportunities:
```bash
node execution/code_organizer.js --check dependencies
```

This will:
- List unused npm dependencies
- Identify devDependencies that shouldn't be in production
- Find outdated packages with security vulnerabilities
- Check for duplicate/overlapping dependencies

### 3. File Structure Validation
Ensure consistent organization:
```bash
node execution/code_organizer.js --check structure
```

This will:
- Verify naming conventions (components: PascalCase, utils: camelCase)
- Check proper directory organization
- Identify misplaced files (e.g., components in lib/)
- Validate index files for proper exports

### 4. Development Artifacts Cleanup
Remove development-only code:
```bash
node execution/code_organizer.js --check artifacts
```

This will:
- Find console.log/console.debug statements
- Identify debug-only code blocks
- Check for development-only files (e.g., `*.test.local.ts`)
- Validate .env.example completeness

### 5. Production Configuration Audit
Verify production readiness:
```bash
node execution/code_organizer.js --check production
```

This will:
- Verify build optimization settings (next.config.ts)
- Check environment variable handling
- Validate security headers configuration
- Review error handling and logging

### 6. Documentation Cleanup
Ensure documentation is current:
```bash
node execution/code_organizer.js --check docs
```

This will:
- Identify outdated documentation
- Check for broken internal links
- Verify README accuracy against current state
- Clean up stale inline comments

### Full Audit
Run all checks in audit mode:
```bash
node execution/code_organizer.js --audit
```

### Execute Cleanup
Run cleanup with user approval for each action:
```bash
node execution/code_organizer.js --clean --interactive
```

## Outputs
- `reports/organizer_audit.md` - Complete audit findings
- `reports/cleanup_actions.md` - Proposed deletions/changes
- `reports/dependency_audit.md` - Package analysis details
- `reports/cleanup_log.md` - Record of executed changes

## Safety Rules

> [!CRITICAL]
> These rules MUST be followed without exception:

1. **NEVER delete files without explicit user confirmation**
2. **Create backup references** before any cleanup (list in report)
3. **Verify tests pass** after any deletion
4. **Keep git history clean** (proper commit messages per change)
5. **Skip dynamically imported files** unless manually verified
6. **Preserve all configuration files** even if not directly imported
7. **Double-check before removing** anything in `app/api/` or `lib/`

## File Categories

### Safe to Clean (with confirmation)
- Orphaned components not imported anywhere
- Unused utility functions
- Stale test files for deleted features
- Development-only scripts

### Require Extra Caution
- API routes (may be called externally)
- Database migrations/schemas
- Environment configuration
- CI/CD configuration

### Never Auto-Delete
- `.env*` files
- `package.json`, `package-lock.json`
- `*.config.*` files
- `supabase/` directory
- Git hooks and workflows

## Expected File Structure
```
burnt-on-food/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components (PascalCase)
├── hooks/                 # Custom React hooks (use*.ts)
├── lib/                   # Utilities and services
│   ├── ai/               # AI-related functionality
│   └── *.ts              # Utility modules
├── __tests__/            # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── directives/           # Agent SOPs
├── execution/            # Deterministic scripts
├── public/               # Static assets
├── supabase/             # Database schemas
└── reports/              # Generated reports
```

## Cleanup Workflow

1. Run `--audit` to generate findings
2. Review `reports/cleanup_actions.md`
3. Approve/reject each proposed action
4. Run `--clean --interactive` for approved items
5. Run full test suite
6. Commit with descriptive message

## Learnings
- (Add learnings here as the system evolves)
- Example: "Telegram webhook routes are called externally - preserve even if unused in codebase"
