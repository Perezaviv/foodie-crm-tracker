#!/usr/bin/env node
/**
 * Code Organizer - Main Orchestrator
 * 
 * Audits and cleans the codebase for production readiness.
 * 
 * Usage:
 *   node execution/code_organizer.js --audit           # Run all audits (read-only)
 *   node execution/code_organizer.js --check dead-code # Run specific check
 *   node execution/code_organizer.js --clean           # Execute cleanup (interactive)
 *   node execution/code_organizer.js --help            # Show help
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
    targetDirs: ['app', 'lib', 'components', 'hooks', 'execution', 'directives'],
    excludePatterns: ['node_modules', '.next', '.git', 'coverage', 'test-results', 'playwright-report'],
    outputDir: 'reports',
    neverDelete: [
        '.env', '.env.local', '.env.example',
        'package.json', 'package-lock.json',
        'tsconfig.json', 'next.config.ts', 'jest.config.js', 'playwright.config.ts',
        'eslint.config.mjs', 'postcss.config.mjs',
        '.gitignore', 'README.md'
    ],
    protectedDirs: ['supabase', '.git', 'node_modules', 'public']
};

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), CONFIG.outputDir);
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    audit: args.includes('--audit'),
    check: args.includes('--check') ? args[args.indexOf('--check') + 1] : null,
    clean: args.includes('--clean'),
    interactive: args.includes('--interactive') || args.includes('-i'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v')
};

if (flags.help) {
    console.log(`
Code Organizer - Codebase Cleanup and Organization Tool

Usage:
  node execution/code_organizer.js [options]

Options:
  --audit            Run all audits in read-only mode
  --check <type>     Run specific audit:
                       dead-code     - Find unused exports and files
                       dependencies  - Audit npm packages
                       structure     - Validate file organization
                       artifacts     - Find dev-only code
                       production    - Check production config
                       docs          - Validate documentation
  --clean            Execute cleanup actions
  --interactive, -i  Prompt before each action
  --verbose, -v      Show detailed output
  --help, -h         Show this help message

Examples:
  node execution/code_organizer.js --audit
  node execution/code_organizer.js --check dead-code
  node execution/code_organizer.js --clean --interactive

Safety:
  - --audit mode is always read-only
  - --clean requires explicit confirmation for each deletion
  - Protected files/directories are never modified
`);
    process.exit(0);
}

// Report structure
const report = {
    timestamp: new Date().toISOString(),
    mode: flags.clean ? 'clean' : 'audit',
    summary: {
        filesScanned: 0,
        issuesFound: 0,
        actionsProposed: 0,
        actionsExecuted: 0
    },
    audits: {},
    proposedActions: []
};

/**
 * Find dead/unused code
 */
