// app/(tabs)/calendar.tsx
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Event, supabase } from '../../lib/supabase';

const CATEGORIES = [
  { value: 'anniversary', label: 'Anniversary', icon: 'heart', color: '#EC4899' },
  { value: 'date', label: 'Date Night', icon: 'restaurant', color: '#F59E0B' },
  { value: 'appointment', label: 'Appointment', icon: 'calendar', color: '#3B82F6' },
  { value: 'reminder', label: 'Reminder', icon: 'alarm', color: '#8B5CF6' },
  { value: 'milestone', label: 'Milestone', icon: 'trophy', color: '#10B981' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
] as const;

export default function CalendarScreen() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: selectedDate,
    event_time: '',
    category: 'other' as Event['category'],
    is_all_day: true,
  });

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

    // Highlight selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = theme.colors.primary;
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: theme.colors.primary,
      };
    }

    setMarkedDates(marked);
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setNewEvent({ ...newEvent, event_date: day.dateString });
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      event_date: selectedDate,
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
        Alert.alert('Success', 'Event updated! 📅');
      } else {
        eventData.created_by = user.id;
        const { error } = await supabase.from('events').insert(eventData);

        if (error) throw error;
        Alert.alert('Success', 'Event created! 📅');
      }

      setModalVisible(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: selectedDate,
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
              Alert.alert('Success', 'Event deleted');
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

  const getEventsForSelectedDate = () => {
    return events.filter((event) => event.event_date === selectedDate);
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const category = CATEGORIES.find((c) => c.value === item.category);
    const isMyEvent = item.created_by === user?.id;

    return (
      <TouchableOpacity
        style={[styles.eventCard, { borderLeftColor: category?.color || '#6B7280' }]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleRow}>
            <View style={[styles.categoryIcon, { backgroundColor: (category?.color || '#6B7280') + '20' }]}>
              <Ionicons
                name={category?.icon as any || 'calendar'}
                size={18}
                color={category?.color || '#6B7280'}
              />
            </View>
            <View style={styles.eventTextContainer}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {!item.is_all_day && item.event_time && (
                <Text style={styles.eventTime}>
                  {format(parseISO(`2000-01-01T${item.event_time}`), 'h:mm a')}
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
          <Text style={styles.partnerBadge}>Created by partner</Text>
        )}
      </TouchableOpacity>
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

  const selectedDateEvents = getEventsForSelectedDate();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Calendar
          current={selectedDate}
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

        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.sectionTitle}>
              {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </Text>
            <Text style={styles.eventCount}>
              {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : selectedDateEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>No events on this day</Text>
              <Text style={styles.emptyText}>Tap + to add an event</Text>
            </View>
          ) : (
            <FlatList
              data={selectedDateEvents}
              renderItem={renderEventItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.eventsList}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Event Modal */}
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
                {editingEvent ? 'Edit Event' : 'New Event'}
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
                        <Ionicons
                          name={cat.icon as any}
                          size={20}
                          color={cat.color}
                        />
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
                  {format(parseISO(newEvent.event_date), 'EEEE, MMMM d, yyyy')}
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
                  <Text style={styles.label}>Time</Text>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 0,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventsSection: {
    padding: 20,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventCount: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTextContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    marginLeft: 48,
    lineHeight: 20,
  },
  partnerBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 8,
    marginLeft: 48,
    fontStyle: 'italic',
  },
  deleteIconButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: '600',
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
  categoryButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});