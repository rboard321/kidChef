import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { recipeService } from '../../services/recipes';
import { AuthContext } from '../../contexts/AuthContext';
import type { Recipe } from '../../types';

export default function ParentHomeScreen() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, [user]);

  // Refresh recipes when screen comes into focus (e.g., after importing a recipe)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        loadRecipes();
      }
    }, [user?.uid])
  );

  const loadRecipes = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const userRecipes = await recipeService.getUserRecipes(user.uid);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate('RecipeDetail' as never, { recipeId: recipe.id } as never);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity style={styles.recipeCard} onPress={() => handleRecipePress(item)}>
      <Text style={styles.recipeEmoji}>{item.image || '🍽️'}</Text>
      <Text style={styles.recipeTitle}>{item.title}</Text>
      <Text style={styles.recipeAction}>Tap to view</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Recipes</Text>
        <Text style={styles.subtitle}>Your family recipe collection</Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.emptyTitle}>Loading your recipes...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📱</Text>
          <Text style={styles.emptyTitle}>No recipes yet!</Text>
          <Text style={styles.emptyText}>
            Tap the Import tab to add your first recipe from any website
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  list: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-around',
  },
  recipeCard: {
    backgroundColor: 'white',
    width: '45%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  recipeAction: {
    fontSize: 12,
    color: '#2563eb',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});