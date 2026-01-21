const Tools = {}

// SHA256無法對齊
Tools.calculateSHA256 = (input) => {
    // 計算 SHA-256 哈希值
    let rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);

    // 將字節數組轉換為十六進制字符串
    return rawHash.map(function (byte) {
        let hex = (byte < 0 ? byte + 256 : byte).toString(16); // 處理負數的情況
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    // let hexString = rawHash
    //     .map(function(byte) {
    //         // Convert from 2's compliment
    //         var v = (byte < 0) ? 256 + byte : byte;
    //
    //         // Convert byte to hexadecimal
    //         return ("0" + v.toString(16)).slice(-2);
    //     })
    //     .join("");
    return hexString
}
