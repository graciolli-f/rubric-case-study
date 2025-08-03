import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parse } from '@typescript-eslint/typescript-estree';
import { visitorKeys } from '@typescript-eslint/visitor-keys';
const require = createRequire(import.meta.url);
const parser = require('./rux-parser-generated.js');

/**
 * Parse a .rux file into an AST (Abstract Syntax Tree)
 */
export function parseRuxFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  try {
    const ast = parser.parse(content);
    return { success: true, ast };
  } catch (error) {
    return { 
      success: false, 
      error: {
        message: error.message,
        location: error.location,
        found: error.found,
        expected: error.expected
      }
    };
  }
}

/**
 * Extract rules from the parsed AST
 */
export function extractRulesFromAST(ast) {
  const rules = {
    moduleName: '',
    type: '',
    location: '',
    allowedImports: [],
    deniedImports: [],
    deniedOperations: [],
    constraints: {
      require: [],
      deny: [],
      warn: []
    },
    interface: {},
    state: {}
  };

  // Extract module name
  rules.moduleName = ast.name;

  // Process module body
  for (const item of ast.body) {
    switch (item.type) {
      case 'TypeDeclaration':
        rules.type = item.value;
        break;

      case 'LocationDeclaration':
        rules.location = item.value;
        break;

      case 'Imports':
        processImports(item, rules);
        break;

      case 'Constraints':
        processConstraints(item, rules);
        break;

      case 'Interface':
        rules.interface = processInterface(item);
        break;

      case 'State':
        rules.state = processState(item);
        break;
    }
  }

  return rules;
}

function processImports(importsNode, rules) {
  for (const rule of importsNode.rules) {
    if (rule.type === 'Allow') {
      rules.allowedImports.push({
        path: rule.path,
        alias: rule.alias,
        external: rule.external
      });
    } else if (rule.type === 'Deny') {
      if (rule.type === 'imports') {
        rules.deniedImports.push(...rule.patterns);
      }
    }
  }
}

function processConstraints(constraintsNode, rules) {
  for (const rule of constraintsNode.rules) {
    if (rule.type === 'Annotation') continue;

    const constraintData = {
      pattern: rule.pattern,
      comparison: rule.comparison,
      comment: rule.comment
    };

    switch (rule.type) {
      case 'RequireRule':
        rules.constraints.require.push(constraintData);
        break;
      
      case 'DenyConstraintRule':
        rules.constraints.deny.push(constraintData);
        // Also add to deniedOperations for backward compatibility
        if (rule.pattern.startsWith('io.') || rule.pattern.startsWith('pattern.')) {
          rules.deniedOperations.push(rule.pattern);
        }
        break;
      
      case 'WarnRule':
        rules.constraints.warn.push(constraintData);
        break;
    }
  }
}

function processInterface(interfaceNode) {
  const methods = {};
  const properties = {};

  for (const member of interfaceNode.members) {
    if (member.type === 'Function') {
      methods[member.name] = {
        params: member.params,
        returnType: member.returnType,
        isAsync: member.isAsync,
        modifier: member.modifier,
        annotations: member.annotations
      };
    } else if (member.type === 'Property') {
      properties[member.name] = {
        type: member.type,
        modifier: member.modifier,
        annotations: member.annotations
      };
    }
  }

  return { methods, properties };
}

function processState(stateNode) {
  const properties = {};

  for (const member of stateNode.members) {
    if (member.type === 'Property') {
      properties[member.name] = {
        type: member.type,
        modifier: member.modifier,
        annotations: member.annotations
      };
    }
  }

  return properties;
}

/**
 * Validate a TypeScript file against parsed rules using AST
 */
export function validateFileAgainstRules(filePath, rules) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf8');

  try {
    // Parse TypeScript/JavaScript file into AST with very permissive options
    const ast = parse(content, {
      jsx: true,
      loc: true,
      range: true,
      comment: true,
      errorOnUnknownASTType: false,
      useJSXTextNode: true,
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
        modules: true,
        objectRestSpread: true,
        experimentalObjectRestSpread: true,
        globalReturn: false,
        impliedStrict: false
      },
      project: undefined, // Don't require tsconfig for basic parsing
      createDefaultProgram: false,
      extraFileExtensions: ['.tsx', '.jsx'],
      allowInvalidAST: true,
      suppressDeprecatedPropertyWarnings: true,
      tokens: false,
      debugLevel: new Set()
    });

    // Use AST-based validation
    const astViolations = validateWithAST(ast, content, rules);
    violations.push(...astViolations);

  } catch (parseError) {
    // Fallback to regex-based validation for problematic files
    console.warn(`AST parsing failed for ${filePath}, falling back to regex:`, parseError.message);
    console.warn('Parse error details:', parseError.location);
    
    // Check deny constraints with regex fallback
  for (const constraint of rules.constraints.deny) {
      const violation = checkConstraintViolationRegex(content, constraint, 'error');
    if (violation) {
      violations.push({
        file: filePath,
        module: rules.moduleName,
        ...violation
      });
    }
  }

    // Check warn constraints with regex fallback
  for (const constraint of rules.constraints.warn) {
      const violation = checkConstraintViolationRegex(content, constraint, 'warning');
    if (violation) {
      violations.push({
        file: filePath,
        module: rules.moduleName,
        ...violation
      });
    }
  }

    // Check required constraints with regex fallback
    for (const constraint of rules.constraints.require) {
      const violation = checkRequiredPatternRegex(content, constraint, filePath);
      if (violation) {
        violations.push({
          file: filePath,
          module: rules.moduleName,
          ...violation
        });
      }
    }
  }

  return violations;
}

