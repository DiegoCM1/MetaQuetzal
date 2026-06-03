import { TouchableOpacity, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../_types';
import { track } from '../../../utils/analytics';

interface NoteListItemProps {
  note: Note;
}

// Map categories to icons and colors
const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'primeros-auxilios':
      return { icon: 'medical' as const, color: '#EF4444' };
    case 'clima':
      return { icon: 'cloudy' as const, color: '#3B82F6' };
    case 'incendios':
      return { icon: 'flame' as const, color: '#F59E0B' };
    case 'preparacion':
      return { icon: 'shield-checkmark' as const, color: '#10B981' };
    case 'seguridad':
      return { icon: 'alert-circle' as const, color: '#8B5CF6' };
    default:
      return { icon: 'book' as const, color: '#6B7280' };
  }
};

export default function NoteListItem({ note }: NoteListItemProps) {
  const router = useRouter();
  const { icon, color } = getCategoryStyle(note.category);

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
      className="flex-row items-center justify-between mb-3 px-4 py-4 bg-gray-50 rounded-lg"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-phase2Titles">
            {note.title}
          </Text>
          <Text
            className="text-sm text-phase2SecondaryTxt mt-1"
            numberOfLines={1}
          >
            {note.description}
          </Text>
          <Text className="text-xs text-phase2SecondaryTxt mt-1">
            {note.readTime} min de lectura
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={24} color={color} />
    </TouchableOpacity>
  );
}
