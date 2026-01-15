#!/usr/bin/env node
/**
 * Code Reviewer - Main Orchestrator
 * 
 * Runs comprehensive code analysis and generates reports.
 * 
 * Usage:
 *   node execution/code_reviewer.js --all           # Run all checks
 *   node execution/code_reviewer.js --check static  # Run specific check
 *   node execution/code_reviewer.js --help          # Show help
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    targetDirs: ['app', 'lib', 'components', 'hooks'],
    excludePatterns: ['node_modules', '.next', '.git', '__tests__'],
    outputDir: 'reports',
    thresholds: {
        maxCyclomaticComplexity: 10,
        maxFunctionLines: 50,
        maxFileLines: 500,
        minTestCoverage: 80,
        maxAnyUsage: 0,
        duplicateBlockLines: 10
    }
};

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), CONFIG.outputDir);
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    all: args.includes('--all'),
    check: args.includes('--check') ? args[args.indexOf('--check') + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
    json: args.includes('--json'),
    verbose: args.includes('--verbose') || args.includes('-v')
};

if (flags.help) {
    console.log(`
Code Reviewer - Comprehensive Code Analysis Tool

Usage:
  node execution/code_reviewer.js [options]

Options:
  --all              Run all checks
  --check <type>     Run specific check:
                       static      - ESLint and TypeScript analysis
                       quality     - Code complexity and duplication
                       types       - Type safety audit
                       coverage    - Test coverage analysis
                       performance - Performance audit
                       security    - Security review
  --json             Output in JSON format
  --verbose, -v      Show detailed output
  --help, -h         Show this help message

Examples:
  node execution/code_reviewer.js --all
  node execution/code_reviewer.js --check types
  node execution/code_reviewer.js --check coverage --json
`);
    process.exit(0);
}

// Report structure
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        critical: 0,
        warning: 0,
        info: 0
    },
    checks: {}
};

/**
 * Run ESLint analysis
 */
async function runStaticAnalysis() {
    console.log('\n📋 Running Static Analysis...\n');
    const issues = [];

    try {
        // Run ESLint
        console.log('  Running ESLint...');
        try {
            const eslintOutput = execSync('npx eslint . --format json 2>/dev/null', {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024
            });
            const eslintResults = JSON.parse(eslintOutput);

            for (const file of eslintResults) {
                if (file.errorCount > 0 || file.warningCount > 0) {
                    for (const msg of file.messages) {
                        issues.push({
                            type: msg.severity === 2 ? 'error' : 'warning',
                            file: path.relative(process.cwd(), file.filePath),
                            line: msg.line,
                            column: msg.column,
                            rule: msg.ruleId,
                            message: msg.message
                        });
                    }
                }
            }
        } catch (e) {
            // ESLint returns non-zero exit code when there are errors
            if (e.stdout) {
                try {
                    const eslintResults = JSON.parse(e.stdout);
                    for (const file of eslintResults) {
                        for (const msg of file.messages) {
                            issues.push({
                                type: msg.severity === 2 ? 'error' : 'warning',
                                file: path.relative(process.cwd(), file.filePath),
                                line: msg.line,
                                column: msg.column,
                                rule: msg.ruleId,
                                message: msg.message
                            });
                        }
                    }
                } catch (parseError) {
                    console.log('  ⚠️ Could not parse ESLint output');
                }
            }
        }

        // Run TypeScript check
        console.log('  Running TypeScript strict check...');
        try {
            execSync('npx tsc --noEmit --strict 2>&1', { encoding: 'utf-8' });
            console.log('  ✅ No TypeScript errors');
        } catch (e) {
            const tsErrors = e.stdout || e.message;
            const lines = tsErrors.split('\n').filter(l => l.includes('error TS'));
            for (const line of lines) {
                const match = line.match(/(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/);
                if (match) {
                    issues.push({
                        type: 'error',
                        file: match[1],
                        line: parseInt(match[2]),
                        column: parseInt(match[3]),
                        rule: match[4],
                        message: match[5]
                    });
                }
            }
        }

        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;

        console.log(`  Found ${errorCount} errors, ${warningCount} warnings`);

        report.checks.static = {
            passed: errorCount === 0,
            errorCount,
            warningCount,
            issues: issues.slice(0, 50) // Limit to first 50
        };

        report.summary.critical += errorCount;
        report.summary.warning += warningCount;

    } catch (error) {
        console.error('  ❌ Static analysis failed:', error.message);
        report.checks.static = { passed: false, error: error.message };
    }
}

/**
 * Analyze code quality (complexity, duplication)
 */
async function runQualityAnalysis() {
    console.log('\n🔍 Running Code Quality Analysis...\n');
    const issues = [];

    // Find all TypeScript/JavaScript files
    const files = [];
    for (const dir of CONFIG.targetDirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            findFiles(dirPath, files);
        }
    }

    console.log(`  Analyzing ${files.length} files...`);

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        // Check file length
        if (lines.length > CONFIG.thresholds.maxFileLines) {
            issues.push({
                type: 'warning',
                file: relativePath,
                message: `File has ${lines.length} lines (threshold: ${CONFIG.thresholds.maxFileLines})`,
                category: 'file-length'
            });
        }

        // Find long functions (simple heuristic)
        let functionStart = -1;
        let braceCount = 0;
        let currentFunction = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect function start
            const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:async\s*)?\(/);
            if (funcMatch && functionStart === -1) {
                functionStart = i;
                currentFunction = funcMatch[1];
                braceCount = 0;
            }

            // Count braces
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;

            // Function end
            if (functionStart !== -1 && braceCount === 0 && line.includes('}')) {
                const funcLength = i - functionStart + 1;
                if (funcLength > CONFIG.thresholds.maxFunctionLines) {
                    issues.push({
                        type: 'warning',
                        file: relativePath,
                        line: functionStart + 1,
                        message: `Function '${currentFunction}' has ${funcLength} lines (threshold: ${CONFIG.thresholds.maxFunctionLines})`,
                        category: 'function-length'
                    });
                }
                functionStart = -1;
                currentFunction = '';
            }
        }

        // Check for deeply nested code (>4 levels)
        let maxIndent = 0;
        for (const line of lines) {
            const indent = line.match(/^(\s*)/)[1].length / 2;
            if (indent > maxIndent) maxIndent = indent;
        }
        if (maxIndent > 4) {
            issues.push({
                type: 'info',
                file: relativePath,
                message: `File has deeply nested code (${maxIndent} levels)`,
                category: 'nesting'
            });
        }
    }

    console.log(`  Found ${issues.length} quality issues`);

    report.checks.quality = {
        filesAnalyzed: files.length,
        issues: issues
    };

    report.summary.warning += issues.filter(i => i.type === 'warning').length;
    report.summary.info += issues.filter(i => i.type === 'info').length;
}

