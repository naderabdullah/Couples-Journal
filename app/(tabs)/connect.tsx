// app/(tabs)/connect.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ===== TYPE DEFINITIONS =====
interface Question {
  id: string;
  question: string;
  category: string;
}

interface QuestionResponse {
  id: string;
  user_id: string;
  question_id: string;
  response: string;
  created_at: string;
}

interface GratitudeEntry {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
}

interface Game {
  id: string;
  title: string;
  description: string;
  type: 'trivia' | 'this-or-that' | 'would-you-rather' | 'rating';
  category: string;
}

interface GameResponse {
  id: string;
  user_id: string;
  game_id: string;
  response: any;
  created_at: string;
}

interface Reminder {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  created_by: string;
  created_at: string;
}

type ActivityCategory = 'questions' | 'games' | 'gratitude' | 'reminders';

export default function ConnectScreen() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // ===== STATE =====
  // Active category selection
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('questions');

  // Questions state
  const [todayQuestion, setTodayQuestion] = useState<Question | null>(null);
  const [myResponse, setMyResponse] = useState<QuestionResponse | null>(null);
  const [partnerResponse, setPartnerResponse] = useState<QuestionResponse | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState('');

  // Games state
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [myGameResponse, setMyGameResponse] = useState<GameResponse | null>(null);
  const [partnerGameResponse, setPartnerGameResponse] = useState<GameResponse | null>(null);
  const [gameAnswer, setGameAnswer] = useState<any>(null);

  // Gratitude state
  const [gratitudeText, setGratitudeText] = useState('');
  const [recentGratitudes, setRecentGratitudes] = useState<GratitudeEntry[]>([]);

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDescription, setNewReminderDescription] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingGame, setSubmittingGame] = useState(false);
  const [submittingGratitude, setSubmittingGratitude] = useState(false);
  const [submittingReminder, setSubmittingReminder] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, [activeCategory]);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      if (!user || !profile?.couple_id || !profile?.partner_id) return;

      const today = format(new Date(), 'yyyy-MM-dd');

      // Load based on active category
      if (activeCategory === 'questions') {
        await loadQuestions(today);
      } else if (activeCategory === 'games') {
        await loadGames(today);
      } else if (activeCategory === 'gratitude') {
        await loadGratitudes();
      } else if (activeCategory === 'reminders') {
        await loadReminders();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (today: string) => {
    if (!user || !profile?.couple_id) return;

    let { data: dailyQuestion } = await supabase
      .from('daily_questions')
      .select('*')
      .eq('date', today)
      .single();

    if (!dailyQuestion) {
      const { data: randomQuestion } = await supabase
        .from('questions')
        .select('*')
        .limit(1)
        .single();

      if (randomQuestion) {
        setTodayQuestion(randomQuestion);
      }
    } else {
      setTodayQuestion(dailyQuestion);
    }

    if (dailyQuestion || todayQuestion) {
      const questionId = dailyQuestion?.id || todayQuestion?.id;

      const { data: responses } = await supabase
        .from('question_responses')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .eq('question_id', questionId)
        .gte('created_at', startOfDay(new Date()).toISOString());

      if (responses) {
        const mine = responses.find(r => r.user_id === user.id);
        const partners = responses.find(r => r.user_id === profile.partner_id);

        setMyResponse(mine || null);
        setPartnerResponse(partners || null);

        if (mine) {
          setQuestionAnswer(mine.response);
        }
      }
    }
  };

  const loadGames = async (today: string) => {
    if (!user || !profile?.couple_id) return;

    // Load today's game or a random game
    let { data: dailyGame } = await supabase
      .from('daily_games')
      .select('*')
      .eq('date', today)
      .single();

    if (!dailyGame) {
      const { data: randomGame } = await supabase
        .from('games')
        .select('*')
        .limit(1)
        .single();

      if (randomGame) {
        setCurrentGame(randomGame);
      }
    } else {
      setCurrentGame(dailyGame);
    }

    if (dailyGame || currentGame) {
      const gameId = dailyGame?.id || currentGame?.id;

      const { data: responses } = await supabase
        .from('game_responses')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .eq('game_id', gameId)
        .gte('created_at', startOfDay(new Date()).toISOString());

      if (responses) {
        const mine = responses.find(r => r.user_id === user.id);
        const partners = responses.find(r => r.user_id === profile.partner_id);

        setMyGameResponse(mine || null);
        setPartnerGameResponse(partners || null);

        if (mine) {
          setGameAnswer(mine.response);
        }
      }
    }
  };

  const loadGratitudes = async () => {
    if (!profile?.couple_id) return;

    const { data: gratitudes } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (gratitudes) {
      setRecentGratitudes(gratitudes);
    }
  };

  const loadReminders = async () => {
    if (!profile?.couple_id) return;

    const { data: reminderData } = await supabase
      .from('couple_reminders')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false });

    if (reminderData) {
      setReminders(reminderData);
    }
  };

  const submitQuestionResponse = async () => {
    try {
      if (!user || !profile?.couple_id || !todayQuestion || !questionAnswer.trim()) return;
      
      setSubmittingQuestion(true);

      const { data, error } = await supabase
        .from('question_responses')
        .insert({
          user_id: user.id,
          couple_id: profile.couple_id,
          question_id: todayQuestion.id,
          response: questionAnswer.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setMyResponse(data);
      Alert.alert('Success', 'Your answer has been submitted!');
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit your answer');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const submitGameResponse = async () => {
    try {
      if (!user || !profile?.couple_id || !currentGame || !gameAnswer) return;

      setSubmittingGame(true);

      const { data, error } = await supabase
        .from('game_responses')
        .insert({
          user_id: user.id,
          couple_id: profile.couple_id,
          game_id: currentGame.id,
          response: gameAnswer,
        })
        .select()
        .single();

      if (error) throw error;

      setMyGameResponse(data);
      Alert.alert('Success', 'Your response has been submitted!');
    } catch (error) {
      console.error('Error submitting game response:', error);
      Alert.alert('Error', 'Failed to submit your response');
    } finally {
      setSubmittingGame(false);
    }
  };

  const submitGratitude = async () => {
    try {
      if (!user || !profile?.couple_id || !profile?.partner_id || !gratitudeText.trim()) {
        Alert.alert('Error', 'Please write something you appreciate about your partner');
        return;
      }

      setSubmittingGratitude(true);

      const { error } = await supabase.from('gratitude_entries').insert({
        from_user_id: user.id,
        to_user_id: profile.partner_id,
        couple_id: profile.couple_id,
        content: gratitudeText.trim(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Your gratitude has been shared!');
      setGratitudeText('');
      loadGratitudes();
    } catch (error) {
      console.error('Error submitting gratitude:', error);
      Alert.alert('Error', 'Failed to share gratitude');
    } finally {
      setSubmittingGratitude(false);
    }
  };

  const createReminder = async () => {
    try {
      if (!user || !profile?.couple_id || !newReminderTitle.trim()) {
        Alert.alert('Error', 'Please enter a title for your reminder');
        return;
      }

      setSubmittingReminder(true);

      const { error } = await supabase.from('couple_reminders').insert({
        couple_id: profile.couple_id,
        created_by: user.id,
        title: newReminderTitle.trim(),
        description: newReminderDescription.trim(),
        frequency: 'daily',
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'Reminder created!');
      setNewReminderTitle('');
      setNewReminderDescription('');
      loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create reminder');
    } finally {
      setSubmittingReminder(false);
    }
  };

  const toggleReminder = async (reminderId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('couple_reminders')
        .update({ is_active: !currentState })
        .eq('id', reminderId);

      if (error) throw error;

      loadReminders();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  const categories = [
    { id: 'questions' as ActivityCategory, icon: 'comment-question', label: 'Questions' },
    { id: 'games' as ActivityCategory, icon: 'gamepad-variant', label: 'Games' },
    { id: 'gratitude' as ActivityCategory, icon: 'heart', label: 'Gratitude' },
    { id: 'reminders' as ActivityCategory, icon: 'bell', label: 'Reminders' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Connect</Text>
            </View>

            <View style={styles.headerRight} />
          </View>

          <Text style={styles.headerSubtitle}>Strengthen your bond daily</Text>
        </View>

        {/* Category Navigation */}
        <View style={styles.categoryNav}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={24}
                color={activeCategory === category.id ? '#fff' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === category.id && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Sections - Rendered based on active category */}
        <View style={styles.contentContainer}>
          {/* QUESTIONS SECTION */}
          {activeCategory === 'questions' && (
            <View style={styles.section}>
              {todayQuestion ? (
                <View style={styles.interactiveCard}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="comment-question" size={28} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Question of the Day</Text>
                  </View>

                  <Text style={styles.questionText}>{todayQuestion.question}</Text>

                  {!myResponse ? (
                    <>
                      <TextInput
                        style={styles.answerInput}
                        placeholder="Share your thoughts..."
                        multiline
                        numberOfLines={4}
                        value={questionAnswer}
                        onChangeText={setQuestionAnswer}
                        placeholderTextColor={theme.colors.textLight}
                      />
                      <TouchableOpacity
                        style={[styles.submitButton, (!questionAnswer.trim() || submittingQuestion) && styles.submitButtonDisabled]}
                        onPress={submitQuestionResponse}
                        disabled={submittingQuestion || !questionAnswer.trim()}
                      >
                        {submittingQuestion ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="send" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Answer</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.responsesContainer}>
                      <View style={styles.responseCard}>
                        <View style={styles.responseHeader}>
                          <Ionicons name="person" size={16} color={theme.colors.primary} />
                          <Text style={styles.responseLabel}>Your Answer</Text>
                        </View>
                        <Text style={styles.responseText}>{myResponse.response}</Text>
                      </View>

                      {partnerResponse ? (
                        <View style={[styles.responseCard, styles.partnerResponseCard]}>
                          <View style={styles.responseHeader}>
                            <Ionicons name="heart" size={16} color={theme.colors.accent} />
                            <Text style={styles.responseLabel}>Partner's Answer</Text>
                          </View>
                          <Text style={styles.responseText}>{partnerResponse.response}</Text>
                        </View>
                      ) : (
                        <View style={[styles.responseCard, styles.waitingCard]}>
                          <Ionicons name="time-outline" size={32} color={theme.colors.textLight} />
                          <Text style={styles.waitingText}>Waiting for your partner's response...</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="comment-question-outline" size={64} color={theme.colors.textLight} />
                  <Text style={styles.emptyStateText}>No question available today</Text>
                  <Text style={styles.emptyStateSubtext}>Check back tomorrow!</Text>
                </View>
              )}
            </View>
          )}

          {/* GAMES SECTION */}
          {activeCategory === 'games' && (
            <View style={styles.section}>
              {currentGame ? (
                <View style={styles.interactiveCard}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="gamepad-variant" size={28} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>{currentGame.title}</Text>
                  </View>

                  <Text style={styles.gameDescription}>{currentGame.description}</Text>

                  {!myGameResponse ? (
                    <>
                      <TextInput
                        style={styles.answerInput}
                        placeholder="Your answer..."
                        multiline
                        numberOfLines={3}
                        value={gameAnswer}
                        onChangeText={setGameAnswer}
                        placeholderTextColor={theme.colors.textLight}
                      />
                      <TouchableOpacity
                        style={[styles.submitButton, (!gameAnswer || submittingGame) && styles.submitButtonDisabled]}
                        onPress={submitGameResponse}
                        disabled={submittingGame || !gameAnswer}
                      >
                        {submittingGame ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Response</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.responsesContainer}>
                      <View style={styles.responseCard}>
                        <View style={styles.responseHeader}>
                          <Ionicons name="person" size={16} color={theme.colors.primary} />
                          <Text style={styles.responseLabel}>Your Response</Text>
                        </View>
                        <Text style={styles.responseText}>{myGameResponse.response}</Text>
                      </View>

                      {partnerGameResponse ? (
                        <View style={[styles.responseCard, styles.partnerResponseCard]}>
                          <View style={styles.responseHeader}>
                            <Ionicons name="heart" size={16} color={theme.colors.accent} />
                            <Text style={styles.responseLabel}>Partner's Response</Text>
                          </View>
                          <Text style={styles.responseText}>{partnerGameResponse.response}</Text>
                        </View>
                      ) : (
                        <View style={[styles.responseCard, styles.waitingCard]}>
                          <Ionicons name="time-outline" size={32} color={theme.colors.textLight} />
                          <Text style={styles.waitingText}>Waiting for your partner...</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="gamepad-variant-outline" size={64} color={theme.colors.textLight} />
                  <Text style={styles.emptyStateText}>No game available today</Text>
                  <Text style={styles.emptyStateSubtext}>Check back soon!</Text>
                </View>
              )}
            </View>
          )}

          {/* GRATITUDE SECTION */}
          {activeCategory === 'gratitude' && (
            <View style={styles.section}>
              <View style={styles.interactiveCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="heart" size={28} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Express Gratitude</Text>
                </View>

                <Text style={styles.gratitudePrompt}>
                  What do you appreciate about your partner today?
                </Text>

                <TextInput
                  style={styles.gratitudeInput}
                  placeholder="Share what's in your heart..."
                  multiline
                  numberOfLines={4}
                  value={gratitudeText}
                  onChangeText={setGratitudeText}
                  placeholderTextColor={theme.colors.textLight}
                />

                <TouchableOpacity
                  style={[styles.gratitudeButton, (!gratitudeText.trim() || submittingGratitude) && styles.submitButtonDisabled]}
                  onPress={submitGratitude}
                  disabled={submittingGratitude || !gratitudeText.trim()}
                >
                  {submittingGratitude ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.gratitudeButtonText}>Send Love</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Recent Gratitudes */}
              {recentGratitudes.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recent Appreciations</Text>
                  {recentGratitudes.map((gratitude) => (
                    <View key={gratitude.id} style={styles.gratitudeHistoryItem}>
                      <View style={styles.gratitudeItemHeader}>
                        <Ionicons
                          name={gratitude.from_user_id === user?.id ? "arrow-forward-circle" : "arrow-back-circle"}
                          size={20}
                          color={gratitude.from_user_id === user?.id ? theme.colors.primary : theme.colors.accent}
                        />
                        <Text style={styles.gratitudeItemLabel}>
                          {gratitude.from_user_id === user?.id ? "You shared" : "Your partner shared"}
                        </Text>
                      </View>
                      <Text style={styles.gratitudeItemText}>{gratitude.content}</Text>
                      <Text style={styles.gratitudeItemDate}>
                        {format(new Date(gratitude.created_at), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* REMINDERS SECTION */}
          {activeCategory === 'reminders' && (
            <View style={styles.section}>
              <View style={styles.interactiveCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
                  <Text style={styles.cardTitle}>Create Reminder</Text>
                </View>

                <TextInput
                  style={styles.reminderInput}
                  placeholder="Reminder title..."
                  value={newReminderTitle}
                  onChangeText={setNewReminderTitle}
                  placeholderTextColor={theme.colors.textLight}
                />

                <TextInput
                  style={styles.answerInput}
                  placeholder="Description (optional)..."
                  multiline
                  numberOfLines={3}
                  value={newReminderDescription}
                  onChangeText={setNewReminderDescription}
                  placeholderTextColor={theme.colors.textLight}
                />

                <TouchableOpacity
                  style={[styles.submitButton, (!newReminderTitle.trim() || submittingReminder) && styles.submitButtonDisabled]}
                  onPress={createReminder}
                  disabled={submittingReminder || !newReminderTitle.trim()}
                >
                  {submittingReminder ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Create Reminder</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Reminders List */}
              {reminders.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Your Reminders</Text>
                  {reminders.map((reminder) => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <View style={styles.reminderContent}>
                        <View style={styles.reminderHeader}>
                          <Ionicons
                            name={reminder.is_active ? "notifications" : "notifications-off"}
                            size={20}
                            color={reminder.is_active ? theme.colors.primary : theme.colors.textLight}
                          />
                          <Text style={styles.reminderTitle}>{reminder.title}</Text>
                        </View>
                        {reminder.description && (
                          <Text style={styles.reminderDescription}>{reminder.description}</Text>
                        )}
                        <Text style={styles.reminderFrequency}>
                          {reminder.frequency.charAt(0).toUpperCase() + reminder.frequency.slice(1)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reminderToggle}
                        onPress={() => toggleReminder(reminder.id, reminder.is_active)}
                      >
                        <Ionicons
                          name={reminder.is_active ? "toggle" : "toggle-outline"}
                          size={32}
                          color={reminder.is_active ? theme.colors.primary : theme.colors.textLight}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header styles
  headerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerRight: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },

  // Category Navigation
  categoryNav: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: theme.colors.background,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryLabelActive: {
    color: '#fff',
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  section: {
    padding: 20,
  },

  // Interactive Cards
  interactiveCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },

  // Question styles
  questionText: {
    fontSize: 17,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 20,
    lineHeight: 26,
  },

  // Game styles
  gameDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },

  // Input styles
  answerInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    marginBottom: 12,
  },
  reminderInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    marginBottom: 12,
  },

  // Submit Button
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Response Cards
  responsesContainer: {
    marginTop: 8,
  },
  responseCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  partnerResponseCard: {
    backgroundColor: theme.colors.borderLight,
    borderColor: theme.colors.accent,
    borderWidth: 1.5,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  responseText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },

  // Waiting Card
  waitingCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 30,
    gap: 12,
  },
  waitingText: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 18,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },

  // Gratitude Specific
  gratitudePrompt: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  gratitudeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    marginBottom: 12,
  },
  gratitudeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gratitudeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Recent Section
  recentSection: {
    marginTop: 24,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Gratitude History Item
  gratitudeHistoryItem: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gratitudeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  gratitudeItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gratitudeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gratitudeItemText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  gratitudeItemDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 6,
  },

  // Reminder Styles
  reminderItem: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  reminderDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reminderFrequency: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderToggle: {
    padding: 4,
  },
});