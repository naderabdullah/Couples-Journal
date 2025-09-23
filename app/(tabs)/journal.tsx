// app/(tabs)/journal.tsx
import { useAuth } from '@/contexts/AuthContext';
import { JournalEntry, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
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
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      if (!user || !profile?.couple_id) return;

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .or(`user_id.eq.${user.id},and(couple_id.eq.${profile.couple_id},is_shared.eq.true)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      if (!user || !profile?.couple_id) return;
      if (!newEntry.content.trim()) {
        Alert.alert('Error', 'Please write something in your journal entry');
        return;
      }

      const { error } = await supabase.from('journal_entries').insert({
        user_id: user.id,
        couple_id: profile.couple_id,
        title: newEntry.title.trim() || null,
        content: newEntry.content.trim(),
        mood: newEntry.mood,
        is_shared: newEntry.is_shared,
      });

      if (error) throw error;

      Alert.alert('Success', 'Journal entry saved!');
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
            {item.is_shared && (
              <View style={styles.sharedBadge}>
                <Ionicons name="people" size={12} color="#EC4899" />
              </View>
            )}
          </View>
          {!isMyEntry && (
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
          <Ionicons name="book-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No journal entries yet</Text>
          <Text style={styles.emptySubtext}>
            Start writing to capture your thoughts and memories
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

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
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
            />

            <Text style={styles.label}>How are you feeling?</Text>
            <View style={styles.moodSelector}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.value}
                  style={[
                    styles.moodOption,
                    newEntry.mood === mood.value && styles.selectedMood,
                  ]}
                  onPress={() => setNewEntry({ ...newEntry, mood: mood.value as any })}
                >
                  <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodOptionLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              value={newEntry.content}
              onChangeText={(text) => setNewEntry({ ...newEntry, content: text })}
            />

            <View style={styles.shareToggle}>
              <Text style={styles.shareLabel}>Share with partner</Text>
              <Switch
                value={newEntry.is_shared}
                onValueChange={(value) => setNewEntry({ ...newEntry, is_shared: value })}
                trackColor={{ false: '#ccc', true: '#EC4899' }}
                thumbColor={newEntry.is_shared ? '#fff' : '#f4f3f4'}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 20,
  },
  entryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  partnerEntry: {
    backgroundColor: '#fef2f8',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodEmoji: {
    fontSize: 20,
  },
  entryDate: {
    fontSize: 12,
    color: '#666',
  },
  sharedBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
  },
  partnerLabel: {
    fontSize: 11,
    color: '#EC4899',
    fontWeight: '500',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  entryContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    color: '#EC4899',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  moodOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    minWidth: 60,
  },
  selectedMood: {
    borderColor: '#EC4899',
    backgroundColor: '#fef2f8',
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodOptionLabel: {
    fontSize: 12,
    color: '#666',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    minHeight: 200,
  },
  shareToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  shareLabel: {
    fontSize: 16,
    color: '#333',
  },
});