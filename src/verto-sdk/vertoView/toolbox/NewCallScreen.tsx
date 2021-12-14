import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

interface Props {
    callFrom: string,
    onAnswerAccepted: () => void,
    onAnswerRejected: () => void
  }

const NewCallScreen = (props: Props) => {
    return (
        <View style={styles.container}>
            <Text style={styles.callText}>`New Incoming Call: ${props.callFrom}`</Text>
            <View style={styles.callButton}>
                <Button title='Answer' onPress={props.onAnswerAccepted} />
                <Button title='Reject' onPress={props.onAnswerRejected} />
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
    callText: {
      flex: 5,
      borderColor: 'black',
      borderWidth: 1,
      height: 32
    }
  })

export default NewCallScreen;