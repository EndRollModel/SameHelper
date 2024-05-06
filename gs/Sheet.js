const Sheet = {}

// module
// 錯誤的內容就寫入到debug的列表
// getRange(row, column, numRows, numColumns)
Sheet.debugSpreadSheet = SpreadsheetApp.openById(Config.debugSheetId);
Sheet.commandSpreadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 指令表的內容
Sheet._commandTabList = [
    {name: 'command', title: ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'history', 'status']}, //
    {name: 'temp', title: ['command', 'date', 'userId', 'groupId', 'status']}, //
    {name: 'record', title: ['keyword', 'date', 'userId', 'groupId']}, //
    {name: 'users', title: ['userId', 'userName', 'status']},
    {name: 'groups', title: ['groupId', 'groupName', 'status']},
];
Sheet._debugTabList = [
    {name: 'debug', title: ['date', 'msg', 'stack']}
];
// 做key值呼叫而已 為了避免直接打字串打錯
Sheet.Dictionary = {
    COMMAND: 'command',
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
    JOIN: 'join',
    LEAVE: 'leave',
    USERS: 'users',
    GROUPS: 'groups',
    USERID: 'userId',
    GROUPID: 'groupId',
    HISTORY: 'history',
    STATUS: 'status',
    TEMP: 'temp',
    TYPE: 'type',
    INFO: 'info',
}

Sheet.COMMAND_TYPE = {
    TEXT: 'text',
    IMAGE: 'image',
}

/**************
 *            *
 **************/
Sheet.writeRecord = (type, info) => {
    // join, leave, follow, unfollow
    // info {id, name}
    switch (type) {
        case 'join':
            Sheet._eventRecord(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id, info.name)
            break;
        case 'leave':
            Sheet._eventRecord(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id)
            break;
        case 'follow':
            Sheet._eventRecord(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id, info.name)
            break;
        case 'unfollow':
            Sheet._eventRecord(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id)
            break;
    }
}
////

Sheet.searchTempValue = (userId, groupId) => {
    const tabIndex = Sheet.getALLSheetName(Sheet.commandSpreadSheet).findIndex((e) => e === Sheet.Dictionary.TEMP);
    const tabPage = Sheet.commandSpreadSheet.getSheets()[tabIndex]; // 先找到sheet
}


Sheet.writeTempData = (userId, groupId = '') => {
    const tabIndex = Sheet.getALLSheetName(Sheet.commandSpreadSheet).findIndex((e) => e === Sheet.Dictionary.TEMP);
    Sheet.commandSpreadSheet.getSheets()[tabIndex]
}


/**
 * 搜尋是否已經有該指令
 * @param command 指令名稱
 * @param type 指令的類型(text, image)
 * @param userId 使用者id
 * @param groupId 群組id
 */
Sheet.searchCommand = (command, type = '', userId, groupId) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((elem) => {
        const commandIndex = titleList.findIndex((e) => e === Sheet.Dictionary.COMMAND);
        const typeIndex = titleList.findIndex((e) => e === Sheet.Dictionary.TYPE);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID);
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        if (type === '' || type === null) {
            return (elem.target[commandIndex] === command &&
                elem.target[userIndex] === userId &&
                elem.target[groupIndex] === groupId)
        } else {
            return (elem.target[commandIndex] === command &&
                elem.target[userIndex] === userId &&
                elem.target[typeIndex] === userId &&
                elem.target[groupIndex] === groupId)
        }
    });
    if (filter.length > 0) {
        const returnData = {}
        filter[0].target.forEach((e, i)=>{
            returnData[titleList[i]] = e
        })
        returnData.index = filter[0].index;
        // return filter;
        return returnData;
    } else {
        return {}
    }
}

/**
 * 新增新的指令
 * @param command 指令名稱
 * @param type 類別(text, image)
 * @param tag 如果有tag
 * @param info 指令的內容
 * @param userId 使用者id
 * @param groupId 群組id
 */
Sheet.appendCommand = (command, type, tag, info, userId, groupId) => {
    // ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'history', 'status']
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    tabPage.appendRow([command, type, tag, info, userId, groupId, '', true.toString()]);
}

