;; BitNest Property Registry Contract
;; A decentralized property management system on the Stacks blockchain
;; Enables secure property listing, tracking, and management

;; Error Codes
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_PROPERTY_NOT_FOUND (err u404))
(define-constant ERR_PROPERTY_ALREADY_EXISTS (err u409))
(define-constant ERR_INVALID_PROPERTY_DATA (err u422))

;; Property Status Enum
(define-constant STATUS_AVAILABLE u0)
(define-constant STATUS_BOOKED u1)
(define-constant STATUS_MAINTENANCE u2)

;; Data Structures
(define-map properties 
  { property-id: uint }
  {
    owner: principal,
    location: (string-ascii 100),
    price: uint,
    status: uint,
    metadata: (buff 256)
  }
)

;; Track the total number of properties
(define-data-var total-properties uint u0)

;; Private Functions
(define-private (is-property-owner (property-id uint))
  (match (map-get? properties { property-id: property-id })
    property (is-eq (get owner property) tx-sender)
    false
  )
)

;; Read-only Functions
(define-read-only (get-property-details (property-id uint))
  (map-get? properties { property-id: property-id })
)

(define-read-only (get-total-properties)
  (var-get total-properties)
)

;; Public Functions
(define-public (register-property 
  (location (string-ascii 100)) 
  (price uint) 
  (metadata (buff 256))
)
  (begin
    ;; Validate input data
    (asserts! (> (len location) u0) ERR_INVALID_PROPERTY_DATA)
    (asserts! (> price u0) ERR_INVALID_PROPERTY_DATA)

    ;; Increment property ID
    (let ((new-property-id (+ (var-get total-properties) u1)))
      ;; Register new property
      (map-insert properties 
        { property-id: new-property-id }
        {
          owner: tx-sender,
          location: location,
          price: price,
          status: STATUS_AVAILABLE,
          metadata: metadata
        }
      )
      
      ;; Update total properties count
      (var-set total-properties new-property-id)
      
      (ok new-property-id)
    )
  )
)

(define-public (update-property 
  (property-id uint)
  (location (optional (string-ascii 100)))
  (price (optional uint))
  (status (optional uint))
  (metadata (optional (buff 256)))
)
  (begin
    ;; Verify property exists and sender is owner
    (asserts! (is-property-owner property-id) ERR_UNAUTHORIZED)
    
    (match (map-get? properties { property-id: property-id })
      current-property
        (let 
          (
            (updated-location (default-to (get location current-property) location))
            (updated-price (default-to (get price current-property) price))
            (updated-status (default-to (get status current-property) status))
            (updated-metadata (default-to (get metadata current-property) metadata))
          )
          (map-set properties 
            { property-id: property-id }
            {
              owner: tx-sender,
              location: updated-location,
              price: updated-price,
              status: updated-status,
              metadata: updated-metadata
            }
          )
          (ok true)
        )
      ERR_PROPERTY_NOT_FOUND
    )
  )
)

(define-public (remove-property (property-id uint))
  (begin
    ;; Verify property exists and sender is owner
    (asserts! (is-property-owner property-id) ERR_UNAUTHORIZED)
    
    ;; Delete property from registry
    (map-delete properties { property-id: property-id })
    
    ;; Decrement total properties (optional: depends on business logic)
    (var-set total-properties (- (var-get total-properties) u1))
    
    (ok true)
  )
)

;; Optional: Transfer property ownership
(define-public (transfer-property-ownership 
  (property-id uint) 
  (new-owner principal)
)
  (begin
    ;; Verify current sender is owner
    (asserts! (is-property-owner property-id) ERR_UNAUTHORIZED)
    
    (match (map-get? properties { property-id: property-id })
      current-property
        (begin
          (map-set properties 
            { property-id: property-id }
            (merge current-property { owner: new-owner })
          )
          (ok true)
        )
      ERR_PROPERTY_NOT_FOUND
    )
  )
)