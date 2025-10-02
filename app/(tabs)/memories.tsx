// app/(tabs)/memories.tsx - Fixed version
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Memory, Milestone, supabase } from '../../lib/supabase';

export default function MemoriesScreen() {
  const { profile, user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | Milestone | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    type: 'memory',
  });

  useEffect(() => {
    if (user) {
      loadMemories();
    }
  }, [user, profile]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      if (!user) {
        console.log('No user found, skipping load');
        setLoading(false);
        return;
      }

      console.log('Loading memories for user:', user.id);
      console.log('Profile couple_id:', profile?.couple_id);

      // Load memories
      let memoriesQuery = supabase
        .from('memories')
        .select('*')
        .order('date', { ascending: false });

      // Load milestones  
      let milestonesQuery = supabase
        .from('milestones')
        .select('*')
        .order('milestone_date', { ascending: false });

      if (profile?.couple_id) {
        // If has partner, load couple entries
        console.log('Loading couple memories for couple_id:', profile.couple_id);
        memoriesQuery = memoriesQuery.eq('couple_id', profile.couple_id);
        milestonesQuery = milestonesQuery.eq('couple_id', profile.couple_id);
      } else {
        // If no partner, load only user's entries with null couple_id
        console.log('Loading solo memories');
        memoriesQuery = memoriesQuery.is('couple_id', null).eq('created_by', user.id);
        milestonesQuery = milestonesQuery.is('couple_id', null).eq('created_by', user.id);
      }

      const [memoriesResult, milestonesResult] = await Promise.all([
        memoriesQuery,
        milestonesQuery
      ]);

      if (memoriesResult.error) {
        console.error('Memories query error:', memoriesResult.error);
      }
      if (milestonesResult.error) {
        console.error('Milestones query error:', milestonesResult.error);
      }

      console.log(`Loaded ${memoriesResult.data?.length || 0} memories`);
      console.log(`Loaded ${milestonesResult.data?.length || 0} milestones`);

      if (memoriesResult.data) setMemories(memoriesResult.data);
      if (milestonesResult.data) setMilestones(milestonesResult.data);
    } catch (error) {
      console.error('Error loading memories:', error);
      Alert.alert('Error', 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      
      if (!user) {
        throw new Error('No user logged in');
      }

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `memories/${user.id}/${fileName}`;

      // Read file as base64 - ONLY CHANGE: use 'base64' string
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert to binary
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload
      const { data, error } = await supabase.storage
        .from('memory-photos')
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (error) throw error;

      // Get public URL (bucket is public)
      const { data: { publicUrl } } = supabase.storage
        .from('memory-photos')
        .getPublicUrl(data.path);

      console.log('✅ Photo uploaded:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      Alert.alert('Error', `Failed to upload: ${error?.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const saveMemory = async () => {
    try {
      if (!user) return;
      
      if (!newMemory.title.trim()) {
        Alert.alert('Error', 'Please add a title for your memory');
        return;
      }

      let photoUrl = null;
      if (selectedImage) {
        photoUrl = await uploadImage(selectedImage);
      }

      const memoryData: any = {
        couple_id: profile?.couple_id || null,
        created_by: user.id,
        title: newMemory.title.trim(),
        description: newMemory.description.trim() || null,
        photos: photoUrl ? [photoUrl] : null,
        date: new Date().toISOString(),
        type: newMemory.type,
      };

      console.log('Saving memory:', memoryData);

      // Insert into DATABASE table 'memories'
      const { error } = await supabase
        .from('memories')  // DATABASE table name
        .insert(memoryData);

      if (error) {
        console.error('Error saving memory:', error);
        throw error;
      }

      Alert.alert('Success', 'Memory saved! 📸');
      setModalVisible(false);
      setNewMemory({ title: '', description: '', type: 'memory' });
      setSelectedImage(null);
      loadMemories();
    } catch (error) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', 'Failed to save memory');
    }
  };

  const renderMemoryItem = ({ item }: { item: Memory | Milestone }) => {
    const isMemory = 'created_by' in item;
    const date = isMemory ? (item as Memory).date : (item as Milestone).milestone_date;
    const photos = isMemory ? (item as Memory).photos : (item as Milestone).photos;
    
    return (
      <TouchableOpacity
        style={styles.memoryCard}
        onPress={() => {
          setSelectedMemory(item);
          setDetailModalVisible(true);
        }}
      >
        {photos && photos[0] && (
          <Image source={{ uri: photos[0] }} style={styles.memoryImage} />
        )}
        <View style={styles.memoryContent}>
          <View style={styles.memoryHeader}>
            <Text style={styles.memoryTitle}>{item.title}</Text>
            {!isMemory && (
              <View style={styles.milestoneBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.memoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.memoryDate}>
            {format(new Date(date), 'MMM d, yyyy')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Helper function to decode base64
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const allItems = [...memories, ...milestones].sort((a, b) => {
    const dateA = 'date' in a ? a.date : (a as Milestone).milestone_date;
    const dateB = 'date' in b ? b.date : (b as Milestone).milestone_date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Please sign in to view your memories</Text>
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
        <Text style={styles.headerTitle}>Memories</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color="#EC4899" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 20 }} />
      ) : allItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyText}>
            Start capturing your special moments
          </Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          renderItem={renderMemoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Memory Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setSelectedImage(null);
              }}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Memory</Text>
              <TouchableOpacity onPress={saveMemory} disabled={uploading}>
                <Text style={[styles.saveButton, uploading && styles.saveButtonDisabled]}>
                  {uploading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color="#9CA3AF" />
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.titleInput}
                placeholder="Give this memory a title"
                value={newMemory.title}
                onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
                placeholderTextColor="#A0A0A0"
              />

              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe this moment..."
                value={newMemory.description}
                onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#A0A0A0"
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Memory</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedMemory && (
            <ScrollView style={styles.modalContent}>
              {selectedMemory.photos && selectedMemory.photos[0] && (
                <Image 
                  source={{ uri: selectedMemory.photos[0] }} 
                  style={styles.detailImage}
                />
              )}
              <Text style={styles.detailTitle}>{selectedMemory.title}</Text>
              {selectedMemory.description && (
                <Text style={styles.detailDescription}>{selectedMemory.description}</Text>
              )}
              <Text style={styles.detailDate}>
                {format(
                  new Date('date' in selectedMemory ? selectedMemory.date : (selectedMemory as Milestone).milestone_date),
                  'MMMM d, yyyy'
                )}
              </Text>
            </ScrollView>
          )}
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
  backButton: {
    padding: 4,
    width: 32,
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
  listContent: {
    padding: 20,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  memoryImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  memoryContent: {
    padding: 15,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  milestoneBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  memoryDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
  saveButtonDisabled: {
    color: '#D1D5DB',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  imagePickerButton: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imagePickerText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 14,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 150,
    paddingVertical: 10,
  },
  detailImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});