async function findDeadCode() {
    console.log('\n🔍 Finding Dead Code...\n');
    const issues = [];

    // Build import graph
    const importGraph = new Map();
    const exportGraph = new Map();
    const allFiles = [];

    for (const dir of CONFIG.targetDirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            findFiles(dirPath, allFiles);
        }
    }

    console.log(`  Scanning ${allFiles.length} files...`);

    // First pass: collect all exports
    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const exports = [];

        // Find named exports
        const exportMatches = content.matchAll(/export\s+(?:const|let|var|function|class|type|interface)\s+(\w+)/g);
        for (const match of exportMatches) {
            exports.push(match[1]);
        }

        // Find default exports
        if (content.includes('export default')) {
            exports.push('default');
        }

        exportGraph.set(relativePath, exports);
    }

    // Second pass: collect all imports
    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const imports = [];

        // Find import statements
        const importMatches = content.matchAll(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
            const imported = match[1] || match[2];
            const from = match[3];
            imports.push({ imported, from });
        }

        importGraph.set(relativePath, imports);
    }

    // Find orphaned files (not imported by anyone)
    const importedFiles = new Set();
    for (const [file, imports] of importGraph) {
        for (const imp of imports) {
            if (imp.from.startsWith('.') || imp.from.startsWith('@/')) {
                // Resolve relative import
                const baseDir = path.dirname(file);
                let resolved = imp.from.replace('@/', '');
                if (imp.from.startsWith('.')) {
                    resolved = path.join(baseDir, imp.from);
                }
                // Try with extensions
                for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
                    const withExt = resolved + ext;
                    if (allFiles.some(f => path.relative(process.cwd(), f) === withExt || path.relative(process.cwd(), f).replace(/\\/g, '/') === withExt)) {
                        importedFiles.add(withExt);
                    }
                }
            }
        }
    }

    // Check for orphaned files
    for (const file of allFiles) {
        const relativePath = path.relative(process.cwd(), file);

        // Skip entry points
        if (relativePath.includes('page.tsx') ||
            relativePath.includes('layout.tsx') ||
            relativePath.includes('route.ts') ||
            relativePath.includes('index.ts') ||
            relativePath.includes('config')) {
            continue;
        }

        // Skip tests
        if (relativePath.includes('__tests__') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
            continue;
        }

        // Check if file is imported
        const isImported = Array.from(importedFiles).some(imp =>
            imp.includes(path.basename(file, path.extname(file)))
        );

        if (!isImported) {
            // Double check with grep
            const basename = path.basename(file, path.extname(file));
            try {
                execSync(`grep -r "${basename}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | grep -v "${relativePath}"`, {
                    encoding: 'utf-8',
                    stdio: 'pipe'
                });
            } catch (e) {
                // No references found
                issues.push({
                    type: 'orphaned-file',
                    file: relativePath,
                    message: 'File appears to be unused (no imports found)',
                    action: 'review-for-deletion'
                });
            }
        }
    }

    // Find commented-out code blocks
    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const lines = content.split('\n');

        let commentBlock = [];
        let blockStart = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') && line.length > 5) {
                if (blockStart === -1) blockStart = i;
                commentBlock.push(line);
            } else {
                if (commentBlock.length >= 5) {
                    issues.push({
                        type: 'commented-code',
                        file: relativePath,
                        line: blockStart + 1,
                        message: `Commented-out code block (${commentBlock.length} lines)`,
                        action: 'review-for-removal'
                    });
                }
                commentBlock = [];
                blockStart = -1;
            }
        }
    }

    // Find TODO/FIXME
    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/\b(TODO|FIXME|HACK|XXX)\b/i)) {
                issues.push({
                    type: 'unresolved-todo',
                    file: relativePath,
                    line: i + 1,
                    message: lines[i].trim().substring(0, 100),
                    action: 'resolve-or-remove'
                });
            }
        }
    }

    console.log(`  Found ${issues.length} potential issues`);

    report.audits.deadCode = {
        filesScanned: allFiles.length,
        issues: issues
    };

    report.summary.issuesFound += issues.length;
}

/**
 * Audit npm dependencies
 */
async function auditDependencies() {
    console.log('\n📦 Auditing Dependencies...\n');
    const issues = [];

    // Check for unused dependencies using depcheck (if available)
    console.log('  Checking for unused dependencies...');

    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});

    // Simple usage check - grep for package name
    for (const dep of deps) {
        const safeDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            execSync(`grep -r "${safeDep}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" app lib components hooks 2>/dev/null`, {
                encoding: 'utf-8',
                stdio: 'pipe'
            });
        } catch (e) {
            // Check if it's used in config files
            try {
                execSync(`grep -r "${safeDep}" *.config.* package.json 2>/dev/null`, {
                    encoding: 'utf-8',
                    stdio: 'pipe'
                });
            } catch (e2) {
                issues.push({
                    type: 'unused-dependency',
                    package: dep,
                    message: `Dependency appears unused in source files`,
                    action: 'verify-and-remove'
                });
            }
        }
    }

    // Run npm audit
    console.log('  Running npm audit...');
    try {
        execSync('npm audit --json 2>/dev/null', { encoding: 'utf-8' });
        console.log('  ✅ No security vulnerabilities found');
    } catch (e) {
        try {
            const auditResult = JSON.parse(e.stdout || '{}');
            if (auditResult.metadata) {
                const vulns = auditResult.metadata.vulnerabilities;
                if (vulns.high > 0 || vulns.critical > 0) {
                    issues.push({
                        type: 'security-vulnerability',
                        message: `${vulns.critical} critical, ${vulns.high} high severity vulnerabilities`,
                        action: 'run-npm-audit-fix'
                    });
                }
            }
        } catch (parseError) {
            // Ignore parse errors
        }
    }

    console.log(`  Found ${issues.length} dependency issues`);

    report.audits.dependencies = {
        totalDependencies: deps.length,
        totalDevDependencies: devDeps.length,
        issues: issues
    };

    report.summary.issuesFound += issues.length;
}

