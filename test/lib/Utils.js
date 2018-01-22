
module.exports.getBalance = function (address) {
  return new Promise (function (resolve, reject) {
    web3.eth.getBalance(address, function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  })
}


module.exports.getGasPrice = function () {
  return new Promise (function (resolve, reject) {
    web3.eth.getGasPrice(function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  })
}