/**
 * AST-based validation - much more accurate than regex
 */
function validateWithAST(ast, content, rules) {
  const violations = [];
  const lines = content.split('\n');
  
  // Create violation context
  const context = {
    violations,
    content,
    lines,
    rules,
    ast
  };

  // Walk the AST and check constraints
  traverse(ast, {
    // Check deny constraints
    ...createDenyConstraintVisitors(context),
    // Check required constraints  
    ...createRequiredConstraintVisitors(context),
    // Check import constraints
    ...createImportConstraintVisitors(context)
  });

  // Check file-level metrics
  checkFileLevelConstraints(context);

  return violations;
}

/**
 * Simple AST traversal function
 */
function traverse(node, visitors) {
  if (!node || typeof node !== 'object') return;
  
  const nodeType = node.type;
  if (visitors[nodeType]) {
    visitors[nodeType](node);
  }
  
  // Traverse child nodes
  for (const key in node) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const child = node[key];
    
    if (Array.isArray(child)) {
      child.forEach(item => traverse(item, visitors));
    } else if (child && typeof child === 'object' && child.type) {
      traverse(child, visitors);
    }
  }
}

function createDenyConstraintVisitors(context) {
  const visitors = {};
  
  for (const constraint of context.rules.constraints.deny) {
    const { pattern, comment } = constraint;
    
    if (pattern.startsWith('io.')) {
      addIOConstraintVisitors(visitors, context, pattern, 'error', comment);
    } else if (pattern.startsWith('pattern.')) {
      addPatternConstraintVisitors(visitors, context, pattern, 'error', comment);
    } else if (pattern.startsWith('style.')) {
      addStyleConstraintVisitors(visitors, context, pattern, 'error', comment);
    }
  }
  
  // Add warn constraint visitors
  for (const constraint of context.rules.constraints.warn) {
    const { pattern, comparison, comment } = constraint;
    
    if (pattern.startsWith('file.')) {
      // File metrics are handled separately
      continue;
    }
    
    if (pattern.startsWith('pattern.')) {
      addPatternConstraintVisitors(visitors, context, pattern, 'warning', comment);
    }
  }
  
  return visitors;
}

function addViolation(context, nodeOrLocation, type, severity, message) {
  let line = 1;
  
  if (nodeOrLocation && typeof nodeOrLocation === 'object' && nodeOrLocation.loc) {
    line = nodeOrLocation.loc.start.line;
  } else if (typeof nodeOrLocation === 'number') {
    line = nodeOrLocation;
  }
  
  context.violations.push({
    type,
    severity,
    message,
    line
  });
}

function addVisitor(visitors, type, func) {
  if (!visitors[type]) {
    visitors[type] = (node) => {
      // Call all registered functions for this visitor type
      visitors[type]._functions?.forEach(f => f(node));
    };
    visitors[type]._functions = [];
  }
  visitors[type]._functions.push(func);
}

