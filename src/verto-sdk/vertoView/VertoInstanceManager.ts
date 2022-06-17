import { MediaStream } from 'react-native-webrtc';

import CallInfoParams from '../models/Call/CallInfoParams';
import VertoParams from "../models/VertoParams";
import { defaultVertoCallbacks } from "../store";
import Call from "../verto/Call";
import VertinhoClient from "../verto/VertoClient";
import { printLog } from './utils';
import CallKeepHelperInstance from '../verto/CallKeepHelper';
import CallKeepParams from '../models/Call/CallKeepParams';

class VertoInstance {
    private vertoClient: VertinhoClient;
    private instanceCallbackListeners: any = {};

    private instanceCallbackListener: any;
    private instanceCallbackListenerKey: string;
    private instanceCallbacks: defaultVertoCallbacks;

    private activeCallUUID: string;
    private callKeepParams: CallKeepParams;
    private showLogs: boolean;

    private activeCalls: Array<Call> = [];

    public createInstance(params: VertoParams, callbacks: defaultVertoCallbacks, showLogs?: boolean, callKeepParams?: CallKeepParams): VertinhoClient {
        printLog(showLogs, '[vertoInstance] params:', params);
        if(!this.vertoClient) {
            printLog(showLogs, '[vertoInstance] vertoClient is null and will be instantiated');
            this.vertoClient = new VertinhoClient(params, {
                ...callbacks,
                onCallStateChange: this.onCallStateChange,
                onClientClose: this.onClientClose,
                onNewCall: this.onNewCall,
                onPlayLocalVideo: this.onPlayLocalVideo,
                onPlayRemoteVideo: this.onPlayRemoteVideo
            });
        } else if(!this.vertoClient.socketReady()) {
            printLog(showLogs, '[vertoInstance] trying to reconnect vertoClient');
            this.vertoClient.connect();
        } else {
            printLog(showLogs, '[vertoInstance] vertoClient is already instantiated and connected');
            callbacks.onClientReady({});
        }

        this.instanceCallbacks = callbacks;

        this.callKeepParams = callKeepParams;
        this.showLogs = showLogs;

        if(callKeepParams && callKeepParams.isEnabled) {
            printLog(showLogs, '[VertoInstanceManager-constructor] setup CallKeep');
            CallKeepHelperInstance.setup(true, this.callKeepParams.selfManaged, this.onNewCallAnswered, this.onCallEnded, this.callKeepParams.onShowIncomingCallUI);
        }

        return this.vertoClient;
    }

    public connect() {
        if(this.vertoClient && !this.vertoClient.socketReady()) {
            this.vertoClient.connect();
        }
    }

    public destroy() {
        printLog(this.showLogs, '[vertoInstance - destroy] requested...');
        if(this.vertoClient) {
            printLog(this.showLogs, '[vertoInstance - destroy] try to destroy socket...');
            this.vertoClient.destroy();
            this.vertoClient = undefined;
        }
    }

    public getInstance(key?: string, callbackListeners?: any) {
        if(key && callbackListeners) {
            printLog(this.showLogs, '[vertoInstance] key:', key, ' - callbackListeners:', callbackListeners);
            this.instanceCallbackListenerKey = key;
            this.instanceCallbackListener = callbackListeners;
        }

        return this.vertoClient;
    }

    public removeInstanceCallbacks(key: string) {
        if (key === this.instanceCallbackListenerKey) {
            this.instanceCallbackListener = null;
        }
    }

    /**
     * Make a call with given parameters. 
     * 
     * @param callParams Call parameters to create a call
     * @returns Newly created call
     */
    public makeCall(callParams: CallInfoParams): Call {
        if(!this.vertoClient) {
            printLog(this.showLogs, '[vertoInstance] vertoClient is not instantiated!!!');
            return;
        }

        let call: Call;
        if(callParams.useVideo) {
            call = this.vertoClient.makeVideoCall(callParams);
        } else {
            call = this.vertoClient.makeCall(callParams);
        }

        if(this.callKeepParams && this.callKeepParams.isEnabled) {
            printLog(this.showLogs, '[vertoInstance-makeCall] CallKit params:', this.callKeepParams);
            this.activeCallUUID = CallKeepHelperInstance.startCall({ 
                handle: callParams.to, 
                localizedCallerName: callParams.displayName || callParams.to || callParams.callerName 
            });
        }
        
        if(call) {
            this.activeCalls.push(call);
        }
        
        printLog(this.showLogs, '[vertoInstance-makeCall] this.call is null?', (call == null));

        return call;
    }

    /**
     * Start a new Call Keep call
     * 
     * @param handle Number to make a call
     * @param displayName Visible name on system call screen
     */
    public startCallKeepCall(handle: string, displayName: string) {
        if(this.callKeepParams && this.callKeepParams.isEnabled) {
            this.activeCallUUID = CallKeepHelperInstance.startCall({ 
                handle, 
                localizedCallerName: displayName 
            });
        }
    }

