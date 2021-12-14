import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Button,
  View,
} from 'react-native';

// import { Call, ConferenceLiveArray, LoginScreen, VertoClient, VertoParams, VertoView, ViewType } from 'react-native-verto-typescript';

import { Call, ConferenceLiveArray, LoginScreen, VertoClient, VertoInstanceManager, VertoParams, VertoView, ViewType } from 'react-native-verto-typescript';

const App = () => {

  const [vertoClient, setVertoClient] = useState(null);

  const [mediaActionsVisible, setMediaActionsVisible] = useState(false);

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
    // videoParams: {},
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
  }, [])

  const callbacks = {
    onPrivateEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('[example] onPrivateEvent');
    },
    onEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('[example] onEvent');
    },
    onCallStateChange: (state: any) => {
      console.log('[example] onCallStateChange state.current.name:', state.current.name);
    },
    onInfo: (params: any) => {
      console.log('[example] onInfo');
    },
    onClientReady: (params: any) => {
      console.log('[example] onClientReady');
      setLoggedIn(true);
      setTimeout(() => {
        setCallState('call');
      }, 200);
    },
    onDisplay: (params: any) => {
      console.log('[example] onDisplay params:', params);
    },
    onNewCall: (call: Call) => {
      console.log('[example] onNewCall=>', call);
      // setTimeout(() => {
      //   call.answer()
      // }, 2000);
    }
  };

  const checkLoginParams = async () => {
    const loginValue = await AsyncStorage.getItem('login');
    if(loginValue != null) {
      const loginParams = JSON.parse(loginValue);

      setVertoAuthParams(loginParams);
      
      if(loginParams.password) {
        setLoggedIn(true);

        const tmpVertoClient = VertoInstanceManager.createInstance(
          {
            ...vertoParams,
            webSocket: loginParams
          }, 
          callbacks,
          true
        )
    
        setVertoClient(tmpVertoClient);
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

    const authParams = { login, password, url };
    setVertoAuthParams(authParams);
    
    const tmpVertoClient = VertoInstanceManager.createInstance(
      {
        ...vertoParams,
        webSocket: authParams
      }, 
      callbacks,
      true
    )

    setVertoClient(tmpVertoClient);

    // setLoggedIn(true);

    AsyncStorage.setItem(
      'login', 
      JSON.stringify(authParams)
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
          isCallScreenVisible={true}
          isRemoteAudioOff={false}
          isToolboxVisible={true}
          onLogoutClicked={onLogoutClicked}
          showLogs={true}
          viewKey="view1"
          viewType={ViewType.both} 
        />
      }
      {
        mediaActionsVisible &&
        <View style={{maxHeight: 60, flex: 1, flexDirection: 'row'}}>
          <Button title={'Audio'} onPress={() => setAudioState(!audioState)} />
          <Button title={'Video'} onPress={() => setCameraState(!cameraState)} />
        </View>
      }
    </View>
  );
};

export default App;