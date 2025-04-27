import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';

Clarinet.test({
  name: "Ensure Property Registry initializes correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    // Verify initial total properties
    let totalPropertiesResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-total-properties', 
      [], 
      deployer.address
    );
    totalPropertiesResult.result.expectUint(0);
  }
});

Clarinet.test({
  name: "Validate property registration process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // Register a new property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Verify total properties increased
    let totalPropertiesResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-total-properties', 
      [], 
      deployer.address
    );
    totalPropertiesResult.result.expectUint(1);

    // Verify property details
    let propertyDetailsResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-property-details', 
      [types.uint(1)], 
      deployer.address
    );
    let propertyDetails = propertyDetailsResult.result.expectSome();
    
    // Check property details match input
    propertyDetails.expectTuple({
      owner: wallet1.address,
      location: types.ascii('123 Test Street'),
      price: types.uint(1000),
      status: types.uint(0),  // STATUS_AVAILABLE
      metadata: types.buff(Buffer.from('Additional property metadata'))
    });
  }
});

Clarinet.test({
  name: "Prevent property registration with invalid data",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    // Attempt to register property with empty location
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii(''),  // empty location
        types.uint(1000), // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectErr().expectUint(422); // Invalid data error

    // Attempt to register property with zero price
    let registerBlock2 = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(0),                   // zero price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock2.receipts[0].result.expectErr().expectUint(422); // Invalid data error
  }
});

Clarinet.test({
  name: "Validate property update process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Update property details
    let updateBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'update-property', [
        types.uint(1),                           // property ID
        types.some(types.ascii('456 Updated Street')),  // new location
        types.some(types.uint(2000)),            // new price
        types.some(types.uint(2)),               // new status (maintenance)
        types.some(types.buff(Buffer.from('Updated metadata')))  // new metadata
      ], wallet1.address)
    ]);
    updateBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify updated property details
    let propertyDetailsResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-property-details', 
      [types.uint(1)], 
      deployer.address
    );
    let propertyDetails = propertyDetailsResult.result.expectSome();
    
    // Check updated property details
    propertyDetails.expectTuple({
      owner: wallet1.address,
      location: types.ascii('456 Updated Street'),
      price: types.uint(2000),
      status: types.uint(2),  // maintenance status
      metadata: types.buff(Buffer.from('Updated metadata'))
    });
  }
});

Clarinet.test({
  name: "Prevent unauthorized property updates",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Attempt to update property by non-owner
    let updateBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'update-property', [
        types.uint(1),                           // property ID
        types.some(types.ascii('456 Updated Street')),  // new location
        types.some(types.uint(2000)),            // new price
        types.some(types.uint(2)),               // new status (maintenance)
        types.some(types.buff(Buffer.from('Updated metadata')))  // new metadata
      ], wallet2.address)
    ]);
    updateBlock.receipts[0].result.expectErr().expectUint(401); // Unauthorized error
  }
});

Clarinet.test({
  name: "Validate property removal process",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Remove the property
    let removeBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'remove-property', [
        types.uint(1)  // property ID
      ], wallet1.address)
    ]);
    removeBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify total properties decreased
    let totalPropertiesResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-total-properties', 
      [], 
      deployer.address
    );
    totalPropertiesResult.result.expectUint(0);

    // Verify property details no longer exist
    let propertyDetailsResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-property-details', 
      [types.uint(1)], 
      deployer.address
    );
    propertyDetailsResult.result.expectNone();
  }
});

Clarinet.test({
  name: "Prevent unauthorized property removal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Attempt to remove property by non-owner
    let removeBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'remove-property', [
        types.uint(1)  // property ID
      ], wallet2.address)
    ]);
    removeBlock.receipts[0].result.expectErr().expectUint(401); // Unauthorized error
  }
});

Clarinet.test({
  name: "Validate property ownership transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Transfer property ownership
    let transferBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'transfer-property-ownership', [
        types.uint(1),        // property ID
        wallet2.address       // new owner
      ], wallet1.address)
    ]);
    transferBlock.receipts[0].result.expectOk().expectBool(true);

    // Verify property ownership changed
    let propertyDetailsResult = chain.callReadOnlyFn(
      'property-registry', 
      'get-property-details', 
      [types.uint(1)], 
      deployer.address
    );
    let propertyDetails = propertyDetailsResult.result.expectSome();
    
    // Check new property owner
    propertyDetails.expectTuple({
      owner: wallet2.address,
      location: types.ascii('123 Test Street'),
      price: types.uint(1000),
      status: types.uint(0),  // STATUS_AVAILABLE
      metadata: types.buff(Buffer.from('Additional property metadata'))
    });
  }
});

Clarinet.test({
  name: "Prevent unauthorized property ownership transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;

    // First, register a property
    let registerBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'register-property', [
        types.ascii('123 Test Street'),  // location
        types.uint(1000),                // price
        types.buff(Buffer.from('Additional property metadata'))  // metadata
      ], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk().expectUint(1);

    // Attempt to transfer property by non-owner
    let transferBlock = chain.mineBlock([
      Tx.contractCall('property-registry', 'transfer-property-ownership', [
        types.uint(1),        // property ID
        wallet3.address       // new owner
      ], wallet2.address)
    ]);
    transferBlock.receipts[0].result.expectErr().expectUint(401); // Unauthorized error
  }
});