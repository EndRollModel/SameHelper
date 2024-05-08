const Sheet = {}

// module
// 錯誤的內容就寫入到debug的列表
// getRange(row, column, numRows, numColumns)
Sheet.debugSpreadSheet = SpreadsheetApp.openById(Config.debugSheetId);
Sheet.commandSpreadSheet = SpreadsheetApp.openById(Config.commandSheetId);

// 寫入指令的時間
Sheet._tempDelayTime = 30 * 1000;

// 指令表的內容
Sheet._commandTabList = [
    {name: 'command', title: ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'history', 'status']}, //
    {name: 'temp', title: ['command', 'tag', 'date', 'userId', 'groupId', 'status']}, //
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
    DATE: 'date',
    TAG: 'tag',
}

Sheet.COMMAND_TYPE = {
    TEXT: 'text',
    IMAGE: 'image',
}

/**************
 *   handler  *
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

// Sheet.searchTempValue = (userId, groupId) => {
//     const tabIndex = Sheet.getALLSheetName(Sheet.commandSpreadSheet).findIndex((e) => e === Sheet.Dictionary.TEMP);
//     const tabPage = Sheet.commandSpreadSheet.getSheets()[tabIndex]; // 先找到sheet
// }
//
//
// Sheet.writeTempData = (userId, groupId = '') => {
//     const tabIndex = Sheet.getALLSheetName(Sheet.commandSpreadSheet).findIndex((e) => e === Sheet.Dictionary.TEMP);
//     Sheet.commandSpreadSheet.getSheets()[tabIndex]
// }


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

/**************
 *    Temp    *
 *************/
// 時間超過或是狀態關閉都不予搜尋
Sheet.searchTemp = (command, date, userId, groupId) => {
    // 檢查時間
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((e) => {
        const commandIndex = titleList.findIndex((e) => e === Sheet.Dictionary.COMMAND)
        const dateIndex = titleList.findIndex((e) => e === Sheet.Dictionary.DATE);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID)
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        if (command === '') {
            // 圖片上傳的時候要檢查這裡 確認上傳者與群組為同一地點 並且時間小於時限
            return parseFloat(e.target[dateIndex]) > date && e.target[userIndex] === userId && e.target[groupIndex] === groupId
        } else {
            // 一般檢查用的 一定會有指令
            if (groupId !== '') {
                // 如果是群組上傳的 主要檢查群組的內容
                return e.target[commandIndex] === command &&
                    parseFloat(e.target[dateIndex]) > date &&
                    e.target[groupIndex] === groupId
            } else {
                // 如果為使用者上傳的 僅檢查上傳者
                return e.target[commandIndex] === command &&
                    parseFloat(e.target[dateIndex]) > date &&
                    e.target[userIndex] === userId
            }
        }
    });
    if (filter.length > 0) {
        const returnData = {};
        filter[0].target.forEach((e, i) => {
            returnData[titleList[i]] = e
        })
        returnData.index = filter[0].index;
        return returnData;
    } else {
        return {};
    }
}

/**
 * 寫入暫存
 * @param command
 * @param tag
 * @param date
 * @param userId
 * @param groupId
 * @return {`請於${number}秒內上傳圖片 指令才會建立。`}
 */
Sheet.appendTemp = (command, tag, date, userId, groupId) => {
    // 根據
    // command tag date userId	groupId	status
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    tabPage.appendRow([command.toString(), tag.toString(), date + Sheet._tempDelayTime, userId, groupId, true.toString()])
    return `接收到上傳指令 請於${Sheet._tempDelayTime / 1000}秒內上傳圖片。`
}

/**
 * 更替狀態
 * @param index
 */
Sheet.editTempStatus = (index) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.TEMP);
    const dateNameIndex = Sheet._commandTabList.findIndex((tab) => tab.name === Sheet.Dictionary.TEMP);
    const tabNameList = Sheet._commandTabList[dateNameIndex].title
    const dateColIndex = tabNameList.findIndex((e) => e === Sheet.Dictionary.DATE);
    tabPage.getRange(index + 1, dateColIndex + 1, 1, 1).setValue(-1);
}

