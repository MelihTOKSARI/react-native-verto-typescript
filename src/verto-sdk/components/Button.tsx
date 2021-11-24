import React from 'react';
import { Image, PixelRatio, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ToolboxImage } from '../enums/ToolboxImage.enum';

const width: number = 48;
const height: number = 48;

const buttonWidth: number = 48;
const buttonHeight: number = 48;

const iconWidth: number = 20;
const iconHeight: number = 20;


interface Props {
    fileIndex: ToolboxImage,
    onPress: () => void;
    style?: {},
    width?: number,
    height?: number,
    backgroundColor?: string,
    buttonWidth?: number,
    buttonHeight?: number,
    iconWidth?: number,
    iconHeight?: number
}

const Button = (props: Props) => {

    const getImage = () => {
        switch (props.fileIndex) {
            case ToolboxImage.Audio:
                return <Image resizeMode={'contain'} style={styles(props).icon} source={require('../assets/images/ic_audio_black.png')} />
            case ToolboxImage.NoAudio:
                return <Image resizeMode={'contain'} style={styles(props).icon} source={require('../assets/images/ic_no_audio_black.png')} />
            case ToolboxImage.Video:
                return <Image resizeMode={'contain'} style={styles(props).icon} source={require('../assets/images/ic_video_black.png')} />
            case ToolboxImage.NoVideo:
                return <Image resizeMode={'contain'} style={styles(props).icon} source={require('../assets/images/ic_no_video_black.png')} />
            case ToolboxImage.Hangup:
                return <Image resizeMode={'contain'} style={styles(props).icon} source={require('../assets/images/ic_hangup.png')} />
        }
    }

    return (
        <View style={[styles(props).container, props.style]}>
            <TouchableOpacity
                style={styles(props).button}
                onPress={props.onPress}
                activeOpacity={0.6}
            >
                {
                    getImage()
                }
            </TouchableOpacity >
        </View>
    )
};

const styles = (props: Props) => StyleSheet.create({
    container: {
        alignItems: 'center',
        borderRadius: 1000,
        borderWidth: 5 / PixelRatio.get(),
        borderColor: props.backgroundColor ? props.backgroundColor : 'white',
        width: props.width ? props.width : width,
        height: props.height ? props.height : height
    },
    button: {
        width: props.width ? props.width : width,
        height: props.height ? props.height : height,
        borderRadius: 1000,
        justifyContent: 'center',
        backgroundColor: props.backgroundColor ? props.backgroundColor : 'white',
        borderColor: props.backgroundColor ? props.backgroundColor : 'white'
    },
    icon: {
        width: props.iconWidth ? props.iconWidth : iconWidth,
        height: props.iconHeight ? props.iconHeight : iconHeight,
        backgroundColor: 'transparent',
        alignSelf: 'center'
    },
});

export default Button;