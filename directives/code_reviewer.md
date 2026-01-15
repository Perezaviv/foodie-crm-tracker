# Code Reviewer Agent

## Goal
Perform comprehensive code reviews across the entire codebase to identify opportunities for:
- Making code more generic and reusable
- Improving readability and maintainability
- Optimizing performance
- Strengthening type safety
- Increasing test coverage

## Prerequisites
- Node.js installed
- Project dependencies installed (`npm install`)
- ESLint and TypeScript configured

## Inputs
- **Target directories** (default: `app/`, `lib/`, `components/`, `hooks/`)
- **Focus areas** (optional): `all`, `types`, `performance`, `tests`, `security`
- **Output format**: `markdown`, `json`, or `both`

## Tools/Scripts
- `execution/code_reviewer.js` - Main orchestrator
- `execution/analyze_types.js` - TypeScript analysis
- `execution/analyze_complexity.js` - Complexity metrics
- `execution/analyze_coverage.js` - Test coverage gaps

## Execution Steps

### 1. Static Analysis
Run ESLint with strict rules to catch code quality issues:
```bash
node execution/code_reviewer.js --check static
```

This will:
- Run ESLint with `--format json` for parseable output
- Run TypeScript compiler with `--noEmit --strict`
- Check for unused exports and variables
- Identify inconsistent formatting

### 2. Code Quality Analysis
Measure code complexity and identify maintainability issues:
```bash
node execution/code_reviewer.js --check quality
```

This will:
- Calculate cyclomatic complexity per function (threshold: 10)
- Identify functions exceeding 50 lines
- Find duplicate code blocks (>10 lines)
- Check naming convention adherence

### 3. Type Safety Audit
Analyze TypeScript usage for type safety improvements:
```bash
node execution/code_reviewer.js --check types
```

This will:
- Identify all `any` type usage with file:line references
- Find functions missing return type annotations
- Suggest opportunities for generic types
- Validate interface/type definitions completeness

### 4. Test Coverage Analysis
Evaluate test coverage and identify gaps:
```bash
node execution/code_reviewer.js --check coverage
```

This will:
- Generate Jest coverage report
- Identify files with <80% coverage
- Find untested functions and edge cases
- Evaluate test quality (assertions per test)

### 5. Performance Audit
Identify potential performance issues:
```bash
node execution/code_reviewer.js --check performance
```

This will:
- Find potential memory leaks (unclosed resources)
- Identify expensive React re-renders
- Check for proper memoization (useMemo, useCallback)
- Review API call patterns (caching, batching)

### 6. Security Review
Check for common security vulnerabilities:
```bash
node execution/code_reviewer.js --check security
```

This will:
- Scan for hardcoded secrets/API keys
- Validate input sanitization
- Check authentication/authorization patterns
- Identify potential XSS vulnerabilities

### Full Review
Run all checks at once:
```bash
node execution/code_reviewer.js --all
```

## Outputs
- `reports/code_review_report.md` - Comprehensive findings with examples
- `reports/code_review_summary.json` - Machine-readable summary
- `reports/code_review_priority.md` - Prioritized action items

## Severity Levels
- **Critical**: Security issues, runtime errors, data loss risks
- **Warning**: Performance issues, type safety gaps, maintainability concerns
- **Info**: Style suggestions, minor improvements, documentation gaps

## Edge Cases
- **Very large files (>1000 lines)**: Split analysis, flag for refactoring
- **Generated files**: Skip analysis (e.g., `*.generated.ts`)
- **Test files**: Apply separate rules (allow mocks, flexible types)
- **Third-party integrations**: Flag but don't enforce strict rules

## Thresholds (Configurable)
```javascript
const THRESHOLDS = {
  maxCyclomaticComplexity: 10,
  maxFunctionLines: 50,
  maxFileLines: 500,
  minTestCoverage: 80,
  maxAnyUsage: 0,
  duplicateBlockLines: 10
};
```

## Learnings
- (Add learnings here as the system evolves)
- Example: "React Server Components don't support useEffect - skip memoization checks"
