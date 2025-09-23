// app/(tabs)/memories.tsx
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Memory {
  id: string;
  couple_id: string;
  created_by: string;
  title?: string;
  description?: string;
  photos?: string[];
  date: string;
  type?: string;
  created_at: string;
}

interface Milestone {
  id: string;
  couple_id: string;
  title: string;
  description?: string;
  milestone_date: string;
  photos?: string[];
  created_by: string;
  created_at: string;
}

export default function MemoriesScreen() {
  const { profile, user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    type: 'memory',
  });

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      setLoading(true);
      if (!user || !profile?.couple_id) return;

      // Load memories
      const { data: memoriesData, error: memoriesError } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('date', { ascending: false });

      if (memoriesError) throw memoriesError;
      setMemories(memoriesData || []);

      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('milestone_date', { ascending: false });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error loading memories:', error);
      Alert.alert('Error', 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  const saveMemory = async () => {
    try {
      if (!user || !profile?.couple_id) return;
      if (!newMemory.title.trim()) {
        Alert.alert('Error', 'Please add a title for this memory');
        return;
      }

      // In a real app, you'd upload the image to Supabase Storage here
      // For now, we'll just save the memory metadata

      const table = newMemory.type === 'milestone' ? 'milestones' : 'memories';
      const data = {
        couple_id: profile.couple_id,
        created_by: user.id,
        title: newMemory.title.trim(),
        description: newMemory.description.trim() || null,
        ...(newMemory.type === 'milestone' 
          ? { milestone_date: new Date().toISOString() }
          : { date: new Date().toISOString(), type: 'memory' }
        ),
      };

      const { error } = await supabase.from(table).insert(data);

      if (error) throw error;

      Alert.alert('Success', 'Memory saved! 💕');
      setModalVisible(false);
      setNewMemory({ title: '', description: '', type: 'memory' });
      setSelectedImage(null);
      loadMemories();
    } catch (error) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', 'Failed to save memory');
    }
  };

  const getAnniversaryCountdown = () => {
    if (!profile?.couple_id) return null;
    
    // You could get this from the couples table anniversary_date
    const anniversaryDate = new Date('2024-01-01'); // Placeholder
    const today = new Date();
    const nextAnniversary = new Date(anniversaryDate);
    nextAnniversary.setFullYear(today.getFullYear());
    
    if (nextAnniversary < today) {
      nextAnniversary.setFullYear(today.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(nextAnniversary, today);
    return daysUntil;
  };

  const renderMemoryCard = ({ item }: { item: Memory | Milestone }) => {
    const isMilestone = 'milestone_date' in item;
    
    return (
      <TouchableOpacity style={styles.memoryCard}>
        {item.photos && item.photos[0] ? (
          <Image source={{ uri: item.photos[0] }} style={styles.memoryImage} />
        ) : (
          <View style={styles.memoryPlaceholder}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.memoryInfo}>
          {isMilestone && (
            <View style={styles.milestoneBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.milestoneLabel}>Milestone</Text>
            </View>
          )}
          <Text style={styles.memoryTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.memoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.memoryDate}>
            {format(new Date(isMilestone ? item.milestone_date : item.date), 'MMM d, yyyy')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const anniversaryDays = getAnniversaryCountdown();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Memories</Text>
          <TouchableOpacity onPress={pickImage}>
            <Ionicons name="add-circle" size={32} color="#EC4899" />
          </TouchableOpacity>
        </View>

        {/* Anniversary Countdown */}
        {anniversaryDays !== null && (
          <View style={styles.anniversaryCard}>
            <Ionicons name="heart" size={24} color="#EC4899" />
            <Text style={styles.anniversaryText}>
              {anniversaryDays === 0
                ? "It's your anniversary! 🎉"
                : `${anniversaryDays} days until your anniversary`}
            </Text>
          </View>
        )}

        {/* Recent Memories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Journey Together</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 20 }} />
          ) : [...memories, ...milestones].length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No memories yet</Text>
              <Text style={styles.emptySubtext}>
                Start capturing your special moments together
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...memories, ...milestones].sort((a, b) => {
                const dateA = 'milestone_date' in a ? a.milestone_date : a.date;
                const dateB = 'milestone_date' in b ? b.milestone_date : b.date;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              })}
              renderItem={renderMemoryCard}
              keyExtractor={(item) => item.id}
              horizontal={false}
              numColumns={2}
              columnWrapperStyle={styles.memoryGrid}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Memory Modal */}
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
            <Text style={styles.modalTitle}>New Memory</Text>
            <TouchableOpacity onPress={saveMemory}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  newMemory.type === 'memory' && styles.selectedType,
                ]}
                onPress={() => setNewMemory({ ...newMemory, type: 'memory' })}
              >
                <Ionicons name="image" size={20} color="#EC4899" />
                <Text style={styles.typeOptionText}>Memory</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  newMemory.type === 'milestone' && styles.selectedType,
                ]}
                onPress={() => setNewMemory({ ...newMemory, type: 'milestone' })}
              >
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.typeOptionText}>Milestone</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="Give this memory a title"
              value={newMemory.title}
              onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
            />

            <TextInput
              style={styles.descriptionInput}
              placeholder="Tell the story..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={newMemory.description}
              onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
            />
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
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  anniversaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f8',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  anniversaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  memoryGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memoryCard: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  memoryImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  memoryPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryInfo: {
    padding: 12,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  milestoneLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD700',
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  memoryDate: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  selectedType: {
    borderColor: '#EC4899',
    backgroundColor: '#fef2f8',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  titleInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    marginBottom: 20,
  },
  descriptionInput: {
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
});