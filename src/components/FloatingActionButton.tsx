import React from 'react';
import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function FloatingActionButton({
  onPress,
  accessibilityLabel = 'Tambah catatan baru',
}: FloatingActionButtonProps) {
  return (
    <View className="absolute bottom-6 right-6 z-50">
      <Pressable
        onPress={onPress}
        className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 items-center justify-center shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
        accessibilityLabel={accessibilityLabel}
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

