const printLog = (showLogs: boolean, ...logs: Array<any>) => {
    if(__DEV__ && showLogs) {
        console.log(...logs);
    }
}

export { printLog }