/**
 * Validate file structure
 */
async function validateStructure() {
    console.log('\n📁 Validating File Structure...\n');
    const issues = [];

    // Check component naming (should be PascalCase)
    const componentsDir = path.join(process.cwd(), 'components');
    if (fs.existsSync(componentsDir)) {
        const files = fs.readdirSync(componentsDir);
        for (const file of files) {
            if (file.endsWith('.tsx') && !file.match(/^[A-Z]/)) {
                issues.push({
                    type: 'naming-convention',
                    file: `components/${file}`,
                    message: 'Component file should use PascalCase',
                    action: 'rename'
                });
            }
        }
    }

    // Check for index files
    for (const dir of ['components', 'hooks', 'lib']) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            const indexPath = path.join(dirPath, 'index.ts');
            if (!fs.existsSync(indexPath)) {
                issues.push({
                    type: 'missing-index',
                    file: `${dir}/index.ts`,
                    message: 'Directory missing index file for exports',
                    action: 'create'
                });
            }
        }
    }

    // Check for misplaced files
    const allFiles = [];
    findFiles(process.cwd(), allFiles);

    for (const file of allFiles) {
        const relativePath = path.relative(process.cwd(), file);

        // Components outside components dir
        if (relativePath.match(/^lib\/.*\.tsx$/) && !relativePath.includes('test')) {
            issues.push({
                type: 'misplaced-file',
                file: relativePath,
                message: 'React component (.tsx) in lib/ should be in components/',
                action: 'move'
            });
        }
    }

    console.log(`  Found ${issues.length} structure issues`);

    report.audits.structure = {
        issues: issues
    };

    report.summary.issuesFound += issues.length;
}

/**
 * Find development artifacts
 */
async function findDevArtifacts() {
    console.log('\n🧹 Finding Development Artifacts...\n');
    const issues = [];

    const allFiles = [];
    for (const dir of CONFIG.targetDirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            findFiles(dirPath, allFiles);
        }
    }

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);
        const lines = content.split('\n');

        // Skip test files
        if (relativePath.includes('.test.') || relativePath.includes('.spec.') || relativePath.includes('__tests__')) {
            continue;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // console.log statements (but not in execution scripts)
            if (line.match(/console\.(log|debug|info)\s*\(/) && !relativePath.includes('execution/')) {
                issues.push({
                    type: 'console-log',
                    file: relativePath,
                    line: i + 1,
                    message: 'console.log statement (consider removing for production)',
                    action: 'remove-or-replace-with-logger'
                });
            }

            // debugger statements
            if (line.match(/\bdebugger\b/)) {
                issues.push({
                    type: 'debugger',
                    file: relativePath,
                    line: i + 1,
                    message: 'debugger statement found',
                    action: 'remove'
                });
            }
        }
    }

    // Check .env.example completeness
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    if (fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        const envVars = fs.readFileSync(envPath, 'utf-8').match(/^[A-Z_]+=?/gm) || [];
        const exampleVars = fs.readFileSync(envExamplePath, 'utf-8').match(/^[A-Z_]+=?/gm) || [];

        for (const v of envVars) {
            const varName = v.replace('=', '');
            if (!exampleVars.some(ev => ev.includes(varName))) {
                issues.push({
                    type: 'missing-env-example',
                    file: '.env.example',
                    message: `Missing ${varName} in .env.example`,
                    action: 'add-to-example'
                });
            }
        }
    }

    console.log(`  Found ${issues.length} development artifacts`);

    report.audits.artifacts = {
        issues: issues
    };

    report.summary.issuesFound += issues.length;
}

