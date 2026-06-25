import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { PRESETS, AlgorithmPreset } from './presets';
import { runCustomTrace, DynamicStep } from './utils/dynamicTracer';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  Terminal, 
  Layers, 
  PlayCircle,
  HelpCircle,
  Hash,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  BookOpen
} from 'lucide-react';

interface ScrapedExample {
  label: string;
  variables: Record<string, string>;
  output: string;
}

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string>('twoSum');
  const [code, setCode] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [expectedOutput, setExpectedOutput] = useState<string>('');
  const [examples, setExamples] = useState<ScrapedExample[]>([]);
  const [activeExampleLabel, setActiveExampleLabel] = useState<string>('');
  
  const [steps, setSteps] = useState<DynamicStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const [compileError, setCompileError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('algovision-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const [customTitle, setCustomTitle] = useState<string>('');
  const [isResizingHorizontally, setIsResizingHorizontally] = useState<boolean>(false);
  const [isResizingVertically, setIsResizingVertically] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(40); // default 40%
  const [leftTopHeight, setLeftTopHeight] = useState<number>(260); // default 260px

  // Floating Variable Watcher draggable state
  const [watcherOffset, setWatcherOffset] = useState({ x: 0, y: 0 });
  const [isDraggingWatcher, setIsDraggingWatcher] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWatcherPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingWatcher(true);
    setDragStart({
      x: e.clientX - watcherOffset.x,
      y: e.clientY - watcherOffset.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleWatcherPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWatcher) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setWatcherOffset({ x: newX, y: newY });
  };

  const handleWatcherPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingWatcher(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationRef = useRef<string[]>([]);
  const intervalRef = useRef<any>(null);

  const canvasParentRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (!canvasParentRef.current || !canvasContentRef.current) return;
      
      // Temporary reset to measure natural size
      canvasContentRef.current.style.transform = 'scale(1)';
      
      requestAnimationFrame(() => {
        if (!canvasParentRef.current || !canvasContentRef.current) return;
        const parentWidth = canvasParentRef.current.clientWidth - 16;
        const parentHeight = canvasParentRef.current.clientHeight - 16;
        
        const contentWidth = canvasContentRef.current.scrollWidth;
        const contentHeight = canvasContentRef.current.scrollHeight;
        
        if (contentWidth > 0 && contentHeight > 0) {
          const widthRatio = parentWidth / contentWidth;
          const heightRatio = parentHeight / contentHeight;
          const newScale = Math.min(1, Math.min(widthRatio, heightRatio) * 0.98);
          setScaleFactor(newScale);
        }
      });
    };

    updateScale();
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (canvasParentRef.current) {
      resizeObserver.observe(canvasParentRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentStepIndex, steps, code]);

  // const getActiveWindowSlice = () => {
  //   const arrays = getDetectedArrays();
  //   if (arrays.length === 0) return '[]';
  //   const arr = arrays[0].values;
  //   const l = currentStep?.state?.left ?? currentStep?.state?.windowStart ?? currentStep?.state?.i;
  //   const r = currentStep?.state?.right ?? currentStep?.state?.windowEnd ?? currentStep?.state?.j ?? currentStep?.state?.r;
  //   if (l !== undefined && r !== undefined) {
  //     const lNum = Number(l);
  //     const rNum = Number(r);
  //     if (lNum <= rNum && rNum < arr.length) {
  //       return `[${arr.slice(lNum, rNum + 1).join(' ')}]`;
  //     }
  //   }
  //   return '[]';
  // };

  // const getCurrentSum = () => {
  //   if (!currentStep) return '0';
  //   const s = currentStep.state.sum ?? currentStep.state.val ?? currentStep.state.windowSum ?? currentStep.state.temp;
  //   if (s !== undefined) return String(s);
  //   return '0';
  // };

  const getMaxSum = () => {
    if (!currentStep) return '0';
    const m = currentStep.state.maxSum ?? currentStep.state.best ?? currentStep.state.ans ?? currentStep.state.result;
    if (m !== undefined) return String(m);
    return '0';
  };

  // const isMaxUpdated = () => {
  //   if (!currentStep || currentStepIndex === 0 || !prevStep) return false;
  //   const currMax = currentStep.state.maxSum !== undefined ? currentStep.state.maxSum : currentStep.state.best;
  //   const prevMax = prevStep.state.maxSum !== undefined ? prevStep.state.maxSum : prevStep.state.best;
  //   return currMax !== undefined && prevMax !== undefined && currMax > prevMax;
  // };

  // const getBestSubarrayWindow = () => {
  //   let maxVal = -Infinity;
  //   let bestL = -1;
  //   let bestR = -1;
  //   
  //   for (let i = 0; i <= currentStepIndex; i++) {
  //     const step = steps[i];
  //     if (!step || !step.state) continue;
  //      const m = step.state.maxSum ?? step.state.best ?? step.state.ans ?? step.state.result;
  //     
  //     if (m !== undefined && Number(m) > maxVal) {
  //       maxVal = Number(m);
  //       const l = step.state.left ?? step.state.windowStart ?? step.state.i;
  //       const r = step.state.right ?? step.state.windowEnd ?? step.state.j ?? step.state.r;
  //       if (l !== undefined && r !== undefined) {
  //         bestL = Number(l);
  //         bestR = Number(r);
  //       }
  //     }
  //   }
  //   
  //   if (bestL !== -1 && bestR !== -1) {
  //     return { left: bestL, right: bestR, val: maxVal };
  //   }
  //   return null;
  // };

  const getOutputIndices = (): number[] => {
    if (!expectedOutput) return [];
    try {
      const trimmed = expectedOutput.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is number => typeof x === 'number');
        }
      }
      const num = Number(trimmed);
      if (!isNaN(num) && Number.isInteger(num)) {
        return [num];
      }
    } catch (e) {}
    return [];
  };

  const getDetectedMapsAndSets = () => {
    if (!currentStep || !currentStep.state) return [];
    const results: { name: string; type: 'map' | 'set'; values: any }[] = [];
    for (const [key, val] of Object.entries(currentStep.state)) {
      if (val instanceof Map) {
        results.push({ name: key, type: 'map', values: val });
      } else if (val instanceof Set) {
        results.push({ name: key, type: 'set', values: val });
      }
    }
    return results;
  };

  const preset: AlgorithmPreset = PRESETS[activePresetId];
  const currentStep = steps[currentStepIndex] || null;
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;

  // Synthesize custom sound effects in real-time
  const playSound = (type: 'tick' | 'pop' | 'ding' | 'click') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'ding') {
        const playBellTone = (freq: number, gainVal: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(gainVal, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + duration);
        };
        playBellTone(950, 0.18, 0.4);
        playBellTone(1900, 0.06, 0.22);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
    } catch (e) {
      console.warn("Failed to play synthesized sound effect:", e);
    }
  };

  // Synchronized sound effects engine
  useEffect(() => {
    if (steps.length === 0 || !currentStep) return;
    
    // Play Click sound when explanation changes
    playSound('click');

    if (currentStepIndex > 0 && prevStep) {
      const currMax = currentStep.state.maxSum !== undefined ? currentStep.state.maxSum : currentStep.state.best;
      const prevMax = prevStep.state.maxSum !== undefined ? prevStep.state.maxSum : prevStep.state.best;
      
      if (currMax !== undefined && prevMax !== undefined && currMax > prevMax) {
        playSound('ding');
      } else {
        const currPointers = ['left', 'right', 'mid', 'windowStart', 'windowEnd', 'i', 'j', 'r']
          .map(p => currentStep.state[p])
          .filter(v => v !== undefined);
        const prevPointers = ['left', 'right', 'mid', 'windowStart', 'windowEnd', 'i', 'j', 'r']
          .map(p => prevStep?.state[p])
          .filter(v => v !== undefined);
          
        const pointersMoved = currPointers.some((val, idx) => val !== prevPointers[idx]);
        if (pointersMoved) {
          playSound('tick');
        } else {
          playSound('pop');
        }
      }
    } else {
      playSound('pop');
    }
  }, [currentStepIndex, steps]);

  // Initialize preset or load URL parameters from LeetCode Chrome Extension
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramCode = params.get('code');
    const paramExamplesStr = params.get('examples');
    const paramTitle = params.get('title');
    const hasUrlParams = window.location.search.includes('code=');

    if (hasUrlParams && paramCode) {
      setCode(paramCode);
      if (paramTitle) {
        setCustomTitle(paramTitle);
      } else {
        setCustomTitle('Custom Solution');
      }
      
      let parsedExamples: ScrapedExample[] = [];
      try {
        parsedExamples = JSON.parse(paramExamplesStr || '[]');
      } catch (e) {}

      setExamples(parsedExamples);

      if (parsedExamples.length > 0) {
        const first = parsedExamples[0];
        const cleanedVars: Record<string, string> = {};
        for (const [k, v] of Object.entries(first.variables || {})) {
          const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, '');
          if (cleanKey) cleanedVars[cleanKey] = v as string;
        }
        setCustomInputs(cleanedVars);
        setExpectedOutput(first.output || '');
        setActiveExampleLabel(first.label);
        
        const evaluatedInputs: Record<string, any> = {};
        for (const [k, v] of Object.entries(cleanedVars)) {
          try {
            evaluatedInputs[k] = JSON.parse(v as string);
          } catch (e) {
            evaluatedInputs[k] = Number(v) || v;
          }
        }
        handleCompileAndRun(paramCode, evaluatedInputs);
      } else {
        // Fallback if no examples scraped
        const fallback = { nums: '[2,7,11,15]', target: '9' };
        setCustomInputs(fallback);
        setExpectedOutput('');
        handleCompileAndRun(paramCode, { nums: [2, 7, 11, 15], target: 9 });
      }
    } else {
      setCode(preset.code);
      setCustomInputs(preset.defaultInputs);
      setExpectedOutput(preset.expectedOutput || '');
      setExamples([]);
      setActiveExampleLabel('');
      setCustomTitle('');
      
      const evaluatedInputs: Record<string, any> = {};
      for (const [k, v] of Object.entries(preset.defaultInputs)) {
        try {
          evaluatedInputs[k] = JSON.parse(v);
        } catch (e) {
          evaluatedInputs[k] = Number(v) || v;
        }
      }
      handleCompileAndRun(preset.code, evaluatedInputs);
    }
  }, [activePresetId]);

  // Set up real-time listener from LeetCode parent tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'LEETCODE_CODE_CHANGE') {
        setCode(event.data.code);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Synchronize code and custom inputs with URL query parameters to persist changes on refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (params.has('code') && code && params.get('code') !== code) {
      params.set('code', code);
      changed = true;
    }

    if (params.has('examples') && Object.keys(customInputs).length > 0) {
      try {
        const parsedExamples = JSON.parse(params.get('examples') || '[]');
        if (parsedExamples.length > 0) {
          const updatedExamples = [...parsedExamples];
          // Find the active example by label or use the first one
          const activeIdx = updatedExamples.findIndex(ex => ex.label === activeExampleLabel);
          const targetIdx = activeIdx !== -1 ? activeIdx : 0;
          
          updatedExamples[targetIdx] = {
            ...updatedExamples[targetIdx],
            variables: customInputs
          };
          
          const newExamplesStr = JSON.stringify(updatedExamples);
          if (params.get('examples') !== newExamplesStr) {
            params.set('examples', newExamplesStr);
            changed = true;
          }
        }
      } catch (e) {}
    }

    if (changed) {
      const newRelativePathQuery = window.location.pathname + '?' + params.toString();
      window.history.replaceState(null, '', newRelativePathQuery);
    }
  }, [code, customInputs, activeExampleLabel]);

  // Periodically send code back to LeetCode parent tab to restore code if LeetCode page is refreshed
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.opener) {
        window.opener.postMessage({ type: 'ALGOVISION_CODE_CHANGE', code }, '*');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [code]);

  // Handle horizontal resize dragging
  useEffect(() => {
    if (!isResizingHorizontally) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const newWidthPercent = Math.max(20, Math.min(85, (e.clientX / containerWidth) * 100));
      setLeftWidth(newWidthPercent);
    };

    const handleMouseUp = () => {
      setIsResizingHorizontally(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHorizontally]);

  // Handle vertical resize dragging (in the left column)
  useEffect(() => {
    if (!isResizingVertically) return;

    const handleMouseMove = (e: MouseEvent) => {
      const inputsElement = document.getElementById('inputs-config-container');
      if (inputsElement) {
        const rect = inputsElement.getBoundingClientRect();
        const newHeight = Math.max(120, Math.min(600, e.clientY - rect.top));
        setLeftTopHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingVertically(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertically]);

  // Main compiler handler
  const handleCompileAndRun = (codeSource: string, inputsMap?: Record<string, any>) => {
    setCompileError(null);
    setIsPlaying(false);
    
    let evaluatedInputs: Record<string, any> = {};
    if (inputsMap) {
      evaluatedInputs = inputsMap;
    } else {
      for (const [k, v] of Object.entries(customInputs)) {
        const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, '');
        if (!cleanKey) continue;
        try {
          evaluatedInputs[cleanKey] = JSON.parse(v);
        } catch (e) {
          const num = Number(v);
          evaluatedInputs[cleanKey] = isNaN(num) ? v : num;
        }
      }
    }

    const traceResults = runCustomTrace(codeSource, evaluatedInputs);
    
    if (traceResults.length > 0) {
      if (traceResults[0].explanation.startsWith("Syntax or Runtime Error:")) {
        setCompileError(traceResults[0].explanation);
        setSteps([{
          line: 1,
          explanation: traceResults[0].explanation,
          state: { ...evaluatedInputs }
        }]);
        setCurrentStepIndex(0);
      } else {
        setCompileError(null);
        setSteps(traceResults);
        setCurrentStepIndex(0);
      }
    }
  };

  // Load a scraped testcase example
  const handleLoadExample = (ex: ScrapedExample) => {
    setActiveExampleLabel(ex.label);
    const cleanedVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(ex.variables || {})) {
      const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, '');
      if (cleanKey) cleanedVars[cleanKey] = v as string;
    }
    setCustomInputs(cleanedVars);
    setExpectedOutput(ex.output || '');
    
    const evaluatedInputs: Record<string, any> = {};
    for (const [k, v] of Object.entries(cleanedVars)) {
      try {
        evaluatedInputs[k] = JSON.parse(v as string);
      } catch (e) {
        const num = Number(v);
        evaluatedInputs[k] = isNaN(num) ? v : num;
      }
    }
    
    handleCompileAndRun(code, evaluatedInputs);
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying && steps.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length, playbackSpeed]);

  // Highlight active lines
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      if (currentStep && steps.length > 0) {
        decorationRef.current = editor.deltaDecorations(decorationRef.current, [
          {
            range: new monaco.Range(currentStep.line, 1, currentStep.line, 1),
            options: {
              isWholeLine: true,
              className: 'bg-indigo-500/15 border-l-4 border-indigo-500',
            },
          },
        ]);
        editor.revealLineInCenterIfOutsideViewport(currentStep.line);
      } else {
        decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
      }
    }
  }, [currentStep?.line, steps, code]);

  // Intercept Ctrl+S globally to compile and run code
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCompileAndRun(code);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [code]);

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register Ctrl+S keyboard shortcut inside Monaco to compile and run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentCode = editor.getValue();
      handleCompileAndRun(currentCode);
    });
  };

  const handleStepNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleStepPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleCycleSpeed = () => {
    setPlaybackSpeed((prev) => {
      if (prev === 1500) return 1000;
      if (prev === 1000) return 300;
      return 1500;
    });
  };

  const getSpeedLabel = () => {
    if (playbackSpeed === 1500) return '0.5x';
    if (playbackSpeed === 1000) return '1.0x';
    return '3.0x';
  };

  // Helper to convert a linked list node structure to an array of values
  const listNodeToArray = (node: any): any[] => {
    const vals = [];
    let curr = node;
    const visited = new Set(); // Prevent infinite loops in cyclic lists
    while (curr && typeof curr === 'object' && 'val' in curr && !visited.has(curr)) {
      visited.add(curr);
      vals.push(curr.val);
      curr = curr.next;
    }
    return vals;
  };

  // DYNAMICALLY EXTRACT ALL ARRAYS (NUMBERS & CHARACTERS) IN STATE
  const getDetectedArrays = (): { name: string; values: any[]; is2D?: boolean; originalType?: string }[] => {
    if (!currentStep || !currentStep.state) return [];
    const arrays: { name: string; values: any[]; is2D?: boolean; originalType?: string }[] = [];
    
    for (const [key, val] of Object.entries(currentStep.state)) {
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          // Check if it's a 2D array (array of arrays, or array of strings, or array of StringBuilders)
          const is2DArray = val.length > 0 && val.every(item => {
            if (Array.isArray(item)) return true;
            if (typeof item === 'string') return true;
            if (item && typeof item === 'object' && 'str' in item) return true; // polyfilled StringBuilder
            return false;
          });
          
          if (is2DArray) {
            // Normalize rows for visualization
            const normalizedRows = val.map(item => {
              if (Array.isArray(item)) return item;
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object' && 'str' in item) return String(item.str);
              return String(item);
            });
            arrays.push({ name: key, values: normalizedRows, is2D: true, originalType: '2d' });
          } else if (val.every(item => typeof item === 'number' || typeof item === 'string')) {
            arrays.push({ name: key, values: val, originalType: '1d' });
          }
        } else if (typeof val === 'string' && val.length >= 1 && key !== 'expectedOutput' && !key.toLowerCase().includes('output') && key !== 'code' && key !== 'activePresetId') {
          arrays.push({ name: key, values: val.split(''), originalType: 'string' });
        } else if (typeof val === 'object' && 'val' in val && 'next' in val) {
          // It's a ListNode! Convert it to an array of values for visualization!
          arrays.push({ name: key, values: listNodeToArray(val), originalType: 'linkedlist' });
        } else if (val && typeof val === 'object' && 'str' in val) {
          // Polyfilled StringBuilder
          arrays.push({ name: key, values: String(val.str).split(''), originalType: 'string' });
        }
      }
    }
    
    // Fallback if no array was explicitly captured in step scope
    if (arrays.length === 0 && currentStep.state.arr) {
      arrays.push({ name: 'nums', values: currentStep.state.arr, originalType: '1d' });
    }
    return arrays;
  };

  const detectedArrays = getDetectedArrays();

  // DYNAMICALLY LOCATE POINTERS FOR AN ARRAY BY DETECTING SCOPE INTEGERS
  const getPointersForArray = (arrayLength: number): Record<number, string[]> => {
    if (!currentStep || !currentStep.state) return {};
    const pointers: Record<number, string[]> = {};
    
    // Ignore quantities, metrics, or benchmarks that represent answers instead of indices
    const ignoreKeywords = ['target', 'sum', 'max', 'min', 'count', 'length', 'size', 'k', 'n', 'val', 'ans', 'result', 'temp', 'complement', 'diff', 'difference', 'num', 'element', 'key', 'value', 'hash', 'code'];

    for (const [key, val] of Object.entries(currentStep.state)) {
      const isIgnored = ignoreKeywords.some(kw => key.toLowerCase().includes(kw));
      
      if (
        typeof val === 'number' && 
        Number.isInteger(val) && 
        val >= 0 && 
        val < arrayLength &&
        !isIgnored
      ) {
        if (!pointers[val]) {
          pointers[val] = [];
        }
        pointers[val].push(key);
      }
    }
    return pointers;
  };

  // Helper to extract watch variables with trend lines
  const getInspectorVariables = () => {
    if (!currentStep || !currentStep.state) return [];
    const entries: { key: string; value: any; trend: 'up' | 'down' | 'none' }[] = [];
    const arrays = getDetectedArrays();
    const arrayNames = arrays.map(a => a.name);

    for (const [key, val] of Object.entries(currentStep.state)) {
      if (
        !arrayNames.includes(key) && 
        key !== 'arr' && 
        key !== 'comparing' && 
        key !== 'swapping' && 
        key !== 'tree' && 
        key !== 'stack' && 
        val !== undefined
      ) {
        let trend: 'up' | 'down' | 'none' = 'none';
        if (prevStep && prevStep.state && prevStep.state[key] !== undefined) {
          const prevVal = prevStep.state[key];
          if (typeof val === 'number' && typeof prevVal === 'number') {
            if (val > prevVal) trend = 'up';
            else if (val < prevVal) trend = 'down';
          }
        }
        
        let formattedValue = '';
        if (val instanceof Set) {
          formattedValue = `{${Array.from(val).map(x => typeof x === 'string' ? `'${x}'` : String(x)).join(', ')}}`;
        } else if (val instanceof Map) {
          const pairs = Array.from(val.entries()).map(([k, v]) => `${k} => ${v}`).join(', ');
          formattedValue = `{${pairs}}`;
        } else {
          formattedValue = typeof val === 'object' ? JSON.stringify(val) : String(val);
        }

        entries.push({ 
          key, 
          value: formattedValue,
          trend 
        });
      }
    }
    return entries;
  };

  // Computes active comparison math details dynamically for any index variables
  const getActiveComparisonDetails = () => {
    if (!currentStep || !currentStep.state || detectedArrays.length === 0) return null;
    const { state } = currentStep;
    const target = state.target;
    
    const ignoreKeywords = ['target', 'sum', 'max', 'min', 'count', 'length', 'size', 'k', 'n', 'val', 'ans', 'result', 'temp', 'complement', 'diff', 'difference', 'num', 'element', 'key', 'value', 'hash', 'code'];
    const pointers: { name: string; val: number }[] = [];
    for (const [key, val] of Object.entries(state)) {
      const isIgnored = ignoreKeywords.some(kw => key.toLowerCase().includes(kw));
      if (typeof val === 'number' && Number.isInteger(val) && !isIgnored) {
        pointers.push({ name: key, val });
      }
    }

    if (pointers.length >= 2) {
      const activeArray = detectedArrays[0];
      const p1 = pointers[0];
      const p2 = pointers[1];
      
      if (p1.val >= 0 && p1.val < activeArray.values.length && p2.val >= 0 && p2.val < activeArray.values.length) {
        const valI = activeArray.values[p1.val];
        const valJ = activeArray.values[p2.val];
        const sum = valI + valJ;
        const match = sum === target;
        return { 
          arrayName: activeArray.name,
          p1Name: p1.name,
          p2Name: p2.name,
          p1Val: p1.val,
          p2Val: p2.val,
          valI, 
          valJ, 
          sum, 
          target, 
          match 
        };
      }
    }
    return null;
  };

  const mathDetails = getActiveComparisonDetails();

  return (
    <div className={`flex flex-col h-screen bg-bg-page text-text-main font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Branding HUD */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border-main bg-bg-panel transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 animate-pulse">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-200 to-white bg-clip-text text-transparent">
              AlgoVision Studio
            </h1>
            <p className="text-xs text-slate-500 font-mono">DYNAMIC RUNTIME INTERFACE</p>
          </div>
        </div>

        {/* Preset Selectors or Problem Title */}
        {window.location.search.includes('code=') ? (
          <div className="flex items-center gap-2 bg-bg-inner border border-border-main px-4 py-2.5 rounded-2xl transition-colors duration-300">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold font-mono tracking-wider text-indigo-300">
              {customTitle || 'Custom LeetCode Solution'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-bg-inner border border-border-main p-1.5 rounded-2xl transition-colors duration-300">
            {Object.values(PRESETS).map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono tracking-wider transition-all duration-300 ${
                  activePresetId === p.id && examples.length === 0
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const nextTheme = theme === 'light' ? 'dark' : 'light';
              setTheme(nextTheme);
              localStorage.setItem('algovision-theme', nextTheme);
            }}
            className="px-3 py-1.5 rounded-xl border border-border-main bg-bg-panel hover:bg-bg-inner text-text-main text-xs font-semibold font-mono tracking-wider transition-all duration-200 flex items-center gap-1.5 shadow-sm"
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <div className="flex items-center gap-2 border-l border-border-main pl-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-500 font-mono tracking-wider uppercase">COMPILER ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Overlay to catch all pointer events during resize dragging */}
      {(isResizingHorizontally || isResizingVertically) && (
        <div 
          className="fixed inset-0 z-50 select-none pointer-events-auto" 
          style={{ cursor: isResizingHorizontally ? 'col-resize' : 'row-resize' }} 
        />
      )}

      {/* Main Workstation */}
      <main className="flex flex-1 overflow-hidden p-6 gap-0">
        
        {/* Left Side: Editor & Configuration inputs */}
        <div 
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Inputs Config */}
          <div 
            id="inputs-config-container"
            style={{ height: `${leftTopHeight}px` }}
            className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4 overflow-y-auto flex-shrink-0"
          >
            <h2 className="text-xs font-bold font-mono text-slate-400 flex items-center gap-2 tracking-wider">
              <Hash className="w-4 h-4 text-indigo-400" />
              EXECUTION INPUTS CONFIGURATION
            </h2>

            {/* Injected Examples chips if scraped */}
            {examples.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-slate-900 pb-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Scraped LeetCode Testcases:
                </span>
                <div className="flex gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => handleLoadExample(ex)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border ${
                        activeExampleLabel === ex.label
                          ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-300 shadow shadow-indigo-500/10 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-4">
              {Object.entries(customInputs).map(([key, val]) => (
                <div key={key} className="col-span-6 flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Input Variable ({key})</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      setCustomInputs(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }));
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-600 transition-colors w-full"
                    placeholder={`Value for ${key}`}
                  />
                </div>
              ))}
              {expectedOutput && (
                <div className="col-span-12 flex flex-col gap-1.5 border-t border-slate-900/50 pt-2.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Expected Output</label>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-400">
                    {expectedOutput}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => handleCompileAndRun(code)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:opacity-90 font-bold text-xs tracking-widest text-white shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-indigo-500/20 active:scale-[0.99]"
            >
              <PlayCircle className="w-4 h-4" />
              COMPILE & RUN VISUALIZATION
            </button>
          </div>

          {/* Vertical Drag Handle (Row Resizer) */}
          <div 
            onMouseDown={() => setIsResizingVertically(true)}
            className="h-5 cursor-row-resize flex items-center justify-center group flex-shrink-0"
          >
            <div className={`h-1 w-24 rounded-full transition-all duration-300 ${
              isResizingVertically 
                ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] w-32' 
                : 'bg-slate-800 group-hover:bg-indigo-500 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)]'
            }`} />
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                {code.includes('class ') || code.includes('public ') || code.includes('private ') || code.includes('ListNode') || code.includes('TreeNode') ? 'Solution.java' : 'solution.js'}
              </span>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/60 px-2 py-0.5 rounded-full">
                CUSTOM CODE SUPPORT
              </span>
            </div>
            <div className="flex-1 bg-slate-950/60 p-2">
              <Editor
                height="100%"
                language={code.includes('class ') || code.includes('public ') || code.includes('private ') || code.includes('ListNode') || code.includes('TreeNode') ? 'java' : 'javascript'}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={code}
                onChange={(val) => {
                  const updated = val || '';
                  setCode(updated);
                  if (window.opener) {
                    window.opener.postMessage({ type: 'ALGOVISION_CODE_CHANGE', code: updated }, '*');
                  }
                }}
                onMount={handleEditorDidMount}
                options={{
                  readOnly: false,
                  fontSize: 14,
                  fontFamily: 'Fira Code',
                  lineNumbers: 'on',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineDecorationsWidth: 10,
                  scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                  guides: {
                    indentation: false
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Horizontal Drag Handle (Column Resizer) */}
        <div 
          onMouseDown={() => setIsResizingHorizontally(true)}
          className="w-6 cursor-col-resize flex items-center justify-center group flex-shrink-0"
        >
          <div className={`w-1 h-24 rounded-full transition-all duration-300 ${
            isResizingHorizontally 
              ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] h-32' 
              : 'bg-slate-800 group-hover:bg-indigo-500 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)]'
          }`} />
        </div>

        {/* Right Side: Dynamic Visualizer Area */}
        <div className="flex flex-col flex-1 gap-6 overflow-hidden">
          <div className="relative flex-1 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                UNIVERSAL ALGORITHM ARRAY POINTER VISUALIZER
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono font-semibold">Timeline Step:</span>
                <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/60 px-2.5 py-0.5 rounded-full">
                  {steps.length > 0 ? `${currentStepIndex + 1} / ${steps.length}` : '0 / 0'}
                </span>
              </div>
            </div>

            {/* Dynamic Rendering Canvas */}
            <div ref={canvasParentRef} className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/20 overflow-hidden relative w-full h-full min-h-0">
              <div 
                ref={canvasContentRef}
                style={{
                  transform: `scale(${scaleFactor})`,
                  transformOrigin: 'center center',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}
                className="min-h-0"
              >
                <>
                    {/* Compile Error Banner */}
                    {compileError && (
                      <div className="w-full max-w-xl px-4 py-3 rounded-2xl border border-rose-950/80 bg-rose-950/45 text-rose-300 font-mono text-xs flex items-start gap-3 shadow-lg shadow-rose-950/20 backdrop-blur-md transition-all duration-300">
                        <Terminal className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[10px] text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            Syntax or Runtime Error
                          </div>
                          <div className="leading-relaxed break-words text-rose-200">
                            {compileError.startsWith("Syntax or Runtime Error: ") ? compileError.slice("Syntax or Runtime Error: ".length) : compileError}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Math Banner */}
                    {mathDetails && (
                      <div className={`px-4 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-2 transition-all duration-300 transform scale-95 shadow-md ${
                        mathDetails.match 
                          ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-emerald-500/10' 
                          : 'bg-slate-900/90 border-slate-800 text-indigo-300'
                      }`}>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-500 uppercase">COMPARING</span>
                        <span>
                          {mathDetails.arrayName}[{mathDetails.p1Name}] + {mathDetails.arrayName}[{mathDetails.p2Name}] ➜ ({mathDetails.valI}) + ({mathDetails.valJ}) = {mathDetails.sum}
                        </span>
                        <span>{mathDetails.match ? '===' : '!=='}</span>
                        <span className={mathDetails.match ? 'text-emerald-400' : 'text-slate-500'}>
                          target ({mathDetails.target})
                        </span>
                      </div>
                    )}

                    {currentStep && currentStep.state && detectedArrays.length > 0 ? (
                      <>
                        <div className="w-full flex flex-row flex-wrap gap-4 justify-center items-center py-1">
                        
                        {/* Map and render each detected array automatically */}
                        {detectedArrays.map((arrayInfo, arrayIdx) => {
                          const pointers = getPointersForArray(arrayInfo.values.length);
                          const len = arrayInfo.values.length;
                          
                          // Dynamic sizing configurations based on number of items to prevent overflow/scrolling
                          let boxSizeClass = 'w-11 h-12 text-sm rounded-xl';
                          let badgeSizeClass = 'text-[9px] px-1 py-0.2';
                          let spacingClass = 'gap-1.5';
                          let containerGapClass = 'gap-1.5';
                          let pointerContainerHeight = 'h-10';
                          
                          if (detectedArrays.length > 1) {
                            boxSizeClass = 'w-9 h-10 text-xs rounded-lg';
                            spacingClass = 'gap-1';
                            containerGapClass = 'gap-1';
                            pointerContainerHeight = 'h-8';
                          }
                          
                          if (len > 8 && len <= 16) {
                            boxSizeClass = 'w-8 h-9 text-xs rounded-lg';
                            badgeSizeClass = 'text-[8px] px-0.8 py-0.2';
                            spacingClass = 'gap-1';
                            containerGapClass = 'gap-1';
                            pointerContainerHeight = 'h-8';
                          } else if (len > 16) {
                            boxSizeClass = 'w-6 h-7 text-[10px] rounded-md';
                            badgeSizeClass = 'text-[7px] px-0.5 py-0.1';
                            spacingClass = 'gap-0.5';
                            containerGapClass = 'gap-0.5';
                            pointerContainerHeight = 'h-7';
                          }
                          
                          // Dynamic sizing for 2D Grid
                          let gridBoxSizeClass = 'w-9 h-9 rounded-xl text-sm';
                          let gridGapClass = 'gap-1.5';
                          let gridPaddingClass = 'p-3.5';
                          let gridRowHeaderWidth = 'w-20';
                          let gridLabelSizeClass = 'text-[9px]';
                          
                          if (arrayInfo.is2D) {
                            const maxCols = Math.max(...arrayInfo.values.map(row => {
                              const cells = typeof row === 'string' ? row.split('') : (Array.isArray(row) ? row : [row]);
                              return cells.length;
                            }), 0);
                            const numRows = arrayInfo.values.length;
                            
                            if (numRows > 12 || maxCols > 24) {
                              gridBoxSizeClass = 'w-5 h-5 rounded text-[8px]';
                              gridGapClass = 'gap-0.5';
                              gridPaddingClass = 'p-1.5';
                              gridRowHeaderWidth = 'w-14';
                              gridLabelSizeClass = 'text-[8px]';
                            } else if (numRows > 6 || maxCols > 12) {
                              gridBoxSizeClass = 'w-7 h-7 rounded-lg text-xs';
                              gridGapClass = 'gap-1';
                              gridPaddingClass = 'p-2.5';
                              gridRowHeaderWidth = 'w-16';
                              gridLabelSizeClass = 'text-[9px]';
                            }
                          }
                          
                          return (
                            <div key={arrayIdx} className="flex flex-col items-center w-auto max-w-full flex-shrink-0 min-h-0 bg-slate-900/30 border border-slate-800/40 p-3 rounded-2xl shadow-sm">
                              <div className="text-[10px] font-mono font-semibold text-indigo-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5 self-start px-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Array: {arrayInfo.name}
                              </div>
                              
                              {arrayInfo.is2D ? (
                                <div className={`flex flex-col ${gridGapClass} bg-slate-950/40 border border-slate-900 ${gridPaddingClass} rounded-2xl w-full max-w-2xl overflow-hidden shadow-inner`}>
                                  {arrayInfo.values.map((row, rIdx) => {
                                    const cells = typeof row === 'string' ? row.split('') : (Array.isArray(row) ? row : [row]);
                                    
                                    // Check if any pointers in the state match this row index
                                    const rowPointers: string[] = [];
                                    if (currentStep && currentStep.state) {
                                      for (const [k, v] of Object.entries(currentStep.state)) {
                                        if (typeof v === 'number' && v === rIdx && (k.toLowerCase().includes('row') || k === 'r' || k === 'currow' || k === 'rowidx' || k === 'i')) {
                                          rowPointers.push(k);
                                        }
                                      }
                                    }

                                    return (
                                      <div key={rIdx} className={`flex items-center ${gridGapClass} w-full`}>
                                        <div className={`flex items-center gap-1 ${gridRowHeaderWidth} flex-shrink-0 justify-end`}>
                                          {rowPointers.map(rp => (
                                            <span key={rp} className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-indigo-950 border border-indigo-900/60 text-indigo-400 animate-pulse">
                                              {rp}
                                            </span>
                                          ))}
                                          <span className={`${gridLabelSizeClass} text-slate-500 font-mono`}>Row {rIdx}:</span>
                                        </div>
                                        <div className={`flex ${gridGapClass}`}>
                                          {cells.map((cell, cIdx) => (
                                            <div 
                                              key={cIdx} 
                                              className={`${gridBoxSizeClass} border border-slate-800 bg-slate-900/60 flex items-center justify-center font-bold font-mono text-indigo-300 shadow transition-all duration-300 hover:border-indigo-500/50`}
                                            >
                                              {cell}
                                            </div>
                                          ))}
                                          {cells.length === 0 && (
                                            <span className={`${gridLabelSizeClass} text-slate-700 italic font-mono flex items-center`}>empty</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className={`flex items-center ${containerGapClass} w-full justify-center relative flex-nowrap py-1 overflow-x-auto overflow-y-hidden`}>
                                  {arrayInfo.values.map((val, idx) => {
                                    const isOutput = currentStepIndex === steps.length - 1 && getOutputIndices().includes(idx);
                                    const activePointers = pointers[idx] || [];
                                    const isBeingPointed = activePointers.length > 0;
                                    const isLinkedList = code.includes('ListNode') || arrayInfo.name.toLowerCase().startsWith('l') || arrayInfo.name.toLowerCase().includes('list');

                                    let boxClass = 'bg-slate-900 border-slate-800 text-slate-300';
                                    if (isOutput) {
                                      boxClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)] border-2 animate-bounce';
                                    } else if (isBeingPointed) {
                                      if (activePointers.includes('mid')) {
                                        boxClass = 'bg-yellow-950/40 border-yellow-500 text-yellow-300 shadow-md shadow-yellow-500/10';
                                      } else if (activePointers.some(p => p === 'j' || p === 'right' || p === 'end' || p === 'high')) {
                                        boxClass = 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10';
                                      } else if (activePointers.some(p => p === 'i' || p === 'left' || p === 'start' || p === 'low')) {
                                        boxClass = 'bg-indigo-950/40 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10';
                                      } else {
                                        boxClass = 'bg-violet-950/40 border-violet-500 text-violet-305 shadow-md shadow-violet-500/10';
                                      }
                                    }

                                    return (
                                      <div key={idx} className="flex items-center gap-1 flex-shrink-0">
                                        <div className={`flex flex-col items-center ${spacingClass}`}>
                                          <span className="text-[9px] text-slate-500 font-mono">[{idx}]</span>
                                          
                                          <div className={`${boxSizeClass} border flex items-center justify-center font-bold font-mono transition-all duration-300 ${boxClass}`}>
                                            {val}
                                          </div>

                                          {/* Dynamically list all pointer badges below this index */}
                                          <div className={`${pointerContainerHeight} flex flex-col items-center justify-start gap-0.5`}>
                                            {activePointers.map((pName) => {
                                              let badgeColor = 'bg-violet-950 border-violet-800 text-violet-400';
                                              if (pName === 'i' || pName === 'left' || pName === 'start' || pName === 'low') {
                                                badgeColor = 'bg-indigo-950 border-indigo-800 text-indigo-300';
                                              } else if (pName === 'j' || pName === 'right' || pName === 'end' || pName === 'high') {
                                                badgeColor = 'bg-rose-950 border-rose-850 text-rose-400';
                                              } else if (pName === 'mid') {
                                                badgeColor = 'bg-yellow-950 border-yellow-800 text-yellow-400';
                                              }
                                              
                                              return (
                                                <span key={pName} className={`rounded font-bold font-mono shadow-sm ${badgeSizeClass} ${badgeColor}`}>
                                                  {pName}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        {isLinkedList && idx < arrayInfo.values.length - 1 && (
                                          <div className="text-indigo-500 font-black text-xs pb-8 animate-pulse">➜</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dynamic Map & Set Visualizer */}
                      {getDetectedMapsAndSets().length > 0 && (
                        <div className="flex flex-wrap gap-6 justify-center items-stretch mt-2 mb-4 w-full px-4">
                          {getDetectedMapsAndSets().map((item, idx) => (
                            <div key={idx} className="bg-slate-900/35 border border-slate-800/50 rounded-2xl p-4 flex flex-col min-w-[240px] max-w-sm shadow-md">
                              <div className="text-[10px] font-mono font-semibold text-indigo-400/90 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-805 pb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                                {item.type === 'map' ? 'Hash Map' : 'Hash Set'}: {item.name}
                              </div>
                              
                              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[140px] pr-1 font-mono text-xs">
                                {item.type === 'map' ? (
                                  (Array.from(item.values.entries()) as [any, any][]).length > 0 ? (
                                    (Array.from(item.values.entries()) as [any, any][]).map(([k, v], entryIdx) => (
                                      <div key={entryIdx} className="flex items-center justify-between bg-slate-950/60 border border-slate-900 px-3 py-2 rounded-xl transition-all duration-300 hover:border-violet-500/30">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] text-slate-500 uppercase tracking-wider scale-90">key</span>
                                          <span className="bg-violet-950/80 border border-violet-850 text-violet-350 font-bold px-2 py-0.5 rounded-lg">{String(k)}</span>
                                        </div>
                                        <div className="text-slate-650 font-bold">➜</div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="bg-cyan-950/80 border border-cyan-850 text-cyan-350 font-bold px-2 py-0.5 rounded-lg">{String(v)}</span>
                                          <span className="text-[9px] text-slate-500 uppercase tracking-wider scale-90">val</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[10px] text-slate-600 italic text-center py-4">Map is empty</div>
                                  )
                                ) : (
                                  Array.from(item.values).length > 0 ? (
                                    <div className="flex flex-wrap gap-2 py-1 justify-center">
                                      {Array.from(item.values).map((setVal, setValIdx) => (
                                        <span key={setValIdx} className="bg-violet-950/60 border border-violet-900/60 text-violet-300 px-2.5 py-1 rounded-xl shadow-inner font-bold hover:border-violet-500/40 transition-colors">
                                          {String(setVal)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-600 italic text-center py-4">Set is empty</div>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Desktop Explanation Section */}
                      <div className="h-12 flex items-center justify-center overflow-hidden my-2.5 w-full flex-shrink-0">
                        {currentStep && (
                          currentStepIndex === steps.length - 1 ? (
                            <div className="text-xs font-bold font-mono text-center text-emerald-400 uppercase tracking-wider animate-pulse border border-emerald-500/50 bg-emerald-950/40 px-5 py-2 rounded-xl shadow-lg shadow-emerald-500/10">
                              🎉 SUCCESS: {getMaxSum() !== '0' ? `MAX SUM = ${getMaxSum()}` : `OUTPUT = ${expectedOutput || 'SOLVED'}`}
                            </div>
                          ) : (
                            <div
                              key={currentStepIndex}
                              className="animate-explanation-floating text-xs font-mono text-center text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 px-5 py-2 rounded-xl shadow-lg shadow-indigo-950/20 backdrop-blur-sm max-w-[90%]"
                            >
                              {currentStep.explanation}
                            </div>
                          )
                        )}
                      </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-center max-w-sm gap-3">
                        {!compileError && (
                          <>
                            <HelpCircle className="w-12 h-12 text-slate-700" />
                            <p className="text-sm font-mono text-slate-500 leading-relaxed">
                              Write code, define arguments, and click the Compile button to generate a dynamic execution sequence!
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </>
              </div>
            </div>

            {/* Floating Variable Watcher in the bottom-right corner */}
            <div 
              style={{
                transform: `translate(${watcherOffset.x}px, ${watcherOffset.y}px)`,
                touchAction: 'none'
              }}
              className="absolute bottom-6 right-6 z-30 w-64 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[200px]"
            >
              <div 
                onPointerDown={handleWatcherPointerDown}
                onPointerMove={handleWatcherPointerMove}
                onPointerUp={handleWatcherPointerUp}
                className="flex items-center gap-2 px-4 py-2 border-b border-slate-900 bg-slate-950/50 cursor-grab active:cursor-grabbing select-none"
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <span className="text-[10px] font-bold tracking-wider text-slate-400 font-mono pointer-events-none">VARIABLE WATCHER</span>
              </div>
              <div className="flex-1 p-3 overflow-y-auto">
                {getInspectorVariables().length > 0 ? (
                  <table className="w-full font-mono text-[11px] text-left text-slate-300">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-900">
                        <th className="pb-1 font-semibold">VAR</th>
                        <th className="pb-1 font-semibold text-right">VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getInspectorVariables().map(({ key, value, trend }) => (
                        <tr key={key} className="border-b border-slate-900/50 last:border-0 text-slate-300">
                          <td className="py-1 text-indigo-400 font-bold">{key}</td>
                          <td className="py-1 text-right font-semibold flex items-center justify-end gap-1">
                            {value}
                            {trend === 'up' && (
                              <ArrowUp className="w-3 h-3 text-emerald-400 animate-bounce" />
                            )}
                            {trend === 'down' && (
                              <ArrowDown className="w-3 h-3 text-rose-500 animate-bounce" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-[9px] text-slate-600 font-mono text-center py-4">
                    No active variables
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Control Console Dashboard */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            disabled={steps.length === 0}
            className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 disabled:opacity-20 disabled:pointer-events-none transition-all duration-200"
            title="Reset to step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleStepPrev}
            disabled={currentStepIndex === 0 || steps.length === 0}
            className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 disabled:opacity-20 disabled:pointer-events-none transition-all duration-200"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={steps.length === 0}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-500 disabled:opacity-20 disabled:pointer-events-none transition-all duration-300"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleStepNext}
            disabled={currentStepIndex === steps.length - 1 || steps.length === 0}
            className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 disabled:opacity-20 disabled:pointer-events-none transition-all duration-200"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Scrub timeline slider */}
        <div className="flex-1 mx-8 flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500">START</span>
          <input
            type="range"
            min={0}
            max={steps.length > 0 ? steps.length - 1 : 0}
            value={currentStepIndex}
            onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
            disabled={steps.length === 0}
            className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30"
          />
          <span className="text-[10px] font-mono text-slate-500">END</span>
        </div>

        {/* Speed cycle controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">SPEED:</span>
          <button
            onClick={handleCycleSpeed}
            disabled={steps.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 disabled:opacity-30 transition-all duration-200"
          >
            {getSpeedLabel()}
          </button>
        </div>
      </footer>
    </div>
  );
}
