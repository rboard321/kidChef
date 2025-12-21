import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Auth screens
import AuthScreen from '../screens/auth/AuthScreen';

// Onboarding screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import KidLevelScreen from '../screens/onboarding/KidLevelScreen';
import ParentSettingsScreen from '../screens/onboarding/ParentSettingsScreen';

// Parent screens
import ParentHomeScreen from '../screens/parent/HomeScreen';
import ImportRecipeScreen from '../screens/parent/ImportRecipeScreen';
import RecipeDetailScreen from '../screens/parent/RecipeDetailScreen';

// Kid screens
import KidHomeScreen from '../screens/kid/KidHomeScreen';
import RecipeViewScreen from '../screens/kid/RecipeViewScreen';

// Shared screens
import SettingsScreen from '../screens/shared/SettingsScreen';

import type { RootStackParamList, ParentTabParamList, KidTabParamList } from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ParentTab = createBottomTabNavigator<ParentTabParamList>();
const KidTab = createBottomTabNavigator<KidTabParamList>();

// Parent Tab Navigator
function ParentTabNavigator() {
  return (
    <ParentTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Import') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <ParentTab.Screen
        name="Home"
        component={ParentHomeScreen}
        options={{ title: 'My Recipes' }}
      />
      <ParentTab.Screen
        name="Import"
        component={ImportRecipeScreen}
        options={{ title: 'Import Recipe' }}
      />
      <ParentTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ParentTab.Navigator>
  );
}

// Kid Tab Navigator
function KidTabNavigator() {
  return (
    <KidTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Recipes') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Cooking') {
            iconName = focused ? 'flame' : 'flame-outline';
          } else if (route.name === 'Parent') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { height: 80, paddingBottom: 10, paddingTop: 5 },
      })}
    >
      <KidTab.Screen
        name="Recipes"
        component={KidHomeScreen}
        options={{ title: 'My Recipes' }}
      />
      <KidTab.Screen
        name="Cooking"
        component={RecipeViewScreen}
        options={{ title: 'Let\'s Cook!' }}
      />
      <KidTab.Screen
        name="Parent"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </KidTab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading, userProfile } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState(false);

  // Determine current mode based on user profile
  const currentMode = userProfile?.settings?.defaultMode || 'parent'; // 'parent' | 'kid'

  // Function to complete onboarding
  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  // Check if user has completed onboarding
  React.useEffect(() => {
    if (userProfile) {
      setHasCompletedOnboarding(true);
    }
  }, [userProfile]);

  // Show loading screen while checking auth
  if (loading) {
    return null; // You could show a loading screen here
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not authenticated - show auth screens
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : !hasCompletedOnboarding ? (
          // Authenticated but no profile - show onboarding
          <>
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
            <RootStack.Screen name="KidLevel" component={KidLevelScreen} />
            <RootStack.Screen
              name="ParentSettings"
              children={() => <ParentSettingsScreen onComplete={completeOnboarding} />}
            />
          </>
        ) : (
          // Authenticated and onboarded - show main app
          <>
            <RootStack.Screen
              name="Main"
              component={currentMode === 'parent' ? ParentTabNavigator : KidTabNavigator}
            />
            <RootStack.Screen
              name="RecipeDetail"
              component={RecipeDetailScreen}
              options={{
                headerShown: true,
                title: 'Recipe Details'
              }}
            />
            <RootStack.Screen
              name="RecipeView"
              component={RecipeViewScreen}
              options={{
                headerShown: true,
                title: 'Let\'s Cook!'
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}