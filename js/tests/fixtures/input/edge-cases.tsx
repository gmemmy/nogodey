import React from 'react'
import { Text, View } from 'react-native'

export default function EdgeCasesComponent() {
  return (
    <View>
      {/* Empty text should be ignored */}
      <Text></Text>
      
      {/* Whitespace-only text should be ignored */}
      <Text>   </Text>
      
      {/* Text with special characters */}
      <Text>Hello "World" & <View>!</View></Text>
      
      {/* Nested Text elements */}
      <Text>
        Outer text
        <Text>Inner text</Text>
        More outer text
      </Text>
      
      {/* Non-Text elements should be ignored */}
      <View>Not a Text element</View>
      
      {/* Text with expressions (should not be transformed) */}
      <Text>{`Dynamic text: ${Date.now()}`}</Text>
      
      {/* Mixed content */}
      <Text>
        Static text {Date.now()} more static
      </Text>
    </View>
  )
} 