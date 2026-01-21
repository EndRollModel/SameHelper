const Dice = {}

// trpg骰子 O D O (前面是幾面骰, 後面是骰幾次)
Dice.startDice = function (msg, prefix) {
    const numList = msg.split(prefix);
    const startNum = parseInt(numList[0]);
    const endNum = parseInt(numList[1]);
    const finList = [];
    if (_isNumber(startNum) && _isNumber(endNum)) {
        for (let i = 0; i < startNum; i++) {
            finList.push(Math.floor(Math.random() * endNum) + 1);
        }
        return finList.toString()
    } else {
        return null;
    }
}

_isNumber = function(obj){
    return typeof obj === 'number' && obj % 1 === 0;
}
