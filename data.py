"""
data.py — Static venue data for Cue Stadium Companion.

Contains all venue configurations, event phase definitions,
exit recommendations, and AI prediction templates.
Separated from app.py for maintainability and code quality.
"""

__all__ = ["VENUES", "EVENT_PHASES", "EXIT_RECOMMENDATIONS", "AI_PREDICTIONS"]

VENUES = {
    "wankhede": {
        "id": "wankhede",
        "name": "Wankhede Stadium",
        "shortName": "Wankhede",
        "match": "MI vs CSK",
        "format": "IPL T20",
        "time": "7:30 PM",
        "city": "Mumbai",
        "heroImage": "https://res.cloudinary.com/djsncsftd/image/upload/v1776222434/wankhede_3d_skhkmc.png",
        "facts": [
            "Built in just 13 months in 1974.",
            "Home to the 2011 World Cup Final victory.",
            "Proximity to the Arabian Sea helps swing bowlers.",
            "Red soil pitch known for extra bounce.",
            "Tata End and Garware Pavilion are the main ends.",
            "Hosted India's first day-night ODI in 1987.",
            "Cantilevered roof ensures no pillars obstruct views.",
            "Dhoni's winning six landed in the North Stand.",
            "Fortress for Mumbai Indians with five IPL titles.",
            "Located in the heart of Churchgate, Mumbai.",
            "Capacity of approximately 33,100.",
            "Sunil Gavaskar and Sachin Tendulkar have stands here.",
            "First Test match in 1975 vs West Indies.",
            "Ravi Shastri hit six sixes in an over here in domestic play.",
            "Renovated in 2011 for the ICC World Cup.",
            "The 'Sachin, Sachin' chants originated here.",
            "Sea breeze significantly impacts ball flight.",
            "Hosted 2023 World Cup Semi-final.",
            "Pitch red soil requires specialized maintenance.",
            "Marine Drive breeze offers relief to fans.",
        ],
        "seats": [
            {"block": "B", "row": 12, "seat": 34},
            {"block": "B", "row": 12, "seat": 35},
        ],
        "gates": [
            {"id": "A", "name": "Gate A", "area": "North Stand", "wait": 12, "status": "high"},
            {"id": "B", "name": "Gate B", "area": "East Gallery", "wait": 8, "status": "medium"},
            {"id": "C", "name": "Gate C", "area": "South Pavilion", "wait": 6, "status": "medium"},
            {"id": "D", "name": "Gate D", "area": "West Terrace", "wait": 3, "status": "low", "recommended": True},
        ],
        "timeline": [
            {"time": "5:30 PM", "event": "Gates Open", "status": "past"},
            {"time": "6:45 PM", "event": "Peak Entry", "status": "current"},
            {"time": "7:30 PM", "event": "First Ball", "status": "upcoming"},
        ],
        "foodStalls": [
            {"name": "Chaat Counter", "gate": "C", "walkMin": 2, "waitMin": 3, "type": "veg", "status": "low"},
            {"name": "Pizza Corner", "gate": "A", "walkMin": 4, "waitMin": 8, "type": "non-veg", "status": "medium"},
            {"name": "Gujarati Farsan", "gate": "C", "walkMin": 2, "waitMin": 4, "type": "veg", "status": "low"},
            {"name": "Biryani House", "gate": "B", "walkMin": 3, "waitMin": 10, "type": "non-veg", "status": "high"},
        ],
        "transport": [
            {"type": "metro", "name": "Churchgate", "walkDistance": "800m", "commuteDistance": "18.5km",
             "destination": "Bandra (Home)", "nextIn": "6 min", "crowd": "medium"},
            {"type": "rideshare", "surge": "1.8x", "staging": "Gate B", "wait": "12 min"},
            {"type": "auto", "stand": "Gate D", "queue": 8, "waitMin": 15},
        ],
        "emergency": {
            "medical": {"location": "Gate B (East Gallery)", "walkMin": 2, "detail": "First-aid, paramedics, wheelchair assistance"},
            "security": {"location": "Row 12, Section B", "detail": "Report incidents, lost children, suspicious activity"},
            "exit": {"gate": "Gate D (West Terrace)", "walkMin": 1, "detail": "Follow lit floor markers to exit"},
        },
        "layout": {
            "viewBox": "0 0 800 800",
            "seatNode": {"x": 400, "y": 650},
            "nodes": {
                "Gate A": {"x": 400, "y": 100},
                "Gate B": {"x": 700, "y": 400},
                "Gate C": {"x": 400, "y": 700},
                "Gate D": {"x": 100, "y": 400},
            },
        },
    },
    "narendra_modi": {
        "id": "narendra_modi",
        "name": "Narendra Modi Stadium",
        "shortName": "NM Stadium",
        "match": "IND vs AUS",
        "format": "ODI",
        "time": "2:00 PM",
        "city": "Ahmedabad",
        "heroImage": "https://res.cloudinary.com/djsncsftd/image/upload/v1776222433/narendra_modi_3d_swwaaa.jpg",
        "facts": [
            "World's largest cricket stadium (132,000 seats).",
            "Spans 63 acres within a sports enclave.",
            "360-degree LED 'ring of fire' roof lights.",
            "11 center pitches made of red and black soil.",
            "76 corporate boxes and 4 dressing rooms.",
            "Hosted 'Namaste Trump' event in 2020.",
            "Gavaskar scored 10,000th Test run here.",
            "Built on the banks of the Sabarmati River.",
            "Reconstruction cost ₹800 crore.",
            "Hosted 2023 ODI World Cup Final.",
            "Guinness Record for largest cricket jersey in 2022.",
            "Architects also designed Tottenham Hotspur stadium.",
            "Venue for T20 World Cup 2026 Final.",
            "13,000-car parking capacity.",
            "Home ground to Gujarat Titans.",
            "Original stadium demolished in 2015 for rebuild.",
            "Includes an indoor academy and two practice grounds.",
            "State-of-the-art 'Sub-surface' drainage system.",
            "Kapil Dev's record 432nd Test wicket here.",
            "Primary venue for 2030 Commonwealth Games.",
        ],
        "seats": [
            {"block": "D", "row": 5, "seat": 18},
            {"block": "D", "row": 5, "seat": 19},
            {"block": "D", "row": 5, "seat": 20},
        ],
        "gates": [
            {"id": "1", "name": "Gate 1", "area": "Adani Pavilion", "wait": 15, "status": "high"},
            {"id": "2", "name": "Gate 2", "area": "BPCL End", "wait": 9, "status": "medium"},
            {"id": "3", "name": "Gate 3", "area": "Reliance Stand", "wait": 4, "status": "low", "recommended": True},
            {"id": "4", "name": "Gate 4", "area": "Club House", "wait": 7, "status": "medium"},
        ],
        "timeline": [
            {"time": "1:00 PM", "event": "Gates Open", "status": "past"},
            {"time": "1:45 PM", "event": "Peak Entry", "status": "current"},
            {"time": "2:00 PM", "event": "Toss", "status": "upcoming"},
            {"time": "2:30 PM", "event": "First Ball", "status": "upcoming"},
        ],
        "foodStalls": [
            {"name": "Kathiyawadi Thali", "gate": "3", "walkMin": 2, "waitMin": 5, "type": "veg", "status": "low"},
            {"name": "Frankie Stall", "gate": "1", "walkMin": 5, "waitMin": 6, "type": "non-veg", "status": "medium"},
            {"name": "Juice Bar", "gate": "2", "walkMin": 3, "waitMin": 3, "type": "veg", "status": "low"},
        ],
        "transport": [
            {"type": "metro", "name": "Motera Metro", "walkDistance": "500m", "commuteDistance": "12.4km",
             "destination": "Navrangpura (Home)", "nextIn": "8 min", "crowd": "low"},
            {"type": "rideshare", "surge": "1.5x", "staging": "Gate 4", "wait": "10 min"},
            {"type": "auto", "stand": "Gate 1", "queue": 12, "waitMin": 20},
        ],
        "emergency": {
            "medical": {"location": "Gate 2 (BPCL End)", "walkMin": 3, "detail": "First-aid, paramedics, wheelchair assistance"},
            "security": {"location": "Row 5, Section D", "detail": "Report incidents, lost children, suspicious activity"},
            "exit": {"gate": "Gate 3 (Reliance Stand)", "walkMin": 2, "detail": "Follow lit floor markers to exit"},
        },
        "layout": {
            "viewBox": "0 0 1000 1000",
            "seatNode": {"x": 800, "y": 200},
            "nodes": {
                "Gate 1": {"x": 500, "y": 50},
                "Gate 2": {"x": 950, "y": 500},
                "Gate 3": {"x": 500, "y": 950},
                "Gate 4": {"x": 50, "y": 500},
            },
        },
    },
    "salt_lake": {
        "id": "salt_lake",
        "name": "Salt Lake Stadium",
        "shortName": "Salt Lake",
        "match": "Mohun Bagan vs East Bengal",
        "format": "ISL",
        "time": "7:30 PM",
        "city": "Kolkata",
        "heroImage": "https://res.cloudinary.com/djsncsftd/image/upload/v1776222433/salt_lake_3d_psb6pg.jpg",
        "facts": [
            "Officially named VYBK.",
            "Once the 2nd largest stadium in the world.",
            "Record attendance of 131,781 in 1997.",
            "The 'Mecca of Indian Football'.",
            "Three-tier concrete gallery structure.",
            "Hosted 2017 FIFA U-17 World Cup Final.",
            "Area of 76.4 acres in Salt Lake City.",
            "Renovated in 2017 for ₹350 crore.",
            "Features Riviera Bermuda grass.",
            "Messi played here vs Venezuela in 2011.",
            "Oliver Kahn's farewell match in 2008.",
            "Diego Maradona conducted a clinic here.",
            "Roof made of metal tubes and aluminum.",
            "Equipped with a VIP helipad.",
            "On-site Indian football history museum.",
            "Hosted 2013 IPL opening ceremony.",
            "9 entry gates and 30 internal ramps.",
            "IAAF Class 1 athletics facility.",
            "Only ISL venue once using artificial turf.",
            "Standby diesel generators for power resilience.",
        ],
        "seats": [
            {"block": "G", "row": 22, "seat": 7},
            {"block": "G", "row": 22, "seat": 8},
        ],
        "gates": [
            {"id": "N", "name": "Gate N", "area": "Nayantara Stand", "wait": 5, "status": "low", "recommended": True},
            {"id": "S", "name": "Gate S", "area": "South Gallery", "wait": 10, "status": "medium"},
            {"id": "E", "name": "Gate E", "area": "East Block", "wait": 14, "status": "high"},
            {"id": "W", "name": "Gate W", "area": "West Pavilion", "wait": 7, "status": "medium"},
        ],
        "timeline": [
            {"time": "6:30 PM", "event": "Gates Open", "status": "past"},
            {"time": "7:15 PM", "event": "Peak Entry", "status": "current"},
            {"time": "7:30 PM", "event": "Kick-off", "status": "upcoming"},
        ],
        "foodStalls": [
            {"name": "Kolkata Roll", "gate": "N", "walkMin": 1, "waitMin": 4, "type": "non-veg", "status": "low"},
            {"name": "Mishti Doi Counter", "gate": "S", "walkMin": 3, "waitMin": 2, "type": "veg", "status": "low"},
            {"name": "Egg Roll Stand", "gate": "E", "walkMin": 4, "waitMin": 7, "type": "non-veg", "status": "medium"},
        ],
        "transport": [
            {"type": "metro", "name": "Salt Lake Sector V", "walkDistance": "1.2km", "commuteDistance": "14.2km",
             "destination": "Alipore (Home)", "nextIn": "10 min", "crowd": "high"},
            {"type": "rideshare", "surge": "2.1x", "staging": "Gate W", "wait": "15 min"},
            {"type": "auto", "stand": "Gate N", "queue": 5, "waitMin": 10},
        ],
        "emergency": {
            "medical": {"location": "Gate S (South Gallery)", "walkMin": 3, "detail": "First-aid, paramedics, wheelchair assistance"},
            "security": {"location": "Row 22, Section G", "detail": "Report incidents, lost children, suspicious activity"},
            "exit": {"gate": "Gate N (Nayantara Stand)", "walkMin": 1, "detail": "Follow lit floor markers to exit"},
        },
        "layout": {
            "viewBox": "0 0 900 900",
            "seatNode": {"x": 100, "y": 450},
            "nodes": {
                "Gate N": {"x": 450, "y": 50},
                "Gate S": {"x": 450, "y": 850},
                "Gate E": {"x": 850, "y": 450},
                "Gate W": {"x": 50, "y": 450},
            },
        },
    },
}

