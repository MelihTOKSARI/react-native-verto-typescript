import { MediaStream } from 'react-native-webrtc';

import VertoParams from "../models/VertoParams";
import { defaultVertoCallbacks } from "../store";
import Call from "../verto/Call";
import VertinhoClient from "../verto/VertoClient";

class VertoInstance {
    private vertoClient: VertinhoClient;
    private instanceCallbackListeners: any = {};
    private instanceCallbacks: defaultVertoCallbacks;

    public createInstance(params: VertoParams, callbacks: defaultVertoCallbacks): VertinhoClient {
        // console.log('[vertoInstance] params:', params);
        if(!this.vertoClient) {
            this.vertoClient = new VertinhoClient(params, {
                ...callbacks,
                onCallStateChange: this.onCallStateChange,
                onNewCall: this.onNewCall,
                onPlayLocalVideo: this.onPlayLocalVideo,
                onPlayRemoteVideo: this.onPlayRemoteVideo
            });
            this.instanceCallbacks = callbacks;
        }

        return this.vertoClient;
    }

    public destroy() {
        if(this.vertoClient) {
            this.vertoClient.destroy();
        }
    }

    public getInstance(key?: string, callbackListeners?: any) {
        if(key && callbackListeners) {
            // console.log('[vertoInstance] key:', key, ' - callbackListeners:', callbackListeners);
            this.instanceCallbackListeners[key] = callbackListeners;
        }

        return this.vertoClient;
    }

    public removeInstanceCallbacks(key: string) {
        if(this.instanceCallbackListeners[key]) {
            const index = this.instanceCallbackListeners.indexOf(key);
            // console.log(index)
            if (index >= -1) {
                this.instanceCallbackListeners.splice(index, 1);
            }
        }
    }

    private onCallStateChange = (state: any) => {
        // console.log('[vertoInstance] onCallStateChange => ', state, ' - instanceCallbackListeners:', this.instanceCallbackListeners);
        if(this.instanceCallbacks && this.instanceCallbacks.onCallStateChange) {
            this.instanceCallbacks.onCallStateChange(state);
        }

        if(this.instanceCallbackListeners) {
            Object.values(this.instanceCallbackListeners).forEach(callbacks => {
                if(callbacks['onCallStateChange']) {
                    callbacks['onCallStateChange'](state);
                }
            })
        } else {
            // console.log('No listener for onCallStateChange');
        }
    }
    
    private onNewCall = (call: Call) => {
        // console.log('[vertoInstance] onNewCall:', call);
        if(this.instanceCallbacks && this.instanceCallbacks.onNewCall) {
            this.instanceCallbacks.onNewCall(call);
        }
        // for(const callbackListeners in this.instanceCallbackListeners) {
        //     if(callbackListeners['onNewCall']) {
        //         callbackListeners['onNewCall'](call);
        //     }
        // }
        if(this.instanceCallbackListeners) {
            Object.values(this.instanceCallbackListeners).forEach(callbacks => {
                if(callbacks['onNewCall']) {
                    callbacks['onNewCall'](call);
                }
            })
        } else {
            // console.log('No listener for onNewCall');
        }
    }

    private onPlayLocalVideo = (stream: MediaStream) => {
        // console.log('[vertoInstance] onPlayLocalVideo stream.toURL:', stream);
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayLocalVideo) {
            this.instanceCallbacks.onPlayLocalVideo(stream);
        }
        if(this.instanceCallbackListeners) {
            Object.values(this.instanceCallbackListeners).forEach(callbacks => {
                if(callbacks['onPlayLocalVideo']) {
                    callbacks['onPlayLocalVideo'](stream);
                }
            })
        } else {
            // console.log('No listener for onPlayLocalVideo');
        }
    }

    private onPlayRemoteVideo = (stream: MediaStream) => {
        // console.log('[vertoInstance] onPlayRemoteVideo stream.toURL:', stream.toURL());
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayRemoteVideo) {
            this.instanceCallbacks.onPrivateEvent(stream);
        }
        if(this.instanceCallbackListeners) {
            Object.values(this.instanceCallbackListeners).forEach(callbacks => {
                if(callbacks['onPlayRemoteVideo']) {
                    callbacks['onPlayRemoteVideo'](stream);
                }
            })
        } else {
            // console.log('No listener for onPlayRemoteVideo');
        }
    }
}

const VertoInstanceManager = new VertoInstance();
export default VertoInstanceManager;