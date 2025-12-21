import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import type { UserSettings } from '../../types';

interface ParentSettingsScreenProps {
  onComplete: () => void;
}

interface RouteParams {
  kidData?: {
    name: string;
    age: number;
    readingLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

export default function ParentSettingsScreen({ onComplete }: ParentSettingsScreenProps) {
  const route = useRoute();
  const { kidData } = (route.params as RouteParams) || {};
  const { user, updateProfile } = useAuth();

  const [parentName, setParentName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [safetyNotes, setSafetyNotes] = useState(true);
  const [readAloud, setReadAloud] = useState(false);
  const [autoSimplify, setAutoSimplify] = useState(true);
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [enableVoiceInstructions, setEnableVoiceInstructions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!parentName.trim() || !familyName.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setLoading(true);

    try {
      const userSettings: UserSettings = {
        safetyNotes,
        readAloud,
        autoSimplify,
        fontSize: 'medium',
        temperatureUnit: 'fahrenheit',
        language: 'en',
        showDifficulty,
        enableVoiceInstructions,
        theme: 'light',
      };

      // Create user profile for backward compatibility
      const userProfile = {
        parentName: parentName.trim(),
        kidName: kidData?.name || 'My Kid',
        kidAge: kidData?.age || 8,
        readingLevel: kidData?.readingLevel || 'beginner',
        settings: userSettings,
        email: user.email || '',
      };

      await updateProfile(userProfile);

      // The AuthContext will automatically handle creating parent/kid profiles through migration
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Parent Settings</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself and customize how recipes are presented to {kidData?.name || 'your child'}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={parentName}
            onChangeText={setParentName}
            placeholder="Enter your name"
            placeholderTextColor="#9ca3af"
            returnKeyType="next"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Family Name</Text>
          <TextInput
            style={styles.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="e.g., The Smith Family"
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <View style={styles.settingsContainer}>
          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Safety Notes</Text>
              <Text style={styles.settingDescription}>
                Highlight when adult help is needed
              </Text>
            </View>
            <Switch
              value={safetyNotes}
              onValueChange={setSafetyNotes}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={safetyNotes ? '#2563eb' : '#f3f4f6'}
            />
          </View>

          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Read-Aloud Mode</Text>
              <Text style={styles.settingDescription}>
                Kids can hear instructions spoken out loud
              </Text>
            </View>
            <Switch
              value={readAloud}
              onValueChange={setReadAloud}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={readAloud ? '#2563eb' : '#f3f4f6'}
            />
          </View>

          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Simplify Recipes Automatically</Text>
              <Text style={styles.settingDescription}>
                Auto-convert all recipes to kid-friendly versions
              </Text>
            </View>
            <Switch
              value={autoSimplify}
              onValueChange={setAutoSimplify}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={autoSimplify ? '#2563eb' : '#f3f4f6'}
            />
          </View>

          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Difficulty Levels</Text>
              <Text style={styles.settingDescription}>
                Display recipe difficulty ratings
              </Text>
            </View>
            <Switch
              value={showDifficulty}
              onValueChange={setShowDifficulty}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={showDifficulty ? '#2563eb' : '#f3f4f6'}
            />
          </View>

          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Voice Instructions</Text>
              <Text style={styles.settingDescription}>
                Enable voice guidance for cooking steps
              </Text>
            </View>
            <Switch
              value={enableVoiceInstructions}
              onValueChange={setEnableVoiceInstructions}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={enableVoiceInstructions ? '#2563eb' : '#f3f4f6'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!parentName.trim() || !familyName.trim() || loading) && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!parentName.trim() || !familyName.trim() || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Setting up...' : 'Start Cooking! 🎉'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});