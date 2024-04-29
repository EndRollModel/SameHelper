function doPost(e) {
    let msg = JSON.parse(e.postData.contents);
    if (msg.events === undefined) return; // 沒有事件就不用進來了
    const event = msg.events[0];
    Line.handle(event);
}
