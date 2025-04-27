import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';

Clarinet.test({
  name: "Validate booking process for a property",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for the renter
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Book the property
    let bookBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock.receipts[0].result.expectOk().expectUint(24000); // total cost

    // Verify rental agreement details
    let rentalDetailsResult = chain.callReadOnlyFn(
      'rental-agreement', 
      'get-rental-agreement', 
      [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], 
      deployer.address
    );
    let rentalDetails = rentalDetailsResult.result.expectSome();
    
    // Check rental agreement details
    rentalDetails.expectTuple({
      'total-cost': types.uint(24000),
      'token-contract': types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z'),
      'status': types.ascii('BOOKED'),
      'deposit-amount': types.uint(2400) // 10% of total cost
    });
  }
});

Clarinet.test({
  name: "Prevent booking an unavailable property",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for wallet2
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Mint tokens for wallet3
    let mintBlock2 = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet3.address)
      ], deployer.address)
    ]);
    mintBlock2.receipts[0].result.expectOk();

    // First booking by wallet2
    let bookBlock1 = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock1.receipts[0].result.expectOk();

    // Attempt to book the same property by wallet3 during the same period
    let bookBlock2 = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(110),      // start block (overlapping)
        types.uint(134),      // end block (overlapping)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet3.address)
    ]);
    bookBlock2.receipts[0].result.expectErr().expectUint(101); // Property not available
  }
});

Clarinet.test({
  name: "Validate booking cancellation process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for the renter
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Book the property
    let bookBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock.receipts[0].result.expectOk().expectUint(24000);

    // Cancel the booking
    let cancelBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'cancel-booking', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], wallet2.address)
    ]);
    cancelBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify rental agreement status
    let rentalDetailsResult = chain.callReadOnlyFn(
      'rental-agreement', 
      'get-rental-agreement', 
      [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], 
      deployer.address
    );
    let rentalDetails = rentalDetailsResult.result.expectSome();
    
    // Check rental agreement status is CANCELLED
    rentalDetails.expectTuple({
      'status': types.ascii('CANCELLED')
    });
  }
});

Clarinet.test({
  name: "Prevent unauthorized booking cancellation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for the renter
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Book the property
    let bookBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock.receipts[0].result.expectOk().expectUint(24000);

    // Attempt to cancel by a different user
    let cancelBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'cancel-booking', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], wallet3.address)
    ]);
    cancelBlock.receipts[0].result.expectErr().expectUint(100); // Unauthorized
  }
});

Clarinet.test({
  name: "Validate booking completion process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for the renter
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Book the property
    let bookBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock.receipts[0].result.expectOk().expectUint(24000);

    // Complete the booking (by either renter or property owner)
    let completeBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'complete-booking', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], wallet1.address)
    ]);
    completeBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify rental agreement status
    let rentalDetailsResult = chain.callReadOnlyFn(
      'rental-agreement', 
      'get-rental-agreement', 
      [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], 
      deployer.address
    );
    let rentalDetails = rentalDetailsResult.result.expectSome();
    
    // Check rental agreement status is COMPLETED
    rentalDetails.expectTuple({
      'status': types.ascii('COMPLETED')
    });
  }
});

Clarinet.test({
  name: "Prevent unauthorized booking completion",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;

    // First, register a property in the Property Registry
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price per night
        types.buff(Buffer.from('Property details'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Mint some tokens for the renter
    let mintBlock = chain.mineBlock([
      Tx.contractCall('bitnest-token', 'mint', [
        types.uint(10000),
        types.principal(wallet2.address)
      ], deployer.address)
    ]);
    mintBlock.receipts[0].result.expectOk();

    // Book the property
    let bookBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'book-property', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.uint(124),      // end block (24 nights)
        types.uint(1000),     // daily rate
        types.principal('ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z') // mock token contract
      ], wallet2.address)
    ]);
    bookBlock.receipts[0].result.expectOk().expectUint(24000);

    // Attempt to complete booking by unauthorized party
    let completeBlock = chain.mineBlock([
      Tx.contractCall('rental-agreement', 'complete-booking', [
        types.uint(1),        // property ID
        types.uint(100),      // start block
        types.principal(wallet2.address)  // renter
      ], wallet3.address)
    ]);
    completeBlock.receipts[0].result.expectErr().expectUint(100); // Unauthorized
  }
});