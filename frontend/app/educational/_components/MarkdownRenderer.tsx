import { View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../../context/ThemeContext';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { colorScheme } = useTheme();

  const markdownStyles = {
    body: {
      color: colorScheme === 'dark' ? '#E5E7EB' : '#1F2937',
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 16,
      marginTop: 24,
    },
    heading2: {
      color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      marginTop: 20,
    },
    heading3: {
      color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 16,
    },
    paragraph: {
      marginBottom: 12,
      color: colorScheme === 'dark' ? '#E5E7EB' : '#374151',
    },
    list_item: {
      marginBottom: 8,
      color: colorScheme === 'dark' ? '#E5E7EB' : '#374151',
    },
    bullet_list: {
      marginBottom: 12,
    },
    ordered_list: {
      marginBottom: 12,
    },
    strong: {
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
    },
    em: {
      fontStyle: 'italic',
    },
    code_inline: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
      color: colorScheme === 'dark' ? '#F9FAFB' : '#111827',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    fence: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    blockquote: {
      backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F9FAFB',
      borderLeftWidth: 4,
      borderLeftColor: colorScheme === 'dark' ? '#3B82F6' : '#2563EB',
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 8,
      marginBottom: 12,
    },
    hr: {
      backgroundColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
      height: 1,
      marginVertical: 16,
    },
  };

  return (
    <View>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </View>
  );
}
