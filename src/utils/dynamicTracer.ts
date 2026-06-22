export interface DynamicStep {
  line: number;
  explanation: string;
  state: {
    arr?: number[];
    left?: number;
    right?: number;
    mid?: number;
    target?: number;
    i?: number;
    j?: number;
    sum?: number;
    maxSum?: number;
    windowSum?: number;
    windowStart?: number;
    windowEnd?: number;
    comparing?: number[];
    swapping?: number[];
    [key: string]: any;
  };
}

/**
 * Lightweight utility to transpile standard LeetCode Java syntax into browser-executable JavaScript.
 */
export function cleanJavaToJS(code: string): string {
  // Strip block comments /* ... */ and line comments // ... first
  let js = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  
  
  // 1. Remove packages and imports
  js = js.replace(/import\s+[^;]+;/g, '');
  
  // 2. Convert method declarations and remove their parameter type declarations:
  // e.g. "public int[] twoSum(int[] nums, int target) {" -> "twoSum(nums, target) {"
  js = js.replace(/(?:(?:public|private|protected|static)\s+)?\b[A-Za-z0-9_<>\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*(?=\{|\n\s*\{)/g, (match, funcName, params) => {
    if (['if', 'for', 'while', 'switch', 'catch'].includes(funcName)) {
      return match;
    }
    if (!params.trim()) return `${funcName}()`;
    const cleanedParams = params.split(',').map((p: string) => {
      const parts = p.trim().split(/\s+/);
      return parts[parts.length - 1]; // Grab parameter variable name
    }).join(', ');
    return `${funcName}(${cleanedParams})`;
  });

  // 3. Prepend "this." to helper method calls of the class (e.g. expandAroundCenter(...) -> this.expandAroundCenter(...))
  const methodNames: string[] = [];
  const methodMatches = Array.from(js.matchAll(/\b(\w+)\s*\([^)]*\)\s*(?=\{|\n\s*\{)/g));
  methodMatches.forEach(m => {
    const name = m[1];
    if (!['if', 'for', 'while', 'switch', 'catch', 'class', 'function'].includes(name)) {
      methodNames.push(name);
    }
  });

  methodNames.forEach(name => {
    const regex = new RegExp(`(?<!\\bthis\\.)\\b${name}\\(`, 'g');
    js = js.replace(regex, (match, offset) => {
      const restOfText = js.substring(offset);
      const nextNewLine = restOfText.indexOf('\n');
      const lineText = nextNewLine !== -1 ? restOfText.substring(0, nextNewLine) : restOfText;
      if (lineText.trim().endsWith('{')) {
        return match; // It's the definition, don't change
      }
      return `this.${name}(`;
    });
  });

  // 4. Convert local type declarations: "int sum = 0" -> "let sum = 0"
  js = js.replace(/\b(?:int|long|double|float|char|boolean|String)\s+([a-zA-Z0-9_]+)\s*=/g, 'let $1 =');
  js = js.replace(/\b(?:int|long|double|float|char|boolean|String)\[\]\s+([a-zA-Z0-9_]+)\s*=/g, 'let $1 =');

  // 4.5 Convert generic variable declarations: "HashSet<Character> set = new HashSet<>()" -> "let set = new HashSet<>()"
  // This matches ClassName<Generic> varName = or just ClassName varName = or ClassName[] varName =
  js = js.replace(/\b([A-Z][a-zA-Z0-9_<>,\s\[\]]*)\s+([a-zA-Z0-9_]+)\s*=/g, 'let $2 =');

  // 5. Convert loops type declarations: "for(int i = 0;" -> "for(let i = 0;"
  // This matches standard loops like "for (ListNode curr = l1;" or "for (int i = 0;"
  js = js.replace(/for\s*\(\s*[a-zA-Z0-9_<>\\[\\]]+\s+([a-zA-Z0-9_]+)\s*=/g, 'for(let $1 =');
  // Support Java enhanced for-each loops: "for (int num : nums)" -> "for (let num of nums)"
  // Uses lookahead to correctly terminate at the end of the loop header even with nested parentheses (e.g. toCharArray())
  js = js.replace(/for\s*\(\s*[a-zA-Z0-9_<>\[\]\s]+\s+([a-zA-Z0-9_]+)\s*:\s*([\s\S]+?)\)\s*(?=\{|\n|$)/g, 'for(let $1 of $2)');

  // 6. Convert array instantiations: "new int[]{i, j}" -> "[i, j]"
  js = js.replace(/new\s+[a-zA-Z0-9_]+\s*\[\]\s*(\{[^}]*\})/g, (_, arrContent) => {
    return arrContent.replace('{', '[').replace('}', ']');
  });
  // Clean "new ClassName[size]" array definitions to JavaScript "new Array(size)"
  js = js.replace(/new\s+[a-zA-Z0-9_]+\s*\[([^\]]*)\]/g, 'new Array($1)');

  // 6.5 Convert Java collection instantiations: "new HashSet<>()" -> "new Set()"
  js = js.replace(/new\s+HashSet\s*(?:<[^>]*>)?\s*\(\)/g, 'new Set()');
  js = js.replace(/new\s+HashMap\s*(?:<[^>]*>)?\s*\(\)/g, 'new Map()');

  // 6.6 Convert Java collection methods to JS equivalents
  js = js.replace(/\.contains\(/g, '.has(');
  js = js.replace(/\.remove\(/g, '.delete(');
  js = js.replace(/\.put\(/g, '.set(');
  js = js.replace(/\.containsKey\(/g, '.has(');

  // 7. Convert Java string/array methods: "s.length()" -> "s.length"
  js = js.replace(/\.length\(\)/g, '.length');

  return js;
}

/**
 * Automatically injects trace statements into JavaScript code.
 */
export function instrumentCode(code: string): { instrumentedCode: string; variables: string[] } {
  const lines = code.split('\n');
  const instrumentedLines: string[] = [];

  // Track variables that are active in scope at the current line
  const activeVars = new Set<string>();
  
  // Standard parameters that are always active
  const commonVars = ['left', 'right', 'mid', 'i', 'j', 'sum', 'maxSum', 'windowSum', 'windowStart', 'windowEnd', 'target'];
  
  // Extract function parameters from the code signature to initialize activeVars
  const paramRegex = /(?:function\s+)?\w+\s*\(([^)]*)\)/;
  const paramMatch = code.match(paramRegex);
  if (paramMatch && paramMatch[1]) {
    paramMatch[1].split(',').forEach(p => {
      const name = p.trim().split('=')[0].trim();
      if (name && name !== 'Solution') {
        activeVars.add(name);
      }
    });
  }

  const allVars = new Set<string>();
  let parenthesisDepth = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Track parenthesis depth to skip multi-line conditional expressions
    let openCount = 0;
    let closeCount = 0;
    for (const char of trimmed) {
      if (char === '(') openCount++;
      if (char === ')') closeCount++;
    }
    const prevDepth = parenthesisDepth;
    parenthesisDepth += (openCount - closeCount);

    // Scan current line for variable declarations (let, const, var)
    const varRegex = /\b(?:let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = varRegex.exec(line)) !== null) {
      activeVars.add(match[1]);
      allVars.add(match[1]);
    }

    // Scan for Java-style types if not cleaned yet
    const javaDeclRegex = /\b(?:int|long|double|float|char|boolean|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = javaDeclRegex.exec(line)) !== null) {
      const name = match[1];
      if (name !== 'public' && name !== 'private' && name !== 'class' && name !== 'return') {
        activeVars.add(name);
        allVars.add(name);
      }
    }

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('import') || trimmed.startsWith('console.')) {
      instrumentedLines.push(line);
      continue;
    }

    // Only inject pointers if they exist in activeVars, or if they are in common list
    const lineActiveVars = new Set(activeVars);
    commonVars.forEach(v => {
      if (trimmed.includes(v)) {
        lineActiveVars.add(v);
      }
    });

    const stateObjStr = '{ ' + Array.from(lineActiveVars).map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(', ') + ' }';

    if (trimmed.startsWith('class ')) {
      instrumentedLines.push(line);
      continue;
    }

    if (trimmed.endsWith('{')) {
      instrumentedLines.push(line);
      instrumentedLines.push(`_trace(${lineNum}, ${stateObjStr});`);
    } else if (trimmed.startsWith('return ')) {
      instrumentedLines.push(`_trace(${lineNum}, ${stateObjStr});`);
      instrumentedLines.push(line);
    } else if (trimmed === '}' || trimmed === '};' || trimmed.startsWith('else')) {
      instrumentedLines.push(line);
    } else {
      // Check if we are inside a multi-line condition/expression
      const isInsideExpr = prevDepth > 0 || (parenthesisDepth > 0 && !trimmed.endsWith('{'));
      if (isInsideExpr) {
        instrumentedLines.push(line);
      } else {
        instrumentedLines.push(line);
        instrumentedLines.push(`_trace(${lineNum}, ${stateObjStr});`);
      }
    }
  }

  return {
    instrumentedCode: instrumentedLines.join('\n'),
    variables: Array.from(allVars)
  };
}

/**
 * Auto-generates explanation text for the dynamic changes between steps.
 */
function generateExplanation(current: any, prev: any, array: any[]): string {
  if (!prev) {
    return "Initializing execution. Main variables allocated and parameters initialized.";
  }

  const messages: string[] = [];

  // Check pointers
  const pointerNames = ['i', 'j', 'left', 'right', 'mid'];
  pointerNames.forEach(p => {
    if (current[p] !== undefined && current[p] !== prev[p]) {
      const valStr = current[p] >= 0 && current[p] < array.length ? `(value ${array[current[p]]})` : '';
      messages.push(`Pointer \`${p}\` moved from index ${prev[p] !== undefined ? prev[p] : 'null'} to ${current[p]} ${valStr}.`);
    }
  });

  // Check sum and values
  const sumNames = ['sum', 'maxSum', 'windowSum'];
  sumNames.forEach(s => {
    if (current[s] !== undefined && current[s] !== prev[s]) {
      messages.push(`Accumulator \`${s}\` updated from ${prev[s] !== undefined ? prev[s] : 0} to ${current[s]}.`);
    }
  });

  // Check window bounds
  if ((current.windowStart !== prev.windowStart) || (current.windowEnd !== prev.windowEnd)) {
    if (current.windowStart !== undefined && current.windowEnd !== undefined) {
      messages.push(`Sliding window shifted. Active range is indices [${current.windowStart} to ${current.windowEnd}].`);
    }
  }

  // Check Set elements
  for (const key in current) {
    if (current[key] instanceof Set) {
      const currSet = current[key];
      const prevSet = prev && prev[key] instanceof Set ? prev[key] : new Set();
      
      const added = Array.from(currSet).filter(x => !prevSet.has(x));
      const removed = Array.from(prevSet).filter(x => !currSet.has(x));
      
      if (added.length > 0) {
        messages.push(`Added element(s) ${added.map(x => `\`${x}\``).join(', ')} to \`${key}\`.`);
      }
      if (removed.length > 0) {
        messages.push(`Removed element(s) ${removed.map(x => `\`${x}\``).join(', ')} from \`${key}\`.`);
      }
    }
  }

  if (messages.length === 0) {
    return "Executing current line operations and performing conditional expressions check.";
  }

  return messages.join(' ');
}

