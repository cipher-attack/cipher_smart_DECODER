import React, { useEffect, useRef, useState, MouseEvent } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// --- 1. NEURAL NETWORK PARTICLE CORE ---
export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number }[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(100, (window.innerWidth * window.innerHeight) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff41';
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.15)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = 1 - dist / 150;
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20" />;
};

// --- 2. 3D ROTATING TESSERACT ---
export const Tesseract3D: React.FC = () => {
  return (
    <div className="w-24 h-24 scene-3d pointer-events-none opacity-80">
      <div className="cube-3d">
        <div className="cube-face cube-face-front">0x01</div>
        <div className="cube-face cube-face-back">0xAF</div>
        <div className="cube-face cube-face-right">CIPHER</div>
        <div className="cube-face cube-face-left">SECURE</div>
        <div className="cube-face cube-face-top">KEY</div>
        <div className="cube-face cube-face-bottom">DATA</div>
      </div>
    </div>
  );
};

// --- 3. 3D HOLOGRAPHIC TILT CARD ---
export const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Invert for natural tilt
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.borderColor = 'rgba(0, 255, 65, 0.4)';
    card.style.boxShadow = '0 10px 30px -10px rgba(0, 255, 65, 0.2)';
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.borderColor = 'rgba(31, 41, 55, 0.5)'; // gray-800 equivalent
    card.style.boxShadow = 'none';
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-all duration-200 ease-out border border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-xl ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  );
};

// --- 4. CYBER GLITCH TYPOGRAPHY ---
export const GlitchText: React.FC<{ text: string; as?: 'h1' | 'h2' | 'h3' | 'span'; className?: string }> = ({ text, as = 'span', className = '' }) => {
  const Tag = as;
  return (
    <div className="glitch-wrapper relative" data-text={text}>
       <Tag className={`relative z-10 ${className}`}>{text}</Tag>
    </div>
  );
};

// --- 5. MAGNETIC BUTTON ---
export const MagneticButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    btnRef.current.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = `translate(0px, 0px)`;
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-100 ease-linear ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- 6. SCANLINE OVERLAY ---
export const ScanlineOverlay: React.FC = () => (
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-20 rounded-xl">
    <div className="scanline"></div>
  </div>
);

// --- 7. COMMAND PALETTE (CMD+K) ---
export const CommandPalette: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  actions: { name: string; icon: React.ReactNode; action: () => void }[] 
}> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  
  const filtered = actions.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-hacker-green rounded-xl shadow-[0_0_50px_rgba(0,255,65,0.2)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center border-b border-gray-800 px-4 py-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 mr-3" />
            <input 
              autoFocus
              className="bg-transparent w-full text-white focus:outline-none font-mono"
              placeholder="Type a command..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded">ESC</span>
        </div>
        <div className="max-h-60 overflow-y-auto">
            {filtered.map((action, i) => (
                <button 
                  key={i}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-hacker-green hover:text-black flex items-center gap-3 transition-colors"
                  onClick={() => { action.action(); onClose(); }}
                >
                    {action.icon}
                    {action.name}
                </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No commands found.</div>}
        </div>
      </div>
    </div>
  );
};
