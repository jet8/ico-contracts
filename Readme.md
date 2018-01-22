# Truffle

##Basic commands

To build the contracts and deploy it on the develop blockchain.

```
truffle develop
>compile
>migrate
```
See below for continue reading about console and develop blockchain.

> run tests 
```
truffle develop
test
```
Or from the bash simply
```
truffle test
```

> How to change the account which deploy the contract on tests.

This posts explains the configuration and logic of truffle.
[Stack Exchange](https://ethereum.stackexchange.com/questions/17441/how-to-choose-an-account-to-deploy-a-contract-in-truffle)

> Interact with Coins with a Small Dapp

To interact with the coin install metamask and import the keywords from truffle to metamask DEN.
```
npm run dev
```
This will open a small app to make transaction between accounts. The first of the 10 account has the token balance. You can play around with the other ones.

## Interact with the contracts with truffle on the console

After running migrations you will have on the console the coins token on JumboToken variable.
> To get the balance of an account
```
JumboToken.deployed().then(function(instance){return instance.balanceOf("0x627306090abab3a6e1400e9345bc60c78a8bef57")}).then(function(balance){return balance.toNumber()});
```
> To make a transfer from who deployed the contract

```
JumboToken.deployed().then(function(instance){return instance.transfer("0xf17f52151ebef6c7334fad080c5704d77216b732", 100)});
JumboToken.deployed().then(function(instance){return instance.balanceOf("0xf17f52151ebef6c7334fad080c5704d77216b732")}).then(function(balance){return balance.toNumber()});
```

You can debug the transaction copy the transaction address and:
```
debug "@transaction"
```
NOTE: By some reason debug is not working really properly.

> To make transfer from another account.

To see the accounts.
```
var accounts;
web3.eth.getAccounts(function(err,res) { accounts = res; });
console.log(accounts);
```
Select one and:
```
JumboToken.deployed().then(function(instance){return instance.transfer("0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef", 50, {from: "0xf17f52151ebef6c7334fad080c5704d77216b732"})});
```

## Interacting with Mist
Open the console:
```
/Applications/Mist.app/Contents/MacOS/Mist --rpc http://localhost:9545 --swarmurl="http://swarm-gateways.net"
```
IMPORTANT: There is issue open in this case: 
[Github](https://github.com/ethereum/mist/issues/2959)
That's why is needed the ```swarmurl``` param. Seems so kind a simple workaround. Swarm is the service to share storage.

Run the testrpc with log: ```truffle develop --log```. So the network can be accesible without reseting.
In that way, if you run ```truffle develop``` or any commands will work with the same testrpc.

## Deploying token contract into Rinkeby testNet
```
geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal --unlock="0x648767be0c17F4C8634c35c14cAB2A1E1E28Dad0"
/Applications/Mist.app/Contents/MacOS/Mist --rpc http://localhost:8545 --swarmurl="http://swarm-gateways.net"
truffle migrate --network rinkeby --reset
```
NOTE: look truffle.js for the account owner.

Once deployed, copy the @ of the contract of the token. On Mist >> Contracts >> Custom Tokens >> Watch Token >> and paste it on the "Token Contract Address". Automatic should retrieve and auto fill name symbol. 





 