/**
 * Runs user code in a safe local environment and yields structural animation frames.
 */
export function runCustomTrace(code: string, inputs: Record<string, any>): DynamicStep[] {
  // Normalize non-breaking spaces (\u00A0) to standard spaces to prevent compilation syntax errors
  const normalizedCode = code.replace(/\u00A0/g, ' ');
  let compilableJS = normalizedCode;
  const isJava = normalizedCode.includes('public ') || normalizedCode.includes('int[]') || normalizedCode.includes('String ') || normalizedCode.includes('class Solution');
  
  if (isJava) {
    compilableJS = cleanJavaToJS(normalizedCode);
  }

  const { instrumentedCode } = instrumentCode(compilableJS);
  const rawFrames: { line: number; state: any }[] = [];

  const _trace = (line: number, state: any) => {
    const stateClone: any = {};
    for (const key in state) {
      if (state[key] !== undefined) {
        if (Array.isArray(state[key])) {
          stateClone[key] = [...state[key]];
        } else if (state[key] instanceof Set) {
          stateClone[key] = new Set(state[key]);
        } else if (state[key] instanceof Map) {
          stateClone[key] = new Map(state[key]);
        } else {
          stateClone[key] = state[key];
        }
      }
    }
    rawFrames.push({ line, state: stateClone });
  };

  // Helper inside sandbox to convert arrays to LinkedList nodes
  let varsPrepend = `
function arrayToList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const dummy = new ListNode(0);
  let curr = dummy;
  for (const val of arr) {
    curr.next = new ListNode(val);
    curr = curr.next;
  }
  return dummy.next;
}
`;

  // Prepend local variable assignments dynamically based on inputs record
  for (const [key, val] of Object.entries(inputs)) {
    const valStr = JSON.stringify(val);
    varsPrepend += `const raw_${key} = ${valStr};\n`;
    const isListVar = key.toLowerCase().startsWith('l') || key.toLowerCase().includes('list') || key.toLowerCase() === 'head';
    if (isListVar && Array.isArray(val)) {
      varsPrepend += `const ${key} = arrayToList(raw_${key});\n`;
    } else {
      varsPrepend += `const ${key} = raw_${key};\n`;
    }
  }

  let executionWrapper = `
class ListNode {
  constructor(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
  }
}
class TreeNode {
  constructor(val, left, right) {
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
  }
}
class StringBuilder {
  constructor(val = "") {
    this.str = String(val);
  }
  append(x) {
    this.str += String(x);
    return this;
  }
  toString() {
    return this.str;
  }
  length() {
    return this.str.length;
  }
}
class ArrayList extends Array {
  add(item) {
    this.push(item);
    return true;
  }
  get(idx) {
    return this[idx];
  }
  set(idx, item) {
    this[idx] = item;
  }
  size() {
    return this.length;
  }
  isEmpty() {
    return this.length === 0;
  }
  clear() {
    this.length = 0;
  }
}
const List = ArrayList;
if (!String.prototype.toCharArray) {
  String.prototype.toCharArray = function() {
    return this.split('');
  };
}
${varsPrepend}
` + instrumentedCode;

  // Extract function parameter names to preserve call order
  let paramNames: string[] = [];
  const methodMatch = compilableJS.match(/(?:class\s+\w+|function\s+(\w+))\s*[^]*?(\w+)\s*\(([^)]*)\)\s*\{/);
  if (methodMatch) {
    paramNames = methodMatch[3].split(',').map(p => p.trim()).filter(p => p.length > 0);
  } else {
    const sigMatch = compilableJS.match(/(?:function\s+)?\w+\s*\(([^)]*)\)/);
    if (sigMatch && sigMatch[1]) {
      paramNames = sigMatch[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
    }
  }

  try {
    // Check for standard named function
    let funcName = "";
    const namedFuncMatch = compilableJS.match(/function\s+(\w+)\s*\(/);
    
    if (namedFuncMatch) {
      funcName = namedFuncMatch[1];
    } else {
      // Check for variable assigned function
      const varFuncMatch = compilableJS.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
      if (varFuncMatch) {
        funcName = varFuncMatch[1];
      }
    }

    if (funcName && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(funcName)) {
      executionWrapper += `\n${funcName}(${paramNames.join(', ')});`;
    } else {
      const classMatch = compilableJS.match(/class\s+(\w+)/);
      if (classMatch) {
        const methods = Array.from(compilableJS.matchAll(/\b(\w+)\s*\([^)]*\)\s*\{/g)).map(m => m[1]);
        const method = methods.find(m => !['Solution', 'if', 'for', 'while', 'switch', 'catch'].includes(m));
        
        if (method) {
          executionWrapper += `\nconst sol = new Solution();\nsol.${method}(${paramNames.join(', ')});`;
        } else {
          executionWrapper += `\nconst sol = new Solution();\nsol.solve(${paramNames.join(', ')});`;
        }
      }
    }

    console.log("Executing Instrumented JS Code:\n", executionWrapper);

    const runner = new Function('_trace', executionWrapper);
    runner(_trace);
  } catch (err: any) {
    console.error("Execution Sandbox Error:", err);
    console.log("Wrapper Code Context when failed:\n", executionWrapper);
    return [{
      line: 1,
      explanation: `Syntax or Runtime Error: ${err.message}`,
      state: {}
    }];
  }

  // Fallback array for explanation references
  const firstInputArray = Object.values(inputs).find(v => Array.isArray(v)) || [];

  return rawFrames.map((frame, index) => {
    const prevFrame = index > 0 ? rawFrames[index - 1] : null;
    const explanation = generateExplanation(frame.state, prevFrame?.state, firstInputArray);
    
    // Inject inputs so they are globally readable in states
    for (const [k, v] of Object.entries(inputs)) {
      if (frame.state[k] === undefined) {
        frame.state[k] = v;
      }
    }

    return {
      line: frame.line,
      explanation,
      state: frame.state
    };
  });
}
