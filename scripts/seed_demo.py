"""
Demo Seed Script - Full rich data for video demo.
Populates: users, carriers, shipments (all statuses), tracking events,
           exceptions, escalations, agent decision logs, spot rate quotes.

Run from workspace root:
    python scripts/seed_demo.py
"""
import asyncio, sys, os, uuid, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, init_db
from app.models.carrier import CarrierProfile, SpotRateQuote
from app.models.user import User, UserRole
from app.models.shipment import Shipment, ShipmentStatus, ShipmentPriority
from app.models.tracking import TrackingEvent, TrackingEventType, ShipmentException
from app.models.escalation import EscalationTask, EscalationStatus, AgentDecisionLog
from app.core.security import hash_password
from app.models import user, shipment, tracking, carrier, document, escalation  # noqa

def uid(): return uuid.uuid4()
def ago(days=0, hours=0, minutes=0):
    return datetime.utcnow() - timedelta(days=days, hours=hours, minutes=minutes)
def future(days=0, hours=0):
    return datetime.utcnow() + timedelta(days=days, hours=hours)

CARRIERS = [
    dict(carrier_code="FEDEX", carrier_name="FedEx",
         supported_services=["FEDEX_GROUND","FEDEX_EXPRESS_SAVER","PRIORITY_OVERNIGHT"],
         api_provider="easypost", avg_on_time_rate=0.94, avg_delay_hours=1.2,
         reliability_score=0.94, base_rate_per_kg=8.50, fuel_surcharge_pct=0.12,
         avg_carbon_per_kg_km=0.150, has_ev_fleet=True, green_certified=True),
    dict(carrier_code="UPS", carrier_name="UPS",
         supported_services=["UPS_GROUND","UPS_2ND_DAY_AIR","UPS_NEXT_DAY_AIR"],
         api_provider="easypost", avg_on_time_rate=0.96, avg_delay_hours=0.8,
         reliability_score=0.96, base_rate_per_kg=9.00, fuel_surcharge_pct=0.10,
         avg_carbon_per_kg_km=0.140, has_ev_fleet=True, green_certified=True),
    dict(carrier_code="DHL", carrier_name="DHL Express",
         supported_services=["DHL_EXPRESS_WORLDWIDE","DHL_EXPRESS_12"],
         api_provider="easypost", avg_on_time_rate=0.97, avg_delay_hours=0.5,
         reliability_score=0.97, base_rate_per_kg=12.00, fuel_surcharge_pct=0.08,
         avg_carbon_per_kg_km=0.120, has_ev_fleet=True, green_certified=True),
    dict(carrier_code="USPS", carrier_name="USPS",
         supported_services=["Priority Mail","Priority Mail Express"],
         api_provider="easypost", avg_on_time_rate=0.91, avg_delay_hours=2.5,
         reliability_score=0.91, base_rate_per_kg=5.50, fuel_surcharge_pct=0.05,
         avg_carbon_per_kg_km=0.096, has_ev_fleet=False, green_certified=False),
]

USERS = [
    dict(email="admin@agenticshipping.com", full_name="Alex Morgan",
         password="Admin1234", role=UserRole.ADMIN),
    dict(email="vendor@fastship.com", full_name="Jordan Lee",
         password="Vendor1234", role=UserRole.OPERATOR),
    dict(email="ops@globallogistics.com", full_name="Sam Rivera",
         password="Ops12345", role=UserRole.OPERATOR),
    dict(email="viewer@agenticshipping.com", full_name="Taylor Kim",
         password="View1234", role=UserRole.VIEWER),
]

ADDR = {
    "sf":      dict(name="Tech Corp", street1="123 Market St", city="San Francisco", state="CA", zip="94105", country="US"),
    "nyc":     dict(name="East Coast Hub", street1="350 5th Ave", city="New York", state="NY", zip="10118", country="US"),
    "chicago": dict(name="Midwest Depot", street1="233 S Wacker Dr", city="Chicago", state="IL", zip="60606", country="US"),
    "london":  dict(name="Global Ltd", street1="456 Oxford St", city="London", state="England", zip="W1A 1AA", country="GB"),
    "tokyo":   dict(name="Nippon Trading", street1="1-1 Shibuya", city="Tokyo", state="Tokyo", zip="150-0002", country="JP"),
    "toronto": dict(name="Canada Imports", street1="100 King St W", city="Toronto", state="ON", zip="M5X 1A9", country="CA"),
    "sydney":  dict(name="AusPac Goods", street1="1 Macquarie St", city="Sydney", state="NSW", zip="2000", country="AU"),
    "berlin":  dict(name="Euro Logistics", street1="Unter den Linden 1", city="Berlin", state="Berlin", zip="10117", country="DE"),
}

