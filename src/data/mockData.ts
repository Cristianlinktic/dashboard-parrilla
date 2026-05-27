export interface ContentItem {
  id: string;
  time: string; // format "HH:MM" from 07:00 to 22:59
  platform: 'facebook' | 'instagram' | 'tiktok' | 'x';
  type: 'post' | 'reel' | 'story';
  description: string;
  status: 'draft' | 'scheduled' | 'published';
  duration: number; // in minutes (e.g. 15, 30, 45, 60)
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
  { id: 'x', name: 'X (Twitter)', color: '#000000', icon: 'X' }
] as const;

export type PlatformId = typeof PLATFORMS[number]['id'];

export const INITIAL_CONTENT: ContentItem[] = [
  {
    id: '1',
    time: '07:00',
    platform: 'facebook',
    type: 'post',
    description: '¡Buenos días! Bienvenidos al Día 1 de nuestro gran evento tecnológico. Aquí compartimos la agenda completa de conferencias para hoy. ¡No te pierdas de nada!',
    status: 'scheduled',
    duration: 60
  },
  {
    id: '2',
    time: '07:15',
    platform: 'instagram',
    type: 'story',
    description: 'Video rápido en el backstage mostrando la preparación del equipo de producción y el escenario principal. Filtro de evento activado.',
    status: 'draft',
    duration: 30
  },
  {
    id: '3',
    time: '07:00',
    platform: 'x',
    type: 'post',
    description: '¡Arrancamos el #TechSummit2026! 🚀 Sigue este hilo para la cobertura en tiempo real de todas las ponencias de hoy. Abrimos puertas en 30 minutos.',
    status: 'scheduled',
    duration: 60
  },
  {
    id: '4',
    time: '09:30',
    platform: 'tiktok',
    type: 'reel',
    description: 'Detrás de cámaras: Trend con el staff técnico corriendo para tener todo listo antes del panel inaugural. Audio viral seleccionado.',
    status: 'published',
    duration: 30
  },
  {
    id: '5',
    time: '10:00',
    platform: 'instagram',
    type: 'reel',
    description: 'Resumen en video de 30 segundos del panel inicial: "El futuro de la IA generativa en Latinoamérica" por el ponente destacado.',
    status: 'published',
    duration: 60
  },
  {
    id: '6',
    time: '11:15',
    platform: 'x',
    type: 'post',
    description: '"La IA no reemplaza al talento humano; lo potencia para resolver problemas que antes eran imposibles." - Dra. Elena Gómez en #TechSummit2026',
    status: 'published',
    duration: 15
  },
  {
    id: '7',
    time: '13:00',
    platform: 'facebook',
    type: 'post',
    description: 'Galería de fotos del break de almuerzo y las zonas de networking. ¡Mucha energía y conexiones increíbles se están gestando hoy!',
    status: 'published',
    duration: 60
  },
  {
    id: '8',
    time: '14:30',
    platform: 'tiktok',
    type: 'reel',
    description: 'Entrevista de 5 segundos a 3 asistentes preguntándoles: "¿Qué es lo que más te ha sorprendido del evento hasta ahora?"',
    status: 'published',
    duration: 30
  },
  {
    id: '9',
    time: '15:15',
    platform: 'instagram',
    type: 'story',
    description: 'Encuesta interactiva en stories: "¿Cuál ha sido tu charla favorita de la tarde?" con opciones entre las dos salas principales.',
    status: 'draft',
    duration: 30
  },
  {
    id: '10',
    time: '16:00',
    platform: 'x',
    type: 'post',
    description: '¡Sala llena para el panel de Ciberseguridad y Blockchain! El auditorio principal está a máxima capacidad. 🔒💻 #TechSummit2026',
    status: 'scheduled',
    duration: 60
  },
  {
    id: '11',
    time: '17:30',
    platform: 'facebook',
    type: 'post',
    description: 'Transmisión en vivo del panel de clausura: "Tendencias tecnológicas globales para el 2027 y más allá". ¡Únete y deja tus preguntas!',
    status: 'draft',
    duration: 30
  },
  {
    id: '12',
    time: '18:00',
    platform: 'instagram',
    type: 'post',
    description: 'Carrete de fotos con los mejores momentos del Día 1. ¡Gracias a todos los speakers, patrocinadores y asistentes! Nos vemos mañana a las 8 AM.',
    status: 'draft',
    duration: 60
  },
  {
    id: '13',
    time: '20:15',
    platform: 'x',
    type: 'post',
    description: '🎉 ¡Gran cierre musical de la noche! Disfrutando del show principal del festival con todos los asistentes en vivo. #TechSummit2026',
    status: 'published',
    duration: 45
  },
  {
    id: '14',
    time: '21:00',
    platform: 'facebook',
    type: 'post',
    description: 'Resumen final del evento en video de alta calidad. ¡Gracias a todos por un día espectacular!',
    status: 'scheduled',
    duration: 60
  }
];