/**
 * Check production configuration
 */
async function checkProductionConfig() {
    console.log('\n⚙️ Checking Production Configuration...\n');
    const issues = [];

    // Check next.config.ts
    const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
        const content = fs.readFileSync(nextConfigPath, 'utf-8');

        if (!content.includes('reactStrictMode')) {
            issues.push({
                type: 'config',
                file: 'next.config.ts',
                message: 'Consider enabling reactStrictMode for production',
                action: 'add-config'
            });
        }
    }

    // Check package.json scripts
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

    if (!packageJson.scripts.build) {
        issues.push({
            type: 'config',
            file: 'package.json',
            message: 'Missing build script',
            action: 'add-script'
        });
    }

    if (!packageJson.scripts.lint) {
        issues.push({
            type: 'config',
            file: 'package.json',
            message: 'Missing lint script',
            action: 'add-script'
        });
    }

    console.log(`  Found ${issues.length} configuration issues`);

    report.audits.production = {
        issues: issues
    };

    report.summary.issuesFound += issues.length;
}

/**
 * Helper: Find files recursively
 */
function findFiles(dir, result, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!CONFIG.excludePatterns.some(p => entry.name === p || fullPath.includes(p))) {
                    findFiles(fullPath, result, extensions);
                }
            } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                result.push(fullPath);
            }
        }
    } catch (e) {
        // Ignore permission errors
    }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
    const lines = [
        '# Code Organizer Audit Report',
        '',
        `Generated: ${report.timestamp}`,
        `Mode: ${report.mode}`,
        '',
        '## Summary',
        '',
        `- Files Scanned: ${report.summary.filesScanned}`,
        `- Issues Found: ${report.summary.issuesFound}`,
        ''
    ];

    // Dead Code
    if (report.audits.deadCode) {
        lines.push('## Dead Code');
        lines.push('');
        lines.push(`Files scanned: ${report.audits.deadCode.filesScanned}`);
        lines.push('');

        const orphaned = report.audits.deadCode.issues.filter(i => i.type === 'orphaned-file');
        const commented = report.audits.deadCode.issues.filter(i => i.type === 'commented-code');
        const todos = report.audits.deadCode.issues.filter(i => i.type === 'unresolved-todo');

        if (orphaned.length > 0) {
            lines.push('### Potentially Unused Files');
            lines.push('');
            for (const issue of orphaned) {
                lines.push(`- [ ] \`${issue.file}\``);
            }
            lines.push('');
        }

        if (commented.length > 0) {
            lines.push('### Commented-Out Code');
            lines.push('');
            for (const issue of commented) {
                lines.push(`- \`${issue.file}:${issue.line}\` - ${issue.message}`);
            }
            lines.push('');
        }

        if (todos.length > 0) {
            lines.push('### Unresolved TODOs/FIXMEs');
            lines.push('');
            for (const issue of todos.slice(0, 20)) {
                lines.push(`- \`${issue.file}:${issue.line}\``);
            }
            if (todos.length > 20) {
                lines.push(`- ... and ${todos.length - 20} more`);
            }
            lines.push('');
        }
    }

    // Dependencies
    if (report.audits.dependencies) {
        lines.push('## Dependencies');
        lines.push('');
        lines.push(`- Production: ${report.audits.dependencies.totalDependencies}`);
        lines.push(`- Development: ${report.audits.dependencies.totalDevDependencies}`);
        lines.push('');

        if (report.audits.dependencies.issues.length > 0) {
            lines.push('### Issues');
            lines.push('');
            for (const issue of report.audits.dependencies.issues) {
                if (issue.package) {
                    lines.push(`- [ ] \`${issue.package}\` - ${issue.message}`);
                } else {
                    lines.push(`- ⚠️ ${issue.message}`);
                }
            }
            lines.push('');
        }
    }

    // Structure
    if (report.audits.structure && report.audits.structure.issues.length > 0) {
        lines.push('## File Structure');
        lines.push('');
        for (const issue of report.audits.structure.issues) {
            lines.push(`- \`${issue.file}\` - ${issue.message}`);
        }
        lines.push('');
    }

    // Artifacts
    if (report.audits.artifacts && report.audits.artifacts.issues.length > 0) {
        lines.push('## Development Artifacts');
        lines.push('');

        const consoleLogs = report.audits.artifacts.issues.filter(i => i.type === 'console-log');
        if (consoleLogs.length > 0) {
            lines.push(`### Console Statements (${consoleLogs.length})`);
            lines.push('');
            for (const issue of consoleLogs.slice(0, 10)) {
                lines.push(`- \`${issue.file}:${issue.line}\``);
            }
            if (consoleLogs.length > 10) {
                lines.push(`- ... and ${consoleLogs.length - 10} more`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Generate action items
 */
function generateActionItems() {
    const lines = [
        '# Cleanup Actions',
        '',
        `Generated: ${report.timestamp}`,
        '',
        '> ⚠️ Review each action carefully before approving.',
        '',
        '## Proposed Actions',
        ''
    ];

    let actionNum = 1;

    // Collect all issues with actions
    for (const [auditName, audit] of Object.entries(report.audits)) {
        if (audit.issues) {
            for (const issue of audit.issues) {
                if (issue.action && issue.action !== 'none') {
                    lines.push(`### ${actionNum}. ${issue.type}`);
                    lines.push('');
                    lines.push(`- **File**: \`${issue.file || issue.package || 'N/A'}\``);
                    if (issue.line) lines.push(`- **Line**: ${issue.line}`);
                    lines.push(`- **Issue**: ${issue.message}`);
                    lines.push(`- **Action**: ${issue.action}`);
                    lines.push(`- **Status**: [ ] Pending`);
                    lines.push('');
                    actionNum++;
                }
            }
        }
    }

    report.summary.actionsProposed = actionNum - 1;

    return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                   CODE ORGANIZER AGENT                     ');
    console.log('═══════════════════════════════════════════════════════════');

    const checks = flags.audit
        ? ['dead-code', 'dependencies', 'structure', 'artifacts', 'production']
        : [flags.check];

    if (!flags.audit && !flags.check && !flags.clean) {
        console.log('\nNo action specified. Use --audit, --check <type>, or --clean');
        console.log('Run --help for usage information.\n');
        process.exit(1);
    }

    if (flags.clean) {
        console.log('\n⚠️ Clean mode - will propose changes for review\n');
    }

    for (const check of checks) {
        if (!check) continue;

        switch (check) {
            case 'dead-code':
                await findDeadCode();
                break;
            case 'dependencies':
                await auditDependencies();
                break;
            case 'structure':
                await validateStructure();
                break;
            case 'artifacts':
                await findDevArtifacts();
                break;
            case 'production':
                await checkProductionConfig();
                break;
            default:
                console.log(`Unknown check: ${check}`);
        }
    }

    // Update summary
    let totalFiles = 0;
    for (const audit of Object.values(report.audits)) {
        if (audit.filesScanned) totalFiles += audit.filesScanned;
    }
    report.summary.filesScanned = totalFiles;

    // Generate reports
    console.log('\n📝 Generating Reports...\n');

    const markdownReport = generateMarkdownReport();
    fs.writeFileSync(path.join(reportsDir, 'organizer_audit.md'), markdownReport);
    console.log(`  ✅ reports/organizer_audit.md`);

    const actionItems = generateActionItems();
    fs.writeFileSync(path.join(reportsDir, 'cleanup_actions.md'), actionItems);
    console.log(`  ✅ reports/cleanup_actions.md`);

    fs.writeFileSync(path.join(reportsDir, 'organizer_audit.json'), JSON.stringify(report, null, 2));
    console.log(`  ✅ reports/organizer_audit.json`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  📁 Files Scanned:    ${report.summary.filesScanned}`);
    console.log(`  🔍 Issues Found:     ${report.summary.issuesFound}`);
    console.log(`  📋 Actions Proposed: ${report.summary.actionsProposed}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nReview the reports in the /reports directory.');
    console.log('Run with --clean --interactive to execute cleanup actions.\n');
}

main().catch(console.error);
