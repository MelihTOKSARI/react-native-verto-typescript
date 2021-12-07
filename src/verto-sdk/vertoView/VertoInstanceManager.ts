import { MediaStream } from 'react-native-webrtc';

import VertoParams from "../models/VertoParams";
import { defaultVertoCallbacks } from "../store";
import Call from "../verto/Call";
import VertinhoClient from "../verto/VertoClient";
import { printLog } from './utils';

class VertoInstance {
    private vertoClient: VertinhoClient;
    private instanceCallbackListeners: any = {};
    private instanceCallbacks: defaultVertoCallbacks;

    private showLogs: boolean;

    public createInstance(params: VertoParams, callbacks: defaultVertoCallbacks, showLogs?: boolean): VertinhoClient {
        printLog(showLogs, '[vertoInstance] params:', params);
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

        this.showLogs = showLogs;

        return this.vertoClient;
    }

    public destroy() {
        if(this.vertoClient) {
            this.vertoClient.destroy();
            this.vertoClient = undefined;
        }
    }

    public getInstance(key?: string, callbackListeners?: any) {
        if(key && callbackListeners) {
            printLog(this.showLogs, '[vertoInstance] key:', key, ' - callbackListeners:', callbackListeners);
            this.instanceCallbackListeners[key] = callbackListeners;
        }

        return this.vertoClient;
    }

    public removeInstanceCallbacks(key: string) {
        if(this.instanceCallbackListeners[key]) {
            const index = this.instanceCallbackListeners.indexOf(key);
            if (index >= -1) {
                this.instanceCallbackListeners.splice(index, 1);
            }
        }
    }

    private onCallStateChange = (state: any) => {
        printLog(this.showLogs, '[vertoInstance] onCallStateChange => ', state, ' - instanceCallbackListeners:', this.instanceCallbackListeners);
        if(this.instanceCallbacks && this.instanceCallbacks.onCallStateChange) {
            this.instanceCallbacks.onCallStateChange(state);
        }

        if(this.instanceCallbackListeners) {
            // Object.values(this.instanceCallbackListeners).forEach(callbacks => {
            //     if(callbacks['onCallStateChange']) {
            //         callbacks['onCallStateChange'](state);
            //     }
            // })
            Object.keys(this.instanceCallbackListeners).forEach(key => {
                if(this.instanceCallbackListeners[key]['onCallStateChange']) {
                    this.instanceCallbackListeners[key]['onCallStateChange'](key, state);
                }
            })
        } else {
            printLog(this.showLogs, 'No listener for onCallStateChange');
        }
    }
    
    private onNewCall = (call: Call) => {
        printLog(this.showLogs, '[vertoInstance] onNewCall:', call);
        if(this.instanceCallbacks && this.instanceCallbacks.onNewCall) {
            this.instanceCallbacks.onNewCall(call);
        }
        // for(const callbackListeners in this.instanceCallbackListeners) {
        //     if(callbackListeners['onNewCall']) {
        //         callbackListeners['onNewCall'](call);
        //     }
        // }
        if(this.instanceCallbackListeners) {
            Object.keys(this.instanceCallbackListeners).forEach(key => {
                if(this.instanceCallbackListeners[key]['onNewCall']) {
                    this.instanceCallbackListeners[key]['onNewCall'](key, call);
                }
            })
            // Object.values(this.instanceCallbackListeners).forEach(callbacks => {
            //     if(callbacks['onNewCall']) {
            //         callbacks['onNewCall'](call);
            //     }
            // })
        } else {
            printLog(this.showLogs, 'No listener for onNewCall');
        }
    }

    private onPlayLocalVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayLocalVideo stream.toURL:', stream);
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayLocalVideo) {
            this.instanceCallbacks.onPlayLocalVideo(stream);
        }
        if(this.instanceCallbackListeners) {
            // Object.values(this.instanceCallbackListeners).forEach(callbacks => {
            //     if(callbacks['onPlayLocalVideo']) {
            //         callbacks['onPlayLocalVideo'](stream);
            //     }
            // })
            Object.keys(this.instanceCallbackListeners).forEach(key => {
                if(this.instanceCallbackListeners[key]['onPlayLocalVideo']) {
                    this.instanceCallbackListeners[key]['onPlayLocalVideo'](key, stream);
                }
            })
        } else {
            printLog(this.showLogs, 'No listener for onPlayLocalVideo');
        }
    }

    private onPlayRemoteVideo = (stream: MediaStream) => {
        printLog(this.showLogs, '[vertoInstance] onPlayRemoteVideo stream.toURL:', stream.toURL());
        if(this.instanceCallbacks && this.instanceCallbacks.onPlayRemoteVideo) {
            this.instanceCallbacks.onPrivateEvent(stream);
        }
        if(this.instanceCallbackListeners) {
            // Object.values(this.instanceCallbackListeners).forEach(callbacks => {
            //     if(callbacks['onPlayRemoteVideo']) {
            //         callbacks['onPlayRemoteVideo'](stream);
            //     }
            // })
            Object.keys(this.instanceCallbackListeners).forEach(key => {
                if(this.instanceCallbackListeners[key]['onPlayRemoteVideo']) {
                    this.instanceCallbackListeners[key]['onPlayRemoteVideo'](key, stream);
                }
            })
        } else {
            printLog(this.showLogs, 'No listener for onPlayRemoteVideo');
        }
    }
}

const VertoInstanceManager = new VertoInstance();
export default VertoInstanceManager;