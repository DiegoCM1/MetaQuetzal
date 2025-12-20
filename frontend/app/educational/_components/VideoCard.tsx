import { TouchableOpacity, Text, View, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../_types';
import { track } from '../../../utils/analytics';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const handlePress = async () => {
    track('educational_video_tap', {
      videoId: video.id,
      videoTitle: video.title,
      youtubeId: video.youtubeId,
      category: video.category,
    });

    // Open YouTube link
    const url = video.youtubeUrl;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden mr-4 w-[280px]"
      activeOpacity={0.7}
    >
      {/* Thumbnail with play button overlay */}
      <View className="relative">
        <Image
          source={{ uri: video.thumbnail }}
          className="w-full h-40"
          resizeMode="cover"
        />

        {/* Play button overlay */}
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="bg-red-600 rounded-full p-3">
            <Ionicons name="play" size={32} color="white" />
          </View>
        </View>

        {/* Duration badge */}
        <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded">
          <Text className="text-white text-xs font-semibold">
            {video.duration}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        <Text
          className="text-lg font-bold text-phase2Titles dark:text-phase2TitlesDark mb-2"
          numberOfLines={2}
        >
          {video.title}
        </Text>

        <Text
          className="text-sm text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark mb-3"
          numberOfLines={2}
        >
          {video.description}
        </Text>

        {/* Category badge */}
        <View className="flex-row items-center">
          <View className="bg-red-600/10 dark:bg-red-600/20 px-3 py-1 rounded-full">
            <Text className="text-xs text-red-600 dark:text-red-400 capitalize">
              {video.category.replace('-', ' ')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
