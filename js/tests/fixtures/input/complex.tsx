import React from 'react'
import { Text, TextInput, View, Button } from 'react-native'

export default function ComplexComponent() {
  return (
    <View>
      <Text>Welcome to the app</Text>
      <Text>Multiple text nodes</Text>
      <TextInput 
        placeholder="Enter your email"
        value="Email Input"
      />
      <Button 
        title="Submit"
        onPress={() => {}}
      />
      <Text>Footer text</Text>
    </View>
  )
} 