    // TODO Make callParams parameter mandatory after CallKeep integration
    /**
     * Answer a call if call is exist
     * 
     * @param call Incoming call
     * @param callParams Contains information like numbers of caller and callee, display name and video state
     */
    public answerCall(call: Call, callParams?: CallInfoParams) {
        if(call) {
            call.answer();
            this.activeCalls.push(call);

            // if(this.callKeepParams && this.callKeepParams.isEnabled && callParams) {
            //     this.activeCallUUID = CallKeepHelperInstance.startCall({ handle: callParams.to, localizedCallerName: callParams.callerName });
            //     printLog(this.showLogs, '[vertoInstance-answerCall] call answered callUUID:', this.activeCallUUID);
            // }
        }
    }

    /**
     * Insert a new call into active calls
     * 
     * @param call Currenly active call for client
     */
    public insertCall(call: Call) {
        const callIndex = this.activeCalls.findIndex(c => c.getId() === call.getId());

        if(callIndex === -1) {
            this.activeCalls.push(call);
        }
    }

    /**
     * Remove call from active calls
     * 
     * @param callId Id of call to remove from active calls
     */
    public removeCall(callId: string) {
        const callIndex = this.activeCalls.findIndex(c => c.getId() === callId);
        if(callIndex > -1) {
            this.activeCalls.splice(callIndex, 1);
        }
    }

