// app/(tabs)/memories.tsx
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
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
        memoriesQuery = memoriesQuery.eq('created_by', user.id).is('couple_id', null);
        milestonesQuery = milestonesQuery.eq('created_by', user.id).is('couple_id', null);
      }

      const { data: memoriesData, error: memoriesError } = await memoriesQuery;
      if (memoriesError) {
        console.error('Error loading memories:', memoriesError);
        throw memoriesError;
      }
      setMemories(memoriesData || []);

      const { data: milestonesData, error: milestonesError } = await milestonesQuery;
      if (milestonesError) {
        console.error('Error loading milestones:', milestonesError);
        throw milestonesError;
      }
      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error loading memories:', error);
      Alert.alert('Error', 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Create a unique filename
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `memories/${user?.id}/${fileName}`;

      // Read the file as base64 using expo-file-system (most reliable in RN)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64', // Use string instead of enum for compatibility
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
    // expo-image-picker v17.0.8 - use MediaTypeOptions (works correctly)
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
          : { date: new Date().toISOString(), type: 'memory' }
        ),
        // Do not include 'id' field - let Supabase auto-generate it
      };

      console.log('Saving memory data:', data); // Debug log

      const { data: savedData, error } = await supabase.from(table).insert(data).select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Memory saved successfully:', savedData); // Debug log
      Alert.alert('Success', 'Memory saved! 💕');
      setModalVisible(false);
      setNewMemory({ title: '', description: '', type: 'memory' });
      setSelectedImage(null);
      loadMemories();
    } catch (error: any) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', `Failed to save memory: ${error?.message || 'Unknown error'}`);
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

  const openMemoryDetail = (item: Memory | Milestone) => {
    setSelectedMemory(item);
    setDetailModalVisible(true);
  };

  const renderMemoryCard = ({ item }: { item: Memory | Milestone }) => {
    const isMilestone = 'milestone_date' in item;
    const hasImage = item.photos && item.photos.length > 0;
    
    return (
      <TouchableOpacity 
        style={styles.memoryCard}
        onPress={() => openMemoryDetail(item)}
        activeOpacity={0.7}
      >
        {hasImage ? (
          <Image 
            source={{ uri: item.photos![0] }} 
            style={styles.memoryImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.memoryPlaceholder}>
            <Ionicons 
              name={isMilestone ? "star" : "image-outline"} 
              size={40} 
              color={isMilestone ? "#FFD700" : "#ccc"} 
            />
          </View>
        )}
        <View style={styles.memoryInfo}>
          {isMilestone && (
            <View style={styles.milestoneBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.milestoneLabel}>Milestone</Text>
            </View>
          )}
          <Text style={styles.memoryTitle} numberOfLines={2}>{item.title}</Text>
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

  const combinedData = [
    ...memories.map(m => ({ ...m, type: 'memory' })),
    ...milestones.map(m => ({ ...m, type: 'milestone' }))
  ].sort((a, b) => {
    const dateA = new Date('milestone_date' in a ? a.milestone_date : a.date);
    const dateB = new Date('milestone_date' in b ? b.milestone_date : b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Memories</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={pickImage} style={styles.headerButton}>
            <Ionicons name="camera" size={24} color="#EC4899" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={28} color="#EC4899" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Anniversary Countdown - Only show if user has partner */}
      {profile?.couple_id && (
        <View style={styles.anniversaryCard}>
          <Ionicons name="heart" size={24} color="#EC4899" />
          <View style={styles.anniversaryContent}>
            <Text style={styles.anniversaryTitle}>Anniversary</Text>
            <Text style={styles.anniversaryCountdown}>
              {getAnniversaryCountdown()} days to go!
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 20 }} />
      ) : combinedData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📸</Text>
          <Text style={styles.emptyStateTitle}>No Memories Yet</Text>
          <Text style={styles.emptyStateText}>
            Start capturing your special moments and milestones
          </Text>
          <TouchableOpacity style={styles.createFirstButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.createFirstButtonText}>Create Your First Memory</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={combinedData}
          renderItem={renderMemoryCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.memoriesList}
          columnWrapperStyle={styles.memoryRow}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Memory Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedImage(null);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Memory</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedImage(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Image Preview */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Add Photo Button */}
              {!selectedImage && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color="#EC4899" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
              {/* Memory Type Selection */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newMemory.type === 'memory' && styles.selectedType,
                  ]}
                  onPress={() => setNewMemory({ ...newMemory, type: 'memory' })}
                >
                  <Ionicons name="image" size={20} color={newMemory.type === 'memory' ? '#EC4899' : '#666'} />
                  <Text style={[styles.typeText, newMemory.type === 'memory' && styles.selectedTypeText]}>
                    Memory
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newMemory.type === 'milestone' && styles.selectedType,
                  ]}
                  onPress={() => setNewMemory({ ...newMemory, type: 'milestone' })}
                >
                  <Ionicons name="star" size={20} color={newMemory.type === 'milestone' ? '#EC4899' : '#666'} />
                  <Text style={[styles.typeText, newMemory.type === 'milestone' && styles.selectedTypeText]}>
                    Milestone
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder={`Give your ${newMemory.type} a title...`}
                  value={newMemory.title}
                  onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Add some details about this moment..."
                  value={newMemory.description}
                  onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, uploading && styles.saveButtonDisabled]} 
                onPress={saveMemory}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save {newMemory.type}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Memory Detail Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle}>
              {'milestone_date' in (selectedMemory || {}) ? 'Milestone' : 'Memory'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {selectedMemory && (
              <>
                {/* Image */}
                {selectedMemory.photos && selectedMemory.photos[0] && (
                  <Image 
                    source={{ uri: selectedMemory.photos[0] }} 
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.detailTextContent}>
                  {/* Milestone Badge */}
                  {'milestone_date' in selectedMemory && (
                    <View style={styles.detailMilestoneBadge}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.detailMilestoneText}>Milestone</Text>
                    </View>
                  )}

                  {/* Title */}
                  <Text style={styles.detailTitle}>{selectedMemory.title}</Text>

                  {/* Date */}
                  <Text style={styles.detailDate}>
                    {format(
                      new Date('milestone_date' in selectedMemory ? selectedMemory.milestone_date : selectedMemory.date), 
                      'EEEE, MMMM d, yyyy'
                    )}
                  </Text>

                  {/* Description */}
                  {selectedMemory.description && (
                    <Text style={styles.detailDescription}>
                      {selectedMemory.description}
                    </Text>
                  )}

                  {/* Metadata */}
                  <View style={styles.detailMetadata}>
                    <Text style={styles.detailMetadataText}>
                      Created {format(new Date(selectedMemory.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              </>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  anniversaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f8',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  anniversaryContent: {
    flex: 1,
  },
  anniversaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  anniversaryCountdown: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  memoriesList: {
    padding: 20,
  },
  memoryRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '48%',
  },
  memoryImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  memoryPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryInfo: {
    padding: 12,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  milestoneLabel: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '500',
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
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', // Changed from flex-end to center
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '75%', // Slightly smaller for memories screen
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra bottom padding for iOS
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#EC4899',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#fef2f8',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#EC4899',
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectedType: {
    borderColor: '#EC4899',
    backgroundColor: '#fef2f8',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedTypeText: {
    color: '#EC4899',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailContent: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  detailTextContent: {
    padding: 20,
  },
  detailMilestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff4e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  detailMilestoneText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    lineHeight: 30,
  },
  detailDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  detailDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 30,
  },
  detailMetadata: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailMetadataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});