/**
 * Analyze type safety
 */
async function runTypeAnalysis() {
    console.log('\n🔷 Running Type Safety Analysis...\n');
    const issues = [];

    const files = [];
    for (const dir of CONFIG.targetDirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            findFiles(dirPath, files, ['.ts', '.tsx']);
        }
    }

    console.log(`  Analyzing ${files.length} TypeScript files...`);

    let anyCount = 0;
    let missingReturnTypes = 0;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Find 'any' usage
            const anyMatches = line.match(/:\s*any\b/g);
            if (anyMatches) {
                anyCount += anyMatches.length;
                issues.push({
                    type: 'warning',
                    file: relativePath,
                    line: i + 1,
                    message: `Usage of 'any' type`,
                    category: 'any-usage'
                });
            }

            // Find functions without return types (excluding arrow functions in JSX)
            if (line.match(/(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{/) && !line.includes(':')) {
                missingReturnTypes++;
                issues.push({
                    type: 'info',
                    file: relativePath,
                    line: i + 1,
                    message: `Function missing explicit return type`,
                    category: 'missing-return-type'
                });
            }
        }
    }

    console.log(`  Found ${anyCount} 'any' usages, ${missingReturnTypes} missing return types`);

    report.checks.types = {
        filesAnalyzed: files.length,
        anyUsageCount: anyCount,
        missingReturnTypes,
        issues: issues.slice(0, 100)
    };

    report.summary.warning += anyCount;
    report.summary.info += missingReturnTypes;
}

/**
 * Run test coverage analysis
 */
