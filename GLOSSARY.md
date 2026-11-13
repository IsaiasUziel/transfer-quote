# Travel Quotes

Shared language for estimating round-trip travel costs, independent of the purpose of the visit.

## Language

**Base**:
The starting point and return point for each visit.
_Avoid_: Warehouse, rental depot.

**Destination**:
The location reached on the outbound leg of a visit.
_Avoid_: Delivery address when the trip does not involve a delivery.

**Visit**:
One round trip from the base to the destination and back. Two separate trips to the same destination are two visits.
_Avoid_: Leg, delivery, rental.

**Outbound distance**:
The distance traveled from the base to the destination, accumulated across all visits.
_Avoid_: Loaded distance when the load is irrelevant.

**Return distance**:
The distance traveled back to the base, accumulated across all visits. Its estimate uses the same one-way distance as the outbound leg.
_Avoid_: Empty distance when the load is irrelevant.

**Included kilometers**:
The outbound-distance allowance deducted once per quote before applying the outbound rate. It does not reduce the physical distance traveled or the return charge.
_Avoid_: Included kilometers per visit.

**Quote name**:
An optional human-readable label for identifying a saved quote. The destination remains the location of the trip.
_Avoid_: Address as a synonym for the quote name.
