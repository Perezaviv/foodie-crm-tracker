# Code Review Report

Generated: 2026-01-15T06:42:57.737Z

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟡 Warning | 30 |
| 🔵 Info | 72 |

## Static Analysis

✅ No critical issues found

## Type Safety

- Files analyzed: 28
- `any` usage: 0
- Missing return types: 3

## Code Quality

Files analyzed: 28

### Issues

- **app\api\geocode\route.ts** - File has deeply nested code (8 levels)
- **app\api\parse\route.ts:25** - Function 'POST' has 86 lines (threshold: 50)
- **app\api\parse\route.ts** - File has deeply nested code (10 levels)
- **app\api\photos\route.ts:16** - Function 'POST' has 121 lines (threshold: 50)
- **app\api\photos\route.ts:139** - Function 'GET' has 62 lines (threshold: 50)
- **app\api\photos\route.ts:202** - Function 'DELETE' has 58 lines (threshold: 50)
- **app\api\photos\route.ts** - File has deeply nested code (12 levels)
- **app\api\restaurants\route.ts:32** - Function 'POST' has 75 lines (threshold: 50)
- **app\api\restaurants\route.ts:108** - Function 'GET' has 55 lines (threshold: 50)
- **app\api\restaurants\route.ts** - File has deeply nested code (12 levels)
- **app\api\restaurants\[id]\route.ts** - File has deeply nested code (8 levels)
- **app\layout.tsx** - File has deeply nested code (6 levels)
- **app\page.tsx:16** - Function 'Home' has 164 lines (threshold: 50)
- **app\page.tsx:215** - Function 'AddDrawer' has 227 lines (threshold: 50)
- **app\page.tsx** - File has deeply nested code (15 levels)
- **lib\ai\parser.ts:40** - Function 'extractRestaurantInfo' has 74 lines (threshold: 50)
- **lib\ai\parser.ts** - File has deeply nested code (8 levels)
- **lib\ai\search.ts:33** - Function 'searchRestaurant' has 81 lines (threshold: 50)
- **lib\ai\search.ts:118** - Function 'parseSearchResults' has 123 lines (threshold: 50)
- **lib\ai\search.ts** - File has deeply nested code (12 levels)

## Security

- 🟡 **execution\code_reviewer.js:484** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🟡 **execution\code_reviewer.js:485** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🟡 **execution\code_reviewer.js:490** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🔴 **execution\code_reviewer.js:501** - Usage of eval() is dangerous
- 🟡 **reports\code_review_report.json:711** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🟡 **reports\code_review_report.json:718** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🟡 **reports\code_review_report.json:725** - Usage of dangerouslySetInnerHTML (potential XSS)
- 🔴 **reports\code_review_report.json:732** - Usage of eval() is dangerous