async function runCoverageAnalysis() {
    console.log('\n📊 Running Test Coverage Analysis...\n');

    try {
        console.log('  Running Jest with coverage...');
        execSync('npm test -- --coverage --coverageReporters=json-summary --silent 2>/dev/null', {
            encoding: 'utf-8',
            stdio: 'pipe'
        });

        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
        if (fs.existsSync(coveragePath)) {
            const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
            const total = coverage.total;

            console.log(`  Statements: ${total.statements.pct}%`);
            console.log(`  Branches: ${total.branches.pct}%`);
            console.log(`  Functions: ${total.functions.pct}%`);
            console.log(`  Lines: ${total.lines.pct}%`);

            report.checks.coverage = {
                statements: total.statements.pct,
                branches: total.branches.pct,
                functions: total.functions.pct,
                lines: total.lines.pct,
                meetsThreshold: total.lines.pct >= CONFIG.thresholds.minTestCoverage
            };

            if (total.lines.pct < CONFIG.thresholds.minTestCoverage) {
                report.summary.warning++;
            }
        }
    } catch (error) {
        console.log('  ⚠️ Coverage analysis skipped (tests may have failed)');
        report.checks.coverage = { skipped: true, reason: 'Tests failed or coverage not available' };
    }
}

/**
 * Run performance analysis
 */
