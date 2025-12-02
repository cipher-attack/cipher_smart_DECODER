export const arrayBufferToHex = (buffer: ArrayBuffer, limit: number = 1024): string => {
  const bytes = new Uint8Array(buffer);
  const len = Math.min(bytes.length, limit);
  let hex = '';
  for (let i = 0; i < len; i++) {
    const byte = bytes[i].toString(16).padStart(2, '0');
    hex += byte + ' ';
    if ((i + 1) % 16 === 0) hex += '\n';
  }
  return hex.toUpperCase();
};

export const extractPrintableStrings = (buffer: ArrayBuffer, minLength: number = 3): string => {
  const bytes = new Uint8Array(buffer);
  let result = '';
  let currentString = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Expanded printable range to catch some extended ASCII often used in obfuscation
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 9) {
      currentString += String.fromCharCode(byte);
    } else {
      if (currentString.length >= minLength) {
        result += currentString + '\n';
      }
      currentString = '';
    }
  }
  if (currentString.length >= minLength) {
    result += currentString + '\n';
  }
  
  return result.substring(0, 50000); // Increased limit for larger files
};

export const detectFileSignature = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer).slice(0, 8); // Read more bytes
  const signature = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  // Archives / VPN Configs
  if (signature.startsWith('504B0304')) return 'ZIP Archive / Open Document / Android APK';
  if (signature.startsWith('656869')) return 'HTTP Injector (.ehi)';
  if (signature.startsWith('1F8B')) return 'GZIP Compressed';
  
  // Images
  if (signature.startsWith('89504E47')) return 'PNG Image';
  if (signature.startsWith('FFD8FF')) return 'JPEG Image';
  if (signature.startsWith('47494638')) return 'GIF Image';
  if (signature.startsWith('424D')) return 'BMP Image';
  if (signature.startsWith('52494646') && signature.includes('57454250')) return 'WebP Image';

  // Documents
  if (signature.startsWith('25504446')) return 'PDF Document';
  
  // Media
  if (signature.startsWith('66747970')) return 'MP4 Video / M4A Audio';
  if (signature.startsWith('494433')) return 'MP3 Audio';
  
  // Executables
  if (signature.startsWith('4D5A')) return 'Windows Executable (EXE/DLL)';
  if (signature.startsWith('7F454C46')) return 'ELF Executable (Linux/Android)';
  
  // Data
  if (signature.startsWith('7B')) return 'JSON Object';
  if (signature.startsWith('53514C69')) return 'SQLite Database';
  
  return 'Unknown Binary / Raw Data';
};

export const calculateEntropy = (buffer: ArrayBuffer): number => {
  const bytes = new Uint8Array(buffer);
  const frequencies = new Array(256).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    frequencies[bytes[i]]++;
  }
  
  let entropy = 0;
  const len = bytes.length;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / len;
      entropy -= p * Math.log2(p);
    }
  }
  return Math.min(100, (entropy / 8) * 100);
};

export const identifyProtocols = (text: string): string[] => {
  const protocols = [];
  if (/ssh|dropbear|openssh/i.test(text)) protocols.push('SSH/Dropbear');
  if (/vmess|vless/i.test(text)) protocols.push('V2Ray/Vmess');
  if (/trojan/i.test(text)) protocols.push('Trojan');
  if (/shadowsocks|ss:/i.test(text)) protocols.push('Shadowsocks');
  if (/openvpn|ovpn/i.test(text)) protocols.push('OpenVPN');
  if (/hysteria/i.test(text)) protocols.push('Hysteria');
  if (/dnstt/i.test(text)) protocols.push('DNSTT (DNS Tunnel)');
  // Generic protocols
  if (/http\/\d\.\d/i.test(text)) protocols.push('HTTP/HTTPS');
  if (/ftp/i.test(text)) protocols.push('FTP');
  if (/smtp|imap|pop3/i.test(text)) protocols.push('Email Protocol');
  return protocols;
};

// Recursive Base64 finder
const findAndDecodeBase64 = (text: string, depth: number = 0): string[] => {
    if (depth > 2) return []; 

    const base64Regex = /[a-zA-Z0-9+/=]{20,}/g; 
    const matches = text.match(base64Regex) || [];
    const decoded: string[] = [];
  
    matches.forEach(match => {
      try {
        const dec = atob(match);
        let readableCount = 0;
        for(let i=0; i<dec.length; i++) {
            const code = dec.charCodeAt(i);
            if(code > 31 && code < 127) readableCount++;
        }
        if (dec.length > 5 && (readableCount / dec.length > 0.6)) { 
             const cleanDec = dec.substring(0, 200).replace(/\n/g, ' ');
             decoded.push(`[Decoded Base64 L${depth+1}] ${cleanDec}`);
             decoded.push(...findAndDecodeBase64(dec, depth + 1));
        }
      } catch (e) { }
    });
    return decoded;
};

// --- NEW DECODING HELPERS FOR LOCAL ANALYSIS ---

export const decodeVmessLink = (link: string): string => {
    try {
        const b64 = link.replace('vmess://', '');
        const jsonStr = atob(b64);
        const obj = JSON.parse(jsonStr);
        return `V2RAY CONFIG (VMESS):\nServer: ${obj.add}\nPort: ${obj.port}\nUUID: ${obj.id}\nNetwork: ${obj.net}\nTLS: ${obj.tls}\nPath: ${obj.path || 'none'}\nSNI: ${obj.host || obj.sni || 'none'}`;
    } catch (e) {
        return `FAILED_TO_DECODE_VMESS: ${link.substring(0, 20)}...`;
    }
};

