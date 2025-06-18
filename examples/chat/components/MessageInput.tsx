import * as React from 'react'
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native'

type Props = {
  onSendMessage: (text: string) => void
  placeholder?: string
}

export const MessageInput = ({onSendMessage, placeholder = 'Type a message...'}: Props) => {
  const [message, setMessage] = React.useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            message.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
          onPress={handleSend}
          disabled={!message.trim()}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.sendButtonText,
              message.trim() ? styles.sendButtonTextActive : styles.sendButtonTextInactive,
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 12,
    lineHeight: 20,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonActive: {
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sendButtonTextActive: {
    color: '#ffffff',
  },
  sendButtonTextInactive: {
    color: '#9ca3af',
  },
})
