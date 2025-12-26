import React, { createContext, useContext, useState, useRef } from 'react';
import { recipeImportService, ImportStatus, ImportError, ImportResult } from '../services/recipeImport';
import { recipeService } from '../services/recipes';
import { useAuth } from './AuthContext';
import { importProgressService } from '../services/importProgressService';
import type { Recipe } from '../types';

interface ImportJob {
  id: string;
  url: string;
  status: ImportStatus;
  progress?: string;
  error?: ImportError;
  result?: Recipe;
  startedAt: Date;
}

interface ImportContextType {
  activeImports: ImportJob[];
  importRecipe: (url: string) => Promise<string>; // Returns job ID
  getImportStatus: (jobId: string) => ImportJob | null;
  clearCompletedImports: () => void;
  onImportComplete?: (recipe: Recipe) => void;
  onImportError?: (error: ImportError, url: string) => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export const useImport = () => {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
};

export const ImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeImports, setActiveImports] = useState<ImportJob[]>([]);
  const jobIdCounter = useRef(0);

  const generateJobId = () => {
    jobIdCounter.current += 1;
    return `import_${Date.now()}_${jobIdCounter.current}`;
  };

  const updateImportJob = (jobId: string, updates: Partial<ImportJob>) => {
    setActiveImports(prev =>
      prev.map(job =>
        job.id === jobId
          ? { ...job, ...updates }
          : job
      )
    );
  };

  const getImportStatus = (jobId: string): ImportJob | null => {
    return activeImports.find(job => job.id === jobId) || null;
  };

  const clearCompletedImports = () => {
    setActiveImports(prev =>
      prev.filter(job =>
        job.status !== ImportStatus.COMPLETE &&
        job.status !== ImportStatus.ERROR
      )
    );
  };

  const importRecipe = async (url: string): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const jobId = generateJobId();

    // Create initial import job
    const newJob: ImportJob = {
      id: jobId,
      url,
      status: ImportStatus.VALIDATING,
      progress: 'Starting import...',
      startedAt: new Date(),
    };

    setActiveImports(prev => [...prev, newJob]);

    // Start the import process
    try {
      // Simple progress tracking
      updateImportJob(jobId, {
        status: ImportStatus.FETCHING,
        progress: 'Importing recipe...'
      });
      importProgressService.emitProgress(jobId, url, ImportStatus.FETCHING, 'Importing recipe...');

      try {
        const result = await recipeImportService.importFromUrl(url, {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            updateImportJob(jobId, {
              progress: `Retrying... (attempt ${attempt})`,
              error: {
                code: 'RETRY',
                message: error.message,
                canRetry: true
              }
            });
          }
        });

        if (result.success && result.recipe) {
          // Save the recipe to the user's collection
          try {
            const recipeWithUserId = { ...result.recipe, userId: user.uid };
            const recipeId = await recipeService.addRecipe(user.uid, recipeWithUserId);
            const savedRecipe = { ...recipeWithUserId, id: recipeId, createdAt: new Date(), updatedAt: new Date() };

            updateImportJob(jobId, {
              status: ImportStatus.COMPLETE,
              progress: 'Recipe saved successfully!',
              result: savedRecipe
            });

            // Emit completion event
            importProgressService.emitComplete(jobId, url, savedRecipe);

            return jobId;
          } catch (saveError) {
            console.error('Error saving recipe:', saveError);
            const error: ImportError = {
              code: 'SAVE_FAILED',
              message: 'Recipe imported but failed to save',
              suggestion: 'Please try importing again',
              canRetry: true
            };

            updateImportJob(jobId, {
              status: ImportStatus.ERROR,
              progress: 'Failed to save recipe',
              error
            });

            // Emit error event
            importProgressService.emitError(jobId, url, error);

            return jobId;
          }
        } else {
          // Import failed
          const error = result.error || {
            code: 'UNKNOWN_ERROR',
            message: 'Import failed for unknown reason',
            canRetry: true
          };

          updateImportJob(jobId, {
            status: ImportStatus.ERROR,
            progress: 'Import failed',
            error
          });

          // Emit error event
          importProgressService.emitError(jobId, url, error);

          return jobId;
        }
      } catch (error: any) {
        console.error('Import error:', error);

        const importError: ImportError = {
          code: 'IMPORT_FAILED',
          message: error?.message || 'Import failed',
          canRetry: true
        };

        updateImportJob(jobId, {
          status: ImportStatus.ERROR,
          progress: 'Import failed',
          error: importError
        });

        // Emit error event
        importProgressService.emitError(jobId, url, importError);

        return jobId;
      }
    } catch (error: any) {
      console.error('Import setup error:', error);

      const importError: ImportError = {
        code: 'IMPORT_FAILED',
        message: error?.message || 'Failed to start import',
        canRetry: true
      };

      updateImportJob(jobId, {
        status: ImportStatus.ERROR,
        progress: 'Import failed',
        error: importError
      });

      // Emit error event
      importProgressService.emitError(jobId, url, importError);

      return jobId;
    }
  };

  const value: ImportContextType = {
    activeImports,
    importRecipe,
    getImportStatus,
    clearCompletedImports,
    onImportComplete: undefined, // Will be set by components that need it
    onImportError: undefined,    // Will be set by components that need it
  };

  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
};

export { ImportContext };