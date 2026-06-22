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
  nums: string;
  target: string;
}

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string>('twoSum');
  const [code, setCode] = useState<string>('');
  const [customArrayStr, setCustomArrayStr] = useState<string>('[2, 7, 11, 15]');
  const [customTargetStr, setCustomTargetStr] = useState<string>('9');
  const [examples, setExamples] = useState<ScrapedExample[]>([]);
  const [activeExampleLabel, setActiveExampleLabel] = useState<string>('');
  
  const [steps, setSteps] = useState<DynamicStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const [compileError, setCompileError] = useState<string | null>(null);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const preset: AlgorithmPreset = PRESETS[activePresetId];
  const currentStep = steps[currentStepIndex] || null;
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;

  // Initialize preset or load URL parameters from LeetCode Chrome Extension
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramCode = params.get('code');
    const paramExamplesStr = params.get('examples');
    const hasUrlParams = window.location.search.includes('code=');

    if (hasUrlParams && paramCode) {
      setCode(paramCode);
      
      let parsedExamples: ScrapedExample[] = [];
      try {
        parsedExamples = JSON.parse(paramExamplesStr || '[]');
      } catch (e) {}

      setExamples(parsedExamples);

      if (parsedExamples.length > 0) {
        const first = parsedExamples[0];
        setCustomArrayStr(first.nums);
        setCustomTargetStr(first.target);
        setActiveExampleLabel(first.label);
        
        let arr: number[] = [2, 7, 11, 15];
        try { arr = JSON.parse(first.nums); } catch (e) {}
        handleCompileAndRun(paramCode, arr, Number(first.target));
      } else {
        // Fallback if no examples scraped
        setCustomArrayStr('[2,7,11,15]');
        setCustomTargetStr('9');
        let arr = [2, 7, 11, 15];
        handleCompileAndRun(paramCode, arr, 9);
      }
      
      // Clear parameters for a clean reload experience
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      setCode(preset.code);
      setCustomArrayStr(JSON.stringify(preset.defaultArray));
      setCustomTargetStr(preset.defaultTarget !== undefined ? String(preset.defaultTarget) : '3');
      setExamples([]);
      setActiveExampleLabel('');
      
      handleCompileAndRun(preset.code, preset.defaultArray, preset.defaultTarget);
    }
  }, [activePresetId]);

  // Main compiler handler
  const handleCompileAndRun = (codeSource: string, arrayData?: number[], targetVal?: number) => {
    setCompileError(null);
    setIsPlaying(false);
    
    let arr: number[] = [];
    try {
      arr = JSON.parse(arrayData ? JSON.stringify(arrayData) : customArrayStr);
      if (!Array.isArray(arr)) throw new Error("Input must be a valid array");
    } catch (e: any) {
      setCompileError("Array Parse Error: " + e.message);
      return;
    }

    const targetNum = targetVal !== undefined ? targetVal : Number(customTargetStr);
    const traceResults = runCustomTrace(codeSource, arr, targetNum);
    
    if (traceResults.length > 0) {
      if (traceResults[0].explanation.startsWith("Syntax or Runtime Error:")) {
        setCompileError(traceResults[0].explanation);
        setSteps([]);
        setCurrentStepIndex(0);
      } else {
        setSteps(traceResults);
        setCurrentStepIndex(0);
      }
    }
  };

  // Load a scraped testcase example
  const handleLoadExample = (ex: ScrapedExample) => {
    setActiveExampleLabel(ex.label);
    setCustomArrayStr(ex.nums);
    setCustomTargetStr(ex.target);
    
    let arr: number[] = [];
    try {
      arr = JSON.parse(ex.nums);
    } catch (e) {}
    
    handleCompileAndRun(code, arr, Number(ex.target));
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
    if (editorRef.current && monacoRef.current && currentStep) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

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
    }
  }, [currentStep?.line, steps]);

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
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

  // DYNAMICALLY EXTRACT ALL ARRAYS (NUMBERS & CHARACTERS) IN STATE
  const getDetectedArrays = (): { name: string; values: any[] }[] => {
    if (!currentStep || !currentStep.state) return [];
    const arrays: { name: string; values: any[] }[] = [];
    
    for (const [key, val] of Object.entries(currentStep.state)) {
      if (Array.isArray(val) && val.every(item => typeof item === 'number' || typeof item === 'string')) {
        arrays.push({ name: key, values: val });
      }
    }
    
    // Fallback if no array was explicitly captured in step scope
    if (arrays.length === 0 && currentStep.state.arr) {
      arrays.push({ name: 'nums', values: currentStep.state.arr });
    }
    return arrays;
  };

  const detectedArrays = getDetectedArrays();

  // DYNAMICALLY LOCATE POINTERS FOR AN ARRAY BY DETECTING SCOPE INTEGERS
  const getPointersForArray = (arrayLength: number): Record<number, string[]> => {
    if (!currentStep || !currentStep.state) return {};
    const pointers: Record<number, string[]> = {};
    
    for (const [key, val] of Object.entries(currentStep.state)) {
      if (
        typeof val === 'number' && 
        Number.isInteger(val) && 
        val >= 0 && 
        val < arrayLength &&
        key !== 'target' && 
        key !== 'sum' && 
        key !== 'maxSum' && 
        key !== 'windowSum' && 
        key !== 'k' &&
        key !== 'n'
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
        entries.push({ 
          key, 
          value: typeof val === 'object' ? JSON.stringify(val) : String(val),
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
    
    const pointers: { name: string; val: number }[] = [];
    for (const [key, val] of Object.entries(state)) {
      if (typeof val === 'number' && Number.isInteger(val) && key !== 'target' && key !== 'sum' && key !== 'maxSum' && key !== 'windowSum') {
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Branding HUD */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
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

        {/* Preset Selectors */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 p-1.5 rounded-2xl">
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

        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-semibold text-indigo-400 font-mono">COMPILER ACTIVE</span>
        </div>
      </header>

      {/* Main Workstation */}
      <main className="flex flex-1 overflow-hidden p-6 gap-6">
        
        {/* Left Side: Editor & Configuration inputs */}
        <div className="flex flex-col w-5/12 gap-5">
          {/* Inputs Config */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
            <h2 className="text-xs font-bold font-mono text-slate-400 flex items-center gap-2 tracking-wider">
              <Hash className="w-4 h-4 text-indigo-400" />
              EXECUTION INPUTS CONFIGURATION
            </h2>

            {/* Injected Examples chips if scraped */}
            {examples.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-slate-905 pb-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Scraped LeetCode Testcases:
                </span>
                <div className="flex gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => handleLoadExample(ex)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border ${
                        activeExampleLabel === ex.label
                          ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow shadow-indigo-500/10 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Input Array (nums / arr)</label>
                <input
                  type="text"
                  value={customArrayStr}
                  onChange={(e) => setCustomArrayStr(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-600 transition-colors w-full"
                  placeholder="e.g. [-3, 10, -7, 4]"
                />
              </div>
              <div className="col-span-4 flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Target (k / target)</label>
                <input
                  type="text"
                  value={customTargetStr}
                  onChange={(e) => setCustomTargetStr(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-600 transition-colors w-full"
                  placeholder="e.g. 9"
                />
              </div>
            </div>
            <button
              onClick={() => handleCompileAndRun(code)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:opacity-90 font-bold text-xs tracking-widest text-white shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-indigo-500/20 active:scale-[0.99]"
            >
              <PlayCircle className="w-4 h-4" />
              COMPILE & RUN VISUALIZATION
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                editable_solution.js
              </span>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/40 border border-indigo-900/60 px-2 py-0.5 rounded-full">
                CUSTOM CODE SUPPORT
              </span>
            </div>
            <div className="flex-1 bg-slate-950/60 p-2">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
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

        {/* Right Side: Dynamic Visualizer Area */}
        <div className="flex flex-col flex-1 gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                UNIVERSAL ALGORITHM ARRAY POINTER VISUALIZER
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono font-semibold">Timeline Step:</span>
                <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/60 px-2.5 py-0.5 rounded-full">
                  {steps.length > 0 ? `${currentStepIndex + 1} / ${steps.length}` : '0 / 0'}
                </span>
              </div>
            </div>

            {/* Dynamic Rendering Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/20 overflow-auto gap-6">
              
              {/* Dynamic Math Banner */}
              {mathDetails && (
                <div className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2.5 transition-all duration-300 transform scale-95 shadow-md ${
                  mathDetails.match 
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-emerald-500/10 animate-bounce' 
                    : 'bg-slate-900/90 border-slate-800 text-indigo-300'
                }`}>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-500 uppercase">COMPARING</span>
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
                <div className="w-full flex flex-col gap-8 justify-center">
                  
                  {/* Map and render each detected array automatically */}
                  {detectedArrays.map((arrayInfo, arrayIdx) => {
                    const pointers = getPointersForArray(arrayInfo.values.length);
                    
                    return (
                      <div key={arrayIdx} className="flex flex-col items-center w-full">
                        <div className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2.5 self-start pl-12 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Array: {arrayInfo.name}
                        </div>
                        
                        <div className="flex items-end gap-3 w-full justify-center relative">
                          {arrayInfo.values.map((val, idx) => {
                            const activePointers = pointers[idx] || [];
                            const isBeingPointed = activePointers.length > 0;
                            const isMid = activePointers.includes('mid');

                            let boxClass = 'bg-slate-900 border-slate-800 text-slate-300';
                            if (isMid) {
                              boxClass = 'bg-yellow-950/40 border-yellow-500 text-yellow-300 shadow-md shadow-yellow-500/10';
                            } else if (isBeingPointed) {
                              boxClass = 'bg-indigo-950/40 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10';
                            }

                            return (
                              <div key={idx} className="flex flex-col items-center gap-3">
                                <span className="text-[10px] text-slate-500 font-mono">[{idx}]</span>
                                
                                <div className={`w-14 h-16 rounded-2xl border flex items-center justify-center font-bold text-lg font-mono transition-all duration-300 ${boxClass}`}>
                                  {val}
                                </div>

                                {/* Dynamically list all pointer badges below this index */}
                                <div className="h-14 flex flex-col items-center justify-start gap-1">
                                  {activePointers.map((pName) => {
                                    let badgeColor = 'bg-violet-950 border-violet-850 text-violet-400';
                                    if (pName === 'left' || pName === 'start' || pName === 'low') {
                                      badgeColor = 'bg-emerald-950 border-emerald-800 text-emerald-400';
                                    } else if (pName === 'right' || pName === 'end' || pName === 'high') {
                                      badgeColor = 'bg-red-950 border-red-800 text-red-400';
                                    } else if (pName === 'mid') {
                                      badgeColor = 'bg-yellow-950 border-yellow-800 text-yellow-400';
                                    }
                                    
                                    return (
                                      <span key={pName} className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shadow-sm ${badgeColor}`}>
                                        {pName}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center max-w-sm gap-3">
                  <HelpCircle className="w-12 h-12 text-slate-700" />
                  <p className="text-sm font-mono text-slate-500 leading-relaxed">
                    Write code, define arguments, and click the Compile button to generate a dynamic execution sequence!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Explanation & Inspector panels */}
          <div className="grid grid-cols-12 gap-6 min-h-[190px] max-h-[220px]">
            {/* AI Tutor Card */}
            <div className="col-span-8 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-900 bg-slate-950/40">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300 tracking-wider font-mono">DYNAMIC AI TUTOR EXPLANATIONS</span>
              </div>
              <div className="flex-1 p-5 overflow-y-auto flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-900/30 border border-indigo-800/80 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Terminal className="w-4 h-4" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-mono">
                  {compileError ? (
                    <span className="text-red-400 font-bold block">{compileError}</span>
                  ) : currentStep ? (
                    currentStep.explanation
                  ) : (
                    "Waiting for code analysis..."
                  )}
                </p>
              </div>
            </div>

            {/* General Variable Inspector Panel */}
            <div className="col-span-4 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-900 bg-slate-950/40">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold tracking-wider text-slate-400 font-mono">VARIABLE WATCHER</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                {getInspectorVariables().length > 0 ? (
                  <table className="w-full font-mono text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-900">
                        <th className="pb-1.5 font-semibold">VAR</th>
                        <th className="pb-1.5 font-semibold text-right">VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getInspectorVariables().map(({ key, value, trend }) => (
                        <tr key={key} className="border-b border-slate-900/50 last:border-0 text-slate-300">
                          <td className="py-1.5 text-indigo-400 font-bold">{key}</td>
                          <td className="py-1.5 text-right font-semibold flex items-center justify-end gap-1.5">
                            {value}
                            {trend === 'up' && (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                            )}
                            {trend === 'down' && (
                              <ArrowDown className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-slate-600 font-mono text-center">
                    No variables active in scope
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
