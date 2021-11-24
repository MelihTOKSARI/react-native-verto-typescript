import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface AuthPrams {
  url: string,
  login: string,
  password: string
}

interface Props {
  authParams: AuthPrams,
  onLoginHandler: Function
}

const LoginScreen = (props: Props) => {

  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if(props.authParams) {
      setUrl(props.authParams.url)
      setEmail(props.authParams.login);
    }
  }, [props.authParams]);

  const loginHandler = () => {
    props.onLoginHandler(email, password, url);
  }

  return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.inputView}>
          <TextInput
            style={styles.textInput}
            placeholder="url"
            value={url}
            onChangeText={(url) => setUrl(url)}
          />
        </View>
        <View style={styles.inputView}>
          <TextInput
            style={styles.textInput}
            placeholder="Email"
            value={email}
            onChangeText={(email) => setEmail(email)}
          />
        </View>
        <View style={styles.inputView}>
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={(password) => setPassword(password)}
          />
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={loginHandler}>
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
  )
}

const styles = StyleSheet.create({
  highlight: {
    fontWeight: '700',
  },
  inputView: {
    backgroundColor: "white",
    borderRadius: 10,
    borderColor: 'black',
    borderWidth: 1,
    width: "70%",
    height: 45,
    marginBottom: 20
  },
  textInput: {
    color: 'black',
    height: 50,
    flex: 1,
    padding: 10,
    marginLeft: 20,
  },
  loginBtn: {
    width:"80%",
    borderRadius:25,
    height:50,
    alignItems:"center",
    justifyContent:"center",
    marginTop:40,
    backgroundColor:"#FF1493",
  },
  loginText: {
    color: 'black'
  }
});

export default LoginScreen;