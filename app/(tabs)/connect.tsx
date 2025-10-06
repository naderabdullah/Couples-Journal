// app/(tabs)/connect.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function ConnectScreen() {
  const { profile, user } = useAuth();
  const { theme } = useTheme();
  const [todayQuestion, setTodayQuestion] = useState<Question | null>(null);
  const [myResponse, setMyResponse] = useState<QuestionResponse | null>(null);
  const [partnerResponse, setPartnerResponse] = useState<QuestionResponse | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [gratitudeText, setGratitudeText] = useState('');
  const [recentGratitudes, setRecentGratitudes] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingGratitude, setSubmittingGratitude] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      if (!user || !profile?.couple_id || !profile?.partner_id) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
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

      const { data: gratitudes } = await supabase
        .from('gratitude_entries')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (gratitudes) {
        setRecentGratitudes(gratitudes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

      Alert.alert('Success', 'Your gratitude has been shared! 💕');
      setGratitudeText('');
      loadTodayData();
    } catch (error) {
      console.error('Error submitting gratitude:', error);
      Alert.alert('Error', 'Failed to share gratitude');
    } finally {
      setSubmittingGratitude(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Question of the Day Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="comment-question" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Question of the Day</Text>
          </View>

          {todayQuestion ? (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{todayQuestion.question}</Text>
              
              {!myResponse ? (
                <>
                  <TextInput
                    style={styles.answerInput}
                    placeholder="Share your thoughts..."
                    multiline
                    numberOfLines={3}
                    value={questionAnswer}
                    onChangeText={setQuestionAnswer}
                    placeholderTextColor={theme.colors.textLight}
                  />
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={submitQuestionResponse}
                    disabled={submittingQuestion || !questionAnswer.trim()}
                  >
                    {submittingQuestion ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit Answer</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.responsesContainer}>
                  <View style={styles.responseCard}>
                    <Text style={styles.responseLabel}>Your Answer</Text>
                    <Text style={styles.responseText}>{myResponse.response}</Text>
                  </View>
                  
                  {partnerResponse ? (
                    <View style={[styles.responseCard, styles.partnerResponseCard]}>
                      <Text style={styles.responseLabel}>Partner's Answer</Text>
                      <Text style={styles.responseText}>{partnerResponse.response}</Text>
                    </View>
                  ) : (
                    <View style={[styles.responseCard, styles.waitingCard]}>
                      <Ionicons name="time-outline" size={24} color={theme.colors.textLight} />
                      <Text style={styles.waitingText}>
                        Waiting for your partner's response...
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noQuestionCard}>
              <Text style={styles.noQuestionText}>
                No question available today. Check back tomorrow!
              </Text>
            </View>
          )}
        </View>

        {/* Gratitude Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Express Gratitude</Text>
          </View>

          <View style={styles.gratitudeCard}>
            <TextInput
              style={styles.gratitudeInput}
              placeholder="What do you appreciate about your partner today?"
              multiline
              numberOfLines={3}
              value={gratitudeText}
              onChangeText={setGratitudeText}
              placeholderTextColor={theme.colors.textLight}
            />
            <TouchableOpacity
              style={styles.gratitudeButton}
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
            <View style={styles.recentGratitudes}>
              <Text style={styles.recentTitle}>Recent Appreciations</Text>
              {recentGratitudes.map((gratitude) => (
                <View key={gratitude.id} style={styles.gratitudeItem}>
                  <Ionicons 
                    name={gratitude.from_user_id === user?.id ? "arrow-forward" : "arrow-back"} 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.gratitudeItemText}>
                    {gratitude.content}
                  </Text>
                </View>
              ))}
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
  headerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    fontSize: 24,
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
    paddingBottom: 10,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  responsesContainer: {
  },
  responseCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  partnerResponseCard: {
    backgroundColor: theme.colors.borderLight,
    borderColor: theme.colors.accent,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  responseText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
  },
  waitingText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginLeft: 12,
  },
  noQuestionCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noQuestionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  gratitudeCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gratitudeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  gratitudeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  gratitudeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentGratitudes: {
    marginTop: 20,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
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
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginLeft: 8,
  },
});