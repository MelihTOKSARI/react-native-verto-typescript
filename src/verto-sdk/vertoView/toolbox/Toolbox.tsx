import React, { useEffect, useState } from 'react';
import { StyleSheet, ViewProps, Animated } from 'react-native';
import Button from '../../components/Button';
import { ToolboxImage } from '../../enums/ToolboxImage.enum';
import useDidMountEffect from '../../hooks/hooks';

interface Props extends Animated.AnimatedProps<ViewProps> {
    audioFileIndex: ToolboxImage,
    videoFileIndex: ToolboxImage,
    hangupHandler?: () => void,
    audioSwitchHandler?: () => void,
    videoSwitchHandler?: () => void,
    showToolbox: boolean
}

const animationDuration = 250;

const Toolbox = (props: Props) => {

    const opacity = useState(new Animated.Value(0))[0];
    const [toolboxVisible, setToolboxVisible] = useState<boolean>(false);

    let timer: NodeJS.Timeout;

    useEffect(() => {
        fadeIn();

        // return () => clearFadeOutTimeout(true);
    }, [])

    useDidMountEffect(() => {
        clearFadeOutTimeout(true);
        if (!toolboxVisible) {
            fadeIn();
        } else {
            fadeOut();
        }
    }, [props.showToolbox])

    const clearFadeOutTimeout = (onlyClear = false) => {
        if (timer) {
            clearTimeout(timer);
        }    
        
        if(!onlyClear) {
            timer = setTimeout(() => {
                fadeOut();
            }, 5000)
        }
    }

    const fadeIn = () => {
        if (toolboxVisible)
            return;
        
        setTimeout(() => {
            setToolboxVisible(true);
        }, animationDuration)
        Animated.timing(opacity, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: true
        }).start()

        clearFadeOutTimeout();
    }

    const fadeOut = () => {
        if(!toolboxVisible) {
            return;
        }

        setTimeout(() => {
            setToolboxVisible(false);
        }, animationDuration)
        Animated.timing(opacity, {
            toValue: 0,
            duration: animationDuration,
            useNativeDriver: true
        }).start()
    }

    const audioSwitchHandler = () => {
        if (audioSwitchHandler) {
            props.audioSwitchHandler();
        }
    }

    const hangupHandler = () => {
        if (props.hangupHandler) {
            props.hangupHandler();
        }
    }

    const cameraSwitchHandler = () => {
        if (props.videoSwitchHandler) {
            props.videoSwitchHandler();
        }
    }

    return (
        toolboxVisible &&
        <Animated.View {...props} style={[{ ...styles.container, ...props.style as {}, opacity: opacity }]}>
            <Button style={styles.button} onPress={audioSwitchHandler} fileIndex={props.audioFileIndex}></Button>
            <Button backgroundColor={'red'} width={56} height={56} iconWidth={28} iconHeight={28} onPress={hangupHandler} fileIndex={ToolboxImage.Hangup}></Button>
            <Button style={styles.button} onPress={cameraSwitchHandler} fileIndex={props.videoFileIndex}></Button>
        </Animated.View>

    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        maxHeight: 64,
        backgroundColor: 'transparent'
    },
    button: {
        backgroundColor: 'white',
        marginHorizontal: 28
    }
});

export default Toolbox;