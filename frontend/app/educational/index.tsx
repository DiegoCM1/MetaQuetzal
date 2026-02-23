import '../../global.css';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { track } from '../../utils/analytics';
import ContentCarousel from './_components/ContentCarousel';
import NoteListItem from './_components/NoteListItem';
import { getNotes, getVideos } from './_services/contentService';
import { Note, Video } from './_types';

export default function EducationalContentScreen() {
  const { colorScheme } = useTheme();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('educational_main_view');
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const [notesData, videosData] = await Promise.all([
        getNotes(),
        getVideos(),
      ]);
      setNotes(notesData);
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading educational content:', error);
    } finally {
      setLoading(false);
    }
  };

  const iconColor = colorScheme === 'dark' ? 'rgb(60, 200, 220)' : 'rgb(50, 180, 200)';
  const textColor = colorScheme === 'dark' ? 'rgb(230, 230, 250)' : '#111827';
  const subtextColor = colorScheme === 'dark' ? '#9CA3AF' : '#6B7280';

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-neutral-900 items-center justify-center"
        edges={['left', 'right', 'bottom']}
      >
        <ActivityIndicator size="large" color={iconColor} />
      </SafeAreaView>
    );
  }

  // Get recent videos for carousels
  const latestVideos = videos.slice(0, 3);
  const recommendedVideos = videos.slice(0, 4);

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 py-8 items-center border-b border-gray-200 dark:border-neutral-700">
          <Ionicons name="school" size={64} color={iconColor} />
          <Text className="text-2xl font-bold mt-4" style={{ color: textColor }}>
            Contenido Educativo
          </Text>
          <Text className="text-base text-center mt-2" style={{ color: subtextColor }}>
            Aprende a protegerte ante emergencias climáticas
          </Text>
        </View>

        {/* Latest Videos Section */}
        <View className="mt-6">
          <ContentCarousel title="Últimos cursos lanzados" items={latestVideos} />
        </View>

        {/* Notes Section */}
        <View className="px-6 mb-6">
          <Text className="text-xl font-bold text-phase2Titles dark:text-phase2TitlesDark mb-4">
            Descubre lo que puedes aprender
          </Text>

          {notes.map((note) => (
            <NoteListItem key={note.id} note={note} />
          ))}
        </View>

        {/* Recommended Videos */}
        <View className="mb-8">
          <ContentCarousel title="Cursos recomendados para ti" items={recommendedVideos} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
