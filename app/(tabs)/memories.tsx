// app/(tabs)/memories.tsx
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, format } from 'date-fns';
// Use legacy API as recommended in the warning
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
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
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      setLoading(true);
      if (!user) return;

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
        memoriesQuery = memoriesQuery.eq('couple_id', profile.couple_id);
        milestonesQuery = milestonesQuery.eq('couple_id', profile.couple_id);
      } else {
        // FIXED: If no partner, load only user's entries with null couple_id
        memoriesQuery = memoriesQuery.is('couple_id', null).eq('created_by', user.id);
        milestonesQuery = milestonesQuery.is('couple_id', null).eq('created_by', user.id);
      }

      const [memoriesResult, milestonesResult] = await Promise.all([
        memoriesQuery,
        milestonesQuery
      ]);

      if (memoriesResult.data) setMemories(memoriesResult.data);
      if (milestonesResult.data) setMilestones(milestonesResult.data);
    } catch (error) {
      console.error('Error loading memories:', error);
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

      // Extract file extension
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `memories/${user?.id}/${fileName}`;

      // Read the file as base64 using the legacy API as recommended
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary for upload
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('memory-photos')
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get the public URL
      const { data: publicData } = supabase.storage
        .from('memory-photos')
        .getPublicUrl(data.path);

      console.log('Upload successful, URL:', publicData.publicUrl);
      return publicData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to upload image: ${error?.message || 'Unknown error'}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    // Use the ImagePicker with correct mediaTypes format
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
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
      if (!user) return;
      if (!newMemory.title.trim()) {
        Alert.alert('Error', 'Please add a title for this memory');
        return;
      }

      let photoUrl = null;
      
      // Upload image if one was selected
      if (selectedImage) {
        photoUrl = await uploadImage(selectedImage);
        if (!photoUrl) {
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
      }

      const table = newMemory.type === 'milestone' ? 'milestones' : 'memories';
      const data = {
        // FIXED: Use null for solo users instead of user.id
        couple_id: profile?.couple_id || null,
        created_by: user.id,
        title: newMemory.title.trim(),
        description: newMemory.description.trim() || null,
        photos: photoUrl ? [photoUrl] : null, // Store photo URL in array
        ...(newMemory.type === 'milestone' 
          ? { milestone_date: new Date().toISOString() }
          : { date: new Date().toISOString() }
        ),
      };

      const { error } = await supabase
        .from(table)
        .insert(data);

      if (error) throw error;

      Alert.alert('Success', `${newMemory.type === 'milestone' ? 'Milestone' : 'Memory'} saved!`);
      
      // Reset form
      setNewMemory({ title: '', description: '', type: 'memory' });
      setSelectedImage(null);
      setModalVisible(false);
      
      // Reload memories
      loadMemories();
    } catch (error) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', 'Failed to save memory');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysAgo = differenceInDays(new Date(), date);
    
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    
    return format(date, 'MMM d, yyyy');
  };

  const openMemoryDetail = (item: Memory | Milestone) => {
    setSelectedMemory(item);
    setDetailModalVisible(true);
  };

  const renderMemory = ({ item }: { item: Memory | Milestone }) => {
    const isMilestone = 'milestone_date' in item;
    
    return (
      <TouchableOpacity 
        style={styles.memoryCard}
        onPress={() => openMemoryDetail(item)}
      >
        {item.photos && item.photos[0] && (
          <Image source={{ uri: item.photos[0] }} style={styles.memoryImage} />
        )}
        <View style={styles.memoryContent}>
          <View style={styles.memoryHeader}>
            <Text style={styles.memoryTitle}>{item.title}</Text>
            {isMilestone && (
              <View style={styles.milestoneTag}>
                <Ionicons name="trophy" size={12} color="#fff" />
                <Text style={styles.milestoneText}>Milestone</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.memoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.memoryDate}>
            {formatDate(isMilestone ? item.milestone_date : item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="images-outline" size={64} color="#CBD5E0" />
      <Text style={styles.emptyTitle}>No memories yet</Text>
      <Text style={styles.emptyText}>
        Start capturing your special moments together
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.emptyButtonText}>Add Your First Memory</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
        </View>
      </SafeAreaView>
    );
  }

  const allItems = [...memories, ...milestones].sort((a, b) => {
    const dateA = 'milestone_date' in a ? a.milestone_date : a.date;
    const dateB = 'milestone_date' in b ? b.milestone_date : b.date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Memories</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color="#EC4899" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allItems}
        renderItem={renderMemory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Add Memory Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Memory</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setSelectedImage(null);
                setNewMemory({ title: '', description: '', type: 'memory' });
              }}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Memory Type Selector */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newMemory.type === 'memory' && styles.typeButtonActive
                  ]}
                  onPress={() => setNewMemory({ ...newMemory, type: 'memory' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    newMemory.type === 'memory' && styles.typeButtonTextActive
                  ]}>Memory</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newMemory.type === 'milestone' && styles.typeButtonActive
                  ]}
                  onPress={() => setNewMemory({ ...newMemory, type: 'milestone' })}
                >
                  <Text style={[
                    styles.typeButtonText,
                    newMemory.type === 'milestone' && styles.typeButtonTextActive
                  ]}>Milestone</Text>
                </TouchableOpacity>
              </View>

              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color="#A0AEC0" />
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor={"#A0AEC0"}
                value={newMemory.title}
                onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor={"#A0AEC0"}
                value={newMemory.description}
                onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity 
                style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                onPress={saveMemory}
                disabled={uploading}
              >
                <Text style={styles.saveButtonText}>
                  {uploading ? 'Uploading...' : 'Save Memory'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Memory Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>
            
            {selectedMemory && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedMemory.photos && selectedMemory.photos[0] && (
                  <Image 
                    source={{ uri: selectedMemory.photos[0] }} 
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>{selectedMemory.title}</Text>
                  {'milestone_date' in selectedMemory && (
                    <View style={styles.milestoneTag}>
                      <Ionicons name="trophy" size={14} color="#fff" />
                      <Text style={styles.milestoneText}>Milestone</Text>
                    </View>
                  )}
                  <Text style={styles.detailDate}>
                    {selectedMemory && formatDate(
                      'milestone_date' in selectedMemory 
                        ? selectedMemory.milestone_date 
                        : selectedMemory.date
                    )}
                  </Text>
                  {selectedMemory.description && (
                    <Text style={styles.detailDescription}>
                      {selectedMemory.description}
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  addButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  milestoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6AD55',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  milestoneText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  memoryDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  memoryDate: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#EC4899',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  imagePicker: {
    height: 150,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#A0AEC0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  detailModalContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  detailImage: {
    width: '100%',
    height: 400,
  },
  detailContent: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  detailDate: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 15,
  },
  detailDescription: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
  },
});