SHIPMENT_TEMPLATES = [
    dict(origin="sf", dest="nyc", weight=2.5, value=150.0, contents="Office Supplies",
         priority="standard", carrier="UPS", service="UPS_GROUND", rate=42.50,
         confidence=0.97, status="delivered", auto_executed=True, is_green=True,
         carbon=0.85, tracking_number="1Z999AA10123456784", delivered_days_ago=2),
    dict(origin="nyc", dest="chicago", weight=5.0, value=320.0, contents="Electronics - Tablets",
         priority="express", carrier="FEDEX", service="FEDEX_EXPRESS_SAVER", rate=89.00,
         confidence=0.96, status="in_transit", auto_executed=True, is_green=True,
         carbon=1.20, tracking_number="7489234895", delivered_days_ago=None),
    dict(origin="chicago", dest="london", weight=8.0, value=1200.0, contents="Industrial Parts",
         priority="express", carrier="DHL", service="DHL_EXPRESS_WORLDWIDE", rate=245.00,
         confidence=0.98, status="in_transit", auto_executed=True, is_green=True,
         carbon=3.60, tracking_number="1234567890", delivered_days_ago=None),
    dict(origin="sf", dest="toronto", weight=3.2, value=480.0, contents="Medical Devices",
         priority="overnight", carrier="FEDEX", service="PRIORITY_OVERNIGHT", rate=178.00,
         confidence=0.95, status="out_for_delivery", auto_executed=True, is_green=False,
         carbon=2.10, tracking_number="9261290100830049000017", delivered_days_ago=None),
    dict(origin="nyc", dest="berlin", weight=12.0, value=3500.0, contents="Luxury Watches",
         priority="express", carrier="DHL", service="DHL_EXPRESS_WORLDWIDE", rate=380.00,
         confidence=0.97, status="label_created", auto_executed=True, is_green=True,
         carbon=5.40, tracking_number="JD014600006261", delivered_days_ago=None),
    dict(origin="sf", dest="sydney", weight=6.5, value=890.0, contents="Camera Equipment",
         priority="standard", carrier="UPS", service="UPS_2ND_DAY_AIR", rate=195.00,
         confidence=0.96, status="picked_up", auto_executed=True, is_green=True,
         carbon=4.20, tracking_number="1Z12345E0205271688", delivered_days_ago=None),
    dict(origin="chicago", dest="nyc", weight=1.8, value=75.0, contents="Books",
         priority="economy", carrier="USPS", service="Priority Mail", rate=18.50,
         confidence=0.99, status="delivered", auto_executed=True, is_green=False,
         carbon=0.42, tracking_number="9400111899223397861990", delivered_days_ago=5),
    dict(origin="nyc", dest="tokyo", weight=4.0, value=2200.0, contents="Semiconductor Components",
         priority="express", carrier="DHL", service="DHL_EXPRESS_WORLDWIDE", rate=310.00,
         confidence=0.97, status="delivered", auto_executed=True, is_green=True,
         carbon=6.80, tracking_number="1234509876", delivered_days_ago=7),
    dict(origin="sf", dest="tokyo", weight=15.0, value=8500.0, contents="Electronics - Servers",
         priority="freight", carrier=None, service=None, rate=None,
         confidence=0.82, status="awaiting_approval", auto_executed=False, is_green=False,
         carbon=None, tracking_number=None, delivered_days_ago=None),
    dict(origin="nyc", dest="london", weight=9.0, value=4200.0, contents="Pharmaceutical Samples",
         priority="express", carrier=None, service=None, rate=None,
         confidence=0.78, status="awaiting_approval", auto_executed=False, is_green=False,
         carbon=None, tracking_number=None, delivered_days_ago=None),
    dict(origin="chicago", dest="sydney", weight=22.0, value=6800.0, contents="Automotive Parts",
         priority="freight", carrier=None, service=None, rate=None,
         confidence=0.74, status="awaiting_approval", auto_executed=False, is_green=False,
         carbon=None, tracking_number=None, delivered_days_ago=None),
    dict(origin="sf", dest="berlin", weight=7.0, value=950.0, contents="Artwork",
         priority="express", carrier="FEDEX", service="FEDEX_EXPRESS_SAVER", rate=220.00,
         confidence=0.88, status="exception", auto_executed=True, is_green=False,
         carbon=3.15, tracking_number="449044304137821", delivered_days_ago=None),
    dict(origin="nyc", dest="chicago", weight=3.0, value=200.0, contents="Clothing",
         priority="standard", carrier="UPS", service="UPS_GROUND", rate=35.00,
         confidence=0.93, status="returned", auto_executed=True, is_green=False,
         carbon=0.95, tracking_number="1Z999AA10123456000", delivered_days_ago=None),
]

TRACKING_TEMPLATES = {
    "delivered": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
        ("in_transit",       "Departed origin facility",        "Origin Hub"),
        ("in_transit",       "Arrived at sorting facility",     "Regional Hub"),
        ("in_transit",       "In transit to destination",       "En Route"),
        ("out_for_delivery", "Out for delivery",                "Destination City"),
        ("delivered",        "Package delivered - signed",      "Destination"),
    ],
    "in_transit": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
        ("in_transit",       "Departed origin facility",        "Origin Hub"),
        ("in_transit",       "Arrived at sorting facility",     "Regional Hub"),
        ("in_transit",       "In transit to destination",       "En Route"),
    ],
    "out_for_delivery": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
        ("in_transit",       "Departed origin facility",        "Origin Hub"),
        ("in_transit",       "In transit to destination",       "En Route"),
        ("out_for_delivery", "Out for delivery",                "Destination City"),
    ],
    "picked_up": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
    ],
    "label_created": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
    ],
    "exception": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
        ("in_transit",       "Departed origin facility",        "Origin Hub"),
        ("exception",        "Package damaged in transit",      "Chicago Hub"),
    ],
    "returned": [
        ("label_created",    "Shipping label created",          "Origin Facility"),
        ("picked_up",        "Package picked up by carrier",    "Origin Facility"),
        ("in_transit",       "In transit to destination",       "En Route"),
        ("exception",        "Delivery attempted - no access",  "Destination"),
        ("returned",         "Package returned to sender",      "Origin Facility"),
    ],
    "awaiting_approval": [],
}
