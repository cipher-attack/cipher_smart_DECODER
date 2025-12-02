import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface HexViewerProps {
  data: ArrayBuffer;
}

const HexViewer: React.FC<HexViewerProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const hexLines = useMemo(() => {
    const bytes = new Uint8Array(data);
    // Only show first 512 bytes for performance in view, unless searching deeper? 
    // For now keep view limit but maybe highlight logic
    const slice = bytes.slice(0, 512); 
    const lines = [];
    
    for (let i = 0; i < slice.length; i += 16) {
      const chunk = slice.slice(i, i + 16);
      
      // Offset
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      
      // Hex representation
      const hex = Array.from(chunk)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
        
      // ASCII representation
      const ascii = Array.from(chunk)
        .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');
      
      lines.push({ offset, hex, ascii });
    }
    return lines;
  }, [data]);

  // Simple filtering for visualization
  const filteredLines = useMemo(() => {
    if (!searchTerm) return hexLines;
    const term = searchTerm.toLowerCase();
    return hexLines.filter(line => 
      line.hex.toLowerCase().includes(term) || 
      line.ascii.toLowerCase().includes(term) ||
      line.offset.toLowerCase().includes(term)
    );
  }, [hexLines, searchTerm]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search Hex / ASCII..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-gray-800 rounded pl-9 pr-4 py-2 text-xs font-mono text-white focus:border-hacker-green focus:outline-none"
        />
      </div>

      <div className="font-mono text-xs md:text-sm bg-black border border-gray-800 rounded-lg p-4 h-96 overflow-y-auto w-full shadow-inner shadow-black scrollbar-hide">
        <div className="grid grid-cols-[80px_1fr_100px] md:grid-cols-[80px_1fr_160px] gap-4 mb-2 text-gray-500 border-b border-gray-800 pb-2">
          <span>OFFSET</span>
          <span>HEX REPRESENTATION</span>
          <span>DECODED</span>
        </div>
        {filteredLines.length > 0 ? filteredLines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-[80px_1fr_100px] md:grid-cols-[80px_1fr_160px] gap-4 hover:bg-gray-900 transition-colors group">
            <span className="text-blue-500 select-none group-hover:text-blue-400">{line.offset}</span>
            <span className="text-hacker-green whitespace-pre-wrap break-all group-hover:text-green-400">{line.hex}</span>
            <span className="text-gray-300 tracking-widest group-hover:text-white">{line.ascii}</span>
          </div>
        )) : (
            <div className="text-center text-gray-500 py-8">No matches found in preview buffer.</div>
        )}
        <div className="mt-4 text-center text-gray-500 italic">
          ... End of Preview (First 512 Bytes) ...
        </div>
      </div>
    </div>
  );
};

export default HexViewer;