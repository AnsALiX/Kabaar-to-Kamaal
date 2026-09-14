/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Terminal, Cpu, PenTool, Layout, ChevronRight, Activity, Zap, Cpu as CpuIcon, Box, Settings, Shuffle, Battery, CircleAlert } from 'lucide-react';
import { cn } from './lib/utils';
import { processScrapImage, type ScrapProjectResponse, type VisualStepData } from './services/geminiService';

// --- Components ---

const GlowingText = ({ children, className, neon = false }: { children: React.ReactNode, className?: string, neon?: boolean }) => (
  <span className={cn(
    "font-mono tracking-tight",
    neon ? "text-[#00FF41] [text-shadow:0_0_8px_rgba(0,255,65,0.6)]" : "text-[#08F7FE] [text-shadow:0_0_8px_rgba(8,247,254,0.6)]",
    className
  )}>
    {children}
  </span>
);

const BorderedContainer = ({ children, className, active = false }: { children: React.ReactNode, className?: string, active?: boolean }) => (
  <div className={cn(
    "border-2 transition-all duration-300 bg-[#111111]",
    active 
      ? "border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)]" 
      : "border-[#333333] hover:border-[#444444]",
    className
  )}>
    {children}
  </div>
);

const TerminalLog = ({ messages }: { messages: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="h-48 overflow-y-auto font-mono text-xs p-4 bg-black border-2 border-[#00FF41] mb-8 space-y-1">
      {messages.map((msg, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-[#00FF41] opacity-50">[{new Date().toLocaleTimeString()}]</span>
          <span className="text-white">{msg}</span>
        </div>
      ))}
      <div className="flex gap-2 animate-pulse">
        <span className="text-[#00FF41] opacity-50">[{new Date().toLocaleTimeString()}]</span>
        <span className="text-[#00FF41]">_</span>
      </div>
    </div>
  );
};

// --- Visualizers ---

const getPartIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('motor') || n.includes('gear') || n.includes('mechanical')) {
    return <Settings className="text-[#08F7FE] w-[45%] h-[45%]" />;
  }
  if (n.includes('wire') || n.includes('cable') || n.includes('connector') || n.includes('solder') || n.includes('link') || n.includes('circuit')) {
    return <Shuffle className="text-[#08F7FE] w-[45%] h-[45%]" />;
  }
  if (n.includes('fan') || n.includes('blade') || n.includes('propeller') || n.includes('turbine')) {
    return <Activity className="text-[#08F7FE] w-[45%] h-[45%]" />;
  }
  if (n.includes('battery') || n.includes('power') || n.includes('clip') || n.includes('cell') || n.includes('9v') || n.includes('12v') || n.includes('snap')) {
    return <Battery className="text-[#08F7FE] w-[45%] h-[45%]" />;
  }
  if (n.includes('bolt') || n.includes('nut') || n.includes('screw') || n.includes('hardware') || n.includes('nail')) {
    return <Box className="text-[#08F7FE] w-[45%] h-[45%]" />;
  }
  return <CpuIcon className="text-[#08F7FE] w-[45%] h-[45%]" />;
};

