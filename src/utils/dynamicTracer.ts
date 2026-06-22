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
 * Automatically injects trace statements into JavaScript code.
 */
export function instrumentCode(code: string): { instrumentedCode: string; variables: string[] } {
  const vars = new Set<string>();

  // Add standard visualization pointers & values
  const commonVars = ['left', 'right', 'mid', 'i', 'j', 'sum', 'maxSum', 'windowSum', 'windowStart', 'windowEnd', 'target'];
  commonVars.forEach(v => vars.add(v));

  // Extract variables declared with let, const, or var
  const varRegex = /\b(?:let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = varRegex.exec(code)) !== null) {
    vars.add(match[1]);
  }

  // Extract function parameters
  const paramRegex = /function\s+\w+\s*\(([^)]*)\)/;
  const paramMatch = code.match(paramRegex);
  if (paramMatch && paramMatch[1]) {
    paramMatch[1].split(',').forEach(p => {
      const name = p.trim().split('=')[0].trim();
      if (name) vars.add(name);
    });
  }

  const varList = Array.from(vars);
  const lines = code.split('\n');
  const instrumentedLines: string[] = [];

  // Generate a safe object mapping string: { i: typeof i !== 'undefined' ? i : undefined, ... }
  const stateObjStr = '{ ' + varList.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(', ') + ' }';

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('import') || trimmed.startsWith('console.')) {
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
      instrumentedLines.push(line);
      instrumentedLines.push(`_trace(${lineNum}, ${stateObjStr});`);
    }
  }

  return {
    instrumentedCode: instrumentedLines.join('\n'),
    variables: varList
  };
}

/**
 * Auto-generates explanation text for the dynamic changes between steps.
 */
function generateExplanation(current: any, prev: any, array: number[]): string {
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

  if (messages.length === 0) {
    return "Executing current line operations and performing conditional expressions check.";
  }

  return messages.join(' ');
}

/**
 * Runs user code in a safe local environment and yields structural animation frames.
 */
export function runCustomTrace(code: string, customArray: number[], target?: number): DynamicStep[] {
  const { instrumentedCode } = instrumentCode(code);
  const rawFrames: { line: number; state: any }[] = [];

  const _trace = (line: number, state: any) => {
    const stateClone: any = {};
    for (const key in state) {
      if (state[key] !== undefined) {
        if (Array.isArray(state[key])) {
          stateClone[key] = [...state[key]];
        } else {
          stateClone[key] = state[key];
        }
      }
    }
    rawFrames.push({ line, state: stateClone });
  };

  try {
    // Detect code wrapper type (e.g. function, class method, or plain script)
    const funcMatch = code.match(/function\s+(\w+)/);
    let executionWrapper = instrumentedCode;

    if (funcMatch) {
      const funcName = funcMatch[1];
      executionWrapper += `\n${funcName}(args_nums, args_target);`;
    } else {
      const classMatch = code.match(/class\s+(\w+)/);
      if (classMatch) {
        // Look for the first method inside the Solution class
        const methodMatch = code.match(/(\w+)\s*\(\s*(?:nums|arr)/);
        if (methodMatch) {
          executionWrapper += `\nconst sol = new Solution();\nsol.${methodMatch[1]}(args_nums, args_target);`;
        } else {
          executionWrapper += `\nconst sol = new Solution();\nsol.solve(args_nums, args_target);`;
        }
      } else {
        // Plain statements wrapper
        executionWrapper = `const nums = args_nums;\nconst target = args_target;\n` + executionWrapper;
      }
    }

    const runner = new Function('args_nums', 'args_target', '_trace', executionWrapper);
    runner(customArray, target, _trace);
  } catch (err: any) {
    console.error("Execution Sandbox Error:", err);
    return [{
      line: 1,
      explanation: `Syntax or Runtime Error: ${err.message}`,
      state: { arr: customArray }
    }];
  }

  // Construct complete DynamicStep elements with explanations
  return rawFrames.map((frame, index) => {
    const prevFrame = index > 0 ? rawFrames[index - 1] : null;
    const explanation = generateExplanation(frame.state, prevFrame?.state, customArray);
    
    // Inject defaults
    if (!frame.state.arr) {
      frame.state.arr = customArray;
    }
    if (target !== undefined && frame.state.target === undefined) {
      frame.state.target = target;
    }

    return {
      line: frame.line,
      explanation,
      state: frame.state
    };
  });
}
