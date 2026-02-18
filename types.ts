export enum AppMode {
  RESUME = 'resume',
  PORTFOLIO = 'portfolio',
  INTERVIEW = 'interview'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
  groundingUrls?: Array<{ uri: string; title: string }>;
  timestamp: Date;
  feedback?: 'helpful' | 'unhelpful';
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}
