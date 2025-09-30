// app/(tabs)/journal.tsx
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { JournalEntry, supabase } from '../../lib/supabase';

const MOODS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
  { value: 'stressed', emoji: '😰', label: 'Stressed' },
];

export default function JournalScreen() {
  const { profile, user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'good' as JournalEntry['mood'],
    is_shared: false,
  });

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user, profile]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      if (!user) {
        console.log('No user found, skipping load');
        setLoading(false);
        return;
      }

      console.log('Loading journal entries for user:', user.id);
      console.log('Profile couple_id:', profile?.couple_id);

      let query = supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.couple_id) {
        // If has partner, load couple entries
        console.log('Loading couple entries for couple_id:', profile.couple_id);
        query = query.eq('couple_id', profile.couple_id);
      } else {
        // If no partner, load only user's entries (with null couple_id)
        console.log('Loading solo entries for user');
        query = query.eq('user_id', user.id).is('couple_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} journal entries`);
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    try {
      if (!user) return;
      if (!newEntry.content.trim()) {
        Alert.alert('Error', 'Please write something in your journal entry');
        return;
      }

      // FIXED: Use null for solo users, not user.id
      const entryData: any = {
        user_id: user.id,
        couple_id: profile?.couple_id || null, // Use null for solo entries
        title: newEntry.title.trim() || null,
        content: newEntry.content.trim(),
        mood: newEntry.mood,
        is_shared: profile?.couple_id ? newEntry.is_shared : false,
      };

      console.log('Saving entry:', entryData);

      const { error } = await supabase.from('journal_entries').insert(entryData);

      if (error) {
        console.error('Error saving entry:', error);
        throw error;
      }

      Alert.alert('Success', 'Journal entry saved! 💭');
      setModalVisible(false);
      setNewEntry({ title: '', content: '', mood: 'good', is_shared: false });
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    }
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => {
    const isMyEntry = item.user_id === user?.id;
    const mood = MOODS.find((m) => m.value === item.mood);

    return (
      <View style={[styles.entryCard, !isMyEntry && styles.partnerEntry]}>
        <View style={styles.entryHeader}>
          <View style={styles.entryMeta}>
            {mood && <Text style={styles.moodEmoji}>{mood.emoji}</Text>}
            <Text style={styles.entryDate}>
              {format(new Date(item.created_at), 'MMM d, yyyy')}
            </Text>
            {item.is_shared && profile?.couple_id && (
              <View style={styles.sharedBadge}>
                <Ionicons name="people" size={12} color="#EC4899" />
              </View>
            )}
          </View>
          {!isMyEntry && profile?.couple_id && (
            <Text style={styles.partnerLabel}>Partner's Entry</Text>
          )}
        </View>
        
        {item.title && (
          <Text style={styles.entryTitle}>{item.title}</Text>
        )}
        
        <Text style={styles.entryContent} numberOfLines={3}>
          {item.content}
        </Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Please sign in to view your journal</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color="#EC4899" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 20 }} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No journal entries yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button to write your first entry
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Entry Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Entry</Text>
            <TouchableOpacity onPress={saveEntry}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title (optional)"
              value={newEntry.title}
              onChangeText={(text) => setNewEntry({ ...newEntry, title: text })}
              placeholderTextColor="#A0A0A0"
            />

            <Text style={styles.label}>How are you feeling?</Text>
            <View style={styles.moodContainer}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.value}
                  style={[
                    styles.moodButton,
                    newEntry.mood === mood.value && styles.moodButtonActive,
                  ]}
                  onPress={() => setNewEntry({ ...newEntry, mood: mood.value as any })}
                >
                  <Text style={styles.moodButtonEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodButtonLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              value={newEntry.content}
              onChangeText={(text) => setNewEntry({ ...newEntry, content: text })}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#A0A0A0"
            />

            {profile?.couple_id && (
              <View style={styles.shareContainer}>
                <Text style={styles.shareLabel}>Share with partner</Text>
                <Switch
                  value={newEntry.is_shared}
                  onValueChange={(value) => setNewEntry({ ...newEntry, is_shared: value })}
                  trackColor={{ false: '#E0E0E0', true: '#FCE4EC' }}
                  thumbColor={newEntry.is_shared ? '#EC4899' : '#f4f3f4'}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 0,
  },
  backButton: {
    padding: 4,
    width: 32, // Match the add button width for balance
  },
  listContent: {
    padding: 20,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  partnerEntry: {
    backgroundColor: '#FDF2F8',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 20,
  },
  entryDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  sharedBadge: {
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  partnerLabel: {
    fontSize: 12,
    color: '#EC4899',
    fontWeight: '500',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  entryContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    fontSize: 16,
    color: '#EC4899',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
  },
  moodContainer: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  moodButtonActive: {
    backgroundColor: '#FCE4EC',
    borderColor: '#EC4899',
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodButtonLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    paddingVertical: 10,
  },
  shareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 20,
  },
  shareLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
});