function addIOConstraintVisitors(visitors, context, pattern, severity, comment) {
  switch (pattern) {
    case 'io.console.*':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'console') {
          addViolation(context, node, 'operation', severity, 
            `Forbidden console operation: console.${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'io.*':
      // Handle general io.* pattern - includes console, localStorage, etc.
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression') {
          const objName = node.callee.object.name;
          if (['console', 'localStorage', 'sessionStorage'].includes(objName)) {
            addViolation(context, node, 'operation', severity, 
              `Forbidden IO operation: ${objName}.${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
          }
        }
        // Also check for direct fetch
        if (node.callee.name === 'fetch') {
          addViolation(context, node, 'operation', severity,
            `Forbidden IO operation: fetch${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'io.localStorage.*':
    case 'io.sessionStorage.*':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            (node.callee.object.name === 'localStorage' || node.callee.object.name === 'sessionStorage')) {
          addViolation(context, node, 'operation', severity,
            `Forbidden storage operation: ${node.callee.object.name}.${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'io.network.*':
    case 'io.fetch':
      addVisitor(visitors, 'CallExpression', (node) => {
        // Only flag direct fetch() calls, not method calls on apiClient
        if (node.callee.name === 'fetch') {
          addViolation(context, node, 'operation', severity,
            `Forbidden network operation: fetch${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'io.XMLHttpRequest':
      addVisitor(visitors, 'NewExpression', (node) => {
        if (node.callee.name === 'XMLHttpRequest') {
          addViolation(context, node, 'operation', severity,
            `Forbidden network operation: XMLHttpRequest${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
  }
}

function addPatternConstraintVisitors(visitors, context, pattern, severity, comment) {
  switch (pattern) {
    case 'pattern.async':
      addVisitor(visitors, 'FunctionDeclaration', (node) => {
        if (node.async) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden async function${comment ? ` (${comment})` : ''}`);
        }
      });
      addVisitor(visitors, 'ArrowFunctionExpression', (node) => {
        if (node.async) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden async arrow function${comment ? ` (${comment})` : ''}`);
        }
      });
      addVisitor(visitors, 'AwaitExpression', (node) => {
        addViolation(context, node, 'pattern', severity,
          `Forbidden await expression${comment ? ` (${comment})` : ''}`);
      });
      break;
      
    case 'pattern.promises':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            ['then', 'catch', 'finally'].includes(node.callee.property?.name)) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden promise method: .${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
        }
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'Promise') {
          addViolation(context, node, 'pattern', severity,
            `Forbidden Promise method: Promise.${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
        }
        if (node.callee.name === 'Promise') {
          addViolation(context, node, 'pattern', severity,
            `Forbidden Promise constructor${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'pattern.mutations':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(node.callee.property?.name)) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden mutation method: .${node.callee.property.name}${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'pattern.side_effects':
    case 'pattern.random_without_seed':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'Math' &&
            node.callee.property.name === 'random') {
          addViolation(context, node, 'pattern', severity,
            `Forbidden side effect: Math.random${comment ? ` (${comment})` : ''}`);
        }
      });
      addVisitor(visitors, 'NewExpression', (node) => {
        if (node.callee.name === 'Date' && node.arguments.length === 0) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden side effect: new Date()${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'pattern.date_now':
      addVisitor(visitors, 'CallExpression', (node) => {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'Date' &&
            node.callee.property.name === 'now') {
          addViolation(context, node, 'pattern', severity,
            `Forbidden Date.now usage${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'pattern.global_state':
      addVisitor(visitors, 'MemberExpression', (node) => {
        if (['window', 'document', 'global'].includes(node.object?.name)) {
          addViolation(context, node, 'pattern', severity,
            `Forbidden global state access: ${node.object.name}${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
  }
}

function addStyleConstraintVisitors(visitors, context, pattern, severity, comment) {
  switch (pattern) {
    case 'style.inline_styles':
      addVisitor(visitors, 'JSXAttribute', (node) => {
        if (node.name?.name === 'style' && node.value?.type === 'JSXExpressionContainer') {
          addViolation(context, node, 'style', severity,
            `Forbidden inline style${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
      
    case 'style.css_in_js':
      addVisitor(visitors, 'TaggedTemplateExpression', (node) => {
        if (node.tag?.name === 'css' || 
            (node.tag?.type === 'MemberExpression' && node.tag?.object?.name === 'styled')) {
          addViolation(context, node, 'style', severity,
            `Forbidden CSS-in-JS${comment ? ` (${comment})` : ''}`);
        }
      });
      break;
  }
}

function createRequiredConstraintVisitors(context) {
  const visitors = {};
  
  for (const constraint of context.rules.constraints.require) {
    const { pattern, comment } = constraint;
    
    switch (pattern) {
      // React patterns
      case 'pattern.memo':
        addVisitor(visitors, 'CallExpression', (node) => {
          if ((node.callee.type === 'MemberExpression' && 
               node.callee.object.name === 'React' && 
               node.callee.property.name === 'memo') ||
              node.callee.name === 'memo') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;
        
      case 'pattern.error_boundary':
        addVisitor(visitors, 'ClassDeclaration', (node) => {
          // Look for componentDidCatch or static getDerivedStateFromError
          const hasCatch = node.body.body.some(method => 
            method.key?.name === 'componentDidCatch' ||
            (method.static && method.key?.name === 'getDerivedStateFromError')
          );
          if (hasCatch) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        // Also check for React.ErrorBoundary usage
        addVisitor(visitors, 'JSXElement', (node) => {
          if (node.openingElement.name?.name === 'ErrorBoundary' ||
              (node.openingElement.name?.type === 'JSXMemberExpression' &&
               node.openingElement.name?.object?.name === 'React' &&
               node.openingElement.name?.property?.name === 'ErrorBoundary')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.loading_state':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/loading|pending|isLoading|isPending/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.empty_state':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/empty|isEmpty|noData|emptyState/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.suspense':
        addVisitor(visitors, 'JSXElement', (node) => {
          if (node.openingElement.name?.name === 'Suspense' ||
              (node.openingElement.name?.type === 'JSXMemberExpression' &&
               node.openingElement.name?.object?.name === 'React' &&
               node.openingElement.name?.property?.name === 'Suspense')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.memo_children':
        addVisitor(visitors, 'CallExpression', (node) => {
          if ((node.callee.type === 'MemberExpression' && 
               node.callee.object.name === 'React' && 
               node.callee.property.name === 'memo') ||
              node.callee.name === 'memo' ||
              node.callee.name === 'useMemo') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.callback_optimization':
        addVisitor(visitors, 'CallExpression', (node) => {
          if (node.callee.name === 'useCallback') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.list_virtualization':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/virtual|virtualized|FixedSizeList|VariableSizeList/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Accessibility patterns
      case 'pattern.aria_live':
        addVisitor(visitors, 'JSXAttribute', (node) => {
          if (node.name?.name === 'aria-live') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.focus_management':
        addVisitor(visitors, 'CallExpression', (node) => {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'focus') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        addVisitor(visitors, 'Identifier', (node) => {
          if (/focus|useRef|tabIndex/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.keyboard_navigation':
        addVisitor(visitors, 'JSXAttribute', (node) => {
          if (node.name?.name && /onKey(Down|Up|Press)|tabIndex/i.test(node.name.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Error handling patterns
      case 'pattern.extends_base_error':
        addVisitor(visitors, 'ClassDeclaration', (node) => {
          if (node.superClass && 
              (node.superClass.name === 'Error' || 
               node.superClass.name === 'BaseError' ||
               /Error$/.test(node.superClass.name))) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.error_codes':
        addVisitor(visitors, 'PropertyDefinition', (node) => {
          if (node.key?.name === 'code' || /code/i.test(node.key?.name || '')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        addVisitor(visitors, 'Property', (node) => {
          if (node.key?.name === 'code' || /code/i.test(node.key?.name || '')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.serializable':
        addVisitor(visitors, 'MethodDefinition', (node) => {
          if (node.key?.name === 'toJSON') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.operational_flag':
        addVisitor(visitors, 'PropertyDefinition', (node) => {
          if (/operational|isOperational/i.test(node.key?.name || '')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.try_catch':
        addVisitor(visitors, 'TryStatement', (node) => {
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      case 'pattern.singleton':
        addVisitor(visitors, 'ClassDeclaration', (node) => {
          const hasInstance = node.body.body.some(member =>
            member.static && /instance|getInstance/i.test(member.key?.name || '')
          );
          if (hasInstance) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.result_type':
        addVisitor(visitors, 'TSTypeReference', (node) => {
          if (node.typeName?.name === 'Result' || 
              /Result<.*>/.test(context.content.slice(node.range[0], node.range[1]))) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.specific_errors':
        addVisitor(visitors, 'ThrowStatement', (node) => {
          if (node.argument?.type === 'NewExpression' &&
              /Error$/.test(node.argument.callee?.name || '')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Security patterns
      case 'security.token_refresh':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/refresh|token.*refresh|refreshToken/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'security.secure_storage':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/secure|encrypt|sessionStorage|localStorage/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'security.input_validation':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/validate|sanitize|escape|clean/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Network patterns
      case 'pattern.retry_logic':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/retry|retries|attempt|backoff/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.timeout_handling':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/timeout|abort|cancel|signal/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.request_cancellation':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/cancel|abort|signal|controller/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Documentation patterns
      case 'pattern.jsdoc':
        addVisitor(visitors, 'Program', (node) => {
          if (context.content.includes('/**') || context.content.includes('* @')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.examples':
        addVisitor(visitors, 'Program', (node) => {
          if (/@example|@usage/.test(context.content)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Architecture patterns
      case 'pattern.dependency_injection':
        addVisitor(visitors, 'FunctionDeclaration', (node) => {
          if (node.params && node.params.length > 0) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.interface_based':
        addVisitor(visitors, 'TSInterfaceDeclaration', (node) => {
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      // Quality patterns
      case 'pattern.deterministic':
        addVisitor(visitors, 'FunctionDeclaration', (node) => {
          // Simple heuristic: pure functions without random/date operations
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      case 'pattern.defensive':
        addVisitor(visitors, 'IfStatement', (node) => {
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      case 'pattern.graceful_fallback':
        addVisitor(visitors, 'LogicalExpression', (node) => {
          if (node.operator === '||' || node.operator === '??') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.memoization':
        addVisitor(visitors, 'CallExpression', (node) => {
          if (node.callee.name === 'useMemo' || node.callee.name === 'useCallback') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Basic patterns (existing)
      case 'pattern.button_element':
        addVisitor(visitors, 'JSXElement', (node) => {
          if (node.openingElement.name.name === 'button') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;
        
      case 'pattern.data_testid':
        addVisitor(visitors, 'JSXAttribute', (node) => {
          if (node.name?.name === 'data-testid') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;
        
      case 'pattern.aria_label':
        addVisitor(visitors, 'JSXAttribute', (node) => {
          if (node.name?.name === 'aria-label') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;
        
      case 'style.external_stylesheet':
        addVisitor(visitors, 'ImportDeclaration', (node) => {
          if (node.source.value.endsWith('.css')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;
        
      case 'style.css_modules':
        addVisitor(visitors, 'ImportDeclaration', (node) => {
          if (node.source.value.includes('.module.css')) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        addVisitor(visitors, 'MemberExpression', (node) => {
          if (node.object?.name === 'styles') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Property patterns
      case 'property.message':
        addVisitor(visitors, 'Property', (node) => {
          if (node.key?.name === 'message') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'property.code':
        addVisitor(visitors, 'Property', (node) => {
          if (node.key?.name === 'code') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'property.timestamp':
        addVisitor(visitors, 'Property', (node) => {
          if (node.key?.name === 'timestamp') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'property.stack':
        addVisitor(visitors, 'Property', (node) => {
          if (node.key?.name === 'stack') {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      // Export patterns
      case 'exports.public_functions':
        addVisitor(visitors, 'ExportNamedDeclaration', (node) => {
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      // Additional pattern matching
      case 'pattern.unit_testable':
        addVisitor(visitors, 'ExportNamedDeclaration', (node) => {
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;

      case 'pattern.edge_cases':
        addVisitor(visitors, 'Identifier', (node) => {
          if (/null|undefined|empty|edge/i.test(node.name)) {
            context._hasRequirement = context._hasRequirement || {};
            context._hasRequirement[pattern] = true;
          }
        });
        break;

      case 'pattern.grouped_by_domain':
        addVisitor(visitors, 'ExportNamedDeclaration', (node) => {
          // If there are multiple exports, consider it grouped
          context._hasRequirement = context._hasRequirement || {};
          context._hasRequirement[pattern] = true;
        });
        break;
    }
  }
  
  return visitors;
}

function createImportConstraintVisitors(context) {
  const visitors = {};
  
  addVisitor(visitors, 'ImportDeclaration', (node) => {
    const importPath = node.source.value;
    
    // Check denied imports
    for (const denied of context.rules.deniedImports) {
      if (matchesPattern(importPath, denied)) {
        addViolation(context, node, 'import', 'error',
          `Forbidden import '${importPath}' matches pattern '${denied}'`);
      }
    }
    
    // Check allowed imports if specified
    if (context.rules.allowedImports.length > 0) {
      const isAllowed = context.rules.allowedImports.some(allowed => 
        matchesPattern(importPath, allowed.path)
      );
      
      if (!isAllowed) {
        addViolation(context, node, 'import', 'error',
          `Import '${importPath}' is not in allowed list`);
      }
    }
  });
  
  return visitors;
}

function checkFileLevelConstraints(context) {
  // Check file metrics
  for (const constraint of [...context.rules.constraints.deny, ...context.rules.constraints.warn]) {
    if (constraint.pattern.startsWith('file.')) {
      const violation = checkFileMetrics(context.content, constraint.pattern, constraint.comparison, 
        context.rules.constraints.warn.includes(constraint) ? 'warning' : 'error', constraint.comment);
      if (violation) {
        context.violations.push(violation);
      }
    }
  }
  
  // Check required patterns that weren't found
  for (const constraint of context.rules.constraints.require) {
    const { pattern, comment } = constraint;
    
    if (!context._hasRequirement?.[pattern]) {
      addViolation(context, 1, 'missing_requirement', 'error',
        `Required pattern missing: ${pattern}${comment ? ` (${comment})` : ''}`);
    }
  }
}

function checkConstraintViolationRegex(content, constraint, severity) {
  const { pattern, comparison, comment } = constraint;

  // Handle different pattern types
  if (pattern.startsWith('io.')) {
    return checkIOPattern(content, pattern, severity, comment);
  } else if (pattern.startsWith('pattern.')) {
    return checkCodePattern(content, pattern, severity, comment);
  } else if (pattern.startsWith('style.')) {
    return checkStylePattern(content, pattern, severity, comment);
  } else if (pattern.startsWith('file.')) {
    return checkFileMetrics(content, pattern, comparison, severity, comment);
  } else if (pattern.startsWith('exports.')) {
    return checkExportPattern(content, pattern, severity, comment);
  }

  return null;
}

function checkIOPattern(content, pattern, severity, comment) {
  const patterns = {
    'io.console.*': /console\.(log|warn|error|info|debug|trace)/g,
    'io.localStorage.*': /localStorage\.(getItem|setItem|removeItem|clear)/g,
    'io.sessionStorage.*': /sessionStorage\.(getItem|setItem|removeItem|clear)/g,
    'io.network.*': /fetch\s*\(|axios\.|XMLHttpRequest|\.get\s*\(|\.post\s*\(/g,
    'io.fetch': /fetch\s*\(/g,
    'io.file.*': /fs\.|readFile|writeFile|require\s*\(.*\.json/g,
    'io.*': /console\.|localStorage\.|sessionStorage\.|fetch\s*\(|fs\.|path\.|require\s*\(.*\.json/g
  };

  const regex = patterns[pattern];
  if (!regex) return null;

  const matches = [...content.matchAll(regex)];
  if (matches.length > 0) {
    const match = matches[0];
    const line = content.substring(0, match.index).split('\n').length;
    
    return {
      type: 'operation',
      severity,
      message: `Forbidden operation: ${match[0]}${comment ? ` (${comment})` : ''}`,
      line
    };
  }

  return null;
}

function checkCodePattern(content, pattern, severity, comment) {
  const patterns = {
    'pattern.async': /async\s+(?:function|\()|await\s+/g,
    'pattern.promises': /\.then\s*\(|\.catch\s*\(|Promise\.|new Promise/g,
    'pattern.callbacks': /setTimeout|setInterval|addEventListener|callback\s*\(|\)\s*=>\s*{/g,
    'pattern.business_logic': /calculate|validate|process|transform|convert|algorithm|compute/gi,
    'pattern.calculations': /Math\.[a-zA-Z]+|\*\*|Math\.pow|\+\+|\b\w+\s*[+\-*/]=|[+\-*/]=/g,
    'pattern.data_transformation': /map\s*\(|filter\s*\(|reduce\s*\(|sort\s*\(|Object\.assign/g,
    'pattern.mutations': /\.push\(|\.pop\(|\.shift\(|\.splice\(|\.sort\(/g,
    'pattern.side_effects': /Math\.random|Date\.now|new Date\(\)/g,
    'pattern.global_state': /window\.|document\.|global\./g,
    'pattern.random_without_seed': /Math\.random\(\)/g,
    'pattern.date_now': /Date\.now\(\)|new Date\(\)/g,
    'pattern.environment_vars': /process\.env|NODE_ENV/g,
    'pattern.throwing': /throw\s+(?:new\s+)?\w+/g,
    'pattern.regex_in_function': /new RegExp\(|\/.+\/[gimuy]*\s*;/g
  };

  const regex = patterns[pattern];
  if (!regex) return null;

  const matches = [...content.matchAll(regex)];
  if (matches.length > 0) {
    const match = matches[0];
    const line = content.substring(0, match.index).split('\n').length;
    
    return {
      type: 'pattern',
      severity,
      message: `Forbidden pattern: ${pattern} - ${match[0]}${comment ? ` (${comment})` : ''}`,
      line
    };
  }

  return null;
}

function checkStylePattern(content, pattern, severity, comment) {
  const patterns = {
    'style.inline_styles': /style\s*=\s*{{[^}]+}}|style\s*=\s*{[^}]+}/g,
    'style.css_in_js': /styled\.\w+`[\s\S]+?`|css`[\s\S]+?`|emotion|\bcss\s*\(/g,
    'style.styled_components': /styled\.\w+`[\s\S]+?`|styled\([^)]+\)`[\s\S]+?`/g
  };

  const regex = patterns[pattern];
  if (!regex) return null;

  const matches = [...content.matchAll(regex)];
  if (matches.length > 0) {
    const match = matches[0];
    const line = content.substring(0, match.index).split('\n').length;
    
    return {
      type: 'style',
      severity,
      message: `Style violation: ${pattern}${comment ? ` - ${comment}` : ''}`,
      line
    };
  }

  return null;
}

function checkFileMetrics(content, pattern, comparison, severity, comment) {
  const lines = content.split('\n');
  const lineCount = lines.length;
  
  if (pattern === 'file.lines' && comparison) {
    const threshold = comparison.value;
    const operator = comparison.op;
    
    let violated = false;
    if (operator === '>' && lineCount > threshold) {
      violated = true;
    } else if (operator === '<' && lineCount < threshold) {
      violated = true;
    } else if (operator === '>=' && lineCount >= threshold) {
      violated = true;
    } else if (operator === '<=' && lineCount <= threshold) {
      violated = true;
    }
    
    if (violated) {
      return {
        type: 'metrics',
        severity,
        message: `File has ${lineCount} lines, violates constraint (${operator} ${threshold})${comment ? ` (${comment})` : ''}`,
        line: 1
      };
    }
  }
  
  return null;
}

function checkExportPattern(content, pattern, severity, comment) {
  const patterns = {
    'exports.public_functions': /export\s+(?:async\s+)?function\s+\w+/g,
    'exports.private_functions': /export\s+(?:async\s+)?function\s+_\w+/g,
    'exports.default': /export\s+default/g
  };

  const regex = patterns[pattern];
  if (!regex) return null;

  const matches = [...content.matchAll(regex)];
  if (matches.length > 0) {
    const match = matches[0];
    const line = content.substring(0, match.index).split('\n').length;
    
    return {
      type: 'export',
      severity,
      message: `Export violation: ${pattern}${comment ? ` - ${comment}` : ''}`,
      line
    };
  }

  return null;
}

function checkRequiredPatternRegex(content, constraint, filePath) {
  const { pattern, comment } = constraint;
  
  // Implement intelligent pattern detection with context awareness
  function checkSmartPattern(pattern, content, filePath) {
    switch (pattern) {
      // React patterns - check for actual implementations
      case 'pattern.error_boundary':
        // Look for error boundary implementations or usage
        return /componentDidCatch|getDerivedStateFromError|ErrorBoundary|error.*boundary/gi.test(content) ||
               /RUX:.*error.*boundary/gi.test(content) ||
               content.includes('ErrorBoundary');
               
      case 'pattern.loading_state':
        // Look for loading state management
        return /loading|pending|isLoading|isPending|CircularProgress|Loader/gi.test(content) ||
               /RUX:.*loading/gi.test(content);
               
      case 'pattern.empty_state':
        // Look for empty state handling
        return /empty|isEmpty|noData|emptyState|EmptyState/gi.test(content) ||
               /RUX:.*empty/gi.test(content) ||
               /\.length === 0|\.length < 1/.test(content);
               
      case 'pattern.suspense':
        // Look for Suspense usage or code splitting
        return /<Suspense|React\.Suspense|import\s*\(/gi.test(content) ||
               /RUX:.*suspense/gi.test(content);
               
      case 'pattern.memo_children':
        // Look for memoization of children or components
        return /React\.memo|MemoizedComponent|memo\(|useMemo/gi.test(content) ||
               /RUX:.*memo/gi.test(content);
               
      case 'pattern.callback_optimization':
        // Look for useCallback usage
        return /useCallback/g.test(content) ||
               /RUX:.*callback/gi.test(content);
               
      case 'pattern.list_virtualization':
        // Look for virtualization or comments about large lists
        return /virtual|virtualized|FixedSizeList|VariableSizeList|react-window/gi.test(content) ||
               /RUX:.*virtual|RUX:.*large.*list/gi.test(content);
               
      case 'pattern.aria_live':
        // Look for aria-live attributes
        return /aria-live/g.test(content) ||
               /RUX:.*aria.*live/gi.test(content);
               
      case 'pattern.focus_management':
        // Look for focus management
        return /\.focus\(\)|useRef|tabIndex|focus.*management/gi.test(content) ||
               /RUX:.*focus/gi.test(content);
               
      case 'pattern.keyboard_navigation':
        // Look for keyboard event handlers or comments
        return /onKey(Down|Up|Press)|useKeyboardShortcuts|keyboard/gi.test(content) ||
               /RUX:.*keyboard/gi.test(content);
               
      // Error handling patterns
      case 'pattern.extends_base_error':
        // Look for proper error inheritance
        return /extends\s+(Error|BaseError|\w*Error)|class\s+\w*Error/g.test(content);
        
      case 'pattern.error_codes':
        // Look for error codes in properties or constants
        return /code\s*[:=]|ERROR_CODE|\.code\b|errorCode/gi.test(content);
        
      case 'pattern.serializable':
        // Look for toJSON method or serialization
        return /toJSON|JSON\.stringify|serialize/gi.test(content);
        
      case 'pattern.operational_flag':
        // Look for operational error flags
        return /operational|isOperational|programmerError/gi.test(content);
        
      case 'pattern.try_catch':
        // Look for try-catch blocks
        return /try\s*{[\s\S]*?catch/g.test(content);
        
      case 'pattern.singleton':
        // Look for singleton pattern
        return /getInstance|static.*instance|private\s+constructor/gi.test(content);
        
      case 'pattern.result_type':
        // Look for Result type usage
        return /Result<.*>|Result\s*<|return.*Result|type.*Result/gi.test(content);
        
      case 'pattern.specific_errors':
        // Look for specific error throwing
        return /throw\s+new\s+\w*Error|AuthError|ValidationError|BusinessError/gi.test(content);
        
      // Advanced patterns with RUX comments
      case 'pattern.immutable':
        return /readonly|Object\.freeze|immutable|const\s+/gi.test(content) ||
               /RUX:.*immutable/gi.test(content);
               
      case 'pattern.chainable':
        return /cause\s*:|\.cause|error.*chain|previous.*error/gi.test(content) ||
               /RUX:.*chain/gi.test(content);
               
      case 'pattern.safe_serialization':
        return /toJSON|sanitize|redact|sensitive.*data/gi.test(content) ||
               /RUX:.*safe.*serial/gi.test(content);
               
      case 'pattern.consistent_naming':
        return /\w+Error\b/.test(content) ||
               /RUX:.*consistent.*naming/gi.test(content);
               
      case 'pattern.descriptive_codes':
        return /[A-Z_]+_ERROR|AUTH_|VALIDATION_|NETWORK_/g.test(content) ||
               /RUX:.*descriptive.*code/gi.test(content);
               
      case 'pattern.actionable_messages':
        return /resolution|how.*to.*fix|try.*again|check.*input/gi.test(content) ||
               /RUX:.*actionable/gi.test(content);
               
      case 'pattern.lazy_serialization':
        return /lazy|defer|on.*demand|getter/gi.test(content) ||
               /RUX:.*lazy/gi.test(content);
               
      case 'pattern.testable':
        return /export\s+(?:const|function|class)|public|test.*friendly/gi.test(content) ||
               /RUX:.*testable/gi.test(content);
               
      case 'pattern.mockable':
        return /mock|stub|dependency.*inject|interface|abstract/gi.test(content) ||
               /RUX:.*mock/gi.test(content);
               
      // Security patterns
      case 'security.token_refresh':
        return /refresh|refreshToken|token.*refresh/gi.test(content);
        
      case 'security.secure_storage':
        return /secure|encrypt|crypto|sessionStorage|localStorage/gi.test(content);
        
      case 'security.input_validation':
        return /validate|sanitize|escape|clean|zod|joi/gi.test(content);
        
      // Network patterns
      case 'pattern.retry_logic':
        return /retry|retries|attempt|backoff|exponential/gi.test(content);
        
      case 'pattern.timeout_handling':
        return /timeout|abort|cancel|signal|AbortController/gi.test(content);
        
      case 'pattern.request_cancellation':
        return /cancel|abort|signal|controller|cleanup/gi.test(content);
        
      // Documentation patterns
      case 'pattern.jsdoc':
        return /\/\*\*[\s\S]*?\*\//.test(content);
        
      case 'pattern.examples':
        return /@example|@usage|usage.*example/gi.test(content);
        
      // Architecture patterns
      case 'pattern.dependency_injection':
        return /inject|dependencies|constructor.*param|DI\s|IoC/gi.test(content) ||
               filePath.includes('Service') && /constructor\s*\(/g.test(content);
        
      case 'pattern.interface_based':
        return /interface\s+\w+|implements\s+\w+|abstract.*class/gi.test(content);
        
      // Quality patterns
      case 'pattern.unit_testable':
        return /export\s+(?:const|function|class)/.test(content);
        
      case 'pattern.edge_cases':
        return /null|undefined|empty|edge.*case|boundary.*condition/gi.test(content);
        
      case 'pattern.defensive':
        return /if\s*\(.*null\)|if\s*\(.*undefined\)|&&|\|\||try\s*{/.test(content);
        
      case 'pattern.graceful_fallback':
        return /\|\||\?\?|\?\s*:|fallback|default.*value/.test(content);
        
      case 'pattern.deterministic':
        return !/Math\.random|Date\.now|new Date(?!\()/.test(content) && 
               /function|const|=>/.test(content);
        
      case 'pattern.memoization':
        return /useMemo|useCallback|memo|cache|memoiz/gi.test(content);
        
      case 'pattern.grouped_by_domain':
        return /export\s*{[\s\S]*?}/.test(content) ||
               /\/\*\*.*@group|\/\/.*group/.test(content);
        
      // Basic patterns
      case 'pattern.button_element':
        return /<button[\s>]/.test(content);
        
      case 'pattern.data_testid':
        return /data-testid/.test(content);
        
      case 'pattern.aria_label':
        return /aria-label/.test(content);
        
      case 'pattern.memo':
        return /React\.memo|memo\(/.test(content);
        
      // Style patterns
      case 'style.external_stylesheet':
        return /import.*\.css|className=/.test(content);
        
      case 'style.css_modules':
        return /styles\.|\.module\.css/.test(content);
        
      // Export patterns
      case 'exports.public_functions':
        return /export\s+(?:const|function|class)/.test(content);
        
      // Property patterns
      case 'property.message':
        return /message\s*[:=]|\.message\b/.test(content);
        
      case 'property.code':
        return /code\s*[:=]|\.code\b/.test(content);
        
      case 'property.timestamp':
        return /timestamp\s*[:=]|\.timestamp\b/.test(content);
        
      case 'property.stack':
        return /stack\s*[:=]|\.stack\b/.test(content);
        
      default:
        return false;
    }
  }
  
  if (checkSmartPattern(pattern, content, filePath)) {
    return null; // Pattern found, no violation
  }
  
  // If smart pattern detection didn't find it, it's missing
  return {
    type: 'missing_requirement',
    severity: 'error',
    message: `Required pattern missing: ${pattern}${comment ? ` (${comment})` : ''}`,
    line: 1
  };
}

function checkImportViolations(content, rules, filePath) {
  const violations = [];
  const importRegex = /import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['"]([^'"]+)['"]/g;
  const matches = [...content.matchAll(importRegex)];

  for (const match of matches) {
    const importPath = match[1];
    const line = content.substring(0, match.index).split('\n').length;

    // Check denied imports
    for (const denied of rules.deniedImports) {
      if (matchesPattern(importPath, denied)) {
        violations.push({
          type: 'import',
          severity: 'error',
          message: `Forbidden import '${importPath}' matches pattern '${denied}'`,
          line
        });
      }
    }

    // Check allowed imports if specified
    if (rules.allowedImports.length > 0) {
      const isAllowed = rules.allowedImports.some(allowed => 
        matchesPattern(importPath, allowed.path)
      );
      
      if (!isAllowed) {
        violations.push({
          type: 'import',
          severity: 'error',
          message: `Import '${importPath}' is not in allowed list`,
          line
        });
      }
    }
  }

  return violations;
}

function matchesPattern(path, pattern) {
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(regexPattern).test(path);
  }
  return path.includes(pattern);
}