import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: {
    userId?: string;
    screen?: string;
    action?: string;
    deviceInfo?: DeviceInfo;
    timestamp: Date;
    appVersion?: string;
    sessionId: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  customData?: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  osVersion?: string;
  appVersion?: string;
  deviceModel?: string;
  networkType?: 'wifi' | 'cellular' | 'none';
}

class ErrorReportingService {
  private sessionId: string;
  private pendingReports: ErrorReport[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandler();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandler() {
    // Global error handler for uncaught exceptions
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.reportError(error, {
        severity: isFatal ? 'critical' : 'high',
        screen: 'unknown',
        action: 'global_error',
        tags: ['uncaught', isFatal ? 'fatal' : 'non-fatal']
      });

      // Call the original handler
      originalHandler(error, isFatal);
    });

    // Promise rejection handler
    const handleUnhandledRejection = (event: any) => {
      this.reportError(new Error(event.reason || 'Unhandled Promise Rejection'), {
        severity: 'medium',
        screen: 'unknown',
        action: 'unhandled_rejection',
        tags: ['promise_rejection']
      });
    };

    // Note: In React Native, we can't directly listen to unhandledrejection
    // This would need to be implemented at the app level
  }

  async reportError(error: Error, context: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    screen?: string;
    action?: string;
    tags?: string[];
    customData?: Record<string, any>;
  } = {}) {
    try {
      const report: ErrorReport = {
        id: this.generateReportId(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
        context: {
          userId: context.userId,
          screen: context.screen,
          action: context.action,
          deviceInfo: await this.getDeviceInfo(),
          timestamp: new Date(),
          sessionId: this.sessionId,
        },
        severity: context.severity || 'medium',
        tags: context.tags,
        customData: context.customData,
      };

      // Store locally first
      this.pendingReports.push(report);
      this.savePendingReports();

      // Try to send immediately if online
      if (this.isOnline) {
        await this.sendPendingReports();
      }

      console.error('Error reported:', {
        id: report.id,
        message: error.message,
        severity: report.severity,
        screen: context.screen,
        action: context.action,
      });

    } catch (reportError) {
      console.error('Failed to report error:', reportError);
      // Fallback - at least log to console
      console.error('Original error that failed to report:', error);
    }
  }

  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: 'react-native',
      // These would be populated with actual device info in a real implementation
      osVersion: 'unknown',
      deviceModel: 'unknown',
      networkType: this.isOnline ? 'wifi' : 'none',
    };
  }

  private savePendingReports() {
    try {
      // In a real implementation, this would use AsyncStorage
      // For now, just keep in memory
      console.log(`Storing ${this.pendingReports.length} pending error reports`);
    } catch (error) {
      console.error('Failed to save pending reports:', error);
    }
  }

  private async sendPendingReports() {
    if (this.pendingReports.length === 0) return;

    try {
      // Send to Cloud Function for processing
      const reportError = httpsCallable(functions, 'reportError');

      for (const report of this.pendingReports) {
        try {
          await reportError({
            report: {
              ...report,
              context: {
                ...report.context,
                timestamp: report.context.timestamp.toISOString(),
              }
            }
          });

          // Remove successfully sent report
          this.pendingReports = this.pendingReports.filter(r => r.id !== report.id);
        } catch (sendError) {
          console.error(`Failed to send error report ${report.id}:`, sendError);
          // Keep the report for retry
        }
      }

      this.savePendingReports();

    } catch (error) {
      console.error('Failed to send error reports:', error);
    }
  }

  // Method to manually flush pending reports
  async flush() {
    await this.sendPendingReports();
  }

  // Method to clear all pending reports (useful for testing)
  clearPendingReports() {
    this.pendingReports = [];
    this.savePendingReports();
  }

  // Method to set online/offline status
  setOnlineStatus(isOnline: boolean) {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    // If we just came back online, try to send pending reports
    if (wasOffline && isOnline) {
      this.sendPendingReports();
    }
  }

  // Convenience methods for different error types
  reportImportError(error: Error, url?: string, userId?: string) {
    this.reportError(error, {
      severity: 'medium',
      screen: 'ImportRecipe',
      action: 'import_recipe',
      userId,
      tags: ['recipe_import'],
      customData: { url }
    });
  }

  reportConversionError(error: Error, recipeId?: string, kidId?: string, userId?: string) {
    this.reportError(error, {
      severity: 'high',
      screen: 'RecipeConversion',
      action: 'convert_recipe',
      userId,
      tags: ['recipe_conversion'],
      customData: { recipeId, kidId }
    });
  }

  reportAuthError(error: Error, action: string, userId?: string) {
    this.reportError(error, {
      severity: 'high',
      screen: 'Auth',
      action,
      userId,
      tags: ['authentication']
    });
  }

  reportNetworkError(error: Error, endpoint?: string, userId?: string) {
    this.reportError(error, {
      severity: 'low',
      action: 'network_request',
      userId,
      tags: ['network'],
      customData: { endpoint }
    });
  }
}

// Global instance
export const errorReportingService = new ErrorReportingService();

// Helper function for easy error reporting
export const reportError = (error: Error, context?: {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  screen?: string;
  action?: string;
  tags?: string[];
  customData?: Record<string, any>;
}) => {
  errorReportingService.reportError(error, context);
};

// Type guard for checking if error has specific properties
export const isFirebaseError = (error: any): error is { code: string; message: string } => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

// Helper for extracting user-friendly error messages
export const getErrorMessage = (error: any): string => {
  if (isFirebaseError(error)) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'functions/unauthenticated':
        return 'Please log in to continue';
      case 'functions/permission-denied':
        return 'You do not have permission to perform this action';
      case 'functions/resource-exhausted':
        return 'You have exceeded your usage limit. Please try again later';
      default:
        return error.message || 'An error occurred';
    }
  }

  return error?.message || 'An unexpected error occurred';
};