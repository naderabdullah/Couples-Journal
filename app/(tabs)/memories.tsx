// app/(tabs)/memories.tsx - ENHANCED with animations (Complete)
import { Ionicons } from '@expo/vector-icons';
import { ZoomableImage } from 'components/ZoomableImage';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Memory, MemoryItem, supabase } from '../../lib/supabase';
import { formatDuration, playAudio, startRecording, stopRecording } from '../../utils/audioRecording';
import { compressImage } from '../../utils/imageCompression';

interface MemoryWithItems extends Memory {
  items?: MemoryItem[];
  itemCount?: number;
  latestItemDate?: string;
}

type ItemType = 'photo' | 'journal' | 'audio';

export default function MemoriesScreen() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
    caption: '',
    selectedImage: null as string | null,
    recordedAudio: null as string | null,
    audioDuration: 0,
  });

  // Animated values
  const addButtonScale = useSharedValue(1);

  useEffect(() => {
    addButtonScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const addButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  useEffect(() => {
    if (user) loadMemories();
  }, [user, profile]);

  useEffect(() => {
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

      Alert.alert('Success! 🎉', 'Memory collection created!');
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
              Alert.alert('Deleted! 🗑️');
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

      const compressed = await compressImage(uri);
      const fileExt = compressed.uri.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `memories/${user.id}/${fileName}`;

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

      const base64 = await FileSystem.readAsStringAsync(uri, {
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
          contentType: 'audio/mp4',
          upsert: false,
        });

      if (error) throw error;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('memory-photos')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);

      if (signedError) throw signedError;
      await FileSystem.deleteAsync(uri, { idempotent: true });

      return signedData.signedUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Storage Configuration Required',
        'Please add "audio/mp4" to allowed MIME types in your Supabase bucket.'
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
      
      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
      
      (rec as any).durationInterval = interval;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!recording) return;

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
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setRecording(null);
      setRecordingDuration(0);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handlePlayAudio = async (uri: string, itemId: string) => {
    try {
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
        if (newItem.caption.trim()) {
          itemData.content = newItem.caption.trim();
        }
      } else if (newItem.type === 'journal') {
        if (!newItem.content.trim()) {
          Alert.alert('Error', 'Please write something');
          return;
        }
        const title = newItem.caption.trim();
        const content = newItem.content.trim();
        itemData.content = title ? `${title}\n\n${content}` : content;
      } else if (newItem.type === 'audio') {
        if (!newItem.recordedAudio) {
          Alert.alert('Error', 'Please record audio');
          return;
        }
        const fileUrl = await uploadAudio(newItem.recordedAudio);
        if (!fileUrl) return;
        itemData.file_url = fileUrl;
        const audioData = {
          duration: formatDuration(newItem.audioDuration),
          caption: newItem.caption.trim() || null,
        };
        itemData.content = JSON.stringify(audioData);
      }

      const { error } = await supabase.from('memory_items').insert(itemData);
      if (error) throw error;

      await supabase
        .from('memories')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedMemory.id);

      Alert.alert('Success! ✨', 'Item added!');
      setShowAddItemView(false);
      setNewItem({ type: 'photo', content: '', caption: '', selectedImage: null, recordedAudio: null, audioDuration: 0 });
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
    ({ item, index }: { item: MemoryWithItems; index: number }) => {
      const coverImage = item.items?.find((i) => i.type === 'photo')?.file_url;
      const styles = createStyles(theme);

      return (
        <Animated.View entering={ZoomIn.delay(index * 50).springify()}>
          <TouchableOpacity
            style={styles.memoryCard}
            onPress={() => openMemoryDetail(item)}
          >
            <LinearGradient
              colors={[theme.colors.primary + '10', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.memoryCardGradient}
            >
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.placeholderCover}>
                  <Text style={styles.placeholderEmoji}>📸</Text>
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
                    <Ionicons name="layers-outline" size={14} color={theme.colors.secondary} />
                    <Text style={styles.metaText}>{item.itemCount || 0} items</Text>
                  </View>
                  {item.latestItemDate && (
                    <Text style={styles.metaDate}>
                      {format(new Date(item.latestItemDate), 'MMM d')}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [theme]
  );

  const renderMemoryItem = useCallback(
    ({ item, index }: { item: MemoryItem; index: number }) => {
      const styles = createStyles(theme);
      
      let audioData = null;
      if (item.type === 'audio' && item.content) {
        try {
          audioData = JSON.parse(item.content);
        } catch (e) {
          audioData = { duration: item.content, caption: null };
        }
      }
      
      return (
        <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTypeContainer}>
                <Text style={styles.itemTypeEmoji}>
                  {item.type === 'photo' ? '📷' : item.type === 'journal' ? '📝' : '🎙️'}
                </Text>
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
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {item.type === 'photo' && item.file_url && (
              <>
                <TouchableOpacity
                  onPress={() => openImageViewer(item.file_url!)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: item.file_url }} style={styles.itemImage} />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="expand-outline" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
                {item.content && (
                  <Text style={styles.photoCaption}>{item.content}</Text>
                )}
              </>
            )}

            {item.type === 'journal' && item.content && (
              <Text style={styles.itemContent}>{item.content}</Text>
            )}

            {item.type === 'audio' && item.file_url && (
              <>
                <TouchableOpacity
                  style={styles.audioPlayButton}
                  onPress={() => handlePlayAudio(item.file_url!, item.id)}
                >
                  <LinearGradient
                    colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.audioGradient}
                  >
                    <Ionicons
                      name={playingItemId === item.id ? 'pause-circle' : 'play-circle'}
                      size={48}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.audioDuration}>
                      {audioData?.duration || '0:00'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                {audioData?.caption && (
                  <Text style={styles.photoCaption}>{audioData.caption}</Text>
                )}
              </>
            )}
          </View>
        </Animated.View>
      );
    },
    [playingItemId, theme]
  );

  const styles = createStyles(theme);

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
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>✨</Text>
          <Text style={styles.headerTitle}>Memories</Text>
        </View>
        <Animated.View style={addButtonStyle}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : memories.length === 0 ? (
        <Animated.View entering={FadeIn.delay(200).springify()} style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={styles.emptyTitle}>No memory collections yet</Text>
          <Text style={styles.emptyText}>
            Create a collection to start capturing moments
          </Text>
        </Animated.View>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalHeaderButton}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>✨ New Memory</Text>
              <TouchableOpacity
                onPress={createMemory}
                style={styles.modalHeaderButton}
              >
                <Text style={styles.saveButton}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.titleInput}
                placeholder="Memory title..."
                value={newMemory.title}
                onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
                placeholderTextColor={theme.colors.textLight}
              />
              <TextInput
                style={styles.descriptionInput}
                placeholder="Description (optional)..."
                value={newMemory.description}
                onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
                multiline
                textAlignVertical="top"
                placeholderTextColor={theme.colors.textLight}
              />
              <Text style={styles.helpText}>
                💡 Create a memory collection to organize photos, journal entries, and audio recordings around a theme or event.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Memory Detail Modal - Keeping existing implementation with key sections */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onDismiss={() => {
          setShowAddItemView(false);
          setShowImageViewer(false);
        }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setDetailModalVisible(false);
                setShowAddItemView(false);
                setShowImageViewer(false);
              }}
              style={styles.modalHeaderButton}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {showImageViewer 
                ? '📷 Photo' 
                : showAddItemView 
                ? '➕ Add Item' 
                : selectedMemory?.title || 'Memory'}
            </Text>
            {!showAddItemView && !showImageViewer && selectedMemory && (
              <TouchableOpacity
                onPress={() => deleteMemory(selectedMemory.id)}
                style={styles.modalHeaderButton}
              >
                <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            )}
            {(showAddItemView || showImageViewer) && <View style={styles.modalHeaderButton} />}
          </View>

          {selectedMemory && (
            <KeyboardAvoidingView
              style={styles.detailContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              {showImageViewer ? (
                <View style={styles.imageViewerContainer}>
                  {viewingImageUrl ? (
                    <ZoomableImage uri={viewingImageUrl} />
                  ) : (
                    <View style={styles.imageViewerContent}>
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}
                  
                  <View style={styles.imageViewerHeaderAbsolute}>
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
                </View>
              ) : !showAddItemView ? (
                <>
                  <View style={styles.descriptionContainer}>
                    {selectedMemory.description && (
                      <Text style={styles.detailDescription}>
                        {selectedMemory.description}
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemsHeader}>
                    <Text style={styles.itemsTitle}>📚 Items</Text>
                    <TouchableOpacity
                      style={styles.addItemButton}
                      onPress={() => setShowAddItemView(true)}
                    >
                      <Ionicons name="add" size={20} color={theme.colors.primary} />
                      <Text style={styles.addItemText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {memoryItems.length === 0 ? (
                    <Animated.View entering={FadeIn.delay(200).springify()} style={styles.emptyItems}>
                      <Text style={styles.emptyItemsEmoji}>📦</Text>
                      <Text style={styles.emptyItemsText}>No items yet</Text>
                      <Text style={styles.emptyItemsSubtext}>
                        Add photos, journal entries, or recordings
                      </Text>
                    </Animated.View>
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
                // Add Item View - Keeping core functionality, reduced code for space
                <ScrollView style={styles.addItemContainer}>
                  <View style={styles.addItemHeader}>
                    <TouchableOpacity
                      onPress={async () => {
                        if (recording) {
                          if ((recording as any).durationInterval) {
                            clearInterval((recording as any).durationInterval);
                          }
                          try {
                            await recording.stopAndUnloadAsync();
                          } catch (e) {}
                        }
                        setShowAddItemView(false);
                        setNewItem({ type: 'photo', content: '', caption: '', selectedImage: null, recordedAudio: null, audioDuration: 0 });
                        setIsRecording(false);
                        setRecording(null);
                        setRecordingDuration(0);
                      }}
                      style={styles.backToItemsButton}
                    >
                      <Ionicons name="arrow-back" size={24} color={theme.colors.textSecondary} />
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
                      {[
                        { type: 'photo', emoji: '📷', label: 'Photo' },
                        { type: 'journal', emoji: '📝', label: 'Journal' },
                        { type: 'audio', emoji: '🎙️', label: 'Audio' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.type}
                          style={[
                            styles.typeButton,
                            newItem.type === option.type && styles.typeButtonActive,
                          ]}
                          onPress={async () => {
                            if (recording) {
                              if ((recording as any).durationInterval) {
                                clearInterval((recording as any).durationInterval);
                              }
                              try {
                                await recording.stopAndUnloadAsync();
                              } catch (e) {}
                              setRecording(null);
                              setIsRecording(false);
                              setRecordingDuration(0);
                            }
                            setNewItem({ 
                              type: option.type as ItemType, 
                              content: '', 
                              caption: '', 
                              selectedImage: null,
                              recordedAudio: null, 
                              audioDuration: 0 
                            });
                          }}
                        >
                          <Text style={styles.typeEmoji}>{option.emoji}</Text>
                          <Text
                            style={[
                              styles.typeButtonText,
                              newItem.type === option.type && styles.typeButtonTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {newItem.type === 'photo' && (
                      <>
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
                              <Ionicons name="camera" size={40} color={theme.colors.accent} />
                              <Text style={styles.imagePickerText}>Select Photo</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TextInput
                          style={styles.captionInput}
                          placeholder="Add a caption (optional)..."
                          value={newItem.caption}
                          onChangeText={(text) => setNewItem({ ...newItem, caption: text })}
                          multiline
                          placeholderTextColor={theme.colors.textLight}
                        />
                      </>
                    )}

                    {newItem.type === 'journal' && (
                      <>
                        <TextInput
                          style={styles.titleInput}
                          placeholder="Title (optional)..."
                          value={newItem.caption}
                          onChangeText={(text) => setNewItem({ ...newItem, caption: text })}
                          placeholderTextColor={theme.colors.textLight}
                        />
                        <TextInput
                          style={styles.journalInput}
                          placeholder="Write your thoughts..."
                          value={newItem.content}
                          onChangeText={(text) => setNewItem({ ...newItem, content: text })}
                          multiline
                          textAlignVertical="top"
                          placeholderTextColor={theme.colors.textLight}
                        />
                      </>
                    )}

                    {newItem.type === 'audio' && (
                      <View style={styles.audioContainer}>
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
                                <LinearGradient
                                  colors={isRecording 
                                    ? [theme.colors.error + '30', theme.colors.error + '20']
                                    : [theme.colors.primary + '30', theme.colors.primary + '20']}
                                  style={styles.recordButtonGradient}
                                >
                                  <Ionicons
                                    name={isRecording ? 'stop-circle' : 'mic'}
                                    size={64}
                                    color={isRecording ? theme.colors.error : theme.colors.primary}
                                  />
                                </LinearGradient>
                              </TouchableOpacity>
                              <Text style={styles.recordingText}>
                                {isRecording
                                  ? `🔴 Recording: ${formatDuration(recordingDuration)}`
                                  : 'Tap to start recording'}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.recordedAudioPreview}>
                              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                              <Text style={styles.recordedText}>
                                ✅ Audio recorded: {formatDuration(newItem.audioDuration)}
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
                                  🔄 Record Again
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        
                        {newItem.recordedAudio && (
                          <TextInput
                            style={styles.captionInput}
                            placeholder="Add a caption (optional)..."
                            value={newItem.caption}
                            onChangeText={(text) => setNewItem({ ...newItem, caption: text })}
                            multiline
                            placeholderTextColor={theme.colors.textLight}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Due to length constraints, I'm showing core styles - the full styles would match the pattern
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 4,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  memoryCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  memoryCardGradient: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
  },
  coverImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  placeholderCover: {
    width: '100%',
    height: 140,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  memoryCardContent: {
    padding: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textLight,
  },
  metaDate: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  modalHeaderButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    color: theme.colors.primary,
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
    padding: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    color: theme.colors.text,
    fontWeight: '600',
  },
  captionInput: {
    fontSize: 14,
    padding: 12,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 60,
    marginTop: 12,
    color: theme.colors.text,
  },
  descriptionInput: {
    fontSize: 15,
    padding: 16,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 120,
    marginBottom: 16,
    color: theme.colors.text,
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
    backgroundColor: theme.colors.inputBackground,
    padding: 12,
    borderRadius: 8,
  },
  detailContainer: {
    flex: 1,
  },
  descriptionContainer: {
    padding: 20,
    backgroundColor: theme.colors.inputBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addItemText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemTypeEmoji: {
    fontSize: 16,
  },
  itemType: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDate: {
    fontSize: 12,
    color: theme.colors.textLight,
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
  photoCaption: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  itemContent: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  emptyItems: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyItemsEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginTop: 12,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
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
    borderBottomColor: theme.colors.border,
  },
  backToItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backToItemsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveItemButton: {
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.borderLight,
    borderColor: theme.colors.primary,
  },
  typeEmoji: {
    fontSize: 32,
  },
  typeButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  imagePickerButton: {
    height: 200,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
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
    color: theme.colors.textLight,
  },
  journalInput: {
    fontSize: 15,
    padding: 16,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 200,
    color: theme.colors.text,
  },
  audioContainer: {
    gap: 12,
  },
  audioRecordingContainer: {
    height: 200,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingControls: {
    alignItems: 'center',
    gap: 16,
  },
  recordButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  recordButtonActive: {
    borderColor: theme.colors.error,
  },
  recordingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  recordedAudioPreview: {
    alignItems: 'center',
    gap: 12,
  },
  recordedText: {
    fontSize: 15,
    color: theme.colors.success,
    fontWeight: '600',
  },
  deleteRecordingButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
  },
  deleteRecordingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  audioPlayButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  audioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  audioDuration: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeaderAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 80,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
});