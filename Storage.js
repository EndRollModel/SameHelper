const Storage = {}
// 流程是 先取得專案apiKey, 然後將裡面資訊做成jwt後
// 再走fierbase的auth去產生匿名使用者 之後再取用該匿名使用者去上傳圖片
/**
 * 建立jwt的機制
 * 認證的樣式 依照官方文件建立
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens?hl=zh-tw
 */
Storage._getUserToken = () => {
    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };
    const now = Date.now();
    const expires = new Date(now);
    expires.setHours(expires.getHours() + 1); // 一小時過期
    const payload = {
        iss: Config.clientEmail,
        sub: Config.clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: Math.round(now / 1000),
        exp: Math.round(expires.getTime() / 1000),
        uid: 'SameDesu',
        // claims:{}
    };

    let toSign = Utilities.base64Encode(JSON.stringify(header)) + '.' + Utilities.base64Encode(JSON.stringify(payload));
    // toSign = toSign.replace(/=+$/, ''); // 不用刪除此內容
    let key = Config.privatKey.replace(/\\n/g, '\n');
    const signatureBytes = Utilities.computeRsaSha256Signature(toSign, key);
    const signature = Utilities.base64Encode(signatureBytes);
    const jwtToken = toSign + '.' + signature;
    Logger.log(jwtToken)
    //取得使用者的token
    const baseUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${Config.projectApiKey}`
    const requestBody = {
        "token": jwtToken,
        "returnSecureToken": true
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestBody),
    };
    const response = UrlFetchApp.fetch(baseUrl, options);

    // 處理回應
    const responseData = JSON.parse(response.getContentText());
    return responseData.idToken;
}

/**
 * 上傳圖片的function
 */
Storage.uploadImage = (fileName, image) => {
    const uploadUserToken = Storage._getUserToken();
    try {
        const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${Config.bucketName}/o/${fileName}`
        const options = {
            method: 'post',
            headers: {
                'Authorization': `Bearer ${uploadUserToken}`,
                'Content-Type': 'application/octet-stream',
            },
            payload: image,
        };
        const response = UrlFetchApp.fetch(baseUrl, options);
        const responseData = JSON.parse(response.getContentText());
        if (!Object.hasOwn(responseData, 'bucket')) {
            return '';
        } else {
            return `https://firebasestorage.googleapis.com/v0/b/${responseData.bucket}/o/${responseData.name}?alt=media&token=${responseData.downloadTokens}`
        }
    } catch (e) {
        return JSON.stringify({ type: e.message, data: uploadUserToken, path: `https://firebasestorage.googleapis.com/v0/b/${Config.bucketName}/o/${fileName}` });
    }
}




