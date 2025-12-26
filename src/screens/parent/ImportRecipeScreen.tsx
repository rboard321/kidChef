import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { ImportError } from '../../services/recipeImport';
import { useAuth } from '../../contexts/AuthContext';
import { useImport } from '../../contexts/ImportContext';
import { Toast } from '../../components/Toast';

type ImportRecipeParams = {
  importUrl?: string;
};

export default function ImportRecipeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ImportRecipeParams;
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type?: 'success' | 'error' }>({ visible: false, message: '' });
  const { user } = useAuth();
  const { importRecipe, getImportStatus } = useImport();

  // Handle deep link URL import
  useEffect(() => {
    if (params?.importUrl) {
      setUrl(params.importUrl);
      // Auto-start import if URL was provided via deep link
      Alert.alert(
        'Import Recipe from Share',
        `Import recipe from: ${params.importUrl}?`,
        [
          {
            text: 'Import',
            onPress: () => handleImportWithUrl(params.importUrl!)
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [params?.importUrl]);



  const handleImportWithUrl = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setImportError({
        code: 'EMPTY_URL',
        message: 'Invalid recipe URL',
        canRetry: false
      });
      return;
    }

    if (!user?.uid) {
      setImportError({
        code: 'UNAUTHENTICATED',
        message: 'You must be logged in to import recipes',
        canRetry: false
      });
      return;
    }

    setLoading(true);
    setImportError(null);

    try {
      await importRecipe(targetUrl);

      // Show success message and navigate
      setToast({
        visible: true,
        message: '📥 Recipe import started! We\'ll add it to your collection shortly.',
        type: 'success'
      });

      // Navigate to home after showing success message
      setTimeout(() => {
        navigation.navigate('Home' as never);
      }, 2000);

    } catch (error: any) {
      console.error('Failed to start import:', error);
      setImportError({
        code: 'IMPORT_FAILED',
        message: error?.message || 'Failed to start import',
        canRetry: true
      });
      setLoading(false);
    }
  };

  const handleImport = async () => {
    await handleImportWithUrl(url);
  };


  const handleRetry = () => {
    setImportError(null);
    if (url.trim()) {
      handleImportWithUrl(url);
    }
  };


  const handleManualEdit = () => {
    (navigation as any).navigate('ManualRecipeEntry');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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



          {/* Error Display */}
          {importError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>{importError.message}</Text>
              {importError.suggestion && (
                <Text style={styles.errorSuggestion}>{importError.suggestion}</Text>
              )}

              <View style={styles.errorActions}>
                {importError.canRetry && (
                  <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryButtonText}>🔄 Try Again</Text>
                  </TouchableOpacity>
                )}

                {importError.allowManualEdit && (
                  <TouchableOpacity style={styles.manualButton} onPress={handleManualEdit}>
                    <Text style={styles.manualButtonText}>✏️ Enter Manually</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Supported websites:</Text>
          <Text style={styles.infoText}>
            Most recipe websites are supported. The app will automatically extract
            ingredients, instructions, and other recipe details.
          </Text>
        </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
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
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorSuggestion: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  manualButton: {
    flex: 1,
    backgroundColor: 'white',
    borderColor: '#dc2626',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
});