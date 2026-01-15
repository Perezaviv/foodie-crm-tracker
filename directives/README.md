# Directives

This folder contains Standard Operating Procedures (SOPs) written in Markdown.

Each directive defines:
- **Goals**: What the directive aims to accomplish
- **Inputs**: What data/parameters are needed
- **Tools/Scripts**: Which execution scripts to use
- **Outputs**: Expected results
- **Edge Cases**: Known issues and how to handle them

## Available Directives

| Directive | Description |
|-----------|-------------|
| [`telegram_listener.md`](telegram_listener.md) | Listen for Telegram bot messages to add restaurants |
| [`code_reviewer.md`](code_reviewer.md) | Comprehensive code quality analysis agent |
| [`code_organizer.md`](code_organizer.md) | Codebase cleanup and production readiness agent |

## Creating New Directives

When creating a new directive, follow this template:

```markdown
# [Directive Name]

## Goal
[What this directive accomplishes]

## Inputs
- [Input 1]: [Description]
- [Input 2]: [Description]

## Execution
1. [Step 1]
2. [Step 2]

## Outputs
- [Expected output]

## Edge Cases
- [Known issue]: [How to handle]
```
