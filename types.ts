
export interface GeneratedMascot {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  isUltra?: boolean;
}

export interface PromptSuggestion {
  title: string;
  prompt: string;
  category: 'Action' | 'Crypto' | 'Luxury' | 'Funny';
}

export interface GenerationConfig {
  masterReference?: string; // base64 image data
  useUltra?: boolean;
}
