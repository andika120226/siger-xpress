"""
Vehicle-Cargo Constraint Matcher.
=================================
Matches cargo items to the most suitable vehicle from a fleet using
weighted constraint satisfaction scoring.

Constraints evaluated (in priority order):
  1. Temperature compatibility  — frozen/perishable cargo MUST use refrigerated vehicle.
  2. Weight capacity            — total cargo weight ≤ vehicle max_weight_kg.
  3. Cargo–vehicle type fit     — e.g. documents → motorcycle, large items → trailer.

Scoring weights:
  - Temperature match : 0.40
  - Weight fit        : 0.30
  - Type suitability  : 0.30
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Compatibility matrices (local / mock data — no external API)
# ---------------------------------------------------------------------------

# Which vehicle types are temperature-compatible with which cargo types?
# True = compatible, False = incompatible
TEMP_COMPAT: dict[str, dict[str, bool]] = {
    "frozen": {
        "refrigerated": True,
        "box": False,
        "motorcycle": False,
        "pickup": False,
        "trailer": False,
    },
    "perishable": {
        "refrigerated": True,
        "box": False,
        "motorcycle": False,
        "pickup": False,
        "trailer": False,
    },
    "fragile": {
        "refrigerated": True,
        "box": True,
        "motorcycle": False,
        "pickup": True,
        "trailer": True,
    },
    "hazardous": {
        "refrigerated": False,
        "box": True,
        "motorcycle": False,
        "pickup": False,
        "trailer": True,
    },
    "standard": {
        "refrigerated": True,
        "box": True,
        "motorcycle": True,
        "pickup": True,
        "trailer": True,
    },
    "dry_food": {
        "refrigerated": True,
        "box": True,
        "motorcycle": True,
        "pickup": True,
        "trailer": True,
    },
}

# Type suitability score (0.0 to 1.0) — how well does the vehicle type
# suit the cargo type, independent of temperature?
TYPE_SUITABILITY: dict[str, dict[str, float]] = {
    "frozen":    {"refrigerated": 1.0, "box": 0.2, "motorcycle": 0.0, "pickup": 0.1, "trailer": 0.3},
    "perishable":{"refrigerated": 1.0, "box": 0.3, "motorcycle": 0.1, "pickup": 0.2, "trailer": 0.3},
    "fragile":   {"refrigerated": 0.7, "box": 1.0, "motorcycle": 0.2, "pickup": 0.6, "trailer": 0.5},
    "hazardous": {"refrigerated": 0.2, "box": 0.8, "motorcycle": 0.0, "pickup": 0.3, "trailer": 1.0},
    "standard":  {"refrigerated": 0.5, "box": 0.8, "motorcycle": 0.9, "pickup": 0.7, "trailer": 0.6},
    "dry_food":  {"refrigerated": 0.6, "box": 0.9, "motorcycle": 0.6, "pickup": 0.8, "trailer": 0.5},
}

# Human-readable reasons for temperature constraints
TEMP_REASONS: dict[str, str] = {
    "frozen": "Temperature-controlled vehicle required for frozen cargo",
    "perishable": "Temperature-controlled vehicle required for perishable cargo",
    "fragile": "Enclosed vehicle suitable for fragile items",
    "hazardous": "Specialised enclosed vehicle required for hazardous materials",
    "standard": "General-purpose vehicle suitable for standard cargo",
    "dry_food": "Clean enclosed vehicle required for food products",
}

# Scoring weights
W_TEMP = 0.40
W_WEIGHT = 0.30
W_TYPE = 0.30


@dataclass
class MatchCandidate:
    """Internal scoring result for one cargo–vehicle pair."""

    cargo_name: str
    vehicle_name: str
    vehicle_type: str
    cargo_type: str
    score: float
    reason: str
    is_hard_fail: bool  # True if a hard constraint is violated


@dataclass
class MatchingResult:
    """Final matching output."""

    matches: list[dict]
    unmatched_cargo: list[str]
    fleet_utilization_pct: float


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _score_pair(
    cargo_type: str,
    cargo_weight: float,
    vehicle_type: str,
    vehicle_max_weight: float,
) -> tuple[float, str, bool]:
    """
    Score a single cargo–vehicle pair.

    Returns
    -------
    (score, reason, is_hard_fail)
    """
    # 1) Temperature compatibility (hard constraint for frozen/perishable)
    temp_ok = TEMP_COMPAT.get(cargo_type, {}).get(vehicle_type, True)
    is_cold_cargo = cargo_type in ("frozen", "perishable")

    if is_cold_cargo and not temp_ok:
        return 0.0, TEMP_REASONS.get(cargo_type, "Incompatible"), True

    temp_score = 1.0 if temp_ok else 0.0

    # 2) Weight capacity (hard constraint)
    if cargo_weight > vehicle_max_weight:
        return 0.0, f"Cargo weight ({cargo_weight} kg) exceeds vehicle capacity ({vehicle_max_weight} kg)", True

    # Weight fit: prefer vehicles where cargo uses 40–80% of capacity
    weight_ratio = cargo_weight / vehicle_max_weight if vehicle_max_weight > 0 else 0
    if 0.4 <= weight_ratio <= 0.8:
        weight_score = 1.0
    elif weight_ratio < 0.4:
        weight_score = 0.5 + (weight_ratio / 0.4) * 0.5  # 0.5 – 1.0
    else:
        weight_score = max(0.3, 1.0 - (weight_ratio - 0.8) * 2.5)  # graceful degradation

    # 3) Type suitability
    type_score = TYPE_SUITABILITY.get(cargo_type, {}).get(vehicle_type, 0.5)

    # Weighted score
    total = round(W_TEMP * temp_score + W_WEIGHT * weight_score + W_TYPE * type_score, 2)

    reason = TEMP_REASONS.get(cargo_type, "General cargo match")
    return total, reason, False


# ---------------------------------------------------------------------------
# Main matching algorithm
# ---------------------------------------------------------------------------

@dataclass
class VehicleState:
    name: str
    type: str
    max_weight_kg: float
    remaining_weight_kg: float
    loaded_cargo_types: set[str]
    cargos_loaded: int


def match_vehicles_cargo(
    vehicles: list[dict],
    cargo_items: list[dict],
) -> MatchingResult:
    """
    Match each cargo item to the best available vehicle supporting LTL consolidation
    and anti-cross-contamination rules.
    """
    v_states: dict[str, VehicleState] = {
        v["name"]: VehicleState(
            name=v["name"],
            type=v["type"],
            max_weight_kg=v["max_weight_kg"],
            remaining_weight_kg=v["max_weight_kg"],
            loaded_cargo_types=set(),
            cargos_loaded=0,
        )
        for v in vehicles
    }

    matches: list[dict] = []
    unmatched: list[str] = []

    for cargo in cargo_items:
        best: MatchCandidate | None = None
        cargo_is_food = cargo["type"] in ("frozen", "perishable", "dry_food")
        cargo_is_haz = cargo["type"] == "hazardous"

        for v_name, v_data in v_states.items():
            # 1) Anti-Cross-Contamination Rule
            has_food = any(t in v_data.loaded_cargo_types for t in ("frozen", "perishable", "dry_food"))
            has_haz = "hazardous" in v_data.loaded_cargo_types

            if cargo_is_food and has_haz:
                continue  # Skip: Food cannot mix with hazardous
            if cargo_is_haz and has_food:
                continue  # Skip: Hazardous cannot mix with food

            score, reason, hard_fail = _score_pair(
                cargo_type=cargo["type"],
                cargo_weight=cargo["weight_kg"],
                vehicle_type=v_data.type,
                vehicle_max_weight=v_data.remaining_weight_kg,
            )

            if hard_fail:
                continue

            candidate = MatchCandidate(
                cargo_name=cargo["name"],
                vehicle_name=v_name,
                vehicle_type=v_data.type,
                cargo_type=cargo["type"],
                score=score,
                reason=reason,
                is_hard_fail=False,
            )

            if best is None or candidate.score > best.score:
                best = candidate

        if best is not None:
            v_data = v_states[best.vehicle_name]
            
            # Determine if this is a shared LTL load
            is_ltl_shared = v_data.cargos_loaded > 0
            sharing_text = " (LTL Consolidation)" if is_ltl_shared else ""

            v_data.remaining_weight_kg -= cargo["weight_kg"]
            v_data.loaded_cargo_types.add(cargo["type"])
            v_data.cargos_loaded += 1

            matches.append({
                "cargo": best.cargo_name,
                "assigned_vehicle": best.vehicle_name,
                "status": "Matched",
                "match_score": best.score,
                "reason": best.reason + sharing_text,
            })
        else:
            # Determine reason for failure
            fail_reason = "Tidak ada kendaraan yang muat atau sesuai"
            if cargo_is_food and any("hazardous" in v.loaded_cargo_types for v in v_states.values()):
                fail_reason = "⚠️ AI Safety Warning: Bahaya Kontaminasi Silang (Pangan vs Berbahaya)"
            elif cargo_is_haz and any(t in v.loaded_cargo_types for t in ("frozen", "perishable", "dry_food") for v in v_states.values()):
                fail_reason = "⚠️ AI Safety Warning: Bahaya Kontaminasi Silang (Berbahaya vs Pangan)"

            matches.append({
                "cargo": cargo["name"],
                "assigned_vehicle": "-",
                "status": "Unmatched",
                "match_score": 0.0,
                "reason": fail_reason,
            })
            unmatched.append(cargo["name"])

    # Fleet utilisation
    total_vehicles = len(vehicles)
    used_vehicles = sum(1 for v in v_states.values() if v.cargos_loaded > 0)
    utilization = round((used_vehicles / total_vehicles) * 100, 2) if total_vehicles > 0 else 0.0

    return MatchingResult(
        matches=matches,
        unmatched_cargo=unmatched,
        fleet_utilization_pct=utilization,
    )
