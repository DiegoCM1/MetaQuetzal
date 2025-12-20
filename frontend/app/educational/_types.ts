// Educational content types

export type ContentType = 'note' | 'video';

export interface Note {
  id: string;
  title: string;
  type: 'note';
  thumbnail: string;
  description: string;
  content: string; // Markdown content
  category: string;
  readTime: number; // minutes
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  type: 'video';
  thumbnail: string;
  description: string;
  youtubeId: string;
  youtubeUrl: string;
  category: string;
  duration: string; // e.g., "5:30"
  createdAt: string;
}

export type ContentItem = Note | Video;

export interface Category {
  id: string;
  name: string;
  icon: string;
}
