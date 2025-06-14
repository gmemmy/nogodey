import OpenAI from 'openai'
import {error} from './logger'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY')
}

const client = new OpenAI({apiKey})

/**
 * Sends `text` to the OpenAI LLM (gpt-3.5-turbo or whatever model is configured) and returns the translation.
 */
export async function callCloudTranslate(text: string): Promise<string> {
  try {
    const resp = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {role: 'system', content: 'Translate the following to the target locale:'},
        {role: 'user', content: text},
      ],
    })
    return resp.choices[0]?.message?.content?.trim() ?? text
  } catch (err) {
    error({err, text}, 'callCloudTranslate error')
    throw err
  }
}
