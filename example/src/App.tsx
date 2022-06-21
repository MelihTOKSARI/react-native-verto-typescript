import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Button,
  View,
} from 'react-native';

import { Call, ConferenceLiveArray, LoginScreen, VertoClient, VertoInstanceManager, VertoParams, VertoView, ViewType } from 'react-native-verto-ts';

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
    callerName: '1000',
    useVideo: false
  })
  const [callState, setCallState] = useState('');
  const [audioState, setAudioState] = useState(true);
  const [cameraState, setCameraState] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front');
  
  useEffect(() => {
    checkLoginParams();
  }, [])

  useEffect(() => {
    console.log('[App - useEffect[vertoParams]] vertoParams has changed!');
    if(vertoParams.webSocket && vertoParams.webSocket.url) {
      createVertoInstance();
    }
  }, [vertoParams])

  const callbacks = {
    onPrivateEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('[example] onPrivateEvent');
    },
    onEvent: (vertoClient: VertoClient, dataParams: VertoParams, userData: ConferenceLiveArray) => {
      console.log('[example] onEvent');
    },
    onCallStateChange: (state: any, callId: string) => {
      console.log('[example] onCallStateChange state.current.name:', state.current.name, ' - callId:', callId);
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
      
      if(vertoClient === null && loginParams.password) {
        setLoggedIn(true);
      }
    }
  }

  const setVertoAuthParams = (authParams: any) => {
    const newVertoParams = {
      ...vertoParams
    }
    newVertoParams.webSocket = authParams;
    
    setVertoParams(newVertoParams);
  }

  const createVertoInstance = () => {
    const tmpVertoClient = VertoInstanceManager.createInstance(
      vertoParams,
      callbacks,
      true,
      { isEnabled: true, autoAnswer: true, autoDisplay: true, autoHangup: true, selfManaged: false, onNewCallAceppted: onNewCallAccepted }
    )
    setVertoClient(tmpVertoClient);
  }

  /**
   * Handle accept call from CallKeep accept and answer freeswitch call
   * 
   * @param call Incoming freeswitch call
   */
  const onNewCallAccepted = (call: Call) => {
    console.log('[App-onNewCallAccepted] answer freeswitch call. call.getId():', call.getId());
    VertoInstanceManager.answerCall(call, { callerName: call.getCallerIdentification(), from: call.getCallerIdentification(), to: call.getCalleeIdentification(), useVideo: call.rtc.getHasVideo() });
  }

  const onLoginHandler = (login: string, password: string, url: string) => {
    if(!login ||!password) {
      // TODO Show login warning
      return;
    }

    const authParams = { login, password, url };
    setVertoAuthParams(authParams);

    AsyncStorage.setItem(
      'login', 
      JSON.stringify(authParams)
    );
  }

  const onCallRequested = (call: Call) => {
    if(call) {
      console.log('[App-onCallRequested] call.destinationNumber:', call.getDestinationNumber(), ' - call.calleeIdentification:', call.getCalleeIdentification(), ' - call.callerIdentification:', call.getCallerIdentification())
    }
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

  const onChangeSocketState = () => {
    if(vertoClient) {
      VertoInstanceManager.destroy();
      setVertoClient(null);
    } else {
      createVertoInstance();
    }
  }

  const onCallHangup = (call?: Call) => {
    console.log('[App-onCallHangup] call.id:', call.getId());
  }

  const onCameraSwitchHandler = () => {
    console.log('[App - onCameraSwitchHandler] cameraFacing:', cameraFacing);
    setCameraFacing((prevState: string): string => {
      return prevState === 'front' ? 'rear' : 'front';
    })
  }

  const onMicrophoneMuted = (muted: boolean) => {
    console.log('[App - onMicrophoneMuted] muted:', muted);
  }

  const onVideoMuted = (muted: boolean) => {
    console.log('[App - onVideoMuted] muted:', muted);
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
        <View style={{maxHeight: 40, marginTop: 20, flex: 1, flexDirection: 'row'}}>
          <Button title={vertoClient !== null ? 'Close Socket' : 'Connect'} onPress={onChangeSocketState} />
          {
            vertoClient && 
            <Button title={'Switch Camera'} onPress={onCameraSwitchHandler} />
          }
        </View>
      }
      {
        loggedIn && <VertoView 
          callState={callState}
          callParams={callParams} 
          cameraFacing={cameraFacing}
          isAudioOff={audioState}
          isCameraOff={cameraState}
          isCallScreenVisible={true}
          isRemoteAudioOff={false}
          isToolboxVisible={true}
          onCallHangup={onCallHangup}
          onCallRequested={onCallRequested}
          onLogoutClicked={onLogoutClicked}
          onMicrophoneMuted={onMicrophoneMuted}
          onVideoMuted={onVideoMuted}
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