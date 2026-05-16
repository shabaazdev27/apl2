import { Logging } from '@google-cloud/logging';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const logger = {
  info: async (message: string, metadata: any = {}) => {
    console.log(`[INFO] ${message}`, metadata);
    try {
      const logging = new Logging();
      const log = logging.log('cricket-mind-logs');
      const entry = log.entry({ severity: 'INFO' }, { message, ...metadata });
      await log.write(entry);
    } catch (e) { /* Fallback for local/mock */ }
  },
  error: async (message: string, error: any = {}) => {
    console.error(`[ERROR] ${message}`, error);
    try {
      const logging = new Logging();
      const log = logging.log('cricket-mind-logs');
      const entry = log.entry({ severity: 'ERROR' }, { message, error: error.message || error });
      await log.write(entry);
    } catch (e) { /* Fallback for local/mock */ }
  }
};

export async function getSecret(secretName: string) {
  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
    });
    return version.payload?.data?.toString();
  } catch (error) {
    console.warn(`Secret ${secretName} not found in Secret Manager, using process.env`);
    return process.env[secretName];
  }
}
