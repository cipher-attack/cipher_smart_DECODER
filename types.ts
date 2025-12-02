export interface FileData {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
  hexPreview: string; // First 1KB as hex string
  textPreview: string; // Printable characters extracted
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  fileType: string;
  encryptionMethod: string | null;
  extractedMetadata: Record<string, string>;
  decryptedSegments: string[]; // New field for potential payload/config recovery
  aiInsight: string;
  structure: string;
}

export type ThemeColor = 'green' | 'blue' | 'purple' | 'red';