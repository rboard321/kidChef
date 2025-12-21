import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecipeViewScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const recipe = {
    title: 'Easy Pancakes',
    emoji: '🥞',
    servings: 4,
    totalTime: '15 min',
    difficulty: 'easy',
    ingredients: [
      { id: '1', text: '1 cup flour', checked: false },
      { id: '2', text: '1 egg', checked: false },
      { id: '3', text: '1 cup milk', checked: false },
      { id: '4', text: '2 tbsp sugar', checked: false },
    ],
    steps: [
      'Mix all dry ingredients in a big bowl',
      'Crack the egg into another bowl',
      'Add milk to the egg and mix well',
      'Pour wet ingredients into dry ingredients',
      'Mix until smooth (ask for help if needed!)',
      'Heat pan on medium heat',
      'Pour batter and cook until bubbles form',
      'Flip carefully and cook other side',
    ]
  };

  const nextStep = () => {
    if (currentStep < recipe.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{recipe.emoji}</Text>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>{recipe.servings} servings</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>{recipe.totalTime}</Text>
            </View>
            <View style={[styles.infoBadge, styles.difficultyBadge]}>
              <Text style={styles.infoText}>{recipe.difficulty}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You Need 📝</Text>
          {recipe.ingredients.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientItem}>
              <Text style={styles.ingredientText}>{ingredient.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Let's Cook! 👨‍🍳</Text>
          <View style={styles.stepContainer}>
            <Text style={styles.stepCounter}>
              Step {currentStep + 1} of {recipe.steps.length}
            </Text>
            <View style={styles.stepCard}>
              <Text style={styles.stepText}>{recipe.steps[currentStep]}</Text>
            </View>
          </View>

          <View style={styles.stepNavigation}>
            <TouchableOpacity
              style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
              onPress={prevStep}
              disabled={currentStep === 0}
            >
              <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton,
                currentStep === recipe.steps.length - 1 && styles.completeButton
              ]}
              onPress={nextStep}
              disabled={currentStep === recipe.steps.length - 1}
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                {currentStep === recipe.steps.length - 1 ? '✓ Done!' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            🔔 Need help? Call your grown-up anytime!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyBadge: {
    backgroundColor: '#dcfce7',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 15,
  },
  ingredientItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 16,
    color: '#1f2937',
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: '#dbeafe',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  stepText: {
    fontSize: 18,
    color: '#1e40af',
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  navButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  nextButton: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  completeButton: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  navButtonTextDisabled: {
    color: '#cbd5e1',
  },
  nextButtonText: {
    color: '#1e40af',
  },
  helpSection: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  helpText: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
});