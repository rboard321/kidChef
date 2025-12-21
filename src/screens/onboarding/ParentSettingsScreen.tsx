import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ParentSettingsScreenProps {
  onComplete: () => void;
}

export default function ParentSettingsScreen({ onComplete }: ParentSettingsScreenProps) {
  const [safetyNotes, setSafetyNotes] = useState(true);
  const [readAloud, setReadAloud] = useState(true);
  const [autoSimplify, setAutoSimplify] = useState(false);

  const handleComplete = () => {
    // TODO: Save settings and complete onboarding
    console.log('Onboarding complete!');
    // Call the onComplete function to update navigation state
    onComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Parent Settings</Text>
        <Text style={styles.subtitle}>
          Customize how recipes are presented to your child
        </Text>

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
        </View>

        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>Start Cooking! 🎉</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  settingsContainer: {
    marginBottom: 50,
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
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});