    /**
     * Start local stream of a call with given callId
     * 
     * @param callId Id of call to start local stream
     */
    public startLocalStream(callId: string, kind?: string) {
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.rtc) {
            // call.rtc.reAddLocalStreamTracks();
            call.rtc.reAddLocalTracks(kind);
        }
    }

    /**
     * Stop local stream of a call with given callId
     * 
     * @param callId Id of call to stop local stream
     */
    public stopLocalStream(callId: string, kind?: string) {
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.rtc) {
            // call.rtc.removeLocalStreamTracks();
            call.rtc.removeLocalTracks(kind);
        }
    }

    /**
     * Mute/Unmute local audio of a call with given callId
     * 
     * @param callId Id of call to mute/unmute local audio
     * @param mute Auido is muted if mute value is true
     * @param onMuteResult Result of the operation. True if call audio track is found, otherwise false
     */
    public muteLocalAudio(callId: string, mute: boolean, onMuteResult?: Function) {
        let result = false;
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.rtc && call.rtc.getLocalStream() && call.rtc.getLocalStream().getAudioTracks()) {
            // call.rtc.getLocalStream().getAudioTracks()[0].enabled = !mute;
            if(mute && call.rtc.getLocalStream().getAudioTracks()[0]) {
                call.rtc.getLocalStream().getAudioTracks()[0].enabled = !mute;
                this.stopLocalStream(call.getId(), 'audio');
            } else {
                this.startLocalStream(call.getId(), 'audio');
                call.rtc.getLocalStream().getAudioTracks()[0].enabled = !mute;
            }

            if(this.callKeepParams && this.callKeepParams.isEnabled && this.activeCallUUID) {
                CallKeepHelperInstance.setOnMute(this.activeCallUUID, mute);
            }
            
            result = true;
        }

        onMuteResult(result);
    }

    /**
     * Mute/Unmute local video of a call with given callId
     * 
     * @param callId Id of call to mute/unmute local video
     * @param mute Video is muted if mute value is true
     * @param onMuteResult Result of the operation. True if call video track is found, otherwise false
     */
    public muteLocalVideo(callId: string, mute: boolean, onMuteResult?: Function) {
        let result = false;
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.rtc && call.rtc.getLocalStream() && call.rtc.getLocalStream().getVideoTracks()) {
            // call.rtc.getLocalStream().getVideoTracks()[0].enabled = !mute;
            if(mute && call.rtc.getLocalStream().getVideoTracks()[0]) {
                call.rtc.getLocalStream().getVideoTracks()[0].enabled = !mute;
                this.stopLocalStream(call.getId(), 'video');
            } else {
                this.startLocalStream(call.getId(), 'video');
                call.rtc.getLocalStream().getVideoTracks()[0].enabled = !mute;
            }
            result = true;
        }

        onMuteResult(result);
    }

    /**
     * Display system incoming call
     * 
     * @param callInfoParams Caller information
     * @param call Active call to show on Call Keep UI
     */
    public displayCallKeepCall(callInfoParams: CallInfoParams, call: Call) {
        if(this.callKeepParams && this.callKeepParams.isEnabled) {
            CallKeepHelperInstance.displayIncomingCall(callInfoParams, call);
        }
    }
    
    /**
     * Hangup a call with cause code
     * 
     * @param call Call to send hangup request
     * @param causeCode Reason to end call. If not set, send 'NORMAL_CLEARING' as a default code
    */
    public hangUpCall(call: Call, causeCode?: number) {
        if(!this.vertoClient) {
            return;
        }

        if(call && call.getId()) {
          printLog(this.showLogs, '[vertoInstance] hangupCall call is null?', (call == null));
          this.removeCall(call.getId());
          this.vertoClient.hangup(call.getId(), causeCode);
          if(this.callKeepParams && this.callKeepParams.isEnabled) {
              CallKeepHelperInstance.hangup(this.activeCallUUID);
          }
        } else {
          printLog(this.showLogs, '[vertoInstance] hangupCall else block');
        }
    }

    /**
     * End CallKeep call to seperate sip call from operating system call
     */
    public endCallKeepCall() {
        if(this.callKeepParams && this.callKeepParams.isEnabled && this.activeCallUUID) {
            CallKeepHelperInstance.hangup(this.activeCallUUID);
        }
    }

    private onClientClose = () => {
        printLog(this.showLogs, '[vertoInstance - onClientClose] socket is closed');
    }

    private onCallStateChange = (state: any, callId: string) => {
        printLog(this.showLogs, '[vertoInstance] onCallStateChange => ', state, ' - instanceCallbackListeners:', this.instanceCallbackListeners);
        if(this.instanceCallbacks && this.instanceCallbacks.onCallStateChange) {
            this.instanceCallbacks.onCallStateChange(state, callId);
        }

        if (this.instanceCallbackListener && this.instanceCallbackListener['onCallStateChange']) {
            this.instanceCallbackListener['onCallStateChange'](this.instanceCallbackListenerKey, state, callId);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onCallStateChange');
        }

        if(state.current.name === 'destroy') {
            this.onCallDestroyed(callId);
        }
    }

    private onCallDestroyed = (callId: string) => {
        printLog(this.showLogs, '[VertoInstanceManager-onCallDestroyed] 1 callId:', callId);
        if(callId && this.callKeepParams && this.callKeepParams.autoHangup) {
            printLog(this.showLogs, '[VertoInstanceManager-onCallDestroyed] 2');
            const call = this.activeCalls.find(t => t.getId() === callId);
            printLog(this.showLogs, '[VertoInstanceManager-onCallDestroyed] 3');
            if(call) {
                printLog(this.showLogs, '[VertoInstanceManager-onCallDestroyed] 4');
                this.hangUpCall(call);
            }
        }
    }
    
    private onNewCall = (call: Call) => {
        printLog(this.showLogs, '[vertoInstance] onNewCall:', call);
        if(this.instanceCallbacks && this.instanceCallbacks.onNewCall) {
            this.instanceCallbacks.onNewCall(call);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['onNewCall']) {
            this.instanceCallbackListener['onNewCall'](this.instanceCallbackListenerKey, call);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onNewCall call.getCalleeIdentification():', call.getCalleeIdentification(), ' - call.getDestinationNumber():', call.getDestinationNumber());
        }

        if(this.callKeepParams && this.callKeepParams.isEnabled && this.callKeepParams.autoDisplay) {
            CallKeepHelperInstance.displayIncomingCall({ callerName: call.getCalleeIdentification(), from: call.getCallerIdentification(), to: '1000', useVideo: true }, call);
        }
    }

    private onNewCallAnswered = (call: Call, callUUID: string) => {
        printLog(this.showLogs, '[vertoInstance - onNewCallAnswered] call:', call);
        if(this.callKeepParams && this.callKeepParams.isEnabled) {
            this.activeCallUUID = callUUID;
            printLog(this.showLogs, '[vertoInstance-onNewCallAnswered] activeCallUUID:', this.activeCallUUID);
            if(this.callKeepParams.autoAnswer) {
                this.answerCall(call, { callerName: call.getCallerIdentification(), from: call.getCallerIdentification(), to: call.getCalleeIdentification(), useVideo: call.rtc.getHasVideo() });
            }
            
            if(this.callKeepParams.onNewCallAceppted) {
                this.callKeepParams.onNewCallAceppted(call);
            }
        }
    }

    private onCallEnded = (handle: string) => {
        printLog(this.showLogs, '[vertoInstance - onCallEnded] handle:', handle);
        if(this.callKeepParams && this.callKeepParams.isEnabled) {
            if(this.callKeepParams.onCallEnded) {
                this.callKeepParams.onCallEnded(handle);
            }
        }
    }

    private onPlayLocalVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayLocalVideo stream.toURL:', stream);
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayLocalVideo) {
            this.instanceCallbacks.onPlayLocalVideo(stream);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['onPlayLocalVideo']) {
            this.instanceCallbackListener['onPlayLocalVideo'](this.instanceCallbackListenerKey, stream);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onPlayLocalVideo');
        }
    }

    private onPlayRemoteVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayRemoteVideo stream.toURL:', stream.toURL());
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayRemoteVideo) {
            this.instanceCallbacks.onPlayRemoteVideo(stream);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['onPlayRemoteVideo']) {
            this.instanceCallbackListener['onPlayRemoteVideo'](this.instanceCallbackListenerKey, stream);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onPlayRemoteVideo');
        }
    }
}

const VertoInstanceManager = new VertoInstance();
export default VertoInstanceManager;