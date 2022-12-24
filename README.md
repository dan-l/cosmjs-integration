# CosmJS 
`npm run start` uses Cosmos Testnet 
`npm run local` uses local build SIMD

## How to get local SIMD up and running
https://tutorials.cosmos.network/tutorials/3-run-node/#compile-simapp

- Inspect initial config `cat ~/.simapp/config/genesis.json`
- Create an account `./simd keys add <name>`
- Add genesis account as validator `./simd add-genesis-account <name> 100000000stake`
- Query balance `$ ./simd query bank balances $(./simd keys show <name> -a)`
- Transfer `$ ./simd tx bank send $(./simd keys show <acc1> -a) $(./simd keys show <acc2> -a) 10stake --chain-id <chain-id>`