const AbstractPartDiagram = ({ components }: { components: string[] }) => {
  return (
    <div className="relative h-64 w-full border border-[#333333] flex items-center justify-center p-8">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div className="relative flex flex-wrap gap-6 justify-center items-center">
        {components.map((comp, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ 
              scale: 1.05,
              zIndex: 50,
              boxShadow: "0 0 20px #08F7FE inset, 0 0 20px #08F7FE"
            }}
            className="w-16 h-16 border-2 border-[#08F7FE] flex items-center justify-center relative bg-black transition-all duration-200 group cursor-crosshair"
          >
            {getPartIcon(comp)}
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#08F7FE]" />
            <div className="absolute -top-1 -left-1 w-2 h-2 border border-[#08F7FE] rounded-full" />
            <div className="hidden group-hover:block absolute -top-10 left-1/2 -translate-x-1/2 bg-black border border-[#08F7FE] px-2 py-1 z-50 whitespace-nowrap text-[10px] text-[#08F7FE] !opacity-100 uppercase tracking-tighter font-bold shadow-[0_0_10px_rgba(8,247,254,0.5)]">
              {comp}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Decorative lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#08F7FE" strokeWidth="0.5" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#08F7FE" strokeWidth="0.5" />
      </svg>
    </div>
  );
};

const BlueprintVisualizer = ({ stepData }: { stepData: VisualStepData | null }) => {
  if (!stepData) return (
    <div className="h-64 border-2 border-[#00FF41] bg-black flex items-center justify-center text-[#00FF41]/30">
      <div className="flex flex-col items-center gap-2">
        <Activity className="w-8 h-8 animate-pulse" />
        <span className="text-xs uppercase tracking-[0.2em]">Idle Visualizer</span>
      </div>
    </div>
  );

  return (
    <div className="h-64 border-2 border-[#00FF41] bg-black relative flex items-center justify-center overflow-hidden p-6 gap-8">
      <div className="absolute top-2 left-2 flex gap-2">
         <div className="w-2 h-2 bg-[#00FF41]" />
         <div className="text-[10px] text-[#00FF41] uppercase tracking-widest font-bold">Diagnostic Overlay: Active</div>
      </div>
      
      <motion.div 
        key={stepData.part_name}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center justify-center relative"
      >
        <div className="text-[#00FF41] text-[10px] mb-2 uppercase font-bold tracking-tighter">{stepData.part_name}</div>
        <div className="w-20 h-20 border-2 border-[#00FF41] flex items-center justify-center relative">
          <Box className="w-10 h-10 text-[#00FF41]" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -top-1 -left-1 w-3 h-3 border-2 border-[#00FF41]" 
          />
        </div>
      </motion.div>

      {stepData.target_part && (
        <>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 64 }}
            className="h-[2px] bg-[#00FF41] relative"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-[#00FF41] px-1 text-[8px] text-[#00FF41] font-bold">
              {stepData.action.toUpperCase()}
            </div>
            <motion.div 
              animate={{ x: [0, 64] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="absolute top-[-3px] left-0 w-2 h-2 bg-[#00FF41] rounded-full"
            />
          </motion.div>

          <div className="flex flex-col items-center justify-center relative">
            <div className="text-[#00FF41] text-[10px] mb-2 opacity-60 uppercase font-bold tracking-tighter">{stepData.target_part}</div>
            <div className="w-20 h-20 border-2 border-dashed border-[#00FF41]/40 flex items-center justify-center relative">
              <Cpu className="w-10 h-10 text-[#00FF41]/40" />
              {stepData.connection_point && (
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#00FF41] rounded-full bg-black flex items-center justify-center">
                  <div className="w-1 h-1 bg-[#00FF41]" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapProjectResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        addLog("IMAGE_CAPTURE_RESOLVED: Data buffering initiated");
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const handleProcess = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    setCurrentStepIndex(0);
    setLogs(["[SYSTEM] INITIALIZING VISION_CORE_X.0", "[SYSTEM] ANALYZING VOLTAGE_DIFF_ARRAYS...", "[SYSTEM] SCANNING_FOR_USABLE_SILICON_WASTE"]);
    
    try {
      const base64 = image.split(',')[1];
      addLog("[PROCESS] SENDING_REMOTE_BUFFER_TO_GEMINI_API");
      const data = await processScrapImage(base64);
      addLog("[PROCESS] PARSING_NEURAL_WEIGHTS: SUCCESS");
      addLog(`[PROCESS] BLUEPRINT_DERIVED: ${data.project_title}`);
      setResult(data);
    } catch (error) {
      addLog("[CRITICAL] NEURAL_HANDSHAKE_FAILED: Connection timeout");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 selection:bg-[#00FF41] selection:text-black">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-baseline gap-4 border-b-2 border-[#333] pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
            <GlowingText neon>KABAAR</GlowingText>
            <span className="mx-2 text-[#444]">TO</span>
            <GlowingText>KAMAAL</GlowingText>
          </h1>
          <p className="mt-2 text-xs md:text-sm font-mono text-[#00FF41]/70 uppercase tracking-[0.3em]">
            // SCRAP_UPCYCLING_PROTOCOL_V4.2.0
          </p>
        </div>
        <div className="flex gap-4 font-mono text-[10px] md:text-xs text-[#666]">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-[#00FF41]" />
            <span>CORE_SYNC: OK</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-[#08F7FE]" />
            <span>ENERGY_INDEX: MAX</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!result && !loading ? (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid gap-8 lg:grid-cols-2 mt-8"
            >
              <div className="space-y-6">
                <BorderedContainer className="p-8 h-full flex flex-col justify-center">
                  <h2 className="text-2xl font-mono mb-4 text-[#08F7FE] flex items-center gap-3">
                    <Terminal className="w-6 h-6" />
                    SYSTEM_INIT
                  </h2>
                  <p className="font-mono text-sm leading-relaxed text-[#08F7FE]/60 mb-8 border-l-2 border-[#08F7FE]/30 pl-4">
                    The world generates 50 million tonnes of e-waste annually. 
                    Our neural vision system helps you identify components in your 
                    electronic scrap and gives you instant blueprints to create 
                    functional hardware.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs font-mono text-[#444]">
                      <div className="w-4 h-px bg-[#444]" />
                      MANUAL_SCAN_REQUIRED
                    </div>
                    <div {...getRootProps()} className={cn(
                      "border-2 border-dashed p-12 transition-all cursor-pointer flex flex-col items-center gap-4 group",
                      isDragActive ? "border-[#00FF41] bg-[#00FF41]/5" : "border-[#333] hover:border-[#08F7FE]"
                    )}>
                      <input {...getInputProps()} />
                      <Upload className={cn(
                        "w-12 h-12 transition-all",
                        isDragActive ? "text-[#00FF41]" : "text-[#666] group-hover:text-[#08F7FE]"
                      )} />
                      <div className="text-center">
                        <p className="font-mono text-xs uppercase tracking-widest">
                          {isDragActive ? "Drop raw data now" : "Inject scrap_imagery.jpg"}
                        </p>
                        <p className="font-mono text-[10px] text-[#444] mt-1">
                          OR CLICK TO BROWSE_DIR
                        </p>
                      </div>
                    </div>
                  </div>

                  {image && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex gap-6 items-center">
                      <div className="w-24 h-24 border-2 border-[#00FF41] p-1">
                        <img src={image} alt="Buffer" className="w-full h-full object-cover" />
                      </div>
                      <button 
                        onClick={handleProcess}
                        className="flex-1 bg-[#00FF41] text-black py-4 font-mono font-bold uppercase tracking-widest hover:bg-[#08F7FE] transition-colors"
                      >
                        RUN_EXECUTION.sh
                      </button>
                    </motion.div>
                  )}
                </BorderedContainer>
              </div>

              <div className="hidden lg:block">
                <BorderedContainer className="p-8 h-full bg-black relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 font-mono text-[80px] leading-none opacity-[0.03] select-none group-hover:opacity-[0.05] transition-opacity">
                      SCRAP
                   </div>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between text-[#00FF41] text-[10px] font-mono tracking-widest">
                         <span>STATUS: READY_FOR_UPLOAD</span>
                         <span>LATENCY: 0ms</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1,2,3,4].map(n => (
                          <div key={n} className="border border-[#1a1a1a] p-4 flex flex-col gap-2">
                             <div className="w-4 h-1 bg-[#222]" />
                             <div className="w-full h-2 bg-[#111]" />
                             <div className="w-2/3 h-2 bg-[#111]" />
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border border-[#333] bg-black">
                         <div className="flex gap-2 mb-2">
                            <div className="w-1 h-1 bg-[#00FF41]" />
                            <div className="w-1 h-1 bg-[#00FF41]" />
                            <div className="w-1 h-1 bg-[#00FF41] opacity-30" />
                         </div>
                         <div className="text-[10px] font-mono text-[#444] leading-relaxed">
                            AWAITING_INPUT_STREAM... <br/>
                            PLEASE_SELECT_FILE_FOR_IDENTIFICATION_PROTOCOL
                         </div>
                      </div>
                   </div>
                </BorderedContainer>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-8 lg:grid-cols-12"
            >
              {/* Left Panel: Analysis */}
              <div className="lg:col-span-5 space-y-6">
                <BorderedContainer className="p-6" active>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-mono text-[#00FF41] flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      ANALYSIS_RESULTS
                    </h2>
                    <div className="text-[10px] font-mono text-[#00FF41] px-2 py-1 border border-[#00FF41]">
                      SCAN_COMPLETE
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-1 block">Project Title</label>
                    <div className="text-2xl font-mono text-white border-l-4 border-[#08F7FE] pl-4 py-2 bg-[#1a1a1a]">
                      {result.project_title}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-2 block">Detected Components</label>
                    <div className="flex flex-wrap gap-2">
                      {result.components_list.map((comp, i) => (
                        <span key={i} className="text-[10px] font-mono border border-[#333] px-2 py-1 text-[#08F7FE] bg-black">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-mono text-[#444] uppercase tracking-widest mb-2 block">Part Matrix Visualization</label>
                     <AbstractPartDiagram components={result.components_list} />
                  </div>
                </BorderedContainer>

                <TerminalLog messages={logs} />
                
                <button 
                  onClick={() => { setResult(null); setImage(null); }}
                  className="w-full border-2 border-[#333] py-4 font-mono text-xs text-[#666] hover:border-[#00FF41] hover:text-[#00FF41] transition-all uppercase tracking-[0.2em]"
                >
                  Terminate Session & Reset_
                </button>
              </div>

              {/* Right Panel: Interactive Blueprint */}
              <div className="lg:col-span-7 space-y-6">
                <BorderedContainer className="p-0 border-0 bg-transparent flex flex-col gap-6">
                  {/* Step Visualizer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#00FF41] uppercase tracking-widest pl-2">
                      <PenTool className="w-3 h-3" />
                      Assembly_Visualizer v1.0
                    </div>
                    <BlueprintVisualizer stepData={result.visual_step_data[currentStepIndex]} />
                  </div>

                  {/* Steps List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#666] uppercase tracking-[0.2em] px-2">
                        <span>Blueprint Instructions</span>
                        <span>{currentStepIndex + 1} / {result.steps.length}</span>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {result.steps.map((step, i) => (
                          <div 
                            key={i}
                            onClick={() => setCurrentStepIndex(i)}
                            className={cn(
                              "cursor-pointer group relative p-4 transition-all duration-200 border-2",
                              currentStepIndex === i 
                                ? "bg-[#00FF41]/10 border-[#00FF41] translate-x-2" 
                                : "bg-[#111] border-[#222] hover:border-[#444]"
                            )}
                          >
                            <div className="flex gap-4 items-start">
                              <span className={cn(
                                  "font-mono font-bold text-lg",
                                  currentStepIndex === i ? "text-[#00FF41]" : "text-[#333]"
                              )}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <p className={cn(
                                "font-mono text-sm leading-relaxed",
                                currentStepIndex === i ? "text-[#00FF41]" : "text-[#888]"
                              )}>
                                {step}
                              </p>
                              {currentStepIndex === i && (
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00FF41]" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Critical Safety Disclaimer */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 border-2 border-[#FF003C] bg-[#FF003C]/5 p-4 shadow-[0_0_10px_rgba(255,0,60,0.2)]"
                      >
                        <div className="flex gap-3 items-start">
                          <CircleAlert className="w-5 h-5 text-[#FF003C] shrink-0 mt-0.5" />
                          <p className="font-mono text-[10px] text-[#FF003C] [text-shadow:0_0_8px_rgba(255,0,60,0.6)] leading-relaxed uppercase font-bold">
                            [WARNING: CORE SAFETY OVERRIDE] Handle all swollen lithium-ion batteries, exposed capacitors, and sharp rusted metals with extreme caution. Risk of thermal runaway or severe laceration.
                          </p>
                        </div>
                      </motion.div>
                    </div>
                </BorderedContainer>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto py-20"
            >
              <div className="text-center mb-12">
                <div className="inline-block p-4 border-2 border-[#00FF41] mb-6 animate-pulse">
                  <Activity className="w-12 h-12 text-[#00FF41]" />
                </div>
                <h3 className="text-2xl font-mono text-[#00FF41] uppercase tracking-[0.5em] mb-2">Processing Data</h3>
                <p className="text-xs font-mono text-[#00FF41]/50 uppercase">Please stand by for neural synthesis</p>
              </div>
              <TerminalLog messages={logs} />
              <div className="w-full bg-[#111] h-1 border border-[#333]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15 }}
                  className="h-full bg-[#00FF41]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[#333] flex flex-col md:flex-row justify-between items-center gap-4 text-[#444] font-mono text-[10px] uppercase tracking-widest">
         <div>&copy; 2026 KABAAR_TO_KAMAAL // OPEN_SOURCE_UPCYCLING</div>
         <div className="flex gap-6">
            <span className="hover:text-[#00FF41] cursor-pointer">Protocol_Docs</span>
            <span className="hover:text-[#08F7FE] cursor-pointer">Neural_Weights</span>
            <span className="hover:text-[#fff] cursor-pointer">Security_Gate</span>
         </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #111;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #00FF41;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #08F7FE;
        }
      `}</style>
    </div>
  );
}
