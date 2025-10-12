// app/(tabs)/calendar.tsx - ENHANCED with animations
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Event, supabase } from '../../lib/supabase';

const CATEGORIES = [
  { value: 'anniversary', label: 'Anniversary', icon: 'heart', emoji: '💖', color: '#EC4899' },
  { value: 'date', label: 'Date Night', icon: 'restaurant', emoji: '🍽️', color: '#F59E0B' },
  { value: 'appointment', label: 'Appointment', icon: 'calendar', emoji: '📅', color: '#3B82F6' },
  { value: 'reminder', label: 'Reminder', icon: 'alarm', emoji: '⏰', color: '#8B5CF6' },
  { value: 'milestone', label: 'Milestone', icon: 'trophy', emoji: '🏆', color: '#10B981' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal', emoji: '✨', color: '#6B7280' },
] as const;

export default function CalendarScreen() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_time: '',
    category: 'other' as Event['category'],
    is_all_day: true,
  });

  // Animated values
  const calendarScale = useSharedValue(0.95);
  const addButtonScale = useSharedValue(1);

  useEffect(() => {
    // Calendar entrance animation
    calendarScale.value = withSpring(1, { damping: 12 });

    // Add button pulse
    addButtonScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const calendarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: calendarScale.value }],
  }));

  const addButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user, profile]);

  useEffect(() => {
    updateMarkedDates();
  }, [events, selectedDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (profile?.couple_id) {
        query = query.eq('couple_id', profile.couple_id);
      } else {
        query = query.is('couple_id', null).eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = () => {
    const marked: any = {};
    
    events.forEach((event) => {
      const category = CATEGORIES.find(c => c.value === event.category);
      const color = category?.color || '#6B7280';
      
      if (marked[event.event_date]) {
        marked[event.event_date].dots.push({ color });
      } else {
        marked[event.event_date] = {
          dots: [{ color }],
        };
      }
    });

    if (selectedDate) {
      if (marked[selectedDate]) {
        marked[selectedDate].selected = true;
        marked[selectedDate].selectedColor = theme.colors.primary;
      } else {
        marked[selectedDate] = {
          selected: true,
          selectedColor: theme.colors.primary,
        };
      }
    }

    setMarkedDates(marked);
  };

  const onDayPress = (day: DateData) => {
    if (selectedDate === day.dateString) {
      setSelectedDate(null);
    } else {
      setSelectedDate(day.dateString);
    }
  };

  const clearSelection = () => {
    setSelectedDate(null);
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      event_date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
      event_time: '',
      category: 'other',
      is_all_day: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      event_time: event.event_time || '',
      category: event.category || 'other',
      is_all_day: event.is_all_day,
    });
    setModalVisible(true);
  };

  const saveEvent = async () => {
    try {
      if (!user) return;
      if (!newEvent.title.trim()) {
        Alert.alert('Error', 'Please enter an event title');
        return;
      }

      const eventData: any = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_date: newEvent.event_date,
        event_time: newEvent.is_all_day ? null : newEvent.event_time || null,
        category: newEvent.category,
        is_all_day: newEvent.is_all_day,
        couple_id: profile?.couple_id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        Alert.alert('Success! ✨', 'Event updated!');
      } else {
        eventData.created_by = user.id;
        const { error } = await supabase.from('events').insert(eventData);

        if (error) throw error;
        Alert.alert('Success! 🎉', 'Event created!');
      }

      setModalVisible(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
        event_time: '',
        category: 'other',
        is_all_day: true,
      });
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;
              Alert.alert('Deleted! 🗑️');
              loadEvents();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const getEventsToDisplay = () => {
    if (selectedDate === null) {
      return events;
    }
    return events.filter((event) => event.event_date === selectedDate);
  };

  const renderEventItem = ({ item, index }: { item: Event; index: number }) => {
    const category = CATEGORIES.find((c) => c.value === item.category);
    const isMyEvent = item.created_by === user?.id;

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <TouchableOpacity
          style={styles.eventCard}
          onPress={() => openEditModal(item)}
        >
          <LinearGradient
            colors={[category?.color + '15' || '#6B728015', category?.color + '05' || '#6B728005']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.eventGradient}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventTitleRow}>
                <View style={[styles.categoryIconContainer, { backgroundColor: category?.color + '25' || '#6B728025' }]}>
                  <Text style={styles.categoryEmoji}>{category?.emoji || '✨'}</Text>
                </View>
                <View style={styles.eventTextContainer}>
                  {selectedDate === null && (
                    <Text style={styles.eventDate}>
                      {format(parseISO(item.event_date), 'MMM d, yyyy')}
                    </Text>
                  )}
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {!item.is_all_day && item.event_time && (
                    <Text style={styles.eventTime}>
                      ⏰ {format(parseISO(`2000-01-01T${item.event_time}`), 'h:mm a')}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => deleteEvent(item.id)}
                style={styles.deleteIconButton}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            {item.description && (
              <Text style={styles.eventDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            {!isMyEvent && profile?.couple_id && (
              <Text style={styles.partnerBadge}>💑 Created by partner</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = createStyles(theme);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Please sign in to view the calendar</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedEvents = getEventsToDisplay();

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Calendar 📅</Text>
        </View>
        <Animated.View style={addButtonStyle}>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={calendarStyle}>
          <Calendar
            current={selectedDate || format(new Date(), 'yyyy-MM-dd')}
            onDayPress={onDayPress}
            markingType="multi-dot"
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.cardBackground,
              calendarBackground: theme.colors.cardBackground,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.textLight,
              dotColor: theme.colors.primary,
              selectedDotColor: '#FFFFFF',
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            style={styles.calendar}
          />
        </Animated.View>

        <View style={styles.eventsSection}>
          <Animated.View 
            entering={FadeInUp.delay(200).springify()} 
            style={styles.eventsSectionHeader}
          >
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>
                {selectedDate === null 
                  ? '✨ All Events' 
                  : `📌 ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`}
              </Text>
              {selectedDate !== null && (
                <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textLight} />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.eventCount}>
              {displayedEvents.length} {displayedEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </Animated.View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : displayedEvents.length === 0 ? (
            <Animated.View entering={FadeIn.delay(300).springify()} style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>
                {selectedDate === null ? 'No events yet' : 'No events on this day'}
              </Text>
              <Text style={styles.emptyText}>Tap the + button to add an event</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={displayedEvents}
              renderItem={renderEventItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.eventsList}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal - Keep existing modal code but enhance the category selector */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingEvent ? '✏️ Edit Event' : '✨ New Event'}
              </Text>
              <TouchableOpacity onPress={saveEvent}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Event title..."
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelector}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.categoryButton,
                          newEvent.category === cat.value && {
                            backgroundColor: cat.color + '20',
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => setNewEvent({ ...newEvent, category: cat.value })}
                      >
                        <Text style={styles.categoryButtonEmoji}>{cat.emoji}</Text>
                        <Text
                          style={[
                            styles.categoryButtonText,
                            newEvent.category === cat.value && { color: cat.color },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.dateDisplay}>
                  📅 {format(parseISO(newEvent.event_date), 'EEEE, MMMM d, yyyy')}
                </Text>
              </View>

              <View style={styles.allDayContainer}>
                <Text style={styles.label}>All Day Event</Text>
                <Switch
                  value={newEvent.is_all_day}
                  onValueChange={(value) => setNewEvent({ ...newEvent, is_all_day: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                  thumbColor={newEvent.is_all_day ? theme.colors.primary : '#f4f3f4'}
                />
              </View>

              {!newEvent.is_all_day && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Time ⏰</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM (24-hour format)"
                    value={newEvent.event_time}
                    onChangeText={(text) => setNewEvent({ ...newEvent, event_time: text })}
                    placeholderTextColor={theme.colors.textLight}
                  />
                  <Text style={styles.helperText}>Example: 14:30 for 2:30 PM</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add notes about this event..."
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
  backButton: {
    padding: 4,
    width: 40,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventsSection: {
    padding: 20,
  },
  eventsSectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  eventCount: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  eventTextContainer: {
    flex: 1,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 2,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginLeft: 56,
    lineHeight: 20,
  },
  partnerBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 8,
    marginLeft: 56,
    fontWeight: '500',
  },
  deleteIconButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    minHeight: 100,
  },
  dateDisplay: {
    fontSize: 16,
    color: theme.colors.text,
    padding: 16,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  allDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  categoryButtonEmoji: {
    fontSize: 20,
  },
  categoryButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});