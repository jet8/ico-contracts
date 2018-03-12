# Jet8 Token Sale

## FAQ

**- What is the distribution of the Jet8 Tokens?**

Jet8 token holds a total supply of 1,500,000,000 JT8. This is a finite amount with no ability to mint more. It has 8 decimals, and the smallest unit are named lucky.

**- What is the token distribution?**

The token sale holds a 30% of the total supply (450,000,000 JT8). The foundation holds the 45% of the token sale, 12% goes to the team, 11% to the advisors and 2% to bounty program.


## Smart Contracts

#### Crowdsale
The crowdsale smart contract handles the token sale:
  - Only whitelisted people can buy tokens
  - There is a minimum and maximum eth contribution
  - The token sale can only accept public sales between the start and end date.
  - Presale and strategic partner allocations can be added manually through the smart contract.
  - It is possible to revoke a presale allocation.
  - All property setters can only be executed by the admin of the contract.
  - Contributors will receive their tokens when the token sale is finished.
  - Tokens not sold will be burned at the end of the token sale.

#### Ledger
The ledger smart contract allocates all the token sale contributions, strategic, presale and public contributions.
  - Presale contributors have to claim their tokens with the same eth wallet they did the contribution.
  - Presale contributors will be able to claim their tokens after a defined period.
  - Strategic parters, presale and public contributors have different lockout periods.
  - A Strategic partner can contrbute on the presale, and public phases.
  - All property setters can only be executed by the admin of the contract.
  
#### Custodian
The custodian smart contract allocates the team, advisors and bounty tokens.
  - Tokens can only be transfered to a wallet by the admin.
  - Team can only use their 12% of the token distribution.
  - Advisors can only use their 11% of the token distribution.
  - Bounty can only use their 2% of the tokendistribution.




