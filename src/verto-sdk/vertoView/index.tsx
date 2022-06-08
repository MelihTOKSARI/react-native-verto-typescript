import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Button } from 'react-native';
import { MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import VertinhoClient from '../verto/VertoClient';
import styles from './styles';
import Call from '../verto/Call';
import ViewType from '../enums/ViewType.enum';
import ViewContainer from './ViewContainer';
import CallInfoParams from '../models/Call/CallInfoParams';
import { ToolboxImage } from '../enums/ToolboxImage.enum';
import VertoInstanceManager from './VertoInstanceManager';
import { printLog } from './utils';
import DialScreen from './toolbox/DialScreen';
import NewCallScreen from './toolbox/NewCallScreen';

interface Props {
  call?: Call,
  callParams?: CallInfoParams,
  callState?: string,
  cameraFacing?: string,
  indicatorColor?: string,
  indicatorVisible?: boolean,
  isAudioOff: boolean,
  isCallScreenVisible?: boolean,
  isCameraOff: boolean,
  isRemoteAudioOff: boolean,
  isToolboxVisible?: boolean,
  localStream?: MediaStream,
  onAudioStateChanged?: Function,
  onCallHangup?: (call?: Call) => void,
  onCallRequested?: (call: Call) => void,
  onLogoutClicked?: Function,
  onMicrophoneMuted?: (muted: boolean) => void,
  onVideoMuted?: (muted: boolean) => void,
  onRemoteAudioStateChanged?: Function,
  onVideoStateChanged?: Function,
  remoteStream?: MediaStream,
  showLogs?: boolean,
  viewKey: string,
  viewType: ViewType
}

const VertoView = (props: Props) => {

  const [vertoClient, setVertoClient] = useState<VertinhoClient>();

  const [call, setCall] = useState<Call>(null);
  const [incomingCall, setIncomingCall] = useState<Call>(null);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream>(null);
  const [localStreamURL, setLocalStreamURL] = useState('');
  
  const [remoteStream, setRemoteStream] = useState<MediaStream>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState('');

  const [isStreamStarted, setStreamStarted] = useState(false);

  const [audioFileIndex, setAudioFileIndex] = useState(ToolboxImage.Audio);
  const [videoFileIndex, setVideoFileIndex] = useState(ToolboxImage.Video);

  const [viewType, setViewType] = useState(ViewType.remote);

  const activeCall = useRef<Call>(null);

  useEffect(() => {
    // console.log('[vertoView] useEffect mount props.viewKey:', props.viewKey, ' - call is null?', (props.call == null));
    setDefaultStates();

    return () => {
      printLog(props.showLogs, '[vertoView] useEffect unmount props.viewKey:', props.viewKey);
      VertoInstanceManager.removeInstanceCallbacks(props.viewKey);
      setVertoClient(undefined);
    }
  }, []);

  // useEffect(() => {
  //   handleCallState();
  // }, [props.callState])

  useEffect(() => {
    if(props.localStream) {
      setLocalStream(props.localStream);
      setLocalStreamURL(props.localStream.toURL());
      updateStreamDependencies();
    }
  }, [props.localStream]);

  useEffect(() => {
    if(props.remoteStream) {
      setRemoteStream(props.remoteStream);
      setRemoteStreamURL(props.remoteStream.toURL());
      updateStreamDependencies();
    }
  }, [props.remoteStream])

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
    printLog(props.showLogs, '[vertoView] useEffect props.call is null?', (props.call == null));
    if(props.call) {
      activeCall.current = props.call;
      setCall(props.call);
    }
  }, [props.call])

  useEffect(() => {
    setViewType(props.viewType);
  }, [props.viewType])

  const initializeVertoClient = () => {
    printLog(props.showLogs, '[vertoView] initializeVertoClient props.viewKey:', props.viewKey);
    setVertoClient(VertoInstanceManager.getInstance(props.viewKey, {
      onCallStateChange,
      onNewCall,
      onPlayLocalVideo,
      onPlayRemoteVideo
    }));
  }

  const getVertoClient = () => {
    printLog(props.showLogs, '[vertoView] getVertoClient props.viewKey:', props.viewKey);
    if(!vertoClient) {
      initializeVertoClient();
    }

    return vertoClient;
  }

  //#region Call Listener Methods

  const onCallStateChange = (viewKey: string, state: any, callId: string) => {
    // TODO Reactivate below code snippets to check this view has active call to proceed
    // if(!activeCall.current || !activeCall.current.getId()) {
    //   printLog(props.showLogs, '[vertoView] onCallStateChange return! call is null?', (activeCall.current == null));
    //   return;
    // }

    if(viewKey !== props.viewKey) {
      return;
    }

    printLog(props.showLogs, '[vertoView] onCallStateChange viewKey:', props.viewKey, ' - state:', state);
    if (state && state.current && (state.current.name === "hangup" || state.current.name === "destroy")) {
      clearStreamProperties();
    }

    if(state && state.current && (state.current.name === "active")) {
      updateStreamDependencies();
    }
  }

  const onNewCall = (viewKey: string, call: Call) => {
    if(!call || !call.getId()) {
      printLog(props.showLogs, '[vertoView] onNewCall return! call is null?', (call == null));
      return;
    }

    if(viewKey !== props.viewKey) {
      return;
    }

    // caller_id_name - caller_id_number
    printLog(props.showLogs, '[vertoView] onNewCall call:', call);
    setIncomingCall(call);
    setHasIncomingCall(true);
  }

  const onPlayLocalVideo = (viewKey: string, stream: MediaStream) => {
    if(viewKey !== props.viewKey) {
      return;
    }
    printLog(props.showLogs, '[vertoView] onPlayLocalVideo viewKey:', props.viewKey, ' - stream.toURL:', stream);
    setLocalStream(stream);
    setLocalStreamURL(stream.toURL());

    const audioTrack = getAudioTrack(stream);
    if(audioTrack) {
      muteAudio(props.isAudioOff);
    }

    const videoTrack = getVideoTrack(stream);
    if(videoTrack) {
      muteVideo(props.isCameraOff);
    }
  }

  const onPlayRemoteVideo = (viewKey: string, stream: MediaStream) => {
    if(viewKey !== props.viewKey) {
      return;
    }

    printLog(props.showLogs, '[vertoView] onPlayRemoteVideo viewKey:', props.viewKey, ' - stream.toURL:', stream.toURL());
    setRemoteStream(stream);
    setRemoteStreamURL(stream.toURL());
  }

  //#endregion

  //#region State Methods

  /**
   * Reset stream properties to default values
   */
  const clearStreamProperties = () => {
    setStreamStarted(false);
    setLocalStream(null);
    setLocalStreamURL(null);
    setRemoteStream(null);
    setRemoteStreamURL(null);
  }

  const handleAudioState = () => {
    printLog(props.showLogs, '[vertoView] handleAudioState props.isAudioOff:', props.isAudioOff);
    muteAudio(props.isAudioOff);
  }

  const handleRemoteAudioState = () => {
    printLog(props.showLogs, '[vertoView] handleAudioState props.isAudioOff:', props.isAudioOff);
    muteRemoteAudio(props.isAudioOff);
  }

  const handleVideoState = () => {
    printLog(props.showLogs, '[vertoView] handleVideoState props.isCameraOff:', props.isCameraOff);
    muteVideo(props.isCameraOff);
  }

  const setDefaultStates = () => {
    initializeVertoClient();

    setIncomingCall(null);
    setHasIncomingCall(false);
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

  /**
   * Update status of stream dependencies after stream is started
   */
   const updateStreamDependencies = () => {
    setStreamStarted(true);
    muteAudio(props.isAudioOff);
    muteRemoteAudio(props.isRemoteAudioOff);
    muteVideo(props.isCameraOff);
  }

  const acceptIncomingCall = () => {
    setHasIncomingCall(false);
    if(incomingCall) {
      incomingCall.answer();
      activeCall.current = incomingCall;
      printLog(props.showLogs, '[vertoView] activeCall is null?', (activeCall.current == null));
      setCall(incomingCall);
      setIncomingCall(null);
    }
  }

  const rejectIncomingCall = () => {
    incomingCall.hangup();
    setHasIncomingCall(false);
    setIncomingCall(null);
  }

  const muteAudio = (mute: boolean) => {
    if(!localStream || mute == null) {
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
    if(!remoteStream || mute == null) {
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
    if(!localStream || mute == null) {
      return;
    }

    const localVideoTrack = getVideoTrack(localStream);
    if(localVideoTrack) {
      localVideoTrack.enabled = !mute;
      if(props.onVideoStateChanged) {
        props.onVideoStateChanged({ mute });
      }
    }
  }

  const switchCamera = () => {
    if(!localStream || !localStream.getVideoTracks()) {
      return;
    }

    const localVideoTrack = localStream.getVideoTracks().find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      printLog(props.showLogs, '[vertoView - switchCamera] Prepare to switch camera');
      localVideoTrack._switchCamera();
    }
  }

  //#region UI Listener Methods

  const callHandler = (callee: string) => {
    printLog(props.showLogs, '[vertoView] activeCall.current is null?', (activeCall.current == null));
    if(activeCall.current) {
      return;
    }

    callee = callee || props.callParams.to || 'CH1SN0S1';
    const callParams = {
      // to: callee,
      // from: '1000',
      // callerName: 'Hi',
      // useVideo: true
      ...props.callParams,
      to: callee
    };
    
    const newCall = VertoInstanceManager.makeCall(callParams);
    printLog(props.showLogs, '[vertoView] callHandler newCall is null?', (newCall == null));
    activeCall.current = newCall;
    printLog(props.showLogs, '[vertoView] callHandler activeCall is null?', (activeCall.current == null));
    setCall(newCall);
    if(props.onCallRequested) {
      props.onCallRequested(newCall);
    }
  }

  const hangUpHandler = () => {
    printLog(props.showLogs, '[vertoView] hangUpHandler call is null?', (call == null));
    if(call && call.getId()) {
      VertoInstanceManager.hangUpCall(call);
      activeCall.current = null;
      if(props.onCallHangup) {
        props.onCallHangup(call);
      }
    }
  }

  const handleLogout = () => {
    if(props.onLogoutClicked) {
      props.onLogoutClicked();
    }
  }

  const cameraSwitchHandler = () => {
    const localVideoTrack = localStream.getVideoTracks().find((t: MediaStreamTrack) => t.kind == 'video');
    if (localVideoTrack) {
      getVertoClient().switchCamera(call.getId(), localVideoTrack);
    }
  }

  const audioSwitchHandler = () => {
    const localAudioTrack = localStream && localStream.getAudioTracks() && localStream.getAudioTracks()[0];
    localAudioTrack.enabled = !localAudioTrack.enabled;

    if(localAudioTrack.enabled) {
      setAudioFileIndex(ToolboxImage.Audio);
    } else {
      setAudioFileIndex(ToolboxImage.NoAudio);
    }

    if(props.onMicrophoneMuted) {
      props.onMicrophoneMuted(localAudioTrack.muted);
    }
  }

  const videoSwitchHandler = () => {
    const localVideoTrack = localStream && localStream.getVideoTracks() && localStream.getVideoTracks()[0];
    localVideoTrack.enabled = !localVideoTrack.enabled;

    if(localVideoTrack.enabled) {
      setVideoFileIndex(ToolboxImage.Video);
      setViewType(ViewType.both);
    } else {
      setVideoFileIndex(ToolboxImage.NoVideo);
      setViewType(ViewType.remote);
    }

    if(props.onVideoMuted) {
      props.onVideoMuted(localVideoTrack.muted);
    }
  }

  //#endregion

  return (
    <View style={styles.container}>
      {
        !isStreamStarted 
          ? props.isCallScreenVisible === undefined || props.isCallScreenVisible === false
            ? (props.indicatorVisible === undefined && props.indicatorVisible && <ActivityIndicator 
              color={props.indicatorColor ? props.indicatorColor : 'black'} 
              style={{flex: 1, alignSelf: 'center', justifyContent: 'center'}} 
            />)
            :
            (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {
                    hasIncomingCall 
                      ? <NewCallScreen 
                        callFrom={incomingCall.getCallerIdentification()} 
                        onAnswerAccepted={acceptIncomingCall} 
                        onAnswerRejected={rejectIncomingCall}
                      />
                      : <DialScreen callHandler={callHandler} />
                  }
                </View>
                <View style={{ height: 50 }}>
                  <Button title="Logout" onPress={handleLogout} />
                </View>
              </View>
            )
          : 
          (
            <View style={{flex: 1}}>
              {
                viewType == ViewType.remote && 
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
                viewType == ViewType.local &&
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
                viewType == ViewType.both && 
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