# ─── Event Phase Data ──────────────────────────────────────────────────
EVENT_PHASES = {
    "pre-match": {
        "label": "Pre-match",
        "icon": "🏟️",
        "description": "Gates opening. Fans arriving. Best time for food and restrooms.",
        "crowdMultiplier": 0.4,
        "score": {
            "wankhede": {"text": "PRE-MATCH", "detail": "Gates opening soon"},
            "narendra_modi": {"text": "PRE-MATCH", "detail": "Fans arriving"},
            "salt_lake": {"text": "PRE-MATCH", "detail": "Atmosphere building"},
        },
    },
    "match": {
        "label": "Match",
        "icon": "🏏",
        "description": "Match in progress. Most fans are seated.",
        "crowdMultiplier": 1.0,
        "score": {
            "wankhede": {"text": "MI 142/3", "detail": "16.2 overs"},
            "narendra_modi": {"text": "IND 280/8", "detail": "48.2 overs"},
            "salt_lake": {"text": "ATKMB 1-0 EB", "detail": "62' min"},
        },
    },
    "break": {
        "label": "Innings Break",
        "icon": "🥤",
        "description": "Break in play. Heavy movement in corridors and food stalls.",
        "crowdMultiplier": 2.5,
        "score": {
            "wankhede": {"text": "INN BREAK", "detail": "Target: 182"},
            "narendra_modi": {"text": "INN BREAK", "detail": "Target: 310"},
            "salt_lake": {"text": "HALF TIME", "detail": "Score: 1-0"},
        },
    },
    "post-match": {
        "label": "Post-match",
        "icon": "🚗",
        "description": "Match over. Heavy congestion at exits and transport hubs.",
        "crowdMultiplier": 5.0,
        "score": {
            "wankhede": {"text": "MI WON", "detail": "By 12 runs"},
            "narendra_modi": {"text": "IND WON", "detail": "By 1 wicket"},
            "salt_lake": {"text": "DRAW", "detail": "Score: 1-1"},
        },
    },
}

EXIT_RECOMMENDATIONS = {
    "pre-match": {"headline": "Enjoy the build-up", "detail": "Exits are clear. Parking remains available at Gate E.", "urgency": "low"},
    "match": {"headline": "Movement Alert", "detail": "Queue at Gate N is increasing. Stay seated for best experience.", "urgency": "low"},
    "break": {"headline": "Fastest Refreshments", "detail": "South Gallery stalls have 50% shorter queues than North.", "urgency": "medium"},
    "post-match": {"headline": "Recommended Exit: Gate N", "detail": "Avoid Main Gate surge. 12 min faster via North Walkway.", "urgency": "high", "waitSaved": "12 min"},
}

AI_PREDICTIONS = {
    "pre-match": "Gates are flowing well. Estimated time to seat: 12 minutes. Innings break expected to be the busiest for restrooms.",
    "match": "Current match intensity is high. Food stall queues expected to surge in 15 minutes. Best time to move is NOW.",
    "break": "Heavy congestion at East Gallery. Use South Pavilion exits for a 20% faster exit route after the match.",
    "post-match": "Congestion at Main Gate is 3x higher than North Gate. Proceed to North Gate for 15-min wait for rideshare.",
}
