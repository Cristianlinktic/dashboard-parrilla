export interface ViewerComment {
  id: string;
  name: string;
  comment: string;
  timestamp: string;
}

export interface ContentItem {
  id: string;
  time: string; // format "HH:MM" from 07:00 to 22:59
  platform: 'facebook' | 'instagram' | 'tiktok' | 'x';
  type: 'post' | 'reel' | 'Story' | 'Trino' | 'Trino + imagen' | 'entrecomillados' | 'Espacio reservado';
  description: string;
  status: 'Publicado' | 'No Publicado' | 'Programado' | 'Rechazado' | 'Por crear contenido' | 'Paso a CNE';
  duration: number; // in minutes (e.g. 15, 30, 45, 60)
  url?: string;
  comments?: string;
  kpi?: string;
  viewerComments?: ViewerComment[];
}

export const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

export const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'FB' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'IG' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: 'TT' },
  { id: 'x', name: 'X (Twitter)', color: '#7c3aed', icon: 'X' }
] as const;

export type PlatformId = typeof PLATFORMS[number]['id'];

