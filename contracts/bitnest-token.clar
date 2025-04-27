;; BitNest Token (BNST)
;; A SIP-010 compliant fungible token for the BitNest platform
;; Total Supply: 10,000,000 tokens

;; Implement SIP-010 Trait
;; SIP-010 Trait Implementation
(impl-trait .sip-010-trait-ft-standard.sip-010-trait)

;; Error Constants
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_INSUFFICIENT_BALANCE u2)
(define-constant ERR_TOTAL_SUPPLY_EXCEEDED u3)

;; Token Metadata
(define-constant TOKEN_NAME "BitNest Token")
(define-constant TOKEN_SYMBOL "BNST")
(define-constant TOKEN_DECIMALS u8)
(define-constant TOTAL_SUPPLY (* u10000000 (pow u10 TOKEN_DECIMALS)))

;; Contract Owner
(define-data-var contract-owner principal tx-sender)

;; Token Balance Map
(define-map balances principal uint)

;; Mint Allowance Map (tracks minting permissions)
(define-map mint-allowance principal bool)

;; Authorization Check
(define-private (is-contract-owner (sender principal))
  (is-eq sender (var-get contract-owner))
)

;; Transfer Function with SIP-010 Compatibility
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    ;; Verify sender authorization
    (asserts! (is-eq tx-sender sender) (err ERR_UNAUTHORIZED))
    
    ;; Get current balances
    (let ((sender-balance (default-to u0 (map-get? balances sender)))
          (recipient-balance (default-to u0 (map-get? balances recipient))))
      
      ;; Check sufficient balance
      (asserts! (>= sender-balance amount) (err ERR_INSUFFICIENT_BALANCE))
      
      ;; Update balances
      (map-set balances sender (- sender-balance amount))
      (map-set balances recipient (+ recipient-balance amount))
      
      ;; Optional: handle memo if needed
      (print memo)
      
      (ok true)
    )
  )
)

;; Mint Function with Access Control
(define-public (mint (amount uint) (recipient principal))
  (begin
    ;; Check minting authorization
    (asserts! (is-contract-owner tx-sender) (err ERR_UNAUTHORIZED))
    
    (let ((current-balance (default-to u0 (map-get? balances recipient)))
          (current-total-supply (default-to u0 (var-get total-supply))))
      
      ;; Prevent total supply overflow
      (asserts! (<=
        (+ current-total-supply amount)
        TOTAL_SUPPLY
      ) (err ERR_TOTAL_SUPPLY_EXCEEDED))
      
      ;; Update balances and total supply
      (map-set balances recipient (+ current-balance amount))
      (var-set total-supply (+ current-total-supply amount))
      
      (ok true)
    )
  )
)

;; Burn Function with Access Control
(define-public (burn (amount uint) (sender principal))
  (begin
    ;; Verify sender authorization
    (asserts! (is-eq tx-sender sender) (err ERR_UNAUTHORIZED))
    
    (let ((current-balance (default-to u0 (map-get? balances sender)))
          (current-total-supply (default-to u0 (var-get total-supply))))
      
      ;; Check sufficient balance
      (asserts! (>= current-balance amount) (err ERR_INSUFFICIENT_BALANCE))
      
      ;; Update balances and total supply
      (map-set balances sender (- current-balance amount))
      (var-set total-supply (- current-total-supply amount))
      
      (ok true)
    )
  )
)

;; Get Token Balance
(define-read-only (get-balance (user principal))
  (default-to u0 (map-get? balances user))
)

;; Get Total Supply
(define-data-var total-supply uint u0)

;; SIP-010 Token Info Functions
(define-read-only (get-name)
  TOKEN_NAME
)

(define-read-only (get-symbol)
  TOKEN_SYMBOL
)

(define-read-only (get-decimals)
  TOKEN_DECIMALS
)

(define-read-only (get-total-supply)
  (var-get total-supply)
)

;; Optional: Transfer Multiple Recipients
(define-public (transfer-multiple (recipients (list 200 (tuple (to principal) (amount uint)))))
  (let ((sender tx-sender))
    (fold transfer-iter recipients (ok true))
  )
)

;; Helper for transfer-multiple
(define-private (transfer-iter 
  (recipient (tuple (to principal) (amount uint))) 
  (previous-result (response bool bool))
  )
  (match previous-result
    prev-result
    (transfer (get amount recipient) sender (get to recipient) none)
    err-value
    (err err-value)
  )
)

;; Optional: Change Contract Owner
(define-public (change-contract-owner (new-owner principal))
  (begin
    (asserts! (is-contract-owner tx-sender) (err ERR_UNAUTHORIZED))
    (var-set contract-owner new-owner)
    (ok true)
  )
)