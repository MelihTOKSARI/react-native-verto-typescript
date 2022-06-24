# <p align="center">React Native Verto Typescript</p>

## Important Update!
This package is depreceated and won't be maintained. Please, use this package [react-native-verto-ts](https://github.com/armakomnpm/react-native-verto-ts) for further updates.

<hr />

## Description
React native package for verto with typescript support. This package is basically constructed upon [react-native-verto](https://github.com/rizvanrzayev/react-native-verto) package and extra features are added to change conference parameters dynamically. Besides this, socket connection and verto views are seperated from each other. At last, package is mostly converted to typecript from pure javascript.

<hr />

## Installation

Run below command to install and use React Native Verto Typescript package.
```sh
npm install react-native-verto-typescript
```

This package provides video conferencing over webrtc. Therefore, you must run below command to install react-native-webrtc 
```sh 
npm install react-native-webrtc
```

Another mandatory package is react-native-background-timer and you must run below command
```sh
npm install react-native-background-timer
```

## Usage

### VertoInstanceManager

Web socket connection can be created through VertoInstanceManager singleton class. 

```js
import { VertoInstanceManager } from "react-native-verto-typescript";

const vertoParams = {
    webSocket: {
        url: '',
        login: '',
        password: ''
    },
    deviceParams: {
        useMic: 'any',
        useCamera: 'any',
        useSpeaker: 'any '
    }
}

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
    },
    onDisplay: (params: any) => {
        console.log('[example] onDisplay params:', params);
    },
    onNewCall: (call: Call) => {
        console.log('[example] onNewCall=>', call);
    }
};

VertoInstanceManager.createInstance(
    vertoParams,
    callbacks,
    true
)
```

#### \#createInstance
This method automatically create a VertoClient to provide making and answering calls.

```js
VertoInstanceManager.createInstance(
    vertoParams,
    callbacks,
    true
)
```

#### \#connect
Automatically make a connection to websocket if vertoClient instance is created and disconnected.

```js
VertoInstanceManager.connect();
```

#### \#destroy
Destroy existing vertoClient connection to web socket. 

```js
VertoInstanceManager.destroy();
```

#### \#getInstance
Get VertoClient instance to manage call operations directly. Created to listen call callbacks from vertoView. 

#### \#removeInstanceCallbacks
Remove call callbacks to  Created to listen call callbacks from vertoView.

#### \#makeCall
Make a call if vertoClient object is instantiated.

```js
const callParams = {
    to: 'CH1SN0S1',
    from: '1000',
    callerName: 'John Doe',
    useVideo: true
}

VertoInstanceManager.makeCall(callParams);
```

#### \#answerCall
Answer an incoming call. 

```js
VertoInstanceManager.answerCall(call);
```

#### \#startLocalStream (<i>beta</i>)
Start an existing local stream and attach both microphone and camera to vertoView.

```js
VertoInstanceManager.startLocalStream(callId);
```

#### \#stopLocalStream (<i>beta</i>)
Stop an existing local stream and detach or relase both microphone and camera from vertoView.

```js
VertoInstanceManager.stopLocalStream(callId);
```

#### \#muteLocalAudio
Mute or unmute a local audio track. In other words, close or open a microphone.

```js
/**
* @param callId Id of call to mute/unmute local audio
* @param mute Auido is muted if mute value is true
* @param onMuteResult Result of the operation. True if call audio track is found, otherwise false
*/
VertoInstanceManager.muteLocalAudio(callId, mute, (result: boolean) => {
    console.log('[muteLocalAudio] result:', result);
});
```

#### \#muteLocalVideo
Mute or unmute a local video track. In other words, close or open a camera.

```js
/**
* @param callId Id of call to mute/unmute local audio
* @param mute Video is muted if mute value is true
* @param onMuteResult Result of the operation. True if call video track is found, otherwise false
*/
VertoInstanceManager.muteLocalVideo(callId, mute, (result: boolean) => {
    console.log('[muteLocalVideo] result:', result);
});
```

#### \#hangUpCall
Hang up any existing call. Look for [this link](https://freeswitch.org/confluence/display/FREESWITCH/Hangup+Cause+Code+Table) to learn more about cause codes.

```js
/**
* @param call Call to send hangup request
* @param causeCode Reason to end call. If not set, send 'NORMAL_CLEARING' as a default code
*/
VertoInstanceManager.hangUpCall(call, causeCode);
```

#### \#onCallStateChange
Callback to listen states of a call. Callback provides 2 parameters. First one is state of a call and second one is id of a call.

Available states for a call:
* <strong>new:</strong> State for incoming new call.
* <strong>requesting:</strong> State for outgoing new call.
* <strong>trying:</strong> State for trying to establish a call.
* <strong>recovering:</strong> State for recovering interrupted call on client side.
* <strong>ringing:</strong> State for call is established and ringing.
* <strong>answering:</strong> State for call is answering.
* <strong>active:</strong> State for connection is established and call is active.
* <strong>held:</strong> State for active call is held by user.
* <strong>hangup:</strong> State for call is closed by user.
* <strong>destroy:</strong> State for call is closed and destroyed completely.
* <strong>purge:</strong> State for call is cleared completely.

#### \#onNewCall
Callback to capture incoming calls. Call is in ringing state.

#### \#onClientReady
Callback is triggered after verto client is instantiated and web socket connection is establised.

#### \#onError
Callback to listen web socket connection errors if any error is occurred.

#### \#onPlayLocalVideo
Callback to listen local media streams after call is establised and has became <strong>active</strong>. Media streams contain local audio and video tracks (if call is a video call). These tracks can be used to mute/unmute audio or video of local (device) streams.

#### \#onPlayRemoteVideo
Callback to listen remote media streams after call is establised and has became <strong>active</strong>. Media streams contain remote audio and video tracks (if call is a video call). These tracks can be used to mute/unmute audio or video of remote (incoming) streams.

### VertoView
VertoView component is responsible to maintain both audio and video (if call is video call) streams for ongoing call. Call features can be changed through props directly. Moreover, vertoView provides some callbacks to inform changes about a call media states.

```js
<View style={styles.container}>
    <VertoView
        call={call}
        viewKey={viewKey}
        showLogs={true}
        viewType={viewType}
        onLogoutClicked={() => {
            consoloe.log('Logout clicked!');
        }}
        isAudioOff={micMute}
        isCameraOff={videoMute}
        onAudioStateChanged={(item: any) => { }}
        onCallHangup={onCallHangup}
        onVideoStateChanged={(item: any) => { }}
        indicatorColor={'white'}
        indicatorVisible={false}
        isToolboxVisible={true}
        isRemoteAudioOff={false}
        cameraFacing={"true"}
        remoteStream={remoteStream}
        localStream={localStream}
    />
</View>
```

#### \#call
In normal conditions, when call is created and vertoView is rendered, call is automatically set to rendered vertoView. Ongoing call can pass to newly created vertoView through <strong>call  prop</strong>.

#### \#viewKey
Differantiate each vertoView components to listen callbacks from <strong>VertoInstanceManager</strong>.

#### \#showLogs
Show logs in debug mode.

#### \#viewType
Property to render call ui for local stream, remote stream or both. 

* local: shows only local camera view on vertoView
* remote: shows only remote camera view on vertoView
* both: shows remote camera view as a full screen and local camera view as a small screen

#### \#isAudioOff
Property to mute/unmute microphone.

#### \#isCameraOff
Property to close/open camera.

#### \#indicatorVisible
Property to show indicator before connecting any call.

#### \#indicatorColor
Property to change indicator color if it is visible

#### \#isToolboxVisible
Show/Hide toolbox component. Toolbox component contains <strong>Mute/Unmute Microphone</strong>, <strong>Hang up Call</strong> and <strong>Open/Close Camera</strong> buttons.

#### \#isRemoteAudioOff
Mute/Unmute audio of remote stream.

#### \#cameraFacing
Switch camera between rear (environment) and front (user). Currently, this property cannot provides selection of a camera. It only provides switching between cameras. Default camera is front if not changed to rear before.

#### \#remoteStream
Assign remote stream to vertoView from an existing call.

#### \#localStream
Assign local stream to vertoView from an existing call.

#### \#isCallScreenVisible
Property to show dial screen for demo purposes.

#### \#onLogoutClicked
Callback to logout from an existing vertoClient connection. It's added only for demo purposes.

#### \#onAudioStateChanged
Callback to provide local audio mute/unmute changes.

#### \#onRemoteAudioStateChanged
Callback to provide remote audio mute/unmute changes.

#### \#onVideoStateChanged
Callback to provide local video mute/unmute changes.

#### \#onCallHangup
Callback to provide hang up call state. This state normally provided by VertoInstanceManager with [onCallStateChange](README.md#onCallStateChange) callback.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
