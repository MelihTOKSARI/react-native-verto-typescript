const printLog = (showLogs: boolean, ...logs: Array<any>) => {
    showLogs && console.log(logs);
}

export { printLog }