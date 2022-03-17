import { MediaStream } from 'react-native-webrtc';
import MakeCallParams from '../models/Call/MakeCallParams';

import VertoParams from "../models/VertoParams";
import { defaultVertoCallbacks } from "../store";
import Call from "../verto/Call";
import VertinhoClient from "../verto/VertoClient";
import { printLog } from './utils';

class VertoInstance {
    private vertoClient: VertinhoClient;
    private instanceCallbackListeners: any = {};

    private instanceCallbackListener: any;
    private instanceCallbackListenerKey: string;
    private instanceCallbacks: defaultVertoCallbacks;

    private showLogs: boolean;

    private activeCalls: Array<Call> = [];

    public createInstance(params: VertoParams, callbacks: defaultVertoCallbacks, showLogs?: boolean): VertinhoClient {
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

        this.showLogs = showLogs;

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
    public makeCall(callParams: MakeCallParams): Call {
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
        
        if(call) {
            this.activeCalls.push(call);
        }
        
        printLog(this.showLogs, '[vertoInstance] this.call is null?', (call == null));

        return call;
    }

    /**
     * Answer a call if call is exist
     * 
     * @param call Incoming call
     */
    public answerCall(call: Call) {
        if(call) {
            call.answer();
            this.activeCalls.push(call);
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
    public startLocalStream(callId: string) {
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.getMediaHandlers()) {
            call.getMediaHandlers()?.playLocalVideo();
        }
    }

    /**
     * Stop local stream of a call with given callId
     * 
     * @param callId Id of call to stop local stream
     */
    public stopLocalStream(callId: string) {
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.getMediaHandlers()) {
            call.getMediaHandlers().stopLocalVideo();
        }
    }

    /**
     * Mute/Unmute local audio of a call with given callId
     * 
     * @param callId Id of call to mute/unmute local audio
     * @param mute Auido is muted if mute value is true
     * @param onMuteResult Result of the operation. True if call video track is found, otherwise false
     */
    public muteLocalAudio(callId: string, mute: boolean, onMuteResult?: Function) {
        let result = false;
        const call: Call = this.activeCalls.find(c => c.getId() === callId);
        if(call && call.rtc && call.rtc.getLocalStream() && call.rtc.getLocalStream().getAudioTracks()) {
            call.rtc.getLocalStream().getAudioTracks()[0].enabled = !mute;
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
            call.rtc.getLocalStream().getVideoTracks()[0].enabled = !mute;
            result = true;
        }

        onMuteResult(result);
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
        } else {
          printLog(this.showLogs, '[vertoInstance] hangupCall else block');
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
    }
    
    private onNewCall = (call: Call) => {
        printLog(this.showLogs, '[vertoInstance] onNewCall:', call);
        if(this.instanceCallbacks && this.instanceCallbacks.onNewCall) {
            this.instanceCallbacks.onNewCall(call);
        }
        if (this.instanceCallbackListener && this.instanceCallbackListener['oneNewCall']) {
            this.instanceCallbackListener['oneNewCall'](this.instanceCallbackListenerKey, call);
        } else {
            printLog(this.showLogs, '[vertoInstance] No listener for onNewCall');
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