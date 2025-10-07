// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface NavTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
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

  const navTiles: NavTile[] = [
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Plan events & dates',
      icon: 'calendar',
      colorKey: 'nav1',
      route: '/(tabs)/calendar',
    },
    {
      id: 'connect',
      title: 'Connect',
      subtitle: 'Share gratitude & answer questions',
      icon: 'heart',
      colorKey: 'nav2',
      route: '/(tabs)/connect',
    },
    {
      id: 'memories',
      title: 'Memories',
      subtitle: 'Capture special moments',
      icon: 'images',
      colorKey: 'nav3',
      route: '/(tabs)/memories',
    },
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'Settings & preferences',
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

      // Get couple stats
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

        // Get entries count
        const { count: entriesCount } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('couple_id', profile.couple_id);

        // Get memories count
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}!</Text>
            <Text style={styles.userName}>{profile?.display_name || 'Welcome'}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        {profile?.couple_id && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{stats.daysTogether}</Text>
              <Text style={styles.statLabel}>Days Together</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="book" size={24} color={theme.colors.secondary} />
              <Text style={styles.statNumber}>{stats.entriesCount}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="images" size={24} color={theme.colors.accent} />
              <Text style={styles.statNumber}>{stats.memoriesCount}</Text>
              <Text style={styles.statLabel}>Memories</Text>
            </View>
          </View>
        )}

        {/* Navigation Tiles */}
        <View style={styles.tilesContainer}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          {navTiles.map((tile) => {
            const tileColor = theme.colors[tile.colorKey];
            return (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, { borderLeftColor: tileColor }]}
                onPress={() => handleTilePress(tile.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: tileColor + '15' }]}>
                  <Ionicons name={tile.icon} size={32} color={tileColor} />
                </View>
                <View style={styles.tileContent}>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
              </TouchableOpacity>
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
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  tilesContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});