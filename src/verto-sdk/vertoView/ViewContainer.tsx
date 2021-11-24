import React, { useState } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { ToolboxImage } from '../enums/ToolboxImage.enum';
import Toolbox from './toolbox/Toolbox';

interface Props {
    audioFileIndex?: ToolboxImage,
    videoFileIndex?: ToolboxImage,
    containerStyle: Object,
    objectFit?: any,
    streamURL: string,
    viewStyle: Object,
    isToolboxAvailable: boolean,
    isToolboxVisible: boolean,
    hangupHandler?: () => void,
    audioSwitchHandler?: () => void,
    videoSwitchHandler?: () => void
}

const ViewContainer = (props: Props) => {

    const [isClicked, setClicked] = useState<boolean>(true);

    const onPressHandler = () => {
        setClicked(!isClicked);
    }

    return (
        <View style={props.containerStyle}>
            <TouchableWithoutFeedback style={{ flex: 1 }} onPress={onPressHandler}>
                <RTCView objectFit={props.objectFit} streamURL={props.streamURL} style={props.viewStyle} />
            </TouchableWithoutFeedback>
            {
                props.isToolboxAvailable && props.isToolboxVisible &&
                <Toolbox style={{ position: 'absolute', zIndex: 10, elevation: 10, bottom: 20, flex: 1, alignSelf: 'center' }}
                    audioFileIndex={props.audioFileIndex}
                    videoFileIndex={props.videoFileIndex}
                    audioSwitchHandler={props.audioSwitchHandler}
                    hangupHandler={props.hangupHandler}
                    videoSwitchHandler={props.videoSwitchHandler}
                    showToolbox={isClicked}
                ></Toolbox>
            }
        </View>
    )

}

export default ViewContainer;