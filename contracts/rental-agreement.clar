;; BitNest Rental Agreement Contract
;; A decentralized property rental platform with secure, token-based rental management

;; Imports and Dependencies
;; Note: Adjust contract references as needed during deployment
(use-trait sip010-token .bitnest-token.sip010-token)
(use-trait property-registry .property-registry.property-registry)

;; Error Codes
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_PROPERTY_NOT_AVAILABLE (err u101))
(define-constant ERR_INVALID_BOOKING_DATES (err u102))
(define-constant ERR_INSUFFICIENT_PAYMENT (err u103))
(define-constant ERR_BOOKING_NOT_FOUND (err u104))
(define-constant ERR_CANCELLATION_NOT_ALLOWED (err u105))
(define-constant ERR_DISPUTE_PERIOD_EXPIRED (err u106))

;; Constants
(define-constant DISPUTE_PERIOD_BLOCKS u144) ;; Approximately 24 hours on Stacks
(define-constant CANCELLATION_FEE_PERCENTAGE u10) ;; 10% cancellation fee

;; Data Maps
(define-map rental-agreements 
  {
    property-id: uint,
    booking-start: uint,
    renter: principal
  }
  {
    total-cost: uint,
    token-contract: principal,
    status: (string-ascii 20),
    deposit-amount: uint
  }
)

(define-map property-availability 
  {
    property-id: uint,
    booking-start: uint,
    booking-end: uint
  }
  bool
)

;; Private Helper Functions
(define-private (is-property-available 
  (property-id uint) 
  (start-block uint) 
  (end-block uint)
)
  (let ((check-blocks 
          (map 
            (lambda (block) 
              (default-to false 
                (map-get? property-availability 
                  {
                    property-id: property-id, 
                    booking-start: block, 
                    booking-end: end-block
                  }
                )
              )
            )
            (list start-block end-block)
          )
        )
  )
    (not (fold or check-blocks false))
  )
)

(define-private (calculate-rental-cost 
  (daily-rate uint) 
  (num-nights uint)
)
  (* daily-rate num-nights)
)

;; Public Functions
(define-public (book-property 
  (property-id uint)
  (start-block uint)
  (end-block uint)
  (daily-rate uint)
  (token-contract <sip010-token>)
)
  (let 
    (
      (renter tx-sender)
      (total-nights (- end-block start-block))
      (total-cost (calculate-rental-cost daily-rate total-nights))
      (deposit-amount (/ total-cost u10)) ;; 10% deposit
    )
    
    ;; Validate booking dates and availability
    (asserts! (> end-block start-block) ERR_INVALID_BOOKING_DATES)
    (asserts! (is-property-available property-id start-block end-block) ERR_PROPERTY_NOT_AVAILABLE)
    
    ;; Mark property as unavailable for the booking period
    (map-set property-availability 
      {
        property-id: property-id, 
        booking-start: start-block, 
        booking-end: end-block
      } 
      true
    )
    
    ;; Record rental agreement
    (map-set rental-agreements 
      {
        property-id: property-id, 
        booking-start: start-block, 
        renter: renter
      }
      {
        total-cost: total-cost,
        token-contract: (contract-of token-contract),
        status: "BOOKED",
        deposit-amount: deposit-amount
      }
    )
    
    ;; Transfer deposit to contract
    (try! 
      (contract-call? token-contract transfer-from 
        renter 
        (as-contract tx-sender) 
        deposit-amount 
        none
      )
    )
    
    (ok total-cost)
  )
)

(define-public (complete-booking 
  (property-id uint)
  (start-block uint)
  (renter principal)
)
  (let 
    (
      (rental-agreement 
        (unwrap! 
          (map-get? rental-agreements 
            {
              property-id: property-id, 
              booking-start: start-block, 
              renter: renter
            }
          ) 
          ERR_BOOKING_NOT_FOUND
        )
      )
      (token-contract 
        (contract-call? .bitnest-token get-token-contract 
          (get token-contract rental-agreement)
        )
      )
    )
    
    ;; Authorization check
    (asserts! 
      (or 
        (is-eq tx-sender renter)
        (is-eq tx-sender (get-property-owner property-id))
      ) 
      ERR_UNAUTHORIZED
    )
    
    ;; Update booking status
    (map-set rental-agreements 
      {
        property-id: property-id, 
        booking-start: start-block, 
        renter: renter
      }
      (merge rental-agreement { status: "COMPLETED" })
    )
    
    ;; Release full payment to property owner
    (try! 
      (contract-call? token-contract transfer-from 
        (as-contract tx-sender)
        (get-property-owner property-id)
        (get total-cost rental-agreement)
        none
      )
    )
    
    (ok true)
  )
)

(define-public (cancel-booking 
  (property-id uint)
  (start-block uint)
  (renter principal)
)
  (let 
    (
      (rental-agreement 
        (unwrap! 
          (map-get? rental-agreements 
            {
              property-id: property-id, 
              booking-start: start-block, 
              renter: renter
            }
          ) 
          ERR_BOOKING_NOT_FOUND
        )
      )
      (token-contract 
        (contract-call? .bitnest-token get-token-contract 
          (get token-contract rental-agreement)
        )
      )
      (cancellation-fee 
        (/ (get deposit-amount rental-agreement) CANCELLATION_FEE_PERCENTAGE)
      )
    )
    
    ;; Authorization check
    (asserts! (is-eq tx-sender renter) ERR_UNAUTHORIZED)
    
    ;; Mark property as available again
    (map-delete property-availability 
      {
        property-id: property-id, 
        booking-start: start-block, 
        booking-end: (+ start-block u24)
      }
    )
    
    ;; Update booking status
    (map-set rental-agreements 
      {
        property-id: property-id, 
        booking-start: start-block, 
        renter: renter
      }
      (merge rental-agreement { status: "CANCELLED" })
    )
    
    ;; Refund with cancellation fee
    (try! 
      (contract-call? token-contract transfer-from 
        (as-contract tx-sender)
        renter
        (- (get deposit-amount rental-agreement) cancellation-fee)
        none
      )
    )
    
    (ok true)
  )
)

;; Read-Only Functions
(define-read-only (get-rental-agreement 
  (property-id uint)
  (start-block uint)
  (renter principal)
)
  (map-get? rental-agreements 
    {
      property-id: property-id, 
      booking-start: start-block, 
      renter: renter
    }
  )
)

;; Private Helper Functions to be implemented
(define-private (get-property-owner (property-id uint))
  (unwrap-panic 
    (contract-call? .property-registry get-property-owner property-id)
  )
)