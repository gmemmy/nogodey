import {NativeModules, Platform} from 'react-native'
import {callCloudTranslate} from './cloud'
import {error} from './logger'

export async function translateDynamic(text: string): Promise<string> {
  if (Platform.OS === 'ios' && NativeModules.NogoLLM) {
    try {
      return await NativeModules.NogoLLM.translate(text)
    } catch (err) {
      error({err, text}, 'On-device LLM failed, falling back to cloud')
    }
  }
  // Fallback to cloud path
  return callCloudTranslate(text)
}
