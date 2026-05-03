"""
Demo data seeder — populates SQLite with realistic shipments, tracking events,
escalations, exceptions, and a vendor user for the demo.
Run: python scripts/seed_demo_data.py
"""
import asyncio
import sys
import os
import uuid
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.models.shipment import Shipment, ShipmentStatus, ShipmentPriority
from app.models.tracking import TrackingEvent, TrackingEventType, ShipmentException
from app.models.escalation import EscalationTask, EscalationStatus, AgentDecisionLog
from app.models.carrier import CarrierProfile, SpotRateQuote
from app.models.document import ShippingDocument, DocumentType, DocumentStatus
from app.core.security import hash_password
from app.models import user, shipment, tracking, carrier, document, escalation  # noqa

# ─── Sample Data ─────────────────────────────────────────────────────────────

CARRIERS = ["FEDEX", "UPS", "DHL", "USPS"]
CARRIER_SERVICES = {
    "FEDEX": ["FEDEX_GROUND", "FEDEX_EXPRESS_SAVER", "PRIORITY_OVERNIGHT"],
    "UPS":   ["UPS_GROUND", "UPS_2ND_DAY_AIR", "UPS_NEXT_DAY_AIR"],
    "DHL":   ["DHL_EXPRESS_WORLDWIDE", "DHL_EXPRESS_12"],
    "USPS":  ["Priority Mail", "Priority Mail Express"],
}

ROUTES = [
    ({"name":"TechCorp Inc","street1":"123 Silicon Ave","city":"San Francisco","state":"CA","zip":"94105","country":"US"},
     {"name":"Euro Retail GmbH","street1":"Hauptstrasse 45","city":"Berlin","state":"BE","zip":"10115","country":"DE"}),
    ({"name":"Fashion House","street1":"456 5th Ave","city":"New York","state":"NY","zip":"10001","country":"US"},
     {"name":"UK Boutique Ltd","street1":"10 Oxford St","city":"London","state":"","zip":"W1D 1BS","country":"GB"}),
    ({"name":"Auto Parts Co","street1":"789 Motor Blvd","city":"Detroit","state":"MI","zip":"48201","country":"US"},
     {"name":"Japan Motors","street1":"1-1 Toyoda","city":"Tokyo","state":"","zip":"100-0001","country":"JP"}),
    ({"name":"Pharma Labs","street1":"321 Health Dr","city":"Boston","state":"MA","zip":"02101","country":"US"},
     {"name":"Canadian Health","street1":"55 Maple Ave","city":"Toronto","state":"ON","zip":"M5H 2N2","country":"CA"}),
    ({"name":"Electronics Hub","street1":"654 Tech Park","city":"Austin","state":"TX","zip":"73301","country":"US"},
     {"name":"Aussie Gadgets","street1":"88 George St","city":"Sydney","state":"NSW","zip":"2000","country":"AU"}),
    ({"name":"Green Foods Co","street1":"11 Farm Rd","city":"Chicago","state":"IL","zip":"60601","country":"US"},
     {"name":"French Cuisine","street1":"22 Rue de Rivoli","city":"Paris","state":"","zip":"75001","country":"FR"}),
    ({"name":"Luxury Goods","street1":"99 Rodeo Dr","city":"Los Angeles","state":"CA","zip":"90210","country":"US"},
     {"name":"Dubai Imports","street1":"Sheikh Zayed Rd","city":"Dubai","state":"","zip":"00000","country":"AE"}),
    ({"name":"Industrial Supply","street1":"500 Factory Ln","city":"Houston","state":"TX","zip":"77001","country":"US"},
     {"name":"Brazil Industria","street1":"Av Paulista 1000","city":"Sao Paulo","state":"SP","zip":"01310","country":"BR"}),
]

PRODUCTS = [
    ("Laptop computers", 2.5, 1200, "electronics"),
    ("Clothing and apparel", 1.2, 350, "clothing"),
    ("Automotive spare parts", 8.0, 800, "automotive"),
    ("Pharmaceutical supplies", 0.8, 2500, "medical"),
    ("Consumer electronics", 3.0, 950, "electronics"),
    ("Organic food products", 5.0, 180, "food"),
    ("Luxury watches", 0.3, 8500, "jewelry"),
    ("Industrial machinery parts", 15.0, 3200, "machinery"),
    ("Cosmetics and beauty", 1.5, 420, "cosmetics"),
    ("Books and publications", 2.0, 85, "books"),
    ("Toys and games", 1.8, 220, "toys"),
    ("Medical devices", 1.1, 4500, "medical"),
]

