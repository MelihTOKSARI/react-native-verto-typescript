import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Button } from 'react-native';
import { MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import VertinhoClient from '../verto/VertoClient';
import styles from './styles';
import Call from '../verto/Call';
import ViewType from '../enums/ViewType.enum';
import ViewContainer from './ViewContainer';
import MakeCallParams from '../models/Call/MakeCallParams';
import { ToolboxImage } from '../enums/ToolboxImage.enum';
import VertoInstanceManager from './VertoInstanceManager';
import { printLog } from './utils';
import CallScreen from './toolbox/CallScreen';

interface Props {
  call?: Call,
  callParams?: MakeCallParams,
  callState?: string,
  cameraFacing?: string,
  indicatorColor?: string,
  isAudioOff: boolean,
  isCallScreenVisible?: boolean,
  isCameraOff: boolean,
  isRemoteAudioOff: boolean,
  isToolboxVisible?: boolean,
  onAudioStateChanged?: Function,
  onLogoutClicked: Function,
  onRemoteAudioStateChanged?: Function,
  onVideoStateChanged?: Function,
  showLogs?: boolean,
  viewKey: string,
  viewType: ViewType
}

const VertoView = (props: Props) => {

  let vertoClient: VertinhoClient;

  const [call, setCall] = useState(null);

  const [localStream, setLocalStream] = useState(null);
  const [localStreamURL, setLocalStreamURL] = useState('');
  
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState('');

  const [isStreamStarted, setStreamStarted] = useState(false);

  const [audioFileIndex, setAudioFileIndex] = useState(ToolboxImage.Audio);
  const [videoFileIndex, setVideoFileIndex] = useState(ToolboxImage.Video);

  useEffect(() => {
    setDefaultStates();

    return () => {
      vertoClient = undefined;
    }
  }, []);

  useEffect(() => {
    handleCallState();
  }, [props.callState])

  useEffect(() => {
    handleAudioState();
  }, [props.isAudioOff]);

  useEffect(() => {
    handleRemoteAudioState();
  }, [props.isRemoteAudioOff]);

  useEffect(() => {
    handleVideoState();
  }, [props.isCameraOff]);

  useEffect(() => {
    switchCamera();
  }, [props.cameraFacing])

  useEffect(() => {
    printLog(props.showLogs, '[vertoView] useEffect props.call:', props.call);
    if(props.call) {
      setCall(props.call);
    }
  }, [props.call])

  const getVertoClient = () => {
    if(!vertoClient) {
      vertoClient = VertoInstanceManager.getInstance(props.viewKey, {
        onCallStateChange,
        onPlayLocalVideo,
        onPlayRemoteVideo
      });
    }

    return vertoClient;
  }

  //#region Call Listener Methods

  const onCallStateChange = (viewKey: string, state: any) => {
    if(viewKey !== props.viewKey) {
      return;
    }
    printLog(props.showLogs, '[vertoView] onCallStateChange => ', state);
    if (state && state.current && (state.current.name === "hangup" || state.current.name === "destroy")) {
      setLocalStreamURL(null);
      setRemoteStreamURL(null);
      setStreamStarted(false);
    }

    if(state && state.current && (state.current.name === "active")) {
      setStreamStarted(true);
      muteAudio(props.isAudioOff);
      muteRemoteAudio(props.isRemoteAudioOff);
      muteVideo(props.isCameraOff);
    }
  }

  const onPlayLocalVideo = (viewKey: string, stream: MediaStream) => {
    if(viewKey !== props.viewKey) {
      return;
    }
    printLog(props.showLogs, '[vertoView] onPlayLocalVideo stream.toURL:', stream);
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
  }

  const onPlayRemoteVideo = (viewKey: string, stream: MediaStream) => {
    if(viewKey !== props.viewKey) {
      return;
    }
    printLog(props.showLogs, '[vertoView] onPlayRemoteVideo stream.toURL:', stream.toURL());
    setRemoteStream(stream);
    setRemoteStreamURL(stream.toURL());
  }

  //#endregion

  //#region State Methods

  const handleCallState = () => {
    printLog(props.showLogs, 'handleCallState callState:', props.callState);
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
    printLog(props.showLogs, 'handleAudioState props.isAudioOff:', props.isAudioOff);
    muteAudio(props.isAudioOff);
  }

  const handleRemoteAudioState = () => {
    printLog(props.showLogs, 'handleAudioState props.isAudioOff:', props.isAudioOff);
    muteRemoteAudio(props.isAudioOff);
  }

  const handleVideoState = () => {
    printLog(props.showLogs, 'handleVideoState props.isCameraOff:', props.isCameraOff);
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
    const newCall = getVertoClient().makeVideoCall(callParams);
    printLog(props.showLogs, '[vertoView] call:', newCall);
    setCall(newCall);
  }

  const hangUpCall = () => {
    if(call && call.getId()) {
      printLog(props.showLogs, '[vertoView] hangupCall call:', call);
      getVertoClient().hangup(call.getId());
    } else {
      printLog(props.showLogs, '[vertoView] hangupCall else block');
    }
  }

  const muteAudio = (mute: boolean) => {
    if(!localStream) {
      return;
    }

    const localAudioTrack = getAudioTrack(localStream);
    if(localAudioTrack) {
      localAudioTrack.enabled = !mute;
      if(props.onAudioStateChanged) {
        props.onAudioStateChanged({ mute });
      }
    }
  }

  const muteRemoteAudio = (mute: boolean) => {
    if(!remoteStream) {
      return;
    }

    const remoteAudioTrack = getAudioTrack(remoteStream);
    if(remoteAudioTrack) {
      remoteAudioTrack.enabled = !mute;
      if(props.onRemoteAudioStateChanged) {
        props.onRemoteAudioStateChanged({ mute });
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
    if(!localStream || !localStream._tracks) {
      return;
    }

    const localVideoTrack = localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      getVertoClient().switchCamera(call.getId(), localVideoTrack);
    }
  }

  //#region UI Listener Methods

  const callHandler = (callee: string) => {
    callee = callee || 'CH1SN0S1';
    const callParams = {
      to: callee,
      from: '1000',
      callerName: 'Hi',
    };

    const newCall = getVertoClient().makeVideoCall(callParams);
    printLog(props.showLogs, '[vertoView] callHandler call:', newCall);
    setCall(newCall);
  }

  const hangUpHandler = () => {
    printLog(props.showLogs, '[vertoView] hangUpHandler call:', call);
    if(call && call.getId()) {
      getVertoClient().hangup(call.getId());
    }
  }

  const handleLogout = () => {
    props.onLogoutClicked();
  }

  const cameraSwitchHandler = () => {
    const localVideoTrack = localStream._tracks.find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      getVertoClient().switchCamera(call.getId(), localVideoTrack);
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
          ? !props.isCallScreenVisible 
            ? (<ActivityIndicator 
              color={props.indicatorColor ? props.indicatorColor : 'black'} 
              style={{flex: 1, alignSelf: 'center', justifyContent: 'center'}} 
            />)
            :
            (
              <View style={{ flex: 1 }}>
                <CallScreen callHandler={callHandler} />
                <Button title="Logout" onPress={handleLogout} />
              </View>
            )
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
                    containerStyle={props.isToolboxVisible ? [styles.localStreamContainer, styles.localStreamContainerUp] : styles.localStreamContainer} 
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
