import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Cari judul atau isi catatan...',
}: SearchBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-4 py-2">
      <View className="flex-row items-center bg-slate-100 dark:bg-slate-800/90 rounded-2xl px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700/80">
        <Search
          size={18}
          color={isDark ? '#94a3b8' : '#64748b'}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          className="flex-1 text-sm text-slate-900 dark:text-slate-100 p-0"
          style={{ outlineStyle: 'none' } as any}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 active:opacity-70"
          >
            <X size={14} color={isDark ? '#cbd5e1' : '#475569'} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

