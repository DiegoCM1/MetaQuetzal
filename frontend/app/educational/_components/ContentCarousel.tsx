import { View, Text, FlatList } from 'react-native';
import { Note, Video, ContentItem } from '../_types';
import NoteCard from './NoteCard';
import VideoCard from './VideoCard';

interface ContentCarouselProps {
  title: string;
  items: ContentItem[];
}

const ITEM_WIDTH = 280;
const ITEM_MARGIN = 16;

export default function ContentCarousel({ title, items }: ContentCarouselProps) {
  const renderItem = ({ item }: { item: ContentItem }) => {
    if (item.type === 'note') {
      return <NoteCard note={item as Note} />;
    } else {
      return <VideoCard video={item as Video} />;
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      {/* Title */}
      <Text className="text-xl font-bold text-phase2Titles dark:text-phase2TitlesDark px-6 mb-4">
        {title}
      </Text>

      {/* Carousel */}
      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + ITEM_MARGIN}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingLeft: 24,
          paddingRight: 24,
        }}
      />
    </View>
  );
}
