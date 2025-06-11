import React from 'react'
import { Text, TextInput, View } from 'react-native'

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text>Hello World</Text>
      <Text>Welcome to nogodey</Text>
      <TextInput
        placeholder="Enter your name"
        style={{
          marginTop: 16,
          width: '100%',
          height: 40,
          borderColor: '#ccc',
          borderWidth: 1,
          borderRadius: 4,
          paddingHorizontal: 8,
        }}
      />
    </View>
  )
}