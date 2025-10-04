// app/(tabs)/memories.tsx
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { Memory, MemoryItem, supabase } from '../../lib/supabase';
import { formatDuration, playAudio, startRecording, stopRecording } from '../../utils/audioRecording';
import { compressImage, formatFileSize } from '../../utils/imageCompression';

interface MemoryWithItems extends Memory {
  items?: MemoryItem[];
  itemCount?: number;
  latestItemDate?: string;
}

type ItemType = 'photo' | 'journal' | 'audio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MemoriesScreen() {
  const { profile, user } = useAuth();
  const [memories, setMemories] = useState<MemoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [showAddItemView, setShowAddItemView] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryWithItems | null>(null);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
  });

  const [newItem, setNewItem] = useState({
    type: 'photo' as ItemType,
    content: '',
    selectedImage: null as string | null,
    recordedAudio: null as string | null,
    audioDuration: 0,
  });

  useEffect(() => {
    if (user) {
      loadMemories();
    }
  }, [user, profile]);

  useEffect(() => {
    // Cleanup when closing the add item view
    if (!showAddItemView) {
      if (recording) {
        if ((recording as any).durationInterval) {
          clearInterval((recording as any).durationInterval);
        }
        recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
        setIsRecording(false);
        setRecordingDuration(0);
      }
    }
  }, [showAddItemView]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (playingSound) {
        playingSound.stopAsync().catch(() => {});
        playingSound.unloadAsync().catch(() => {});
      }
      if (recording) {
        if ((recording as any).durationInterval) {
          clearInterval((recording as any).durationInterval);
        }
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [playingSound, recording]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('memories')
        .select('*')
        .order('updated_at', { ascending: false });

      if (profile?.couple_id) {
        query = query.eq('couple_id', profile.couple_id);
      } else {
        query = query.is('couple_id', null).eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const memoriesWithMeta = await Promise.all(
        (data || []).map(async (memory) => {
          const { data: items, error: itemsError } = await supabase
            .from('memory_items')
            .select('*')
            .eq('memory_id', memory.id)
            .order('created_at', { ascending: false });

          if (itemsError) {
            console.error('Error loading items:', itemsError);
            return { ...memory, itemCount: 0, items: [] };
          }

          return {
            ...memory,
            items,
            itemCount: items?.length || 0,
            latestItemDate: items?.[0]?.created_at,
          };
        })
      );

      setMemories(memoriesWithMeta);
    } catch (error) {
      console.error('Error loading memories:', error);
      Alert.alert('Error', 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const loadMemoryItems = async (memoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('memory_items')
        .select('*')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemoryItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const createMemory = async () => {
    try {
      if (!user) return;

      if (!newMemory.title.trim()) {
        Alert.alert('Error', 'Please add a title for your memory');
        return;
      }

      const memoryData = {
        couple_id: profile?.couple_id || null,
        created_by: user.id,
        title: newMemory.title.trim(),
        description: newMemory.description.trim() || null,
        is_shared: true,
      };

      const { error } = await supabase.from('memories').insert(memoryData);

      if (error) throw error;

      Alert.alert('Success', 'Memory collection created! 🎉');
      setCreateModalVisible(false);
      setNewMemory({ title: '', description: '' });
      loadMemories();
    } catch (error) {
      console.error('Error creating memory:', error);
      Alert.alert('Error', 'Failed to create memory');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    Alert.alert(
      'Delete Memory',
      'This will delete the memory and all its items. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('memories')
                .delete()
                .eq('id', memoryId);

              if (error) throw error;

              Alert.alert('Success', 'Memory deleted');
              setDetailModalVisible(false);
              setShowAddItemView(false);
              loadMemories();
            } catch (error) {
              console.error('Error deleting memory:', error);
              Alert.alert('Error', 'Failed to delete memory');
            }
          },
        },
      ]
    );
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('memory_items')
              .delete()
              .eq('id', itemId);

            if (error) throw error;

            if (selectedMemory) {
              loadMemoryItems(selectedMemory.id);
              loadMemories();
            }
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const uploadImage = async (uri: string) => {
    try {
      if (!user) return null;
      setUploading(true);

      // Compress image before uploading
      const compressed = await compressImage(uri);
      
      // Log compression stats (optional - remove in production)
      console.log('Original size:', formatFileSize(compressed.originalSize));
      console.log('Compressed size:', formatFileSize(compressed.compressedSize));
      console.log('Compression ratio:', compressed.compressionRatio.toFixed(1) + '%');

      const fileExt = 'jpg'; // Always JPEG after compression
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `memories/${user.id}/${fileName}`;

      // Read the compressed image as base64
      const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
        encoding: 'base64',
      });

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { data, error } = await supabase.storage
        .from('memory-photos')
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('memory-photos')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);

      if (signedError) throw signedError;

      // Clean up the temporary compressed file
      await FileSystem.deleteAsync(compressed.uri, { idempotent: true });

      return signedData.signedUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error?.message || 'Failed to upload image');
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
      setNewItem({ ...newItem, selectedImage: result.assets[0].uri });
    }
  };

  const uploadAudio = async (uri: string) => {
    try {
      if (!user) return null;
      setUploading(true);

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.m4a`;
      const filePath = `memories/${user.id}/${fileName}`;

      // Read audio file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Use audio/mp4 which is the native format for .m4a files
      const { data, error } = await supabase.storage
        .from('memory-photos')
        .upload(filePath, byteArray, {
          contentType: 'audio/mp4',
          upsert: false,
        });

      if (error) throw error;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('memory-photos')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);

      if (signedError) throw signedError;

      // Clean up the temporary audio file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      return signedData.signedUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Storage Configuration Required',
        'Please add "audio/mp4" to allowed MIME types in your Supabase bucket.\n\nGo to Storage → memory-photos → Edit → Allowed MIME types → Add "audio/mp4"'
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const rec = await startRecording();
      setRecording(rec);
      setIsRecording(true);
      
      // Update duration every second
      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
      
      // Store interval ID to clear it later
      (rec as any).durationInterval = interval;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!recording) return;

      // Clear the duration interval
      if ((recording as any).durationInterval) {
        clearInterval((recording as any).durationInterval);
      }

      const result = await stopRecording(recording);
      
      setNewItem({
        ...newItem,
        recordedAudio: result.uri,
        audioDuration: result.duration,
      });
      
      setIsRecording(false);
      setRecording(null); // Clear recording reference immediately
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setRecording(null); // Clear recording reference even on error
      setRecordingDuration(0);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handlePlayAudio = async (uri: string, itemId: string) => {
    try {
      // Stop currently playing audio if any
      if (playingSound) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
        if (playingItemId === itemId) {
          setPlayingSound(null);
          setPlayingItemId(null);
          return;
        }
      }

      const sound = await playAudio(uri);
      setPlayingSound(sound);
      setPlayingItemId(itemId);

      // Auto-stop when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          setPlayingItemId(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const addItemToMemory = async () => {
    try {
      if (!selectedMemory) return;

      let itemData: any = {
        memory_id: selectedMemory.id,
        type: newItem.type,
      };

      if (newItem.type === 'photo') {
        if (!newItem.selectedImage) {
          Alert.alert('Error', 'Please select a photo');
          return;
        }
        const fileUrl = await uploadImage(newItem.selectedImage);
        if (!fileUrl) return;
        itemData.file_url = fileUrl;
      } else if (newItem.type === 'journal') {
        if (!newItem.content.trim()) {
          Alert.alert('Error', 'Please write something');
          return;
        }
        itemData.content = newItem.content.trim();
      } else if (newItem.type === 'audio') {
        if (!newItem.recordedAudio) {
          Alert.alert('Error', 'Please record audio');
          return;
        }
        const fileUrl = await uploadAudio(newItem.recordedAudio);
        if (!fileUrl) return;
        itemData.file_url = fileUrl;
        itemData.content = formatDuration(newItem.audioDuration); // Store duration as content
      }

      const { error } = await supabase.from('memory_items').insert(itemData);

      if (error) throw error;

      await supabase
        .from('memories')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedMemory.id);

      Alert.alert('Success', 'Item added! ✨');
      setShowAddItemView(false);
      setNewItem({ type: 'photo', content: '', selectedImage: null, recordedAudio: null, audioDuration: 0 });
      loadMemoryItems(selectedMemory.id);
      loadMemories();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const openMemoryDetail = (memory: MemoryWithItems) => {
    setSelectedMemory(memory);
    loadMemoryItems(memory.id);
    setShowAddItemView(false);
    setShowImageViewer(false);
    setDetailModalVisible(true);
  };

  const openImageViewer = (imageUrl: string) => {
    setViewingImageUrl(imageUrl);
    setShowImageViewer(true);
  };

  const renderMemoryCard = useCallback(
    ({ item }: { item: MemoryWithItems }) => {
      const coverImage = item.items?.find((i) => i.type === 'photo')?.file_url;

      return (
        <TouchableOpacity
          style={styles.memoryCard}
          onPress={() => openMemoryDetail(item)}
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.placeholderCover}>
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
            </View>
          )}
          <View style={styles.memoryCardContent}>
            <Text style={styles.memoryTitle} numberOfLines={1}>
              {item.title || 'Untitled Memory'}
            </Text>
            {item.description && (
              <Text style={styles.memoryDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.memoryMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{item.itemCount || 0} items</Text>
              </View>
              {item.latestItemDate && (
                <Text style={styles.metaDate}>
                  {format(new Date(item.latestItemDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    []
  );

  const renderMemoryItem = useCallback(
    ({ item }: { item: MemoryItem }) => {
      return (
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTypeContainer}>
              <Ionicons
                name={
                  item.type === 'photo'
                    ? 'image'
                    : item.type === 'journal'
                    ? 'document-text'
                    : 'mic'
                }
                size={16}
                color="#8B5CF6"
              />
              <Text style={styles.itemType}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            <View style={styles.itemActions}>
              <Text style={styles.itemDate}>
                {format(new Date(item.created_at), 'MMM d, h:mm a')}
              </Text>
              <TouchableOpacity
                onPress={() => deleteItem(item.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {item.type === 'photo' && item.file_url && (
            <TouchableOpacity
              onPress={() => openImageViewer(item.file_url!)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.file_url }} style={styles.itemImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand-outline" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {item.type === 'journal' && item.content && (
            <Text style={styles.itemContent}>{item.content}</Text>
          )}

          {item.type === 'audio' && item.file_url && (
            <TouchableOpacity
              style={styles.audioPlayButton}
              onPress={() => handlePlayAudio(item.file_url!, item.id)}
            >
              <Ionicons
                name={playingItemId === item.id ? 'pause-circle' : 'play-circle'}
                size={48}
                color="#8B5CF6"
              />
              <Text style={styles.audioDuration}>
                {item.content || '0:00'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    []
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Please sign in to view memories</Text>
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
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add-circle" size={32} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No memory collections yet</Text>
          <Text style={styles.emptyText}>
            Create a collection to start capturing moments
          </Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          renderItem={renderMemoryCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      )}

      {/* Create Memory Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewMemory({ title: '', description: '' });
                }}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Memory</Text>
              <TouchableOpacity onPress={createMemory}>
                <Text style={styles.saveButton}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.titleInput}
                placeholder="Memory title (e.g., 'California Trip')"
                value={newMemory.title}
                onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.descriptionInput}
                placeholder="Description (optional)"
                value={newMemory.description}
                onChangeText={(text) =>
                  setNewMemory({ ...newMemory, description: text })
                }
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.helpText}>
                💡 After creating, you can add photos, journal entries, and audio
                recordings over time
              </Text>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Memory Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setDetailModalVisible(false);
                setShowAddItemView(false);
                setShowImageViewer(false);
              }}
              style={styles.modalHeaderButton}
            >
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {showImageViewer 
                ? 'Photo' 
                : showAddItemView 
                ? 'Add Item' 
                : selectedMemory?.title || 'Memory'}
            </Text>
            {!showAddItemView && !showImageViewer && selectedMemory && (
              <TouchableOpacity
                onPress={() => deleteMemory(selectedMemory.id)}
                style={styles.modalHeaderButton}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
            {(showAddItemView || showImageViewer) && <View style={styles.modalHeaderButton} />}
          </View>

          {selectedMemory && (
            <KeyboardAvoidingView
              style={styles.detailContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {showImageViewer ? (
                // IMAGE VIEWER VIEW
                <View style={styles.imageViewerContainer}>
                  <View style={styles.imageViewerHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowImageViewer(false);
                        setViewingImageUrl(null);
                      }}
                      style={styles.backToItemsButton}
                    >
                      <Ionicons name="arrow-back" size={24} color="#fff" />
                      <Text style={styles.imageViewerBackText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {viewingImageUrl ? (
                    <Image
                      source={{ uri: viewingImageUrl }}
                      style={styles.fullScreenImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.imageViewerContent}>
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}
                </View>
              ) : !showAddItemView ? (
                // ITEMS LIST VIEW
                <>
                  <View style={styles.descriptionContainer}>
                    {selectedMemory.description && (
                      <Text style={styles.detailDescription}>
                        {selectedMemory.description}
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemsHeader}>
                    <Text style={styles.itemsTitle}>Items</Text>
                    <TouchableOpacity
                      style={styles.addItemButton}
                      onPress={() => setShowAddItemView(true)}
                    >
                      <Ionicons name="add" size={20} color="#8B5CF6" />
                      <Text style={styles.addItemText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {memoryItems.length === 0 ? (
                    <View style={styles.emptyItems}>
                      <Ionicons name="file-tray-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyItemsText}>No items yet</Text>
                      <Text style={styles.emptyItemsSubtext}>
                        Add photos, journal entries, or recordings
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={memoryItems}
                      renderItem={renderMemoryItem}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.itemsList}
                      showsVerticalScrollIndicator={false}
                    />
                  )}
                </>
              ) : (
                // ADD ITEM VIEW
                <ScrollView style={styles.addItemContainer}>
                  <View style={styles.addItemHeader}>
                    <TouchableOpacity
                      onPress={async () => {
                        // Stop recording if active
                        if (recording) {
                          if ((recording as any).durationInterval) {
                            clearInterval((recording as any).durationInterval);
                          }
                          try {
                            await recording.stopAndUnloadAsync();
                          } catch (e) {
                            // Ignore errors if already stopped
                          }
                        }
                        setShowAddItemView(false);
                        setNewItem({ type: 'photo', content: '', selectedImage: null, recordedAudio: null, audioDuration: 0 });
                        setIsRecording(false);
                        setRecording(null);
                        setRecordingDuration(0);
                      }}
                      style={styles.backToItemsButton}
                    >
                      <Ionicons name="arrow-back" size={24} color="#6B7280" />
                      <Text style={styles.backToItemsText}>Back to Items</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={addItemToMemory} 
                      disabled={uploading}
                      style={styles.saveItemButton}
                    >
                      <Text style={[styles.saveItemButtonText, uploading && styles.saveButtonDisabled]}>
                        {uploading ? 'Saving...' : 'Save Item'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalContent}>
                    <Text style={styles.sectionLabel}>Item Type</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          newItem.type === 'photo' && styles.typeButtonActive,
                        ]}
                        onPress={async () => {
                          // Clean up recording if switching away from audio
                          if (recording) {
                            if ((recording as any).durationInterval) {
                              clearInterval((recording as any).durationInterval);
                            }
                            try {
                              await recording.stopAndUnloadAsync();
                            } catch (e) {
                              // Ignore errors
                            }
                            setRecording(null);
                            setIsRecording(false);
                            setRecordingDuration(0);
                          }
                          setNewItem({ ...newItem, type: 'photo', content: '', recordedAudio: null, audioDuration: 0 });
                        }}
                      >
                        <Ionicons
                          name="image"
                          size={24}
                          color={newItem.type === 'photo' ? '#8B5CF6' : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.typeButtonText,
                            newItem.type === 'photo' && styles.typeButtonTextActive,
                          ]}
                        >
                          Photo
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          newItem.type === 'journal' && styles.typeButtonActive,
                        ]}
                        onPress={async () => {
                          // Clean up recording if switching away from audio
                          if (recording) {
                            if ((recording as any).durationInterval) {
                              clearInterval((recording as any).durationInterval);
                            }
                            try {
                              await recording.stopAndUnloadAsync();
                            } catch (e) {
                              // Ignore errors
                            }
                            setRecording(null);
                            setIsRecording(false);
                            setRecordingDuration(0);
                          }
                          setNewItem({ ...newItem, type: 'journal', selectedImage: null, recordedAudio: null, audioDuration: 0 });
                        }}
                      >
                        <Ionicons
                          name="document-text"
                          size={24}
                          color={newItem.type === 'journal' ? '#8B5CF6' : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.typeButtonText,
                            newItem.type === 'journal' && styles.typeButtonTextActive,
                          ]}
                        >
                          Journal
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          newItem.type === 'audio' && styles.typeButtonActive,
                        ]}
                        onPress={() =>
                          setNewItem({ ...newItem, type: 'audio', content: '', selectedImage: null })
                        }
                      >
                        <Ionicons
                          name="mic"
                          size={24}
                          color={newItem.type === 'audio' ? '#8B5CF6' : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.typeButtonText,
                            newItem.type === 'audio' && styles.typeButtonTextActive,
                          ]}
                        >
                          Audio
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {newItem.type === 'photo' && (
                      <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={pickImage}
                      >
                        {newItem.selectedImage ? (
                          <Image
                            source={{ uri: newItem.selectedImage }}
                            style={styles.selectedImage}
                          />
                        ) : (
                          <>
                            <Ionicons name="camera" size={40} color="#9CA3AF" />
                            <Text style={styles.imagePickerText}>Select Photo</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {newItem.type === 'journal' && (
                      <TextInput
                        style={styles.journalInput}
                        placeholder="Write your thoughts..."
                        value={newItem.content}
                        onChangeText={(text) => setNewItem({ ...newItem, content: text })}
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor="#9CA3AF"
                      />
                    )}

                    {newItem.type === 'audio' && (
                      <View style={styles.audioRecordingContainer}>
                        {!newItem.recordedAudio ? (
                          <View style={styles.recordingControls}>
                            <TouchableOpacity
                              style={[
                                styles.recordButton,
                                isRecording && styles.recordButtonActive,
                              ]}
                              onPress={isRecording ? handleStopRecording : handleStartRecording}
                              disabled={uploading}
                            >
                              <Ionicons
                                name={isRecording ? 'stop-circle' : 'mic'}
                                size={64}
                                color={isRecording ? '#EF4444' : '#8B5CF6'}
                              />
                            </TouchableOpacity>
                            <Text style={styles.recordingText}>
                              {isRecording
                                ? `Recording: ${formatDuration(recordingDuration)}`
                                : 'Tap to start recording'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.recordedAudioPreview}>
                            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                            <Text style={styles.recordedText}>
                              Audio recorded: {formatDuration(newItem.audioDuration)}
                            </Text>
                            <TouchableOpacity
                              style={styles.deleteRecordingButton}
                              onPress={() =>
                                setNewItem({
                                  ...newItem,
                                  recordedAudio: null,
                                  audioDuration: 0,
                                })
                              }
                            >
                              <Text style={styles.deleteRecordingText}>
                                Record Again
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </KeyboardAvoidingView>
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
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    width: '48%',
  },
  coverImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  placeholderCover: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryCardContent: {
    padding: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  memoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDate: {
    fontSize: 11,
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
    marginBottom: 8,
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
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  modalHeaderButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: 20,
  },
  titleInput: {
    fontSize: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    color: '#1F2937',
  },
  descriptionInput: {
    fontSize: 15,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 120,
    marginBottom: 16,
    color: '#1F2937',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  detailContainer: {
    flex: 1,
  },
  descriptionContainer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  addItemText: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemType: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 4,
  },
  itemImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  itemContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  emptyItems: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  addItemContainer: {
    flex: 1,
  },
  addItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backToItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToItemsText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveItemButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveItemButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
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
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  journalInput: {
    fontSize: 15,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 200,
    color: '#1F2937',
  },
  audioPlaceholder: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlaceholderText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  // Audio Recording Styles
  audioRecordingContainer: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingControls: {
    alignItems: 'center',
    gap: 16,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  recordButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  recordingText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  recordedAudioPreview: {
    alignItems: 'center',
    gap: 12,
  },
  recordedText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
  },
  deleteRecordingButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  deleteRecordingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Audio Playback Styles
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
  },
  audioDuration: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  // Image Viewer Styles (inside detail modal, not stacked)
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeader: {
    padding: 20,
    paddingTop: 12,
  },
  imageViewerBackText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
  },
});