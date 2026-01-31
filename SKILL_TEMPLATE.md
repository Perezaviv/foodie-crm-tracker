# Skill Creation Template

Standard template for creating new skills in `lib/skills/`.

---

## Directory Structure

```
lib/skills/{domain}/
├── {skill_name}.ts    # Skill implementation
└── index.ts           # Barrel exports
```

**Domain naming:** lowercase, singular (`telegram`, `ai`, `db`, `ui`)

---

## Skill File Template

```typescript
/**
 * Skill: {SkillName}
 * @owner AGENT-{X}
 * @status DRAFT | READY | DEPRECATED
 * @created {YYYY-MM-DD}
 * @dependencies [list skill names or 'none']
 */

// =============================================================================
// TYPES
// =============================================================================

export interface {SkillName}Input {
    // Required inputs
}

export interface {SkillName}Output {
    success: boolean;
    data?: {
        // Output data
    };
    error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * {Brief description of what this skill does}
 * 
 * @example
 * const result = await skillName({ ... });
 */
export async function {skillName}(input: {SkillName}Input): Promise<{SkillName}Output> {
    try {
        // Implementation
        return { success: true, data: { ... } };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}
```

---

## Index.ts Template

```typescript
/**
 * {Domain} Skills Index
 * @owner AGENT-{X}
 */

export { skillName1 } from './skill_name_1';
export type { Skill1Input, Skill1Output } from './skill_name_1';

export { skillName2 } from './skill_name_2';
export type { Skill2Input, Skill2Output } from './skill_name_2';
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Directory | lowercase singular | `telegram` |
| File | snake_case | `send_message.ts` |
| Function | camelCase | `sendMessage` |
| Type/Interface | PascalCase | `SendMessageInput` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |

---

## Checklist Before Marking READY

1. [ ] Types exported for input/output
2. [ ] Error handling with try/catch
3. [ ] JSDoc with @example
4. [ ] Added to domain `index.ts`
5. [ ] Passes `npx tsc --noEmit`
6. [ ] Updated `PROJECT_UPDATE_LOG.md` Skill Registry
