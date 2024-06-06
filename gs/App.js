function doPost(e) {
    try {
        let msg = JSON.parse(e.postData.contents);
        if (msg.events === undefined) return; // 沒有事件就不用進來了
        const event = msg.events[0];
        Line.handle(event);
    } catch (e) {
        Sheet.writeDebugLog(e.message, e.stack)
    }
}

function doGet(e) {
    switch (true){
        case Object.hasOwn(e, 'token'):
            // if(e.parameter.token)
            break;
        case Object.hasOwn(e, 'action'):
            if (e.parameter.action === ''){
            }
            break;
        default:
            break;
    }
}
