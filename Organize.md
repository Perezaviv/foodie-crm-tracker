# Code Organization Plan

This document outlines the two specialized agent roles for bringing the codebase to production-level quality.

## Overview

We have implemented a 3-layer architecture with two new agent directives:

1. **Code Reviewer Agent** - Analyzes code quality, optimization, and best practices
2. **Organizer Agent** - Cleans up and prepares the codebase for production

## Quick Start

### Run Code Review
```bash
# Full review
node execution/code_reviewer.js --all

# Specific checks
node execution/code_reviewer.js --check types     # Type safety audit
node execution/code_reviewer.js --check coverage  # Test coverage
node execution/code_reviewer.js --check security  # Security review
```

### Run Organization Audit
```bash
# Full audit (read-only)
node execution/code_organizer.js --audit

# Specific checks
node execution/code_organizer.js --check dead-code     # Find unused files
node execution/code_organizer.js --check dependencies  # Audit npm packages
node execution/code_organizer.js --check artifacts     # Find console.logs
```

## Agent Details

### Code Reviewer Agent

**Directive**: [`directives/code_reviewer.md`](directives/code_reviewer.md)

**Execution Scripts**:
- `execution/code_reviewer.js` - Main orchestrator

**Checks Available**:
| Check | Description |
|-------|-------------|
| `static` | ESLint + TypeScript strict analysis |
| `quality` | Complexity, function length, nesting |
| `types` | `any` usage, missing return types |
| `coverage` | Jest test coverage gaps |
| `performance` | Memoization, re-render issues |
| `security` | Hardcoded secrets, XSS risks |

**Output**: `reports/code_review_report.md`

---

### Organizer Agent

**Directive**: [`directives/code_organizer.md`](directives/code_organizer.md)

**Execution Scripts**:
- `execution/code_organizer.js` - Main orchestrator

**Checks Available**:
| Check | Description |
|-------|-------------|
| `dead-code` | Unused exports, orphaned files, commented code |
| `dependencies` | Unused packages, security vulnerabilities |
| `structure` | Naming conventions, file placement |
| `artifacts` | console.log, debugger statements |
| `production` | Config validation, build scripts |

**Output**: 
- `reports/organizer_audit.md`
- `reports/cleanup_actions.md`

---

## Safety Rules

> ⚠️ **Important**: The Organizer Agent will NEVER delete files without explicit user confirmation.

Protected files (never auto-deleted):
- `.env*`, `package.json`, `package-lock.json`
- All `*.config.*` files
- `supabase/` directory
- `.gitignore`, `README.md`

## Workflow

### 1. Initial Audit
```bash
# Run both agents in audit mode
node execution/code_reviewer.js --all
node execution/code_organizer.js --audit
```

### 2. Review Reports
Check the generated reports in `/reports`:
- `code_review_report.md` - Code quality findings
- `organizer_audit.md` - Cleanup findings
- `cleanup_actions.md` - Proposed action items

### 3. Address Issues
Work through the findings:
- Fix critical issues first (security, type errors)
- Address warnings (any usage, complexity)
- Clean up artifacts (console.logs, dead code)

### 4. Verify
```bash
# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

## Reports Directory

All agent outputs are saved to `/reports`:
```
reports/
├── code_review_report.md    # Code quality findings
├── code_review_report.json  # Machine-readable format
├── organizer_audit.md       # Organization findings
├── organizer_audit.json     # Machine-readable format
└── cleanup_actions.md       # Proposed cleanup actions
```

## Thresholds (Configurable)

### Code Reviewer
```javascript
{
  maxCyclomaticComplexity: 10,  // Per function
  maxFunctionLines: 50,         // Lines per function
  maxFileLines: 500,            // Lines per file
  minTestCoverage: 80,          // Percentage
  maxAnyUsage: 0                // Target: zero
}
```

### Organizer
```javascript
{
  minCommentedLinesForFlag: 5,  // Consecutive commented lines
  orphanConfidenceThreshold: 0.9 // Before flagging as unused
}
```

## Extending the Agents

To add new checks:

1. Add the check function to the execution script
2. Update the directive with documentation
3. Add to the available checks list
4. Test with a small scope first

## Learnings Log

Add learnings here as the system evolves:

- _Example: "React Server Components don't support useEffect"_
- _Example: "Telegram webhook routes are called externally"_
