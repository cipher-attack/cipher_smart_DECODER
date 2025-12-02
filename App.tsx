import React, { useState, useRef, useEffect } from 'react';
import { FileData, AnalysisStatus, AnalysisResult } from './types';
import { 
  arrayBufferToHex, 
  extractPrintableStrings, 
  detectFileSignature, 
  scanForArtifacts,
  calculateEntropy,
  identifyProtocols,
  toRot13,
  textToHex,
  generateLocalPayload
} from './utils/fileHelpers';
import { analyzeConfigFile, generateAiPayload } from './services/geminiService';
import HexViewer from './components/HexViewer';
import { 
  ParticleBackground, 
  Tesseract3D, 
  TiltCard, 
  GlitchText, 
  MagneticButton, 
  ScanlineOverlay,
  CommandPalette
} from './components/CyberUI';
import { 
  LockClosedIcon, 
  LockOpenIcon, 
  CpuChipIcon, 
  ArrowUpTrayIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ClipboardDocumentCheckIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  EyeSlashIcon,
  ServerIcon,
  MagnifyingGlassCircleIcon,
  CloudIcon,
  BoltIcon,
  KeyIcon,
  SpeakerWaveIcon,
  SignalIcon,
  QrCodeIcon,
  CodeBracketSquareIcon
} from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';

// SONIC UI HELPER
const playCyberSound = (type: 'hover' | 'click' | 'scan' | 'success') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'hover') {
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'scan') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } else if (type === 'success') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
};

const CipherLogo = () => (
  <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-10 md:h-10 animate-spin-slow">
    <path d="M50 5L93.3013 30V80L50 105L6.69873 80V30L50 5Z" stroke="#00ff41" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 255, 65, 0.05)" />
    <path d="M65 35C60 30 55 28 50 28C37.8497 28 28 37.8497 28 50C28 62.1503 37.8497 72 50 72C55 72 60 70 65 65" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <path d="M50 50H80" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <path d="M68 50V58" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <path d="M78 50V62" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="50" r="6" fill="#00ff41" stroke="#050505" strokeWidth="2" />
  </svg>
);

