// components/ThemeSwitcher.tsx
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeName } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeSwitcher() {
  const { themeName, setTheme, theme } = useTheme();

  const themeOptions: { name: ThemeName; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { name: 'light', icon: 'sunny', label: 'Light' },
    { name: 'dark', icon: 'moon', label: 'Dark' },
    { name: 'blue', icon: 'water', label: 'Blue' },
    { name: 'pink', icon: 'heart', label: 'Pink' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Theme:</Text>
      <View style={styles.buttonContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={[
              styles.button,
              {
                backgroundColor: themeName === option.name 
                  ? theme.colors.primary 
                  : theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setTheme(option.name)}
          >
            <Ionicons
              name={option.icon}
              size={20}
              color={themeName === option.name ? '#FFFFFF' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.buttonText,
                {
                  color: themeName === option.name ? '#FFFFFF' : theme.colors.textSecondary,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});