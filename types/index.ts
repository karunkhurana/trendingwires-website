export type Category =
  | 'all'
  | 'ai-tech'
  | 'business'
  | 'world'
  | 'science'
  | 'social'
  | 'innovation';

export interface Video {
  id: string;           // YouTube video ID
  title: string;
  description: string;
  thumbnail: string;    // ytimg URL
  publishedAt: string;  // ISO date string
  category: Category;
  platform: 'youtube' | 'instagram' | 'tiktok';
  viewCount?: number;
  likeCount?: number;
  duration?: string;    // e.g. "0:58"
  tags?: string[];
}

export interface Subscriber {
  email: string;
  subscribedAt: string;
  source?: string;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  nextToken?: string;
}
