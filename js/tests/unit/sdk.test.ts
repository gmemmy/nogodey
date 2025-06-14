import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.stubEnv('OPENAI_API_KEY', 'test-api-key')

vi.mock('react-native', () => ({
  NativeModules: {},
  Platform: {OS: 'ios'},
}))

vi.mock('../../src/cloud', () => ({
  callCloudTranslate: vi.fn(),
}))

vi.mock('../../src/logger', () => ({
  error: vi.fn(),
}))

type MockNativeModules = {
  NogoLLM?:
    | {
        translate: ReturnType<typeof vi.fn>
      }
    | undefined
}

type MockPlatform = {
  OS: string
}

describe('SDK Native Module Integration', () => {
  let mockNativeModules: MockNativeModules
  let mockPlatform: MockPlatform
  let mockCallCloudTranslate: ReturnType<typeof vi.fn>
  let mockError: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const {NativeModules, Platform} = await import('react-native')
    const {callCloudTranslate} = await import('../../src/cloud')
    const {error} = await import('../../src/logger')

    mockNativeModules = NativeModules as MockNativeModules
    mockPlatform = Platform as MockPlatform
    mockCallCloudTranslate = callCloudTranslate as ReturnType<typeof vi.fn>
    mockError = error as ReturnType<typeof vi.fn>
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('translateDynamic', () => {
    it('should use native module on iOS when available', async () => {
      mockPlatform.OS = 'ios'
      mockNativeModules.NogoLLM = {
        translate: vi.fn().mockResolvedValue('ON_DEVICE'),
      }

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('ON_DEVICE')
      expect(mockNativeModules.NogoLLM.translate).toHaveBeenCalledWith('foo')
      expect(mockCallCloudTranslate).not.toHaveBeenCalled()
    })

    it('should fallback to cloud when native module throws error on iOS', async () => {
      mockPlatform.OS = 'ios'
      const nativeError = new Error('Native module failed')
      mockNativeModules.NogoLLM = {
        translate: vi.fn().mockRejectedValue(nativeError),
      }
      mockCallCloudTranslate.mockResolvedValue('CLOUD')

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('CLOUD')
      expect(mockNativeModules.NogoLLM.translate).toHaveBeenCalledWith('foo')
      expect(mockCallCloudTranslate).toHaveBeenCalledWith('foo')
      expect(mockError).toHaveBeenCalledWith(
        {err: nativeError, text: 'foo'},
        'On-device LLM failed, falling back to cloud'
      )
    })

    it('should fallback to cloud when native module is undefined on iOS', async () => {
      mockPlatform.OS = 'ios'
      mockNativeModules.NogoLLM = undefined
      mockCallCloudTranslate.mockResolvedValue('CLOUD')

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('CLOUD')
      expect(mockCallCloudTranslate).toHaveBeenCalledWith('foo')
      expect(mockError).not.toHaveBeenCalled()
    })

    it('should use cloud translation on Android platform', async () => {
      mockPlatform.OS = 'android'
      mockNativeModules.NogoLLM = undefined
      mockCallCloudTranslate.mockResolvedValue('CLOUD')

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('CLOUD')
      expect(mockCallCloudTranslate).toHaveBeenCalledWith('foo')
      expect(mockError).not.toHaveBeenCalled()
    })

    it('should use cloud translation on web platform', async () => {
      mockPlatform.OS = 'web'
      mockNativeModules.NogoLLM = {
        translate: vi.fn().mockResolvedValue('ON_DEVICE'),
      }
      mockCallCloudTranslate.mockResolvedValue('CLOUD')

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('CLOUD')
      expect(mockCallCloudTranslate).toHaveBeenCalledWith('foo')
      expect(mockNativeModules.NogoLLM?.translate).not.toHaveBeenCalled()
      expect(mockError).not.toHaveBeenCalled()
    })

    it('should handle non-Error objects in catch block', async () => {
      mockPlatform.OS = 'ios'
      mockNativeModules.NogoLLM = {
        translate: vi.fn().mockRejectedValue('String error'),
      }
      mockCallCloudTranslate.mockResolvedValue('CLOUD')

      const {translateDynamic} = await import('../../src/sdk')

      const result = await translateDynamic('foo')

      expect(result).toBe('CLOUD')
      expect(mockError).toHaveBeenCalledWith(
        {err: 'String error', text: 'foo'},
        'On-device LLM failed, falling back to cloud'
      )
    })
  })

  describe('callCloudTranslate', () => {
    it('should be a function', async () => {
      const {callCloudTranslate} = await import('../../src/cloud')

      expect(typeof callCloudTranslate).toBe('function')
    })
  })
})
