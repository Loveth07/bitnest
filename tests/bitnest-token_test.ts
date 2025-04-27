import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';

Clarinet.test({
  name: "Ensure BitNest Token contract initializes correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Check initial token metadata
    let nameResult = chain.callReadOnlyFn('bitnest-token', 'get-name', [], deployer.address);
    nameResult.result.expectAscii('BitNest Token');

    let symbolResult = chain.callReadOnlyFn('bitnest-token', 'get-symbol', [], deployer.address);
    symbolResult.result.expectAscii('BNST');

    let decimalsResult = chain.callReadOnlyFn('bitnest-token', 'get-decimals', [], deployer.address);
    decimalsResult.result.expectUint(8);

    let totalSupplyResult = chain.callReadOnlyFn('bitnest-token', 'get-total-supply', [], deployer.address);
    totalSupplyResult.result.expectUint(0);
  }
});

Clarinet.test({
  name: "Validate token minting process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // Mint tokens to wallet1 by deployer
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(1000),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify balance after minting
    let balanceResult = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet1.address)], 
      deployer.address
    );
    balanceResult.result.expectUint(1000);

    // Verify total supply increased
    let totalSupplyResult = chain.callReadOnlyFn('bitnest-token', 'get-total-supply', [], deployer.address);
    totalSupplyResult.result.expectUint(1000);
  }
});

Clarinet.test({
  name: "Prevent unauthorized minting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    // Attempt to mint by non-deployer
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(1000),
        types.principal(wallet1.address)
      ], wallet1.address)
    ]);
    mintBlock.receipts[0].result.expectErr().expectUint(1); // Unauthorized error
  }
});

Clarinet.test({
  name: "Validate token transfer functionality",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // Mint initial tokens
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(1000),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Transfer tokens from wallet1 to wallet2
    let transferBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'transfer', [
        types.uint(500),
        types.principal(wallet1.address),
        types.principal(wallet2.address),
        types.none()
      ], wallet1.address)
    ]);
    transferBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify balances after transfer
    let wallet1Balance = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet1.address)], 
      deployer.address
    );
    wallet1Balance.result.expectUint(500);

    let wallet2Balance = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet2.address)], 
      deployer.address
    );
    wallet2Balance.result.expectUint(500);
  }
});

Clarinet.test({
  name: "Prevent transfer with insufficient balance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // Mint initial tokens
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(500),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Attempt to transfer more than balance
    let transferBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'transfer', [
        types.uint(1000),
        types.principal(wallet1.address),
        types.principal(wallet2.address),
        types.none()
      ], wallet1.address)
    ]);
    transferBlock.receipts[0].result.expectErr().expectUint(2); // Insufficient balance
  }
});

Clarinet.test({
  name: "Validate token burning process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // Mint initial tokens
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(1000),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Burn tokens
    let burnBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'burn', [
        types.uint(500),
        types.principal(wallet1.address)
      ], wallet1.address)
    ]);
    burnBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify balance after burning
    let balanceResult = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet1.address)], 
      deployer.address
    );
    balanceResult.result.expectUint(500);

    // Verify total supply decreased
    let totalSupplyResult = chain.callReadOnlyFn('bitnest-token', 'get-total-supply', [], deployer.address);
    totalSupplyResult.result.expectUint(500);
  }
});

Clarinet.test({
  name: "Prevent unauthorized token burning",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // Mint initial tokens
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(1000),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Attempt to burn tokens from another account
    let burnBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'burn', [
        types.uint(500),
        types.principal(wallet1.address)
      ], wallet2.address)
    ]);
    burnBlock.receipts[0].result.expectErr().expectUint(1); // Unauthorized
  }
});

Clarinet.test({
  name: "Validate multiple token transfers",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;

    // Mint initial tokens
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(3000),
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Transfer to multiple recipients
    let multiTransferBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'transfer-multiple', [
        types.list([
          types.tuple({ to: wallet2.address, amount: types.uint(1000) }),
          types.tuple({ to: wallet3.address, amount: types.uint(1000) })
        ])
      ], wallet1.address)
    ]);
    multiTransferBlock.receipts[0].result.expectOk();

    // Verify balances after multiple transfers
    let wallet1Balance = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet1.address)], 
      deployer.address
    );
    wallet1Balance.result.expectUint(1000);

    let wallet2Balance = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet2.address)], 
      deployer.address
    );
    wallet2Balance.result.expectUint(1000);

    let wallet3Balance = chain.callReadOnlyFn(
      'bitnest-token', 
      'get-balance', 
      [types.principal(wallet3.address)], 
      deployer.address
    );
    wallet3Balance.result.expectUint(1000);
  }
});

Clarinet.test({
  name: "Validate contract owner change functionality",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // Change contract owner by deployer
    let changeOwnerBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'change-contract-owner', [
        types.principal(wallet1.address)
      ], deployer.address)
    ]);
    changeOwnerBlock.receipts[0].result.expectOk().expectBool(true);

    // Attempt to change owner by previous deployer should fail
    let invalidChangeOwnerBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'change-contract-owner', [
        types.principal(deployer.address)
      ], deployer.address)
    ]);
    invalidChangeOwnerBlock.receipts[0].result.expectErr().expectUint(1); // Unauthorized
  }
});