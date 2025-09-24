// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface FeedItem {
  id: string;
  type: 'journal' | 'gratitude' | 'memory' | 'milestone' | 'question';
  user_id: string;
  content?: string;
  title?: string;
  mood?: string;
  created_at: string;
  partner_name?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [coupleStats, setCoupleStats] = useState({
    daysogether: 0,
    sharedEntries: 0,
    gratitudes: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      if (!user || !profile?.couple_id || !profile?.partner_id) {
        setLoading(false);
        return;
      }

      // Get partner's name
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', profile.partner_id)
        .single();

      if (partnerProfile) {
        setPartnerName(partnerProfile.display_name);
      }

      // Load recent shared journal entries
      const { data: journalEntries } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .eq('is_shared', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Load recent gratitudes
      const { data: gratitudes } = await supabase
        .from('gratitude_entries')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Load recent memories
      const { data: memories } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Load recent milestones
      const { data: milestones } = await supabase
        .from('milestones')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Combine and sort all feed items
      const allItems: FeedItem[] = [];

      if (journalEntries) {
        journalEntries.forEach(entry => {
          allItems.push({
            id: entry.id,
            type: 'journal',
            user_id: entry.user_id,
            content: entry.content,
            title: entry.title,
            mood: entry.mood,
            created_at: entry.created_at,
            partner_name: entry.user_id === profile.partner_id ? partnerName : 'You',
          });
        });
      }

      if (gratitudes) {
        gratitudes.forEach(gratitude => {
          allItems.push({
            id: gratitude.id,
            type: 'gratitude',
            user_id: gratitude.from_user_id,
            content: gratitude.content,
            created_at: gratitude.created_at,
            partner_name: gratitude.from_user_id === profile.partner_id ? partnerName : 'You',
          });
        });
      }

      if (memories) {
        memories.forEach(memory => {
          allItems.push({
            id: memory.id,
            type: 'memory',
            user_id: memory.created_by,
            title: memory.title,
            content: memory.description,
            created_at: memory.created_at,
            partner_name: memory.created_by === profile.partner_id ? partnerName : 'You',
          });
        });
      }

      if (milestones) {
        milestones.forEach(milestone => {
          allItems.push({
            id: milestone.id,
            type: 'milestone',
            user_id: milestone.created_by,
            title: milestone.title,
            content: milestone.description,
            created_at: milestone.created_at,
            partner_name: milestone.created_by === profile.partner_id ? partnerName : 'You',
          });
        });
      }

      // Sort by date
      allItems.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFeedItems(allItems.slice(0, 10));

      // Calculate stats
      const { data: coupleData } = await supabase
        .from('couples')
        .select('created_at')
        .eq('id', profile.couple_id)
        .single();

      if (coupleData) {
        const daysTogether = Math.floor(
          (new Date().getTime() - new Date(coupleData.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        setCoupleStats({
          daysogether: daysTogether,
          sharedEntries: journalEntries?.length || 0,
          gratitudes: gratitudes?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const getTimeLabel = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'journal':
        return <Ionicons name="book" size={16} color="#EC4899" />;
      case 'gratitude':
        return <Ionicons name="heart" size={16} color="#EC4899" />;
      case 'memory':
        return <Ionicons name="image" size={16} color="#EC4899" />;
      case 'milestone':
        return <Ionicons name="star" size={16} color="#FFD700" />;
      default:
        return null;
    }
  };

  const getMoodEmoji = (mood?: string) => {
    const moods: Record<string, string> = {
      great: '😊',
      good: '🙂',
      okay: '😐',
      sad: '😢',
      stressed: '😰',
    };
    return mood ? moods[mood] || '' : '';
  };

  if (!profile?.couple_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noCoupleContainer}>
          <MaterialCommunityIcons name="heart-broken" size={64} color="#ccc" />
          <Text style={styles.noCoupleTitle}>You're not connected yet</Text>
          <Text style={styles.noCoupleText}>
            Connect with your partner to start your journey together
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.connectButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.coupleNames}>
              {profile.display_name} & {partnerName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#EC4899" />
            <Text style={styles.statNumber}>{coupleStats.daysogether}</Text>
            <Text style={styles.statLabel}>Days Together</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="book" size={24} color="#EC4899" />
            <Text style={styles.statNumber}>{coupleStats.sharedEntries}</Text>
            <Text style={styles.statLabel}>Shared Entries</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="heart" size={24} color="#EC4899" />
            <Text style={styles.statNumber}>{coupleStats.gratitudes}</Text>
            <Text style={styles.statLabel}>Gratitudes</Text>
          </View>
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/journal')}
            >
              <Ionicons name="create" size={24} color="#EC4899" />
              <Text style={styles.actionText}>Write Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/connect')}
            >
              <MaterialCommunityIcons name="comment-question" size={24} color="#EC4899" />
              <Text style={styles.actionText}>Daily Question</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/memories')}
            >
              <Ionicons name="camera" size={24} color="#EC4899" />
              <Text style={styles.actionText}>Add Memory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/connect')}
            >
              <Ionicons name="heart" size={24} color="#EC4899" />
              <Text style={styles.actionText}>Send Love</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Activity Feed */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {feedItems.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyFeedText}>
                No shared activities yet. Start journaling together!
              </Text>
            </View>
          ) : (
            feedItems.map((item) => (
              <View key={item.id} style={styles.feedItem}>
                <View style={styles.feedItemHeader}>
                  <View style={styles.feedItemMeta}>
                    {getIcon(item.type)}
                    <Text style={styles.feedItemAuthor}>{item.partner_name}</Text>
                    {item.mood && (
                      <Text style={styles.feedItemMood}>{getMoodEmoji(item.mood)}</Text>
                    )}
                  </View>
                  <Text style={styles.feedItemTime}>
                    {getTimeLabel(item.created_at)}
                  </Text>
                </View>
                
                {item.title && (
                  <Text style={styles.feedItemTitle}>{item.title}</Text>
                )}
                
                {item.content && (
                  <Text style={styles.feedItemContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  noCoupleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noCoupleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noCoupleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  coupleNames: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fef2f8',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    marginRight: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  feedSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyFeed: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyFeedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  feedItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedItemAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EC4899',
  },
  feedItemMood: {
    fontSize: 16,
  },
  feedItemTime: {
    fontSize: 11,
    color: '#999',
  },
  feedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feedItemContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});