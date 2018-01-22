module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*" // Match any network id
        },
        rinkeby: {
          host: "localhost", // Connect to geth on the specified
          port: 8545,
          from: "0xAF54477348B0f1A5E4d054d6d13eA9A20ffBE8d4", // default address to use for any transaction Truffle makes during migrations
          network_id: 4,
          gas: 4612388 // Gas limit used for deploys
        }
    }
};