/***************
 *   command   *
 **************/

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
            // type為空時 為custom指令 僅搜尋來源指令與上傳者
            if (groupId !== '') {
                return (elem.target[commandIndex] === command &&
                    elem.target[groupIndex] === groupId)
            } else {
                return (elem.target[commandIndex] === command &&
                    elem.target[userIndex] === userId)
            }
        } else {
            // 新增指令時需要查詢是否有對應的種類內容
            if (groupId !== '') {
                return (elem.target[commandIndex] === command &&
                    elem.target[groupIndex] === groupId)
            } else {
                return (elem.target[commandIndex] === command &&
                    elem.target[userIndex] === userId)
            }
        }
    });
    if (filter.length > 0) {
        const returnData = {}
        filter[0].target.forEach((e, i) => {
            returnData[titleList[i]] = e
        })
        returnData.index = filter[0].index;
        return returnData;
    } else {
        return {}
    }
}

/**
 * 抽選tag的所有內容
 * @param tag
 * @param userId
 * @param groupId
 * @return {{}}
 */
Sheet.searchTagData = (tag, userId, groupId) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    const allData = tabPage.getRange(1, 1, tabPage.getLastRow(), tabPage.getLastColumn()).getDisplayValues();
    const newData = allData.map((target, index) => ({target, index}));
    const titleList = newData[0].target;
    const filter = newData.filter((elem) => {
        const tagIndex = titleList.findIndex((e) => e === Sheet.Dictionary.TAG);
        const userIndex = titleList.findIndex((e) => e === Sheet.Dictionary.USERID);
        const groupIndex = titleList.findIndex((e) => e === Sheet.Dictionary.GROUPID);
        // 新增指令時需要查詢是否有對應的種類內容
        if (groupId !== '') {
            return (elem.target[tagIndex] === tag &&
                elem.target[groupIndex] === groupId)
        } else {
            return (elem.target[tagIndex] === tag &&
                elem.target[userIndex] === userId)
        }
    });
    if (filter.length > 0) {
        const returnData = []
        // {target : [], index : }
        filter.forEach((fer)=>{
            const returnObject = {}
            fer.target.forEach((e, i)=>{
                returnObject[titleList[i]] = e
            })
            returnData.push(returnObject)
        });
        // filter[0].target.forEach((e, i) => {
        //     returnData[titleList[i]] = e
        // })
        // returnData.index = filter[0].index;
        return returnData;
    } else {
        return []
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
 * @return {String}
 */
Sheet.appendCommand = (command, type, tag, info, userId, groupId) => {
    // ['command', 'type', 'tag', 'info', 'userId', 'groupId', 'history', 'status']
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    if (groupId !== '') {
        tabPage.appendRow([command.toString(), type, tag.toString(), info.toString(), '', groupId, '', true.toString()]);
    } else {
        tabPage.appendRow([command.toString(), type, tag.toString(), info.toString(), userId, groupId, '', true.toString()]);
    }
    const checkFormula = `${Command._trySymbol}=`
    return `新增指令：[${command.startsWith(checkFormula) ? command.replace("'", '') : command}] 完成`
}

/**
 * 修改指令
 * @param command 指令名稱
 * @param type 種類
 * @param tag tag:如果有的畫
 * @param info 內容
 * @param index 第幾個index
 * @param userId userId
 * @param groupId groupId
 * @return {String}
 */
Sheet.editCommand = (command, type, tag, info, index, userId, groupId) => {
    const tabPage = Sheet.getSheetTab(Sheet.commandSpreadSheet, Sheet.Dictionary.COMMAND);
    if (groupId !== '') {
        tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), '', groupId, '', true.toString()]])
    } else {
        tabPage.getRange(index + 1, 1, 1, tabPage.getLastColumn()).setValues([[command.toString(), type, tag.toString(), info.toString(), userId, groupId, '', true.toString()]])
    }
    const checkFormula = `${Command._trySymbol}=`
    return `修改指令：[${command.startsWith(checkFormula) ? command.replace("'", '') : command}] 完成`;
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
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(2, 1, Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxRows(), Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxColumns()).setNumberFormat("@");
            Sheet.commandSpreadSheet.getSheets()[tabIndex].getRange(2, 1, Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxRows(), Sheet.commandSpreadSheet.getSheets()[tabIndex].getMaxColumns()).setHorizontalAlignment("center");
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
