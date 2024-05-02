const Sheet = {}

// module
// 錯誤的內容就寫入到debug的列表
// getRange(row, column, numRows, numColumns)
Sheet.debugSpeadSheet = SpreadsheetApp.openById(Config.debugSheetId);
Sheet.commandSpeadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 指令表的內容
Sheet._commandTabList = [
    {name: 'command', title: ['command', 'type', 'tag', 'userId', 'groupId', 'status']}, //
    {name: 'temp', title: ['command', 'date', 'userId', 'groupId', 'status']}, //
    {name: 'record', title: ['keyword', 'date', 'userId', 'groupId']}, //
    {name: 'users', title: ['userId', 'userName', 'status']},
    {name: 'groups', title: ['groupId', 'groupName', 'status']},
];
Sheet._debugTabList = [
    {name: 'debug', title: ['date', 'msg', 'stack']}
];

Sheet._dictionary = {
    follow: 'follow',
    unfollow: 'unfollow',
    join: 'join',
    leave: 'leave',
    users: 'users',
    groups: 'groups',
    userId: 'userId',
    groupId: 'groupId'
}

/**************
 *            *
 **************/
Sheet.writeRecord = (type, info) => {
    // join, leave, follow, unfollow
    // info {id, name}
    switch (type) {
        case 'join':
            Sheet._recordInfo(Sheet._dictionary.groups, type, Sheet._dictionary.groupId, info.id, info.name)
            break;
        case 'leave':
            Sheet._recordInfo(Sheet._dictionary.groups, type, Sheet._dictionary.groupId, info.id)
            break;
        case 'follow':
            Sheet._recordInfo(Sheet._dictionary.users, type, Sheet._dictionary.userId, info.id, info.name)
            break;
        case 'unfollow':
            Sheet._recordInfo(Sheet._dictionary.users, type, Sheet._dictionary.userId, info.id)
            break;
    }
}

/**
 * 搜尋表中key的值
 * @param tabName tab的名稱
 * @param action action type (join, leave, follow, unfollow)
 * @param key title的標籤
 * @param value 要搜尋的值
 * @param name 如果是新增會需要傳入name
 * @private
 * @description *注意* 此方法必須輸入正確的key, 否則會錯誤
 */
Sheet._recordInfo = (tabName, action, key, value, name = '') => {
    const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e) => e === tabName);
    const tabPage = Sheet.commandSpeadSheet.getSheets()[tabIndex]; // 先找到sheet
    // const titleIndex = Sheet._commandTabList.find((e)=> e.name === tabName).title.findIndex((e)=> e === key)
    const titleList = tabPage.getRange(1, 1, 1, tabPage.getLastColumn()).getDisplayValues()[0]
    const titleListIndex = titleList.findIndex((e) => e === key);
    const searchValue = tabPage.getRange(2, titleListIndex + 1, tabPage.getLastRow(), 1).getDisplayValues().flat();
    if (searchValue.includes(value)) {
        // 若有就先檢查狀態 然後更換狀態
        const rowIndex = searchValue.findIndex((e) => e === value) + 2;
        const statusIndex = titleList.findIndex((e) => e === 'status') + 1;
        switch (tabName) {
            case 'users':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet._dictionary.follow ? Sheet._dictionary.follow : Sheet._dictionary.unfollow);
                break;
            case 'groups':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet._dictionary.join ? Sheet._dictionary.join : Sheet._dictionary.leave);
                break;
        }
    } else {
        // 若沒有就新增
        switch (tabName) {
            case 'users':
                tabPage.appendRow([value, name, action === Sheet._dictionary.follow ? Sheet._dictionary.follow : Sheet._dictionary.unfollow])
                break;
            case 'groups':
                tabPage.appendRow([value, name, action === Sheet._dictionary.join ? Sheet._dictionary.join : Sheet._dictionary.leave])
                break;
        }
    }
}

/***************
 *  debug相關  *
 ***************/

Sheet._checkAllSheetTab = () => {
    Sheet._commandTabList.forEach((tab) => {
        const commandSheets = Sheet.commandSpeadSheet.getSheets();
        const isExist = commandSheets.some((sheet) => sheet.getName() === tab.name);
        if (!isExist) {
            const newTab = Sheet.commandSpeadSheet.insertSheet();
            newTab.setName(tab.name);
            const allName = Sheet.getALLSheetName(Sheet.commandSpeadSheet);
            const tabIndex = allName.findIndex((name) => name === tab.name);
            Sheet.commandSpeadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setValues([tab.title]);
            Sheet.commandSpeadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setHorizontalAlignment("center");
            Sheet.commandSpeadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setFontWeight("bold");
            // sheet.setColumnWidth(columnIndex, columnWidth);
            if(tab.name === Sheet._dictionary.users || tab.name === Sheet._dictionary.groups)
                Sheet.commandSpeadSheet.getSheets()[tabIndex].setColumnWidth(1, 260)
        }
    })
}

function checkDebugSheet() {
    const nowList = Sheet.debugSpeadSheet.getSheet().map((e, i) => ({name: e.name, index: i}));
    Sheet.debugSpeadSheet.getSheet().for((e) => {

    })
}


Sheet.getALLSheetName = function (sheet) {
    return sheet.getSheets().map((e) => e.getName());
}


function recordMember() {
    // Sheet._recordInfo('groups', Sheet._actionType.join, 'groupId', '12344', '梅子')
    Sheet._recordInfo('users', Sheet._dictionary.follow, 'userId', '12344', '梅子')
}

function checkAllSheet() {
    Sheet._checkAllSheetTab()
}

/**
 * debug紀錄
 * @param msg
 * @param stack
 */
Sheet.writeDebugLog = (msg, stack) => {
    const now = new Date();
    const formattedDateTime = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    Sheet.debugSpeadSheet.appendRow([formattedDateTime, msg, stack])
}
