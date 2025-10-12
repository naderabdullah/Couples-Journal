// app/(tabs)/index.tsx - ENHANCED with animations
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface NavTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  colorKey: 'nav1' | 'nav2' | 'nav3' | 'nav4';
  route: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({
    daysTogether: 0,
    entriesCount: 0,
    memoriesCount: 0,
  });

  // Animated values
  const waveScale = useSharedValue(1);
  const heartBeat = useSharedValue(1);

  useEffect(() => {
    // Wave animation for greeting emoji
    waveScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );

    // Heartbeat for stats if coupled
    if (profile?.couple_id) {
      heartBeat.value = withRepeat(
        withSequence(
          withSpring(1.2),
          withSpring(1)
        ),
        -1,
        true
      );
    }
  }, [profile?.couple_id]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartBeat.value }],
  }));

  const navTiles: NavTile[] = [
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Plan events & dates',
      emoji: '📅',
      icon: 'calendar',
      colorKey: 'nav1',
      route: '/(tabs)/calendar',
    },
    {
      id: 'connect',
      title: 'Connect',
      subtitle: 'Daily questions & gratitude',
      emoji: '💕',
      icon: 'heart',
      colorKey: 'nav2',
      route: '/(tabs)/connect',
    },
    {
      id: 'memories',
      title: 'Memories',
      subtitle: 'Capture special moments',
      emoji: '📸',
      icon: 'images',
      colorKey: 'nav3',
      route: '/(tabs)/memories',
    },
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'Settings & preferences',
      emoji: '⚙️',
      icon: 'person-circle',
      colorKey: 'nav4',
      route: '/(tabs)/profile',
    },
  ];

  useEffect(() => {
    loadData();
    setGreeting(getGreeting());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = async () => {
    try {
      if (!user || !profile) {
        setLoading(false);
        return;
      }

      if (profile.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('created_at')
          .eq('id', profile.couple_id)
          .single();

        if (coupleData) {
          const daysTogether = Math.floor(
            (new Date().getTime() - new Date(coupleData.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          setStats(prev => ({ ...prev, daysTogether: daysTogether }));
        }

        const { count: entriesCount } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', profile.couple_id);

        const { count: memoriesCount } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', profile.couple_id);

        setStats(prev => ({
          ...prev,
          entriesCount: entriesCount || 0,
          memoriesCount: memoriesCount || 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTilePress = (route: string) => {
    router.push(route as any);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.greeting}>Not logged in</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with greeting */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()} 
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>{greeting}!</Text>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{profile?.display_name || 'Welcome'}</Text>
              <Animated.Text style={[styles.waveEmoji, waveStyle]}>👋</Animated.Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Cards */}
        {profile?.couple_id && (
          <Animated.View 
            entering={FadeInUp.delay(200).springify()} 
            style={styles.statsContainer}
          >
            <LinearGradient
              colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <Animated.View style={heartStyle}>
                <Text style={styles.statEmoji}>💖</Text>
              </Animated.View>
              <Text style={styles.statNumber}>{stats.daysTogether}</Text>
              <Text style={styles.statLabel}>Days Together</Text>
            </LinearGradient>

            <LinearGradient
              colors={[theme.colors.secondary + '15', theme.colors.secondary + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <Text style={styles.statEmoji}>📖</Text>
              <Text style={styles.statNumber}>{stats.entriesCount}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </LinearGradient>

            <LinearGradient
              colors={[theme.colors.accent + '15', theme.colors.accent + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <Text style={styles.statEmoji}>✨</Text>
              <Text style={styles.statNumber}>{stats.memoriesCount}</Text>
              <Text style={styles.statLabel}>Memories</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Navigation Tiles */}
        <View style={styles.tilesContainer}>
          <Animated.Text 
            entering={FadeInLeft.delay(300).springify()} 
            style={styles.sectionTitle}
          >
            What would you like to do? ✨
          </Animated.Text>
          {navTiles.map((tile, index) => {
            const tileColor = theme.colors[tile.colorKey];
            return (
              <Animated.View
                key={tile.id}
                entering={FadeInRight.delay(350 + index * 50).springify()}
              >
                <TouchableOpacity
                  style={styles.tile}
                  onPress={() => handleTilePress(tile.route)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[tileColor + '15', tileColor + '08']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tileGradient}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: tileColor + '25' }]}>
                      <Text style={styles.tileEmoji}>{tile.emoji}</Text>
                    </View>
                    <View style={styles.tileContent}>
                      <Text style={styles.tileTitle}>{tile.title}</Text>
                      <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                    </View>
                    <View style={[styles.chevronContainer, { backgroundColor: tileColor + '20' }]}>
                      <Ionicons name="chevron-forward" size={20} color={tileColor} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  waveEmoji: {
    fontSize: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  tilesContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  tile: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tileEmoji: {
    fontSize: 28,
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});