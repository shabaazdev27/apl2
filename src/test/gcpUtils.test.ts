import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock
const mocks = vi.hoisted(() => {
  const logWrite = vi.fn().mockResolvedValue({});
  const logEntry = vi.fn().mockReturnValue({});
  const logMethod = vi.fn().mockReturnValue({
    entry: logEntry,
    write: logWrite,
  });
  
  const accessSecretVersion = vi.fn().mockImplementation(async ({ name }) => {
    if (name.includes('FAIL_SECRET')) {
      throw new Error('Secret not found');
    }
    return [{
      payload: { data: Buffer.from('mock-secret-value') }
    }];
  });

  return {
    logMethod,
    logWrite,
    accessSecretVersion,
  };
});

// Mock the libraries using function syntax for constructors
vi.mock('@google-cloud/logging', () => {
  return {
    Logging: vi.fn(function(this: any) {
      this.log = mocks.logMethod;
    })
  };
});

vi.mock('@google-cloud/secret-manager', () => {
  return {
    SecretManagerServiceClient: vi.fn(function(this: any) {
      this.accessSecretVersion = mocks.accessSecretVersion;
    })
  };
});

// Import the utilities AFTER mocking
import { logger, getSecret } from '../gcpUtils';

describe('gcpUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    delete process.env.FAIL_SECRET;
    
    mocks.logWrite.mockResolvedValue({});
    mocks.logMethod.mockClear();
    mocks.accessSecretVersion.mockClear();
  });

  it('logger.info calls console.log and attempts GCP write', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await logger.info('test info', { key: 'val' });
    
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] test info', { key: 'val' });
    expect(mocks.logMethod).toHaveBeenCalledWith('cricket-mind-logs');
    expect(mocks.logWrite).toHaveBeenCalled();
  });

  it('logger.error calls console.error and attempts GCP write', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await logger.error('test error', { code: 500 });
    
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR] test error', { code: 500 });
    expect(mocks.logMethod).toHaveBeenCalledWith('cricket-mind-logs');
    expect(mocks.logWrite).toHaveBeenCalled();
  });

  it('getSecret returns secret from manager when available', async () => {
    const secret = await getSecret('TEST_SECRET');
    expect(secret).toBe('mock-secret-value');
    expect(mocks.accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/test-project/secrets/TEST_SECRET/versions/latest',
    });
  });

  it('getSecret falls back to process.env on error', async () => {
    process.env.FAIL_SECRET = 'env-fallback-value';
    const secret = await getSecret('FAIL_SECRET');
    
    expect(secret).toBe('env-fallback-value');
    expect(mocks.accessSecretVersion).toHaveBeenCalled();
  });
});
