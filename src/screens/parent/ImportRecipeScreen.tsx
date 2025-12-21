import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recipeImportService } from '../../services/recipeImport';
import { recipeService } from '../../services/recipes';
import { AuthContext } from '../../contexts/AuthContext';

export default function ImportRecipeScreen() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a recipe URL');
      return;
    }

    if (!recipeImportService.validateUrl(url)) {
      Alert.alert('Error', 'Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to import recipes');
      return;
    }

    setLoading(true);
    try {
      console.log('Importing recipe from URL...');
      const recipe = await recipeImportService.importFromUrl(url);

      console.log('Saving recipe to Firestore...');
      const recipeId = await recipeService.addRecipe(user.uid, recipe);

      console.log('Recipe saved with ID:', recipeId);
      Alert.alert(
        'Recipe Imported Successfully! 🎉',
        `"${recipe.title}" has been added to your recipe collection and is now available in your recipes.`,
        [{ text: 'OK', style: 'default' }]
      );
      setUrl('');
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Recipe</Text>
          <Text style={styles.subtitle}>
            Paste a recipe URL from any website to automatically import it
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Recipe URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/recipe"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!loading}
            autoFocus={true}
            clearButtonMode="while-editing"
          />

          <TouchableOpacity
            style={[styles.button, (!url.trim() || loading) && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={!url.trim() || loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>Importing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Import Recipe</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Supported websites:</Text>
          <Text style={styles.infoText}>
            Most recipe websites are supported. The app will automatically extract
            ingredients, instructions, and other recipe details.
          </Text>
        </View>
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
  },
  header: {
    marginBottom: 30,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});