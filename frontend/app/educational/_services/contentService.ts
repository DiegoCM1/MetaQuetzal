// Content service with mock data

import { Note, Video, ContentItem } from '../_types';

// Mock notes data
export const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'Cómo aplicar torniquetes',
    type: 'note',
    thumbnail: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400',
    description: 'Aprende la técnica correcta para aplicar un torniquete en emergencias',
    content: `# Cómo Aplicar Torniquetes

## ¿Cuándo usar un torniquete?

Un torniquete debe usarse cuando hay una hemorragia severa en una extremidad que no se puede controlar con presión directa.

## Pasos para aplicar un torniquete:

1. **Coloca el torniquete** de 2 a 3 pulgadas por encima de la herida
2. **Aprieta firmemente** hasta que la hemorragia se detenga
3. **Anota la hora** en la que se aplicó el torniquete
4. **No afloje** el torniquete hasta que llegue ayuda médica

## ⚠️ Advertencia

- Nunca coloques un torniquete sobre una articulación
- No cubras el torniquete con ropa
- Busca atención médica inmediatamente

## Materiales necesarios

- Torniquete comercial (preferido)
- En emergencia: cinturón, tela resistente + palo`,
    category: 'primeros-auxilios',
    readTime: 5,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Top 5 cosas más útiles durante un huracán',
    type: 'note',
    thumbnail: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=400',
    description: 'Elementos esenciales que no pueden faltar en tu hogar',
    content: `# Top 5 Cosas Más Útiles Durante un Huracán

## 1. Agua Potable

Almacena al menos **1 galón por persona por día** durante 3-7 días.

- Usa botellas selladas
- Rota el stock cada 6 meses
- Considera tabletas purificadoras

## 2. Linternas y Baterías

- Linternas LED de larga duración
- Baterías extras de todos los tamaños
- Linterna de manivela (no requiere baterías)

## 3. Radio de Emergencia

- Radio de baterías o manivela
- Sintoniza estaciones locales
- Mantente informado sobre el huracán

## 4. Kit de Primeros Auxilios

- Vendajes y gasas
- Antisépticos
- Medicamentos personales
- Manual de primeros auxilios

## 5. Alimentos No Perecederos

- Enlatados (con abrelatas manual)
- Barras energéticas
- Frutas secas
- Comida para bebés (si aplica)

## Tip Extra

💡 Mantén todo en un lugar accesible y fácil de transportar.`,
    category: 'preparacion',
    readTime: 7,
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    title: 'Qué hacer durante una inundación',
    type: 'note',
    thumbnail: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400',
    description: 'Protocolo de seguridad durante inundaciones',
    content: `# Qué Hacer Durante una Inundación

## 🚨 Reglas de Oro

### 1. Busca terreno alto INMEDIATAMENTE
- No esperes a que el agua suba más
- Evacua hacia el segundo piso o el techo
- Lleva tu kit de emergencia

### 2. Nunca cruces agua en movimiento
- 6 pulgadas de agua pueden derribarte
- 12 pulgadas pueden arrastrar un auto
- Si hay corriente, NO cruces

### 3. Evita el agua de inundación
- Puede estar contaminada
- Cables eléctricos pueden estar sumergidos
- Alcantarillas abiertas bajo el agua

## Durante la Inundación

- ✅ Mantente en terreno elevado
- ✅ Escucha la radio de emergencia
- ✅ Señaliza tu ubicación
- ❌ NO entres a edificios rodeados de agua
- ❌ NO toques equipo eléctrico mojado

## Después de la Inundación

1. Espera la señal de autoridades para regresar
2. Inspecciona daños con cuidado
3. Documenta todo para seguros
4. Desecha alimentos que tocaron agua

## Número de Emergencia

📞 **911** - Para emergencias inmediatas`,
    category: 'seguridad',
    readTime: 6,
    createdAt: '2024-01-05',
  },
];

// Mock videos data
export const MOCK_VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'Primeros Auxilios Básicos',
    type: 'video',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    description: '10 rutas de aprendizaje esenciales',
    youtubeId: 'dQw4w9WgXcQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'primeros-auxilios',
    duration: '12:30',
    createdAt: '2024-01-12',
  },
  {
    id: 'v2',
    title: 'Cómo Preparar tu Hogar',
    type: 'video',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    description: 'Protege tu casa antes del huracán',
    youtubeId: 'dQw4w9WgXcQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'preparacion',
    duration: '8:45',
    createdAt: '2024-01-08',
  },
  {
    id: 'v3',
    title: 'Evacuación Segura',
    type: 'video',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    description: 'Rutas y procedimientos de evacuación',
    youtubeId: 'dQw4w9WgXcQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'seguridad',
    duration: '15:20',
    createdAt: '2024-01-03',
  },
  {
    id: 'v4',
    title: 'Kit de Emergencia Completo',
    type: 'video',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    description: 'Qué incluir en tu kit de supervivencia',
    youtubeId: 'dQw4w9WgXcQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'preparacion',
    duration: '10:15',
    createdAt: '2024-01-01',
  },
];

/**
 * Get all notes
 */
export const getNotes = async (): Promise<Note[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_NOTES;
};

/**
 * Get all videos
 */
export const getVideos = async (): Promise<Video[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_VIDEOS;
};

/**
 * Get a single note by ID
 */
export const getNoteById = async (id: string): Promise<Note | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_NOTES.find((note) => note.id === id) || null;
};

/**
 * Get all content (notes + videos) sorted by date
 */
export const getAllContent = async (): Promise<ContentItem[]> => {
  const [notes, videos] = await Promise.all([getNotes(), getVideos()]);
  const all = [...notes, ...videos];
  return all.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