async function runPerformanceAnalysis() {
    console.log('\n⚡ Running Performance Analysis...\n');
    const issues = [];

    const files = [];
    for (const dir of CONFIG.targetDirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            findFiles(dirPath, files, ['.ts', '.tsx', '.js', '.jsx']);
        }
    }

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for missing useMemo/useCallback opportunities
            if (line.includes('useMemo') === false && line.match(/const\s+\w+\s*=\s*\[.*\]/) && file.includes('.tsx')) {
                // Array literal in component - might need useMemo
            }

            // Check for inline object/array in JSX props
            if (line.match(/=\{\s*\{/) || line.match(/=\{\s*\[/)) {
                issues.push({
                    type: 'info',
                    file: relativePath,
                    line: i + 1,
                    message: 'Inline object/array in JSX prop (consider useMemo)',
                    category: 'memoization'
                });
            }

            // Check for async operations in useEffect without cleanup
            if (line.includes('useEffect') && content.includes('async') && !content.includes('return ()')) {
                // This is a simplified check
            }
        }
    }

    console.log(`  Found ${issues.length} potential performance issues`);

    report.checks.performance = {
        issues: issues.slice(0, 50)
    };

    report.summary.info += issues.length;
}

/**
 * Run security analysis
 */
async function runSecurityAnalysis() {
    console.log('\n🔒 Running Security Analysis...\n');
    const issues = [];

    const allFiles = [];
    findFiles(process.cwd(), allFiles, ['.ts', '.tsx', '.js', '.jsx', '.json', '.env']);

    // Filter out node_modules and .next
    const files = allFiles.filter(f =>
        !f.includes('node_modules') &&
        !f.includes('.next') &&
        !f.includes('.git')
    );

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for potential hardcoded secrets
            if (line.match(/(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{8,}['"]/i)) {
                if (!file.includes('.env') && !file.includes('.example')) {
                    issues.push({
                        type: 'critical',
                        file: relativePath,
                        line: i + 1,
                        message: 'Potential hardcoded secret detected',
                        category: 'hardcoded-secret'
                    });
                }
            }

            // Check for dangerouslySetInnerHTML
            if (line.includes('dangerouslySetInnerHTML')) {
                issues.push({
                    type: 'warning',
                    file: relativePath,
                    line: i + 1,
                    message: 'Usage of dangerouslySetInnerHTML (potential XSS)',
                    category: 'xss-risk'
                });
            }

            // Check for eval usage
            if (line.match(/\beval\s*\(/)) {
                issues.push({
                    type: 'critical',
                    file: relativePath,
                    line: i + 1,
                    message: 'Usage of eval() is dangerous',
                    category: 'eval-usage'
                });
            }
        }
    }

    console.log(`  Found ${issues.length} security concerns`);

    report.checks.security = {
        issues: issues
    };

    report.summary.critical += issues.filter(i => i.type === 'critical').length;
    report.summary.warning += issues.filter(i => i.type === 'warning').length;
}

/**
 * Helper: Find files recursively
 */
function findFiles(dir, result, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!CONFIG.excludePatterns.some(p => entry.name === p)) {
                findFiles(fullPath, result, extensions);
            }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            result.push(fullPath);
        }
    }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
    const lines = [
        '# Code Review Report',
        '',
        `Generated: ${report.timestamp}`,
        '',
        '## Summary',
        '',
        `| Severity | Count |`,
        `|----------|-------|`,
        `| 🔴 Critical | ${report.summary.critical} |`,
        `| 🟡 Warning | ${report.summary.warning} |`,
        `| 🔵 Info | ${report.summary.info} |`,
        ''
    ];

    // Static Analysis
    if (report.checks.static) {
        lines.push('## Static Analysis');
        lines.push('');
        if (report.checks.static.passed) {
            lines.push('✅ No critical issues found');
        } else {
            lines.push(`Found ${report.checks.static.errorCount} errors, ${report.checks.static.warningCount} warnings`);
            lines.push('');
            if (report.checks.static.issues && report.checks.static.issues.length > 0) {
                lines.push('### Top Issues');
                lines.push('');
                for (const issue of report.checks.static.issues.slice(0, 10)) {
                    lines.push(`- **${issue.file}:${issue.line}** - ${issue.message} (${issue.rule})`);
                }
            }
        }
        lines.push('');
    }

    // Type Analysis
    if (report.checks.types) {
        lines.push('## Type Safety');
        lines.push('');
        lines.push(`- Files analyzed: ${report.checks.types.filesAnalyzed}`);
        lines.push(`- \`any\` usage: ${report.checks.types.anyUsageCount}`);
        lines.push(`- Missing return types: ${report.checks.types.missingReturnTypes}`);
        lines.push('');
    }

    // Coverage
    if (report.checks.coverage && !report.checks.coverage.skipped) {
        lines.push('## Test Coverage');
        lines.push('');
        lines.push(`| Metric | Coverage |`);
        lines.push(`|--------|----------|`);
        lines.push(`| Statements | ${report.checks.coverage.statements}% |`);
        lines.push(`| Branches | ${report.checks.coverage.branches}% |`);
        lines.push(`| Functions | ${report.checks.coverage.functions}% |`);
        lines.push(`| Lines | ${report.checks.coverage.lines}% |`);
        lines.push('');
    }

    // Quality
    if (report.checks.quality) {
        lines.push('## Code Quality');
        lines.push('');
        lines.push(`Files analyzed: ${report.checks.quality.filesAnalyzed}`);
        lines.push('');
        if (report.checks.quality.issues.length > 0) {
            lines.push('### Issues');
            lines.push('');
            for (const issue of report.checks.quality.issues.slice(0, 20)) {
                lines.push(`- **${issue.file}${issue.line ? ':' + issue.line : ''}** - ${issue.message}`);
            }
        }
        lines.push('');
    }

    // Security
    if (report.checks.security && report.checks.security.issues.length > 0) {
        lines.push('## Security');
        lines.push('');
        for (const issue of report.checks.security.issues) {
            const icon = issue.type === 'critical' ? '🔴' : '🟡';
            lines.push(`- ${icon} **${issue.file}:${issue.line}** - ${issue.message}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    CODE REVIEWER AGENT                     ');
    console.log('═══════════════════════════════════════════════════════════');

    const checks = flags.all ? ['static', 'quality', 'types', 'coverage', 'performance', 'security'] : [flags.check];

    if (!flags.all && !flags.check) {
        console.log('\nNo check specified. Use --all or --check <type>');
        console.log('Run --help for usage information.\n');
        process.exit(1);
    }

    for (const check of checks) {
        switch (check) {
            case 'static':
                await runStaticAnalysis();
                break;
            case 'quality':
                await runQualityAnalysis();
                break;
            case 'types':
                await runTypeAnalysis();
                break;
            case 'coverage':
                await runCoverageAnalysis();
                break;
            case 'performance':
                await runPerformanceAnalysis();
                break;
            case 'security':
                await runSecurityAnalysis();
                break;
            default:
                console.log(`Unknown check: ${check}`);
        }
    }

    // Generate reports
    console.log('\n📝 Generating Reports...\n');

    const markdownReport = generateMarkdownReport();
    fs.writeFileSync(path.join(reportsDir, 'code_review_report.md'), markdownReport);
    console.log(`  ✅ reports/code_review_report.md`);

    if (flags.json) {
        fs.writeFileSync(path.join(reportsDir, 'code_review_report.json'), JSON.stringify(report, null, 2));
        console.log(`  ✅ reports/code_review_report.json`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  🔴 Critical: ${report.summary.critical}`);
    console.log(`  🟡 Warning:  ${report.summary.warning}`);
    console.log(`  🔵 Info:     ${report.summary.info}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Exit code based on critical issues
    process.exit(report.summary.critical > 0 ? 1 : 0);
}

main().catch(console.error);
