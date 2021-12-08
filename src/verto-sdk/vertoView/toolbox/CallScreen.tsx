import React, { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

interface Props {
  callHandler?: (callee: string) => void,
}

const CallScreen = (props: Props) => {
  
  const [callNumber, setCallNumber] = useState(''); 

  return (
    <View style={styles.container}>
      <TextInput 
        onChangeText={number => setCallNumber(number)} 
        placeholder="Type number to call"
        style={styles.callInput} 
        defaultValue={callNumber} 
      />
      <View style={styles.callButton}>
        <Button 
          onPress={() => props.callHandler(callNumber)}
          title="Call" 
        />
      </View>
    </View>
  )
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
    paddingHorizontal: 10
  },
  callButton: {
    flex: 2
  },
  callInput: {
    flex: 6,
    borderColor: 'black',
    borderWidth: 1,
    height: 32
  }
})
  
  export default CallScreen;