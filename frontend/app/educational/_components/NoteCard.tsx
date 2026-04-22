import { TouchableOpacity, Text, View, Image } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../_types';
import { track } from '../../../utils/analytics';

interface NoteCardProps {
  note: Note;
}

export default function NoteCard({ note }: NoteCardProps) {
  const router = useRouter();
  const { colorScheme } = useTheme();

  const handlePress = () => {
    track('educational_note_tap', {
      noteId: note.id,
      noteTitle: note.title,
      category: note.category,
    });
    router.push(`/educational/${note.id}`);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden mr-4 w-[280px]"
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: note.thumbnail }}
        className="w-full h-40"
        resizeMode="cover"
      />

      {/* Content */}
      <View className="p-4">
        <Text
          className="text-lg font-bold text-phase2Titles dark:text-phase2TitlesDark mb-2"
          numberOfLines={2}
        >
          {note.title}
        </Text>

        <Text
          className="text-sm text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark mb-3"
          numberOfLines={2}
        >
          {note.description}
        </Text>

        {/* Meta info */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons
              name="time-outline"
              size={16}
              color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            />
            <Text className="text-xs text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark ml-1">
              {note.readTime} min
            </Text>
          </View>

          <View className="bg-phase2Buttons/10 dark:bg-phase2CardsDark px-3 py-1 rounded-full">
            <Text className="text-xs text-phase2Buttons dark:text-phase2TitlesDark capitalize">
              {note.category.replace('-', ' ')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
