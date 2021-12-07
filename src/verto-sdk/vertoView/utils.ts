const printLog = (showLogs: boolean, ...logs: Array<any>) => {
    if(showLogs) {
        console.log(logs);
    }
}

export { printLog }