export const decodeTrojanLink = (link: string): string => {
    try {
        // trojan://password@host:port?params#name
        const url = new URL(link);
        return `TROJAN CONFIG:\nHost: ${url.hostname}\nPort: ${url.port}\nPassword: ${url.username}\nSNI: ${url.searchParams.get('sni') || 'none'}\nType: ${url.searchParams.get('type') || 'tcp'}`;
    } catch (e) {
         return `FAILED_TO_DECODE_TROJAN: ${link.substring(0, 20)}...`;
    }
};

export const scanForArtifacts = (buffer: ArrayBuffer): string[] => {
  const fullText = extractPrintableStrings(buffer, 4); 
  const artifacts: string[] = [];

  // 1. Base64 Hunting
  const decodedBase64 = findAndDecodeBase64(fullText);
  artifacts.push(...decodedBase64);

  // 2. Universal Artifact Patterns
  const patterns = {
    // Network
    ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    domain: /([a-zA-Z0-9-]+\.)+(com|net|org|io|xyz|co|uk|us|me|info|biz|gov|edu)/gi,
    url: /https?:\/\/[^\s"']+/gi,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    
    // VPN / Proxy specific
    links: /(vmess|vless|trojan|ss|ssr):\/\/[a-zA-Z0-9+/=_=-]+/gi,
    payload: /(CONNECT|GET|POST|PUT|HEAD|OPTIONS|TRACE) [^\s]+ HTTP/gi,
    
    // System / File
    path: /([a-zA-Z]:\\[^\s<>:"|?*]+)|(\/[a-zA-Z0-9._-]+)+/g, // Windows & Unix paths
    date: /\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g, // YYYY-MM-DD
    
    // Keys / Secrets
    key: /(api_key|secret|password|auth|token|access_key)[\s=:"']{1,3}[a-zA-Z0-9_-]{8,}/gi
  };

  const lines = fullText.split('\n');
  const foundItems = new Set<string>();

  const addItem = (tag: string, value: string) => {
      if (value.length > 3 && !foundItems.has(value)) {
          foundItems.add(value);
          artifacts.push(`[${tag}] ${value}`);
      }
  };

  // Pre-scan full text for matches
  const urls = fullText.match(patterns.url);
  if (urls) urls.forEach(u => addItem('URL', u));
  
  const emails = fullText.match(patterns.email);
  if (emails) emails.forEach(e => addItem('EMAIL', e));

  const keys = fullText.match(patterns.key);
  if (keys) keys.forEach(k => addItem('POTENTIAL_SECRET', k));

  // Line by line scan for specific context
  lines.forEach(line => {
    const l = line.trim();
    if (l.length < 4) return;

    // VPN Links
    const linkMatches = l.match(patterns.links);
    if (linkMatches) linkMatches.forEach(link => addItem('VPN_LINK', link));

    // HTTP Payload
    if (l.match(patterns.payload)) addItem('HTTP_PAYLOAD', l);

    // IPs
    const ips = l.match(patterns.ip);
    if (ips) {
        ips.forEach(ip => {
             if(!ip.startsWith('0.') && ip !== '127.0.0.1') addItem('IP', ip);
        });
    }

    // Paths
    const paths = l.match(patterns.path);
    if (paths) {
        paths.forEach(p => {
            if(p.length > 10 && !p.includes('node_modules')) addItem('FILE_PATH', p);
        });
    }
    
    // Dates
    const dates = l.match(patterns.date);
    if (dates) dates.forEach(d => addItem('DATE', d));
  });

  return [...new Set(artifacts)].slice(0, 80); 
};

export const toRot13 = (str: string): string => {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 90 : 122;
    const charCode = c.charCodeAt(0) + 13;
    return String.fromCharCode(charCode <= base ? charCode : charCode - 26);
  });
};

export const textToHex = (str: string): string => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
};

// --- PAYLOAD GENERATOR UTILS (OFFLINE) ---
export const generateLocalPayload = (host: string, method: string): string => {
  const h = host.trim() || 'example.com';
  switch (method) {
    case 'CONNECT':
      return `CONNECT ${h}:443 HTTP/1.1[crlf]Host: ${h}[crlf]X-Online-Host: ${h}[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]`;
    case 'GET':
      return `GET http://${h}/ HTTP/1.1[crlf]Host: ${h}[crlf]X-Online-Host: ${h}[crlf]X-Forward-Host: ${h}[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]`;
    case 'POST':
      return `POST http://${h}/ HTTP/1.1[crlf]Host: ${h}[crlf]Content-Length: 9999999999[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]`;
    case 'PUT':
      return `PUT http://${h}/ HTTP/1.1[crlf]Host: ${h}[crlf]X-Online-Host: ${h}[crlf]Connection: Keep-Alive[crlf][crlf]`;
    case 'HEAD':
      return `HEAD http://${h}/ HTTP/1.1[crlf]Host: ${h}[crlf]Connection: Keep-Alive[crlf][crlf]`;
    case 'SPLIT':
      return `GET http://${h}/ HTTP/1.1[crlf]Host: ${h}[crlf]X-Online-Host: ${h}[crlf]X-Forwarded-For: ${h}[crlf]Connection: Keep-Alive[split]CONNECT ${h}:443 HTTP/1.1[crlf]Host: ${h}[crlf][crlf]`;
    default:
      return `CONNECT ${h}:443 HTTP/1.1[crlf]Host: ${h}[crlf][crlf]`;
  }
};