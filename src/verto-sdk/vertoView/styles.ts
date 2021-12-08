import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  streamContainer: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  stream: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  localStreamContainer: {
    position: 'absolute',
    height: 200,
    width: 120,
    right: 12,
    bottom: 12,
    zIndex: 10,
    elevation: 10
  },
  localStreamContainerUp: {
    bottom: 60
  },
  remoteStreamContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    resizeMode: 'cover'
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    flex: 2
  },
  text: {
    backgroundColor: 'red',
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginRight: 2,
    marginBottom: 12,
    marginLeft: 2,
    paddingTop: 12,
    paddingRight: 2,
    paddingBottom: 12,
    paddingLeft: 2
  },
  actionItem: {
    flex: 5,
    height: 80
  }
})

export default styles;
