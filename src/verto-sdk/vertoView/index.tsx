import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import VertinhoClient from '../verto/VertoClient';
import { defaultVertoCallbacks } from '../store';
import styles from './styles';
import VertoParams from '../models/VertoParams';
import Call from '../verto/Call';
import ViewType from '../enums/ViewType.enum';
import ViewContainer from './ViewContainer';
import MakeCallParams from '../models/Call/MakeCallParams';
import { ToolboxImage } from '../enums/ToolboxImage.enum';
import VertoInstanceManager from './VertoInstanceManager';

let vertoClient: VertinhoClient;

interface Props {
  vertoParams: VertoParams,
  callbacks: defaultVertoCallbacks,
  onLogoutClicked: Function,
  viewType: ViewType,
  indicatorColor?: string,
  callState?: string,
  callParams?: MakeCallParams,
  onAudioStateChanged?: Function,
  onVideoStateChanged?: Function,
  isAudioOff: boolean,
  isCameraOff: boolean,
  cameraFacing?: string,
  isToolboxVisible?: boolean
}

const VertoView = (props: Props) => {
  const [localStreamURL, setLocalStreamURL] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [call, setCall] = useState(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState('');

  const [isStreamStarted, setStreamStarted] = useState(false);

  const [text, onChangeText] = useState('1001');

  const [audioFileIndex, setAudioFileIndex] = useState(ToolboxImage.Audio);
  const [videoFileIndex, setVideoFileIndex] = useState(ToolboxImage.Video);

  useEffect(() => {
    setDefaultStates();

    // vertoClient = new VertinhoClient(props.vertoParams, {
    //   ...props.callbacks,
    //   onCallStateChange,
    //   onInfo,
    //   onNewCall,
    //   onPlayLocalVideo,
    //   onPlayRemoteVideo,
    //   onStreamReady
    // });

    // return () => vertoClient.destroy();
  }, []);

  useEffect(() => {
    // console.log('useEffect handleCallState');
    handleCallState();
  }, [props.callState])

  useEffect(() => {
    // console.log('useEffect handleAudioState');
    handleAudioState();
  }, [props.isAudioOff]);

  useEffect(() => {
    // console.log('useEffect handleVideoState');
    handleVideoState();
  }, [props.isCameraOff]);

  const getVertoClient = () => {
    if(!vertoClient) {
      vertoClient = VertoInstanceManager.getInstance('key', {
        onCallStateChange,
        onNewCall,
        onPlayLocalVideo,
        onPlayRemoteVideo
      });
    }

    return vertoClient;
  }

  //#region Call Listener Methods

  const onCallStateChange = (state: any) => {
    // console.log('[vertoView] onCallStateChange => ', state);
    if (state && state.current && (state.current.name === "hangup" || state.current.name === "destroy")) {
      setLocalStreamURL(null);
      setRemoteStreamURL(null);
      setStreamStarted(false);
    }

    if(state && state.current && (state.current.name === "active")) {
      setStreamStarted(true);
      muteAudio(props.isAudioOff);
      muteVideo(props.isCameraOff);
    }

    if(props.callbacks.onCallStateChange) {
      props.callbacks.onCallStateChange(state);
    }
  }

  const onNewCall = (call: Call) => {
    // console.log('[vertoView] onNewCall:', call);
    setCall(call);
    
    if(props.callbacks.onNewCall) {
      props.callbacks.onNewCall(call);
    }
  }

  const onPlayLocalVideo = (stream: MediaStream) => {
    // console.log('[vertoView] onPlayLocalVideo stream.toURL:', stream);
    setLocalStream(stream);
    setLocalStreamURL(stream.toURL());

    const audioTrack = getAudioTrack(stream);
    if(audioTrack) {
      audioTrack.enabled = !props.isAudioOff;
    }

    const videoTrack = getVideoTrack(stream);
    if(videoTrack) {
      videoTrack.enabled = !props.isCameraOff;
    }

    if(props.callbacks.onPlayLocalVideo) {
      props.callbacks.onPlayLocalVideo(stream);
    }
  }

  const onPlayRemoteVideo = (stream: MediaStream) => {
    // console.log('[vertoView] onPlayRemoteVideo stream.toURL:', stream.toURL());
    setRemoteStreamURL(stream.toURL());

    if(props.callbacks.onPlayRemoteVideo) {
      props.callbacks.onPlayRemoteVideo(stream);
    }
  }

  //#endregion

  //#region State Methods

  const handleCallState = () => {
    // console.log('handleCallState callState:', props.callState);
    switch(props.callState) {
      case 'call':
        makeCall(props.callParams);
        break;
      case 'hangup':
        hangUpCall();
        break;
    }
  }

  const handleAudioState = () => {
    // console.log('handleAudioState props.isAudioOff:', props.isAudioOff);
    muteAudio(props.isAudioOff);
  }

  const handleVideoState = () => {
    // console.log('handleVideoState props.isCameraOff:', props.isCameraOff);
    muteVideo(props.isCameraOff);
  }

  const setDefaultStates = () => {
    if(!props.isToolboxVisible) {
      props.isToolboxVisible = true;
    }

    if(!props.isAudioOff) {
      props.isAudioOff = true;
    }

    if(!props.isCameraOff) {
      props.isCameraOff = true;
    }
  }

  const makeCall = (callParams: MakeCallParams) => {
    // TODO Check is there any active call
    const call = getVertoClient().makeVideoCall(callParams);
    setCall(call);
  }

  const hangUpCall = () => {
    if(call && call.params && call.params.callID) {
      // vertoClient.hangup(call.params.callID);
      getVertoClient().hangup(call.params.callID);
    }
  }

  const muteAudio = (mute: boolean) => {
    const localAudioTrack = getAudioTrack(localStream);
    if(localAudioTrack) {
      localAudioTrack.enabled = !mute;
      if(props.onAudioStateChanged) {
        props.onAudioStateChanged({ mute });
      }
    }
  }

  const getAudioTrack = (stream: MediaStream): MediaStreamTrack => {
    return stream && stream.getAudioTracks() != null && stream.getAudioTracks()[0];
  }

  const getVideoTrack = (stream: MediaStream): MediaStreamTrack => {
    return stream && stream.getVideoTracks() != null && stream.getVideoTracks()[0];
  }

  const muteVideo = (mute: boolean) => {
    const localVideoTrack = getVideoTrack(localStream);
    if(localVideoTrack) {
      localVideoTrack.enabled = !mute;
      if(props.onVideoStateChanged) {
        props.onVideoStateChanged({ mute });
      }
    }
  }

  const switchCamera = () => {
    const localVideoTrack = localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      getVertoClient().switchCamera(call.params.callID, localVideoTrack);
      // vertoClient.switchCamera(call.params.callID, localVideoTrack);
    }
  }

  //#region UI Listener Methods

  const callHandler = () => {
    const callee = text || '1001';
    const callParams = {
      to: callee,
      from: '1000',
      callerName: 'Hi',
    };

    // const call = vertoClient.makeVideoCall(callParams);
    const call = getVertoClient().makeVideoCall(callParams);
    setCall(call);
  }

  const hangUpHandler = () => {
    // vertoClient.hangup(call.params.callID);
    getVertoClient().hangup(call.params.callID);
  }

  const logoutHandler = () => {
    props.onLogoutClicked();
  }

  const cameraSwitchHandler = () => {
    const localVideoTrack = localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      getVertoClient().switchCamera(call.params.callID, localVideoTrack);
      // vertoClient.switchCamera(call.params.callID, localVideoTrack);
    }
  }

  const audioSwitchHandler = () => {
    const localAudioTrack = localStream && localStream._tracks && localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'audio');
    localAudioTrack.enabled = !localAudioTrack.enabled;

    if(localAudioTrack.enabled) {
      setAudioFileIndex(ToolboxImage.Audio);
    } else {
      setAudioFileIndex(ToolboxImage.NoAudio);
    }
  }

  const videoSwitchHandler = () => {
    const localVideoTrack = localStream && localStream._tracks && localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'video');
    localVideoTrack.enabled = !localVideoTrack.enabled;

    if(localVideoTrack.enabled) {
      setVideoFileIndex(ToolboxImage.Video);
    } else {
      setVideoFileIndex(ToolboxImage.NoVideo);
    }
  }

  //#endregion

  return (
    <View style={styles.container}>
      {
        !isStreamStarted 
          ? (<ActivityIndicator 
            color={props.indicatorColor ? props.indicatorColor : 'black'} 
            style={{flex: 1, alignSelf: 'center', justifyContent: 'center'}} 
          />)
          : 
          (
            <View style={{flex: 1}}>
              {
                props.viewType == ViewType.remote && 
                <ViewContainer 
                  containerStyle={styles.streamContainer} 
                  objectFit={'cover'} 
                  streamURL={remoteStreamURL} 
                  viewStyle={styles.stream} 
                  isToolboxAvailable={true}
                  isToolboxVisible={props.isToolboxVisible}
                  audioFileIndex={audioFileIndex}
                  videoFileIndex={videoFileIndex}
                  audioSwitchHandler={audioSwitchHandler}
                  hangupHandler={hangUpHandler}
                  videoSwitchHandler={videoSwitchHandler}
                />
              }
              {
                props.viewType == ViewType.local &&
                <ViewContainer 
                  containerStyle={styles.streamContainer} 
                  objectFit={'cover'} 
                  streamURL={localStreamURL} 
                  viewStyle={styles.stream} 
                  isToolboxAvailable={true}
                  isToolboxVisible={props.isToolboxVisible}
                  audioFileIndex={audioFileIndex}
                  videoFileIndex={videoFileIndex}
                  audioSwitchHandler={audioSwitchHandler}
                  hangupHandler={hangUpHandler}
                  videoSwitchHandler={videoSwitchHandler}
                />
              }
              {
                props.viewType == ViewType.both && 
                <View style={{flex: 1}}>
                  <ViewContainer 
                    containerStyle={styles.remoteStreamContainer} 
                    objectFit={'cover'} 
                    streamURL={remoteStreamURL} 
                    viewStyle={styles.stream} 
                    isToolboxAvailable={true}
                    isToolboxVisible={props.isToolboxVisible}
                    audioFileIndex={audioFileIndex}
                    videoFileIndex={videoFileIndex}
                    audioSwitchHandler={audioSwitchHandler}
                    hangupHandler={hangUpHandler}
                    videoSwitchHandler={videoSwitchHandler}
                  />
                  <ViewContainer 
                    containerStyle={styles.localStreamContainer} 
                    objectFit={'contain'} 
                    streamURL={localStreamURL} 
                    viewStyle={styles.stream} 
                    isToolboxAvailable={false}
                    isToolboxVisible={props.isToolboxVisible}
                  />
                </View>
              }
            </View>
          )
      }
    </View>
  );
}

export default VertoView;
