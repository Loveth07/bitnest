# BitNest - Decentralized Property Rental Platform

BitNest is a decentralized property rental platform built on the Stacks blockchain. It provides a secure and transparent way for property owners to list their properties and for renters to book and pay for their stays using tokenized payments.

## Project Overview

BitNest aims to revolutionize the property rental industry by leveraging the benefits of blockchain technology. The platform allows property owners to register their properties, set rental rates, and manage bookings, while renters can browse available properties, make secure bookings, and pay using the BitNest Token (BNST).

Key features of the BitNest platform include:

- **Decentralized Property Registry**: Maintain a secure and transparent record of registered properties on the Stacks blockchain.
- **Tokenized Rental Payments**: Utilize the BitNest Token (BNST) for all rental payments, enabling secure and efficient transactions.
- **Automated Booking and Cancellation**: Streamline the booking process with secure, contract-based rental agreements and cancellation policies.
- **Dispute Resolution**: Provide a decentralized mechanism for resolving disputes between property owners and renters.

## Contract Architecture

The BitNest platform consists of three main Clarity smart contracts:

1. **BitNest Token (BNST)**: This contract implements the SIP-010 fungible token standard, providing the necessary functionality for minting, transferring, and burning tokens. It also includes access control mechanisms to manage minting permissions.

2. **Property Registry**: This contract manages the registration, updating, and removal of properties on the BitNest platform. It maintains the details of each registered property, including the owner, location, price, and status.

3. **Rental Agreement**: This contract handles the booking, cancellation, and completion of rental agreements. It coordinates with the Property Registry and BitNest Token contracts to ensure secure and transparent rental management.

The contracts use various data structures, such as maps and variables, to store and retrieve relevant information. They also implement robust authorization checks and security measures to protect against unauthorized access and potential vulnerabilities.

## Installation & Setup

To set up the BitNest platform, you'll need the following prerequisites:

- [Clarinet](https://github.com/hirosystems/clarinet) - A Clarity smart contract development and testing tool.
- [Stacks CLI](https://docs.stacks.co/develop/stacks-cli) - The command-line interface for interacting with the Stacks blockchain.

Follow these steps to install and configure the BitNest platform:

1. Clone the BitNest repository:
   ```
   git clone https://github.com/your-username/bitnest.git
   cd bitnest
   ```

2. Install the required dependencies:
   ```
   npm install -g clarinet
   ```

3. Configure the Clarinet environment:
   ```
   clarinet configure
   ```

4. Build and deploy the contracts:
   ```
   clarinet build
   clarinet deploy
   ```

That's it! You're now ready to start using the BitNest platform.

## Usage Guide

Here are some examples of how to interact with the BitNest platform:

### Registering a Property

```clarity
(contract-call? 'property-registry register-property
  "123 Test Street"  ;; location
  1000              ;; price per night
  0x12345678        ;; metadata)
```

### Booking a Property

```clarity
(contract-call? 'rental-agreement book-property
  1                  ;; property ID
  100                ;; start block
  124                ;; end block (24 nights)
  1000               ;; daily rate
  'ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z) ;; token contract
```

### Canceling a Booking

```clarity
(contract-call? 'rental-agreement cancel-booking
  1                  ;; property ID
  100                ;; start block
  'ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z) ;; renter
```

### Completing a Booking

```clarity
(contract-call? 'rental-agreement complete-booking
  1                  ;; property ID
  100                ;; start block
  'ST1PQHQKV0RJXZFY1GL3ZEDKNDQZ1DELAY9D2SB0Z) ;; renter
```

For more detailed examples and information, please refer to the contract-specific documentation below.

## Testing

The BitNest platform has a comprehensive test suite that covers the key functionality of the Clarity smart contracts. The tests are written using the Clarinet testing framework and can be found in the `/tests` directory.

To run the tests, use the following command:

```
clarinet test
```

The test suite covers the following scenarios:

- Validating the booking process for a property
- Preventing booking of an unavailable property
- Validating the booking cancellation process
- Preventing unauthorized booking cancellation
- Validating the booking completion process
- Preventing unauthorized booking completion

These tests ensure the contracts are functioning as expected and help maintain the overall integrity of the BitNest platform.

## Security Considerations

The BitNest platform has been designed with security in mind. Here are some of the key security measures implemented:

1. **Access Control**: The contracts use authorization checks to ensure only authorized principals can perform sensitive operations, such as minting tokens, updating property details, and completing/canceling bookings.

2. **Input Validation**: The contracts validate user inputs, such as booking dates and property details, to prevent malicious or invalid data from being stored on the blockchain.

3. **Secure Token Transfers**: The BitNest Token contract implements the SIP-010 standard, which ensures secure and auditable token transfers between users and the contract.

4. **Rental Agreement Lifecycle Management**: The Rental Agreement contract manages the full lifecycle of rental bookings, including secure deposit handling, cancellation policies, and dispute resolution mechanisms.

5. **Separation of Concerns**: The platform is designed with a modular architecture, separating the concerns of token management, property registry, and rental agreements. This helps to minimize the attack surface and improve the overall security posture.

The contracts have been thoroughly reviewed and tested to identify and mitigate potential security vulnerabilities. However, it is important to continuously monitor the contracts and the broader Stacks ecosystem for any new developments or threats that may impact the security of the BitNest platform.
