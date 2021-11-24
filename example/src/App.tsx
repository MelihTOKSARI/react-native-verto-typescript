import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Button,
  View,
} from 'react-native';

// import { Call, ConferenceLiveArray, LoginScreen, VertoClient, VertoParams, VertoView, ViewType } from 'react-native-verto-typescript';

import { Call, ConferenceLiveArray, LoginScreen, VertoClient, VertoParams, VertoView, ViewType } from 'react-native-verto-typescript';

const App = () => {

  const [loggedIn, setLoggedIn] = useState(false);
  const [vertoParams, setVertoParams] = useState({
    webSocket: {
      url: '',
      login: '',
      password: ''
    },
    deviceParams: {
      useMic: 'any',
      useCamera: 'any',
      useSpeaker: 'any '
    },
    videoParams: { minWidth: 320, maxWidth: 640, minHeight: 180, maxHeight: 480 },
    remoteVideo: 'remote-video',
    localVideo: 'local-video',
    iceServers: true
  });
  const [callParams, setCallParams] = useState({
    to: 'CH1SN0S1',
    from: '1000',
    callerName: 'Hi'
  })
  const [callState, setCallState] = useState('');
  const [audioState, setAudioState] = useState(true);
  const [cameraState, setCameraState] = useState(true);
  
  useEffect(() => {
    checkLoginParams();
    setTimeout(() => {
       setCallState('call');
    }, 200);
    // setTimeout(() => {
    //   setCameraState(false);
    // }, 10000);
    // setTimeout(() => {
    //   setAudioState(false);
    // }, 20000);
    // setTimeout(() => {
    //   setCameraState(true);
    // }, 30000);
    // setTimeout(() => {
    //   setAudioState(true);
    // }, 40000);
  }, [])

  const callbacks = {
    onPrivateEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('onPrivateEvent');
    },
    onEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('onEvent');
    },
    onCallStateChange: (state: any) => {
      console.log('onCallStateChange state.current.name:', state.current.name);
      if(state.current.name == 'active') {
        console.log('onCallStateChange 1');
      } else {
        console.log('onCallStateChange 2');
      }
    },
    onInfo: (params: any) => {
      console.log('onInfo');
    },
    onClientReady: (params: any) => {
      console.log('onClientReady');
    },
    onDisplay: (params: any) => {
      console.log('onDisplay params:', params);
    },
    onNewCall: (call: Call) => {
      console.log('onNewCall=>', call);
      setTimeout(() => {
        call.answer()
      }, 2000);
    }
  };

  const checkLoginParams = async () => {
    const loginValue = await AsyncStorage.getItem('login');
    if(loginValue != null) {
      const loginParams = JSON.parse(loginValue);

      setVertoAuthParams(loginParams);
      
      if(loginParams.password) {
        setLoggedIn(true);
      }
    }
  }

  const setVertoAuthParams = (authParams: any) => {
    const newVertoParams = {
      ...vertoParams,
      webSocket: authParams
    }

    setVertoParams(newVertoParams);
  }

  const onLoginHandler = (login: string, password: string, url: string) => {
    if(!login ||!password) {
      // TODO Show login warning
      return;
    }

    setVertoAuthParams({ login, password, url });

    setLoggedIn(true);

    AsyncStorage.setItem(
      'login', 
      JSON.stringify({ login, password, url })
    );
  }

  const onLogoutClicked = async () => {
    const loginValue = await AsyncStorage.getItem('login');
    if(!loginValue) {
      return;
    }
    
    const authItem = JSON.parse(loginValue.toString());
    authItem.password = '';

    await AsyncStorage.setItem('login', JSON.stringify(authItem));

    setLoggedIn(false);
  }

  return (
    <View
      style={{
        flex: 1, justifyContent: 'center'
      }}>
      {
        !loggedIn && <LoginScreen authParams={vertoParams.webSocket} onLoginHandler={onLoginHandler} />
      }
      {
        loggedIn && <VertoView 
          callState={callState}
          callParams={callParams} 
          isAudioOff={audioState}
          isCameraOff={cameraState}
          isToolboxVisible={false}
          viewType={ViewType.remote} 
          vertoParams={vertoParams} 
          callbacks={callbacks}
          onLogoutClicked={onLogoutClicked}
        />
      }
      {
        <View style={{maxHeight: 60, flex: 1, flexDirection: 'row'}}>
          <Button title={'Audio'} onPress={() => setAudioState(!audioState)} />
          <Button title={'Video'} onPress={() => setCameraState(!cameraState)} />
        </View>
      }
    </View>
  );
};

export default App;