const App: React.FC = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [entropy, setEntropy] = useState<number>(0);
  const [protocols, setProtocols] = useState<string[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualDecodeInput, setManualDecodeInput] = useState('');
  const [manualDecodeResult, setManualDecodeResult] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  
  // API Key State with Persistence
  const [customApiKey, setCustomApiKey] = useState('');
  
  useEffect(() => {
      const savedKey = localStorage.getItem('cipher_api_key');
      if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomApiKey(val);
      localStorage.setItem('cipher_api_key', val);
  };
  
  // Patching State
  const [isEditing, setIsEditing] = useState(false);
  const [editableConfig, setEditableConfig] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // New Tools State
  const [ghostInput, setGhostInput] = useState('');
  const [ghostOutput, setGhostOutput] = useState('');
  const [pinging, setPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [targetHost, setTargetHost] = useState<string | null>(null);

  // Payload Generator State
  const [payloadGenHost, setPayloadGenHost] = useState('');
  const [payloadGenMethod, setPayloadGenMethod] = useState('CONNECT');
  const [payloadGenResult, setPayloadGenResult] = useState('');
  const [isPayloadGenAi, setIsPayloadGenAi] = useState(false);
  const [isGeneratingPayload, setIsGeneratingPayload] = useState(false);

  // Dead Drop State
  const [showDeadDrop, setShowDeadDrop] = useState(false);

  // Command Palette
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen((open) => !open);
        playCyberSound('hover');
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { 
        setErrorMsg("File is too large. Limit is 50MB.");
        return;
    }

    try {
      playCyberSound('click');
      setErrorMsg(null);
      setResult(null);
      setEditableConfig('');
      setStatus(AnalysisStatus.IDLE);
      setIsEditing(false);
      setLatency(null);
      setTargetHost(null);
      setGhostInput('');
      setGhostOutput('');
      setShowDeadDrop(false);
      
      const buffer = await file.arrayBuffer();
      const hexPreview = arrayBufferToHex(buffer);
      const textPreview = extractPrintableStrings(buffer);
      
      const entropyVal = calculateEntropy(buffer);
      setEntropy(entropyVal);

      const detectedProtocols = identifyProtocols(textPreview);
      setProtocols(detectedProtocols);

      // Attempt to find a target for network tools
      const artifacts = scanForArtifacts(buffer);
      const possibleHost = artifacts.find(a => a.startsWith('[IP]') || a.startsWith('[URL]'));
      if (possibleHost) {
          const rawHost = possibleHost.split(' ')[1];
          // Simple cleanup
          const cleanHost = rawHost.replace('http://', '').replace('https://', '').split('/')[0];
          setTargetHost(cleanHost);
      }

      setFileData({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        content: buffer,
        hexPreview,
        textPreview
      });
      
      setHistory(prev => [...prev.slice(-4), file.name]);

    } catch (e) {
      setErrorMsg("Failed to read file.");
      console.error(e);
    }
  };

  const startAnalysis = async () => {
    if (!fileData) return;
    
    playCyberSound('scan');
    setStatus(AnalysisStatus.ANALYZING);
    setErrorMsg(null);

    try {
      const signature = detectFileSignature(fileData.content);
      const artifacts = scanForArtifacts(fileData.content);
      
      const analysis = await analyzeConfigFile(
        fileData.name,
        fileData.hexPreview,
        fileData.textPreview,
        signature,
        artifacts,
        customApiKey
      );
      setResult(analysis);
      setEditableConfig(analysis.decryptedSegments.join('\n\n'));
      setStatus(AnalysisStatus.COMPLETED);
      playCyberSound('success');
    } catch (e: any) {
      setStatus(AnalysisStatus.ERROR);
      setErrorMsg(e.message || "An unknown error occurred during analysis.");
    }
  };

  const handleManualDecode = () => {
      playCyberSound('click');
      try {
          const res = atob(manualDecodeInput);
          setManualDecodeResult(res);
      } catch(e) {
          try {
             const res = decodeURIComponent(manualDecodeInput);
             setManualDecodeResult(res);
          } catch(err) {
              setManualDecodeResult("Could not decode. Invalid Base64 or URL format.");
          }
      }
  }

  const handleGhostCloak = (mode: 'base64' | 'hex' | 'rot13') => {
    if (!ghostInput) return;
    playCyberSound('click');
    let res = '';
    try {
      if (mode === 'base64') res = btoa(ghostInput);
      else if (mode === 'hex') res = textToHex(ghostInput);
      else if (mode === 'rot13') res = toRot13(ghostInput);
      setGhostOutput(res);
    } catch (e) {
      setGhostOutput("Error encoding.");
    }
  };

  const handlePayloadGeneration = async () => {
      if (!payloadGenHost) return;
      playCyberSound('click');
      setIsGeneratingPayload(true);
      
      try {
          let res = '';
          if (isPayloadGenAi && customApiKey) {
               // Cloud AI Generation
               res = await generateAiPayload(payloadGenHost, payloadGenMethod, customApiKey);
          } else {
               // Local Template Generation
               res = generateLocalPayload(payloadGenHost, payloadGenMethod);
          }
          setPayloadGenResult(res);
      } catch (e) {
          setPayloadGenResult("Error generating payload. Check API Key or Input.");
      } finally {
          setIsGeneratingPayload(false);
      }
  };

  const runLatencyTest = async () => {
    if (!targetHost) return;
    setPinging(true);
    playCyberSound('hover');
    
    const start = performance.now();
    try {
        // Real network request. Mode no-cors allows us to measure time even if the resource blocks reading.
        // We guess the protocol.
        const protocol = targetHost.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'http' : 'https';
        await fetch(`${protocol}://${targetHost}`, { mode: 'no-cors', signal: AbortSignal.timeout(5000) });
    } catch (e) {
        // Ignore errors, we just want the timing (even if it failed to connect, that's latency/timeout)
    }
    const end = performance.now();
    const duration = Math.round(end - start);
    
    setLatency(duration);
    setPinging(false);
  };

  const exportReport = () => {
      if(!result) return;
      playCyberSound('click');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", `CIPHER_REPORT_${fileData?.name}.json`);
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  }

  const downloadRebuiltEhi = () => {
      if(!editableConfig) return;
      playCyberSound('success');
      const blob = new Blob([editableConfig], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      const originalName = fileData?.name.replace(/\.[^/.]+$/, "") || "config";
      downloadAnchorNode.setAttribute("download", `${originalName}_unlocked.ehi`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
  };

  const applyExpirationPatch = () => {
    if (!newExpirationDate) return;
    playCyberSound('click');
    let newConfig = editableConfig;
    const datePattern = /"expiry":\s*"\d{4}-\d{2}-\d{2}"/g;
    
    if (datePattern.test(newConfig)) {
       newConfig = newConfig.replace(datePattern, `"expiry": "${newExpirationDate}"`);
    } else {
       const insertionPoint = newConfig.lastIndexOf('}');
       if(insertionPoint > -1) {
           newConfig = `/* PATCHED EXPIRY: ${newExpirationDate} */\n` + newConfig;
       } else {
           newConfig = `[EXPIRATION_EXTENDED_TO: ${newExpirationDate}]\n` + newConfig;
       }
    }
    setEditableConfig(newConfig);
    setIsEditing(true); 
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableConfig);
    setCopySuccess(true);
    playCyberSound('success');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const commands = [
      { name: 'Upload File', icon: <ArrowUpTrayIcon className="h-4 w-4" />, action: () => fileInputRef.current?.click() },
      { name: 'Manual Decode', icon: <WrenchScrewdriverIcon className="h-4 w-4" />, action: () => document.getElementById('manual-decoder')?.scrollIntoView() },
      { name: 'Ghost Protocol', icon: <EyeSlashIcon className="h-4 w-4" />, action: () => document.getElementById('ghost-protocol')?.scrollIntoView() },
      { name: 'Payload Generator', icon: <CodeBracketSquareIcon className="h-4 w-4" />, action: () => document.getElementById('payload-generator')?.scrollIntoView() },
      { name: 'Clear Session', icon: <Cog6ToothIcon className="h-4 w-4" />, action: () => setFileData(null) },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-hacker-green selection:text-black relative overflow-hidden">
      
      <ParticleBackground />
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} actions={commands} />

      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
            <CipherLogo />
            <div className="flex flex-col">
                 <GlitchText text="CIPHER" as="span" className="font-bold text-2xl tracking-widest text-white group-hover:text-hacker-green transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             {/* API Input - Fixed Mobile Visibility and Width */}
             <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:border-hacker-green/50 transition-all group backdrop-blur-sm">
                <KeyIcon className="h-4 w-4 text-gray-500 group-focus-within:text-hacker-green mr-2 flex-shrink-0" />
                <input 
                  type="password" 
                  placeholder="API Key" 
                  value={customApiKey}
                  onChange={handleApiKeyChange}
                  className="bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none w-24 md:w-48 font-mono"
                />
             </div>
             <button onClick={() => setIsCmdOpen(true)} className="p-2 text-gray-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all" title="Cmd+K">
                <CommandLineIcon className="h-5 w-5" />
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10 pb-20">
        
        {/* HERO SECTION - 3D & GLITCH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-10">
             <div className="space-y-6">
                 <div className="inline-block px-3 py-1 border border-hacker-green/30 bg-hacker-green/5 rounded-full text-hacker-green text-xs font-mono font-bold tracking-widest animate-pulse-fast">
                    SECURE CONNECTION
                 </div>
                 <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
                    <GlitchText text="DECRYPT" as="span" /> <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-hacker-green to-cyber-blue">THE UNSEEN</span>
                 </h1>
                 <p className="text-gray-400 text-lg max-w-md">
                    Advanced forensic analysis for binary files. Recover payloads, identify protocols, and visualize obfuscated data structures in real-time.
                 </p>
                 
                 <div className="flex gap-4">
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       onMouseEnter={() => playCyberSound('hover')}
                       className="px-8 py-4 bg-hacker-green text-black font-bold rounded-lg hover:bg-green-400 shadow-[0_0_20px_rgba(0,255,65,0.3)] flex items-center gap-2 transition-transform active:scale-95"
                     >
                        <ArrowUpTrayIcon className="h-5 w-5" /> INITIALIZE UPLOAD
                     </button>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                 </div>
             </div>
             
             <div className="flex justify-center items-center relative h-64 md:h-96">
                <div className="absolute inset-0 bg-gradient-to-tr from-hacker-green/20 to-transparent rounded-full blur-[100px] opacity-30"></div>
                <Tesseract3D />
             </div>
        </div>

        {/* ANALYSIS DASHBOARD */}
        {fileData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
            
            {/* Left Column: Inspector */}
            <div className="lg:col-span-8 space-y-6">
               <TiltCard className="p-1">
                   <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                     <h3 className="text-lg font-bold flex items-center gap-2 text-white font-mono">
                       <DocumentTextIcon className="h-5 w-5 text-hacker-green" />
                       BINARY_INSPECTOR.HEX
                     </h3>
                     <span className="px-2 py-1 bg-hacker-green/10 text-hacker-green rounded text-xs font-mono border border-hacker-green/20">
                        {detectFileSignature(fileData.content)}
                     </span>
                   </div>
                   <div className="p-4 bg-black/60">
                      <HexViewer data={fileData.content} />
                   </div>
                   <div className="p-4 border-t border-white/10 bg-black/40">
                      <button 
                        onClick={startAnalysis}
                        disabled={status === AnalysisStatus.ANALYZING}
                        className={`w-full py-4 rounded-lg font-bold tracking-widest text-sm font-mono border transition-all
                          ${status === AnalysisStatus.ANALYZING 
                            ? 'border-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'border-hacker-green text-hacker-green hover:bg-hacker-green hover:text-black shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                          }`}
                      >
                        {status === AnalysisStatus.ANALYZING ? 'SCANNING_SECTORS...' : 'EXECUTE_FORENSIC_ANALYSIS()'}
                      </button>
                   </div>
               </TiltCard>

               {/* RESULTS AREA */}
               {status === AnalysisStatus.COMPLETED && result && (
                <div className="space-y-6">
                  {/* EDITOR CARD */}
                  <TiltCard className="overflow-hidden relative">
                    {status === AnalysisStatus.COMPLETED && <ScanlineOverlay />}
                    <div className="bg-[#111]/90 p-4 border-b border-white/10 flex justify-between items-center backdrop-blur-md">
                        <span className="text-cyber-blue font-mono font-bold flex items-center gap-2">
                           <CommandLineIcon className="h-5 w-5" /> {isEditing ? 'PATCH_MODE' : 'RECOVERED_DATA'}
                        </span>
                        <div className="flex gap-2">
                             <button onClick={() => setShowDeadDrop(!showDeadDrop)} className={`text-xs px-3 py-1 rounded font-bold transition-colors flex items-center gap-1 ${showDeadDrop ? 'bg-hacker-green text-black' : 'bg-white/10 text-white'}`}>
                                 <QrCodeIcon className="h-3 w-3" /> Dead Drop
                             </button>
                             <button onClick={() => setIsEditing(!isEditing)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition-colors">
                                 {isEditing ? 'Save' : 'Edit'}
                             </button>
                             <button onClick={copyToClipboard} className="text-xs bg-hacker-green text-black px-3 py-1 rounded font-bold hover:bg-green-400 transition-colors">
                                 {copySuccess ? 'Copied' : 'Copy'}
                             </button>
                        </div>
                    </div>
                    
                    <div className="relative bg-black/80 flex">
                        {/* DEAD DROP OVERLAY */}
                        {showDeadDrop && (
                            <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur animate-in fade-in">
                                <h3 className="text-hacker-green font-mono text-xl font-bold mb-4 tracking-widest">DEAD DROP // P2P SHARE</h3>
                                <div className="p-4 bg-white rounded-lg">
                                    <QRCode 
                                        value={(editableConfig || "NO_DATA").substring(0, 2000)} 
                                        size={200} 
                                        level="L"
                                    />
                                </div>
                                {editableConfig && editableConfig.length > 2000 && (
                                    <p className="text-red-500 text-[10px] mt-2 font-mono">
                                        Warning: Data truncated for QR Code capacity.
                                    </p>
                                )}
                                <p className="mt-4 text-gray-500 text-xs font-mono max-w-xs text-center">
                                    Scan with another device to transfer configuration via Air Gap. No network required.
                                </p>
                                <button onClick={() => setShowDeadDrop(false)} className="mt-6 text-gray-400 hover:text-white text-sm">CLOSE CHANNEL</button>
                            </div>
                        )}

                         {isEditing ? (
                          <textarea 
                            value={editableConfig}
                            onChange={(e) => setEditableConfig(e.target.value)}
                            className="w-full h-[500px] bg-transparent p-6 font-mono text-sm text-cyber-blue focus:outline-none resize-none"
                            spellCheck={false}
                          />
                        ) : (
                          <div className="p-6 font-mono text-sm space-y-3 h-[500px] overflow-y-auto bg-transparent scrollbar-hide w-full">
                             {editableConfig ? (
                               <pre className="whitespace-pre-wrap text-gray-300 break-all">{editableConfig}</pre>
                             ) : (
                               <div className="text-red-500 italic flex items-center gap-2 h-full justify-center">
                                 <LockClosedIcon className="h-6 w-6" /> DATA_ENCRYPTED // NO_CLEARTEXT_FOUND
                               </div>
                             )}
                          </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-[#111]/90 border-t border-white/10 flex justify-between items-center backdrop-blur-md">
                         <div className="flex items-center bg-black border border-gray-700 rounded px-3 py-1">
                              <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <input 
                                type="date" 
                                className="bg-transparent text-xs text-white focus:outline-none"
                                value={newExpirationDate}
                                onChange={(e) => setNewExpirationDate(e.target.value)}
                              />
                              <button onClick={applyExpirationPatch} className="ml-2 text-[10px] text-hacker-green font-bold uppercase hover:text-white">Patch</button>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={exportReport} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><ArrowDownTrayIcon className="h-3 w-3"/> JSON</button>
                             <button onClick={downloadRebuiltEhi} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-bold shadow-lg shadow-blue-900/50">BUILD .EHI</button>
                         </div>
                    </div>
                  </TiltCard>

                  {/* AI INSIGHT */}
                  <TiltCard className="border-l-4 border-l-hacker-green">
                      <div className="p-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2 font-mono">
                           <ShieldCheckIcon className="h-5 w-5 text-hacker-green" /> 
                           AUDIT_LOG // {result.aiInsight.includes("LOCAL") ? "OFFLINE" : "CLOUD"}
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line font-mono opacity-80">
                           {result.aiInsight}
                        </p>
                      </div>
                  </TiltCard>
                </div>
              )}
            </div>

            {/* Right Column: Cyber Toolkit */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* File Telemetry */}
                <TiltCard className="p-5">
                    <h4 className="text-hacker-green text-xs font-bold uppercase tracking-widest mb-4 font-mono">Target Telemetry</h4>
                    <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Filename</span>
                            <span className="text-white truncate max-w-[150px]">{fileData.name}</span>
                        </div>
                         <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500">Size</span>
                            <span className="text-white">{(fileData.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">MIME</span>
                            <span className="text-white truncate max-w-[150px]">{fileData.type}</span>
                        </div>
                    </div>
                </TiltCard>

                {/* Entropy */}
                <TiltCard className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <ChartBarIcon className="h-4 w-4" /> Entropy
                        </h4>
                        <span className={`text-sm font-bold font-mono ${entropy > 75 ? 'text-red-500' : 'text-hacker-green'}`}>
                            {entropy.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-1.5 mb-2 overflow-hidden border border-white/10">
                        <div 
                            className={`h-full transition-all duration-1000 ${entropy > 75 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-hacker-green shadow-[0_0_10px_#00ff41]'}`} 
                            style={{ width: `${entropy}%` }}
                        ></div>
                    </div>
                </TiltCard>

                {/* AI Payload Generator */}
                <div id="payload-generator">
                    <TiltCard className="p-5">
                        <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                             <CodeBracketSquareIcon className="h-4 w-4" /> Payload Generator
                        </h4>
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                placeholder="Bug Host (e.g. m.facebook.com)"
                                value={payloadGenHost}
                                onChange={(e) => setPayloadGenHost(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded text-xs p-2 text-white focus:border-yellow-500 focus:outline-none font-mono"
                            />
                            <div className="flex gap-2">
                                <select 
                                    value={payloadGenMethod} 
                                    onChange={(e) => setPayloadGenMethod(e.target.value)}
                                    className="bg-black/50 border border-gray-700 rounded text-xs p-2 text-white focus:border-yellow-500 outline-none flex-1"
                                >
                                    <option value="CONNECT">CONNECT</option>
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="HEAD">HEAD</option>
                                    <option value="SPLIT">SPLIT (Dual)</option>
                                </select>
                                <button 
                                    onClick={() => setIsPayloadGenAi(!isPayloadGenAi)} 
                                    className={`text-[10px] px-2 rounded border font-bold ${isPayloadGenAi ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
                                >
                                    {isPayloadGenAi ? 'AI MODE' : 'LOCAL'}
                                </button>
                            </div>
                            <button 
                                onClick={handlePayloadGeneration}
                                disabled={isGeneratingPayload || !payloadGenHost}
                                className="w-full py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/50 rounded text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {isGeneratingPayload ? 'GENERATING...' : 'GENERATE PAYLOAD'}
                            </button>
                        </div>
                        {payloadGenResult && (
                             <div className="mt-3 bg-black p-2 rounded text-[10px] text-yellow-200 font-mono break-all border border-yellow-500/20 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                 {payloadGenResult}
                             </div>
                         )}
                    </TiltCard>
                </div>

                {/* Ghost Protocol */}
                <div id="ghost-protocol">
                    <TiltCard className="p-5">
                        <h4 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <EyeSlashIcon className="h-4 w-4" /> Ghost Protocol
                        </h4>
                        <input 
                            type="text" 
                            placeholder="Input payload..."
                            value={ghostInput}
                            onChange={(e) => setGhostInput(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded text-xs p-3 text-white mb-3 focus:border-purple-500 focus:outline-none font-mono transition-colors"
                        />
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {['base64', 'hex', 'rot13'].map((m) => (
                                <button key={m} onClick={() => handleGhostCloak(m as any)} className="bg-white/5 hover:bg-purple-900/30 text-[10px] py-2 rounded text-gray-300 uppercase font-bold border border-white/5 hover:border-purple-500/50 transition-all">
                                    {m}
                                </button>
                            ))}
                        </div>
                        {ghostOutput && (
                            <div className="bg-black p-3 rounded text-xs text-purple-300 font-mono break-all border border-purple-500/20">
                                {ghostOutput}
                            </div>
                        )}
                    </TiltCard>
                </div>

                {/* Manual Decoder */}
                <div id="manual-decoder">
                    <TiltCard className="p-5">
                        <h4 className="text-cyber-blue text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-4 w-4" /> Decoder Tool
                        </h4>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Paste encoded string..."
                                value={manualDecodeInput}
                                onChange={(e) => setManualDecodeInput(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded text-xs p-2 text-white focus:border-cyber-blue focus:outline-none font-mono"
                            />
                            <button onClick={handleManualDecode} className="px-3 bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 rounded hover:bg-cyber-blue/40">
                                <BoltIcon className="h-4 w-4" />
                            </button>
                        </div>
                        {manualDecodeResult && (
                             <div className="mt-3 bg-black p-2 rounded text-xs text-cyber-blue font-mono break-all border border-cyber-blue/20">
                                 {manualDecodeResult}
                             </div>
                         )}
                    </TiltCard>
                </div>
                
                 {/* Latency - REAL CHECK */}
                 {/* Only show if a target host was actually found in the file */}
                 {targetHost ? (
                    <TiltCard className="p-5">
                         <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                            <SignalIcon className="h-4 w-4" /> Network Connectivity
                        </h4>
                         <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 mb-1">TARGET: {targetHost}</span>
                                <div className="text-xl font-mono text-white">
                                    {latency !== null ? `${latency} ms` : '--'} 
                                </div>
                            </div>
                            <button onClick={runLatencyTest} disabled={pinging} className="text-blue-400 hover:text-white transition-colors disabled:opacity-50">
                                <ArrowUpTrayIcon className={`h-5 w-5 ${pinging ? 'animate-bounce' : ''}`} />
                            </button>
                         </div>
                    </TiltCard>
                 ) : (
                    <TiltCard className="p-5 opacity-50">
                         <h4 className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <SignalIcon className="h-4 w-4" /> Network Connectivity
                        </h4>
                        <div className="text-xs text-gray-600 italic">No valid host/IP detected in file artifacts.</div>
                    </TiltCard>
                 )}

            </div>
          </div>
        )}
      </main>
      
      {/* FOOTER - TELEGRAM */}
      <footer className="fixed bottom-0 w-full p-2 bg-black/80 backdrop-blur text-center z-50 border-t border-white/5">
        <a href="https://t.me/cipher_attacks" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-hacker-green transition-colors">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0 .056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          @cipher_attacks
        </a>
      </footer>
    </div>
  );
};

export default App;