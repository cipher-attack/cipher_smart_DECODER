import { AnalysisResult } from '../types';
import { decodeVmessLink, decodeTrojanLink } from '../utils/fileHelpers';

// This function acts as a "Local AI" - it uses regex and logic to build a report
// without needing an API key or internet connection.
export const performLocalAnalysis = async (
    fileName: string,
    signature: string,
    artifacts: string[]
): Promise<AnalysisResult> => {
    
    // 1. Initialize empty result structure
    const extractedMetadata: Record<string, string> = {};
    const decryptedSegments: string[] = [];
    let fileType = signature.split(' / ')[0] || 'Unknown Binary';
    let insight = `CIPHER LOCAL ENGINE REPORT\n\nTarget: ${fileName}\nMode: OFFLINE / LOCAL HEURISTICS\n\n`;

    // 2. Process Artifacts to categorize data
    const ips: string[] = [];
    const domains: string[] = [];
    const urls: string[] = [];
    const emails: string[] = [];
    const keys: string[] = [];
    
    artifacts.forEach(art => {
        if (art.includes('[IP]')) ips.push(art.replace('[IP] ', ''));
        else if (art.includes('[URL]')) urls.push(art.replace('[URL] ', ''));
        else if (art.includes('[EMAIL]')) emails.push(art.replace('[EMAIL] ', ''));
        else if (art.includes('[POTENTIAL_SECRET]')) keys.push(art.replace('[POTENTIAL_SECRET] ', ''));
        else if (art.includes('[VPN_LINK]')) {
             const link = art.replace('[VPN_LINK] ', '');
             if (link.startsWith('vmess://')) decryptedSegments.push(decodeVmessLink(link));
             else if (link.startsWith('trojan://')) decryptedSegments.push(decodeTrojanLink(link));
             else decryptedSegments.push(`RAW LINK: ${link}`);
        }
        else if (art.includes('.com') || art.includes('.net') || art.includes('.org')) {
             // Basic domain extraction from other tags
             const parts = art.split(' ');
             parts.forEach(p => {
                 if (p.includes('.') && !p.startsWith('[')) domains.push(p);
             });
        }
    });

    // 3. Build Decrypted Config / Recovered Data View
    if (decryptedSegments.length === 0) {
        // If no direct links found, build a config from loose artifacts
        if (ips.length > 0) decryptedSegments.push(`POSSIBLE PROXIES/HOSTS:\n${ips.join('\n')}`);
        if (domains.length > 0) decryptedSegments.push(`POSSIBLE SNI/BUG HOSTS:\n${domains.join('\n')}`);
        if (keys.length > 0) decryptedSegments.push(`POTENTIAL CREDENTIALS:\n${keys.join('\n')}`);
        
        // Add raw extracted strings that look interesting
        artifacts.filter(a => a.includes('HTTP') || a.includes('ssh')).forEach(a => decryptedSegments.push(a));
    }

    // 4. Fill Metadata
    extractedMetadata['File Name'] = fileName;
    extractedMetadata['Signature'] = signature;
    if (ips.length > 0) extractedMetadata['Primary Host Candidate'] = ips[0];
    if (emails.length > 0) extractedMetadata['Author Email'] = emails[0];
    extractedMetadata['Artifacts Found'] = artifacts.length.toString();

    // 5. Generate Insight
    if (fileName.endsWith('.ehi') || signature.includes('Injector')) {
        fileType = "HTTP Injector Config (.ehi)";
        insight += "Analysis indicates this is an HTTP Injector configuration file. ";
        if (decryptedSegments.length > 0) {
             insight += "The local engine successfully extracted potential proxy/payload information from the binary strings. ";
        } else {
             insight += "The configuration appears heavily obfuscated. No cleartext credentials were found in the standard blocks. ";
        }
    } else if (signature.includes('Image')) {
        insight += "File identified as an Image. ";
        if (extractedMetadata['Author Email']) insight += `Metadata contains email address: ${extractedMetadata['Author Email']}. `;
    } else {
        insight += `File appears to be a ${fileType}. `;
    }

    insight += `\n\nSUMMARY:\n- ${ips.length} IP Addresses identified\n- ${domains.length} Domains/Hosts identified\n- ${keys.length} Potential Secrets/Keys identified`;

    return {
        fileType,
        encryptionMethod: "Unknown (Local Analysis)",
        extractedMetadata,
        decryptedSegments,
        aiInsight: insight,
        structure: "Binary Stream -> Artifact Extraction (Regex) -> Local Heuristics Engine"
    };
};
