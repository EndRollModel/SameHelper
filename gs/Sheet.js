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
// 做key值呼叫而已 為了避免直接打字串打錯
Sheet.Dictionary = {
    FOLLOW: 'follow',
    UNFOLLOW: 'unfollow',
    JOIN: 'join',
    LEAVE: 'leave',
    USERS: 'users',
    GROUPS: 'groups',
    USERID: 'userId',
    GROUPID: 'groupId',
    TEMP: 'temp',
}

/**************
 *            *
 **************/
Sheet.writeRecord = (type, info) => {
    // join, leave, follow, unfollow
    // info {id, name}
    switch (type) {
        case 'join':
            Sheet._recordInfo(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id, info.name)
            break;
        case 'leave':
            Sheet._recordInfo(Sheet.Dictionary.GROUPS, type, Sheet.Dictionary.GROUPID, info.id)
            break;
        case 'follow':
            Sheet._recordInfo(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id, info.name)
            break;
        case 'unfollow':
            Sheet._recordInfo(Sheet.Dictionary.USERS, type, Sheet.Dictionary.USERID, info.id)
            break;
    }
}
////

Sheet.searchTempValue = (userId, groupId) => {
    const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e) => e === Sheet.Dictionary.TEMP);
    const tabPage = Sheet.commandSpeadSheet.getSheets()[tabIndex]; // 先找到sheet
}


Sheet.writeTempData = (userId, groupId = '') => {
    const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e)=> e === Sheet.Dictionary.TEMP);
    Sheet.commandSpeadSheet.getSheets()[tabIndex]
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
    // const tabIndex = Sheet.getALLSheetName(Sheet.commandSpeadSheet).findIndex((e) => e === tabName);
    const tabPage = Sheet.getSheetTab(Sheet.commandSpeadSheet, tabName);
    const searchValue = Sheet._searchKeyValues(tabPage, key)
    if (searchValue.includes(value)) {
        // 若有就先檢查狀態 然後更換狀態
        const rowIndex = searchValue.findIndex((e) => e === value) + 2;
        const statusIndex = titleList.findIndex((e) => e === 'status') + 1;
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
    const nowList = Sheet.debugSpeadSheet.getSheet().map((e, i) => ({name: e.name, index: i}));
    Sheet.debugSpeadSheet.getSheet().for((e) => {

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
    const titleList = tabPage.getRange(1, 1, 1, tabPage.getLastColumn()).getDisplayValues()[0];
    const titleListIndex = titleList.findex((e) => e === key);
    return tabPage.getRange(2, titleListIndex + 1, tabPage.getLastRow(), 1).getDisplayValues().flat();
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
Sheet.getSheetTab = function (sheet, tabName){
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
    Sheet.debugSpeadSheet.appendRow([formattedDateTime, msg, stack])
}

/**
 * 根據名單建立tab與title
 * @private
 */
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
            if (tab.name === Sheet.Dictionary.USERS || tab.name === Sheet.Dictionary.GROUPS)
                Sheet.commandSpeadSheet.getSheets()[tabIndex].setColumnWidth(1, 260)
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