STATUSES_WEIGHTED = [
    (ShipmentStatus.DELIVERED, 35),
    (ShipmentStatus.IN_TRANSIT, 25),
    (ShipmentStatus.LABEL_CREATED, 15),
    (ShipmentStatus.AWAITING_APPROVAL, 8),
    (ShipmentStatus.EXCEPTION, 7),
    (ShipmentStatus.PICKED_UP, 5),
    (ShipmentStatus.OUT_FOR_DELIVERY, 5),
]

def weighted_choice(choices):
    total = sum(w for _, w in choices)
    r = random.uniform(0, total)
    upto = 0
    for c, w in choices:
        upto += w
        if r <= upto:
            return c
    return choices[0][0]

def random_date(days_back=90):
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back))

def make_confidence():
    r = random.random()
    if r < 0.6:   return round(random.uniform(0.95, 0.99), 3)  # auto-execute
    elif r < 0.85: return round(random.uniform(0.70, 0.94), 3)  # escalate
    else:          return round(random.uniform(0.40, 0.69), 3)  # reject

async def seed():
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as db:

        # ── Vendor User ──────────────────────────────────────────────────────
        print("\nCreating vendor user...")
        vendor = User(
            id=uuid.uuid4(),
            email="vendor@fastship.com",
            full_name="FastShip Vendor",
            hashed_password=hash_password("Vendor1234"),
            role=UserRole.OPERATOR,
        )
        db.add(vendor)

        # Also create a viewer
        viewer = User(
            id=uuid.uuid4(),
            email="viewer@agenticshipping.com",
            full_name="Demo Viewer",
            hashed_password=hash_password("Viewer1234"),
            role=UserRole.VIEWER,
        )
        db.add(viewer)
        await db.flush()
        print("  + vendor@fastship.com / Vendor1234")
        print("  + viewer@agenticshipping.com / Viewer1234")

        # ── Shipments ────────────────────────────────────────────────────────
        print("\nCreating 60 demo shipments...")
        shipments_created = []

        for i in range(60):
            route = random.choice(ROUTES)
            origin, dest = route
            product, weight, value, category = random.choice(PRODUCTS)
            carrier_code = random.choice(CARRIERS)
            service = random.choice(CARRIER_SERVICES[carrier_code])
            status = weighted_choice(STATUSES_WEIGHTED)
            confidence = make_confidence()
            created = random_date(90)
            priority = random.choice(list(ShipmentPriority))
            is_green = random.random() < 0.3
            auto_exec = confidence >= 0.95

            # Rate based on weight and carrier
            base_rates = {"FEDEX": 8.5, "UPS": 9.0, "DHL": 12.0, "USPS": 5.5}
            rate = round(base_rates[carrier_code] * weight * random.uniform(0.8, 1.4), 2)
            carbon = round(weight * 0.15 * random.uniform(0.5, 2.0), 4)

            s = Shipment(
                id=uuid.uuid4(),
                tracking_number=f"1Z{carrier_code[:2]}{uuid.uuid4().hex[:12].upper()}",
                status=status,
                priority=priority,
                origin_address=origin,
                destination_address=dest,
                weight_kg=weight,
                length_cm=round(random.uniform(10, 60), 1),
                width_cm=round(random.uniform(10, 40), 1),
                height_cm=round(random.uniform(5, 30), 1),
                declared_value=value,
                currency="USD",
                contents_description=product,
                hs_code=f"{random.randint(1000,9999)}.{random.randint(10,99)}",
                is_hazmat=random.random() < 0.05,
                requires_signature=value > 1000,
                selected_carrier=carrier_code,
                selected_service=service,
                quoted_rate=rate,
                actual_cost=rate * random.uniform(0.95, 1.05) if status == ShipmentStatus.DELIVERED else None,
                agent_confidence_score=confidence,
                agent_reasoning=[
                    {"agent": "ComplianceAgent", "action": "compliance_check", "confidence": round(confidence + random.uniform(-0.05, 0.05), 3), "disposition": "auto_execute" if confidence >= 0.95 else "escalate_to_human", "reasoning": f"Product '{product}' classified as {category}. HS code assigned. No sanctions detected."},
                    {"agent": "RouterAgent", "action": "route_selection", "confidence": round(confidence + random.uniform(-0.05, 0.05), 3), "disposition": "auto_execute" if confidence >= 0.95 else "escalate_to_human", "reasoning": f"Selected {carrier_code} {service} based on cost-reliability balance. Weather clear on route."},
                    {"agent": "NegotiatorAgent", "action": "rate_negotiation", "confidence": round(confidence + random.uniform(-0.05, 0.05), 3), "disposition": "auto_execute", "reasoning": f"Best rate ${rate} found. No backhaul available. Savings vs standard: ${round(rate * 0.12, 2)}."},
                ],
                agent_alternatives=[
                    {"carrier": random.choice([c for c in CARRIERS if c != carrier_code]), "service": "STANDARD", "cost": round(rate * 1.15, 2), "transit_days": 5},
                    {"carrier": "DHL", "service": "DHL_EXPRESS_WORLDWIDE", "cost": round(rate * 1.35, 2), "transit_days": 2, "is_green": True},
                ],
                auto_executed=auto_exec,
                carbon_footprint_kg=carbon,
                is_green_route=is_green,
                created_at=created,
                updated_at=created + timedelta(hours=random.randint(1, 48)),
                estimated_delivery=created + timedelta(days=random.randint(2, 10)),
                actual_delivery=created + timedelta(days=random.randint(2, 8)) if status == ShipmentStatus.DELIVERED else None,
                created_by=vendor.id if i % 3 == 0 else None,
            )
            db.add(s)
            shipments_created.append(s)

        await db.flush()
        print(f"  + {len(shipments_created)} shipments created")

        # ── Tracking Events ──────────────────────────────────────────────────
        print("Creating tracking events...")
        event_count = 0
        for s in shipments_created:
            if s.status in [ShipmentStatus.DRAFT, ShipmentStatus.PENDING_AGENT]:
                continue

            events_for_status = {
                ShipmentStatus.LABEL_CREATED: [TrackingEventType.LABEL_CREATED],
                ShipmentStatus.PICKED_UP: [TrackingEventType.LABEL_CREATED, TrackingEventType.PICKED_UP],
                ShipmentStatus.IN_TRANSIT: [TrackingEventType.LABEL_CREATED, TrackingEventType.PICKED_UP, TrackingEventType.IN_TRANSIT],
                ShipmentStatus.OUT_FOR_DELIVERY: [TrackingEventType.LABEL_CREATED, TrackingEventType.PICKED_UP, TrackingEventType.IN_TRANSIT, TrackingEventType.OUT_FOR_DELIVERY],
                ShipmentStatus.DELIVERED: [TrackingEventType.LABEL_CREATED, TrackingEventType.PICKED_UP, TrackingEventType.IN_TRANSIT, TrackingEventType.OUT_FOR_DELIVERY, TrackingEventType.DELIVERED],
                ShipmentStatus.EXCEPTION: [TrackingEventType.LABEL_CREATED, TrackingEventType.PICKED_UP, TrackingEventType.IN_TRANSIT, TrackingEventType.EXCEPTION],
            }

            event_types = events_for_status.get(s.status, [TrackingEventType.LABEL_CREATED])
            locations = [
                f"{s.origin_address.get('city')}, {s.origin_address.get('country')}",
                f"Hub - {random.choice(['Chicago', 'Frankfurt', 'Dubai', 'Singapore'])}",
                f"{s.destination_address.get('city')}, {s.destination_address.get('country')}",
            ]

            for j, et in enumerate(event_types):
                ev = TrackingEvent(
                    id=uuid.uuid4(),
                    shipment_id=s.id,
                    event_type=et,
                    description={
                        TrackingEventType.LABEL_CREATED: "Shipping label created by agent",
                        TrackingEventType.PICKED_UP: "Package picked up by carrier",
                        TrackingEventType.IN_TRANSIT: "Package in transit to destination",
                        TrackingEventType.OUT_FOR_DELIVERY: "Out for delivery",
                        TrackingEventType.DELIVERED: "Package delivered successfully",
                        TrackingEventType.EXCEPTION: "Delivery exception — agent notified",
                    }.get(et, "Status update"),
                    location=locations[min(j, len(locations)-1)],
                    occurred_at=s.created_at + timedelta(hours=j * random.randint(4, 24)),
                )
                db.add(ev)
                event_count += 1

        await db.flush()
        print(f"  + {event_count} tracking events created")

        # ── Exceptions ───────────────────────────────────────────────────────
        print("Creating shipment exceptions...")
        exception_shipments = [s for s in shipments_created if s.status == ShipmentStatus.EXCEPTION]
        exc_types = [
            ("DELAY", "high", "Carrier delay detected — 48+ hours behind schedule", "Agent initiated re-route evaluation"),
            ("WEATHER", "medium", "Severe weather disruption at transit hub", "Agent monitoring — alternative route identified"),
            ("CUSTOMS_HOLD", "high", "Shipment held at customs for inspection", "Agent filed additional documentation"),
            ("ADDRESS_ERROR", "medium", "Delivery address unverifiable", "Agent contacted recipient for confirmation"),
            ("DAMAGE", "critical", "Package damage detected at sorting facility", "Agent filed insurance claim automatically"),
        ]
        for s in exception_shipments[:5]:
            exc_type, severity, desc, action = random.choice(exc_types)
            ex = ShipmentException(
                id=uuid.uuid4(),
                shipment_id=s.id,
                exception_type=exc_type,
                severity=severity,
                description=desc,
                agent_action_taken=action,
                resolution_status=random.choice(["open", "resolved", "escalated"]),
                detected_at=s.created_at + timedelta(hours=random.randint(12, 72)),
            )
            db.add(ex)

        await db.flush()
        print(f"  + {len(exception_shipments[:5])} exceptions created")

        # ── Escalations ──────────────────────────────────────────────────────
        print("Creating escalation tasks...")
        escalation_shipments = [s for s in shipments_created if s.status == ShipmentStatus.AWAITING_APPROVAL]
        for s in escalation_shipments:
            esc = EscalationTask(
                id=uuid.uuid4(),
                shipment_id=s.id,
                status=EscalationStatus.PENDING,
                confidence_score=s.agent_confidence_score,
                reason=f"Router confidence {s.agent_confidence_score*100:.0f}% — complex international route requires human review. Multiple carriers available with similar cost-benefit profiles.",
                option_a={
                    "carrier": s.selected_carrier,
                    "service": s.selected_service,
                    "cost": s.quoted_rate,
                    "transit_days": 5,
                    "description": "Recommended by agent — best cost-reliability balance",
                },
                option_b={
                    "carrier": "DHL",
                    "service": "DHL_EXPRESS_WORLDWIDE",
                    "cost": round((s.quoted_rate or 50) * 1.3, 2),
                    "transit_days": 2,
                    "description": "Faster delivery — premium cost",
                },
                option_c={
                    "carrier": "USPS",
                    "service": "Priority Mail",
                    "cost": round((s.quoted_rate or 50) * 0.75, 2),
                    "transit_days": 8,
                    "description": "Economy option — slower but cheapest",
                },
                agent_reasoning_log=s.agent_reasoning,
                expires_at=datetime.utcnow() + timedelta(hours=4),
                created_at=s.created_at,
            )
            db.add(esc)

        await db.flush()
        print(f"  + {len(escalation_shipments)} escalations created")

        # ── Agent Decision Logs ──────────────────────────────────────────────
        print("Creating agent decision logs...")
        for s in random.sample(shipments_created, min(20, len(shipments_created))):
            log = AgentDecisionLog(
                id=uuid.uuid4(),
                shipment_id=str(s.id),
                agent_name="ShippingOrchestrator",
                action_type="full_workflow",
                input_data={"origin": s.origin_address, "destination": s.destination_address, "weight_kg": s.weight_kg},
                output_data={"recommended_carrier": s.selected_carrier, "estimated_cost": s.quoted_rate, "overall_confidence": s.agent_confidence_score},
                reasoning=f"Processed {s.contents_description} shipment. Selected {s.selected_carrier} based on reliability score and cost optimization.",
                confidence_score=s.agent_confidence_score,
                tokens_used={"input_tokens": random.randint(800, 2000), "output_tokens": random.randint(200, 600)},
                execution_time_ms=round(random.uniform(1200, 4500), 1),
                success=True,
                created_at=s.created_at + timedelta(minutes=random.randint(1, 5)),
            )
            db.add(log)

        # ── Spot Rate Quotes ─────────────────────────────────────────────────
        print("Creating spot rate quotes...")
        for _ in range(30):
            quote = SpotRateQuote(
                id=uuid.uuid4(),
                carrier_code=random.choice(CARRIERS),
                service_level=random.choice(["STANDARD", "EXPRESS", "OVERNIGHT"]),
                quoted_rate=round(random.uniform(15, 250), 2),
                currency="USD",
                transit_days=random.randint(1, 10),
                is_backhaul=random.random() < 0.15,
                is_spot_rate=True,
                created_at=random_date(30),
            )
            db.add(quote)

        await db.commit()

    print("\n" + "="*50)
    print("DEMO DATA SEEDED SUCCESSFULLY")
    print("="*50)
    print("\nLogin credentials:")
    print("  Admin:  admin@agenticshipping.com / Admin1234")
    print("  Vendor: vendor@fastship.com / Vendor1234")
    print("  Viewer: viewer@agenticshipping.com / Viewer1234")
    print("\nDatabase: ./shipping.db")
    print("Open: http://localhost:3000")

if __name__ == "__main__":
    asyncio.run(seed())