Sheet.editCommand = (command, type, tag, info, index) => {

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
Sheet._eventRecord = (tabName, action, key, value, name = '') => {
    // const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e) => e === tabName);
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, tabName);
    const searchValue = Sheet._searchKeyValues(tabPage, key)
    if (searchValue.includes(value)) {
        // 若有就先檢查狀態 然後更換狀態
        const rowIndex = searchValue.findIndex((e) => e === value) + 2;
        // const statusIndex = titleList.findIndex((e) => e === 'status') + 1;
        const tabIndex = Sheet._commandTabList.findIndex((tab) => tab.name === tabName);
        const statusIndex = Sheet._commandTabList[tabIndex].title.findIndex((e) => e === Sheet.Dictionary.STATUS) + 1
        switch (tabName) {
            case 'users':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet.Dictionary.FOLLOW ? Sheet.Dictionary.FOLLOW : Sheet.Dictionary.UNFOLLOW);
                break;
            case 'groups':
                tabPage.getRange(rowIndex, statusIndex, 1, 1).setValue(action === Sheet.Dictionary.JOIN ? Sheet.Dictionary.JOIN : Sheet.Dictionary.LEAVE);
                break;
        }
    } else {
        // 若沒有就新增
        switch (tabName) {
            case 'users':
                tabPage.appendRow([value, name, action === Sheet.Dictionary.FOLLOW ? Sheet.Dictionary.FOLLOW : Sheet.Dictionary.UNFOLLOW])
                break;
            case 'groups':
                tabPage.appendRow([value, name, action === Sheet.Dictionary.JOIN ? Sheet.Dictionary.JOIN : Sheet.Dictionary.LEAVE])
                break;
        }
    }
}

/***************
 *  debug相關  *
 ***************/


function checkDebugSheet() {
    const nowList = Sheet.debugSpreadSheet.getSheet().map((e, i) => ({name: e.name, index: i}));
    Sheet.debugSpreadSheet.getSheet().for((e) => {

    })
}

/**
 * 取得某張表內的key下的所有值
 * @param tabPage
 * @param key
 * @returns {FlatArray<*, 1>[]}
 * @private
 */
Sheet._searchKeyValues = (tabPage, key) => {
    const titleList = tabPage.getRange(1, 1, 1, tabPage.getLastColumn()).getDisplayValues()[0]; // 取得標題
    const titleListIndex = titleList.findIndex((e) => e === key) + 1;
    return tabPage.getRange(2, titleListIndex, (tabPage.getLastRow() - 1 === 0) ? 1 : tabPage.getLastRow(), 1).getDisplayValues().flat();
}

/**
 * 取得所有表的名稱
 * @param sheet
 * @returns {*}
 */
Sheet.getALLSheetName = function (sheet) {
    return sheet.getSheets().map((e) => e.getName());
}

/**
 * 取得該表
 * @param sheet
 * @returns {*}
 */
Sheet.getSheetTab = function (sheet, tabName) {
    const nameList = sheet.getSheets().map((e) => e.getName());
    const tabNameIndex = nameList.findIndex((e) => e === tabName)
    return sheet.getSheets()[tabNameIndex]
}

/**
 * debug紀錄
 * @param msg
 * @param stack
 */
Sheet.writeDebugLog = (msg, stack) => {
    const now = new Date();
    const formattedDateTime = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd HH:mm:ss");
    Sheet.debugSpreadSheet.appendRow([formattedDateTime, msg, stack])
}

/**
 * 根據名單建立tab與title
 * @private
 */
Sheet._checkAllSheetTab = () => {
    Sheet._commandTabList.forEach((tab) => {
        const commandSheets = Sheet.commandSpreadSheet.getSheets();
        const isExist = commandSheets.some((sheet) => sheet.getName() === tab.name);
        if (!isExist) {
            const newTab = Sheet.commandSpreadSheet.insertSheet();
            newTab.setName(tab.name);
            const allName = Sheet.getALLSheetName(Sheet.commandSpreadSheet);
            const tabIndex = allName.findIndex((name) => name === tab.name);
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setValues([tab.title]);
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setHorizontalAlignment("center");
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(1, 1, 1, tab.title.length).setFontWeight("bold");
            // sheet.setColumnWidth(columnIndex, columnWidth);
            if (tab.name === Sheet.Dictionary.USERS || tab.name === Sheet.Dictionary.GROUPS)
                Sheet.commandSpreadSheet.getSheets()[tabIndex].setColumnWidth(1, 260)
        }
    })
}


/**************/
function recordMember() {
    // Sheet._recordInfo('groups', Sheet._actionType.join, 'groupId', '12344', '梅子')
    // Sheet._recordInfo('users', Sheet._dictionary.follow, 'userId', '12344', '梅子')
}

function checkAllSheet() {
    Sheet._checkAllSheetTab()
}

/**************/
